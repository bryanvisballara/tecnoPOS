import mongoose from 'mongoose';

const recipeLineSchema = new mongoose.Schema(
  {
    ingredientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Ingredient', required: true },
    quantity: { type: Number, required: true },
    unit: String,
    notes: String,
  },
  { _id: false }
);

const recipeSchema = new mongoose.Schema(
  {
    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    name: { type: String, required: true },
    portions: { type: Number, default: 1 },
    lines: [recipeLineSchema],
    instructions: String,
    prepMinutes: { type: Number, default: 10 },
  },
  { timestamps: true }
);

export default mongoose.model('Recipe', recipeSchema);
