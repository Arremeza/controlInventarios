import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'

export default function AdminPage() {
  const { api } = useAuth()
  const [users, setUsers] = useState([])
  const [userForm, setUserForm] = useState({ name: '', email: '', password: '', role: 'user' })
  const [userErrorDetails, setUserErrorDetails] = useState([])
  const [error, setError] = useState('')

  const load = async () => {
    const usersRes = await api.get('/users')
    setUsers(usersRes.data.users)
  }

  useEffect(() => {
    load().catch(() => {})
  }, [])

  return (
    <div>
      <h2 className='title'>Administrar Usuarios</h2>
      <h3 className='subtitle'>Registrar Usuario</h3>
      <form onSubmit={async (e) => {
        e.preventDefault()
        setError('')
        setUserErrorDetails([])
        try {
          const payload = {
            name: userForm.name.trim(),
            email: userForm.email.trim(),
            password: userForm.password,
            role: userForm.role === 'admin' ? 'admin' : 'user'
          }
          await api.post('/users', payload)
          setUserForm({ name: '', email: '', password: '', role: 'user' })
          await load()
        } catch (err) {
          setError(err?.response?.data?.message || 'Error al crear usuario')
          const details = err?.response?.data?.details
          if (Array.isArray(details) && details.length) setUserErrorDetails(details)
        }
      }} className="grid grid-users">
        <input placeholder="Nombre" value={userForm.name} onChange={(e) => setUserForm({ ...userForm, name: e.target.value })} required />
        <input placeholder="Email" type="email" value={userForm.email} onChange={(e) => setUserForm({ ...userForm, email: e.target.value })} required />
        <input placeholder="Contraseña" minLength={8} type="password" value={userForm.password} onChange={(e) => setUserForm({ ...userForm, password: e.target.value })} required />
        <select value={userForm.role} onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}>
          <option value="user">Usuario</option>
          <option value="admin">Administrador</option>
        </select>
        <button type="submit">Crear usuario</button>
      </form>
      {error && <div className="error">{error}</div>}
      {userErrorDetails.length > 0 && (
        <div className="error error-details">
          {userErrorDetails.map((d, i) => (
            <div key={i}>• {d}</div>
          ))}
        </div>
      )}
      <ul className="list">
        {users.map((u) => (
          <li key={u.id || u._id} className="list-item">
            <div>
              <strong>{u.name}</strong>
              <div className="muted">{u.email}</div>
            </div>
            <div className="user-item-actions">
              <div className="badge user-role-badge">{u.role}</div>
              {u.isSeedAdmin !== true && (
                <button
                  className="ghost"
                  onClick={async () => {
                    if (!confirm('¿Eliminar este usuario?')) return
                    await api.delete(`/users/${u._id || u.id}`)
                    await load()
                  }}
                >Eliminar</button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}


