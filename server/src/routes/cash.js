import { Router } from 'express';
import CashSession from '../models/CashSession.js';
import Order from '../models/Order.js';
import { auth, requireRoles, restaurantScope } from '../middleware/auth.js';

const router = Router();
router.use(auth);
router.use(requireRoles('cashier', 'owner', 'manager'));

router.get('/current', async (req, res) => {
  const restaurantId = restaurantScope(req);
  const session = await CashSession.findOne({ restaurantId, status: 'open' }).populate('cashierId', 'name');
  res.json(session);
});

router.post('/open', async (req, res) => {
  const restaurantId = restaurantScope(req);
  const existing = await CashSession.findOne({ restaurantId, status: 'open' });
  if (existing) return res.status(400).json({ error: 'Ya hay una caja abierta' });

  const session = await CashSession.create({
    organizationId: req.user.organizationId,
    restaurantId,
    cashierId: req.user._id,
    openingFloat: req.body.openingFloat || 0,
  });
  res.status(201).json(session);
});

router.post('/close', async (req, res) => {
  const restaurantId = restaurantScope(req);
  const session = await CashSession.findOne({ restaurantId, status: 'open' });
  if (!session) return res.status(404).json({ error: 'No hay caja abierta' });

  const orders = await Order.find({
    restaurantId,
    status: 'paid',
    closedAt: { $gte: session.openedAt },
  });

  let salesCash = 0;
  let salesCard = 0;
  let salesTransfer = 0;
  let tips = 0;
  for (const order of orders) {
    for (const p of order.payments) {
      if (p.method === 'cash') salesCash += p.amount;
      if (p.method === 'card') salesCard += p.amount;
      if (p.method === 'transfer') salesTransfer += p.amount;
      tips += p.tip || 0;
    }
  }

  const closingCash = Number(req.body.closingCash ?? 0);
  const expectedCash = session.openingFloat + salesCash;
  session.salesCash = salesCash;
  session.salesCard = salesCard;
  session.salesTransfer = salesTransfer;
  session.tips = tips;
  session.closingCash = closingCash;
  session.expectedCash = expectedCash;
  session.variance = closingCash - expectedCash;
  session.status = 'closed';
  session.closedAt = new Date();
  session.notes = req.body.notes;
  await session.save();
  res.json(session);
});

router.get('/history', async (req, res) => {
  const restaurantId = restaurantScope(req);
  const sessions = await CashSession.find({ restaurantId }).sort({ openedAt: -1 }).limit(30).populate('cashierId', 'name');
  res.json(sessions);
});

export default router;
