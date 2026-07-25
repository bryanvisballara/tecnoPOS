import mongoose from 'mongoose';

const tableSchema = new mongoose.Schema(
  {
    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    restaurantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', required: true, index: true },
    name: { type: String, required: true },
    seats: { type: Number, default: 4 },
    zone: { type: String, default: 'Salón' },
    x: { type: Number, default: 40 },
    y: { type: Number, default: 40 },
    width: { type: Number, default: 90 },
    height: { type: Number, default: 90 },
    shape: { type: String, enum: ['square', 'round', 'rect'], default: 'square' },
    status: { type: String, enum: ['free', 'occupied', 'reserved', 'dirty', 'billing'], default: 'free' },
    currentOrderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
  },
  { timestamps: true }
);

export default mongoose.model('Table', tableSchema);
