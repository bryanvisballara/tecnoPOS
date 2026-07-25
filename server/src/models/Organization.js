import mongoose from 'mongoose';

const organizationSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    slogan: { type: String, default: 'TU NEGOCIO, EN CONTROL' },
    plan: { type: String, default: 'chain' },
    settings: {
      currency: { type: String, default: 'COP' },
      taxRate: { type: Number, default: 0.08 },
      timezone: { type: String, default: 'America/Bogota' },
    },
  },
  { timestamps: true }
);

export default mongoose.model('Organization', organizationSchema);
