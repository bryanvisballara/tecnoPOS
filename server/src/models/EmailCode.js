import mongoose from 'mongoose';

const emailCodeSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, lowercase: true, trim: true, index: true },
    purpose: { type: String, enum: ['register', 'reset'], required: true },
    codeHash: { type: String, required: true },
    expiresAt: { type: Date, required: true, index: true },
    attempts: { type: Number, default: 0 },
    payload: { type: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true }
);

emailCodeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model('EmailCode', emailCodeSchema);
