import { Router } from 'express';
import Organization from '../models/Organization.js';
import Restaurant from '../models/Restaurant.js';
import Ingredient from '../models/Ingredient.js';
import Stock from '../models/Stock.js';
import MenuItem from '../models/MenuItem.js';
import Category from '../models/Category.js';
import Table from '../models/Table.js';
import User from '../models/User.js';
import { auth, requireRoles, restaurantScope } from '../middleware/auth.js';

const router = Router();
router.use(auth);
router.use(requireRoles('owner', 'manager'));

router.get('/status', async (req, res) => {
  try {
    const orgId = req.user.organizationId;
    const org = await Organization.findById(orgId);
    const restaurantId = restaurantScope(req) || req.user.restaurantIds?.[0];

    const [
      ingredientCount,
      stockCount,
      menuCount,
      tableCount,
      staffCount,
      restaurantCount,
      categories,
    ] = await Promise.all([
      Ingredient.countDocuments({ organizationId: orgId, active: true }),
      restaurantId
        ? Stock.countDocuments({ organizationId: orgId, restaurantId, onHand: { $gt: 0 } })
        : Stock.countDocuments({ organizationId: orgId, onHand: { $gt: 0 } }),
      MenuItem.countDocuments({ organizationId: orgId }),
      restaurantId
        ? Table.countDocuments({ organizationId: orgId, restaurantId })
        : Table.countDocuments({ organizationId: orgId }),
      User.countDocuments({ organizationId: orgId, role: { $ne: 'owner' }, active: true }),
      Restaurant.countDocuments({ organizationId: orgId, active: true }),
      Category.find({ organizationId: orgId, active: true }).sort({ sortOrder: 1 }),
    ]);

    const steps = [
      {
        id: 'ingredients',
        title: 'Insumos y costos',
        description: 'Registra tus materias primas con unidad y costo unitario.',
        done: ingredientCount > 0,
        required: true,
        count: ingredientCount,
      },
      {
        id: 'inventory',
        title: 'Inventario inicial',
        description: 'Carga el stock disponible en tu sede para operar sin quiebres.',
        done: stockCount > 0,
        required: true,
        count: stockCount,
      },
      {
        id: 'menu',
        title: 'Platos del menú',
        description: 'Crea los productos que venderás en el POS con su precio.',
        done: menuCount > 0,
        required: true,
        count: menuCount,
      },
      {
        id: 'tables',
        title: 'Mesas del salón',
        description: 'Define las mesas para tomar pedidos en piso.',
        done: tableCount > 0,
        required: true,
        count: tableCount,
      },
      {
        id: 'staff',
        title: 'Equipo operativo',
        description: 'Crea usuarios de mesero, caja y cocina para tu operación diaria.',
        done: staffCount > 0,
        required: true,
        count: staffCount,
      },
      {
        id: 'locations',
        title: 'Más restaurantes',
        description: 'Opcional: agrega otra sede a tu cadena cuando estés listo.',
        done: restaurantCount > 1,
        required: false,
        count: restaurantCount,
      },
    ];

    const requiredDone = steps.filter((s) => s.required).every((s) => s.done);
    const needsOnboarding =
      req.user.role === 'owner' &&
      !org?.onboardingCompleted &&
      !org?.onboardingSkipped &&
      !requiredDone;

    res.json({
      needsOnboarding,
      onboardingCompleted: Boolean(org?.onboardingCompleted),
      onboardingSkipped: Boolean(org?.onboardingSkipped),
      requiredDone,
      progress: {
        done: steps.filter((s) => s.done).length,
        total: steps.length,
        requiredDone: steps.filter((s) => s.required && s.done).length,
        requiredTotal: steps.filter((s) => s.required).length,
      },
      steps,
      restaurantId,
      categories,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/complete', async (req, res) => {
  const org = await Organization.findByIdAndUpdate(
    req.user.organizationId,
    { onboardingCompleted: true, onboardingSkipped: false },
    { new: true }
  );
  res.json({ ok: true, organization: org });
});

router.post('/skip', async (req, res) => {
  const org = await Organization.findByIdAndUpdate(
    req.user.organizationId,
    { onboardingSkipped: true },
    { new: true }
  );
  res.json({ ok: true, organization: org });
});

/** Atajos del wizard */
router.post('/quick/ingredient', async (req, res) => {
  const { name, unit = 'kg', costPerUnit = 0, supplier } = req.body;
  if (!name) return res.status(400).json({ error: 'Nombre del insumo requerido' });
  const ingredient = await Ingredient.create({
    organizationId: req.user.organizationId,
    name: name.trim(),
    unit,
    costPerUnit: Number(costPerUnit) || 0,
    supplier,
  });
  res.status(201).json(ingredient);
});

router.post('/quick/stock', async (req, res) => {
  const restaurantId = restaurantScope(req);
  const { ingredientId, quantity, parLevel, reorderPoint } = req.body;
  if (!restaurantId || !ingredientId) return res.status(400).json({ error: 'Restaurante e insumo requeridos' });

  let stock = await Stock.findOne({ restaurantId, ingredientId });
  if (!stock) {
    stock = await Stock.create({
      organizationId: req.user.organizationId,
      restaurantId,
      ingredientId,
      onHand: Number(quantity) || 0,
      parLevel: Number(parLevel) || Number(quantity) || 10,
      reorderPoint: Number(reorderPoint) || Math.max(1, Math.floor((Number(quantity) || 10) * 0.3)),
    });
  } else {
    stock.onHand = (stock.onHand || 0) + (Number(quantity) || 0);
    if (parLevel != null) stock.parLevel = Number(parLevel);
    await stock.save();
  }
  res.status(201).json(stock);
});

router.patch('/quick/stock/:id', async (req, res) => {
  const restaurantId = restaurantScope(req);
  const stock = await Stock.findOne({
    _id: req.params.id,
    restaurantId,
    organizationId: req.user.organizationId,
  });
  if (!stock) return res.status(404).json({ error: 'Stock no encontrado' });

  if (req.body.onHand != null) stock.onHand = Number(req.body.onHand);
  if (req.body.parLevel != null) stock.parLevel = Number(req.body.parLevel);
  if (req.body.reorderPoint != null) stock.reorderPoint = Number(req.body.reorderPoint);
  await stock.save();
  res.json(stock);
});

router.delete('/quick/stock/:id', async (req, res) => {
  const restaurantId = restaurantScope(req);
  const stock = await Stock.findOneAndDelete({
    _id: req.params.id,
    restaurantId,
    organizationId: req.user.organizationId,
  });
  if (!stock) return res.status(404).json({ error: 'Stock no encontrado' });
  res.json({ ok: true });
});

router.post('/quick/menu-item', async (req, res) => {
  const { name, price, categoryName = 'Platos fuertes', station = 'hot', description } = req.body;
  if (!name || price == null) return res.status(400).json({ error: 'Nombre y precio requeridos' });

  let category = await Category.findOne({
    organizationId: req.user.organizationId,
    name: categoryName,
  });
  if (!category) {
    category = await Category.create({
      organizationId: req.user.organizationId,
      name: categoryName,
      sortOrder: 1,
      color: '#00a8ff',
    });
  }

  const item = await MenuItem.create({
    organizationId: req.user.organizationId,
    categoryId: category._id,
    name: name.trim(),
    description: description || '',
    price: Number(price),
    station,
    available: true,
  });
  res.status(201).json(item);
});

router.post('/quick/tables', async (req, res) => {
  const restaurantId = restaurantScope(req);
  if (!restaurantId) return res.status(400).json({ error: 'Restaurante requerido' });

  const count = Math.min(Math.max(Number(req.body.count) || 8, 1), 40);
  const existing = await Table.countDocuments({ restaurantId });
  if (existing > 0) {
    return res.json({ ok: true, created: 0, message: 'Ya tienes mesas configuradas' });
  }

  const tables = [];
  for (let i = 0; i < count; i++) {
    const col = i % 4;
    const row = Math.floor(i / 4);
    tables.push({
      organizationId: req.user.organizationId,
      restaurantId,
      name: `M${i + 1}`,
      seats: 4,
      zone: row === 0 ? 'Salón' : row === 1 ? 'Terraza' : 'VIP',
      x: 60 + col * 140,
      y: 60 + row * 160,
      width: 90,
      height: 90,
      shape: 'square',
      status: 'free',
    });
  }
  await Table.insertMany(tables);
  res.status(201).json({ ok: true, created: tables.length });
});

router.post('/quick/staff', async (req, res) => {
  const restaurantId = restaurantScope(req);
  const { name, email, password, role } = req.body;
  if (!name || !email || !password || !role) {
    return res.status(400).json({ error: 'Nombre, email, contraseña y rol son requeridos' });
  }
  if (!['waiter', 'cashier', 'kitchen', 'manager'].includes(role)) {
    return res.status(400).json({ error: 'Rol inválido' });
  }
  const exists = await User.findOne({ email: email.toLowerCase().trim() });
  if (exists) return res.status(409).json({ error: 'Ese email ya está en uso' });

  const user = await User.create({
    organizationId: req.user.organizationId,
    restaurantIds: restaurantId ? [restaurantId] : req.user.restaurantIds,
    name: name.trim(),
    email: email.toLowerCase().trim(),
    password,
    role,
  });

  res.status(201).json({
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
  });
});

router.post('/quick/restaurant', async (req, res) => {
  const { name, city, address, code } = req.body;
  if (!name) return res.status(400).json({ error: 'Nombre de la sede requerido' });

  const count = await Restaurant.countDocuments({ organizationId: req.user.organizationId });
  const restaurant = await Restaurant.create({
    organizationId: req.user.organizationId,
    name: name.trim(),
    code: (code || `S${count + 1}`).toUpperCase(),
    city: city || '',
    address: address || '',
    openHours: '11:00 - 23:00',
    active: true,
  });

  // Vincular sede al owner
  await User.findByIdAndUpdate(req.user._id, { $addToSet: { restaurantIds: restaurant._id } });

  res.status(201).json(restaurant);
});

export default router;
