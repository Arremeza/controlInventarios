import mongoose from 'mongoose'

const notificationSchema = new mongoose.Schema({
  audience: { type: String, enum: ['admin', 'all', 'user'], default: 'all', index: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  type: { type: String, enum: ['low_stock', 'restocked', 'product_request', 'insufficient_stock'], required: true, index: true },
  title: { type: String, required: true },
  message: { type: String, required: true },
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
  read: { type: Boolean, default: false, index: true }
}, { timestamps: true })

export const Notification = mongoose.model('Notification', notificationSchema)


