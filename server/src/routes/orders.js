import { Router } from 'express';
import Order from '../models/Order.js';
import Table from '../models/Table.js';
import MenuItem from '../models/MenuItem.js';
import Organization from '../models/Organization.js';
import Customer from '../models/Customer.js';
import { auth, restaurantScope } from '../middleware/auth.js';
import { calcOrderTotals, depleteInventoryForOrder, nextOrderNumber } from '../utils/orders.js';

const router = Router();
router.use(auth);

function emitOrder(req, order) {
  const io = req.app.get('io');
  if (!io) return;
  io.to(`restaurant:${order.restaurantId}`).emit('order:update', order);
  io.to(`kitchen:${order.restaurantId}`).emit('kitchen:update', order);
}

router.get('/', async (req, res) => {
  const restaurantId = restaurantScope(req);
  if (!restaurantId) return res.status(400).json({ error: 'Restaurante requerido' });
  const filter = { restaurantId };
  if (req.query.status) filter.status = { $in: String(req.query.status).split(',') };
  const orders = await Order.find(filter).sort({ createdAt: -1 }).limit(Number(req.query.limit) || 50);
  res.json(orders);
});

router.get('/:id', async (req, res) => {
  const order = await Order.findOne({ _id: req.params.id, organizationId: req.user.organizationId })
    .populate('waiterId', 'name')
    .populate('customerId', 'name phone')
    .populate('tableId', 'name zone');
  if (!order) return res.status(404).json({ error: 'Orden no encontrada' });
  res.json(order);
});

router.post('/', async (req, res) => {
  try {
    const restaurantId = restaurantScope(req);
    if (!restaurantId) return res.status(400).json({ error: 'Restaurante requerido' });

    const org = await Organization.findById(req.user.organizationId);
    const orderNumber = await nextOrderNumber(Order, restaurantId);
    const rawItems = req.body.items || [];

    const items = [];
    for (const raw of rawItems) {
      const menuItem = await MenuItem.findById(raw.menuItemId);
      if (!menuItem) continue;
      items.push({
        menuItemId: menuItem._id,
        name: menuItem.name,
        quantity: raw.quantity || 1,
        unitPrice: menuItem.price,
        modifiers: raw.modifiers || [],
        notes: raw.notes,
        seat: raw.seat || 1,
        station: menuItem.station,
        status: 'pending',
      });
    }

    const totals = calcOrderTotals(items, org?.settings?.taxRate ?? 0.08, req.body.discount || 0);
    const order = await Order.create({
      organizationId: req.user.organizationId,
      restaurantId,
      tableId: req.body.tableId,
      orderNumber,
      type: req.body.type || 'dine_in',
      items,
      guests: req.body.guests || 1,
      waiterId: req.user._id,
      customerId: req.body.customerId,
      notes: req.body.notes,
      ...totals,
    });

    if (req.body.tableId) {
      await Table.findByIdAndUpdate(req.body.tableId, {
        status: 'occupied',
        currentOrderId: order._id,
      });
    }

    emitOrder(req, order);
    res.status(201).json(order);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/items', async (req, res) => {
  const order = await Order.findOne({ _id: req.params.id, organizationId: req.user.organizationId });
  if (!order || ['paid', 'cancelled'].includes(order.status)) {
    return res.status(400).json({ error: 'Orden no editable' });
  }

  const menuItem = await MenuItem.findById(req.body.menuItemId);
  if (!menuItem) return res.status(404).json({ error: 'Producto no encontrado' });

  order.items.push({
    menuItemId: menuItem._id,
    name: menuItem.name,
    quantity: req.body.quantity || 1,
    unitPrice: menuItem.price,
    modifiers: req.body.modifiers || [],
    notes: req.body.notes,
    seat: req.body.seat || 1,
    station: menuItem.station,
    status: 'pending',
  });

  const org = await Organization.findById(req.user.organizationId);
  Object.assign(order, calcOrderTotals(order.items, org?.settings?.taxRate ?? 0.08, order.discount));
  await order.save();
  emitOrder(req, order);
  res.json(order);
});

router.post('/:id/send', async (req, res) => {
  const order = await Order.findOne({ _id: req.params.id, organizationId: req.user.organizationId });
  if (!order) return res.status(404).json({ error: 'Orden no encontrada' });

  const now = new Date();
  order.items.forEach((item) => {
    if (item.status === 'pending') {
      item.status = 'sent';
      item.sentAt = now;
    }
  });
  if (['open', 'served'].includes(order.status) || order.status === 'ready') {
    order.status = 'sent';
  }
  await order.save();
  emitOrder(req, order);
  res.json(order);
});

router.post('/:id/item/:itemId/status', async (req, res) => {
  const order = await Order.findOne({ _id: req.params.id, organizationId: req.user.organizationId });
  if (!order) return res.status(404).json({ error: 'Orden no encontrada' });
  const item = order.items.id(req.params.itemId);
  if (!item) return res.status(404).json({ error: 'Ítem no encontrado' });

  item.status = req.body.status;
  if (req.body.status === 'ready') item.readyAt = new Date();
  if (req.body.status === 'preparing' && order.status === 'sent') order.status = 'preparing';

  const active = order.items.filter((i) => !['void', 'served'].includes(i.status));
  if (active.length && active.every((i) => i.status === 'ready')) order.status = 'ready';
  if (order.items.filter((i) => i.status !== 'void').every((i) => i.status === 'served')) order.status = 'served';

  await order.save();
  emitOrder(req, order);
  res.json(order);
});

router.post('/:id/pay', async (req, res) => {
  try {
    const order = await Order.findOne({ _id: req.params.id, organizationId: req.user.organizationId });
    if (!order) return res.status(404).json({ error: 'Orden no encontrada' });
    if (order.status === 'paid') return res.status(400).json({ error: 'Ya pagada' });

    const { method = 'cash', amount, tip = 0, reference } = req.body;
    const payAmount = amount ?? order.total;
    order.payments.push({
      method,
      amount: payAmount,
      tip,
      reference,
      cashierId: req.user._id,
    });
    order.status = 'paid';
    order.closedAt = new Date();
    await order.save();

    await depleteInventoryForOrder(order, req.user._id);

    if (order.tableId) {
      await Table.findByIdAndUpdate(order.tableId, { status: 'dirty', currentOrderId: null });
    }
    if (order.customerId) {
      await Customer.findByIdAndUpdate(order.customerId, {
        $inc: { visits: 1, totalSpent: order.total },
        lastVisitAt: new Date(),
      });
    }

    emitOrder(req, order);
    res.json(order);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/cancel', async (req, res) => {
  const order = await Order.findOne({ _id: req.params.id, organizationId: req.user.organizationId });
  if (!order) return res.status(404).json({ error: 'Orden no encontrada' });
  order.status = 'cancelled';
  order.closedAt = new Date();
  await order.save();
  if (order.tableId) {
    await Table.findByIdAndUpdate(order.tableId, { status: 'free', currentOrderId: null });
  }
  emitOrder(req, order);
  res.json(order);
});

export default router;
