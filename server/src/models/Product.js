import mongoose from 'mongoose';

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      default: ''
    },
    unit: {
      type: String,
      enum: ['piezas', 'metros', 'kilos', 'litros', 'cajas', 'paquetes', 'unidades'],
      default: 'piezas',
      required: true
    },
    quantity: {
      type: Number,
      required: true,
      min: 0,
      default: 0
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  { timestamps: true }
);

export const Product = mongoose.model('Product', productSchema);


