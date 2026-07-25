import { Router } from 'express';
import Stock from '../models/Stock.js';
import InventoryTxn from '../models/InventoryTxn.js';
import Ingredient from '../models/Ingredient.js';
import { auth, requireRoles, restaurantScope } from '../middleware/auth.js';

const router = Router();
router.use(auth);

router.get('/stock', async (req, res) => {
  const restaurantId = restaurantScope(req);
  if (!restaurantId) return res.status(400).json({ error: 'Restaurante requerido' });
  const stock = await Stock.find({ restaurantId, organizationId: req.user.organizationId }).populate(
    'ingredientId',
    'name unit costPerUnit supplier'
  );
  res.json(stock);
});

router.get('/alerts', async (req, res) => {
  const restaurantId = restaurantScope(req);
  if (!restaurantId) return res.status(400).json({ error: 'Restaurante requerido' });
  const stock = await Stock.find({ restaurantId }).populate('ingredientId', 'name unit');
  const low = stock.filter((s) => s.onHand <= s.reorderPoint);
  res.json(low);
});

router.post('/receive', requireRoles('owner', 'manager', 'cashier'), async (req, res) => {
  const restaurantId = restaurantScope(req);
  const { ingredientId, quantity, unitCost, note } = req.body;
  if (!restaurantId || !ingredientId || !quantity) {
    return res.status(400).json({ error: 'Datos incompletos' });
  }

  let stock = await Stock.findOne({ restaurantId, ingredientId });
  if (!stock) {
    stock = await Stock.create({
      organizationId: req.user.organizationId,
      restaurantId,
      ingredientId,
      onHand: 0,
      parLevel: quantity,
      reorderPoint: quantity * 0.3,
    });
  }
  stock.onHand += Number(quantity);
  await stock.save();

  if (unitCost != null) {
    await Ingredient.findByIdAndUpdate(ingredientId, { costPerUnit: unitCost });
  }

  const txn = await InventoryTxn.create({
    organizationId: req.user.organizationId,
    restaurantId,
    ingredientId,
    type: 'purchase',
    quantity: Number(quantity),
    unitCost: unitCost || 0,
    note,
    userId: req.user._id,
  });

  res.status(201).json({ stock, txn });
});

router.post('/waste', requireRoles('owner', 'manager', 'kitchen'), async (req, res) => {
  const restaurantId = restaurantScope(req);
  const { ingredientId, quantity, note } = req.body;
  const stock = await Stock.findOne({ restaurantId, ingredientId });
  if (!stock) return res.status(404).json({ error: 'Sin stock' });
  stock.onHand -= Number(quantity);
  await stock.save();
  const txn = await InventoryTxn.create({
    organizationId: req.user.organizationId,
    restaurantId,
    ingredientId,
    type: 'waste',
    quantity: -Number(quantity),
    note,
    userId: req.user._id,
  });
  res.json({ stock, txn });
});

router.get('/txns', requireRoles('owner', 'manager'), async (req, res) => {
  const restaurantId = restaurantScope(req);
  const filter = { organizationId: req.user.organizationId };
  if (restaurantId) filter.restaurantId = restaurantId;
  const txns = await InventoryTxn.find(filter)
    .populate('ingredientId', 'name unit')
    .sort({ createdAt: -1 })
    .limit(100);
  res.json(txns);
});

export default router;
