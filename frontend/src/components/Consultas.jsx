import React, { useState, useEffect } from 'react';
import {
  ClipboardList,
  PlusCircle,
  Search,
  Calendar,
  PawPrint,
  Eye,
  AlertCircle,
  FileText,
  Upload,
  X,
  ExternalLink,
  Download
} from 'lucide-react';
import { apiService } from '../services/api';
import './Consultas.css';

const Consultas = ({
  activeTab,
  setActiveTab,
  selectedPacienteForNewConsulta,
  setSelectedPacienteForNewConsulta,
  triggerRefresh,
  setTriggerRefresh
}) => {
  const [consultas, setConsultas] = useState([]);
  const [pacientes, setPacientes] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [subTab, setSubTab] = useState('new'); // new, history

  // Form state
  const [formData, setFormData] = useState({
    pacienteId: '',
    motivo: '',
    anamnesis: '',
    examenClinico: '',
    diagnostico: '',
    pedidoComplementario: '',
    tratamiento: '',
    indicaciones: ''
  });
  const [pdfFile, setPdfFile] = useState(null);
  const [formSuccess, setFormSuccess] = useState(false);
  const [formError, setFormError] = useState('');

  // Detailed view of a consultation from general history
  const [selectedConsulta, setSelectedConsulta] = useState(null);

  const loadData = async () => {
    try {
      const allConsultas = await apiService.getConsultas();
      const allPacientes = await apiService.getPacientes();
      setConsultas(allConsultas);
      setPacientes(allPacientes);
    } catch (e) {
      console.error('Error al cargar datos:', e);
    }
  };

  useEffect(() => {
    loadData();
  }, [triggerRefresh]);

  // Handle pre-selected patient when redirecting from Patients view
  useEffect(() => {
    if (selectedPacienteForNewConsulta) {
      setFormData(prev => ({
        ...prev,
        pacienteId: selectedPacienteForNewConsulta.id.toString()
      }));
      setSubTab('new');
      setSelectedPacienteForNewConsulta(null); // limpiar
    }
  }, [selectedPacienteForNewConsulta]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handlePdfChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      setFormError('El archivo adjunto debe ser en formato PDF (.pdf).');
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      setFormError('El archivo PDF supera el límite de 15 MB.');
      return;
    }

    setFormError('');
    setPdfFile(file);
  };

  const handleRemovePdf = () => {
    setPdfFile(null);
  };

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  const filteredConsultas = consultas.filter(c =>
    c.pacienteNombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.motivo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.diagnostico.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.pdfPath && c.pdfPath.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess(false);

    const {
      pacienteId,
      motivo,
      anamnesis,
      examenClinico,
      diagnostico,
      pedidoComplementario,
      tratamiento,
      indicaciones
    } = formData;

    if (!pacienteId || !motivo.trim() || !anamnesis.trim() || !examenClinico.trim() || !diagnostico.trim() || !tratamiento.trim()) {
      setFormError('Todos los campos excepto "Pedido Complementario" e "Indicaciones" son requeridos.');
      return;
    }

    try {
      await apiService.createConsulta(
        Number(pacienteId),
        motivo.trim(),
        anamnesis.trim(),
        examenClinico.trim(),
        diagnostico.trim(),
        pedidoComplementario.trim() || 'Ninguno',
        tratamiento.trim(),
        indicaciones.trim() || 'Ninguna',
        pdfFile
      );

      setFormSuccess(true);
      setPdfFile(null);
      setFormData({
        pacienteId: '',
        motivo: '',
        anamnesis: '',
        examenClinico: '',
        diagnostico: '',
        pedidoComplementario: '',
        tratamiento: '',
        indicaciones: ''
      });

      // Auto dismiss success alert and go to history tab after 2s
      setTimeout(() => {
        setFormSuccess(false);
        setSubTab('history');
      }, 2000);

      setTriggerRefresh(prev => !prev);
      loadData();
    } catch (err) {
      setFormError(err?.message || 'Error al guardar la consulta médica.');
    }
  };

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

  const openPdfViewer = (url, title) => {
    setPdfModalUrl(url);
    setPdfModalTitle(title || 'Documento PDF Adjunto');
  };

  return (
    <div className="consultas-view">
      <div className="view-header">
        <div>
          <h2>Consultas Médicas</h2>
          <p className="subtitle">Registro de visitas clínicas, diagnóstico, tratamientos y adjuntos PDF.</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs-header-container">
        <button
          className={`tab-btn ${subTab === 'new' ? 'active' : ''}`}
          onClick={() => { setSubTab('new'); setSelectedConsulta(null); }}
        >
          <PlusCircle size={18} />
          Registrar Consulta
        </button>
        <button
          className={`tab-btn ${subTab === 'history' ? 'active' : ''}`}
          onClick={() => { setSubTab('history'); setSelectedConsulta(null); }}
        >
          <ClipboardList size={18} />
          Historial General
        </button>
      </div>

      {/* New Consultation Form Tab */}
      {subTab === 'new' && (
        <div className="card consultations-form-card">
          {formSuccess && (
            <div className="alert-message success-alert">
              ¡Consulta clínica médica registrada exitosamente!
            </div>
          )}

          {formError && (
            <div className="alert-message danger-alert">
              {formError}
            </div>
          )}

          <form onSubmit={handleSubmit} className="consultation-form">
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Paciente / Mascota *</label>
                <select
                  name="pacienteId"
                  className="form-select"
                  value={formData.pacienteId}
                  onChange={handleInputChange}
                  required
                >
                  <option value="">Seleccionar Mascota...</option>
                  {pacientes.map(p => (
                    <option key={p.id} value={p.id}>{p.nombre} ({p.duenoNombre})</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Motivo de Consulta *</label>
                <input
                  type="text"
                  name="motivo"
                  className="form-input"
                  placeholder="Ej. Otitis, Control, Cojera..."
                  value={formData.motivo}
                  onChange={handleInputChange}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Anamnesis * (Historia previa y síntomas descriptos por el dueño)</label>
              <textarea
                name="anamnesis"
                rows="3"
                className="form-textarea"
                placeholder="Ej. El dueño informa que la mascota vomita desde ayer y no quiere comer..."
                value={formData.anamnesis}
                onChange={handleInputChange}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Examen Clínico * (Estado fisiológico y hallazgos en camilla)</label>
              <textarea
                name="examenClinico"
                rows="3"
                className="form-textarea"
                placeholder="Ej. Tº: 39.1C. FC: 120lpm. Mucosas rosadas. Dolor a la palpación abdominal..."
                value={formData.examenClinico}
                onChange={handleInputChange}
                required
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Diagnóstico Presuntivo *</label>
                <input
                  type="text"
                  name="diagnostico"
                  className="form-input"
                  placeholder="Ej. Gastroenteritis infecciosa..."
                  value={formData.diagnostico}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Pedido Complementario (Opcional - Análisis, Radiografía...)</label>
                <input
                  type="text"
                  name="pedidoComplementario"
                  className="form-input"
                  placeholder="Ej. Radiografía abdominal, Hemograma..."
                  value={formData.pedidoComplementario}
                  onChange={handleInputChange}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Tratamiento * (Fármacos administrados e indicaciones iniciales)</label>
              <textarea
                name="tratamiento"
                rows="3"
                className="form-textarea"
                placeholder="Ej. Inyección de metoclopramida 1ml SC. Receta de amoxicilina jarabe..."
                value={formData.tratamiento}
                onChange={handleInputChange}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Indicaciones / Sugerencias para el Dueño</label>
              <textarea
                name="indicaciones"
                rows="2"
                className="form-textarea"
                placeholder="Ej. Dieta líquida por 24hs. Control en 48hs si los síntomas persisten..."
                value={formData.indicaciones}
                onChange={handleInputChange}
              />
            </div>

            {/* Field for attaching PDF files */}
            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <FileText size={16} className="text-tertiary" />
                Adjuntar Archivo PDF (Opcional - Análisis clínicos, Radiografías, Ecografías...)
              </label>

              {!pdfFile ? (
                <div className="pdf-upload-dropzone" onClick={() => document.getElementById('pdf-file-input').click()}>
                  <input
                    id="pdf-file-input"
                    type="file"
                    accept=".pdf,application/pdf"
                    onChange={handlePdfChange}
                    style={{ display: 'none' }}
                  />
                  <Upload size={26} className="upload-icon" />
                  <div className="upload-text">
                    <span className="upload-title">Haga clic aquí para adjuntar un documento PDF</span>
                    <span className="upload-subtitle">Formatos admitidos: .pdf (Máx. 15MB)</span>
                  </div>
                </div>
              ) : (
                <div className="pdf-selected-file">
                  <div className="pdf-file-info">
                    <FileText size={24} className="pdf-icon" />
                    <div className="pdf-file-details">
                      <span className="pdf-file-name">{pdfFile.name}</span>
                      <span className="pdf-file-size">{(pdfFile.size / 1024).toFixed(1)} KB</span>
                    </div>
                  </div>
                  <button type="button" className="btn-remove-pdf" onClick={handleRemovePdf} title="Quitar archivo">
                    <X size={18} />
                  </button>
                </div>
              )}
            </div>

            <div className="form-actions">
              <button className="btn btn-success" type="submit">
                <PlusCircle size={18} />
                Guardar Consulta Médica
              </button>
            </div>
          </form>
        </div>
      )}

      {/* General History Tab */}
      {subTab === 'history' && !selectedConsulta && (
        <div className="card">
          <div className="search-bar-wrapper">
            <div className="search-input-wrapper">
              <Search className="search-icon" size={18} />
              <input
                type="text"
                className="form-input search-input"
                placeholder="Buscar por mascota, motivo, diagnóstico o adjunto..."
                value={searchTerm}
                onChange={handleSearchChange}
              />
            </div>
          </div>

          {filteredConsultas.length === 0 ? (
            <div className="empty-state">
              <ClipboardList className="empty-icon" />
              <p>No se encontraron registros de consultas.</p>
            </div>
          ) : (
            <div className="table-container">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Mascota</th>
                    <th>Motivo</th>
                    <th>Diagnóstico Presuntivo</th>
                    <th>Adjunto PDF</th>
                    <th style={{ width: '120px' }}>Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredConsultas.map((c) => (
                    <tr key={c.id}>
                      <td className="font-semibold text-sm">
                        <div className="date-cell">
                          <Calendar size={14} className="text-tertiary" />
                          {formatDate(c.fecha)}
                        </div>
                      </td>
                      <td>
                        <div className="paciente-name-cell">
                          <div className="avatar-small-pet">
                            <PawPrint size={12} />
                          </div>
                          <span>{c.pacienteNombre}</span>
                        </div>
                      </td>
                      <td>{c.motivo}</td>
                      <td>{c.diagnostico}</td>
                      <td>
                        {c.pdfUrl || c.pdfPath ? (
                          <a
                            href={c.pdfUrl || `/api/consultas/archivos/${c.pdfPath}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="badge-pdf"
                            title="Abrir PDF en nueva pestaña"
                            style={{ textDecoration: 'none' }}
                          >
                            <FileText size={13} />
                            <span>PDF</span>
                            <ExternalLink size={11} style={{ marginLeft: '2px' }} />
                          </a>
                        ) : (
                          <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>-</span>
                        )}
                      </td>
                      <td>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => setSelectedConsulta(c)}
                        >
                          <Eye size={14} />
                          Detalle
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Detailed Consultation View */}
      {subTab === 'history' && selectedConsulta && (
        <div className="consulta-detail-card card">
          <div className="detail-header-row">
            <h3 className="card-title">Detalle de Consulta # {selectedConsulta.id}</h3>
            <button className="btn btn-secondary btn-sm" onClick={() => setSelectedConsulta(null)}>
              Volver al Historial
            </button>
          </div>

          <div className="consulta-metadata">
            <p><strong>Mascota:</strong> {selectedConsulta.pacienteNombre}</p>
            <p><strong>Fecha y Hora:</strong> {formatDate(selectedConsulta.fecha)}</p>
          </div>

          <div className="consulta-full-details">
            <div className="detail-section">
              <h5>Motivo de la Visita</h5>
              <div className="detail-block">{selectedConsulta.motivo}</div>
            </div>

            <div className="detail-section">
              <h5>Anamnesis</h5>
              <div className="detail-block">{selectedConsulta.anamnesis}</div>
            </div>

            <div className="detail-section">
              <h5>Examen Clínico</h5>
              <div className="detail-block">{selectedConsulta.examenClinico}</div>
            </div>

            <div className="detail-grid-two">
              <div className="detail-section">
                <h5>Diagnóstico Presuntivo</h5>
                <div className="detail-block highlight-block">{selectedConsulta.diagnostico}</div>
              </div>
              <div className="detail-section">
                <h5>Pedido Complementario</h5>
                <div className="detail-block">{selectedConsulta.pedidoComplementario || 'Ninguno'}</div>
              </div>
            </div>

            <div className="detail-section">
              <h5>Tratamiento</h5>
              <div className="detail-block success-block">{selectedConsulta.tratamiento}</div>
            </div>

            <div className="detail-section">
              <h5>Indicación / Sugerencia al Propietario</h5>
              <div className="detail-block warning-block">{selectedConsulta.indicaciones || 'Ninguna'}</div>
            </div>

            {/* Attached PDF section */}
            {(selectedConsulta.pdfUrl || selectedConsulta.pdfPath) && (
              <div className="detail-section">
                <h5>Archivo PDF Adjunto</h5>
                <div className="detail-block pdf-attached-block">
                  <div className="pdf-attached-info">
                    <FileText size={32} className="pdf-big-icon" />
                    <div>
                      <div className="pdf-attached-title">
                        {selectedConsulta.pdfPath ? selectedConsulta.pdfPath.replace(/^[a-f0-9-]+_/, '') : 'Documento_Adjunto.pdf'}
                      </div>
                      <div className="pdf-attached-sub">Archivo de estudio / informe clínico en formato PDF</div>
                    </div>
                  </div>
                  <div className="pdf-attached-actions">
                    <a
                      href={selectedConsulta.pdfUrl || `/api/consultas/archivos/${selectedConsulta.pdfPath}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-primary btn-sm"
                    >
                      <ExternalLink size={14} /> Abrir PDF en nueva pestaña
                    </a>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div style={{ marginTop: '1rem', display: 'flex', gap: '1rem' }}>
            <button
              className="btn btn-primary"
              onClick={() => {
                // Ir a la ficha de la mascota
                localStorage.setItem('selectedPacienteId', selectedConsulta.pacienteId);
                setActiveTab('pacientes');
              }}
            >
              Ver Ficha de la Mascota
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Consultas;

