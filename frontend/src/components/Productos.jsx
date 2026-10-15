import React, { useState, useEffect } from 'react';
import { 
  Package, 
  PlusCircle, 
  Search, 
  Filter, 
  Trash2, 
  AlertTriangle, 
  Boxes, 
  DollarSign, 
  RefreshCw,
  ShieldAlert,
  Tag
} from 'lucide-react';
import { apiService } from '../services/api';
import './Productos.css';

const Productos = ({ currentUser, onOpenAuthModal, triggerRefresh, setTriggerRefresh }) => {
  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBrand, setSelectedBrand] = useState('ALL');
  
  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState(null);

  // Form state
  const [formData, setFormData] = useState({
    nombre: '',
    marca: '',
    precio: '',
    stock: ''
  });

  // Feedback alerts inside modal
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Toast / View alerts
  const [viewAlert, setViewAlert] = useState(null);

  const loadProductos = async () => {
    setLoading(true);
    try {
      const data = await apiService.getProductos();
      setProductos(data);
    } catch (err) {
      console.error('Error al cargar productos:', err);
      showAlert('No se pudieron obtener los productos del servidor.', 'danger');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProductos();
  }, [triggerRefresh]);

  const showAlert = (message, type = 'success') => {
    setViewAlert({ message, type });
    setTimeout(() => {
      setViewAlert(null);
    }, 4000);
  };

  // Form input handler
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (formError) setFormError('');
  };

  // Create Product Submit Handler
  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');

    if (!formData.nombre.trim()) {
      setFormError('Debe ingresar el nombre del producto.');
      return;
    }

    if (formData.precio === '' || Number(formData.precio) < 0) {
      setFormError('Debe ingresar un precio válido (mayor o igual a 0).');
      return;
    }

    if (formData.stock === '' || Number(formData.stock) < 0) {
      setFormError('Debe ingresar una cantidad de stock válida.');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await apiService.createProducto(
        formData.nombre.trim(),
        formData.marca.trim() || 'Genérico',
        parseFloat(formData.precio),
        parseInt(formData.stock, 10)
      );

      if (result.success) {
        setFormSuccess(result.message || 'Producto registrado exitosamente.');
        showAlert(result.message || 'Producto registrado correctamente.', 'success');
        setFormData({ nombre: '', marca: '', precio: '', stock: '' });
        
        setTimeout(() => {
          setIsCreateModalOpen(false);
          setFormSuccess('');
          loadProductos();
          if (setTriggerRefresh) setTriggerRefresh(prev => !prev);
        }, 1200);
      }
    } catch (err) {
      console.error('Error creando producto:', err);
      if (err.message && (err.message.includes('403') || err.message.includes('denegado') || err.message.includes('ADMIN'))) {
        setFormError('Acceso denegado: Se requieren permisos de ADMIN para registrar productos.');
      } else {
        setFormError(err.message || 'No se pudo guardar el producto.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete Product Handler
  const confirmDelete = (producto) => {
    setProductToDelete(producto);
    setIsDeleteModalOpen(true);
  };

  const handleDeleteSubmit = async () => {
    if (!productToDelete) return;
    setIsSubmitting(true);
    try {
      const result = await apiService.deleteProducto(productToDelete.id);
      if (result.success) {
        showAlert(result.message || 'Producto eliminado correctamente.', 'success');
        setIsDeleteModalOpen(false);
        setProductToDelete(null);
        loadProductos();
        if (setTriggerRefresh) setTriggerRefresh(prev => !prev);
      }
    } catch (err) {
      console.error('Error eliminando producto:', err);
      showAlert(err.message || 'Error al intentar eliminar el producto.', 'danger');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter products by search query and brand
  const filteredProductos = productos.filter(p => {
    const matchesSearch = 
      p.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.marca.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesBrand = selectedBrand === 'ALL' || p.marca.toLowerCase() === selectedBrand.toLowerCase();

    return matchesSearch && matchesBrand;
  });

  // Extract unique brands for filter selector
  const availableBrands = Array.from(new Set(productos.map(p => p.marca))).filter(Boolean);

  // Statistics calculation
  const totalProductos = productos.length;
  const lowStockCount = productos.filter(p => p.stock <= 5 && p.stock > 0).length;
  const outOfStockCount = productos.filter(p => p.stock === 0).length;
  const totalInventoryValue = productos.reduce((acc, p) => acc + (p.precio * p.stock), 0);

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(val);
  };

  const isAdmin = currentUser?.rol === 'ADMIN';

  return (
    <div className="productos-view">
      {/* View Header - identical to Duenos */}
      <div className="view-header">
        <div>
          <h2>Productos (Inventario)</h2>
          <p className="subtitle">Gestión de insumos médicos, vacunas y productos farmacéuticos.</p>
        </div>
        <div className="header-actions-group">
          <button className="btn btn-secondary" onClick={loadProductos} title="Recargar lista">
            <RefreshCw size={16} className={loading ? 'spin' : ''} />
            Actualizar
          </button>
          <button 
            className="btn btn-success" 
            onClick={() => {
              setFormError('');
              setFormSuccess('');
              setIsCreateModalOpen(true);
            }}
          >
            <PlusCircle size={18} />
            Registrar Producto
          </button>
        </div>
      </div>

      {/* View Alert Toast */}
      {viewAlert && (
        <div className={`alert-message ${viewAlert.type === 'danger' ? 'danger-alert' : 'success-alert'}`}>
          {viewAlert.message}
        </div>
      )}

      {/* Summary Cards */}
      <div className="products-stats-summary">
        <div className="product-stat-card">
          <div className="product-stat-icon info-bg">
            <Boxes size={20} />
          </div>
          <div className="product-stat-info">
            <span className="product-stat-label">Total Ítems</span>
            <span className="product-stat-value">{totalProductos}</span>
          </div>
        </div>

        <div className="product-stat-card">
          <div className="product-stat-icon warning-bg">
            <AlertTriangle size={20} />
          </div>
          <div className="product-stat-info">
            <span className="product-stat-label">Stock Crítico (≤ 5)</span>
            <span className="product-stat-value">{lowStockCount + outOfStockCount}</span>
          </div>
        </div>

        <div className="product-stat-card">
          <div className="product-stat-icon success-bg">
            <DollarSign size={20} />
          </div>
          <div className="product-stat-info">
            <span className="product-stat-label">Valor Total Inventario</span>
            <span className="product-stat-value">{formatCurrency(totalInventoryValue)}</span>
          </div>
        </div>
      </div>

      {/* Main Card with Search Bar and Table - Matching Duenos structure */}
      <div className="card">
        <div className="search-bar-wrapper">
          <div className="search-input-wrapper">
            <Search className="search-icon" size={18} />
            <input
              type="text"
              className="form-input search-input"
              placeholder="Buscar por nombre o marca..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          {availableBrands.length > 0 && (
            <div className="filter-select-wrapper">
              <Filter size={16} className="filter-select-icon" />
              <select
                className="form-select filter-select"
                value={selectedBrand}
                onChange={(e) => setSelectedBrand(e.target.value)}
              >
                <option value="ALL">Todas las marcas</option>
                {availableBrands.map(b => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {loading ? (
          <div className="empty-state">
            <p>Cargando catálogo de productos...</p>
          </div>
        ) : filteredProductos.length === 0 ? (
          <div className="empty-state">
            <Package className="empty-icon" />
            <p>No se encontraron productos que coincidan con la búsqueda.</p>
          </div>
        ) : (
          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Marca</th>
                  <th>Precio Unitario</th>
                  <th>Disponibilidad / Stock</th>
                  <th style={{ width: '150px' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredProductos.map((p) => {
                  let badgeClass = 'badge-success';
                  let stockLabel = `En Stock (${p.stock})`;
                  if (p.stock <= 0) {
                    badgeClass = 'badge-danger';
                    stockLabel = 'Agotado (0)';
                  } else if (p.stock <= 5) {
                    badgeClass = 'badge-warning';
                    stockLabel = `Bajo Stock (${p.stock})`;
                  }

                  return (
                    <tr key={p.id}>
                      <td>
                        <div className="producto-name-cell">
                          <div className="avatar-small avatar-product">
                            <Package size={14} />
                          </div>
                          <span className="font-semibold">{p.nombre}</span>
                        </div>
                      </td>
                      <td>
                        <span className="brand-tag">
                          <Tag size={12} style={{ display: 'inline', marginRight: '4px' }} />
                          {p.marca || 'Genérico'}
                        </span>
                      </td>
                      <td>
                        <span className="product-price">{formatCurrency(p.precio)}</span>
                      </td>
                      <td>
                        <span className={`badge ${badgeClass}`}>
                          {stockLabel}
                        </span>
                      </td>
                      <td>
                        <div className="actions-cell">
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => confirmDelete(p)}
                            title="Eliminar producto"
                          >
                            <Trash2 size={14} />
                            Eliminar
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Registrar Producto */}
      {isCreateModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-body">
              <h3 className="modal-title" style={{ marginBottom: '1.5rem' }}>Registrar Producto</h3>

              {!currentUser && (
                <div className="role-notice">
                  <ShieldAlert size={18} />
                  <div>
                    <span>No has iniciado sesión. El backend requiere permisos de ADMIN.</span>
                    <button 
                      type="button" 
                      className="btn-link" 
                      onClick={onOpenAuthModal}
                      style={{ display: 'block', marginTop: '0.25rem', fontWeight: 'bold' }}
                    >
                      Iniciar Sesión como Admin
                    </button>
                  </div>
                </div>
              )}

              {currentUser && !isAdmin && (
                <div className="role-notice">
                  <ShieldAlert size={18} />
                  <span>Iniciaste sesión como <strong>{currentUser.username}</strong> ({currentUser.rol}). Requiere rol <strong>ADMIN</strong>.</span>
                </div>
              )}

              {formError && <div className="alert-message danger-alert">{formError}</div>}
              {formSuccess && <div className="alert-message success-alert">{formSuccess}</div>}

              <form onSubmit={handleCreateSubmit} id="add-producto-form">
                <div className="form-group">
                  <label className="form-label">Nombre del Producto *</label>
                  <input
                    type="text"
                    name="nombre"
                    className="form-input"
                    placeholder="Ej. Vacuna Quintuple, Pipeta Anti-pulgas"
                    value={formData.nombre}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Marca / Laboratorio</label>
                  <input
                    type="text"
                    name="marca"
                    className="form-input"
                    placeholder="Ej. Zoetis, Bayer, Royal Canin"
                    value={formData.marca}
                    onChange={handleInputChange}
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Precio ($) *</label>
                    <input
                      type="number"
                      name="precio"
                      className="form-input"
                      placeholder="0.00"
                      step="0.01"
                      min="0"
                      value={formData.precio}
                      onChange={handleInputChange}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Stock Inicial (Unidades) *</label>
                    <input
                      type="number"
                      name="stock"
                      className="form-input"
                      placeholder="0"
                      min="0"
                      value={formData.stock}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                </div>
              </form>
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setIsCreateModalOpen(false)}>
                Cancelar
              </button>
              <button 
                className="btn btn-success" 
                type="submit" 
                form="add-producto-form"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Guardando...' : 'Guardar Producto'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Confirmar Eliminación */}
      {isDeleteModalOpen && productToDelete && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '440px' }}>
            <div className="modal-body">
              <h3 className="modal-title" style={{ marginBottom: '1rem' }}>Confirmar Eliminación</h3>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                ¿Estás seguro de que deseas eliminar el producto <strong>"{productToDelete.nombre}"</strong>?
              </p>
            </div>

            <div className="modal-footer">
              <button 
                type="button" 
                className="btn btn-secondary"
                onClick={() => setIsDeleteModalOpen(false)}
              >
                Cancelar
              </button>
              <button 
                type="button" 
                className="btn btn-danger"
                onClick={handleDeleteSubmit}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Eliminando...' : 'Eliminar Producto'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Productos;
