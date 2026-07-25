import { Router } from 'express';
import Category from '../models/Category.js';
import MenuItem from '../models/MenuItem.js';
import Recipe from '../models/Recipe.js';
import Ingredient from '../models/Ingredient.js';
import { auth, requireRoles } from '../middleware/auth.js';
import { recipeLineCost } from '../utils/units.js';

const router = Router();
router.use(auth);

router.get('/categories', async (req, res) => {
  const cats = await Category.find({ organizationId: req.user.organizationId, active: true }).sort({ sortOrder: 1 });
  res.json(cats);
});

router.post('/categories', requireRoles('owner', 'manager'), async (req, res) => {
  const cat = await Category.create({ ...req.body, organizationId: req.user.organizationId });
  res.status(201).json(cat);
});

router.get('/items', async (req, res) => {
  const filter = { organizationId: req.user.organizationId };
  if (req.query.categoryId) filter.categoryId = req.query.categoryId;
  if (req.query.available === 'true') filter.available = true;
  const items = await MenuItem.find(filter)
    .populate('categoryId', 'name color')
    .populate({
      path: 'recipeId',
      populate: { path: 'lines.ingredientId', select: 'name unit costPerUnit' },
    })
    .sort({ name: 1 });
  res.json(items);
});

router.post('/items', requireRoles('owner', 'manager'), async (req, res) => {
  const item = await MenuItem.create({ ...req.body, organizationId: req.user.organizationId });
  res.status(201).json(item);
});

router.patch('/items/:id', requireRoles('owner', 'manager'), async (req, res) => {
  const item = await MenuItem.findOneAndUpdate(
    { _id: req.params.id, organizationId: req.user.organizationId },
    req.body,
    { new: true }
  );
  if (!item) return res.status(404).json({ error: 'Ítem no encontrado' });
  res.json(item);
});

router.get('/recipes', async (req, res) => {
  const recipes = await Recipe.find({ organizationId: req.user.organizationId }).populate('lines.ingredientId', 'name unit costPerUnit');
  res.json(recipes);
});

router.post('/recipes', requireRoles('owner', 'manager'), async (req, res) => {
  const recipe = await Recipe.create({ ...req.body, organizationId: req.user.organizationId });
  res.status(201).json(recipe);
});

router.get('/recipes/:id/cost', async (req, res) => {
  const recipe = await Recipe.findOne({ _id: req.params.id, organizationId: req.user.organizationId }).populate(
    'lines.ingredientId'
  );
  if (!recipe) return res.status(404).json({ error: 'Receta no encontrada' });
  let cost = 0;
  const breakdown = recipe.lines.map((line) => {
    const ing = line.ingredientId;
    const lineCost = recipeLineCost(line.quantity, line.unit || ing?.unit, ing);
    cost += lineCost;
    return { ingredient: ing?.name, quantity: line.quantity, unit: line.unit || ing?.unit, cost: lineCost };
  });
  res.json({
    recipeId: recipe._id,
    name: recipe.name,
    portions: recipe.portions,
    cost,
    costPerPortion: cost / (recipe.portions || 1),
    breakdown,
  });
});

router.get('/ingredients', async (req, res) => {
  const ingredients = await Ingredient.find({ organizationId: req.user.organizationId, active: true }).sort({ name: 1 });
  res.json(ingredients);
});

router.post('/ingredients', requireRoles('owner', 'manager'), async (req, res) => {
  const ingredient = await Ingredient.create({ ...req.body, organizationId: req.user.organizationId });
  res.status(201).json(ingredient);
});

router.patch('/ingredients/:id', requireRoles('owner', 'manager'), async (req, res) => {
  const updates = { ...req.body };
  delete updates.organizationId;
  const ingredient = await Ingredient.findOneAndUpdate(
    { _id: req.params.id, organizationId: req.user.organizationId },
    updates,
    { new: true }
  );
  if (!ingredient) return res.status(404).json({ error: 'Insumo no encontrado' });
  res.json(ingredient);
});

export default router;
