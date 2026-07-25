import mongoose from 'mongoose';

const stockSchema = new mongoose.Schema(
  {
    restaurantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', required: true },
    ingredientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Ingredient', required: true },
    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    onHand: { type: Number, default: 0 },
    parLevel: { type: Number, default: 0 },
    reorderPoint: { type: Number, default: 0 },
  },
  { timestamps: true }
);

stockSchema.index({ restaurantId: 1, ingredientId: 1 }, { unique: true });

export default mongoose.model('Stock', stockSchema);
