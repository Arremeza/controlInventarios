import { useState } from 'react'
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
  const { user, logout } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const [mobileOpen, setMobileOpen] = useState(false)
  const closeMobile = () => setMobileOpen(false)
  const isAdmin = user?.role === 'admin'
  
  return (
    <div className="container">
      {showNav && user && (
        <>
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
              <button className="ghost" onClick={toggleTheme} aria-label="Cambiar tema">
                {theme === 'dark' ? '🌙 Oscuro' : '☀️ Claro'}
              </button>
              <button onClick={logout}>Cerrar sesión</button>
            </div>
          </nav>
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
