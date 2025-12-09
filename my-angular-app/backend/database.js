const mysql = require('mysql2/promise');
require('dotenv').config();

// Configuración de la base de datos
const dbConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT
};

// Crear pool de conexiones
const pool = mysql.createPool(dbConfig);

// Función para probar la conexión
async function testConnection() {
  try {
    const connection = await pool.getConnection();
    console.log('✅ Conexión exitosa a MySQL');
    connection.release();
  } catch (error) {
    console.error('❌ Error al conectar con MySQL:', error.message);
  }
}

// Función para inicializar las tablas
async function initializeTables() {
  try {
    const connection = await pool.getConnection();
    
    // Crear tabla de usuarios
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS usuarios (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        email VARCHAR(100),
        fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Crear tabla de archivos cargados
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS archivos_cargados (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nombre VARCHAR(255) NOT NULL,
        descripcion TEXT,
        usuario_id INT,
        username VARCHAR(50),
        fecha_carga TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        tamaño INT,
        tipo_archivo VARCHAR(100),
        ruta_archivo VARCHAR(500),
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
      )
    `);
    
    // Crear tabla de predicciones de Machine Learning
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS predicciones_ml (
        id INT AUTO_INCREMENT PRIMARY KEY,
        usuario_id INT NOT NULL,
        datos_cliente JSON,
        prediccion TINYINT(1),
        probabilidad DECIMAL(5,4),
        fecha_prediccion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
      )
    `);
    
    // Crear tabla de estado del modelo ML
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS modelo_ml_estado (
        id INT AUTO_INCREMENT PRIMARY KEY,
        entrenado BOOLEAN DEFAULT FALSE,
        usuario_id INT NOT NULL,
        username VARCHAR(50),
        nombre_archivo VARCHAR(255),
        fecha_entrenamiento TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        accuracy DECIMAL(5,4),
        feature_importance JSON,
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
      )
    `);
    
    console.log('✅ Tablas inicializadas correctamente');
    connection.release();
  } catch (error) {
    console.error('❌ Error al inicializar tablas:', error.message);
  }
}

module.exports = {
  pool,
  testConnection,
  initializeTables
};
