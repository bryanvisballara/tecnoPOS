import Stock from '../models/Stock.js';
import InventoryTxn from '../models/InventoryTxn.js';
import Recipe from '../models/Recipe.js';
import MenuItem from '../models/MenuItem.js';
import Ingredient from '../models/Ingredient.js';
import { toIngredientUnitQty } from './units.js';

export function calcOrderTotals(items, taxRate = 0.08, discount = 0) {
  const subtotal = items
    .filter((i) => i.status !== 'void')
    .reduce((sum, item) => {
      const mods = (item.modifiers || []).reduce((m, x) => m + (x.price || 0), 0);
      return sum + (item.unitPrice + mods) * item.quantity;
    }, 0);
  const taxedBase = Math.max(0, subtotal - discount);
  const tax = Math.round(taxedBase * taxRate);
  const total = taxedBase + tax;
  return { subtotal, tax, discount, total };
}

export async function depleteInventoryForOrder(order, userId) {
  for (const item of order.items) {
    if (item.status === 'void') continue;
    const menuItem = await MenuItem.findById(item.menuItemId);
    if (!menuItem?.recipeId) continue;
    const recipe = await Recipe.findById(menuItem.recipeId);
    if (!recipe) continue;

    for (const line of recipe.lines) {
      const ing = await Ingredient.findById(line.ingredientId);
      const qtyInStockUnit = toIngredientUnitQty(line.quantity, line.unit || ing?.unit, ing?.unit);
      const qty = (qtyInStockUnit / (recipe.portions || 1)) * item.quantity;
      const stock = await Stock.findOneAndUpdate(
        { restaurantId: order.restaurantId, ingredientId: line.ingredientId },
        { $inc: { onHand: -qty } },
        { new: true }
      );
      if (stock) {
        await InventoryTxn.create({
          organizationId: order.organizationId,
          restaurantId: order.restaurantId,
          ingredientId: line.ingredientId,
          type: 'sale',
          quantity: -qty,
          orderId: order._id,
          userId,
          note: `Venta orden #${order.orderNumber}`,
        });
      }
    }
  }
}

export async function nextOrderNumber(Order, restaurantId) {
  const last = await Order.findOne({ restaurantId }).sort({ orderNumber: -1 }).select('orderNumber');
  return (last?.orderNumber || 1000) + 1;
}

export function money(n) {
  return Math.round(Number(n) || 0);
}
