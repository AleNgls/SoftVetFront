import React from 'react';
import { LayoutDashboard, Users, PawPrint, ClipboardList, Package, ShoppingCart, Sun, Moon, LogIn, UserCheck, Shield, KeyRound } from 'lucide-react';
import './Sidebar.css';

const Sidebar = ({ 
  activeTab, 
  setActiveTab, 
  theme, 
  toggleTheme, 
  currentUser, 
  onOpenAuthModal 
}) => {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'duenos', label: 'Dueños (Clientes)', icon: Users },
    { id: 'pacientes', label: 'Pacientes (Mascotas)', icon: PawPrint },
    { id: 'consultas', label: 'Consultas Médicas', icon: ClipboardList },
    { id: 'productos', label: 'Productos & Stock', icon: Package },
    { id: 'ventas', label: 'Ventas (POS)', icon: ShoppingCart }
  ];

  const getInitials = (name) => {
    if (!name) return 'DR';
    return name.substring(0, 2).toUpperCase();
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <PawPrint className="brand-logo" />
        <span className="brand-name">SoftVet</span>
      </div>

      <nav className="sidebar-nav">
        {menuItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              className={`nav-item ${activeTab === item.id ? 'active' : ''}`}
              onClick={() => setActiveTab(item.id)}
            >
              <Icon className="nav-icon" />
              <span className="nav-label">{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <button className="theme-toggle-btn" onClick={toggleTheme} title="Cambiar Tema">
          {theme === 'dark' ? (
            <>
              <Sun className="toggle-icon text-yellow" />
              <span>Modo Claro</span>
            </>
          ) : (
            <>
              <Moon className="toggle-icon" />
              <span>Modo Oscuro</span>
            </>
          )}
        </button>

        {/* User Account / Auth Section */}
        {currentUser ? (
          <div 
            className="user-profile-clickable" 
            onClick={onOpenAuthModal} 
            title="Ver perfil o cambiar de cuenta"
          >
            <div className="user-avatar">
              {getInitials(currentUser.username)}
            </div>
            <div className="user-info">
              <span className="user-name">{currentUser.username}</span>
              <span className="user-role">
                {currentUser.rol === 'ADMIN' ? '🛡️ Admin' : '🩺 Veterinario'}
              </span>
            </div>
            <div className="user-action-indicator">
              <UserCheck size={16} className="text-emerald" />
            </div>
          </div>
        ) : (
          <button 
            className="auth-sidebar-btn" 
            onClick={onOpenAuthModal}
            title="Iniciar sesión o registrar usuario en SoftVet"
          >
            <KeyRound size={16} className="text-sky" />
            <span>Iniciar Sesión / Registro</span>
          </button>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;

