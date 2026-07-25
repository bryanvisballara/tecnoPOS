import mongoose from 'mongoose';

const categorySchema = new mongoose.Schema(
  {
    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    name: { type: String, required: true },
    sortOrder: { type: Number, default: 0 },
    color: { type: String, default: '#00a8ff' },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.model('Category', categorySchema);
