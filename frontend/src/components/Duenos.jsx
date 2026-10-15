import React, { useState, useEffect } from 'react';
// Se agregó 'Users' al import de lucide-react
import { Search, Plus, UserPlus, Users, Phone, MapPin, Eye, PawPrint, ChevronLeft } from 'lucide-react';
import { apiService } from '../services/api';
import './Duenos.css';

const Duenos = ({ activeTab, setActiveTab, setSelectedDuenoIdForNewPet, triggerRefresh, setTriggerRefresh }) => {
  const [duenos, setDuenos] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDueno, setSelectedDueno] = useState(null);

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [newDuenoForm, setNewDuenoForm] = useState({
    nombre: '',
    zona: '',
    telefono: ''
  });
  const [formError, setFormError] = useState('');

  const loadDuenos = async () => {
    try {
      const allDuenos = await apiService.getDuenos();
      // Enriquecer dueños con conteo de mascotas
      const pacientes = await apiService.getPacientes();
      const enrichedDuenos = allDuenos.map(d => {
        const pets = pacientes.filter(p => p.duenoId === d.id);
        return {
          ...d,
          mascotasCount: pets.length
        };
      });
      setDuenos(enrichedDuenos);
    } catch (e) {
      console.error('Error al cargar dueños:', e);
    }
  };

  useEffect(() => {
    loadDuenos();
  }, [triggerRefresh]);

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  const filteredDuenos = duenos.filter(d =>
    d.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.zona.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.telefono.includes(searchTerm)
  );

  const handleViewDetails = async (id) => {
    try {
      const details = await apiService.getDueno(id);
      setSelectedDueno(details);
    } catch (e) {
      console.error('Error al cargar ficha de dueño:', e);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewDuenoForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleAddPet = (duenoId) => {
    setSelectedDuenoIdForNewPet(duenoId);
    setActiveTab('pacientes');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    const { nombre, zona, telefono } = newDuenoForm;
    if (!nombre.trim() || !zona.trim() || !telefono.trim()) {
      setFormError('Todos los campos son obligatorios');
      return;
    }

    try {
      await apiService.createDueno(nombre.trim(), zona.trim(), telefono.trim());
      setShowAddModal(false);
      setNewDuenoForm({ nombre: '', zona: '', telefono: '' });
      setTriggerRefresh(prev => !prev); // Esto ya dispara de forma reactiva el useEffect.
    } catch (error) {
      setFormError('Error al guardar el dueño.');
    }
  };

  if (selectedDueno) {
    return (
      <div className="dueno-details-view">
        <button className="btn btn-secondary back-btn" onClick={() => setSelectedDueno(null)}>
          <ChevronLeft size={16} />
          Volver al Listado
        </button>

        <div className="dueno-profile-card card">
          <div className="profile-header">
            <div className="avatar-large">
              {selectedDueno.nombre.substring(0, 2).toUpperCase()}
            </div>
            <div className="profile-info-primary">
              <h2>{selectedDueno.nombre}</h2>
              <span className="badge badge-info">Cliente Registrado</span>
            </div>
          </div>

          <div className="profile-details-grid">
            <div className="detail-card">
              <MapPin className="detail-icon" />
              <div className="detail-texts">
                <span className="detail-label">Zona / Dirección</span>
                <span className="detail-value">{selectedDueno.zona}</span>
              </div>
            </div>

            <div className="detail-card">
              <Phone className="detail-icon" />
              <div className="detail-texts">
                <span className="detail-label">Teléfono de Contacto</span>
                <span className="detail-value">{selectedDueno.telefono}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="dueno-mascotas-section card">
          <div className="card-header">
            <h3 className="card-title">Mascotas Asociadas</h3>
            <button className="btn btn-primary btn-sm" onClick={() => handleAddPet(selectedDueno.id)}>
              <Plus size={16} />
              Agregar Mascota
            </button>
          </div>

          {selectedDueno.mascotas && selectedDueno.mascotas.length === 0 ? (
            <div className="empty-state">
              <PawPrint className="empty-icon" />
              <p>Este dueño no tiene mascotas registradas aún.</p>
            </div>
          ) : (
            <div className="mascotas-grid">
              {selectedDueno.mascotas?.map((pet) => (
                <div key={pet.id} className="pet-mini-card">
                  <div className="pet-mini-avatar">
                    <PawPrint size={20} />
                  </div>
                  <div className="pet-mini-info">
                    <h4>{pet.nombre}</h4>
                    <p>{pet.sexo} • {pet.edad !== null && pet.edad !== undefined ? `${pet.edad} ${pet.edad === 1 ? 'año' : 'años'}` : 'Edad no registrada'}</p>
                    <span className={`badge ${pet.castrado ? 'badge-success' : 'badge-warning'}`}>
                      {pet.castrado ? 'Castrado' : 'No Castrado'}
                    </span>
                  </div>
                  <button
                    className="btn btn-secondary btn-sm icon-only-btn"
                    onClick={() => {
                      localStorage.setItem('selectedPacienteId', pet.id);
                      setActiveTab('pacientes');
                    }}
                    title="Ver Ficha Mascota"
                  >
                    <Eye size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="duenos-view">
      <div className="view-header">
        <div>
          <h2>Dueños (Propietarios)</h2>
          <p className="subtitle">Gestión de clientes y contactos asociados a las mascotas.</p>
        </div>
        <button className="btn btn-success" onClick={() => setShowAddModal(true)}>
          <UserPlus size={18} />
          Registrar Dueño
        </button>
      </div>

      <div className="card">
        <div className="search-bar-wrapper">
          <div className="search-input-wrapper">
            <Search className="search-icon" size={18} />
            <input
              type="text"
              className="form-input search-input"
              placeholder="Buscar por nombre, zona o teléfono..."
              value={searchTerm}
              onChange={handleSearchChange}
            />
          </div>
        </div>

        {filteredDuenos.length === 0 ? (
          <div className="empty-state">
            <Users className="empty-icon" />
            <p>No se encontraron dueños que coincidan con la búsqueda.</p>
          </div>
        ) : (
          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Zona</th>
                  <th>Teléfono</th>
                  <th>Mascotas</th>
                  <th style={{ width: '150px' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredDuenos.map((dueno) => (
                  <tr key={dueno.id}>
                    <td>
                      <div className="dueno-name-cell">
                        <div className="avatar-small">
                          {dueno.nombre.substring(0, 2).toUpperCase()}
                        </div>
                        <span className="font-semibold">{dueno.nombre}</span>
                      </div>
                    </td>
                    <td>{dueno.zona}</td>
                    <td>{dueno.telefono}</td>
                    <td>
                      <span className="badge badge-info">
                        {dueno.mascotasCount} {dueno.mascotasCount === 1 ? 'mascota' : 'mascotas'}
                      </span>
                    </td>
                    <td>
                      <div className="actions-cell">
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => handleViewDetails(dueno.id)}
                          title="Ver Detalle"
                        >
                          <Eye size={14} />
                          Ficha
                        </button>
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() => handleAddPet(dueno.id)}
                          title="Registrar Mascota"
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Owner Modal */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-body">
              <h3 className="modal-title" style={{ marginBottom: '1.5rem' }}>Registrar Propietario</h3>

              {formError && <div className="alert-message danger-alert">{formError}</div>}

              <form onSubmit={handleSubmit} id="add-dueno-form">
                <div className="form-group">
                  <label className="form-label">Nombre Completo</label>
                  <input
                    type="text"
                    name="nombre"
                    className="form-input"
                    placeholder="Ej. Juan Pérez"
                    value={newDuenoForm.nombre}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Zona / Dirección</label>
                  <input
                    type="text"
                    name="zona"
                    className="form-input"
                    placeholder="Ej. Barrio Norte, Calle Falsa 123"
                    value={newDuenoForm.zona}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Teléfono</label>
                  <input
                    type="tel"
                    name="telefono"
                    className="form-input"
                    placeholder="Ej. 11223344"
                    value={newDuenoForm.telefono}
                    onChange={handleInputChange}
                    required
                  />
                </div>
              </form>
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowAddModal(false)}>
                Cancelar
              </button>
              <button className="btn btn-success" type="submit" form="add-dueno-form">
                Guardar Cliente
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Duenos;