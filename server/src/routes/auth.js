import { Router } from 'express';
import User from '../models/User.js';
import Restaurant from '../models/Restaurant.js';
import Organization from '../models/Organization.js';
import { auth, signToken } from '../middleware/auth.js';

const router = Router();

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email: email?.toLowerCase()?.trim() }).select('+password');
    if (!user || !(await user.comparePassword(password || ''))) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const token = signToken(user);
    const restaurants = await Restaurant.find({
      _id: { $in: user.role === 'owner' ? await Restaurant.find({ organizationId: user.organizationId }).distinct('_id') : user.restaurantIds },
    });
    const organization = await Organization.findById(user.organizationId);

    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        organizationId: user.organizationId,
        restaurantIds: user.role === 'owner' ? restaurants.map((r) => r._id) : user.restaurantIds,
        avatarColor: user.avatarColor,
      },
      organization,
      restaurants,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/me', auth, async (req, res) => {
  try {
    const restaurants =
      req.user.role === 'owner'
        ? await Restaurant.find({ organizationId: req.user.organizationId, active: true })
        : await Restaurant.find({ _id: { $in: req.user.restaurantIds }, active: true });
    const organization = await Organization.findById(req.user.organizationId);
    res.json({
      user: {
        id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role,
        organizationId: req.user.organizationId,
        restaurantIds: restaurants.map((r) => r._id),
        avatarColor: req.user.avatarColor,
      },
      organization,
      restaurants,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
