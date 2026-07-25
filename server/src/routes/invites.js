import { Router } from 'express';
import crypto from 'crypto';
import Invitation from '../models/Invitation.js';
import User from '../models/User.js';
import Restaurant from '../models/Restaurant.js';
import Organization from '../models/Organization.js';
import { auth, requireRoles, restaurantScope, signToken } from '../middleware/auth.js';
import { sendInviteEmail } from '../utils/mail.js';

const router = Router();
const INVITE_DAYS = 7;

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function makeToken() {
  return crypto.randomBytes(32).toString('hex');
}

function clientOrigin() {
  return (process.env.CLIENT_ORIGIN || 'https://tecnopos.onrender.com').replace(/\/$/, '');
}

async function sessionPayload(user) {
  const restaurants =
    user.role === 'owner'
      ? await Restaurant.find({ organizationId: user.organizationId })
      : await Restaurant.find({ _id: { $in: user.restaurantIds } });
  const organization = await Organization.findById(user.organizationId);
  const token = signToken(user);
  return {
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
  };
}

async function buildInviteEmailContext(invite, rawToken) {
  const [org, restaurant, inviter] = await Promise.all([
    Organization.findById(invite.organizationId),
    invite.restaurantId ? Restaurant.findById(invite.restaurantId) : null,
    User.findById(invite.invitedBy),
  ]);
  return {
    to: invite.email,
    inviteeName: invite.name,
    inviterName: inviter?.name || 'Administrador',
    orgName: org?.name || 'TecnoPOS',
    restaurantName: restaurant?.name || '',
    role: invite.role,
    acceptUrl: `${clientOrigin()}/invite/${rawToken}`,
    days: INVITE_DAYS,
  };
}

/** Authenticated: list pending invites */
router.get('/', auth, requireRoles('owner', 'manager'), async (req, res) => {
  const invites = await Invitation.find({
    organizationId: req.user.organizationId,
    status: 'pending',
    expiresAt: { $gt: new Date() },
  })
    .sort({ createdAt: -1 })
    .limit(100);
  res.json(invites);
});

/** Authenticated: create / resend invite */
router.post('/', auth, requireRoles('owner', 'manager'), async (req, res) => {
  try {
    const restaurantId = restaurantScope(req) || req.body.restaurantId;
    const email = String(req.body.email || '').toLowerCase().trim();
    const name = String(req.body.name || '').trim();
    const role = req.body.role;
    if (!email || !role) return res.status(400).json({ error: 'Email y rol son requeridos' });
    if (!['waiter', 'cashier', 'kitchen', 'manager'].includes(role)) {
      return res.status(400).json({ error: 'Rol inválido' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(409).json({ error: 'Ese email ya tiene una cuenta en TecnoPOS' });

    const rawToken = makeToken();
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + INVITE_DAYS * 24 * 60 * 60 * 1000);

    let invite = await Invitation.findOne({
      organizationId: req.user.organizationId,
      email,
      status: 'pending',
    });

    if (invite) {
      invite.name = name || invite.name;
      invite.role = role;
      invite.restaurantId = restaurantId || invite.restaurantId;
      invite.tokenHash = tokenHash;
      invite.expiresAt = expiresAt;
      invite.invitedBy = req.user._id;
      await invite.save();
    } else {
      invite = await Invitation.create({
        organizationId: req.user.organizationId,
        restaurantId: restaurantId || undefined,
        invitedBy: req.user._id,
        email,
        name,
        role,
        tokenHash,
        expiresAt,
      });
    }

    await sendInviteEmail(await buildInviteEmailContext(invite, rawToken));
    res.status(201).json({
      id: invite._id,
      email: invite.email,
      name: invite.name,
      role: invite.role,
      status: invite.status,
      expiresAt: invite.expiresAt,
      message: `Invitación enviada a ${email}`,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || 'No se pudo enviar la invitación' });
  }
});

/** Authenticated: revoke */
router.delete('/:id', auth, requireRoles('owner', 'manager'), async (req, res) => {
  const invite = await Invitation.findOne({
    _id: req.params.id,
    organizationId: req.user.organizationId,
  });
  if (!invite) return res.status(404).json({ error: 'Invitación no encontrada' });
  invite.status = 'revoked';
  await invite.save();
  res.json({ ok: true });
});

/** Public: peek invite */
router.get('/:token', async (req, res) => {
  const tokenHash = hashToken(req.params.token);
  const invite = await Invitation.findOne({ tokenHash });
  if (!invite) return res.status(404).json({ error: 'Invitación no válida' });
  if (invite.status !== 'pending') {
    return res.status(410).json({ error: 'Esta invitación ya no está disponible' });
  }
  if (invite.expiresAt < new Date()) {
    invite.status = 'expired';
    await invite.save();
    return res.status(410).json({ error: 'Esta invitación expiró' });
  }

  const [org, restaurant] = await Promise.all([
    Organization.findById(invite.organizationId),
    invite.restaurantId ? Restaurant.findById(invite.restaurantId) : null,
  ]);

  res.json({
    email: invite.email,
    name: invite.name,
    role: invite.role,
    orgName: org?.name || 'TecnoPOS',
    restaurantName: restaurant?.name || '',
    expiresAt: invite.expiresAt,
  });
});

/** Public: accept */
router.post('/:token/accept', async (req, res) => {
  try {
    const { password } = req.body;
    const name = String(req.body.name || '').trim();
    if (!name || !password) return res.status(400).json({ error: 'Nombre y contraseña son requeridos' });
    if (String(password).length < 6) return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });

    const tokenHash = hashToken(req.params.token);
    const invite = await Invitation.findOne({ tokenHash });
    if (!invite) return res.status(404).json({ error: 'Invitación no válida' });
    if (invite.status !== 'pending') {
      return res.status(410).json({ error: 'Esta invitación ya no está disponible' });
    }
    if (invite.expiresAt < new Date()) {
      invite.status = 'expired';
      await invite.save();
      return res.status(410).json({ error: 'Esta invitación expiró' });
    }

    const existing = await User.findOne({ email: invite.email });
    if (existing) return res.status(409).json({ error: 'Ese email ya tiene una cuenta' });

    const user = await User.create({
      organizationId: invite.organizationId,
      restaurantIds: invite.restaurantId ? [invite.restaurantId] : [],
      name,
      email: invite.email,
      password,
      role: invite.role,
    });

    invite.status = 'accepted';
    invite.acceptedAt = new Date();
    await invite.save();

    res.status(201).json(await sessionPayload(user));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || 'No se pudo aceptar la invitación' });
  }
});

export default router;
