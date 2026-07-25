import mongoose from 'mongoose';

const ingredientSchema = new mongoose.Schema(
  {
    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    name: { type: String, required: true },
    unit: { type: String, enum: ['kg', 'g', 'L', 'ml', 'unidad', 'porcion'], default: 'kg' },
    costPerUnit: { type: Number, default: 0 },
    yieldFactor: { type: Number, default: 1 },
    supplier: String,
    sku: String,
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.model('Ingredient', ingredientSchema);
