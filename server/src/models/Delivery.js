import mongoose from 'mongoose';

const deliverySchema = new mongoose.Schema(
  {
    type: { type: String, enum: ['in', 'out'], default: 'out', index: true },
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
    toUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    quantity: { type: Number, required: true, min: 1 },
    deliveredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    deliveredAt: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

export const Delivery = mongoose.model('Delivery', deliverySchema);


