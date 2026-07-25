import { Router } from 'express';
import Organization from '../models/Organization.js';
import Restaurant from '../models/Restaurant.js';
import Ingredient from '../models/Ingredient.js';
import Stock from '../models/Stock.js';
import MenuItem from '../models/MenuItem.js';
import Recipe from '../models/Recipe.js';
import Category from '../models/Category.js';
import Table from '../models/Table.js';
import User from '../models/User.js';
import Invitation from '../models/Invitation.js';
import { auth, requireRoles, restaurantScope } from '../middleware/auth.js';
import { recipeLineCost } from '../utils/units.js';
import { totalDishCost } from '../utils/operatingCosts.js';

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
      categoryCount,
      menuCount,
      tableCount,
      staffCount,
      inviteCount,
      restaurantCount,
      categories,
    ] = await Promise.all([
      Ingredient.countDocuments({ organizationId: orgId, active: true }),
      restaurantId
        ? Stock.countDocuments({ organizationId: orgId, restaurantId, onHand: { $gt: 0 } })
        : Stock.countDocuments({ organizationId: orgId, onHand: { $gt: 0 } }),
      Category.countDocuments({ organizationId: orgId, active: true }),
      MenuItem.countDocuments({ organizationId: orgId, available: { $ne: false } }),
      restaurantId
        ? Table.countDocuments({ organizationId: orgId, restaurantId })
        : Table.countDocuments({ organizationId: orgId }),
      User.countDocuments({ organizationId: orgId, role: { $ne: 'owner' }, active: { $ne: false } }),
      Invitation.countDocuments({
        organizationId: orgId,
        status: 'pending',
        expiresAt: { $gt: new Date() },
      }),
      Restaurant.countDocuments({ organizationId: orgId, active: true }),
      Category.find({ organizationId: orgId, active: true }).sort({ sortOrder: 1 }),
    ]);

    const teamCount = staffCount + inviteCount;

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
        id: 'categories',
        title: 'Categorías del menú',
        description: 'Organiza el menú: entradas, fuertes, bebidas, postres, combos, etc.',
        done: categoryCount > 0,
        required: true,
        count: categoryCount,
      },
      {
        id: 'menu',
        title: 'Platos del menú',
        description: 'Crea platos con receta de insumos, costo automático y precio de venta.',
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
        description: 'Invita a meseros, caja y cocina. Ellos aceptan por correo y crean su acceso.',
        done: teamCount > 0,
        required: true,
        count: teamCount,
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

router.post('/quick/category', async (req, res) => {
  const { name, color = '#00a8ff', sortOrder } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'Nombre de categoría requerido' });
  const existing = await Category.findOne({
    organizationId: req.user.organizationId,
    name: name.trim(),
  });
  if (existing) {
    if (existing.active === false) {
      existing.active = true;
      existing.color = color || existing.color;
      if (sortOrder != null) existing.sortOrder = Number(sortOrder);
      await existing.save();
      return res.status(200).json(existing);
    }
    return res.status(400).json({ error: 'Esa categoría ya existe' });
  }
  const count = await Category.countDocuments({ organizationId: req.user.organizationId });
  const category = await Category.create({
    organizationId: req.user.organizationId,
    name: name.trim(),
    color,
    sortOrder: sortOrder != null ? Number(sortOrder) : count + 1,
  });
  res.status(201).json(category);
});

router.post('/quick/categories/suggest', async (req, res) => {
  const suggestions = [
    { name: 'Entradas', color: '#38bdf8' },
    { name: 'Platos fuertes', color: '#00a8ff' },
    { name: 'Bebidas', color: '#67e8f9' },
    { name: 'Gaseosas', color: '#22d3ee' },
    { name: 'Postres', color: '#c4b5fd' },
    { name: 'Combos', color: '#a3e635' },
  ];
  const created = [];
  for (let i = 0; i < suggestions.length; i++) {
    const s = suggestions[i];
    let cat = await Category.findOne({ organizationId: req.user.organizationId, name: s.name });
    if (!cat) {
      cat = await Category.create({
        organizationId: req.user.organizationId,
        name: s.name,
        color: s.color,
        sortOrder: i + 1,
      });
      created.push(cat);
    } else if (cat.active === false) {
      cat.active = true;
      cat.color = s.color;
      await cat.save();
      created.push(cat);
    }
  }
  const all = await Category.find({ organizationId: req.user.organizationId, active: true }).sort({ sortOrder: 1 });
  res.json({ created: created.length, categories: all });
});

router.post('/quick/menu-item', async (req, res) => {
  const {
    name,
    price,
    categoryId,
    categoryName = 'Platos fuertes',
    station = 'hot',
    description,
    portions = 1,
    lines = [],
    operatingCosts = [],
  } = req.body;
  if (!name || price == null) return res.status(400).json({ error: 'Nombre y precio requeridos' });

  let category = null;
  if (categoryId) {
    category = await Category.findOne({
      _id: categoryId,
      organizationId: req.user.organizationId,
      active: { $ne: false },
    });
    if (!category) return res.status(400).json({ error: 'Categoría inválida' });
  } else {
    category = await Category.findOne({
      organizationId: req.user.organizationId,
      name: categoryName,
      active: { $ne: false },
    });
    if (!category) {
      category = await Category.create({
        organizationId: req.user.organizationId,
        name: categoryName,
        sortOrder: 1,
        color: '#00a8ff',
      });
    }
  }

  const cleanLines = (Array.isArray(lines) ? lines : [])
    .filter((l) => l?.ingredientId && Number(l.quantity) > 0)
    .map((l) => ({
      ingredientId: l.ingredientId,
      quantity: Number(l.quantity),
      unit: l.unit || undefined,
    }));

  const cleanOperating = (Array.isArray(operatingCosts) ? operatingCosts : [])
    .filter((l) => l?.name?.trim() && Number(l.value) > 0)
    .map((l) => ({
      name: String(l.name).trim(),
      mode: l.mode === 'percent' ? 'percent' : 'fixed',
      value: Number(l.value) || 0,
    }));

  let recipeId;
  let ingredientCost = 0;
  if (cleanLines.length) {
    const ings = await Ingredient.find({
      _id: { $in: cleanLines.map((l) => l.ingredientId) },
      organizationId: req.user.organizationId,
      active: { $ne: false },
    });
    const byId = Object.fromEntries(ings.map((i) => [String(i._id), i]));

    for (const line of cleanLines) {
      const ing = byId[String(line.ingredientId)];
      if (!ing) return res.status(400).json({ error: 'Insumo de receta inválido' });
      if (!line.unit) line.unit = ing.unit;
      ingredientCost += recipeLineCost(line.quantity, line.unit, ing);
    }
    ingredientCost = ingredientCost / (Number(portions) || 1);

    const recipe = await Recipe.create({
      organizationId: req.user.organizationId,
      name: name.trim(),
      portions: Number(portions) || 1,
      lines: cleanLines,
    });
    recipeId = recipe._id;
  }

  const cost = Math.round(totalDishCost(ingredientCost, cleanOperating));

  const item = await MenuItem.create({
    organizationId: req.user.organizationId,
    categoryId: category._id,
    name: name.trim(),
    description: description || '',
    price: Number(price),
    ingredientCost: Math.round(ingredientCost),
    cost,
    operatingCosts: cleanOperating,
    station,
    available: true,
    recipeId,
  });

  const populated = await MenuItem.findById(item._id)
    .populate('categoryId', 'name color')
    .populate({
      path: 'recipeId',
      populate: { path: 'lines.ingredientId', select: 'name unit costPerUnit' },
    });
  res.status(201).json(populated);
});

router.patch('/quick/menu-item/:id', async (req, res) => {
  const {
    name,
    price,
    categoryId,
    portions = 1,
    lines = [],
    operatingCosts = [],
  } = req.body;

  const item = await MenuItem.findOne({
    _id: req.params.id,
    organizationId: req.user.organizationId,
  });
  if (!item) return res.status(404).json({ error: 'Plato no encontrado' });

  if (categoryId) {
    const category = await Category.findOne({
      _id: categoryId,
      organizationId: req.user.organizationId,
      active: { $ne: false },
    });
    if (!category) return res.status(400).json({ error: 'Categoría inválida' });
    item.categoryId = category._id;
  }
  if (name != null) item.name = String(name).trim();
  if (price != null) item.price = Number(price);

  const cleanLines = (Array.isArray(lines) ? lines : [])
    .filter((l) => l?.ingredientId && Number(l.quantity) > 0)
    .map((l) => ({
      ingredientId: l.ingredientId,
      quantity: Number(l.quantity),
      unit: l.unit || undefined,
    }));

  if (!cleanLines.length) return res.status(400).json({ error: 'La receta necesita al menos un insumo' });

  const cleanOperating = (Array.isArray(operatingCosts) ? operatingCosts : [])
    .filter((l) => l?.name?.trim() && Number(l.value) > 0)
    .map((l) => ({
      name: String(l.name).trim(),
      mode: l.mode === 'percent' ? 'percent' : 'fixed',
      value: Number(l.value) || 0,
    }));

  const ings = await Ingredient.find({
    _id: { $in: cleanLines.map((l) => l.ingredientId) },
    organizationId: req.user.organizationId,
    active: { $ne: false },
  });
  const byId = Object.fromEntries(ings.map((i) => [String(i._id), i]));

  let ingredientCost = 0;
  for (const line of cleanLines) {
    const ing = byId[String(line.ingredientId)];
    if (!ing) return res.status(400).json({ error: 'Insumo de receta inválido' });
    if (!line.unit) line.unit = ing.unit;
    ingredientCost += recipeLineCost(line.quantity, line.unit, ing);
  }
  ingredientCost = ingredientCost / (Number(portions) || 1);

  if (item.recipeId) {
    await Recipe.findOneAndUpdate(
      { _id: item.recipeId, organizationId: req.user.organizationId },
      { name: item.name, portions: Number(portions) || 1, lines: cleanLines }
    );
  } else {
    const recipe = await Recipe.create({
      organizationId: req.user.organizationId,
      name: item.name,
      portions: Number(portions) || 1,
      lines: cleanLines,
    });
    item.recipeId = recipe._id;
  }

  item.ingredientCost = Math.round(ingredientCost);
  item.operatingCosts = cleanOperating;
  item.cost = Math.round(totalDishCost(ingredientCost, cleanOperating));
  await item.save();

  const populated = await MenuItem.findById(item._id)
    .populate('categoryId', 'name color')
    .populate({
      path: 'recipeId',
      populate: { path: 'lines.ingredientId', select: 'name unit costPerUnit' },
    });
  res.json(populated);
});

const DEFAULT_ZONES = ['Salón', 'Terraza', 'VIP'];

router.post('/quick/zone', async (req, res) => {
  const restaurantId = restaurantScope(req) || req.body.restaurantId;
  const name = String(req.body.name || '').trim();
  if (!restaurantId) return res.status(400).json({ error: 'Restaurante requerido' });
  if (!name) return res.status(400).json({ error: 'Nombre de zona requerido' });

  const restaurant = await Restaurant.findOne({
    _id: restaurantId,
    organizationId: req.user.organizationId,
  });
  if (!restaurant) return res.status(404).json({ error: 'Restaurante no encontrado' });

  const zones = Array.isArray(restaurant.zones) && restaurant.zones.length
    ? [...restaurant.zones]
    : [...DEFAULT_ZONES];
  const exists = zones.some((z) => z.toLowerCase() === name.toLowerCase());
  if (!exists) zones.push(name);
  restaurant.zones = zones;
  await restaurant.save();
  res.status(201).json({ ok: true, zone: name, zones: restaurant.zones });
});

router.post('/quick/tables', async (req, res) => {
  const restaurantId = restaurantScope(req);
  if (!restaurantId) return res.status(400).json({ error: 'Restaurante requerido' });

  const count = Math.min(Math.max(Number(req.body.count) || 1, 1), 40);
  const zoneName = String(req.body.zone || 'Salón').trim() || 'Salón';
  const existing = await Table.countDocuments({ restaurantId });

  // Ensure zone is registered on the restaurant
  const restaurant = await Restaurant.findOne({
    _id: restaurantId,
    organizationId: req.user.organizationId,
  });
  if (restaurant) {
    const zones = Array.isArray(restaurant.zones) && restaurant.zones.length
      ? [...restaurant.zones]
      : [...DEFAULT_ZONES];
    if (!zones.some((z) => z.toLowerCase() === zoneName.toLowerCase())) {
      zones.push(zoneName);
      restaurant.zones = zones;
      await restaurant.save();
    }
  }

  const tables = [];
  for (let i = 0; i < count; i++) {
    const n = existing + i;
    const col = n % 4;
    const row = Math.floor(n / 4);
    tables.push({
      organizationId: req.user.organizationId,
      restaurantId,
      name: req.body.name || `M${n + 1}`,
      seats: Number(req.body.seats) || 4,
      zone: zoneName,
      x: 60 + col * 140,
      y: 60 + row * 160,
      width: 90,
      height: 90,
      shape: 'square',
      status: 'free',
    });
  }
  const created = await Table.insertMany(tables);
  res.status(201).json({ ok: true, created: created.length, tables: created });
});

router.patch('/quick/tables/:id', async (req, res) => {
  const restaurantId = restaurantScope(req);
  const table = await Table.findOneAndUpdate(
    { _id: req.params.id, restaurantId, organizationId: req.user.organizationId },
    {
      ...(req.body.name != null ? { name: req.body.name } : {}),
      ...(req.body.seats != null ? { seats: Number(req.body.seats) } : {}),
      ...(req.body.zone != null ? { zone: req.body.zone } : {}),
    },
    { new: true }
  );
  if (!table) return res.status(404).json({ error: 'Mesa no encontrada' });
  res.json(table);
});

router.delete('/quick/tables/:id', async (req, res) => {
  const restaurantId = restaurantScope(req);
  const table = await Table.findOneAndDelete({
    _id: req.params.id,
    restaurantId,
    organizationId: req.user.organizationId,
  });
  if (!table) return res.status(404).json({ error: 'Mesa no encontrada' });
  res.json({ ok: true });
});

router.post('/quick/staff', async (req, res) => {
  // Compat: redirect to invite flow (no password create)
  return res.status(400).json({
    error: 'Usa invitaciones por correo. Envía la invitación desde Equipo operativo.',
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
