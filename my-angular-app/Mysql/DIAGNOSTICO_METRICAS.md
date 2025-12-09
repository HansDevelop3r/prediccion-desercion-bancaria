# 🔍 Diagnóstico: Métricas no se guardan en BD

## Problema
Las métricas del entrenamiento no se están guardando en la tabla `metricas_entrenamiento`.

## ✅ Pasos de Diagnóstico

### 1. Verificar que la tabla existe

```sql
USE my_angular_app_db;
SHOW TABLES LIKE 'metricas_entrenamiento';
DESCRIBE metricas_entrenamiento;
```

**Resultado esperado:** La tabla debe existir con 24 columnas.

---

### 2. Probar inserción manual

Ejecuta el archivo: `test_insert_metricas.sql`

```sql
-- Esto insertará un registro de prueba
mysql -u root -p my_angular_app_db < test_insert_metricas.sql
```

O en MySQL Workbench:
1. Abre `test_insert_metricas.sql`
2. Ejecuta el script
3. Verifica que se insertó un registro

**Si falla:** Hay un problema con la estructura de la tabla o permisos.

---

### 3. Revisar logs del backend

**Cuando entrenes un modelo, busca en los logs del backend:**

```
📊 [METRICAS] Guardando métricas en base de datos...
📊 [METRICAS] Valores a insertar: { accuracy: 0.85, ... }
```

**Caso 1: No aparece el mensaje**
- El código no está llegando a esa sección
- Problema: El entrenamiento falla antes de guardar

**Caso 2: Aparece error después**
```
❌ [METRICAS] Error al guardar métricas en BD:
   Mensaje: [aquí el error]
   Código: ER_XXXX
```

---

### 4. Errores Comunes y Soluciones

#### Error: `ER_NO_SUCH_TABLE`
**Causa:** La tabla no existe  
**Solución:**
```sql
-- Ejecutar script de creación
SOURCE my_angular_app_db_metricas_entrenamiento.sql;
```

#### Error: `ER_BAD_FIELD_ERROR`
**Causa:** Nombre de columna incorrecto  
**Solución:** Verificar estructura con `DESCRIBE metricas_entrenamiento`

#### Error: `ER_DATA_TOO_LONG`
**Causa:** Datos muy largos para el campo  
**Solución:** Revisar el JSON de `feature_importance`

#### Error: `ER_TRUNCATED_WRONG_VALUE`
**Causa:** Tipo de dato incorrecto (ej: string en campo numérico)  
**Solución:** Verificar que los valores sean del tipo correcto

#### Error: `ER_ACCESS_DENIED_ERROR`
**Causa:** Usuario no tiene permisos  
**Solución:**
```sql
GRANT ALL PRIVILEGES ON my_angular_app_db.* TO 'tu_usuario'@'localhost';
FLUSH PRIVILEGES;
```

---

### 5. Verificar conexión del backend a MySQL

**Archivo:** `backend/.env`

```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=tu_password
DB_NAME=my_angular_app_db
DB_PORT=3306
```

**Verificar en backend/database.js:**
```javascript
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'my_angular_app_db',
  // ...
});
```

---

### 6. Probar consulta manual desde backend

**Crear archivo:** `backend/test-db-connection.js`

```javascript
const mysql = require('mysql2/promise');
require('dotenv').config();

async function testConnection() {
  try {
    const pool = mysql.createPool({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME || 'my_angular_app_db',
      waitForConnections: true,
      connectionLimit: 10
    });

    console.log('🔌 Conectando a MySQL...');
    
    // Probar tabla existe
    const [tables] = await pool.execute(
      "SHOW TABLES LIKE 'metricas_entrenamiento'"
    );
    console.log('✅ Tabla existe:', tables.length > 0);

    // Probar inserción
    const [result] = await pool.execute(
      `INSERT INTO metricas_entrenamiento (
        fecha_entrenamiento, nombre_archivo_csv, usuario_entrenamiento,
        accuracy, total_registros, modelo_tipo
      ) VALUES (NOW(), 'test.csv', 'test_user', 0.85, 1000, 'XGBoost')`
    );
    console.log('✅ Inserción exitosa. ID:', result.insertId);

    // Ver registros
    const [rows] = await pool.execute(
      'SELECT COUNT(*) as total FROM metricas_entrenamiento'
    );
    console.log('📊 Total de registros:', rows[0].total);

    await pool.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Código:', error.code);
  }
}

testConnection();
```

**Ejecutar:**
```bash
node backend/test-db-connection.js
```

---

### 7. Revisar si el backend está capturando la excepción

El código actual tiene:
```javascript
try {
  // INSERT ...
  console.log('✅ Métricas guardadas');
} catch (dbError) {
  console.error('❌ Error:', dbError.message);
  // No fallar el proceso si hay error
}
```

**Problema:** Si hay error, NO se propaga, pero tampoco se guarda.

**Solución temporal:** Comentar el `catch` para que el error se propague:

```javascript
// Guardar métricas detalladas en tabla metricas_entrenamiento
const confusion = trainingResults.confusion_matrix || {};
const [result] = await pool.execute(
  `INSERT INTO metricas_entrenamiento (...) VALUES (...)`,
  [...]
);
console.log('✅ Métricas guardadas. ID:', result.insertId);
// Si falla aquí, el entrenamiento fallará y verás el error
```

---

### 8. Verificar que trainingResults tiene los datos

**En server.js, después de leer el archivo:**
```javascript
const trainingResults = JSON.parse(fs.readFileSync(statsPath, 'utf8'));
console.log('📊 [DEBUG] trainingResults completo:', trainingResults);
console.log('📊 [DEBUG] confusion_matrix:', trainingResults.confusion_matrix);
```

---

## 🎯 Checklist de Verificación

- [ ] Tabla `metricas_entrenamiento` existe
- [ ] Inserción manual funciona (test_insert_metricas.sql)
- [ ] Logs del backend muestran "📊 [METRICAS] Guardando..."
- [ ] No hay errores "❌ [METRICAS] Error al guardar..."
- [ ] Backend tiene permisos en la BD
- [ ] Archivo `.env` tiene credenciales correctas
- [ ] `trainingResults` contiene datos válidos

---

## 📝 Pasos para Solucionar

1. **Reiniciar backend** para aplicar cambios en logs
2. **Entrenar modelo** desde la UI
3. **Revisar logs del backend** en tiempo real
4. **Buscar mensaje:** "📊 [METRICAS] Guardando métricas..."
5. **Si aparece error:** Copiar el mensaje completo
6. **Si no aparece mensaje:** El código no llega ahí

---

## 🔧 Script de Verificación Rápida

```sql
-- Ejecutar en MySQL Workbench
USE my_angular_app_db;

-- 1. Verificar tabla
SELECT 'Paso 1: Verificar tabla' AS paso;
SHOW TABLES LIKE 'metricas_entrenamiento';

-- 2. Ver estructura
SELECT 'Paso 2: Estructura de tabla' AS paso;
DESCRIBE metricas_entrenamiento;

-- 3. Contar registros actuales
SELECT 'Paso 3: Registros actuales' AS paso;
SELECT COUNT(*) AS total FROM metricas_entrenamiento;

-- 4. Ver últimos registros
SELECT 'Paso 4: Últimos registros' AS paso;
SELECT 
    id, 
    fecha_entrenamiento, 
    nombre_archivo_csv, 
    usuario_entrenamiento,
    accuracy,
    f1_score
FROM metricas_entrenamiento 
ORDER BY fecha_entrenamiento DESC 
LIMIT 5;
```

---

**Siguiente paso:** Ejecuta el checklist y comparte los resultados para diagnosticar el problema específico.
