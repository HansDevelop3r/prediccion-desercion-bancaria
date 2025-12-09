const mysql = require('mysql2/promise');
require('dotenv').config();

async function createDatabase() {
  console.log('\n🔧 CREANDO BASE DE DATOS EN RDS\n');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`📍 Host:     ${process.env.DB_HOST}`);
  console.log(`👤 Usuario:  ${process.env.DB_USER}`);
  console.log(`🗄️  Database: ${process.env.DB_NAME}`);
  console.log('═══════════════════════════════════════════════════════\n');

  let connection;

  try {
    // Conectar SIN especificar base de datos
    console.log('⏳ Conectando a RDS (sin base de datos específica)...');
    
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      port: process.env.DB_PORT || 3306,
      connectTimeout: 20000
    });

    console.log('✅ Conexión exitosa\n');

    // Verificar si la base de datos existe
    console.log(`🔍 Verificando si existe la base de datos '${process.env.DB_NAME}'...`);
    const [databases] = await connection.execute('SHOW DATABASES');
    const dbExists = databases.some(db => Object.values(db)[0] === process.env.DB_NAME);

    if (dbExists) {
      console.log(`✅ La base de datos '${process.env.DB_NAME}' ya existe\n`);
    } else {
      console.log(`⚠️  La base de datos '${process.env.DB_NAME}' NO existe`);
      console.log(`🔨 Creando base de datos '${process.env.DB_NAME}'...\n`);
      
      // Crear la base de datos
      await connection.execute(`CREATE DATABASE \`${process.env.DB_NAME}\` 
        CHARACTER SET utf8mb4 
        COLLATE utf8mb4_unicode_ci`);
      
      console.log(`✅ Base de datos '${process.env.DB_NAME}' creada exitosamente!\n`);
    }

    // Listar todas las bases de datos
    console.log('📋 BASES DE DATOS DISPONIBLES EN RDS:');
    console.log('─────────────────────────────────────────────────────');
    const [allDatabases] = await connection.execute('SHOW DATABASES');
    allDatabases.forEach((db, index) => {
      const dbName = Object.values(db)[0];
      const icon = dbName === process.env.DB_NAME ? '👉' : '  ';
      const mark = dbName === process.env.DB_NAME ? '(tu base de datos)' : '';
      console.log(`${icon} ${index + 1}. ${dbName} ${mark}`);
    });

    console.log('\n═══════════════════════════════════════════════════════');
    console.log('✅ PROCESO COMPLETADO EXITOSAMENTE');
    console.log('═══════════════════════════════════════════════════════\n');

    console.log('🎯 SIGUIENTES PASOS:');
    console.log('   1. Probar la conexión:');
    console.log('      node test-rds-connection.js\n');
    console.log('   2. Iniciar el servidor para crear las tablas:');
    console.log('      npm start\n');

  } catch (error) {
    console.log('❌ ERROR AL CREAR LA BASE DE DATOS\n');
    console.log('═══════════════════════════════════════════════════════');
    console.log(`Mensaje: ${error.message}`);
    console.log(`Código: ${error.code}`);
    console.log('═══════════════════════════════════════════════════════\n');

    if (error.code === 'ETIMEDOUT' || error.code === 'ECONNREFUSED') {
      console.log('💡 Verifica:');
      console.log('   - Security Group permite tu IP en puerto 3306');
      console.log('   - Public Access está habilitado');
    } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.log('💡 Verifica:');
      console.log('   - Usuario y contraseña en .env son correctos');
      console.log('   - El usuario tiene permisos para crear bases de datos');
    } else if (error.code === 'ER_DB_CREATE_EXISTS') {
      console.log('✅ La base de datos ya existe, no hay problema');
    }
    
    console.log('\n📝 Archivo de configuración: backend/.env\n');
    
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Conexión cerrada\n');
    }
  }
}

// Ejecutar
createDatabase();
