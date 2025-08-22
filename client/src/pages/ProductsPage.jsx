import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '../context/AuthContext.jsx'

export default function ProductsPage() {
  const { api, user } = useAuth()
  const [form, setForm] = useState({ name: '', description: '', unit: 'piezas', quantity: 0, recommendedQuantity: 0 })
  const [products, setProducts] = useState([])
  const [filteredProducts, setFilteredProducts] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [showForm, setShowForm] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [productDeliveries, setProductDeliveries] = useState([])
  const [editingDeliveryId, setEditingDeliveryId] = useState(null)
  const [editingDeliveryQty, setEditingDeliveryQty] = useState('')
  const [showDeliverModal, setShowDeliverModal] = useState(false)
  const [deliverForm, setDeliverForm] = useState({ quantity: '', toUserId: '' })
  const [users, setUsers] = useState([])
  const [deliveryFilters, setDeliveryFilters] = useState({ userId: '', from: '', to: '' })
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
        recommendedQuantity: Number(form.recommendedQuantity) || 0,
      })
      setForm({ name: '', description: '', unit: 'piezas', quantity: 0, recommendedQuantity: 0 })
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

  const closeProductCard = () => {
    setSelectedProduct(null)
    setProductDeliveries([])
    setShowDeliverModal(false)
    setDeliverForm({ quantity: '', toUserId: '' })
    setDeliveryFilters({ userId: '', from: '', to: '' })
    setEditingDeliveryId(null)
    setEditingDeliveryQty('')
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
              <div className="modal-footer">
                <button onClick={closeProductCard}>Cerrar</button>
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
          <input placeholder="Cantidad recomendada" type="number" value={form.recommendedQuantity} onChange={(e) => setForm({ ...form, recommendedQuantity: e.target.value })} min="0" />
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
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <strong>{p.name}</strong>
              {(typeof p.recommendedQuantity === 'number' && typeof p.quantity === 'number' && p.recommendedQuantity > 0 && p.quantity < p.recommendedQuantity) && (
                <span className="low-stock-indicator" title="Producto escaso"></span>
              )}
            </div>
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
              <button className="ghost" onClick={closeProductCard}>✕</button>
            </div>
            <div className="modal-body">
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
                        const isEditing = editingDeliveryId === d._id
                        return (
                          <div key={d._id} className="delivery-row">
                            <div>{f}</div>
                            <div>{t}</div>
                            <div className={`qty ${isIn ? 'qty-in' : 'qty-out'}`}>
                              {sign}
                              {isEditing ? (
                                <input
                                  type="number"
                                  min="1"
                                  value={editingDeliveryQty}
                                  onChange={(e) => setEditingDeliveryQty(e.target.value)}
                                  style={{ width: 80 }}
                                />
                              ) : (
                                d.quantity
                              )}
                            </div>
                            <div>{d.toUser?.name || d.toUser?.email || (isIn ? '—' : '')}</div>
                            <div className="delivery-actions">
                              <div className="muted">{d.deliveredBy?.name || d.deliveredBy?.email}</div>
                              {user?.role === 'admin' && (
                                isEditing ? (
                                  <>
                                    <button
                                      className="ghost"
                                      onClick={async () => {
                                        try {
                                          const newQty = Number(editingDeliveryQty)
                                          if (!newQty || newQty <= 0) return
                                          await api.put(`/deliveries/${d._id}`, { quantity: newQty })
                                          setEditingDeliveryId(null)
                                          setEditingDeliveryQty('')
                                          // Refrescar detalle y entregas
                                          await openProductCard(selectedProduct._id || selectedProduct.id)
                                          await load()
                                        } catch (err) {
                                          alert(err?.response?.data?.message || 'Error al actualizar entrega')
                                        }
                                      }}
                                    >Guardar</button>
                                    <button
                                      className="ghost"
                                      onClick={() => {
                                        setEditingDeliveryId(null)
                                        setEditingDeliveryQty('')
                                      }}
                                    >Cancelar</button>
                                  </>
                                ) : (
                                  <button
                                    className="ghost"
                                    onClick={() => {
                                      setEditingDeliveryId(d._id)
                                      setEditingDeliveryQty(String(d.quantity))
                                    }}
                                  >Editar</button>
                                )
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button onClick={closeProductCard}>Cerrar</button>
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


