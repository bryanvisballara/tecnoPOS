import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

export const ROLES = ['owner', 'manager', 'waiter', 'kitchen', 'cashier'];

const userSchema = new mongoose.Schema(
  {
    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    restaurantIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant' }],
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone: { type: String, default: '' },
    phoneCountry: { type: String, default: 'CO' },
    phoneDial: { type: String, default: '+57' },
    password: { type: String, required: true, select: false },
    role: { type: String, enum: ROLES, required: true },
    pin: { type: String, select: false },
    active: { type: Boolean, default: true },
    avatarColor: { type: String, default: '#00a8ff' },
    resetToken: { type: String, select: false },
    resetExpires: { type: Date, select: false },
  },
  { timestamps: true }
);

userSchema.pre('save', async function hashPassword(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

userSchema.methods.comparePassword = function comparePassword(plain) {
  return bcrypt.compare(plain, this.password);
};

export default mongoose.model('User', userSchema);
