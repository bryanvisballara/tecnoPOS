import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export function signToken(user) {
  return jwt.sign(
    {
      id: user._id,
      role: user.role,
      organizationId: user.organizationId,
      restaurantIds: user.restaurantIds,
    },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
}

export async function auth(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) return res.status(401).json({ error: 'No autenticado' });

    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(payload.id);
    if (!user || !user.active) return res.status(401).json({ error: 'Usuario inválido' });

    req.user = user;
    next();
  } catch {
    return res.status(401).json({ error: 'Token inválido' });
  }
}

export function requireRoles(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Sin permiso para esta acción' });
    }
    next();
  };
}

export function restaurantScope(req) {
  const requested = req.query.restaurantId || req.body.restaurantId || req.headers['x-restaurant-id'];
  if (req.user.role === 'owner') return requested || null;
  if (!requested) return req.user.restaurantIds?.[0]?.toString() || null;
  const allowed = (req.user.restaurantIds || []).map((id) => id.toString());
  if (!allowed.includes(requested.toString())) return null;
  return requested.toString();
}
