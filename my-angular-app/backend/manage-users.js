// Script para crear nuevos usuarios con contraseñas conocidas
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

async function createTestUser() {
  try {
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: 'root',
      database: 'my_angular_app_db'
    });
    
    console.log('👤 Creando usuario de prueba...\n');
    
    // Datos del nuevo usuario
    const newUser = {
      username: 'test',
      password: '123456', // Contraseña simple para pruebas
      email: 'test@example.com'
    };
    
    // Verificar si el usuario ya existe
    const [existingUser] = await connection.execute(
      'SELECT * FROM usuarios WHERE username = ?',
      [newUser.username]
    );
    
    if (existingUser.length > 0) {
      console.log(`❌ El usuario "${newUser.username}" ya existe`);
      console.log('💡 Eliminando usuario existente...');
      
      await connection.execute(
        'DELETE FROM usuarios WHERE username = ?',
        [newUser.username]
      );
      
      console.log('✅ Usuario existente eliminado');
    }
    
    // Encriptar contraseña
    const hashedPassword = await bcrypt.hash(newUser.password, 10);
    
    // Crear usuario
    const [result] = await connection.execute(
      'INSERT INTO usuarios (username, password, email) VALUES (?, ?, ?)',
      [newUser.username, hashedPassword, newUser.email]
    );
    
    console.log('✅ Usuario creado exitosamente:');
    console.log(`   ID: ${result.insertId}`);
    console.log(`   Username: ${newUser.username}`);
    console.log(`   Password: ${newUser.password} (texto plano)`);
    console.log(`   Hash: ${hashedPassword}`);
    console.log(`   Email: ${newUser.email}`);
    
    // Verificar que se puede hacer login
    console.log('\n🔍 Verificando login...');
    const isMatch = await bcrypt.compare(newUser.password, hashedPassword);
    console.log(`Verificación: ${isMatch ? '✅ EXITOSA' : '❌ FALLIDA'}`);
    
    await connection.end();
    
    console.log('\n🎯 Ahora puedes hacer login con:');
    console.log(`   Usuario: ${newUser.username}`);
    console.log(`   Contraseña: ${newUser.password}`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Función para cambiar contraseña de un usuario existente
async function changePassword(username, newPassword) {
  try {
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: 'root',
      database: 'my_angular_app_db'
    });
    
    // Verificar que el usuario existe
    const [users] = await connection.execute(
      'SELECT * FROM usuarios WHERE username = ?',
      [username]
    );
    
    if (users.length === 0) {
      console.log(`❌ Usuario "${username}" no encontrado`);
      return;
    }
    
    // Encriptar nueva contraseña
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    // Actualizar contraseña
    await connection.execute(
      'UPDATE usuarios SET password = ? WHERE username = ?',
      [hashedPassword, username]
    );
    
    console.log(`✅ Contraseña actualizada para "${username}"`);
    console.log(`   Nueva contraseña: ${newPassword}`);
    console.log(`   Nuevo hash: ${hashedPassword}`);
    
    await connection.end();
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Verificar argumentos de línea de comandos
const args = process.argv.slice(2);

if (args[0] === 'create') {
  createTestUser();
} else if (args[0] === 'change' && args[1] && args[2]) {
  changePassword(args[1], args[2]);
} else {
  console.log('🛠️  Script de gestión de usuarios');
  console.log('\n📖 Uso:');
  console.log('  node manage-users.js create                    # Crear usuario de prueba');
  console.log('  node manage-users.js change "admin" "newpass"  # Cambiar contraseña');
  console.log('\n💡 Ejemplos:');
  console.log('  node manage-users.js create');
  console.log('  node manage-users.js change "admin" "123456"');
}
