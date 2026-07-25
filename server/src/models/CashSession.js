import mongoose from 'mongoose';

const cashSessionSchema = new mongoose.Schema(
  {
    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true },
    restaurantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', required: true, index: true },
    cashierId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    openingFloat: { type: Number, default: 0 },
    closingCash: Number,
    expectedCash: Number,
    variance: Number,
    salesCash: { type: Number, default: 0 },
    salesCard: { type: Number, default: 0 },
    salesTransfer: { type: Number, default: 0 },
    tips: { type: Number, default: 0 },
    status: { type: String, enum: ['open', 'closed'], default: 'open' },
    openedAt: { type: Date, default: Date.now },
    closedAt: Date,
    notes: String,
  },
  { timestamps: true }
);

export default mongoose.model('CashSession', cashSessionSchema);
