import { useState, useEffect, useCallback } from 'react'
import { Routes, Route, Navigate, Link, NavLink } from 'react-router-dom'
import './App.css'
import LoginPage from './pages/LoginPage.jsx'
import ProductsPage from './pages/ProductsPage.jsx'
import AdminPage from './pages/AdminPage.jsx'
import { AuthProvider, useAuth } from './context/AuthContext.jsx'
import { useTheme } from './theme/useTheme.js'

function PrivateRoute({ children, roles }) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  if (roles && roles.length > 0 && !roles.includes(user.role)) return <Navigate to="/" replace />
  return children
}

function Layout({ children, showNav = true }) {
  const { user, logout, api } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const [mobileOpen, setMobileOpen] = useState(false)
  const closeMobile = () => setMobileOpen(false)
  const isAdmin = user?.role === 'admin'
  const [notifications, setNotifications] = useState([])
  const [showNotifications, setShowNotifications] = useState(false)

  const fetchNotifications = useCallback(async () => {
    try {
      const { data } = await api.get('/notifications')
      setNotifications(Array.isArray(data.notifications) ? data.notifications : [])
    } catch {
      // ignore
    }
  }, [api])

  useEffect(() => {
    if (user) fetchNotifications().catch(() => {})
  }, [user, fetchNotifications])
  
  return (
    <div className="container">
      {showNav && user && (
        <>
          <button className="notifications-toggle" onClick={toggleTheme} aria-label="Cambiar tema">
            {theme === 'dark' ? '🌙' : '☀️'}
          </button>
          <nav className={`nav ${isAdmin ? 'nav-with-mobile' : ''}`}>
            {isAdmin && (
              <button className="mobile-toggle" onClick={() => setMobileOpen((v) => !v)} aria-label="Abrir menú">☰</button>
            )}
            {isAdmin && (
              <>
                <NavLink to="/" onClick={closeMobile} className={({ isActive }) => `tab${isActive ? ' active' : ''}`}>Productos</NavLink>
                <NavLink to="/admin" onClick={closeMobile} className={({ isActive }) => `tab${isActive ? ' active' : ''}`}>Administrar</NavLink>
              </>
            )}
            <div className="nav-right">
              <button className="ghost" onClick={() => { setShowNotifications((s) => !s); fetchNotifications().catch(() => {}) }}>
                Notificaciones {notifications.filter(n => !n.read).length > 0 ? `(${notifications.filter(n => !n.read).length})` : ''}
              </button>
              <button onClick={logout}>Cerrar sesión</button>
            </div>
          </nav>
          {showNotifications && (
            <>
              <div className="notifications-backdrop" onClick={() => setShowNotifications(false)} />
              <div className="notifications-panel" onClick={(e) => e.stopPropagation()}>
                <div className="notifications-header">
                  <strong>Notificaciones</strong>
                  <div className="spacer" />
                  <button className="ghost" onClick={async () => { await api.post('/notifications/read-all'); await fetchNotifications(); }}>Marcar todas</button>
                </div>
                <div className="notifications-list">
                  {notifications.length === 0 ? (
                    <div className="muted">Sin notificaciones</div>
                  ) : notifications.map((n) => (
                    <div key={n._id || n.id} className={`notification-item ${n.read ? 'read' : ''}`}>
                      <div className="notification-title">{n.title}</div>
                      <div className="notification-message muted">{n.message}</div>
                      {!n.read && (
                        <button className="ghost" onClick={async () => { await api.post(`/notifications/read/${n._id || n.id}`); await fetchNotifications(); }}>Marcar leída</button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
          {mobileOpen && isAdmin && (
            <>
              <div className="backdrop" onClick={closeMobile} />
              <div className="mobile-menu">
                <div className="mobile-close-container">
                  <button className="mobile-close" onClick={closeMobile} aria-label="Cerrar menú">✕</button>
                </div>
                <div className="mobile-group">
                  <NavLink to="/" onClick={closeMobile} className={({ isActive }) => `mobile-link${isActive ? ' active' : ''}`}>Productos</NavLink>
                  <NavLink to="/admin" onClick={closeMobile} className={({ isActive }) => `mobile-link${isActive ? ' active' : ''}`}>Administrar</NavLink>
                </div>
                <div className="mobile-group">
                  <button className="ghost" onClick={() => { toggleTheme(); closeMobile(); }}>
                    {theme === 'dark' ? 'Modo claro ☀️' : 'Modo oscuro 🌙'}
                  </button>
                  <button onClick={() => { logout(); closeMobile(); }}>Cerrar sesión</button>
                </div>
              </div>
            </>
          )}
        </>
      )}
      <main>{children}</main>
    </div>
  )
}

function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Layout showNav={false}><LoginPage /></Layout>} />
        <Route
          path="/"
          element={
            <PrivateRoute>
              <Layout showNav={true}>
                <ProductsPage />
              </Layout>
            </PrivateRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <PrivateRoute roles={['admin']}>
              <Layout showNav={true}>
                <AdminPage />
              </Layout>
            </PrivateRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  )
}

export default App
