import { Router } from 'express';
import Table from '../models/Table.js';
import { auth, requireRoles, restaurantScope } from '../middleware/auth.js';

const router = Router();
router.use(auth);

router.get('/', async (req, res) => {
  const restaurantId = restaurantScope(req);
  if (!restaurantId) return res.status(400).json({ error: 'Restaurante requerido' });
  const tables = await Table.find({ restaurantId }).sort({ zone: 1, name: 1 });
  res.json(tables);
});

router.post('/', requireRoles('owner', 'manager'), async (req, res) => {
  const restaurantId = restaurantScope(req);
  const table = await Table.create({
    ...req.body,
    organizationId: req.user.organizationId,
    restaurantId,
  });
  res.status(201).json(table);
});

router.patch('/:id', async (req, res) => {
  const table = await Table.findOneAndUpdate(
    { _id: req.params.id, organizationId: req.user.organizationId },
    req.body,
    { new: true }
  );
  if (!table) return res.status(404).json({ error: 'Mesa no encontrada' });
  res.json(table);
});

router.post('/:id/status', async (req, res) => {
  const { status } = req.body;
  const table = await Table.findOneAndUpdate(
    { _id: req.params.id, organizationId: req.user.organizationId },
    { status },
    { new: true }
  );
  if (!table) return res.status(404).json({ error: 'Mesa no encontrada' });
  req.app.get('io')?.to(`restaurant:${table.restaurantId}`).emit('table:update', table);
  res.json(table);
});

export default router;
