import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import editIcon from '../assets/edit_icon.png'

export default function ProductsPage() {
  const { api, user } = useAuth()
  const [form, setForm] = useState({ name: '', description: '', unit: 'piezas', quantity: 0 })
  const [products, setProducts] = useState([])
  const [filteredProducts, setFilteredProducts] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [showForm, setShowForm] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [productDeliveries, setProductDeliveries] = useState([])
  const [showDeliverModal, setShowDeliverModal] = useState(false)
  const [deliverForm, setDeliverForm] = useState({ quantity: '', toUserId: '' })
  const [users, setUsers] = useState([])
  const [deliveryFilters, setDeliveryFilters] = useState({ userId: '', from: '', to: '' })
  const [showEdit, setShowEdit] = useState(false)
  const [editForm, setEditForm] = useState({ name: '', description: '', quantity: 0, unit: 'piezas' })
  const productsPerPage = 18

  const load = useCallback(async () => {
    const { data } = await api.get('/products')
    setProducts(data.products)
  }, [api])

  useEffect(() => {
    load().catch(() => {})
  }, [load])

  // Cargar usuarios (solo admin)
  useEffect(() => {
    if (user?.role === 'admin') {
      api.get('/users').then((res) => setUsers(res.data.users)).catch(() => {})
    }
  }, [user, api])

  // Filtrar productos basado en el término de búsqueda
  useEffect(() => {
    const filtered = products.filter(product =>
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (product.description || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (product.unit || '').toLowerCase().includes(searchTerm.toLowerCase())
    )
    setFilteredProducts(filtered)
    setCurrentPage(1)
  }, [products, searchTerm])

  // Calcular productos para la página actual
  const indexOfLastProduct = currentPage * productsPerPage
  const indexOfFirstProduct = indexOfLastProduct - productsPerPage
  const currentProducts = filteredProducts.slice(indexOfFirstProduct, indexOfLastProduct)
  const totalPages = Math.ceil(filteredProducts.length / productsPerPage)

  const onSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await api.post('/products', {
        name: form.name,
        description: form.description,
        unit: form.unit,
        quantity: Number(form.quantity) || 0,
      })
      setForm({ name: '', description: '', unit: 'piezas', quantity: 0 })
      setShowForm(false)
      await load()
    } catch (err) {
      setError(err?.response?.data?.message || 'Error al crear producto')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (productId) => {
    if (!confirm('¿Eliminar este producto?')) return
    try {
      await api.delete(`/products/${productId}`)
      await load()
    } catch (err) {
      setError(err?.response?.data?.message || 'Error al eliminar producto')
    }
  }

  const toggleForm = () => {
    setShowForm(!showForm)
    if (!showForm) setError('')
  }

  // Abrir tarjeta de producto
  const openProductCard = async (idOrObj) => {
    try {
      const id = typeof idOrObj === 'string' ? idOrObj : (idOrObj._id || idOrObj.id)
      const { data } = await api.get(`/products/${id}`)
      const prod = data.product || data
      setSelectedProduct(prod)
      setShowEdit(false)
      setEditForm({
        name: prod.name || '',
        description: prod.description || '',
        quantity: typeof prod.quantity === 'number' ? prod.quantity : 0,
        unit: prod.unit || 'piezas'
      })
      if (user?.role === 'admin') {
        const deliveries = await api.get(`/products/${id}/deliveries`)
        setProductDeliveries(deliveries.data.deliveries || [])
      } else {
        setProductDeliveries([])
      }
    } catch {
      // ignore
    }
  }

  const openProductCardForEdit = async (p) => {
    await openProductCard(p)
    setShowEdit(true)
  }

  const closeProductCard = () => {
    setSelectedProduct(null)
    setProductDeliveries([])
    setShowDeliverModal(false)
    setDeliverForm({ quantity: '', toUserId: '' })
    setDeliveryFilters({ userId: '', from: '', to: '' })
    setShowEdit(false)
  }

  const submitDelivery = async (e) => {
    e.preventDefault()
    if (!selectedProduct) return
    try {
      const qty = Number(deliverForm.quantity)
      if (!qty || qty <= 0) return
      if (!deliverForm.toUserId) return
      await api.post(`/products/${selectedProduct._id || selectedProduct.id}/deliver`, {
        toUserId: deliverForm.toUserId,
        quantity: qty
      })
      await openProductCard(selectedProduct._id || selectedProduct.id)
      setShowDeliverModal(false)
      setDeliverForm({ quantity: '', toUserId: '' })
      await load()
    } catch (err) {
      alert(err?.response?.data?.message || 'Error al registrar entrega')
    }
  }

  const submitEdit = async (e) => {
    e.preventDefault()
    if (!selectedProduct) return
    try {
      const payload = {
        name: editForm.name.trim(),
        description: (editForm.description || '').trim(),
        unit: editForm.unit,
        quantity: Number(editForm.quantity) || 0
      }
      await api.put(`/products/${selectedProduct._id || selectedProduct.id}`, payload)
      await openProductCard(selectedProduct._id || selectedProduct.id)
      setShowEdit(false)
      await load()
    } catch (err) {
      alert(err?.response?.data?.message || 'Error al actualizar producto')
    }
  }

  // Filtro de historial (cliente)
  const visibleDeliveries = productDeliveries.filter((d) => {
    const matchesUser = deliveryFilters.userId ? (String(d?.toUser?._id || d?.toUser?.id) === deliveryFilters.userId) : true
    const deliveredAt = new Date(d.deliveredAt || d.createdAt)
    let afterFrom = true
    let beforeTo = true
    if (deliveryFilters.from) {
      const f = new Date(deliveryFilters.from)
      f.setHours(0,0,0,0)
      afterFrom = deliveredAt >= f
    }
    if (deliveryFilters.to) {
      const t = new Date(deliveryFilters.to)
      t.setHours(23,59,59,999)
      beforeTo = deliveredAt <= t
    }
    return matchesUser && afterFrom && beforeTo
  })

  if (user?.role !== 'admin') {
    // Vista de solo lectura para usuarios no admin
    return (
      <div>
        <h2>Productos</h2>
        <div className="search-container">
          <input
            type="text"
            placeholder="Buscar productos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>
        <div className="products-grid">
          {currentProducts.map((p) => (
            <div key={p.id || p._id} className="product-card" onClick={() => openProductCard(p)} role="button" tabIndex={0}>
              <strong>{p.name}</strong>
              <div className="muted">{p.description}</div>
              <div className="muted">Unidad: {p.unit}</div>
            </div>
          ))}
        </div>
        {totalPages > 1 && (
          <div className="pagination">
            <button onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1}>Anterior</button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
              <button key={page} onClick={() => setCurrentPage(page)} className={currentPage === page ? 'active' : ''}>{page}</button>
            ))}
            <button onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages}>Siguiente</button>
          </div>
        )}
        {filteredProducts.length === 0 && searchTerm && (
          <div className="no-results">No se encontraron productos que coincidan con "{searchTerm}"</div>
        )}

        {selectedProduct && (
          <div className="modal-backdrop" onClick={closeProductCard}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>{selectedProduct.name}</h3>
                <button className="ghost" onClick={closeProductCard}>✕</button>
              </div>
              <div className="modal-body">
                <div className="product-details">
                  <div className="muted">Descripción: {selectedProduct.description}</div>
                  <div className="muted">Unidad: {selectedProduct.unit}</div>
                </div>
              </div>
              
            </div>
          </div>
        )}
      </div>
    )}

  // Vista Admin
  return (
    <div>
      <h2 className='title'>Administrar Productos</h2>

      <div className="form-toggle-container">
        <button 
          onClick={toggleForm} 
          className={`form-toggle-btn ${showForm ? 'active' : ''}`}
        >
          {showForm ? '✕ Cancelar' : '+ Agregar Producto'}
        </button>
      </div>

      <div className={`form-container ${showForm ? 'expanded' : ''}`}>
        <form onSubmit={onSubmit} className="grid">
          <input placeholder="Nombre" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <input placeholder="Descripción" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <input placeholder="Cantidad" type="number" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} min="0" />
          <select value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })}>
            <option value="piezas">Piezas</option>
            <option value="metros">Metros</option>
            <option value="kilos">Kilos</option>
            <option value="litros">Litros</option>
            <option value="cajas">Cajas</option>
            <option value="paquetes">Paquetes</option>
            <option value="unidades">Unidades</option>
          </select>
          <button disabled={loading} type="submit">{loading ? 'Guardando...' : 'Agregar'}</button>
        </form>
        {error && <div className="error">{error}</div>}
      </div>

      <div className="search-container">
        <input
          type="text"
          placeholder="Buscar productos..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />
      </div>

      <div className="products-grid">
        {currentProducts.map((p) => (
          <div key={p._id || p.id} className="product-card" onClick={() => openProductCard(p)} role="button" tabIndex={0}>
            <button
              className="card-edit-btn"
              aria-label="Editar producto"
              onClick={(ev) => { ev.stopPropagation(); openProductCardForEdit(p) }}
              title="Editar"
            >
              <img src={editIcon} alt="Editar" className="icon" width="16" height="16" />
            </button>
            <strong>{p.name}</strong>
            <div className="muted">{p.description}</div>
            <div className="muted">Unidad: {p.unit}</div>
            <div className="product-actions">
              <div className="badge">{p.quantity} {p.unit}</div>
              <button className="ghost" onClick={(ev) => { ev.stopPropagation(); openProductCard(p) }}>Ver</button>
              <button className="ghost" onClick={(ev) => { ev.stopPropagation(); handleDelete(p._id || p.id) }}>Eliminar</button>
            </div>
          </div>
        ))}
      </div>

      {totalPages > 1 && (
        <div className="pagination">
          <button onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1}>Anterior</button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
            <button key={page} onClick={() => setCurrentPage(page)} className={currentPage === page ? 'active' : ''}>{page}</button>
          ))}
          <button onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages}>Siguiente</button>
        </div>
      )}

      {filteredProducts.length === 0 && searchTerm && (
        <div className="no-results">No se encontraron productos que coincidan con "{searchTerm}"</div>
      )}

      {selectedProduct && (
        <div className="modal-backdrop" onClick={closeProductCard}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{selectedProduct.name}</h3>
              <div className="modal-actions">
                {!showEdit && (
                  <button className="ghost" onClick={() => setShowEdit(true)}>Editar</button>
                )}
                <button className="ghost" onClick={closeProductCard}>✕</button>
              </div>
            </div>
            <div className="modal-body">
              {showEdit && (
                <form className="edit-form" onSubmit={submitEdit}>
                  <label>Nombre</label>
                  <input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} required />
                  <label>Descripción</label>
                  <input value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} />
                  <label>Cantidad</label>
                  <input type="number" min="0" value={editForm.quantity} onChange={(e) => setEditForm({ ...editForm, quantity: e.target.value })} />
                  <label>Unidad</label>
                  <select value={editForm.unit} onChange={(e) => setEditForm({ ...editForm, unit: e.target.value })}>
                    <option value="piezas">Piezas</option>
                    <option value="metros">Metros</option>
                    <option value="kilos">Kilos</option>
                    <option value="litros">Litros</option>
                    <option value="cajas">Cajas</option>
                    <option value="paquetes">Paquetes</option>
                    <option value="unidades">Unidades</option>
                  </select>
                  <div className="modal-footer">
                    <button type="button" className="ghost" onClick={() => setShowEdit(false)}>Cancelar</button>
                    <button type="submit" className="primary">Guardar</button>
                  </div>
                </form>
              )}

              {!showEdit && (
                <>
                  <div className="product-details">
                    <div className="muted">Descripción: {selectedProduct.description}</div>
                    <div className="muted">Unidad: {selectedProduct.unit}</div>
                    <div className="muted">Cantidad actual: {selectedProduct.quantity} {selectedProduct.unit}</div>
                  </div>

                  {/* Filtros historial */}
                  <div className="delivery-filters">
                    <div className="filter-field">
                      <label>Usuario</label>
                      <select value={deliveryFilters.userId} onChange={(e) => setDeliveryFilters({ ...deliveryFilters, userId: e.target.value })}>
                        <option value="">Todos</option>
                        {users.map((u) => (
                          <option key={u._id || u.id} value={u._id || u.id}>{u.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="filter-field">
                      <label>Desde</label>
                      <input type="date" value={deliveryFilters.from} onChange={(e) => setDeliveryFilters({ ...deliveryFilters, from: e.target.value })} />
                    </div>
                    <div className="filter-field">
                      <label>Hasta</label>
                      <input type="date" value={deliveryFilters.to} onChange={(e) => setDeliveryFilters({ ...deliveryFilters, to: e.target.value })} />
                    </div>
                    <div className="filter-actions">
                      <button className="ghost" onClick={() => setDeliveryFilters({ userId: '', from: '', to: '' })}>Limpiar filtros</button>
                    </div>
                  </div>

                  {user?.role === 'admin' && (
                    <div className="deliver-section">
                      <button className="primary" onClick={() => setShowDeliverModal(true)}>Entregar</button>
                    </div>
                  )}

                  {user?.role === 'admin' && (
                    <div className="delivery-history">
                      <h4>Historial de entregas</h4>
                      {visibleDeliveries.length === 0 ? (
                        <div className="muted">Sin entregas registradas para los filtros aplicados.</div>
                      ) : (
                        <div className="delivery-table">
                          <div className="delivery-row delivery-row-header">
                            <div>Fecha</div>
                            <div>Hora</div>
                            <div>Cantidad</div>
                            <div>Usuario</div>
                            <div>Entregado por</div>
                          </div>
                          {visibleDeliveries.map((d) => {
                            const date = new Date(d.deliveredAt || d.createdAt)
                            const f = date.toLocaleDateString()
                            const t = date.toLocaleTimeString()
                            const isIn = (d.type === 'in')
                            const sign = isIn ? '+' : '-'
                            return (
                              <div key={d._id} className="delivery-row">
                                <div>{f}</div>
                                <div>{t}</div>
                                <div className={`qty ${isIn ? 'qty-in' : 'qty-out'}`}>{sign}{d.quantity}</div>
                                <div>{d.toUser?.name || d.toUser?.email || (isIn ? '—' : '')}</div>
                                <div>{d.deliveredBy?.name || d.deliveredBy?.email}</div>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
            
          </div>
        </div>
      )}

      {showDeliverModal && selectedProduct && (
        <div className="modal-backdrop" onClick={() => setShowDeliverModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Entregar producto</h3>
              <button className="ghost" onClick={() => setShowDeliverModal(false)}>✕</button>
            </div>
            <form className="deliver-form" onSubmit={submitDelivery}>
              <label>Cantidad</label>
              <input type="number" min="1" value={deliverForm.quantity} onChange={(e) => setDeliverForm({ ...deliverForm, quantity: e.target.value })} required />
              <label>Usuario destino</label>
              <select value={deliverForm.toUserId} onChange={(e) => setDeliverForm({ ...deliverForm, toUserId: e.target.value })} required>
                <option value="">Selecciona un usuario</option>
                {users.map((u) => (
                  <option key={u._id || u.id} value={u._id || u.id}>{u.name} ({u.email})</option>
                ))}
              </select>
              <div className="modal-footer">
                <button type="button" className="ghost" onClick={() => setShowDeliverModal(false)}>Cancelar</button>
                <button type="submit" className="primary">Confirmar entrega</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}


