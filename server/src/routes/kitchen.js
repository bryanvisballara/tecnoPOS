import { Router } from 'express';
import Order from '../models/Order.js';
import { auth, restaurantScope, requireRoles } from '../middleware/auth.js';

const router = Router();
router.use(auth);
router.use(requireRoles('kitchen', 'owner', 'manager', 'waiter'));

router.get('/tickets', async (req, res) => {
  const restaurantId = restaurantScope(req);
  if (!restaurantId) return res.status(400).json({ error: 'Restaurante requerido' });

  const orders = await Order.find({
    restaurantId,
    status: { $in: ['sent', 'preparing', 'ready'] },
  })
    .populate('tableId', 'name zone')
    .sort({ updatedAt: 1 });

  const station = req.query.station;
  const tickets = orders
    .map((order) => {
      const items = order.items.filter((i) =>
        ['sent', 'preparing', 'ready'].includes(i.status) && (!station || i.station === station)
      );
      if (!items.length) return null;
      return {
        orderId: order._id,
        orderNumber: order.orderNumber,
        table: order.tableId,
        status: order.status,
        openedAt: order.openedAt,
        items,
      };
    })
    .filter(Boolean);

  res.json(tickets);
});

export default router;
