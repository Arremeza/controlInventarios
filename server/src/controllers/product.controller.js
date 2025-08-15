import { Product } from '../models/Product.js';
import { Delivery } from '../models/Delivery.js';
import { User } from '../models/User.js';

export async function createProduct(req, res) {
  try {
    const { name, description, quantity, unit } = req.body;
    if (!name) return res.status(400).json({ message: 'Nombre es requerido' });
    const product = await Product.create({
      name,
      description: description || '',
      unit: unit || 'piezas',
      quantity: typeof quantity === 'number' ? quantity : 0,
      createdBy: req.user?._id
    });
    // Registrar entrada inicial si aplica
    if ((typeof quantity === 'number') && quantity > 0 && req.user?._id) {
      await Delivery.create({
        type: 'in',
        product: product._id,
        toUser: undefined,
        quantity,
        deliveredBy: req.user._id,
        deliveredAt: new Date()
      });
    }
    res.status(201).json({ product });
  } catch (error) {
    res.status(500).json({ message: 'Error al crear producto', error: error.message });
  }
}

export async function listProducts(req, res) {
  try {
    const products = await Product.find().sort({ createdAt: -1 });
    if (req.user?.role !== 'admin') {
      const masked = products.map((p) => ({
        id: p._id,
        name: p.name,
        description: p.description,
        unit: p.unit,
        // Ocultar cantidad a usuarios no admin
        quantity: undefined,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt
      }));
      return res.json({ products: masked });
    }
    res.json({ products });
  } catch (error) {
    res.status(500).json({ message: 'Error al listar productos', error: error.message });
  }
}

export async function getProduct(req, res) {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Producto no encontrado' });
    if (req.user?.role !== 'admin') {
      return res.json({
        product: {
          id: product._id,
          name: product.name,
          description: product.description,
          unit: product.unit,
          quantity: undefined,
          createdAt: product.createdAt,
          updatedAt: product.updatedAt
        }
      });
    }
    res.json({ product });
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener producto', error: error.message });
  }
}

export async function updateProduct(req, res) {
  try {
    const { name, description, quantity, unit } = req.body;
    const updates = {};
    if (typeof name === 'string') updates.name = name;
    if (typeof description === 'string') updates.description = description;
    if (typeof unit === 'string') updates.unit = unit;
    let quantityDelta = 0;
    if (typeof quantity === 'number') {
      // Obtener producto actual para calcular delta
      const current = await Product.findById(req.params.id).select('quantity');
      if (!current) return res.status(404).json({ message: 'Producto no encontrado' });
      updates.quantity = quantity;
      quantityDelta = quantity - (current.quantity || 0);
    }

    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      { new: true }
    );
    if (!product) return res.status(404).json({ message: 'Producto no encontrado' });
    // Si hubo incremento, registrar entrada en historial
    if (quantityDelta > 0 && req.user?._id) {
      await Delivery.create({
        type: 'in',
        product: product._id,
        toUser: undefined,
        quantity: quantityDelta,
        deliveredBy: req.user._id,
        deliveredAt: new Date()
      });
    }
    res.json({ product });
  } catch (error) {
    res.status(500).json({ message: 'Error al actualizar producto', error: error.message });
  }
}

export async function deleteProduct(req, res) {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) return res.status(404).json({ message: 'Producto no encontrado' });
    res.json({ message: 'Producto eliminado' });
  } catch (error) {
    res.status(500).json({ message: 'Error al eliminar producto', error: error.message });
  }
}

// Registrar entrega de producto (solo admin)
export async function deliverProduct(req, res) {
  try {
    const { id } = req.params; // product id
    const { toUserId, quantity } = req.body;
    if (!toUserId || typeof quantity !== 'number' || quantity <= 0) {
      return res.status(400).json({ message: 'toUserId y cantidad (>0) son requeridos' });
    }

    const [product, toUser] = await Promise.all([
      Product.findById(id),
      User.findById(toUserId).select('_id name email role')
    ]);
    if (!product) return res.status(404).json({ message: 'Producto no encontrado' });
    if (!toUser) return res.status(404).json({ message: 'Usuario destino no encontrado' });

    if (product.quantity < quantity) {
      return res.status(400).json({ message: 'Cantidad insuficiente en inventario' });
    }

    // Crear registro de entrega y actualizar inventario de forma atómica
    const session = await Product.startSession();
    await session.withTransaction(async () => {
      await Product.updateOne({ _id: product._id }, { $inc: { quantity: -quantity } }, { session });
      await Delivery.create([
        {
          type: 'out',
          product: product._id,
          toUser: toUser._id,
          quantity,
          deliveredBy: req.user._id,
          deliveredAt: new Date()
        }
      ], { session });
    });
    session.endSession();

    const updated = await Product.findById(product._id);
    res.status(201).json({ message: 'Entrega registrada', product: updated });
  } catch (error) {
    console.error('deliverProduct error:', error);
    res.status(500).json({ message: 'Error al registrar entrega', error: error.message });
  }
}

// Historial de entregas por producto (solo admin)
export async function listProductDeliveries(req, res) {
  try {
    const { id } = req.params;
    const deliveries = await Delivery.find({ product: id })
      .sort({ createdAt: -1 })
      .populate('toUser', 'name email role')
      .populate('deliveredBy', 'name email');
    res.json({ deliveries });
  } catch (error) {
    res.status(500).json({ message: 'Error al listar entregas', error: error.message });
  }
}


