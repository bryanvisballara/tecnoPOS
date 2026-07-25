import { Router } from 'express';
import Restaurant from '../models/Restaurant.js';
import User from '../models/User.js';
import { auth, requireRoles } from '../middleware/auth.js';

const router = Router();

router.use(auth);

router.get('/', async (req, res) => {
  const filter =
    req.user.role === 'owner'
      ? { organizationId: req.user.organizationId }
      : { _id: { $in: req.user.restaurantIds } };
  const restaurants = await Restaurant.find(filter).sort({ name: 1 });
  res.json(restaurants);
});

router.post('/', requireRoles('owner'), async (req, res) => {
  const restaurant = await Restaurant.create({
    ...req.body,
    organizationId: req.user.organizationId,
  });
  res.status(201).json(restaurant);
});

router.patch('/:id', requireRoles('owner', 'manager'), async (req, res) => {
  const restaurant = await Restaurant.findOneAndUpdate(
    { _id: req.params.id, organizationId: req.user.organizationId },
    req.body,
    { new: true }
  );
  if (!restaurant) return res.status(404).json({ error: 'Restaurante no encontrado' });
  res.json(restaurant);
});

router.get('/:id/staff', requireRoles('owner', 'manager'), async (req, res) => {
  const staff = await User.find({
    organizationId: req.user.organizationId,
    restaurantIds: req.params.id,
  }).select('-password');
  res.json(staff);
});

export default router;
