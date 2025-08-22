import { Notification } from '../models/Notification.js'

export async function listNotifications(req, res) {
  try {
    const filter = req.user?.role === 'admin'
      ? { $or: [ { audience: 'admin' }, { audience: 'all' } ] }
      : { $or: [ { audience: 'all' }, { audience: 'user', user: req.user._id } ] }
    const notifications = await Notification.find(filter).sort({ createdAt: -1 }).limit(200)
    res.json({ notifications })
  } catch (error) {
    res.status(500).json({ message: 'Error al listar notificaciones' })
  }
}

export async function markRead(req, res) {
  try {
    const { id } = req.params
    await Notification.updateOne({ _id: id }, { $set: { read: true } })
    res.json({ message: 'Notificación marcada como leída' })
  } catch (error) {
    res.status(500).json({ message: 'Error al marcar notificación' })
  }
}

export async function markAllRead(req, res) {
  try {
    const filter = req.user?.role === 'admin'
      ? { $or: [ { audience: 'admin' }, { audience: 'all' } ] }
      : { $or: [ { audience: 'all' }, { audience: 'user', user: req.user._id } ] }
    await Notification.updateMany(filter, { $set: { read: true } })
    res.json({ message: 'Todas marcadas como leídas' })
  } catch (error) {
    res.status(500).json({ message: 'Error al marcar todas' })
  }
}


