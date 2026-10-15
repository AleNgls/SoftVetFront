import React, { useState, useEffect } from 'react';
import { PawPrint, Users, ClipboardList, Package, ShoppingCart, PlusCircle, Activity, Wifi, WifiOff, Shield, User, KeyRound } from 'lucide-react';
import { apiService } from '../services/api';
import './Dashboard.css';

const Dashboard = ({ setActiveTab, triggerRefresh, currentUser, onOpenAuthModal }) => {
  const [stats, setStats] = useState({
    pacientesCount: 0,
    duenosCount: 0,
    consultasCount: 0,
    productosCount: 0,
    ventasCount: 0
  });
  const [recentConsultas, setRecentConsultas] = useState([]);
  const [backendStatus, setBackendStatus] = useState('checking'); // checking, online, offline

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        const duenos = await apiService.getDuenos();
        const pacientes = await apiService.getPacientes();
        const consultas = await apiService.getConsultas();
        const productos = await apiService.getProductos();
        const ventas = await apiService.getVentas();

        setStats({
          duenosCount: duenos.length,
          pacientesCount: pacientes.length,
          consultasCount: consultas.length,
          productosCount: productos.length,
          ventasCount: ventas.length
        });

        // Get last 3 consultations
        setRecentConsultas(consultas.slice(0, 3));
      } catch (error) {
        console.error('Error loading dashboard stats:', error);
      }
    };

    const checkBackend = async () => {
      try {
        // Consultar /api/pacientes para verificar conexión con el backend
        const response = await fetch('/pacientes');
        if (response.status === 200 || response.status === 401 || response.status === 403) {
          setBackendStatus('online');
        } else {
          setBackendStatus('offline');
        }
      } catch (e) {
        setBackendStatus('offline');
      }
    };

    loadDashboardData();
    checkBackend();
  }, [triggerRefresh]);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }) + ' hs';
  };

  return (
    <div className="dashboard-view">
      <div className="dashboard-header-container">
        <div>
          <h1 className="dashboard-title">
            {currentUser ? `¡Hola, ${currentUser.username}!` : 'Panel de Control'}
          </h1>
          <p className="dashboard-subtitle">
            {currentUser
              ? `Sesión activa como ${currentUser.rol === 'ADMIN' ? 'Administrador' : 'Veterinario'}. Gestión clínica de SoftVet.`
              : 'Bienvenido a la gestión clínica integral de SoftVet.'
            }
          </p>
        </div>
        <div className="dashboard-top-badges">
          <div className={`backend-indicator ${backendStatus}`}>
            {backendStatus === 'checking' && <span className="indicator-text">Verificando conexión...</span>}
            {backendStatus === 'online' && (
              <>
                <Wifi className="indicator-icon" />
                <span className="indicator-text">Backend Online (Spring Boot)</span>
              </>
            )}
            {backendStatus === 'offline' && (
              <>
                <WifiOff className="indicator-icon" />
                <span className="indicator-text">Modo Local (Simulación)</span>
              </>
            )}
          </div>

          {!currentUser && (
            <button className="btn btn-secondary btn-sm" onClick={onOpenAuthModal}>
              <KeyRound size={14} className="text-sky" />
              Iniciar Sesión
            </button>
          )}
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="stats-card">
          <div className="stats-icon-wrapper sky-bg">
            <PawPrint className="stats-icon text-sky" />
          </div>
          <div className="stats-info">
            <span className="stats-label">Pacientes Registrados</span>
            <span className="stats-value">{stats.pacientesCount}</span>
          </div>
        </div>

        <div className="stats-card">
          <div className="stats-icon-wrapper emerald-bg">
            <Users className="stats-icon text-emerald" />
          </div>
          <div className="stats-info">
            <span className="stats-label">Dueños (Clientes)</span>
            <span className="stats-value">{stats.duenosCount}</span>
          </div>
        </div>

        <div className="stats-card">
          <div className="stats-icon-wrapper amber-bg">
            <ClipboardList className="stats-icon text-amber" />
          </div>
          <div className="stats-info">
            <span className="stats-label">Consultas Realizadas</span>
            <span className="stats-value">{stats.consultasCount}</span>
          </div>
        </div>

        <div className="stats-card">
          <div className="stats-icon-wrapper purple-bg">
            <Package className="stats-icon text-purple" />
          </div>
          <div className="stats-info">
            <span className="stats-label">Productos & Stock</span>
            <span className="stats-value">{stats.productosCount}</span>
          </div>
        </div>

        <div className="stats-card">
          <div className="stats-icon-wrapper emerald-bg">
            <ShoppingCart className="stats-icon text-emerald" />
          </div>
          <div className="stats-info">
            <span className="stats-label">Ventas Registradas</span>
            <span className="stats-value">{stats.ventasCount}</span>
          </div>
        </div>
      </div>

      <div className="dashboard-sections">
        {/* Recent Consultations */}
        <div className="card recent-activity-card">
          <div className="card-header">
            <h3 className="card-title">Últimas Consultas Médicas</h3>
            <button className="btn btn-secondary btn-sm" onClick={() => setActiveTab('consultas')}>
              Ver Todas
            </button>
          </div>

          {recentConsultas.length === 0 ? (
            <div className="empty-state">
              <Activity className="empty-icon" />
              <p>No se han registrado consultas médicas aún.</p>
            </div>
          ) : (
            <div className="recent-list">
              {recentConsultas.map((consulta) => (
                <div key={consulta.id} className="recent-item">
                  <div className="recent-item-icon">
                    <ClipboardList className="item-icon" />
                  </div>
                  <div className="recent-item-details">
                    <div className="recent-item-title-row">
                      <span className="patient-name">{consulta.pacienteNombre}</span>
                      <span className="consultation-date">{formatDate(consulta.fecha)}</span>
                    </div>
                    <p className="consultation-reason"><strong>Motivo:</strong> {consulta.motivo}</p>
                    <p className="consultation-treatment"><strong>Tratamiento:</strong> {consulta.tratamiento}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="card quick-actions-card">
          <div className="card-header">
            <h3 className="card-title">Acciones Rápidas</h3>
          </div>
          <div className="quick-actions-grid">
            <button className="quick-action-btn border-emerald" onClick={() => setActiveTab('duenos')}>
              <PlusCircle className="action-icon text-emerald" />
              <span className="action-title">Registrar Dueño</span>
              <span className="action-desc">Registra un nuevo propietario/cliente en el sistema.</span>
            </button>

            <button className="quick-action-btn border-sky" onClick={() => setActiveTab('pacientes')}>
              <PlusCircle className="action-icon text-sky" />
              <span className="action-title">Registrar Mascota</span>
              <span className="action-desc">Agrega una mascota vinculándola a un dueño.</span>
            </button>

            <button className="quick-action-btn border-amber" onClick={() => setActiveTab('consultas')}>
              <PlusCircle className="action-icon text-amber" />
              <span className="action-title">Nueva Consulta</span>
              <span className="action-desc">Registra una visita médica e historial clínico.</span>
            </button>

            <button className="quick-action-btn border-purple" onClick={() => setActiveTab('productos')}>
              <PlusCircle className="action-icon text-purple" />
              <span className="action-title">Nuevo Producto</span>
              <span className="action-desc">Gestiona inventario, insumos médicos y farmacia.</span>
            </button>

            <button className="quick-action-btn border-emerald" onClick={() => setActiveTab('ventas')}>
              <PlusCircle className="action-icon text-emerald" />
              <span className="action-title">Nueva Venta (POS)</span>
              <span className="action-desc">Abre la caja registradora y factura productos.</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

