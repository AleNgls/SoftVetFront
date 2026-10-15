// Service to handle communication with backend and localStorage fallback
const API_URL = '/api';

// Helper to initialize local storage
const initializeStorage = () => {
  if (!localStorage.getItem('duenos')) {
    localStorage.setItem('duenos', JSON.stringify([]));
  }
  if (!localStorage.getItem('pacientes')) {
    localStorage.setItem('pacientes', JSON.stringify([]));
  }
  if (!localStorage.getItem('consultas')) {
    localStorage.setItem('consultas', JSON.stringify([]));
  }
  if (!localStorage.getItem('productos')) {
    localStorage.setItem('productos', JSON.stringify([
      { id: 1, nombre: 'Vacuna Antirrábica', marca: 'Zoetis', precio: 15000, stock: 25 },
      { id: 2, nombre: 'Desparasitante Interno (Pipeta)', marca: 'Bayer', precio: 8500, stock: 12 },
      { id: 3, nombre: 'Alimento Balanceado Adultos 15kg', marca: 'Royal Canin', precio: 45000, stock: 3 },
      { id: 4, nombre: 'Antibiótico Amoxicilina 250mg', marca: 'Pharmvet', precio: 6200, stock: 0 }
    ]));
  }
  if (!localStorage.getItem('ventas')) {
    localStorage.setItem('ventas', JSON.stringify([]));
  }
  if (!localStorage.getItem('users')) {
    // Default demo users for offline mode
    localStorage.setItem('users', JSON.stringify([
      { username: 'admin', email: 'admin@softvet.com', password: 'password123', rol: 'ADMIN' },
      { username: 'vet_doctor', email: 'doctor@softvet.com', password: 'password123', rol: 'USER' }
    ]));
  }
};

initializeStorage();

// Storage getters/setters
const getLocalData = (key) => JSON.parse(localStorage.getItem(key)) || [];
const setLocalData = (key, data) => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.warn(`localStorage quota excedida al guardar '${key}':`, e);
  }
};

// Token and User session management
export const authStorage = {
  getToken() {
    return localStorage.getItem('softvet_token') || null;
  },
  setToken(token) {
    if (token) {
      localStorage.setItem('softvet_token', token);
    } else {
      localStorage.removeItem('softvet_token');
    }
  },
  removeToken() {
    localStorage.removeItem('softvet_token');
  },
  getUser() {
    const raw = localStorage.getItem('softvet_user');
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  },
  setUser(user) {
    if (user) {
      localStorage.setItem('softvet_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('softvet_user');
    }
  },
  removeUser() {
    localStorage.removeItem('softvet_user');
  },
  getAuthHeaders() {
    const headers = { 'Content-Type': 'application/json' };
    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  }
};

export const apiService = {
  // --- AUTENTICACIÓN Y USUARIOS (/usuarios) ---
  async login(username, password) {
    try {
      const response = await fetch(`${API_URL}/usuarios/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const resData = await response.json();

      if (response.ok && resData) {
        // Backend returns: { status: 200, message: "Inicio de sesión exitoso.", data: { token: "..." } }
        const token = resData.data?.token || resData.token;
        if (token) {
          authStorage.setToken(token);
          
          // Estimar rol o guardar info de usuario autenticado
          const userObj = {
            username,
            email: `${username}@softvet.com`,
            rol: username.toLowerCase().includes('admin') ? 'ADMIN' : 'USER',
            backendAuthenticated: true
          };
          authStorage.setUser(userObj);
          return { success: true, user: userObj, token, message: resData.message || 'Inicio de sesión exitoso' };
        }
      }

      throw new Error(resData.message || 'Credenciales inválidas en el servidor.');
    } catch (e) {
      console.warn('Backend login falló o está offline. Verificando usuarios locales...', e);
      // Fallback local
      const localUsers = getLocalData('users');
      const foundUser = localUsers.find(
        u => (u.username.toLowerCase() === username.toLowerCase() || u.email?.toLowerCase() === username.toLowerCase()) && u.password === password
      );

      if (foundUser) {
        const simulatedToken = `simulated-jwt-${Date.now()}-${foundUser.username}`;
        authStorage.setToken(simulatedToken);
        const userObj = {
          username: foundUser.username,
          email: foundUser.email,
          rol: foundUser.rol || 'USER',
          backendAuthenticated: false
        };
        authStorage.setUser(userObj);
        return {
          success: true,
          user: userObj,
          token: simulatedToken,
          message: 'Sesión iniciada en modo local (sin backend)',
          isOffline: true
        };
      }

      throw new Error(e.message || 'Credenciales incorrectas o usuario no encontrado.');
    }
  },

  async register(username, email, password, rol = 'USER') {
    try {
      const response = await fetch(`${API_URL}/usuarios/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password, rol })
      });

      const resData = await response.json();

      if (response.ok) {
        // También guardamos copia local para consistencia offline
        const localUsers = getLocalData('users');
        if (!localUsers.some(u => u.username.toLowerCase() === username.toLowerCase())) {
          localUsers.push({ username, email, password, rol });
          setLocalData('users', localUsers);
        }
        return { success: true, message: resData.message || 'Usuario registrado correctamente en el backend.' };
      } else {
        throw new Error(resData.message || 'Error al registrar el usuario en el servidor.');
      }
    } catch (e) {
      console.warn('Backend register offline o fallido. Guardando localmente...', e);
      const localUsers = getLocalData('users');
      if (localUsers.some(u => u.username.toLowerCase() === username.toLowerCase() || u.email?.toLowerCase() === email.toLowerCase())) {
        throw new Error('El nombre de usuario o email ya existe localmente.');
      }

      localUsers.push({ username, email, password, rol });
      setLocalData('users', localUsers);

      return {
        success: true,
        message: 'Usuario registrado correctamente en modo local.',
        isOffline: true
      };
    }
  },

  logout() {
    authStorage.removeToken();
    authStorage.removeUser();
  },

  getCurrentUser() {
    return authStorage.getUser();
  },

  // --- DUEÑOS (/duenos) ---
  async getDuenos() {
    try {
      const response = await fetch(`${API_URL}/duenos`, {
        headers: authStorage.getAuthHeaders()
      });
      if (response.ok) {
        const resData = await response.json();
        const rawDuenos = resData.data || resData;
        if (Array.isArray(rawDuenos)) {
          return rawDuenos.map((d, index) => ({
            id: d.id || (index + 1),
            nombre: d.nombre,
            zona: d.zona,
            telefono: d.telefono || '',
            mascotas: d.mascotas || []
          }));
        }
      }
    } catch (e) {
      console.warn('Backend offline o error al obtener dueños. Usando fallback de localStorage.', e);
    }
    return getLocalData('duenos');
  },

  async getDueno(id) {
    try {
      // Como el backend retorna todas las entidades completas con mascotas en GET /duenos,
      // buscamos en la lista fresca de la API
      const todos = await this.getDuenos();
      const encontrado = todos.find(d => Number(d.id) === Number(id));
      if (encontrado) return encontrado;
    } catch (e) {
      console.warn('Fallo al obtener dueño desde la API...', e);
    }
    const duenos = getLocalData('duenos');
    return duenos.find(d => d.id === Number(id)) || null;
  },

  async createDueno(nombre, zona, telefono) {
    try {
      const response = await fetch(`${API_URL}/duenos`, {
        method: 'POST',
        headers: authStorage.getAuthHeaders(),
        body: JSON.stringify({ nombre, zona, telefono })
      });

      const resData = await response.json();
      if (response.ok) {
        return { nombre, zona, telefono, backendSaved: true };
      } else {
        throw new Error(resData.message || 'Error al registrar el dueño en el servidor.');
      }
    } catch (e) {
      console.warn('Error al registrar dueño en el backend. Guardando localmente...', e);
      const duenos = getLocalData('duenos');
      const newId = duenos.length > 0 ? Math.max(...duenos.map(d => d.id)) + 1 : 1;
      const newDueno = { id: newId, nombre, zona, telefono, mascotas: [] };
      duenos.push(newDueno);
      setLocalData('duenos', duenos);
      return { ...newDueno, backendSaved: false };
    }
  },

  // --- PACIENTES (/pacientes) ---
  async getPacientes() {
    let apiPacientes = [];
    try {
      const response = await fetch(`${API_URL}/pacientes`, {
        headers: authStorage.getAuthHeaders()
      });
      if (response.ok) {
        const resData = await response.json();
        if (resData.status === 200 && Array.isArray(resData.data)) {
          apiPacientes = resData.data;
        } else if (Array.isArray(resData)) {
          apiPacientes = resData;
        }
      }
    } catch (e) {
      console.error('Error al obtener pacientes del backend. Usando fallback local.', e);
      return getLocalData('pacientes');
    }

    if (apiPacientes.length > 0) {
      return apiPacientes.map(p => ({
        id: p.id,
        nombre: p.nombre,
        sexo: p.sexo,
        edad: p.edad,
        castrado: p.castrado,
        alergias: p.alergias || 'Ninguna',
        duenoId: p.duenoId,
        duenoNombre: p.duenoNombre || 'Desconocido'
      }));
    }

    return getLocalData('pacientes');
  },

  async getPaciente(id) {
    try {
      const response = await fetch(`${API_URL}/pacientes/${id}`, {
        headers: authStorage.getAuthHeaders()
      });
      if (response.ok) {
        const resData = await response.json();
        const apiPaciente = resData.data || resData;
        if (apiPaciente) {
          return {
            id: apiPaciente.id,
            nombre: apiPaciente.nombre,
            sexo: apiPaciente.sexo,
            edad: apiPaciente.edad,
            castrado: apiPaciente.castrado,
            alergias: apiPaciente.alergias || 'Ninguna',
            duenoId: apiPaciente.duenoId,
            duenoNombre: apiPaciente.duenoNombre
          };
        }
      }
    } catch (e) {
      console.warn('Backend offline o error al buscar paciente. Usando fallback de localStorage.', e);
    }

    const pacientes = getLocalData('pacientes');
    const paciente = pacientes.find(p => p.id === Number(id));
    if (!paciente) throw new Error('Paciente no encontrado');

    return paciente;
  },

  async createPaciente(nombre, sexo, edad, castrado, duenoId, allergies = 'Ninguna') {
    const pacientes = getLocalData('pacientes');
    const newId = pacientes.length > 0 ? Math.max(...pacientes.map(p => p.id)) + 1 : 1;
    const newPaciente = {
      id: newId,
      nombre,
      sexo,
      edad: parseFloat(edad),
      castrado: Boolean(castrado),
      duenoId: Number(duenoId),
      alergias: allergies
    };

    let backendSaved = false;
    try {
      const response = await fetch(`${API_URL}/pacientes`, {
        method: 'POST',
        headers: authStorage.getAuthHeaders(),
        body: JSON.stringify({
          nombre,
          sexo,
          edad: parseFloat(edad),
          castrado: Boolean(castrado),
          duenoId: Number(duenoId)
        })
      });

      if (response.ok) {
        console.log('Paciente guardado exitosamente en el backend');
        backendSaved = true;
      }
    } catch (e) {
      console.warn('Backend offline. Guardado únicamente en localStorage local.', e);
    }

    pacientes.push(newPaciente);
    setLocalData('pacientes', pacientes);

    return { ...newPaciente, backendSaved };
  },

  // --- CONSULTAS (/consultas y /consultas/paciente/{pacienteId}) ---
  async getConsultas() {
    let listaConsultas = [];
    try {
      const response = await fetch(`${API_URL}/consultas`, {
        headers: authStorage.getAuthHeaders()
      });
      if (response.ok) {
        const resData = await response.json();
        listaConsultas = Array.isArray(resData) ? resData : (resData.data || []);

        if (listaConsultas.length > 0) {
          return listaConsultas.map(c => ({
            id: c.id,
            pacienteId: c.pacienteId || (c.paciente ? c.paciente.id : null),
            pacienteNombre: c.pacienteNombre || (c.paciente ? c.paciente.nombre : 'Desconocido'),
            fecha: c.fechaConsulta || c.fecha || new Date().toISOString(),
            motivo: c.motivo || '',
            anamnesis: c.anamnesis || '',
            examenClinico: c.examenClinico || '',
            diagnostico: c.diagnostico || '',
            pedidoComplementario: c.pedidoComplementario || '',
            tratamiento: c.tratamiento || '',
            indicaciones: c.indicaciones || '',
            pdfPath: c.pdfPath || null,
            pdfUrl: c.pdfPath ? `${API_URL}/consultas/archivos/${c.pdfPath}` : (c.pdfDataUrl || c.pdfUrl || null)
          })).sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
        }
      }
    } catch (e) {
      console.error('Error al obtener consultas del backend. Trayendo locales.', e);
    }

    // Fallback de localStorage corrigiendo las referencias vacías
    const localConsultas = getLocalData('consultas');
    const localPacientes = getLocalData('pacientes');

    return localConsultas.map(c => {
      const pac = localPacientes.find(p => p.id === c.pacienteId);
      return {
        ...c,
        pacienteNombre: pac ? pac.nombre : (c.pacienteNombre || 'Desconocido'),
        diagnostico: c.diagnostico || c.diagnosticoPresuntivo || '',
        pedidoComplementario: c.pedidoComplementario || c.metodoComplementario || '',
        indicaciones: c.indicaciones || c.sugerencia || '',
        pdfPath: c.pdfPath || null,
        pdfUrl: c.pdfPath ? `${API_URL}/consultas/archivos/${c.pdfPath}` : (c.pdfDataUrl || c.pdfUrl || null)
      };
    }).sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
  },

  async getConsultasByPaciente(pacienteId) {
    try {
      const todas = await this.getConsultas();
      if (todas && todas.length > 0) {
        return todas.filter(c => (Number(c.pacienteId) === Number(pacienteId)));
      }
    } catch (e) {
      console.warn("Fallo al filtrar consultas desde la API, usando localStorage...");
    }

    const consultas = getLocalData('consultas');
    return consultas
      .filter(c => Number(c.pacienteId) === Number(pacienteId))
      .map(c => ({
        ...c,
        pdfUrl: c.pdfPath ? `${API_URL}/consultas/archivos/${c.pdfPath}` : (c.pdfDataUrl || c.pdfUrl || null)
      }))
      .sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
  },

  async createConsulta(pacienteId, motivo, anamnesis, examenClinico, diagnostico, pedidoComplementario, tratamiento, indicaciones, pdfFile = null) {
    const datosConsulta = {
      motivo,
      anamnesis,
      examenClinico,
      diagnostico,
      pedidoComplementario,
      tratamiento,
      indicaciones
    };

    let backendSaved = false;
    let consultaRetorno = null;
    let createdPdfPath = null;

    try {
      // Usar FormData para enviar Multipart: @RequestPart("consulta") + @RequestPart("pdf")
      const formData = new FormData();
      const jsonBlob = new Blob([JSON.stringify(datosConsulta)], { type: 'application/json' });
      formData.append('consulta', jsonBlob);

      if (pdfFile) {
        formData.append('pdf', pdfFile);
      }

      const headers = {};
      const token = authStorage.getToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`${API_URL}/consultas/paciente/${pacienteId}`, {
        method: 'POST',
        headers,
        body: formData
      });

      if (response.ok) {
        console.log('Consulta guardada con éxito en el Backend.');
        const resData = await response.json().catch(() => null);
        if (resData && resData.data && resData.data.pdfPath) {
          createdPdfPath = resData.data.pdfPath;
        }
        backendSaved = true;
      } else {
        const errData = await response.json().catch(() => null);
        throw new Error(errData?.message || 'Error al procesar la solicitud en el servidor.');
      }
    } catch (e) {
      console.warn('Backend offline o error al crear consulta en servidor.', e);
      if (e.message && e.message.includes('Error al procesar')) {
        throw e;
      }
    }

    // Convertir a DataURL local ÚNICAMENTE si el backend NO guardó la consulta y el PDF es de tamaño modesto (< 2MB)
    let pdfDataUrl = null;
    if (!backendSaved && pdfFile && pdfFile.size <= 2 * 1024 * 1024) {
      try {
        pdfDataUrl = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target.result);
          reader.onerror = () => resolve(null);
          reader.readAsDataURL(pdfFile);
        });
      } catch (err) {
        console.warn('Error convirtiendo archivo PDF local:', err);
      }
    }

    // Guardar en localStorage para respaldo y sincronización local sin saturar espacio (QuotaExceededError)
    try {
      const consultas = getLocalData('consultas');
      const newId = consultas.length > 0 ? Math.max(...consultas.map(c => c.id)) + 1 : 1;

      consultaRetorno = {
        id: newId,
        pacienteId: Number(pacienteId),
        fecha: new Date().toISOString(),
        ...datosConsulta,
        pdfPath: createdPdfPath || (pdfFile ? pdfFile.name : null),
        pdfDataUrl: backendSaved ? null : pdfDataUrl,
        pdfUrl: createdPdfPath ? `${API_URL}/consultas/archivos/${createdPdfPath}` : (pdfDataUrl || null),
        backendSaved
      };

      consultas.push(consultaRetorno);
      setLocalData('consultas', consultas);
    } catch (storageErr) {
      console.warn('No se pudo actualizar localStorage (cuota excedida).', storageErr);
    }

    return consultaRetorno;
  },

  // --- PRODUCTOS (/productos) ---
  async getProductos() {
    try {
      const response = await fetch(`${API_URL}/productos`, {
        headers: authStorage.getAuthHeaders()
      });
      if (response.ok) {
        const resData = await response.json();
        const rawProds = resData.data || resData;
        if (Array.isArray(rawProds)) {
          return rawProds.map((p, index) => ({
            id: p.id || (index + 1),
            nombre: p.nombre,
            marca: p.marca || 'Genérico',
            precio: parseFloat(p.precio || 0),
            stock: parseInt(p.stock || 0, 10)
          }));
        }
      }
    } catch (e) {
      console.warn('Backend offline o error al obtener productos. Usando fallback de localStorage.', e);
    }
    return getLocalData('productos');
  },

  async searchProductosByNombre(nombre) {
    try {
      const response = await fetch(`${API_URL}/productos?nombre=${encodeURIComponent(nombre)}`, {
        headers: authStorage.getAuthHeaders()
      });
      if (response.ok) {
        const resData = await response.json();
        const rawProds = resData.data || resData;
        if (Array.isArray(rawProds)) return rawProds;
      }
    } catch (e) {
      console.warn('Backend offline al buscar por nombre. Filtrando localmente...', e);
    }
    const prods = getLocalData('productos');
    return prods.filter(p => p.nombre.toLowerCase().includes(nombre.toLowerCase()));
  },

  async searchProductosByMarca(marca) {
    try {
      const response = await fetch(`${API_URL}/productos?marca=${encodeURIComponent(marca)}`, {
        headers: authStorage.getAuthHeaders()
      });
      if (response.ok) {
        const resData = await response.json();
        const rawProds = resData.data || resData;
        if (Array.isArray(rawProds)) return rawProds;
      }
    } catch (e) {
      console.warn('Backend offline al buscar por marca. Filtrando localmente...', e);
    }
    const prods = getLocalData('productos');
    return prods.filter(p => p.marca.toLowerCase().includes(marca.toLowerCase()));
  },

  async createProducto(nombre, marca, precio, stock) {
    const payload = {
      nombre,
      marca: marca || 'Genérico',
      precio: parseFloat(precio),
      stock: parseInt(stock, 10)
    };

    let backendSaved = false;
    let resMsg = '';

    try {
      const response = await fetch(`${API_URL}/productos`, {
        method: 'POST',
        headers: authStorage.getAuthHeaders(),
        body: JSON.stringify(payload)
      });

      const resData = await response.json();

      if (response.ok) {
        backendSaved = true;
        resMsg = resData.message || 'Producto registrado correctamente.';
      } else {
        throw new Error(resData.message || 'Error al registrar el producto en el servidor.');
      }
    } catch (e) {
      console.warn('Backend offline o error al crear producto. Guardando localmente...', e);
      if (e.message && e.message.includes('403') || e.message.includes('Acceso denegado')) {
        throw e;
      }
      resMsg = 'Producto guardado en modo local (offline).';
    }

    // Actualizar copia en localStorage para sincronía instantánea
    const prods = getLocalData('productos');
    const newId = prods.length > 0 ? Math.max(...prods.map(p => p.id)) + 1 : 1;
    const newProducto = { id: newId, ...payload, backendSaved };
    prods.push(newProducto);
    setLocalData('productos', prods);

    return { success: true, message: resMsg, producto: newProducto };
  },

  async deleteProducto(id) {
    let backendSaved = false;
    let resMsg = '';

    try {
      const response = await fetch(`${API_URL}/productos?id=${id}`, {
        method: 'DELETE',
        headers: authStorage.getAuthHeaders()
      });

      const resData = await response.json();

      if (response.ok) {
        backendSaved = true;
        resMsg = resData.message || 'Producto eliminado correctamente.';
      } else {
        throw new Error(resData.message || 'Error al eliminar el producto en el servidor.');
      }
    } catch (e) {
      console.warn('Backend offline o error al eliminar producto. Eliminando localmente...', e);
      resMsg = 'Producto eliminado en modo local (offline).';
    }

    const prods = getLocalData('productos');
    const filtered = prods.filter(p => Number(p.id) !== Number(id));
    setLocalData('productos', filtered);

    return { success: true, message: resMsg };
  },

  // --- VENTAS (/ventas) ---
  async getVentas() {
    try {
      const response = await fetch(`${API_URL}/ventas`, {
        headers: authStorage.getAuthHeaders()
      });
      if (response.ok) {
        const resData = await response.json();
        const rawVentas = resData.data || resData;
        if (Array.isArray(rawVentas)) {
          return rawVentas.map(v => ({
            id: v.id,
            cantProductos: parseFloat(v.cantProductos || 0),
            total: parseFloat(v.total || 0),
            detalles: (v.detalles || []).map(d => ({
              nombreProducto: d.nombreProducto,
              cantidad: parseFloat(d.cantidad || 0),
              precioUnitario: parseFloat(d.precioUnitario || 0),
              subtotal: parseFloat(d.subtotal || (d.cantidad * d.precioUnitario))
            }))
          })).sort((a, b) => b.id - a.id);
        }
      }
    } catch (e) {
      console.warn('Backend offline o error al obtener ventas. Usando fallback de localStorage.', e);
    }
    return getLocalData('ventas').sort((a, b) => b.id - a.id);
  },

  async createVenta(detalles) {
    const payload = { detalles };

    let backendSaved = false;
    let resMsg = '';

    try {
      const response = await fetch(`${API_URL}/ventas`, {
        method: 'POST',
        headers: authStorage.getAuthHeaders(),
        body: JSON.stringify(payload)
      });

      const resData = await response.json();

      if (response.ok) {
        backendSaved = true;
        resMsg = resData.message || 'Venta registrada correctamente.';
      } else {
        throw new Error(resData.message || 'Error al registrar la venta en el servidor.');
      }
    } catch (e) {
      console.warn('Backend offline o error al registrar venta. Guardando localmente...', e);
      if (e.message && (e.message.includes('403') || e.message.includes('Acceso denegado'))) {
        throw e;
      }
      resMsg = 'Venta guardada en modo local (offline).';
    }

    const prods = getLocalData('productos');
    const ventas = getLocalData('ventas');
    const newId = ventas.length > 0 ? Math.max(...ventas.map(v => v.id)) + 1 : 1;

    let totalVenta = 0;
    let cantProductosVenta = 0;
    const detallesProcesados = [];

    detalles.forEach(d => {
      const prod = prods.find(p => Number(p.id) === Number(d.productoId));
      const nombreProducto = prod ? prod.nombre : `Producto #${d.productoId}`;
      const precioUnitario = prod ? parseFloat(prod.precio) : 0;
      const cantidad = parseInt(d.cantidad, 10);
      const subtotal = cantidad * precioUnitario;

      totalVenta += subtotal;
      cantProductosVenta += cantidad;

      detallesProcesados.push({
        nombreProducto,
        cantidad,
        precioUnitario,
        subtotal
      });

      if (prod) {
        prod.stock = Math.max(0, prod.stock - cantidad);
      }
    });

    setLocalData('productos', prods);

    const nuevaVenta = {
      id: newId,
      cantProductos: cantProductosVenta,
      total: totalVenta,
      detalles: detallesProcesados,
      fecha: new Date().toISOString(),
      backendSaved
    };

    ventas.push(nuevaVenta);
    setLocalData('ventas', ventas);

    return { success: true, message: resMsg, venta: nuevaVenta };
  }
};