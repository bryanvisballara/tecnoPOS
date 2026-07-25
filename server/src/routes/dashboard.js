import { Router } from 'express';
import Order from '../models/Order.js';
import Restaurant from '../models/Restaurant.js';
import Stock from '../models/Stock.js';
import Table from '../models/Table.js';
import { auth, requireRoles, restaurantScope } from '../middleware/auth.js';

const router = Router();
router.use(auth);
router.use(requireRoles('owner', 'manager', 'cashier'));

function startOfDay(d = new Date()) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

router.get('/overview', async (req, res) => {
  try {
    const orgId = req.user.organizationId;
    let restaurantIds;

    if (req.query.restaurantId) {
      const scoped = restaurantScope(req);
      if (!scoped) return res.status(403).json({ error: 'Sin acceso a este restaurante' });
      restaurantIds = [scoped];
    } else if (req.user.role === 'owner') {
      restaurantIds = await Restaurant.find({ organizationId: orgId }).distinct('_id');
    } else {
      restaurantIds = req.user.restaurantIds;
    }

    const today = startOfDay();
    const paidToday = await Order.find({
      restaurantId: { $in: restaurantIds },
      status: 'paid',
      closedAt: { $gte: today },
    });

    const openOrders = await Order.countDocuments({
      restaurantId: { $in: restaurantIds },
      status: { $in: ['open', 'sent', 'preparing', 'ready', 'served'] },
    });

    const revenue = paidToday.reduce((s, o) => s + o.total, 0);
    const tickets = paidToday.length;
    const avgTicket = tickets ? Math.round(revenue / tickets) : 0;
    const guests = paidToday.reduce((s, o) => s + (o.guests || 1), 0);

    const byRestaurant = {};
    for (const id of restaurantIds) byRestaurant[id.toString()] = { revenue: 0, tickets: 0, guests: 0 };
    for (const o of paidToday) {
      const key = o.restaurantId.toString();
      if (!byRestaurant[key]) byRestaurant[key] = { revenue: 0, tickets: 0, guests: 0 };
      byRestaurant[key].revenue += o.total;
      byRestaurant[key].tickets += 1;
      byRestaurant[key].guests += o.guests || 1;
    }

    const restaurants = await Restaurant.find({ _id: { $in: restaurantIds } });
    const locations = restaurants.map((r) => ({
      id: r._id,
      name: r.name,
      code: r.code,
      ...(byRestaurant[r._id.toString()] || { revenue: 0, tickets: 0, guests: 0 }),
    }));

    const itemCounts = {};
    for (const o of paidToday) {
      for (const item of o.items) {
        if (item.status === 'void') continue;
        itemCounts[item.name] = (itemCounts[item.name] || 0) + item.quantity;
      }
    }
    const topItems = Object.entries(itemCounts)
      .map(([name, qty]) => ({ name, qty }))
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 8);

    const occupied = await Table.countDocuments({
      restaurantId: { $in: restaurantIds },
      status: { $in: ['occupied', 'billing'] },
    });
    const totalTables = await Table.countDocuments({ restaurantId: { $in: restaurantIds } });

    const lowStock = await Stock.find({
      restaurantId: { $in: restaurantIds },
      $expr: { $lte: ['$onHand', '$reorderPoint'] },
    })
      .populate('ingredientId', 'name unit')
      .populate('restaurantId', 'name')
      .limit(15);

    // last 7 days revenue series
    const series = [];
    for (let i = 6; i >= 0; i--) {
      const from = startOfDay(new Date(Date.now() - i * 86400000));
      const to = new Date(from);
      to.setDate(to.getDate() + 1);
      const dayOrders = await Order.find({
        restaurantId: { $in: restaurantIds },
        status: 'paid',
        closedAt: { $gte: from, $lt: to },
      }).select('total');
      series.push({
        date: from.toISOString().slice(0, 10),
        revenue: dayOrders.reduce((s, o) => s + o.total, 0),
        tickets: dayOrders.length,
      });
    }

    res.json({
      consolidated: { revenue, tickets, avgTicket, guests, openOrders, occupied, totalTables },
      locations,
      topItems,
      lowStock,
      series,
      scope: req.query.restaurantId ? 'restaurant' : 'chain',
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
