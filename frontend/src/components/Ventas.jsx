import React, { useState, useEffect } from 'react';
import { 
  ShoppingCart, 
  PlusCircle, 
  Search, 
  Trash2, 
  RefreshCw, 
  FileText, 
  CheckCircle2, 
  AlertTriangle, 
  DollarSign, 
  PackageCheck, 
  Receipt,
  Minus,
  Plus,
  Eye,
  Store,
  Tag,
  Boxes,
  Package,
  Layers,
  X
} from 'lucide-react';
import { apiService } from '../services/api';
import './Ventas.css';

const Ventas = ({ currentUser, onOpenAuthModal, triggerRefresh, setTriggerRefresh }) => {
  const [ventas, setVentas] = useState([]);
  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // POS / New Sale Modal state
  const [isPosModalOpen, setIsPosModalOpen] = useState(false);
  const [posProductSearch, setPosProductSearch] = useState('');
  const [cart, setCart] = useState([]);

  // Detail Modal state
  const [selectedVenta, setSelectedVenta] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // Feedback alerts inside modals
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [viewAlert, setViewAlert] = useState(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [ventasData, productosData] = await Promise.all([
        apiService.getVentas(),
        apiService.getProductos()
      ]);
      setVentas(ventasData);
      setProductos(productosData);
    } catch (err) {
      console.error('Error al cargar datos de ventas:', err);
      showAlert('Error al conectar con el servidor para obtener ventas.', 'danger');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [triggerRefresh]);

  const showAlert = (message, type = 'success') => {
    setViewAlert({ message, type });
    setTimeout(() => {
      setViewAlert(null);
    }, 4000);
  };

  // Format currency ARS
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(amount || 0);
  };

  // Cart operations
  const handleAddToCart = (producto) => {
    if (producto.stock <= 0) {
      setFormError(`El producto "${producto.nombre}" no tiene stock disponible.`);
      return;
    }

    setCart((prevCart) => {
      const existingIndex = prevCart.findIndex(item => item.productoId === producto.id);
      if (existingIndex > -1) {
        const currentQty = prevCart[existingIndex].cantidad;
        if (currentQty >= producto.stock) {
          setFormError(`No se puede agregar más unidades de "${producto.nombre}". Stock máximo alcanzado (${producto.stock}).`);
          return prevCart;
        }
        const updated = [...prevCart];
        updated[existingIndex] = {
          ...updated[existingIndex],
          cantidad: currentQty + 1,
          subtotal: (currentQty + 1) * producto.precio
        };
        return updated;
      } else {
        return [
          ...prevCart,
          {
            productoId: producto.id,
            nombre: producto.nombre,
            marca: producto.marca,
            precioUnitario: producto.precio,
            cantidad: 1,
            subtotal: producto.precio,
            stockMax: producto.stock
          }
        ];
      }
    });
    setFormError('');
  };

  const handleUpdateQuantity = (productoId, delta) => {
    setCart((prevCart) => {
      return prevCart.map(item => {
        if (item.productoId === productoId) {
          const newQty = item.cantidad + delta;
          if (newQty <= 0) return null;
          if (newQty > item.stockMax) {
            setFormError(`Supera el stock disponible (${item.stockMax} u.) para "${item.nombre}".`);
            return item;
          }
          return {
            ...item,
            cantidad: newQty,
            subtotal: newQty * item.precioUnitario
          };
        }
        return item;
      }).filter(Boolean);
    });
    setFormError('');
  };

  const handleRemoveFromCart = (productoId) => {
    setCart(prevCart => prevCart.filter(item => item.productoId !== productoId));
    setFormError('');
  };

  const handleClearCart = () => {
    setCart([]);
    setFormError('');
  };

  // Cart totals computation
  const totalCartAmount = cart.reduce((acc, item) => acc + item.subtotal, 0);
  const totalCartItemsCount = cart.reduce((acc, item) => acc + item.cantidad, 0);

  // Confirm Sale submit
  const handleConfirmSale = async () => {
    setFormError('');
    setFormSuccess('');

    if (cart.length === 0) {
      setFormError('El carrito de compras está vacío.');
      return;
    }

    // Check stock limits before submit
    for (const item of cart) {
      const prodInStock = productos.find(p => p.id === item.productoId);
      if (prodInStock && item.cantidad > prodInStock.stock) {
        setFormError(`Supera el stock de "${item.nombre}". Disponible: ${prodInStock.stock}.`);
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const detallesPayload = cart.map(item => ({
        productoId: item.productoId,
        cantidad: item.cantidad
      }));

      const res = await apiService.createVenta(detallesPayload);

      if (res.success) {
        setFormSuccess('¡Venta registrada con éxito!');
        showAlert(res.message, 'success');
        setCart([]);
        setTimeout(() => {
          setIsPosModalOpen(false);
          setFormSuccess('');
          loadData();
          if (setTriggerRefresh) setTriggerRefresh(prev => !prev);
        }, 1200);
      }
    } catch (err) {
      console.error('Error al registrar la venta:', err);
      setFormError(err.message || 'Ocurrió un error al procesar la venta.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open Detail Modal
  const handleOpenDetailModal = (venta) => {
    setSelectedVenta(venta);
    setIsDetailModalOpen(true);
  };

  // Calculated Stats
  const totalVentasMonto = ventas.reduce((acc, v) => acc + (v.total || 0), 0);
  const totalProductosVendidosCount = ventas.reduce((acc, v) => acc + (v.cantProductos || 0), 0);
  const ticketPromedio = ventas.length > 0 ? (totalVentasMonto / ventas.length) : 0;

  // Filtered sales
  const filteredVentas = ventas.filter(venta => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    const matchId = String(venta.id).includes(q);
    const matchProduct = venta.detalles?.some(d => d.nombreProducto?.toLowerCase().includes(q));
    return matchId || matchProduct;
  });

  // Filtered products inside POS selector
  const availablePosProducts = productos.filter(p => {
    const q = posProductSearch.toLowerCase().trim();
    if (!q) return true;
    return p.nombre.toLowerCase().includes(q) || p.marca.toLowerCase().includes(q);
  });

  return (
    <div className="ventas-view">
      {/* View Header - matching Duenos and Productos layout */}
      <div className="view-header">
        <div>
          <h2>Punto de Venta & Ventas</h2>
          <p className="subtitle">Gestión de caja, facturación de insumos médicos y consulta de comprobantes.</p>
        </div>

        <div className="header-actions-group">
          <button className="btn btn-secondary" onClick={loadData} title="Recargar ventas">
            <RefreshCw size={16} className={loading ? 'spin' : ''} />
            Actualizar
          </button>
          
          <button 
            className="btn btn-success" 
            onClick={() => {
              setCart([]);
              setFormError('');
              setFormSuccess('');
              setIsPosModalOpen(true);
            }}
          >
            <ShoppingCart size={18} />
            Registrar Venta (POS)
          </button>
        </div>
      </div>

      {/* Global alert toast banner */}
      {viewAlert && (
        <div className={`alert-message ${viewAlert.type === 'danger' ? 'danger-alert' : 'success-alert'}`}>
          {viewAlert.message}
        </div>
      )}

      {/* Summary Cards - matching Productos stats layout */}
      <div className="products-stats-summary">
        <div className="product-stat-card">
          <div className="product-stat-icon success-bg">
            <DollarSign size={20} />
          </div>
          <div className="product-stat-info">
            <span className="product-stat-label">Total Facturado</span>
            <span className="product-stat-value">{formatCurrency(totalVentasMonto)}</span>
          </div>
        </div>

        <div className="product-stat-card">
          <div className="product-stat-icon info-bg">
            <Receipt size={20} />
          </div>
          <div className="product-stat-info">
            <span className="product-stat-label">Ventas Registradas</span>
            <span className="product-stat-value">{ventas.length}</span>
          </div>
        </div>

        <div className="product-stat-card">
          <div className="product-stat-icon warning-bg">
            <PackageCheck size={20} />
          </div>
          <div className="product-stat-info">
            <span className="product-stat-label">Productos Vendidos</span>
            <span className="product-stat-value">{totalProductosVendidosCount} u.</span>
          </div>
        </div>

        <div className="product-stat-card">
          <div className="product-stat-icon success-bg">
            <Tag size={20} />
          </div>
          <div className="product-stat-info">
            <span className="product-stat-label">Ticket Promedio</span>
            <span className="product-stat-value">{formatCurrency(ticketPromedio)}</span>
          </div>
        </div>
      </div>

      {/* Main Card with Search Bar and Table - matching Duenos/Productos */}
      <div className="card">
        <div className="search-bar-wrapper">
          <div className="search-input-wrapper">
            <Search className="search-icon" size={18} />
            <input 
              type="text" 
              className="form-input search-input" 
              placeholder="Buscar por N° comprobante o nombre de producto..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <span className="badge badge-info ml-auto">
            {filteredVentas.length} comprobante(s)
          </span>
        </div>

        {loading ? (
          <div className="empty-state py-4">
            <p>Cargando registro de ventas...</p>
          </div>
        ) : filteredVentas.length === 0 ? (
          <div className="empty-state py-4">
            <Receipt className="empty-icon" size={44} />
            <p>
              {searchQuery 
                ? 'No hay comprobantes que coincidan con la búsqueda.' 
                : 'Aún no se han registrado operaciones de venta en el sistema.'}
            </p>
            {!searchQuery && (
              <button className="btn btn-success mt-3" onClick={() => setIsPosModalOpen(true)}>
                <ShoppingCart size={16} /> Abrir Punto de Venta
              </button>
            )}
          </div>
        ) : (
          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>N° Venta</th>
                  <th>Cant. Productos</th>
                  <th>Resumen de Ítems</th>
                  <th>Monto Total</th>
                  <th style={{ width: '160px', textAlign: 'right' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredVentas.map((venta) => (
                  <tr key={venta.id}>
                    <td>
                      <span className="venta-code-pill">
                        #V-{String(venta.id).padStart(4, '0')}
                      </span>
                    </td>
                    <td>
                      <span className="badge badge-info">
                        {venta.cantProductos} artículo(s)
                      </span>
                    </td>
                    <td>
                      {venta.detalles && venta.detalles.length > 0 ? (
                        <div className="items-tags-row">
                          {venta.detalles.map((det, i) => (
                            <span key={i} className="item-chip">
                              {det.nombreProducto} <small>({det.cantidad}x)</small>
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-muted">Sin detalles</span>
                      )}
                    </td>
                    <td>
                      <strong className="venta-amount-text">
                        {formatCurrency(venta.total)}
                      </strong>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button 
                        className="btn btn-secondary btn-sm"
                        onClick={() => handleOpenDetailModal(venta)}
                        title="Ver comprobante detallado"
                      >
                        <Eye size={15} /> Ver Comprobante
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* POS MODAL / REGISTRAR VENTA */}
      {isPosModalOpen && (
        <div className="modal-overlay" onClick={() => setIsPosModalOpen(false)}>
          <div className="modal-content pos-modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-with-badge">
                <div className="product-stat-icon success-bg mr-3">
                  <ShoppingCart size={20} className="text-secondary" />
                </div>
                <div>
                  <h3>Registrar Nueva Venta (Punto de Venta)</h3>
                  <p className="subtitle" style={{ fontSize: '0.85rem', margin: 0 }}>
                    Seleccione los productos del catálogo y configure el comprobante.
                  </p>
                </div>
              </div>
              <button className="modal-close-btn" onClick={() => setIsPosModalOpen(false)}>
                &times;
              </button>
            </div>

            <div className="modal-body pos-layout-grid">
              {/* Left Column: Product Selection Catalog */}
              <div className="pos-catalog-panel">
                <div className="pos-panel-header">
                  <h4 className="pos-panel-title">
                    <Boxes size={18} /> Catálogo de Productos
                  </h4>
                </div>

                <div className="search-input-wrapper mb-3">
                  <Search className="search-icon" size={16} />
                  <input 
                    type="text"
                    className="form-input search-input"
                    placeholder="Buscar por nombre o marca..."
                    value={posProductSearch}
                    onChange={(e) => setPosProductSearch(e.target.value)}
                  />
                </div>

                <div className="pos-product-cards-list">
                  {availablePosProducts.length === 0 ? (
                    <div className="empty-catalog">
                      <p>No se encontraron productos en el inventario.</p>
                    </div>
                  ) : (
                    availablePosProducts.map((producto) => (
                      <div 
                        key={producto.id} 
                        className={`pos-product-card ${producto.stock <= 0 ? 'disabled' : ''}`}
                      >
                        <div className="product-card-details">
                          <span className="product-card-title">{producto.nombre}</span>
                          <span className="brand-tag mt-1">{producto.marca}</span>
                          <span className="product-card-price mt-1">{formatCurrency(producto.precio)}</span>
                        </div>

                        <div className="product-card-actions">
                          <span className={`badge ${producto.stock > 5 ? 'badge-success' : producto.stock > 0 ? 'badge-warning' : 'badge-danger'}`}>
                            Stock: {producto.stock}
                          </span>
                          
                          <button 
                            className="btn btn-success btn-sm mt-1"
                            disabled={producto.stock <= 0}
                            onClick={() => handleAddToCart(producto)}
                            title={producto.stock <= 0 ? 'Sin stock' : 'Agregar al carrito'}
                          >
                            <Plus size={15} /> Agregar
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Right Column: Active Cart & Checkout */}
              <div className="pos-cart-panel">
                <div className="pos-panel-header flex-between mb-2">
                  <h4 className="pos-panel-title">
                    <ShoppingCart size={18} /> Carrito de Compras ({totalCartItemsCount})
                  </h4>
                  {cart.length > 0 && (
                    <button className="btn btn-link text-danger p-0" onClick={handleClearCart}>
                      <Trash2 size={14} /> Vaciar
                    </button>
                  )}
                </div>

                {formError && (
                  <div className="alert-message danger-alert mb-3">
                    {formError}
                  </div>
                )}

                {formSuccess && (
                  <div className="alert-message success-alert mb-3">
                    {formSuccess}
                  </div>
                )}

                <div className="pos-cart-list">
                  {cart.length === 0 ? (
                    <div className="empty-cart-state">
                      <ShoppingCart size={36} className="text-muted mb-2" />
                      <p>El carrito está vacío.</p>
                      <small className="text-muted">Seleccione productos del catálogo a la izquierda.</small>
                    </div>
                  ) : (
                    cart.map((item) => (
                      <div key={item.productoId} className="pos-cart-row">
                        <div className="cart-row-info">
                          <span className="cart-row-name">{item.nombre}</span>
                          <span className="cart-row-unit-price">
                            {formatCurrency(item.precioUnitario)} c/u
                          </span>
                        </div>

                        <div className="cart-row-controls">
                          <div className="quantity-stepper">
                            <button 
                              className="stepper-btn"
                              onClick={() => handleUpdateQuantity(item.productoId, -1)}
                            >
                              <Minus size={13} />
                            </button>
                            <span className="stepper-value">{item.cantidad}</span>
                            <button 
                              className="stepper-btn"
                              onClick={() => handleUpdateQuantity(item.productoId, 1)}
                            >
                              <Plus size={13} />
                            </button>
                          </div>

                          <span className="cart-row-subtotal">
                            {formatCurrency(item.subtotal)}
                          </span>

                          <button 
                            className="icon-remove-btn"
                            onClick={() => handleRemoveFromCart(item.productoId)}
                            title="Quitar ítem"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Cart Summary Card */}
                <div className="pos-cart-summary">
                  <div className="summary-line">
                    <span>Ítems totales:</span>
                    <strong>{totalCartItemsCount} u.</strong>
                  </div>
                  <div className="summary-line total-line">
                    <span>Total a Cobrar:</span>
                    <strong className="text-success">{formatCurrency(totalCartAmount)}</strong>
                  </div>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button 
                className="btn btn-secondary" 
                onClick={() => setIsPosModalOpen(false)}
                disabled={isSubmitting}
              >
                Cancelar
              </button>
              <button 
                className="btn btn-success" 
                onClick={handleConfirmSale}
                disabled={cart.length === 0 || isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="spin" size={16} /> Procesando...
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={18} /> Confirmar Venta
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SALE DETAIL MODAL */}
      {isDetailModalOpen && selectedVenta && (
        <div className="modal-overlay" onClick={() => setIsDetailModalOpen(false)}>
          <div className="modal-content receipt-modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-with-badge">
                <div className="product-stat-icon info-bg mr-3">
                  <FileText size={20} className="text-primary" />
                </div>
                <div>
                  <h3>Comprobante de Venta #V-{String(selectedVenta.id).padStart(4, '0')}</h3>
                  <p className="subtitle" style={{ fontSize: '0.85rem', margin: 0 }}>
                    Detalle final del comprobante comercial emitido.
                  </p>
                </div>
              </div>
              <button className="modal-close-btn" onClick={() => setIsDetailModalOpen(false)}>
                &times;
              </button>
            </div>

            <div className="modal-body py-3">
              <div className="receipt-banner">
                <div>
                  <h4 style={{ margin: 0 }}>SoftVet - Clínica & Farmacia Veterinaria</h4>
                  <p className="text-muted" style={{ margin: 0, fontSize: '0.85rem' }}>Comprobante comercial de insumos y medicamentos</p>
                </div>
                <div>
                  <span className="badge badge-success">Venta Finalizada</span>
                </div>
              </div>

              <h4 className="mt-4 mb-2 font-weight-bold" style={{ fontSize: '0.95rem' }}>Detalle de Productos:</h4>
              <div className="table-container mb-3">
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th>Producto</th>
                      <th style={{ textAlign: 'center' }}>Cantidad</th>
                      <th style={{ textAlign: 'right' }}>Precio Unitario</th>
                      <th style={{ textAlign: 'right' }}>Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedVenta.detalles && selectedVenta.detalles.length > 0 ? (
                      selectedVenta.detalles.map((det, index) => (
                        <tr key={index}>
                          <td><strong>{det.nombreProducto}</strong></td>
                          <td style={{ textAlign: 'center' }}>{det.cantidad} u.</td>
                          <td style={{ textAlign: 'right' }}>{formatCurrency(det.precioUnitario)}</td>
                          <td style={{ textAlign: 'right' }}>{formatCurrency(det.subtotal)}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="4" className="text-center text-muted">Sin renglones disponibles</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="pos-cart-summary">
                <div className="summary-line">
                  <span>Cantidad Total de Productos:</span>
                  <strong>{selectedVenta.cantProductos} unidad(es)</strong>
                </div>
                <div className="summary-line total-line">
                  <span>Monto Total Cobrado:</span>
                  <strong className="text-success">{formatCurrency(selectedVenta.total)}</strong>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setIsDetailModalOpen(false)}>
                Cerrar Comprobante
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Ventas;
