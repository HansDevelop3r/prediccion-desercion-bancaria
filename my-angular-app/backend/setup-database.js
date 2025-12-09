const { pool, testConnection, initializeTables } = require('./database');

async function setupDatabase() {
  console.log('\n🔧 INICIALIZANDO TABLAS EN RDS\n');
  console.log('═══════════════════════════════════════════════════════');
  
  try {
    // Probar conexión
    console.log('⏳ Probando conexión...');
    await testConnection();
    console.log('');
    
    // Inicializar tablas
    console.log('⏳ Creando tablas...');
    await initializeTables();
    console.log('');
    
    // Verificar tablas creadas
    console.log('📋 TABLAS CREADAS:');
    console.log('─────────────────────────────────────────────────────');
    const [tables] = await pool.execute('SHOW TABLES');
    tables.forEach((table, index) => {
      const tableName = Object.values(table)[0];
      console.log(`   ${index + 1}. ✓ ${tableName}`);
    });
    
    // Verificar estructura de cada tabla
    console.log('\n📊 ESTRUCTURA DE LAS TABLAS:');
    console.log('─────────────────────────────────────────────────────');
    
    for (const table of tables) {
      const tableName = Object.values(table)[0];
      const [columns] = await pool.execute(`DESCRIBE ${tableName}`);
      console.log(`\n   📋 ${tableName}:`);
      columns.forEach(col => {
        console.log(`      - ${col.Field} (${col.Type})`);
      });
    }
    
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('✅ BASE DE DATOS LISTA PARA USAR');
    console.log('═══════════════════════════════════════════════════════\n');
    
    console.log('🎯 SIGUIENTE PASO:');
    console.log('   Inicia el servidor backend:');
    console.log('   npm start\n');
    
  } catch (error) {
    console.log('❌ ERROR AL INICIALIZAR TABLAS\n');
    console.log('═══════════════════════════════════════════════════════');
    console.log(`Mensaje: ${error.message}`);
    console.log('═══════════════════════════════════════════════════════\n');
    process.exit(1);
  } finally {
    await pool.end();
    console.log('🔌 Conexión cerrada\n');
  }
}

// Ejecutar
setupDatabase();
