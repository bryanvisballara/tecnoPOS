import { Router } from 'express';
import crypto from 'crypto';
import User from '../models/User.js';
import Restaurant from '../models/Restaurant.js';
import Organization from '../models/Organization.js';
import { auth, signToken } from '../middleware/auth.js';

const router = Router();

function slugify(text) {
  return String(text || 'cadena')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 40) || 'cadena';
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

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email: email?.toLowerCase()?.trim() }).select('+password');
    if (!user || !(await user.comparePassword(password || ''))) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }
    res.json(await sessionPayload(user));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/register', async (req, res) => {
  try {
    const { name, email, password, organizationName, restaurantName, city } = req.body;
    if (!name || !email || !password || !organizationName) {
      return res.status(400).json({ error: 'Completa nombre, email, contraseña y nombre de la cadena' });
    }
    if (String(password).length < 6) {
      return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
    }

    const exists = await User.findOne({ email: email.toLowerCase().trim() });
    if (exists) return res.status(409).json({ error: 'Ese email ya está registrado' });

    let slug = slugify(organizationName);
    const slugTaken = await Organization.findOne({ slug });
    if (slugTaken) slug = `${slug}-${Date.now().toString(36).slice(-4)}`;

    const org = await Organization.create({
      name: organizationName.trim(),
      slug,
      slogan: 'TU NEGOCIO, EN CONTROL',
    });

    const restaurant = await Restaurant.create({
      organizationId: org._id,
      name: (restaurantName || organizationName).trim(),
      code: 'S1',
      city: city || '',
      address: '',
      openHours: '11:00 - 23:00',
      active: true,
    });

    const user = await User.create({
      organizationId: org._id,
      restaurantIds: [restaurant._id],
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password,
      role: 'owner',
    });

    res.status(201).json(await sessionPayload(user));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/forgot-password', async (req, res) => {
  try {
    const email = req.body.email?.toLowerCase()?.trim();
    if (!email) return res.status(400).json({ error: 'Ingresa tu email' });

    const user = await User.findOne({ email });
    // Respuesta uniforme para no filtrar emails
    if (!user) {
      return res.json({
        ok: true,
        message: 'Si el correo está registrado, te enviaremos instrucciones para restablecer tu contraseña.',
      });
    }

    const token = crypto.randomBytes(32).toString('hex');
    user.resetToken = token;
    user.resetExpires = new Date(Date.now() + 60 * 60 * 1000);
    await user.save();

    const origin = process.env.CLIENT_ORIGIN || 'https://tecnopos.onrender.com';
    const resetUrl = `${origin}/reset-password?token=${token}`;
    console.log(`[reset-password] ${email} → ${resetUrl}`);

    res.json({
      ok: true,
      message: 'Si el correo está registrado, te enviaremos instrucciones para restablecer tu contraseña.',
      // Sin SMTP aún: devolvemos el enlace para que el flujo sea usable
      resetUrl,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) return res.status(400).json({ error: 'Token y contraseña requeridos' });
    if (String(password).length < 6) {
      return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
    }

    const user = await User.findOne({
      resetToken: token,
      resetExpires: { $gt: new Date() },
    }).select('+resetToken +resetExpires +password');

    if (!user) return res.status(400).json({ error: 'El enlace no es válido o ya expiró' });

    user.password = password;
    user.resetToken = undefined;
    user.resetExpires = undefined;
    await user.save();

    res.json({ ok: true, message: 'Contraseña actualizada. Ya puedes iniciar sesión.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/me', auth, async (req, res) => {
  try {
    res.json(await sessionPayload(req.user));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
