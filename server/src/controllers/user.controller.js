import { User } from '../models/User.js';

export async function createUser(req, res) {
  try {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Nombre, email y contraseña son requeridos' });
    }
    const normalizedEmail = String(email).trim().toLowerCase();
    const exists = await User.findOne({ email: normalizedEmail });
    if (exists) return res.status(409).json({ message: 'El email ya está registrado' });
    const user = await User.create({ name, email: normalizedEmail, password, role: role === 'admin' ? 'admin' : 'user' });
    res.status(201).json({ user: { id: user._id, name: user.name, email: user.email, role: user.role } });
  } catch (error) {
    if (error?.code === 11000) {
      console.error(error)
      return res.status(409).json({ error, message: 'El email ya está registrado' });
    }
    if (error?.name === 'ValidationError') {
      const details = Object.values(error.errors).map((e) => e.message)
      return res.status(400).json({ message: 'Datos inválidos', details })
    }
    console.error('createUser error:', error)
    res.status(500).json({ message: 'Error al crear usuario' });
  }
}

export async function listUsers(req, res) {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    res.json({ users });
  } catch (error) {
    res.status(500).json({ message: 'Error al listar usuarios', error: error.message });
  }
}

export async function deleteUser(req, res) {
  try {
    const { id } = req.params
    if (!id) return res.status(400).json({ message: 'Id requerido' })
    // Solo seed admin puede borrar usuarios
    if (!req.user?.isSeedAdmin) return res.status(403).json({ message: 'No autorizado' })
    // Proteger que no se borre a sí mismo accidentalmente
    if (req.user._id.toString() === id) return res.status(400).json({ message: 'No puedes eliminar tu propio usuario seed' })
    const deleted = await User.findByIdAndDelete(id)
    if (!deleted) return res.status(404).json({ message: 'Usuario no encontrado' })
    res.json({ message: 'Usuario eliminado' })
  } catch (error) {
    res.status(500).json({ message: 'Error al eliminar usuario' })
  }
}


