import { Router } from 'express';
import Customer from '../models/Customer.js';
import { auth, requireRoles } from '../middleware/auth.js';

const router = Router();
router.use(auth);

router.get('/', async (req, res) => {
  const q = req.query.q;
  const filter = { organizationId: req.user.organizationId };
  if (q) {
    filter.$or = [
      { name: new RegExp(q, 'i') },
      { phone: new RegExp(q, 'i') },
      { email: new RegExp(q, 'i') },
    ];
  }
  const customers = await Customer.find(filter).sort({ updatedAt: -1 }).limit(50);
  res.json(customers);
});

router.post('/', async (req, res) => {
  const customer = await Customer.create({ ...req.body, organizationId: req.user.organizationId });
  res.status(201).json(customer);
});

router.patch('/:id', requireRoles('owner', 'manager', 'cashier', 'waiter'), async (req, res) => {
  const customer = await Customer.findOneAndUpdate(
    { _id: req.params.id, organizationId: req.user.organizationId },
    req.body,
    { new: true }
  );
  if (!customer) return res.status(404).json({ error: 'Cliente no encontrado' });
  res.json(customer);
});

export default router;
