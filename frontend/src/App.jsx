import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import Duenos from './components/Duenos';
import Pacientes from './components/Pacientes';
import Consultas from './components/Consultas';
import Productos from './components/Productos';
import Ventas from './components/Ventas';
import AuthModal from './components/AuthModal';
import { apiService } from './services/api';

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('theme') || 'light';
  });
  
  // Authentication state
  const [currentUser, setCurrentUser] = useState(() => apiService.getCurrentUser());
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // Navigation communication states
  const [selectedDuenoIdForNewPet, setSelectedDuenoIdForNewPet] = useState(null);
  const [selectedPacienteForNewConsulta, setSelectedPacienteForNewConsulta] = useState(null);
  const [triggerRefresh, setTriggerRefresh] = useState(false);

  // Toast notification state
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 3500);
  };

  // Sync theme with HTML attribute and localStorage
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
  };

  const handleLoginSuccess = (user) => {
    setCurrentUser(user);
    showToast(`¡Bienvenido/a, ${user.username}!`, 'success');
    setTriggerRefresh(prev => !prev);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    showToast('Sesión cerrada correctamente.', 'info');
    setTriggerRefresh(prev => !prev);
  };

  return (
    <div className="app-container">
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        theme={theme} 
        toggleTheme={toggleTheme}
        currentUser={currentUser}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
      />
      
      <main className="main-content">
        {/* Toast feedback message */}
        {toast && (
          <div className={`toast-notification toast-${toast.type}`}>
            <span>{toast.message}</span>
          </div>
        )}

        {activeTab === 'dashboard' && (
          <Dashboard 
            setActiveTab={setActiveTab} 
            triggerRefresh={triggerRefresh}
            currentUser={currentUser}
            onOpenAuthModal={() => setIsAuthModalOpen(true)}
          />
        )}
        
        {activeTab === 'duenos' && (
          <Duenos 
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            setSelectedDuenoIdForNewPet={setSelectedDuenoIdForNewPet}
            triggerRefresh={triggerRefresh}
            setTriggerRefresh={setTriggerRefresh}
          />
        )}
        
        {activeTab === 'pacientes' && (
          <Pacientes 
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            selectedDuenoIdForNewPet={selectedDuenoIdForNewPet}
            setSelectedDuenoIdForNewPet={setSelectedDuenoIdForNewPet}
            setSelectedPacienteForNewConsulta={setSelectedPacienteForNewConsulta}
            triggerRefresh={triggerRefresh}
            setTriggerRefresh={setTriggerRefresh}
          />
        )}
        
        {activeTab === 'consultas' && (
          <Consultas 
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            selectedPacienteForNewConsulta={selectedPacienteForNewConsulta}
            setSelectedPacienteForNewConsulta={setSelectedPacienteForNewConsulta}
            triggerRefresh={triggerRefresh}
            setTriggerRefresh={setTriggerRefresh}
          />
        )}

        {activeTab === 'productos' && (
          <Productos 
            currentUser={currentUser}
            onOpenAuthModal={() => setIsAuthModalOpen(true)}
            triggerRefresh={triggerRefresh}
            setTriggerRefresh={setTriggerRefresh}
          />
        )}

        {activeTab === 'ventas' && (
          <Ventas 
            currentUser={currentUser}
            onOpenAuthModal={() => setIsAuthModalOpen(true)}
            triggerRefresh={triggerRefresh}
            setTriggerRefresh={setTriggerRefresh}
          />
        )}
      </main>

      {/* Global Authentication Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        currentUser={currentUser}
        onLoginSuccess={handleLoginSuccess}
        onLogout={handleLogout}
      />
    </div>
  );
}

export default App;

