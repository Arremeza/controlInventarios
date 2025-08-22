import { Product } from '../models/Product.js';
import { Delivery } from '../models/Delivery.js';
import { User } from '../models/User.js';

export async function createProduct(req, res) {
  try {
    const { name, description, quantity, unit, recommendedQuantity } = req.body;
    if (!name) return res.status(400).json({ message: 'Nombre es requerido' });
    const product = await Product.create({
      name,
      description: description || '',
      unit: unit || 'piezas',
      quantity: typeof quantity === 'number' ? quantity : 0,
      recommendedQuantity: typeof recommendedQuantity === 'number' && recommendedQuantity >= 0 ? recommendedQuantity : 0,
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
      const masked = products.map((p) => {
        const isLowStock = typeof p.recommendedQuantity === 'number' && p.recommendedQuantity > 0 && (typeof p.quantity === 'number') && p.quantity < p.recommendedQuantity;
        return {
          id: p._id,
          name: p.name,
          description: p.description,
          unit: p.unit,
          // Ocultar cantidad a usuarios no admin
          quantity: undefined,
          // Exponer solo el estado (no números)
          isLowStock,
          createdAt: p.createdAt,
          updatedAt: p.updatedAt
        }
      });
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
      const isLowStock = typeof product.recommendedQuantity === 'number' && product.recommendedQuantity > 0 && (typeof product.quantity === 'number') && product.quantity < product.recommendedQuantity;
      return res.json({
        product: {
          id: product._id,
          name: product.name,
          description: product.description,
          unit: product.unit,
          quantity: undefined,
          isLowStock,
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
    const { name, description, quantity, unit, recommendedQuantity } = req.body;
    const updates = {};
    if (typeof name === 'string') updates.name = name;
    if (typeof description === 'string') updates.description = description;
    if (typeof unit === 'string') updates.unit = unit;
    if (typeof recommendedQuantity === 'number' && recommendedQuantity >= 0) updates.recommendedQuantity = recommendedQuantity;
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
    const { id } = req.params
    const product = await Product.findById(id)
    if (!product) return res.status(404).json({ message: 'Producto no encontrado' })

    const session = await Product.startSession()
    await session.withTransaction(async () => {
      await Delivery.deleteMany({ product: product._id }, { session })
      await Product.deleteOne({ _id: product._id }, { session })
    })
    session.endSession()

    res.json({ message: 'Producto y entregas eliminados' })
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

// Actualizar cantidad de una entrega (solo admin)
export async function updateProductDelivery(req, res) {
  try {
    const { id, deliveryId } = req.params; // product id y delivery id
    const { quantity } = req.body || {};
    if (!deliveryId) return res.status(400).json({ message: 'deliveryId requerido' });
    if (typeof quantity !== 'number' || quantity <= 0) {
      return res.status(400).json({ message: 'Cantidad (>0) es requerida' });
    }

    const delivery = await Delivery.findById(deliveryId);
    if (!delivery) return res.status(404).json({ message: 'Entrega no encontrada' });
    if (String(delivery.product) !== String(id)) {
      return res.status(400).json({ message: 'La entrega no pertenece a este producto' });
    }

    const product = await Product.findById(id).select('_id quantity');
    if (!product) return res.status(404).json({ message: 'Producto no encontrado' });

    const oldQty = delivery.quantity;
    const newQty = quantity;
    if (oldQty === newQty) return res.json({ message: 'Sin cambios', delivery });

    const delta = newQty - oldQty; // cuanto cambia la entrega

    // type: 'out' reduce inventario, 'in' aumenta inventario
    const isOut = delivery.type === 'out';
    const inventoryDelta = isOut ? -delta : delta; // aplicar al inventario

    // Validación de inventario para salidas cuando delta implica más salida
    if (isOut && inventoryDelta < 0) {
      // inventoryDelta < 0 significa que delta > 0 (se aumenta la salida), requiere stock disponible
      const needed = -inventoryDelta; // cantidad adicional requerida
      if (product.quantity < needed) {
        return res.status(400).json({ message: 'Cantidad insuficiente en inventario para aumentar la salida' });
      }
    }

    const session = await Product.startSession();
    await session.withTransaction(async () => {
      // Ajustar inventario
      await Product.updateOne({ _id: product._id }, { $inc: { quantity: inventoryDelta } }, { session });
      // Actualizar entrega
      await Delivery.updateOne({ _id: delivery._id }, { $set: { quantity: newQty } }, { session });
    });
    session.endSession();

    const [updatedProduct, updatedDelivery] = await Promise.all([
      Product.findById(product._id),
      Delivery.findById(delivery._id).populate('toUser', 'name email role').populate('deliveredBy', 'name email')
    ]);

    return res.json({ message: 'Entrega actualizada', product: updatedProduct, delivery: updatedDelivery });
  } catch (error) {
    console.error('updateProductDelivery error:', error);
    return res.status(500).json({ message: 'Error al actualizar la entrega', error: error.message });
  }
}


