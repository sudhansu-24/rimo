/**
 * CheckoutSession Model
 * Stores temporary checkout data to avoid localStorage quota issues
 */
import mongoose from 'mongoose';

const CheckoutSessionSchema = new mongoose.Schema({
  sessionId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  items: [{
    id: { type: String, required: true },
    name: { type: String, required: true },
    pricePerDay: { type: Number, required: true },
    quantity: { type: Number, required: true },
    duration: { type: String, required: true }, // Can be "day", "week", "month", etc.
    totalPrice: { type: Number, required: true },
    fromDate: { type: String, required: true },
    toDate: { type: String, required: true },
    endUserId: { type: String, required: true },
    image: { type: String }
  }],
  pricing: {
    subtotal: { type: Number, required: true },
    discount: { type: Number, default: 0 },
    deliveryCharge: { type: Number, default: 0 },
    tax: { type: Number, required: true },
    total: { type: Number, required: true }
  },
  couponCode: {
    type: String,
    default: ''
  },
  deliveryAddress: {
    name: String,
    phone: String,
    address: String,
    city: String,
    state: String,
    zipCode: String,
    country: String
  },
  billingAddress: {
    name: String,
    phone: String,
    address: String,
    city: String,
    state: String,
    zipCode: String,
    country: String
  },
  status: {
    type: String,
    enum: ['active', 'completed', 'expired'],
    default: 'active'
  },
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
    index: { expireAfterSeconds: 0 }
  }
}, {
  timestamps: true
});

// Create compound index for efficient queries
CheckoutSessionSchema.index({ userId: 1, status: 1 });

export default mongoose.models.CheckoutSession || mongoose.model('CheckoutSession', CheckoutSessionSchema);
