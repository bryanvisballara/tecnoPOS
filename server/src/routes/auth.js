import { Router } from 'express';
import User from '../models/User.js';
import Restaurant from '../models/Restaurant.js';
import Organization from '../models/Organization.js';
import { auth, signToken } from '../middleware/auth.js';
import { issueEmailCode, consumeEmailCode } from '../utils/emailCodes.js';

const router = Router();

function slugify(text) {
  return (
    String(text || 'cadena')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
      .slice(0, 40) || 'cadena'
  );
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

/** Paso 1 registro: valida datos y envía código de 6 dígitos */
router.post('/register/request', async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      organizationName,
      restaurantName,
      city,
      phone,
      phoneCountry,
      phoneDial,
      phoneE164,
    } = req.body;
    if (!name || !email || !password || !organizationName) {
      return res.status(400).json({ error: 'Completa nombre, email, contraseña y nombre de la cadena' });
    }
    if (!phone || String(phone).replace(/\D/g, '').length < 6) {
      return res.status(400).json({ error: 'Ingresa un número de teléfono válido' });
    }
    if (String(password).length < 6) {
      return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const exists = await User.findOne({ email: normalizedEmail });
    if (exists) return res.status(409).json({ error: 'Ese email ya está registrado' });

    const issued = await issueEmailCode({
      email: normalizedEmail,
      purpose: 'register',
      payload: {
        name: name.trim(),
        email: normalizedEmail,
        password,
        organizationName: organizationName.trim(),
        restaurantName: (restaurantName || '').trim(),
        city: (city || '').trim(),
        phone: String(phone).replace(/\D/g, ''),
        phoneCountry: phoneCountry || 'CO',
        phoneDial: phoneDial || '+57',
        phoneE164: phoneE164 || `${phoneDial || '+57'}${String(phone).replace(/\D/g, '')}`,
      },
    });

    res.json({
      ok: true,
      email: normalizedEmail,
      expiresInMinutes: issued.expiresInMinutes,
      message: 'Te enviamos un código de 6 dígitos a tu correo. Expira en 15 minutos.',
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** Paso 2 registro: verifica código y crea cuenta */
router.post('/register/verify', async (req, res) => {
  try {
    const { email, code } = req.body;
    const result = await consumeEmailCode({ email, purpose: 'register', code });
    if (!result.ok) return res.status(400).json({ error: result.error });

    const data = result.payload;
    if (!data) return res.status(400).json({ error: 'Sesión de registro inválida. Solicita un código nuevo.' });

    const stillExists = await User.findOne({ email: data.email });
    if (stillExists) return res.status(409).json({ error: 'Ese email ya está registrado' });

    let slug = slugify(data.organizationName);
    const slugTaken = await Organization.findOne({ slug });
    if (slugTaken) slug = `${slug}-${Date.now().toString(36).slice(-4)}`;

    const org = await Organization.create({
      name: data.organizationName,
      slug,
      slogan: 'TU NEGOCIO, EN CONTROL',
    });

    const restaurant = await Restaurant.create({
      organizationId: org._id,
      name: data.restaurantName || data.organizationName,
      code: 'S1',
      city: data.city || '',
      address: '',
      openHours: '11:00 - 23:00',
      active: true,
    });

    const user = await User.create({
      organizationId: org._id,
      restaurantIds: [restaurant._id],
      name: data.name,
      email: data.email,
      phone: data.phoneE164 || data.phone || '',
      phoneCountry: data.phoneCountry || 'CO',
      phoneDial: data.phoneDial || '+57',
      password: data.password,
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
    if (!user) {
      // Misma respuesta para no filtrar existencia
      return res.json({
        ok: true,
        email,
        message: 'Si el correo está registrado, te enviamos un código de 6 dígitos. Expira en 15 minutos.',
      });
    }

    await issueEmailCode({ email, purpose: 'reset', payload: { userId: user._id.toString() } });

    res.json({
      ok: true,
      email,
      expiresInMinutes: 15,
      message: 'Te enviamos un código de 6 dígitos a tu correo. Expira en 15 minutos.',
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/reset-password', async (req, res) => {
  try {
    const { email, code, password } = req.body;
    if (!email || !code || !password) {
      return res.status(400).json({ error: 'Email, código y nueva contraseña son requeridos' });
    }
    if (String(password).length < 6) {
      return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
    }

    const result = await consumeEmailCode({ email, purpose: 'reset', code });
    if (!result.ok) return res.status(400).json({ error: result.error });

    const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+password');
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

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
