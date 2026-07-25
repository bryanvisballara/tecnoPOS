import mongoose from 'mongoose';

const modifierSchema = new mongoose.Schema(
  {
    name: String,
    price: { type: Number, default: 0 },
  },
  { _id: false }
);

const operatingCostSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    mode: { type: String, enum: ['fixed', 'percent'], default: 'fixed' },
    value: { type: Number, required: true, default: 0 },
  },
  { _id: false }
);

const menuItemSchema = new mongoose.Schema(
  {
    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
    name: { type: String, required: true },
    description: String,
    price: { type: Number, required: true },
    ingredientCost: { type: Number, default: 0 },
    cost: { type: Number, default: 0 },
    operatingCosts: [operatingCostSchema],
    station: { type: String, enum: ['hot', 'cold', 'bar', 'dessert', 'expo'], default: 'hot' },
    prepMinutes: { type: Number, default: 12 },
    image: String,
    modifiers: [modifierSchema],
    available: { type: Boolean, default: true },
    recipeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Recipe' },
  },
  { timestamps: true }
);

export default mongoose.model('MenuItem', menuItemSchema);
