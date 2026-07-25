import mongoose from 'mongoose';

const inventoryTxnSchema = new mongoose.Schema(
  {
    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    restaurantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', required: true },
    ingredientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Ingredient', required: true },
    type: { type: String, enum: ['purchase', 'sale', 'waste', 'transfer_in', 'transfer_out', 'adjustment', 'count'], required: true },
    quantity: { type: Number, required: true },
    unitCost: { type: Number, default: 0 },
    note: String,
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

export default mongoose.model('InventoryTxn', inventoryTxnSchema);
