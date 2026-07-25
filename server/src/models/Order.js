import mongoose from 'mongoose';

const orderItemSchema = new mongoose.Schema(
  {
    menuItemId: { type: mongoose.Schema.Types.ObjectId, ref: 'MenuItem', required: true },
    name: String,
    quantity: { type: Number, default: 1 },
    unitPrice: { type: Number, required: true },
    modifiers: [{ name: String, price: Number }],
    notes: String,
    seat: { type: Number, default: 1 },
    station: { type: String, default: 'hot' },
    status: {
      type: String,
      enum: ['pending', 'sent', 'preparing', 'ready', 'served', 'void'],
      default: 'pending',
    },
    sentAt: Date,
    readyAt: Date,
  },
  { _id: true }
);

const paymentSchema = new mongoose.Schema(
  {
    method: { type: String, enum: ['cash', 'card', 'transfer', 'mixed', 'other'], required: true },
    amount: { type: Number, required: true },
    tip: { type: Number, default: 0 },
    reference: String,
    paidAt: { type: Date, default: Date.now },
    cashierId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    restaurantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', required: true, index: true },
    tableId: { type: mongoose.Schema.Types.ObjectId, ref: 'Table' },
    orderNumber: { type: Number, required: true },
    type: { type: String, enum: ['dine_in', 'takeout', 'delivery'], default: 'dine_in' },
    status: {
      type: String,
      enum: ['open', 'sent', 'preparing', 'ready', 'served', 'paid', 'cancelled'],
      default: 'open',
    },
    items: [orderItemSchema],
    guests: { type: Number, default: 1 },
    waiterId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
    subtotal: { type: Number, default: 0 },
    tax: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
    payments: [paymentSchema],
    notes: String,
    openedAt: { type: Date, default: Date.now },
    closedAt: Date,
  },
  { timestamps: true }
);

orderSchema.index({ restaurantId: 1, orderNumber: 1 });
orderSchema.index({ restaurantId: 1, status: 1, createdAt: -1 });

export default mongoose.model('Order', orderSchema);
