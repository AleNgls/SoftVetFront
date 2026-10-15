import React, { useState } from 'react';
import { 
  Lock, 
  User, 
  Mail, 
  Shield, 
  Eye, 
  EyeOff, 
  LogOut, 
  UserPlus, 
  LogIn, 
  X, 
  CheckCircle2, 
  AlertCircle,
  Stethoscope,
  Sparkles,
  Wifi,
  WifiOff
} from 'lucide-react';
import { apiService } from '../services/api';
import './AuthModal.css';

const AuthModal = ({ isOpen, onClose, currentUser, onLoginSuccess, onLogout }) => {
  const [activeTab, setActiveTab] = useState('login'); // 'login' | 'register'
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Login form state
  const [loginForm, setLoginForm] = useState({
    username: '',
    password: ''
  });

  // Register form state
  const [registerForm, setRegisterForm] = useState({
    username: '',
    email: '',
    password: '',
    rol: 'USER' // 'USER' | 'ADMIN'
  });

  if (!isOpen) return null;

  const handleLoginChange = (e) => {
    const { name, value } = e.target;
    setLoginForm(prev => ({ ...prev, [name]: value }));
  };

  const handleRegisterChange = (e) => {
    const { name, value } = e.target;
    setRegisterForm(prev => ({ ...prev, [name]: value }));
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');
    setLoading(true);

    try {
      const result = await apiService.login(loginForm.username.trim(), loginForm.password);
      setSuccessMessage(result.message || '¡Sesión iniciada con éxito!');
      setTimeout(() => {
        onLoginSuccess(result.user);
        onClose();
      }, 900);
    } catch (err) {
      setErrorMessage(err.message || 'Error al iniciar sesión. Verifique sus credenciales.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');
    setLoading(true);

    try {
      const result = await apiService.register(
        registerForm.username.trim(),
        registerForm.email.trim(),
        registerForm.password,
        registerForm.rol
      );
      setSuccessMessage(result.message || '¡Usuario registrado exitosamente!');
      
      // Auto-iniciar sesión tras registro exitoso
      setTimeout(async () => {
        try {
          const loginRes = await apiService.login(registerForm.username.trim(), registerForm.password);
          onLoginSuccess(loginRes.user);
          onClose();
        } catch {
          // Si auto-login falla, pasar a la pestaña de login
          setActiveTab('login');
          setLoginForm({ username: registerForm.username, password: '' });
          setSuccessMessage('Usuario creado. Por favor ingresa tus credenciales.');
        }
      }, 1000);
    } catch (err) {
      setErrorMessage(err.message || 'Error al registrar el usuario.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async (username, password) => {
    setLoginForm({ username, password });
    setErrorMessage('');
    setSuccessMessage('');
    setLoading(true);
    try {
      const result = await apiService.login(username, password);
      setSuccessMessage(`Ingreso rápido como ${username}`);
      setTimeout(() => {
        onLoginSuccess(result.user);
        onClose();
      }, 600);
    } catch (err) {
      setErrorMessage(err.message || 'Error al realizar el ingreso rápido.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogoutClick = () => {
    apiService.logout();
    onLogout();
    onClose();
  };

  return (
    <div className="modal-overlay auth-modal-overlay" onClick={onClose}>
      <div className="auth-modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="auth-modal-header">
          <div className="auth-header-title">
            <div className="auth-icon-badge">
              <Stethoscope size={22} className="text-sky" />
            </div>
            <div>
              <h3>Gestión de Usuarios</h3>
              <p className="auth-subtitle">Acceso y seguridad para el equipo veterinario</p>
            </div>
          </div>
          <button className="auth-close-btn" onClick={onClose} title="Cerrar ventana">
            <X size={20} />
          </button>
        </div>

        {/* User is already logged in: Profile & Session Card */}
        {currentUser ? (
          <div className="auth-logged-view">
            <div className="auth-profile-card">
              <div className="auth-avatar-large">
                {currentUser.username ? currentUser.username.substring(0, 2).toUpperCase() : 'DR'}
              </div>
              <div className="auth-profile-details">
                <h4>{currentUser.username}</h4>
                <p className="auth-profile-email">{currentUser.email || `${currentUser.username}@softvet.com`}</p>
                <div className="auth-badges-row">
                  <span className={`badge ${currentUser.rol === 'ADMIN' ? 'badge-warning' : 'badge-info'}`}>
                    <Shield size={12} style={{ marginRight: 4 }} />
                    {currentUser.rol === 'ADMIN' ? 'Administrador' : 'Veterinario Clínico'}
                  </span>
                  <span className="badge badge-success">
                    {currentUser.backendAuthenticated ? (
                      <>
                        <Wifi size={12} style={{ marginRight: 4 }} />
                        JWT Token Activo
                      </>
                    ) : (
                      <>
                        <WifiOff size={12} style={{ marginRight: 4 }} />
                        Modo Local
                      </>
                    )}
                  </span>
                </div>
              </div>
            </div>

            <div className="auth-actions-group">
              <button 
                className="btn btn-secondary auth-action-btn"
                onClick={() => {
                  apiService.logout();
                  onLogout();
                  setActiveTab('login');
                }}
              >
                <UserPlus size={16} />
                Cambiar de Cuenta
              </button>
              <button 
                className="btn btn-danger auth-action-btn"
                onClick={handleLogoutClick}
              >
                <LogOut size={16} />
                Cerrar Sesión
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Tab navigation */}
            <div className="auth-tabs-nav">
              <button
                type="button"
                className={`auth-tab-btn ${activeTab === 'login' ? 'active' : ''}`}
                onClick={() => {
                  setActiveTab('login');
                  setErrorMessage('');
                  setSuccessMessage('');
                }}
              >
                <LogIn size={16} />
                Iniciar Sesión
              </button>
              <button
                type="button"
                className={`auth-tab-btn ${activeTab === 'register' ? 'active' : ''}`}
                onClick={() => {
                  setActiveTab('register');
                  setErrorMessage('');
                  setSuccessMessage('');
                }}
              >
                <UserPlus size={16} />
                Registrar Usuario
              </button>
            </div>

            {/* Alert Messages */}
            {errorMessage && (
              <div className="auth-alert error-alert">
                <AlertCircle size={18} />
                <span>{errorMessage}</span>
              </div>
            )}

            {successMessage && (
              <div className="auth-alert success-alert">
                <CheckCircle2 size={18} />
                <span>{successMessage}</span>
              </div>
            )}

            {/* Login Tab */}
            {activeTab === 'login' && (
              <form onSubmit={handleLoginSubmit} className="auth-form">
                <div className="form-group">
                  <label className="form-label">Nombre de Usuario</label>
                  <div className="auth-input-container">
                    <User size={18} className="auth-input-icon" />
                    <input
                      type="text"
                      name="username"
                      className="form-input auth-input"
                      placeholder="Ej. admin o vet_doctor"
                      value={loginForm.username}
                      onChange={handleLoginChange}
                      required
                      autoComplete="username"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Contraseña</label>
                  <div className="auth-input-container">
                    <Lock size={18} className="auth-input-icon" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      className="form-input auth-input password-input"
                      placeholder="Tu contraseña secreta"
                      value={loginForm.password}
                      onChange={handleLoginChange}
                      required
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      className="password-toggle-btn"
                      onClick={() => setShowPassword(!showPassword)}
                      tabIndex="-1"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <button 
                  type="submit" 
                  className="btn btn-primary auth-submit-btn" 
                  disabled={loading}
                >
                  {loading ? (
                    <span className="btn-loading-spinner">Verificando...</span>
                  ) : (
                    <>
                      <LogIn size={18} />
                      Acceder a SoftVet
                    </>
                  )}
                </button>

                {/* Quick test credentials */}
                <div className="auth-quick-access">
                  <span className="quick-access-label">
                    <Sparkles size={14} className="text-amber" />
                    Accesos rápidos de prueba:
                  </span>
                  <div className="quick-buttons-row">
                    <button
                      type="button"
                      className="quick-btn admin"
                      onClick={() => handleQuickLogin('admin', 'password123')}
                    >
                      Admin
                    </button>
                    <button
                      type="button"
                      className="quick-btn doctor"
                      onClick={() => handleQuickLogin('vet_doctor', 'password123')}
                    >
                      Veterinario
                    </button>
                  </div>
                </div>
              </form>
            )}

            {/* Register Tab */}
            {activeTab === 'register' && (
              <form onSubmit={handleRegisterSubmit} className="auth-form">
                <div className="form-group">
                  <label className="form-label">Nombre de Usuario</label>
                  <div className="auth-input-container">
                    <User size={18} className="auth-input-icon" />
                    <input
                      type="text"
                      name="username"
                      className="form-input auth-input"
                      placeholder="Ej. dra_martinez"
                      value={registerForm.username}
                      onChange={handleRegisterChange}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Correo Electrónico</label>
                  <div className="auth-input-container">
                    <Mail size={18} className="auth-input-icon" />
                    <input
                      type="email"
                      name="email"
                      className="form-input auth-input"
                      placeholder="Ej. martinez@clinica.com"
                      value={registerForm.email}
                      onChange={handleRegisterChange}
                      required
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Contraseña</label>
                    <div className="auth-input-container">
                      <Lock size={18} className="auth-input-icon" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        name="password"
                        className="form-input auth-input"
                        placeholder="Mínimo 6 caracteres"
                        value={registerForm.password}
                        onChange={handleRegisterChange}
                        required
                        minLength={4}
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Rol en el Sistema</label>
                    <select
                      name="rol"
                      className="form-select auth-select"
                      value={registerForm.rol}
                      onChange={handleRegisterChange}
                      required
                    >
                      <option value="USER">Veterinario (USER)</option>
                      <option value="ADMIN">Administrador (ADMIN)</option>
                    </select>
                  </div>
                </div>

                <button 
                  type="submit" 
                  className="btn btn-success auth-submit-btn" 
                  disabled={loading}
                >
                  {loading ? (
                    <span className="btn-loading-spinner">Creando usuario...</span>
                  ) : (
                    <>
                      <UserPlus size={18} />
                      Crear Cuenta de Usuario
                    </>
                  )}
                </button>
              </form>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default AuthModal;
