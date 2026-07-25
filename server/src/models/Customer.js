import mongoose from 'mongoose';

const customerSchema = new mongoose.Schema(
  {
    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    name: { type: String, required: true },
    phone: String,
    email: String,
    notes: String,
    visits: { type: Number, default: 0 },
    totalSpent: { type: Number, default: 0 },
    tags: [String],
    lastVisitAt: Date,
  },
  { timestamps: true }
);

export default mongoose.model('Customer', customerSchema);
