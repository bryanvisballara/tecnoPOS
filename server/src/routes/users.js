import { Router } from 'express';
import User, { ROLES } from '../models/User.js';
import { auth, requireRoles } from '../middleware/auth.js';

const router = Router();
router.use(auth);

router.get('/roles', (_req, res) => res.json(ROLES));

router.get('/', requireRoles('owner', 'manager'), async (req, res) => {
  const filter = { organizationId: req.user.organizationId };
  if (req.query.restaurantId && req.user.role !== 'owner') {
    filter.restaurantIds = req.query.restaurantId;
  } else if (req.query.restaurantId) {
    filter.restaurantIds = req.query.restaurantId;
  }
  const users = await User.find(filter).select('-password').sort({ name: 1 });
  res.json(users);
});

router.post('/', requireRoles('owner', 'manager'), async (req, res) => {
  const { name, email, password, role, restaurantIds, pin, avatarColor } = req.body;
  if (!ROLES.includes(role)) return res.status(400).json({ error: 'Rol inválido' });
  if (req.user.role === 'manager' && role === 'owner') {
    return res.status(403).json({ error: 'No puedes crear owners' });
  }
  const user = await User.create({
    organizationId: req.user.organizationId,
    name,
    email,
    password,
    role,
    restaurantIds: restaurantIds || [],
    pin,
    avatarColor,
  });
  res.status(201).json({
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    restaurantIds: user.restaurantIds,
  });
});

router.patch('/:id', requireRoles('owner', 'manager'), async (req, res) => {
  const updates = { ...req.body };
  delete updates.password;
  delete updates.organizationId;
  const user = await User.findOneAndUpdate(
    { _id: req.params.id, organizationId: req.user.organizationId },
    updates,
    { new: true }
  ).select('-password');
  if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
  res.json(user);
});

export default router;
