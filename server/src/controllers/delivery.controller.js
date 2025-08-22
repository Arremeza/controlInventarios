import { Product } from '../models/Product.js'
import { Delivery } from '../models/Delivery.js'

export async function updateDelivery(req, res) {
  try {
    const { id } = req.params
    const { quantity } = req.body || {}
    if (typeof quantity !== 'number' || quantity <= 0) {
      return res.status(400).json({ message: 'Cantidad (>0) es requerida' })
    }

    const delivery = await Delivery.findById(id)
    if (!delivery) return res.status(404).json({ message: 'Entrega no encontrada' })

    const product = await Product.findById(delivery.product).select('_id quantity')
    if (!product) return res.status(404).json({ message: 'Producto no encontrado' })

    const oldQty = delivery.quantity
    const newQty = quantity
    if (oldQty === newQty) {
      const populated = await Delivery.findById(delivery._id).populate('toUser', 'name email role').populate('deliveredBy', 'name email')
      return res.json({ message: 'Sin cambios', product, delivery: populated })
    }

    const delta = newQty - oldQty
    const isOut = delivery.type === 'out'
    const inventoryDelta = isOut ? -delta : delta

    // Si es salida y aumenta la cantidad entregada (inventoryDelta < 0), validar stock suficiente
    if (isOut && inventoryDelta < 0) {
      const needed = -inventoryDelta
      if (product.quantity < needed) {
        return res.status(400).json({ message: 'Cantidad insuficiente en inventario para aumentar la salida' })
      }
    }

    const session = await Product.startSession()
    await session.withTransaction(async () => {
      await Product.updateOne({ _id: product._id }, { $inc: { quantity: inventoryDelta } }, { session })
      await Delivery.updateOne({ _id: delivery._id }, { $set: { quantity: newQty } }, { session })
    })
    session.endSession()

    const [updatedProduct, updatedDelivery] = await Promise.all([
      Product.findById(product._id),
      Delivery.findById(delivery._id).populate('toUser', 'name email role').populate('deliveredBy', 'name email')
    ])

    return res.json({ message: 'Entrega actualizada', product: updatedProduct, delivery: updatedDelivery })
  } catch (error) {
    console.error('updateDelivery error:', error)
    return res.status(500).json({ message: 'Error al actualizar la entrega', error: error.message })
  }
}


