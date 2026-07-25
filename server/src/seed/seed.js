import Organization from '../models/Organization.js';
import Restaurant from '../models/Restaurant.js';
import User from '../models/User.js';
import Category from '../models/Category.js';
import MenuItem from '../models/MenuItem.js';
import Ingredient from '../models/Ingredient.js';
import Recipe from '../models/Recipe.js';
import Stock from '../models/Stock.js';
import Table from '../models/Table.js';
import Customer from '../models/Customer.js';
import Order from '../models/Order.js';

const RESTAURANTS = [
  { name: 'TecnoPOS Centro', code: 'CTR', city: 'Barranquilla', address: 'Calle 72 #54-10' },
  { name: 'TecnoPOS Norte', code: 'NTE', city: 'Barranquilla', address: 'Cra 51B #80-45' },
  { name: 'TecnoPOS Prado', code: 'PRD', city: 'Barranquilla', address: 'Calle 53 #54-20' },
  { name: 'TecnoPOS Mall', code: 'MAL', city: 'Soledad', address: 'CC Buenavista Local 210' },
  { name: 'TecnoPOS Playa', code: 'PLY', city: 'Puerto Colombia', address: 'Av. Circunvalar #5-30' },
];

export async function seedDatabase() {
  const existing = await Organization.findOne({ slug: 'tecnopos' });
  if (existing) {
    console.log('Seed omitido: organización ya existe');
    return { seeded: false, organizationId: existing._id };
  }

  const org = await Organization.create({
    name: 'TecnoPOS Group',
    slug: 'tecnopos',
    slogan: 'TU NEGOCIO, EN CONTROL',
    settings: { currency: 'COP', taxRate: 0.08, timezone: 'America/Bogota' },
  });

  const restaurants = await Restaurant.insertMany(
    RESTAURANTS.map((r) => ({ ...r, organizationId: org._id, openHours: '11:00 - 23:00', phone: '+57 300 000 0000' }))
  );

  await User.create([
    {
      organizationId: org._id,
      restaurantIds: restaurants.map((r) => r._id),
      name: 'Bryan Visbal',
      email: 'owner@tecnopos.app',
      password: 'TecnoPOS2026!',
      role: 'owner',
      avatarColor: '#00a8ff',
    },
    {
      organizationId: org._id,
      restaurantIds: [restaurants[0]._id],
      name: 'Ana Gerente',
      email: 'gerente@tecnopos.app',
      password: 'TecnoPOS2026!',
      role: 'manager',
      avatarColor: '#7dd3fc',
    },
    {
      organizationId: org._id,
      restaurantIds: [restaurants[0]._id],
      name: 'Carlos Mesero',
      email: 'mesero@tecnopos.app',
      password: 'TecnoPOS2026!',
      role: 'waiter',
      avatarColor: '#38bdf8',
    },
    {
      organizationId: org._id,
      restaurantIds: [restaurants[0]._id],
      name: 'Luisa Cocina',
      email: 'cocina@tecnopos.app',
      password: 'TecnoPOS2026!',
      role: 'kitchen',
      avatarColor: '#fbbf24',
    },
    {
      organizationId: org._id,
      restaurantIds: [restaurants[0]._id],
      name: 'Pedro Caja',
      email: 'caja@tecnopos.app',
      password: 'TecnoPOS2026!',
      role: 'cashier',
      avatarColor: '#a3e635',
    },
  ]);

  const categories = await Category.insertMany([
    { organizationId: org._id, name: 'Entradas', sortOrder: 1, color: '#38bdf8' },
    { organizationId: org._id, name: 'Platos fuertes', sortOrder: 2, color: '#00a8ff' },
    { organizationId: org._id, name: 'Bebidas', sortOrder: 3, color: '#67e8f9' },
    { organizationId: org._id, name: 'Postres', sortOrder: 4, color: '#c4b5fd' },
  ]);

  const ingredients = await Ingredient.insertMany([
    { organizationId: org._id, name: 'Carne de res', unit: 'kg', costPerUnit: 28000, supplier: 'Carnes del Caribe' },
    { organizationId: org._id, name: 'Pollo', unit: 'kg', costPerUnit: 12000, supplier: 'Avícola Norte' },
    { organizationId: org._id, name: 'Arroz', unit: 'kg', costPerUnit: 4500, supplier: 'Mayorista Costa' },
    { organizationId: org._id, name: 'Papa', unit: 'kg', costPerUnit: 2800, supplier: 'Mayorista Costa' },
    { organizationId: org._id, name: 'Queso mozzarella', unit: 'kg', costPerUnit: 22000, supplier: 'Lácteos SA' },
    { organizationId: org._id, name: 'Pan hamburguesa', unit: 'unidad', costPerUnit: 800, supplier: 'Panadería Central' },
    { organizationId: org._id, name: 'Lechuga', unit: 'kg', costPerUnit: 3500, supplier: 'Frescos del Día' },
    { organizationId: org._id, name: 'Tomate', unit: 'kg', costPerUnit: 4000, supplier: 'Frescos del Día' },
    { organizationId: org._id, name: 'Aceite', unit: 'L', costPerUnit: 9000, supplier: 'Mayorista Costa' },
    { organizationId: org._id, name: 'Café', unit: 'kg', costPerUnit: 32000, supplier: 'Café Sierra' },
    { organizationId: org._id, name: 'Leche', unit: 'L', costPerUnit: 4500, supplier: 'Lácteos SA' },
    { organizationId: org._id, name: 'Azúcar', unit: 'kg', costPerUnit: 3800, supplier: 'Mayorista Costa' },
  ]);

  const byName = Object.fromEntries(ingredients.map((i) => [i.name, i]));

  const recipes = await Recipe.insertMany([
    {
      organizationId: org._id,
      name: 'Hamburguesa clásica',
      portions: 1,
      prepMinutes: 12,
      lines: [
        { ingredientId: byName['Carne de res']._id, quantity: 0.18, unit: 'kg' },
        { ingredientId: byName['Pan hamburguesa']._id, quantity: 1, unit: 'unidad' },
        { ingredientId: byName['Lechuga']._id, quantity: 0.03, unit: 'kg' },
        { ingredientId: byName['Tomate']._id, quantity: 0.04, unit: 'kg' },
        { ingredientId: byName['Queso mozzarella']._id, quantity: 0.03, unit: 'kg' },
      ],
      instructions: 'Sellar carne, montar con vegetales y queso.',
    },
    {
      organizationId: org._id,
      name: 'Pollo a la plancha',
      portions: 1,
      prepMinutes: 15,
      lines: [
        { ingredientId: byName['Pollo']._id, quantity: 0.25, unit: 'kg' },
        { ingredientId: byName['Papa']._id, quantity: 0.2, unit: 'kg' },
        { ingredientId: byName['Aceite']._id, quantity: 0.02, unit: 'L' },
      ],
      instructions: 'Marinar, plancha y acompañar con papas.',
    },
    {
      organizationId: org._id,
      name: 'Café latte',
      portions: 1,
      prepMinutes: 4,
      lines: [
        { ingredientId: byName['Café']._id, quantity: 0.018, unit: 'kg' },
        { ingredientId: byName['Leche']._id, quantity: 0.2, unit: 'L' },
        { ingredientId: byName['Azúcar']._id, quantity: 0.01, unit: 'kg' },
      ],
    },
  ]);

  const menu = await MenuItem.insertMany([
    {
      organizationId: org._id,
      categoryId: categories[0]._id,
      name: 'Nachos Tecno',
      description: 'Nachos con queso y guacamole',
      price: 22000,
      cost: 7000,
      station: 'cold',
      prepMinutes: 8,
      modifiers: [
        { name: 'Extra queso', price: 4000 },
        { name: 'Sin picante', price: 0 },
      ],
    },
    {
      organizationId: org._id,
      categoryId: categories[1]._id,
      name: 'Hamburguesa clásica',
      description: 'Carne 180g, queso, vegetales',
      price: 28000,
      cost: 11000,
      station: 'hot',
      prepMinutes: 12,
      recipeId: recipes[0]._id,
      modifiers: [
        { name: 'Doble carne', price: 10000 },
        { name: 'Sin cebolla', price: 0 },
      ],
    },
    {
      organizationId: org._id,
      categoryId: categories[1]._id,
      name: 'Pollo a la plancha',
      description: 'Con papas criollas',
      price: 32000,
      cost: 12000,
      station: 'hot',
      prepMinutes: 15,
      recipeId: recipes[1]._id,
    },
    {
      organizationId: org._id,
      categoryId: categories[1]._id,
      name: 'Bandeja paisa light',
      description: 'Versión controlada de la clásica',
      price: 38000,
      cost: 15000,
      station: 'hot',
      prepMinutes: 18,
    },
    {
      organizationId: org._id,
      categoryId: categories[2]._id,
      name: 'Limonada natural',
      price: 8000,
      cost: 1500,
      station: 'bar',
      prepMinutes: 3,
    },
    {
      organizationId: org._id,
      categoryId: categories[2]._id,
      name: 'Café latte',
      price: 9000,
      cost: 2500,
      station: 'bar',
      prepMinutes: 4,
      recipeId: recipes[2]._id,
    },
    {
      organizationId: org._id,
      categoryId: categories[3]._id,
      name: 'Brownie con helado',
      price: 14000,
      cost: 4500,
      station: 'dessert',
      prepMinutes: 5,
    },
  ]);

  for (const restaurant of restaurants) {
    const stocks = ingredients.map((ing, idx) => ({
      organizationId: org._id,
      restaurantId: restaurant._id,
      ingredientId: ing._id,
      onHand: 20 + idx * 3,
      parLevel: 30,
      reorderPoint: 8,
    }));
    await Stock.insertMany(stocks);

    const tables = [];
    const zones = ['Salón', 'Terraza', 'VIP'];
    let n = 1;
    for (const zone of zones) {
      for (let i = 0; i < 4; i++) {
        tables.push({
          organizationId: org._id,
          restaurantId: restaurant._id,
          name: `M${n}`,
          seats: zone === 'VIP' ? 6 : 4,
          zone,
          x: 60 + (i % 4) * 140,
          y: 60 + zones.indexOf(zone) * 160,
          width: zone === 'VIP' ? 120 : 90,
          height: zone === 'VIP' ? 120 : 90,
          shape: zone === 'VIP' ? 'round' : 'square',
          status: 'free',
        });
        n += 1;
      }
    }
    await Table.insertMany(tables);
  }

  await Customer.insertMany([
    { organizationId: org._id, name: 'María López', phone: '3001112233', email: 'maria@email.com', tags: ['vip'] },
    { organizationId: org._id, name: 'José Ramírez', phone: '3014445566', tags: ['frecuente'] },
    { organizationId: org._id, name: 'Empresa Visbal SAS', phone: '6053000000', email: 'compras@visbal.com', tags: ['corporativo'] },
  ]);

  // Sample paid orders today across locations for KPIs
  const burger = menu.find((m) => m.name === 'Hamburguesa clásica');
  const latte = menu.find((m) => m.name === 'Café latte');
  for (let i = 0; i < restaurants.length; i++) {
    const r = restaurants[i];
    const count = 3 + i;
    for (let j = 0; j < count; j++) {
      const items = [
        {
          menuItemId: burger._id,
          name: burger.name,
          quantity: 1 + (j % 2),
          unitPrice: burger.price,
          station: 'hot',
          status: 'served',
        },
        {
          menuItemId: latte._id,
          name: latte.name,
          quantity: 1,
          unitPrice: latte.price,
          station: 'bar',
          status: 'served',
        },
      ];
      const subtotal = items.reduce((s, it) => s + it.unitPrice * it.quantity, 0);
      const tax = Math.round(subtotal * 0.08);
      await Order.create({
        organizationId: org._id,
        restaurantId: r._id,
        orderNumber: 1001 + j + i * 10,
        type: 'dine_in',
        status: 'paid',
        items,
        guests: 2,
        subtotal,
        tax,
        discount: 0,
        total: subtotal + tax,
        payments: [{ method: j % 2 === 0 ? 'cash' : 'card', amount: subtotal + tax, tip: 2000 }],
        openedAt: new Date(),
        closedAt: new Date(),
      });
    }
  }

  console.log('Seed TecnoPOS listo');
  return { seeded: true, organizationId: org._id, restaurants: restaurants.length };
}
