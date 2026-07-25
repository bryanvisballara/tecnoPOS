import mongoose from 'mongoose';

const restaurantSchema = new mongoose.Schema(
  {
    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    name: { type: String, required: true },
    code: { type: String, required: true },
    address: String,
    city: String,
    phone: String,
    openHours: String,
    active: { type: Boolean, default: true },
    zones: {
      type: [String],
      default: () => ['Salón', 'Terraza', 'VIP'],
    },
    floorPlan: {
      width: { type: Number, default: 1000 },
      height: { type: Number, default: 700 },
    },
  },
  { timestamps: true }
);

restaurantSchema.index({ organizationId: 1, code: 1 }, { unique: true });

export default mongoose.model('Restaurant', restaurantSchema);
