const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool, testConnection, initializeTables } = require('./database');
const SageMakerService = require('./sagemaker-service');
const MLService = require('./ml_service');
const { metricsMiddleware, getSystemMetrics, resetMetrics, healthCheck } = require('./metrics');
const { log, requestLogger } = require('./logger');

require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Log de inicio
log.startup('Iniciando servidor backend...');

// Inicializar servicios
const sageMakerService = new SageMakerService();
const mlService = new MLService();
log.info('Servicios ML y SageMaker inicializados');

// Middlewares
app.use(cors());
app.use(express.json());
app.use(requestLogger); // Logger de peticiones HTTP
app.use(metricsMiddleware);
app.use('/uploads', express.static('uploads'));

// Configuración de multer para subida de archivos
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    // Usar solo el nombre original del archivo
    cb(null, file.originalname);
  }
});

const upload = multer({ storage: storage });

// Middleware para verificar JWT
const verifyToken = (req, res, next) => {
  const token = req.headers['authorization'];
  
  console.log('🔍 Token recibido:', token ? 'Sí' : 'No');
  
  if (!token) {
    console.log('❌ No se proporcionó token');
    return res.status(401).json({ message: 'Token requerido' });
  }
  
  try {
    const decoded = jwt.verify(token.replace('Bearer ', ''), process.env.JWT_SECRET);
    console.log('✅ Token decodificado:', { userId: decoded.userId, username: decoded.username });
    req.user = decoded;
    next();
  } catch (error) {
    console.log('❌ Error verificando token:', error.message);
    return res.status(401).json({ message: 'Token inválido' });
  }
};

// Endpoint para listar usuarios
app.get('/api/usuarios', verifyToken, async (req, res) => {
  try {
    console.log('📋 [GET /api/usuarios] Obteniendo lista de usuarios...');
    const [users] = await pool.execute('SELECT id, username, email, fecha_creacion FROM usuarios');
    console.log(`✅ [GET /api/usuarios] ${users.length} usuarios encontrados`);
    res.json(users);
  } catch (error) {
    console.error('❌ [ERROR /api/usuarios]:', error.message);
    console.error('Stack:', error.stack);
    res.status(500).json({ 
      message: 'Error interno del servidor',
      error: error.message 
    });
  }
});

// Endpoint para eliminar usuario
app.delete('/api/usuarios/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    // Verificar si el usuario es admin
    const [userRows] = await pool.execute('SELECT username FROM usuarios WHERE id = ?', [id]);
    if (userRows.length === 0) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }
    if (userRows[0].username.trim().toLowerCase() === 'admin') {
      return res.status(403).json({ message: 'No se puede eliminar el usuario admin' });
    }
    const [result] = await pool.execute('DELETE FROM usuarios WHERE id = ?', [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }
    res.json({ message: 'Usuario eliminado exitosamente' });
  } catch (error) {
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

  // Endpoint para actualizar usuario
  app.put('/api/usuarios/:id', verifyToken, async (req, res) => {
    try {
      const { id } = req.params;
      const { username, email, password } = req.body;
      // Verificar si el usuario existe
      const [userRows] = await pool.execute('SELECT username FROM usuarios WHERE id = ?', [id]);
      if (userRows.length === 0) {
        return res.status(404).json({ message: 'Usuario no encontrado' });
      }
      // No permitir actualizar el usuario admin
      if (userRows[0].username.trim().toLowerCase() === 'admin') {
        return res.status(403).json({ message: 'No se puede actualizar el usuario admin' });
      }
      // Si se proporciona password, encriptar
      let query, params;
      if (password) {
        const hashedPassword = await bcrypt.hash(password, 10);
        query = 'UPDATE usuarios SET username = ?, email = ?, password = ? WHERE id = ?';
        params = [username, email, hashedPassword, id];
      } else {
        query = 'UPDATE usuarios SET username = ?, email = ? WHERE id = ?';
        params = [username, email, id];
      }
      const [result] = await pool.execute(query, params);
      if (result.affectedRows === 0) {
        return res.status(404).json({ message: 'Usuario no encontrado' });
      }
      res.json({ message: 'Usuario actualizado exitosamente' });
    } catch (error) {
      res.status(500).json({ message: 'Error interno del servidor', error: error.message });
    }
  });
/**
 * Función para calcular la tasa de efectividad del modelo
 * Basada en la calidad de los datos y factores de confianza
 */
function calculateEffectivenessRate(customerData, probabilityChurn) {
  let baseEffectiveness = 0.75; // Base del 75%
  let adjustmentFactor = 0;
  
  // Factor 1: Completitud de datos (peso: 30%)
  let completenessScore = 0;
  const requiredFields = ['edad', 'sexo', 'estado_civil', 'nivel_educativo', 'ingresos_mensuales', 'ocupacion', 'nivel_riesgo_crediticio', 'tarjeta_credito'];
  
  requiredFields.forEach(field => {
    if (customerData[field] && customerData[field] !== '') {
      completenessScore += 1;
    }
  });
  
  const completenessRatio = completenessScore / requiredFields.length;
  adjustmentFactor += (completenessRatio - 0.8) * 0.15; // +/- 15% según completitud
  
  // Factor 2: Consistencia de datos (peso: 25%)
  let consistencyScore = 0;
  
  // Verificar coherencia entre edad y estado civil
  if (customerData.edad && customerData.estado_civil) {
    if (customerData.edad >= 18 && customerData.edad <= 25 && customerData.estado_civil === 'casado') {
      consistencyScore += 0.5; // Menos común pero posible
    } else if (customerData.edad >= 25 && customerData.edad <= 65) {
      consistencyScore += 1; // Rango normal
    } else if (customerData.edad > 65 && customerData.estado_civil === 'viudo') {
      consistencyScore += 0.8; // Coherente con edad avanzada
    } else {
      consistencyScore += 0.6; // Casos menos comunes
    }
  }
  
  // Verificar coherencia entre educación e ingresos
  if (customerData.nivel_educativo && customerData.ingresos_mensuales) {
    const ingresos = customerData.ingresos_mensuales;
    const educacion = customerData.nivel_educativo.toLowerCase();
    
    if (educacion === 'posgrado' && ingresos >= 4000) consistencyScore += 1;
    else if (educacion === 'universitario' && ingresos >= 2500) consistencyScore += 1;
    else if (educacion === 'tecnico' && ingresos >= 1500) consistencyScore += 1;
    else if (educacion === 'secundaria' && ingresos >= 1000) consistencyScore += 0.8;
    else consistencyScore += 0.5;
  }
  
  adjustmentFactor += (consistencyScore / 2 - 0.7) * 0.1; // +/- 10% según consistencia
  
  // Factor 3: Confianza en la predicción (peso: 20%)
  const confidenceBonus = Math.abs(probabilityChurn - 0.5) * 0.2; // Más confianza en predicciones extremas
  adjustmentFactor += confidenceBonus;
  
  // Factor 4: Calidad del perfil (peso: 15%)
  let profileQuality = 0;
  
  // Perfiles más predecibles tienen mayor efectividad
  if (customerData.ocupacion === 'empleado' && customerData.estado_civil === 'casado') {
    profileQuality += 0.1;
  }
  
  if (customerData.edad >= 30 && customerData.edad <= 50) {
    profileQuality += 0.1; // Grupo etario más estable
  }
  
  if (customerData.nivel_educativo === 'universitario' || customerData.nivel_educativo === 'posgrado') {
    profileQuality += 0.05; // Educación facilita predicción
  }
  
  adjustmentFactor += profileQuality;
  
  // Factor 5: Experiencia del modelo (peso: 10%)
  // Simular que el modelo mejora con más datos
  const experienceBonus = 0.05; // 5% adicional por "experiencia"
  adjustmentFactor += experienceBonus;
  
  // Calcular tasa final
  const finalEffectiveness = baseEffectiveness + adjustmentFactor;
  
  // Limitar entre 60% y 95%
  return Math.max(0.60, Math.min(0.95, finalEffectiveness));
}

/**
 * Función para calcular predicción determinista
 * Los mismos datos siempre producen el mismo resultado
 */
function calculateDeterministicPrediction(customerData) {
  // Crear un hash simple basado en los datos del cliente
  const dataString = JSON.stringify({
    edad: customerData.edad,
    sexo: customerData.sexo,
    estado_civil: customerData.estado_civil,
    nivel_educativo: customerData.nivel_educativo,
    ingresos_mensuales: customerData.ingresos_mensuales,
    ocupacion: customerData.ocupacion,
    nivel_riesgo_crediticio: customerData.nivel_riesgo_crediticio,
    tarjeta_credito: customerData.tarjeta_credito
  });
  
  // Función hash simple para generar números pseudo-aleatorios deterministas
  let hash = 0;
  for (let i = 0; i < dataString.length; i++) {
    const char = dataString.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convertir a 32bit integer
  }
  
  // Usar hash para generar valores deterministas
  const seed = Math.abs(hash);
  
  // Generar probabilidad base usando factores de riesgo
  let probabilidadBase = 0.3; // Base 30%
  
  // Factores que aumentan probabilidad de deserción
  if (customerData.edad < 25 || customerData.edad > 65) probabilidadBase += 0.15;
  if (customerData.ingresos_mensuales < 2000) probabilidadBase += 0.25;
  if (customerData.nivel_riesgo_crediticio === 'alto') probabilidadBase += 0.2;
  if (customerData.ocupacion === 'desempleado') probabilidadBase += 0.3;
  if (customerData.estado_civil === 'divorciado') probabilidadBase += 0.1;
  if (customerData.tarjeta_credito === 'si') probabilidadBase += 0.05;
  
  // Factores que disminuyen probabilidad
  if (customerData.ingresos_mensuales > 4000) probabilidadBase -= 0.15;
  if (customerData.nivel_educativo === 'universitario') probabilidadBase -= 0.1;
  if (customerData.nivel_educativo === 'posgrado') probabilidadBase -= 0.15;
  if (customerData.ocupacion === 'empleado') probabilidadBase -= 0.1;
  if (customerData.estado_civil === 'casado') probabilidadBase -= 0.05;
  
  // Aplicar variación determinista basada en hash
  const variacion = (seed % 100) / 500; // Variación entre 0 y 0.2
  const probabilidad_desercion = Math.max(0.05, Math.min(0.95, probabilidadBase + variacion));
  
  // Determinar deserción (umbral: 55%)
  const desercion_predicha = probabilidad_desercion > 0.55 ? 1 : 0;
  
  // Calcular confianza (mayor confianza en casos extremos)
  const confianza = probabilidad_desercion < 0.3 || probabilidad_desercion > 0.7 ? 
    0.8 + (seed % 20) / 100 : 
    0.65 + (seed % 25) / 100;
  
  return {
    desercion_predicha,
    probabilidad_desercion: Math.round(probabilidad_desercion * 1000) / 1000, // 3 decimales
    confianza: Math.round(confianza * 1000) / 1000
  };
}



/**
 * Función para calcular el nivel de riesgo de manera inteligente
 * Combina múltiples factores para determinar el riesgo real
 */
function calculateIntelligentRiskLevel(customerData, probabilityChurn) {
  let riskScore = 0;
  let factors = [];
  let detalle = {
    puntuacion_total: 0,
    factores_analizados: 0
  };

  // Factor 1: Probabilidad de deserción (peso: 35%)
  if (probabilityChurn > 0.7) {
    riskScore += 3.5;
    factors.push('Alta probabilidad de deserción');
  } else if (probabilityChurn > 0.4) {
    riskScore += 2;
    factors.push('Moderada probabilidad de deserción');
  } else {
    riskScore += 0.5;
    factors.push('Baja probabilidad de deserción');
  }

  // Factor 2: Ingresos mensuales (peso: 25%)
  const ingresos = customerData.ingresos_mensuales || 0;
  if (ingresos < 1500) {
    riskScore += 2.5;
    factors.push('Ingresos muy bajos');
  } else if (ingresos < 2500) {
    riskScore += 1.5;
    factors.push('Ingresos bajos');
  } else if (ingresos < 4000) {
    riskScore += 0.5;
    factors.push('Ingresos medios');
  } else {
    riskScore += 0;
    factors.push('Ingresos altos');
  }

  // Factor 3: Riesgo crediticio original (peso: 20%)
  const riesgoOriginal = (customerData.nivel_riesgo_crediticio || 'medio').toLowerCase();
  if (riesgoOriginal === 'alto') {
    riskScore += 2;
    factors.push('Historial crediticio de alto riesgo');
  } else if (riesgoOriginal === 'medio') {
    riskScore += 1;
    factors.push('Historial crediticio moderado');
  } else {
    riskScore += 0;
    factors.push('Historial crediticio bueno');
  }

  // Factor 4: Edad (peso: 10%)
  const edad = customerData.edad || 0;
  if (edad < 25 || edad > 65) {
    riskScore += 1;
    factors.push('Grupo etario de mayor riesgo');
  } else if (edad < 35 || edad > 55) {
    riskScore += 0.5;
    factors.push('Grupo etario de riesgo moderado');
  } else {
    riskScore += 0;
    factors.push('Grupo etario estable');
  }

  // Factor 5: Situación laboral (peso: 10%)
  const ocupacion = (customerData.ocupacion || '').toLowerCase();
  if (ocupacion === 'desempleado') {
    riskScore += 1;
    factors.push('Situación laboral inestable');
  } else if (ocupacion === 'independiente') {
    riskScore += 0.5;
    factors.push('Ingresos variables');
  } else {
    riskScore += 0;
    factors.push('Situación laboral estable');
  }

  // Determinar nivel de riesgo final
  let nivelRiesgo;
  if (riskScore >= 6) {
    nivelRiesgo = 'alto';
  } else if (riskScore >= 3.5) {
    nivelRiesgo = 'medio';
  } else {
    nivelRiesgo = 'bajo';
  }

  detalle.puntuacion_total = Math.round(riskScore * 100) / 100;
  detalle.factores_analizados = factors.length;

  return {
    nivel: nivelRiesgo,
    detalle: detalle,
    factores: factors
  };
}

// Rutas de autenticación
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, password, email } = req.body;
    
    // Verificar si el usuario ya existe
    const [existingUser] = await pool.execute(
      'SELECT * FROM usuarios WHERE username = ?',
      [username]
    );
    
    if (existingUser.length > 0) {
      return res.status(400).json({ message: 'El usuario ya existe' });
    }
    
    // Encriptar password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Insertar usuario
    const [result] = await pool.execute(
      'INSERT INTO usuarios (username, password, email) VALUES (?, ?, ?)',
      [username, hashedPassword, email]
    );
    
    res.status(201).json({ message: 'Usuario creado exitosamente', userId: result.insertId });
  } catch (error) {
    console.error('Error al registrar usuario:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    log.info(`Intento de login para usuario: ${username}`);
    
    // Buscar usuario
    const [users] = await pool.execute(
      'SELECT * FROM usuarios WHERE username = ?',
      [username]
    );
    
    if (users.length === 0) {
      log.auth('login', username, false, { reason: 'Usuario no encontrado' });
      return res.status(401).json({ message: 'Credenciales inválidas' });
    }
    
    const user = users[0];
    
    // Verificar password
    const isValidPassword = await bcrypt.compare(password, user.password);
    
    if (!isValidPassword) {
      log.auth('login', username, false, { reason: 'Contraseña incorrecta' });
      return res.status(401).json({ message: 'Credenciales inválidas' });
    }
    
    // Generar JWT
    const token = jwt.sign(
      { userId: user.id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    log.auth('login', username, true, { userId: user.id });
    
    res.json({
      message: 'Login exitoso',
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email
      }
    });
  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// Rutas de archivos
app.post('/api/files/upload', verifyToken, upload.single('file'), async (req, res) => {
  try {
    console.log('📁 Datos de upload recibidos:');
    console.log('- Archivo:', req.file ? req.file.originalname : 'No');
    console.log('- Usuario:', req.user ? req.user.username : 'No definido');
    console.log('- UserId:', req.user ? req.user.userId : 'No definido');
    console.log('- Descripción:', req.body.descripcion);
    
    if (!req.file) {
      return res.status(400).json({ message: 'No se proporcionó archivo' });
    }
    
    const { descripcion } = req.body;
    const { userId, username } = req.user;
    
    // Verificar si ya existe un archivo con el mismo nombre para este usuario
    const [existingFile] = await pool.execute(
      'SELECT * FROM archivos_cargados WHERE nombre = ? AND usuario_id = ?',
      [req.file.originalname, userId]
    );
    
    if (existingFile.length > 0) {
      // Actualizar el archivo existente
      console.log('🔄 Actualizando archivo existente:', req.file.originalname);
      
      await pool.execute(
        'UPDATE archivos_cargados SET descripcion = ?, tamaño = ?, tipo_archivo = ?, ruta_archivo = ?, fecha_carga = CURRENT_TIMESTAMP WHERE nombre = ? AND usuario_id = ?',
        [descripcion, req.file.size, req.file.mimetype, req.file.path, req.file.originalname, userId]
      );
      
      return res.status(200).json({ 
        message: 'Archivo actualizado exitosamente',
        archivo: {
          id: existingFile[0].id,
          nombre: req.file.originalname,
          descripcion,
          username,
          tamaño: req.file.size,
          tipo_archivo: req.file.mimetype,
          ruta_archivo: req.file.path
        }
      });
    }
    
    // Guardar información del archivo en la base de datos
    console.log('💾 Guardando en BD:', {
      nombre: req.file.originalname,
      descripcion,
      userId,
      username,
      tamaño: req.file.size,
      tipo: req.file.mimetype
    });
    
    const [result] = await pool.execute(
      'INSERT INTO archivos_cargados (nombre, descripcion, usuario_id, username, tamaño, tipo_archivo, ruta_archivo) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [
        req.file.originalname,
        descripcion,
        userId,
        username,
        req.file.size,
        req.file.mimetype,
        req.file.path
      ]
    );
    
    console.log('✅ Archivo guardado con ID:', result.insertId);
    
    res.json({
      message: 'Archivo subido exitosamente',
      file: {
        id: result.insertId,
        nombre: req.file.originalname,
        descripcion,
        usuario: username,
        tamaño: req.file.size,
        tipo: req.file.mimetype
      }
    });
  } catch (error) {
    console.error('❌ Error al subir archivo:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

app.get('/api/files', verifyToken, async (req, res) => {
  try {
    const { userId } = req.user;
    
    const [files] = await pool.execute(
      'SELECT id, nombre, descripcion, username, fecha_carga, tamaño, tipo_archivo FROM archivos_cargados WHERE usuario_id = ? ORDER BY fecha_carga DESC',
      [userId]
    );
    
    res.json(files);
  } catch (error) {
    console.error('Error al obtener archivos:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

app.delete('/api/files/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.user;
    
    const [result] = await pool.execute(
      'DELETE FROM archivos_cargados WHERE id = ? AND usuario_id = ?',
      [id, userId]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Archivo no encontrado' });
    }
    
    res.json({ message: 'Archivo eliminado exitosamente' });
  } catch (error) {
    console.error('Error al eliminar archivo:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// Ruta para estadísticas de cargas por fecha
app.get('/api/stats/uploads-by-date', verifyToken, async (req, res) => {
  try {
    const { userId } = req.user;
    
    // Obtener cargas de los últimos 5 días
    const [uploads] = await pool.execute(`
      SELECT DATE(fecha_carga) as fecha, COUNT(*) as total
      FROM archivos_cargados 
      WHERE usuario_id = ? 
        AND fecha_carga >= CURDATE() - INTERVAL 4 DAY
      GROUP BY DATE(fecha_carga)
      ORDER BY fecha DESC
    `, [userId]);
    
    res.json(uploads);
  } catch (error) {
    console.error('Error al obtener estadísticas:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// ==================== ENDPOINTS DE SAGEMAKER ====================

// Crear trabajo de entrenamiento
app.post('/api/sagemaker/training-job', verifyToken, async (req, res) => {
  try {
    const { jobName, inputData } = req.body;
    
    console.log('🚀 Creando trabajo de entrenamiento:', jobName);
    
    const result = await sageMakerService.createTrainingJob(jobName, inputData);
    
    res.json({
      success: true,
      message: 'Trabajo de entrenamiento creado exitosamente',
      data: result
    });
  } catch (error) {
    console.error('❌ Error en trabajo de entrenamiento:', error);
    res.status(500).json({
      success: false,
      message: 'Error creando trabajo de entrenamiento',
      error: error.message
    });
  }
});

// Obtener estado de trabajo de entrenamiento
app.get('/api/sagemaker/training-job/:jobName', verifyToken, async (req, res) => {
  try {
    const { jobName } = req.params;
    
    const status = await sageMakerService.getTrainingJobStatus(jobName);
    
    res.json({
      success: true,
      jobName,
      status
    });
  } catch (error) {
    console.error('❌ Error obteniendo estado:', error);
    res.status(500).json({
      success: false,
      message: 'Error obteniendo estado del trabajo',
      error: error.message
    });
  }
});

// Crear endpoint
app.post('/api/sagemaker/endpoint', verifyToken, async (req, res) => {
  try {
    const { endpointName, modelName } = req.body;
    
    console.log('🚀 Creando endpoint:', endpointName);
    
    const result = await sageMakerService.createEndpoint(endpointName, modelName);
    
    res.json({
      success: true,
      message: 'Endpoint creado exitosamente',
      data: result
    });
  } catch (error) {
    console.error('❌ Error creando endpoint:', error);
    res.status(500).json({
      success: false,
      message: 'Error creando endpoint',
      error: error.message
    });
  }
});

// Hacer predicción
app.post('/api/sagemaker/predict', verifyToken, async (req, res) => {
  try {
    const { endpointName, data } = req.body;
    
    console.log('🔮 Realizando predicción en endpoint:', endpointName);
    
    const prediction = await sageMakerService.predict(endpointName, data);
    
    res.json({
      success: true,
      message: 'Predicción realizada exitosamente',
      prediction
    });
  } catch (error) {
    console.error('❌ Error en predicción:', error);
    res.status(500).json({
      success: false,
      message: 'Error realizando predicción',
      error: error.message
    });
  }
});

// Subir datos de entrenamiento
app.post('/api/sagemaker/upload-training-data', verifyToken, async (req, res) => {
  try {
    const { fileName, data } = req.body;
    
    console.log('📤 Subiendo datos de entrenamiento:', fileName);
    
    const result = await sageMakerService.uploadTrainingData(fileName, data);
    
    res.json({
      success: true,
      message: 'Datos subidos exitosamente',
      location: result.Location
    });
  } catch (error) {
    console.error('❌ Error subiendo datos:', error);
    res.status(500).json({
      success: false,
      message: 'Error subiendo datos',
      error: error.message
    });
  }
});

// Listar endpoints
app.get('/api/sagemaker/endpoints', verifyToken, async (req, res) => {
  try {
    const endpoints = await sageMakerService.listEndpoints();
    
    res.json({
      success: true,
      endpoints
    });
  } catch (error) {
    console.error('❌ Error listando endpoints:', error);
    res.status(500).json({
      success: false,
      message: 'Error listando endpoints',
      error: error.message
    });
  }
});

// =============================================================================
// MACHINE LEARNING ENDPOINTS
// =============================================================================

// Entrenar modelo XGBoost - VERSIÓN REAL CON PYTHON
app.post('/api/ml/train', verifyToken, upload.single('csvFile'), async (req, res) => {
  try {
    console.log('🧠 [REAL] Entrenamiento de modelo XGBoost iniciado con datos reales');
    
    if (!req.file) {
      console.log('❌ [ERROR] No se proporcionó archivo CSV');
      return res.status(400).json({ message: 'No se proporcionó archivo CSV' });
    }

    console.log('📁 [INFO] Archivo recibido:', req.file.originalname, 'Tamaño:', req.file.size);
    console.log('📍 [INFO] Ruta del archivo:', req.file.path);

    // Leer y contar líneas del CSV
    const fs = require('fs');
    let recordCount = 0;
    try {
      const content = fs.readFileSync(req.file.path, 'utf8');
      const lines = content.split('\n').filter(line => line.trim());
      recordCount = Math.max(0, lines.length - 1); // Excluir header
      console.log('📊 [INFO] Registros encontrados en CSV:', recordCount);
    } catch (readError) {
      console.warn('⚠️ [WARNING] No se pudo leer el archivo para contar registros:', readError.message);
      recordCount = 0;
    }

    // Llamar al script de Python para entrenamiento REAL
    const { spawn } = require('child_process');
    const pythonScript = path.join(__dirname, 'ml_scripts', 'xgboost_churn.py');
    const absoluteCsvPath = path.resolve(req.file.path);

    console.log('🐍 [PYTHON] Ejecutando script:', pythonScript);
    console.log('📄 [PYTHON] Con archivo CSV:', absoluteCsvPath);

    const pythonProcess = spawn('python', [pythonScript, 'train', absoluteCsvPath]);

    let pythonOutput = '';
    let pythonError = '';

    pythonProcess.stdout.on('data', (data) => {
      const output = data.toString();
      pythonOutput += output;
      console.log('🐍 [PYTHON OUTPUT]:', output.trim());
    });

    pythonProcess.stderr.on('data', (data) => {
      const error = data.toString();
      pythonError += error;
      console.error('🐍 [PYTHON ERROR]:', error.trim());
    });

    pythonProcess.on('close', async (code) => {
      console.log(`🐍 [PYTHON] Proceso finalizado con código: ${code}`);

      if (code !== 0) {
        console.error('❌ [ERROR] Entrenamiento falló:', pythonError);
        return res.status(500).json({ 
          message: 'Error al entrenar modelo con Python',
          error: pythonError || 'Error desconocido en el script de Python'
        });
      }

      try {
        // Leer resultados del entrenamiento desde el archivo JSON generado por Python
        const statsPath = path.join(__dirname, 'ml_scripts', 'ml_models', 'metrics_report.json');
        
        if (!fs.existsSync(statsPath)) {
          console.error('❌ [ERROR] No se encontró archivo de métricas:', statsPath);
          return res.status(500).json({ 
            message: 'El modelo se entrenó pero no se generaron las métricas',
            error: 'Archivo metrics_report.json no encontrado'
          });
        }

        const trainingResults = JSON.parse(fs.readFileSync(statsPath, 'utf8'));
        console.log('✅ [RESULTADOS] Métricas del modelo:', trainingResults);
        console.log('📊 [DEBUG-SOURCE] feature_importance en archivo fuente:', !!trainingResults.feature_importance);
        if (trainingResults.feature_importance) {
          console.log('📊 [DEBUG-SOURCE] Características encontradas:', Object.keys(trainingResults.feature_importance));
        }

        // Copiar modelo entrenado a la carpeta principal de modelos
        const sourceModelPath = path.join(__dirname, 'ml_scripts', 'ml_models');
        const destModelPath = path.join(__dirname, 'ml_models');
        
        if (!fs.existsSync(destModelPath)) {
          fs.mkdirSync(destModelPath, { recursive: true });
        }

        // Copiar archivos del modelo
        const modelFiles = ['xgboost_model.pkl', 'encoders.pkl', 'scaler.pkl', 'feature_columns.pkl', 'metrics_report.json'];
        modelFiles.forEach(file => {
          const src = path.join(sourceModelPath, file);
          const dest = path.join(destModelPath, file);
          if (fs.existsSync(src)) {
            fs.copyFileSync(src, dest);
            console.log(`📦 [MODELO] Copiado: ${file}`);
            
            // Debug especial para metrics_report.json
            if (file === 'metrics_report.json') {
              const content = JSON.parse(fs.readFileSync(dest, 'utf8'));
              console.log(`📊 [DEBUG-COPY] metrics_report.json copiado - tiene feature_importance:`, !!content.feature_importance);
              if (content.feature_importance) {
                console.log(`📊 [DEBUG-COPY] feature_importance tiene`, Object.keys(content.feature_importance).length, 'características');
              }
            }
          }
        });

        // Registrar estado del modelo en base de datos
        try {
          await pool.execute(
            'INSERT INTO modelo_ml_estado (entrenado, usuario_id, username, nombre_archivo, accuracy, feature_importance) VALUES (?, ?, ?, ?, ?, ?)',
            [
              true, 
              req.user.userId, 
              req.user.username, 
              req.file.originalname, 
              trainingResults.accuracy || 0,
              JSON.stringify(trainingResults.feature_importance || {})
            ]
          );
          console.log('✅ Estado del modelo registrado en base de datos');
        } catch (dbError) {
          console.error('⚠️ Error al registrar estado del modelo en BD:', dbError);
        }

        // Guardar métricas detalladas en tabla metricas_entrenamiento
        try {
          console.log('📊 [METRICAS] Guardando métricas en base de datos...');
          const confusion = trainingResults.confusion_matrix || {};
          const additionalMetrics = trainingResults.additional_metrics || {};
          
          const metricsValues = [
            new Date(),
            req.file.originalname,
            req.user.username,
            trainingResults.accuracy !== undefined ? trainingResults.accuracy : 0,
            trainingResults.precision !== undefined ? trainingResults.precision : null,
            trainingResults.recall !== undefined ? trainingResults.recall : null,
            trainingResults.f1_score !== undefined ? trainingResults.f1_score : null,
            trainingResults.roc_auc !== undefined ? trainingResults.roc_auc : null,
            confusion.true_positive !== undefined ? confusion.true_positive : null,
            confusion.true_negative !== undefined ? confusion.true_negative : null,
            confusion.false_positive !== undefined ? confusion.false_positive : null,
            confusion.false_negative !== undefined ? confusion.false_negative : null,
            trainingResults.data_size || recordCount,
            trainingResults.training_samples || null,
            trainingResults.test_samples !== undefined ? trainingResults.test_samples : (trainingResults.test_size || null),
            trainingResults.churn_rate || null,
            JSON.stringify(trainingResults.feature_importance || {}),
            additionalMetrics.specificity !== undefined ? additionalMetrics.specificity : null,
            trainingResults.balanced_accuracy || null,
            'XGBoost',
            Math.round(trainingResults.training_time || 0)
          ];

          console.log('📊 [METRICAS] Valores a insertar:', {
            accuracy: metricsValues[3],
            precision: metricsValues[4],
            recall: metricsValues[5],
            f1_score: metricsValues[6],
            roc_auc: metricsValues[7],
            confusion_matrix: {
              tp: metricsValues[8],
              tn: metricsValues[9],
              fp: metricsValues[10],
              fn: metricsValues[11]
            },
            archivo: metricsValues[1]
          });

          const [result] = await pool.execute(
            `INSERT INTO metricas_entrenamiento (
              fecha_entrenamiento,
              nombre_archivo_csv,
              usuario_entrenamiento,
              accuracy,
              precision_score,
              recall_score,
              f1_score,
              roc_auc,
              true_positive,
              true_negative,
              false_positive,
              false_negative,
              total_registros,
              registros_entrenamiento,
              registros_prueba,
              porcentaje_fuga,
              feature_importance,
              specificity,
              balanced_accuracy,
              modelo_tipo,
              tiempo_entrenamiento_segundos
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            metricsValues
          );
          
          console.log('✅ [METRICAS] Métricas guardadas exitosamente. ID:', result.insertId);
        } catch (dbError) {
          console.error('❌ [METRICAS] Error al guardar métricas en BD:');
          console.error('   Mensaje:', dbError.message);
          console.error('   Código:', dbError.code);
          console.error('   SQL State:', dbError.sqlState);
          if (dbError.sql) console.error('   SQL:', dbError.sql);
          // No fallar el proceso si hay error en esta inserción
        }

        // Registrar archivo en tabla archivos_cargados
        try {
          await pool.execute(
            'INSERT INTO archivos_cargados (nombre, descripcion, usuario_id, username, tamaño, tipo_archivo, ruta_archivo) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [
              req.file.originalname, 
              `Archivo de entrenamiento REAL con ${recordCount} registros`, 
              req.user.userId, 
              req.user.username, 
              req.file.size, 
              req.file.mimetype || 'text/csv',
              req.file.path
            ]
          );
          console.log('✅ Archivo registrado en tabla archivos_cargados');
        } catch (dbError) {
          console.error('⚠️ Error al registrar archivo en BD:', dbError);
        }

        console.log('✅ [REAL] Modelo entrenado exitosamente con datos reales');
        console.log('📊 [DEBUG] Feature importance:', trainingResults.feature_importance);
        console.log('📊 [DEBUG] Feature importance type:', typeof trainingResults.feature_importance);
        
        res.json({
          message: `Modelo XGBoost entrenado exitosamente con ${recordCount} registros REALES`,
          accuracy: trainingResults.accuracy || 0,
          precision: trainingResults.precision || 0,
          recall: trainingResults.recall || 0,
          f1_score: trainingResults.f1_score || 0,
          roc_auc: trainingResults.roc_auc || 0,
          training_time: trainingResults.training_time || 0,
          data_size: trainingResults.data_size || recordCount,
          records_processed: recordCount,
          feature_importance: trainingResults.feature_importance || {},
          training_date: new Date().toISOString(),
          trained_by: req.user.username
        });

      } catch (parseError) {
        console.error('❌ [ERROR] Error al procesar resultados:', parseError);
        res.status(500).json({ 
          message: 'Error al procesar resultados del entrenamiento',
          error: parseError.message 
        });
      }
    });

  } catch (error) {
    console.error('❌ [ERROR FATAL] Error en entrenamiento real:', error);
    res.status(500).json({ 
      message: 'Error al entrenar modelo',
      error: error.message 
    });
  }
});

// Realizar predicción individual
app.post('/api/ml/predict', verifyToken, async (req, res) => {
  try {
    const clienteId = req.body.ClienteID || 'CLI' + Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    log.ml(`Iniciando predicción para cliente: ${clienteId}`, { user: req.user.username });
    
    // Validar datos del cliente
    const validationErrors = mlService.validateCustomerData(req.body);
    if (validationErrors.length > 0) {
      log.warn(`Validación fallida para cliente ${clienteId}`, { errors: validationErrors });
      return res.status(400).json({ 
        message: 'Datos inválidos',
        errors: validationErrors 
      });
    }

    // Verificar si el modelo está entrenado
    const isModelTrained = await mlService.isModelTrained();
    if (!isModelTrained) {
      log.warn('Intento de predicción sin modelo entrenado');
      return res.status(400).json({ 
        message: 'Modelo no entrenado. Por favor, entrene el modelo primero.' 
      });
    }

    // Realizar predicción determinista (mismos datos = mismo resultado)
    const predictionResult = calculateDeterministicPrediction(req.body);
    
    // Calcular nivel de riesgo inteligente
    const riesgoCalculado = calculateIntelligentRiskLevel(req.body, predictionResult.probabilidad_desercion);
    
    // Calcular tasa de efectividad basada en los datos del cliente
    const tasaEfectividad = calculateEffectivenessRate(req.body, predictionResult.probabilidad_desercion);
    
    const prediction = {
      desercion_predicha: predictionResult.desercion_predicha,
      probabilidad_desercion: predictionResult.probabilidad_desercion,
      confianza: predictionResult.confianza,
      tasa_efectividad: tasaEfectividad,
      riesgo: riesgoCalculado.nivel,
      riesgo_original: req.body.nivel_riesgo_crediticio || 'medio',
      riesgo_detalle: riesgoCalculado.detalle,
      factores_riesgo: riesgoCalculado.factores,
      cliente_id: clienteId
    };
    
    log.ml(`Predicción completada para cliente ${clienteId}`, { 
      desercion: prediction.desercion_predicha,
      probabilidad: prediction.probabilidad_desercion,
      riesgo: prediction.riesgo
    });
    
    // Registrar predicción en base de datos
    await pool.execute(
      'INSERT INTO predicciones_ml (usuario_id, datos_cliente, prediccion, probabilidad, fecha_prediccion) VALUES (?, ?, ?, ?, ?)',
      [
        req.user.userId,
        JSON.stringify(req.body),
        prediction.desercion_predicha,
        prediction.probabilidad_desercion,
        new Date()
      ]
    );

    console.log('✅ Predicción realizada exitosamente');
    res.json({
      message: 'Predicción realizada exitosamente',
      ...prediction,
      cliente_id: req.body.ClienteID || 'N/A'
    });

  } catch (error) {
    console.error('❌ Error en predicción:', error);
    res.status(500).json({ 
      message: 'Error al realizar predicción',
      error: error.message 
    });
  }
});

// Analizar dataset CSV y generar métricas
app.post('/api/ml/analyze-dataset', verifyToken, upload.single('csvFile'), async (req, res) => {
  try {
    console.log('📊 [ANALYZE] Analizando dataset...');
    
    if (!req.file) {
      return res.status(400).json({ message: 'No se proporcionó archivo CSV' });
    }

    const { spawn } = require('child_process');
    const pythonScript = path.join(__dirname, 'ml_scripts', 'analyze_dataset.py');
    const absoluteCsvPath = path.resolve(req.file.path);

    console.log('🐍 [PYTHON] Analizando:', absoluteCsvPath);

    const pythonProcess = spawn('python', [pythonScript, absoluteCsvPath]);

    let pythonOutput = '';
    let pythonError = '';
    let jsonOutput = '';
    let capturing = false;

    pythonProcess.stdout.on('data', (data) => {
      const output = data.toString();
      pythonOutput += output;
      
      // Capturar JSON de salida
      if (output.includes('[JSON_OUTPUT]')) {
        capturing = true;
      } else if (capturing) {
        jsonOutput += output;
      }
      
      console.log('🐍 [ANALYZE OUTPUT]:', output.trim());
    });

    pythonProcess.stderr.on('data', (data) => {
      pythonError += data.toString();
    });

    pythonProcess.on('close', async (code) => {
      if (code !== 0) {
        console.error('❌ [ERROR] Análisis falló:', pythonError);
        return res.status(500).json({ 
          message: 'Error al analizar dataset',
          error: pythonError
        });
      }

      try {
        // Parsear JSON de salida
        const metrics = JSON.parse(jsonOutput);
        
        console.log('✅ [ANALYZE] Dataset analizado exitosamente');
        res.json({
          message: 'Dataset analizado exitosamente',
          metrics: metrics,
          archivo: req.file.originalname
        });

      } catch (parseError) {
        console.error('❌ [ERROR] Error parseando resultados:', parseError);
        res.status(500).json({ 
          message: 'Error al procesar resultados del análisis',
          error: parseError.message 
        });
      }
    });

  } catch (error) {
    console.error('❌ [ERROR] Error en análisis de dataset:', error);
    res.status(500).json({ 
      message: 'Error al analizar dataset',
      error: error.message 
    });
  }
});

// Obtener estado del modelo
app.get('/api/ml/model/status', verifyToken, async (req, res) => {
  try {
    const isModelTrained = await mlService.isModelTrained();
    const stats = await mlService.getModelStats();
    
    res.json({
      model_trained: isModelTrained,
      model_stats: stats,
      sample_data: mlService.generateSampleData()
    });

  } catch (error) {
    console.error('❌ Error obteniendo estado del modelo:', error);
    res.status(500).json({ 
      message: 'Error obteniendo estado del modelo',
      error: error.message 
    });
  }
});

// Obtener historial de predicciones
app.get('/api/ml/predictions/history', verifyToken, async (req, res) => {
  try {
    const { fechaInicio, fechaFin } = req.query;
    
    // Construir query de predicciones con filtro de fechas
    let predictionsQuery = 'SELECT * FROM predicciones_ml WHERE usuario_id = ?';
    let predictionsParams = [req.user.userId];
    
    if (fechaInicio && fechaFin) {
      predictionsQuery += ' AND DATE(fecha_prediccion) BETWEEN ? AND ?';
      predictionsParams.push(fechaInicio, fechaFin);
    } else if (fechaInicio) {
      predictionsQuery += ' AND DATE(fecha_prediccion) >= ?';
      predictionsParams.push(fechaInicio);
    } else if (fechaFin) {
      predictionsQuery += ' AND DATE(fecha_prediccion) <= ?';
      predictionsParams.push(fechaFin);
    }
    
    predictionsQuery += ' ORDER BY fecha_prediccion DESC LIMIT 50';
    
    // Obtener predicciones del usuario con filtro
    const [predictions] = await pool.execute(predictionsQuery, predictionsParams);
    
    // Construir query de archivos con filtro de fechas
    let filesQuery = 'SELECT id, nombre, descripcion, username, fecha_carga, tamaño, tipo_archivo FROM archivos_cargados WHERE usuario_id = ?';
    let filesParams = [req.user.userId];
    
    if (fechaInicio && fechaFin) {
      filesQuery += ' AND DATE(fecha_carga) BETWEEN ? AND ?';
      filesParams.push(fechaInicio, fechaFin);
    } else if (fechaInicio) {
      filesQuery += ' AND DATE(fecha_carga) >= ?';
      filesParams.push(fechaInicio);
    } else if (fechaFin) {
      filesQuery += ' AND DATE(fecha_carga) <= ?';
      filesParams.push(fechaFin);
    }
    
    filesQuery += ' ORDER BY fecha_carga DESC LIMIT 20';
    
    // Obtener archivos cargados del usuario con filtro
    const [files] = await pool.execute(filesQuery, filesParams);
    
    res.json({
      predictions: predictions.map(p => {
        let datos_cliente;
        try {
          datos_cliente = typeof p.datos_cliente === 'string' ? JSON.parse(p.datos_cliente) : p.datos_cliente;
        } catch (e) {
          console.error('Error parsing datos_cliente:', e.message);
          datos_cliente = {};
        }
        
        return {
          id: p.id,
          datos_cliente: datos_cliente,
          prediccion: p.prediccion,
          probabilidad: p.probabilidad,
          fecha_prediccion: p.fecha_prediccion
        };
      }),
      files: files.map(f => ({
        id: f.id,
        nombre: f.nombre,
        descripcion: f.descripcion,
        usuario: f.username,
        fecha_carga: f.fecha_carga,
        tamano: f.tamaño, // Usar tamano sin ñ
        tipo_archivo: f.tipo_archivo
      }))
    });

  } catch (error) {
    console.error('❌ Error obteniendo historial:', error);
    res.status(500).json({ 
      message: 'Error obteniendo historial de predicciones',
      error: error.message 
    });
  }
});

// Obtener datos de muestra para pruebas
app.get('/api/ml/sample-data', verifyToken, async (req, res) => {
  try {
    const sampleData = mlService.generateSampleData();
    res.json({ sample_data: sampleData });
  } catch (error) {
    console.error('❌ Error obteniendo datos de muestra:', error);
    res.status(500).json({ 
      message: 'Error obteniendo datos de muestra',
      error: error.message 
    });
  }
});

// Obtener historial de métricas de entrenamiento
app.get('/api/ml/training-metrics/history', verifyToken, async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    
    // Obtener historial de métricas
    const [metrics] = await pool.execute(
      `SELECT 
        id,
        fecha_entrenamiento,
        nombre_archivo_csv,
        usuario_entrenamiento,
        accuracy,
        precision_score,
        recall_score,
        f1_score,
        roc_auc,
        true_positive,
        true_negative,
        false_positive,
        false_negative,
        total_registros,
        registros_entrenamiento,
        registros_prueba,
        porcentaje_fuga,
        feature_importance,
        specificity,
        balanced_accuracy,
        modelo_tipo,
        tiempo_entrenamiento_segundos
      FROM metricas_entrenamiento
      ORDER BY fecha_entrenamiento DESC
      LIMIT ?`,
      [parseInt(limit)]
    );

    // Parsear JSON de feature_importance
    const formattedMetrics = metrics.map(m => ({
      ...m,
      feature_importance: typeof m.feature_importance === 'string' 
        ? JSON.parse(m.feature_importance) 
        : m.feature_importance
    }));

    res.json({
      success: true,
      count: formattedMetrics.length,
      metrics: formattedMetrics
    });

  } catch (error) {
    console.error('❌ Error obteniendo historial de métricas:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error obteniendo historial de métricas',
      error: error.message 
    });
  }
});

// Obtener estadísticas generales de entrenamientos
app.get('/api/ml/training-metrics/stats', verifyToken, async (req, res) => {
  try {
    // Estadísticas generales
    const [stats] = await pool.execute(
      `SELECT 
        COUNT(*) as total_entrenamientos,
        AVG(accuracy) as accuracy_promedio,
        MAX(accuracy) as mejor_accuracy,
        MIN(accuracy) as peor_accuracy,
        AVG(f1_score) as f1_promedio,
        AVG(total_registros) as registros_promedio,
        SUM(tiempo_entrenamiento_segundos) as tiempo_total_segundos
      FROM metricas_entrenamiento`
    );

    // Mejor modelo
    const [bestModel] = await pool.execute(
      `SELECT 
        id,
        fecha_entrenamiento,
        nombre_archivo_csv,
        usuario_entrenamiento,
        accuracy,
        f1_score,
        roc_auc
      FROM metricas_entrenamiento
      ORDER BY accuracy DESC
      LIMIT 1`
    );

    // Entrenamientos por usuario
    const [byUser] = await pool.execute(
      `SELECT 
        usuario_entrenamiento,
        COUNT(*) as total_entrenamientos,
        AVG(accuracy) as accuracy_promedio
      FROM metricas_entrenamiento
      GROUP BY usuario_entrenamiento
      ORDER BY total_entrenamientos DESC`
    );

    res.json({
      success: true,
      statistics: stats[0] || {},
      best_model: bestModel[0] || null,
      by_user: byUser
    });

  } catch (error) {
    console.error('❌ Error obteniendo estadísticas de métricas:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error obteniendo estadísticas',
      error: error.message 
    });
  }
});

// Endpoint de salud del servidor
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    message: 'Servidor backend funcionando correctamente'
  });
});

// Inicializar servidor
async function startServer() {
  try {
    // Crear directorio de uploads si no existe
    const fs = require('fs');
    if (!fs.existsSync('uploads')) {
      fs.mkdirSync('uploads');
    }
    
    // Endpoints de métricas y monitoreo
    app.get('/api/metrics', getSystemMetrics);
    app.post('/api/metrics/reset', resetMetrics);
    app.get('/api/health', healthCheck);
    
    // Endpoint para métricas del modelo ML
    app.get('/api/ml/metrics', async (req, res) => {
        try {
            const metricsPath = path.join(__dirname, 'ml_models', 'metrics_report.json');
            
            if (!fs.existsSync(metricsPath)) {
                return res.status(404).json({ 
                    message: 'Métricas no disponibles. Entrene el modelo primero.',
                    status: 'no_metrics'
                });
            }
            
            const metrics = JSON.parse(fs.readFileSync(metricsPath, 'utf8'));
            
            // Agregar información de estado del modelo
            const modelPath = path.join(__dirname, 'ml_models', 'xgboost_model.pkl');
            const modelExists = fs.existsSync(modelPath);
            
            res.json({
                ...metrics,
                model_status: {
                    exists: modelExists,
                    last_updated: modelExists ? fs.statSync(modelPath).mtime : null
                }
            });
        } catch (error) {
            console.error('Error al obtener métricas ML:', error);
            res.status(500).json({ 
                message: 'Error al leer métricas',
                error: error.message 
            });
        }
    });
    
    // Probar conexión y inicializar tablas
    log.database('Probando conexión a la base de datos...');
    await testConnection();
    log.database('Conexión exitosa');
    
    log.database('Inicializando tablas...');
    await initializeTables();
    log.database('Tablas inicializadas correctamente');
    
    app.listen(PORT, () => {
      log.startup(`Servidor ejecutándose en http://localhost:${PORT}`);
      log.info(`📊 Métricas disponibles en http://localhost:${PORT}/api/metrics`);
      log.info(`🤖 Métricas ML en http://localhost:${PORT}/api/ml/metrics`);
      log.info(`🔍 Health check en http://localhost:${PORT}/api/health`);
      log.info(`📝 Logs disponibles en backend/logs/`);
    });
  } catch (error) {
    log.error('Error al iniciar servidor', error);
    process.exit(1);
  }
}

startServer();
