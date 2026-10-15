import React, { useState, useEffect } from 'react';
import { Search, Plus, PawPrint, Eye, PlusCircle, Activity, ChevronLeft, Calendar, ShieldAlert, FileText, ExternalLink } from 'lucide-react';
import { apiService } from '../services/api';
import './Pacientes.css';

// ! Componente principal que gestiona el listado, la ficha médica detallada y el registro de nuevas mascotas (pacientes).
const Pacientes = ({
  activeTab,
  setActiveTab,
  selectedDuenoIdForNewPet,
  setSelectedDuenoIdForNewPet,
  setSelectedPacienteForNewConsulta,
  triggerRefresh,
  setTriggerRefresh
}) => {
  // ! Estado para almacenar el listado completo de todos los pacientes (mascotas) obtenidos desde la API.
  const [pacientes, setPacientes] = useState([]);
  // ! Estado para almacenar la lista de dueños disponibles, utilizada para poblar el selector al registrar una mascota.
  const [duenos, setDuenos] = useState([]);
  // ! Estado para controlar el texto ingresado por el usuario en la barra de búsqueda.
  const [searchTerm, setSearchTerm] = useState('');
  // ! Estado para guardar los datos detallados del paciente seleccionado actualmente para ver su ficha clínica.
  const [selectedPaciente, setSelectedPaciente] = useState(null);
  // ! Estado para almacenar el historial de consultas médicas asociadas específicamente al paciente seleccionado.
  const [pacienteConsultas, setPacienteConsultas] = useState([]);

  // Modal states
  // ! Estado booleano para controlar la visibilidad (apertura y cierre) del modal de registro de nueva mascota.
  const [showAddModal, setShowAddModal] = useState(false);
  // ! Estado para manejar los datos del formulario de creación del nuevo paciente, inicializado con valores por defecto.
  const [newPacienteForm, setNewPacienteForm] = useState({
    nombre: '',
    sexo: 'Macho',
    edad: '',
    castrado: false,
    duenoId: '',
    alergias: 'Ninguna'
  });
  // ! Estado para guardar y mostrar mensajes de error si las validaciones del formulario de registro fallan.
  const [formError, setFormError] = useState('');

  // ! Función asíncrona que solicita a la API las listas completas de pacientes y dueños de forma simultánea.
  const loadData = async () => {
    try {
      const allPacientes = await apiService.getPacientes();
      const allDuenos = await apiService.getDuenos();
      setPacientes(allPacientes);
      setDuenos(allDuenos);
    } catch (e) {
      console.error('Error al cargar datos:', e);
    }
  };

  useEffect(() => {
    loadData();
  }, [triggerRefresh]);

  // Check if we should auto-open a patient profile requested from other views
  useEffect(() => {
    // ! Función interna que verifica en localStorage si existe una petición pendiente para visualizar la ficha de una mascota específica.
    const checkRequestedPaciente = async () => {
      const requestedId = localStorage.getItem('selectedPacienteId');
      if (requestedId && pacientes.length > 0) {
        localStorage.removeItem('selectedPacienteId'); // limpiar
        handleViewDetails(requestedId);
      }
    };
    checkRequestedPaciente();
  }, [pacientes]);

  // Check if we were redirected from Duenos with a preselected Owner ID to add a pet
  useEffect(() => {
    if (selectedDuenoIdForNewPet) {
      setNewPacienteForm(prev => ({
        ...prev,
        duenoId: selectedDuenoIdForNewPet.toString()
      }));
      setShowAddModal(true);
      // Limpiamos la prop para no abrirlo de nuevo al refrescar
      setSelectedDuenoIdForNewPet(null);
    }
  }, [selectedDuenoIdForNewPet]);

  // ! Función manejadora para actualizar el estado del término de búsqueda cada vez que el usuario escribe en el input.
  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  // ! Variable que almacena el subconjunto filtrado de pacientes cuyo nombre, sexo o nombre del dueño coincida con la búsqueda.
  const filteredPacientes = pacientes.filter(p =>
    p.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.sexo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.duenoNombre.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // ! Función asíncrona que obtiene de la API la información completa y el historial de consultas de una mascota para cargar su ficha.
  const handleViewDetails = async (id) => {
    try {
      const details = await apiService.getPaciente(id);
      const consultas = await apiService.getConsultasByPaciente(id);
      setSelectedPaciente(details);
      setPacienteConsultas(consultas);
    } catch (e) {
      console.error('Error al cargar ficha de mascota:', e);
    }
  };

  // ! Función manejadora que actualiza dinámicamente el estado del formulario según el input modificado (soporta texto, select y checkboxes).
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setNewPacienteForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  // ! Función asíncrona para validar los campos del formulario y enviar la petición de creación del nuevo paciente a la API.
  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    const { nombre, sexo, edad, castrado, duenoId, alergias } = newPacienteForm;
    if (!nombre.trim() || !sexo || !edad || !duenoId) {
      setFormError('Todos los campos requeridos son obligatorios');
      return;
    }

    try {
      await apiService.createPaciente(
        nombre.trim(),
        sexo,
        parseFloat(edad),
        castrado,
        Number(duenoId),
        alergias.trim() || 'Ninguna'
      );
      setShowAddModal(false);
      setNewPacienteForm({
        nombre: '',
        sexo: 'Macho',
        edad: '',
        castrado: false,
        duenoId: '',
        alergias: 'Ninguna'
      });
      setTriggerRefresh(prev => !prev);
      loadData();
    } catch (error) {
      setFormError('Error al guardar la mascota. Asegúrate de que el dueño exista.');
    }
  };

  // ! Función que preselecciona la mascota actual para una nueva consulta médica y redirige al usuario a la pestaña de consultas.
  const handleLogConsulta = (paciente) => {
    setSelectedPacienteForNewConsulta(paciente);
    setActiveTab('consultas');
  };

  // ! Función utilitaria que recibe una cadena de fecha y la formatea según el estándar regional de Argentina (dd/mm/aaaa).
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  //Pantalla de muestra de paciente
  if (selectedPaciente) {

    const renderInformacionDueno = () => {
      if (!selectedPaciente?.duenoId) return null;

      const duenoCompleto = duenos.find(d => d.id === selectedPaciente.duenoId);
      if (!duenoCompleto) return <p>Cargando datos del dueño...</p>;

      return (
        <div className="owner-summary-box">
          <h4 className="owner-box-title">Información del Dueño</h4>
          <p><strong>Nombre:</strong> {duenoCompleto.nombre}</p>
          <p><strong>Zona:</strong> {duenoCompleto.zona}</p>
          <p><strong>Teléfono:</strong> {duenoCompleto.telefono}</p>
        </div>
      );
    };
    return (
      <div className="paciente-details-view">
        <button className="btn btn-secondary back-btn" onClick={() => setSelectedPaciente(null)}>
          <ChevronLeft size={16} />
          Volver al Listado
        </button>

        <div className="paciente-profile-grid">
          {/* Ficha Básica */}
          <div className="card basic-info-card">
            <div className="profile-header">
              <div className="avatar-large-pet">
                <PawPrint size={32} />
              </div>
              <div>
                <h2>{selectedPaciente.nombre}</h2>
                <p className="subtitle">{selectedPaciente.sexo} • {selectedPaciente.edad} {selectedPaciente.edad === 1 ? 'año' : 'años'}</p>
              </div>
            </div>

            <div className="pet-details-list">
              <div className="detail-item-row">
                <strong>Castrado:</strong>
                <span className={`badge ${selectedPaciente.castrado ? 'badge-success' : 'badge-warning'}`}>
                  {selectedPaciente.castrado ? 'Sí, Castrado' : 'No Castrado'}
                </span>
              </div>
              <div className="detail-item-row alert-allergies-row">
                <div className="allergies-title">
                  <ShieldAlert size={16} className={selectedPaciente.alergias && selectedPaciente.alergias.toLowerCase() !== 'ninguna' ? 'text-red' : 'text-gray'} />
                  <strong>Alergias:</strong>
                </div>
                <span className={selectedPaciente.alergias && selectedPaciente.alergias.toLowerCase() !== 'ninguna' ? 'text-red font-semibold' : ''}>
                  {selectedPaciente.alergias || 'Ninguna'}
                </span>
              </div>
            </div>

            {/* Información del dueño */}
            {renderInformacionDueno()}

            <button
              className="btn btn-primary log-visit-btn"
              onClick={() => handleLogConsulta(selectedPaciente)}
            >
              <PlusCircle size={18} />
              Registrar Consulta
            </button>
          </div>

          {/* Historial Médico */}
          <div className="card medical-history-card">
            <div className="card-header">
              <h3 className="card-title">Historial Clínico</h3>
            </div>

            {pacienteConsultas.length === 0 ? (
              <div className="empty-state">
                <Activity className="empty-icon" />
                <p>Esta mascota no tiene consultas médicas registradas aún.</p>
              </div>
            ) : (
              <div className="timeline">
                {pacienteConsultas.map((consulta) => (
                  <div key={consulta.id} className="timeline-item">
                    <div className="timeline-dot">
                      <Calendar size={14} />
                    </div>
                    <div className="timeline-content">
                      <div className="timeline-header">
                        <h4>{consulta.motivo}</h4>
                        <span className="timeline-date">{formatDate(consulta.fecha)}</span>
                      </div>

                      <div className="timeline-notes">
                        <p><strong>Anamnesis:</strong> {consulta.anamnesis}</p>
                        <p><strong>Examen Clínico:</strong> {consulta.examenClinico}</p>
                        <p><strong>Diagnóstico:</strong> {consulta.diagnostico || consulta.diagnosticoPresuntivo}</p>
                        {(consulta.pedidoComplementario || consulta.metodoComplementario) && (
                          <p><strong>Pedido Complementario:</strong> {consulta.pedidoComplementario || consulta.metodoComplementario}</p>
                        )}
                        <p><strong>Tratamiento:</strong> {consulta.tratamiento}</p>

                        {(consulta.indicaciones || consulta.sugerencia) && (
                          <div className="suggestion-box">
                            <strong>Indicaciones al dueño:</strong> {consulta.indicaciones || consulta.sugerencia}
                          </div>
                        )}

                        {(consulta.pdfUrl || consulta.pdfPath) && (
                          <div style={{ marginTop: '0.65rem' }}>
                            <a
                              href={consulta.pdfUrl || `/api/consultas/archivos/${consulta.pdfPath}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="badge-pdf"
                              style={{ textDecoration: 'none', display: 'inline-flex', padding: '0.35rem 0.75rem' }}
                            >
                              <FileText size={14} />
                              <span>Ver PDF Adjunto</span>
                              <ExternalLink size={12} style={{ marginLeft: '4px' }} />
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pacientes-view">
      <div className="view-header">
        <div>
          <h2>Pacientes (Mascotas)</h2>
          <p className="subtitle">Listado de mascotas y su historial médico clínico.</p>
        </div>
        <button className="btn btn-success" onClick={() => setShowAddModal(true)}>
          <PawPrint size={18} />
          Registrar Mascota
        </button>
      </div>

      <div className="card">
        <div className="search-bar-wrapper">
          <div className="search-input-wrapper">
            <Search className="search-icon" size={18} />
            <input
              type="text"
              className="form-input search-input"
              placeholder="Buscar por nombre de mascota, sexo o dueño..."
              value={searchTerm}
              onChange={handleSearchChange}
            />
          </div>
        </div>

        {filteredPacientes.length === 0 ? (
          <div className="empty-state">
            <PawPrint className="empty-icon" />
            <p>No se encontraron mascotas en la base de datos.</p>
          </div>
        ) : (
          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Dueño</th>
                  <th>Sexo</th>
                  <th>Edad</th>
                  <th>Castrado</th>
                  <th style={{ width: '170px' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredPacientes.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <div className="paciente-name-cell">
                        <div className="avatar-small-pet">
                          <PawPrint size={14} />
                        </div>
                        <span className="font-semibold">{p.nombre}</span>
                      </div>
                    </td>
                    <td>{p.duenoNombre}</td>
                    <td>{p.sexo}</td>
                    <td>{p.edad} {p.edad === 1 ? 'año' : 'años'}</td>
                    <td>
                      <span className={`badge ${p.castrado ? 'badge-success' : 'badge-warning'}`}>
                        {p.castrado ? 'Sí' : 'No'}
                      </span>
                    </td>
                    <td>
                      <div className="actions-cell">
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => handleViewDetails(p.id)}
                          title="Ficha Médica"
                        >
                          <Eye size={14} />
                          Ficha
                        </button>
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() => handleLogConsulta(p)}
                          title="Nueva Consulta"
                        >
                          <PlusCircle size={14} />
                          Consulta
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

      {/* Add Paciente Modal */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-body">
              <h3 className="modal-title" style={{ marginBottom: '1.5rem' }}>Registrar Mascota</h3>

              {formError && <div className="alert-message danger-alert">{formError}</div>}

              <form onSubmit={handleSubmit} id="add-paciente-form">
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Nombre Mascota</label>
                    <input
                      type="text"
                      name="nombre"
                      className="form-input"
                      placeholder="Ej. Bobby"
                      value={newPacienteForm.nombre}
                      onChange={handleInputChange}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Dueño / Responsable</label>
                    <select
                      name="duenoId"
                      className="form-select"
                      value={newPacienteForm.duenoId}
                      onChange={handleInputChange}
                      required
                    >
                      <option value="">Seleccionar Dueño...</option>
                      {duenos.map(d => (
                        <option key={d.id} value={d.id}>{d.nombre} ({d.zona})</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Sexo</label>
                    <select
                      name="sexo"
                      className="form-select"
                      value={newPacienteForm.sexo}
                      onChange={handleInputChange}
                      required
                    >
                      <option value="Macho">Macho</option>
                      <option value="Hembra">Hembra</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Edad (Años)</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      name="edad"
                      className="form-input"
                      placeholder="Ej. 2.5"
                      value={newPacienteForm.edad}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Alergias</label>
                  <input
                    type="text"
                    name="alergias"
                    className="form-input"
                    placeholder="Ej. Alergia a la amoxicilina, pulgas, ninguna..."
                    value={newPacienteForm.alergias}
                    onChange={handleInputChange}
                  />
                </div>

                <div className="form-group" style={{ marginTop: '0.5rem' }}>
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      name="castrado"
                      className="checkbox-input"
                      checked={newPacienteForm.castrado}
                      onChange={handleInputChange}
                    />
                    Mascota Castrada / Esterilizada
                  </label>
                </div>
              </form>
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowAddModal(false)}>
                Cancelar
              </button>
              <button className="btn btn-success" type="submit" form="add-paciente-form">
                Guardar Mascota
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Pacientes;