# 📊 Script SQL: Tabla de Métricas de Entrenamiento

## 📝 Descripción

Este script crea la tabla `metricas_entrenamiento` para almacenar todas las métricas generadas durante el entrenamiento del modelo de Machine Learning.

## 🚀 Instrucciones de Ejecución

### Opción 1: MySQL Workbench

1. **Abrir MySQL Workbench**
2. **Conectar a tu servidor** MySQL (localhost:3306)
3. **Abrir el script:**
   - File → Open SQL Script
   - Seleccionar: `my_angular_app_db_metricas_entrenamiento.sql`
4. **Ejecutar el script:**
   - Click en el icono de rayo ⚡ (Execute)
   - O presionar `Ctrl + Shift + Enter`
5. **Verificar resultado:**
   - Deberías ver: "Tabla metricas_entrenamiento creada exitosamente!"

### Opción 2: Línea de Comandos

```bash
# Navegar a la carpeta Mysql
cd d:\BACK_01102025\PI1\my-angular-app\Mysql

# Ejecutar el script
mysql -u root -p my_angular_app_db < my_angular_app_db_metricas_entrenamiento.sql
```

### Opción 3: phpMyAdmin

1. Abrir phpMyAdmin en el navegador
2. Seleccionar la base de datos `my_angular_app_db`
3. Ir a la pestaña "SQL"
4. Copiar y pegar el contenido del archivo SQL
5. Click en "Continuar" o "Go"

## 📋 Estructura de la Tabla

La tabla `metricas_entrenamiento` contiene los siguientes campos:

### Campos Principales

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | INT | ID autoincremental (PRIMARY KEY) |
| `fecha_entrenamiento` | DATETIME | Fecha y hora del entrenamiento |
| `nombre_archivo_csv` | VARCHAR(255) | Nombre del archivo CSV usado |
| `usuario_entrenamiento` | VARCHAR(100) | Usuario que entrenó el modelo |

### Métricas de Rendimiento

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `accuracy` | DECIMAL(5,4) | Precisión general (0-1) |
| `precision_score` | DECIMAL(5,4) | Precisión de positivos (0-1) |
| `recall_score` | DECIMAL(5,4) | Sensibilidad (0-1) |
| `f1_score` | DECIMAL(5,4) | F1-Score (0-1) |
| `roc_auc` | DECIMAL(5,4) | ROC-AUC (0-1) |

### Matriz de Confusión

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `true_positive` | INT | Verdaderos positivos |
| `true_negative` | INT | Verdaderos negativos |
| `false_positive` | INT | Falsos positivos |
| `false_negative` | INT | Falsos negativos |

### Información del Dataset

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `total_registros` | INT | Total de registros |
| `registros_entrenamiento` | INT | Registros para entrenamiento |
| `registros_prueba` | INT | Registros para prueba |
| `porcentaje_fuga` | DECIMAL(5,2) | % de clientes con fuga |
| `feature_importance` | JSON | Importancia de características |

### Metadata Adicional

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `specificity` | DECIMAL(5,4) | Especificidad |
| `balanced_accuracy` | DECIMAL(5,4) | Accuracy balanceado |
| `modelo_tipo` | VARCHAR(50) | Tipo de modelo (ej: XGBoost) |
| `tiempo_entrenamiento_segundos` | INT | Tiempo de entrenamiento |

## 🔍 Vistas Creadas

### 1. `v_metricas_recientes`

Muestra las 10 métricas más recientes con porcentajes calculados y calificación del modelo.

```sql
SELECT * FROM v_metricas_recientes;
```

### 2. `v_comparacion_modelos`

Compara modelos agrupados por día con estadísticas agregadas.

```sql
SELECT * FROM v_comparacion_modelos;
```

## 📊 Consultas Útiles

### Ver todas las métricas

```sql
SELECT * FROM metricas_entrenamiento 
ORDER BY fecha_entrenamiento DESC;
```

### Obtener el mejor modelo

```sql
SELECT * FROM metricas_entrenamiento 
ORDER BY accuracy DESC 
LIMIT 1;
```

### Estadísticas generales

```sql
SELECT 
    COUNT(*) AS total_entrenamientos,
    AVG(accuracy) AS accuracy_promedio,
    MAX(accuracy) AS mejor_accuracy,
    MIN(accuracy) AS peor_accuracy,
    AVG(f1_score) AS f1_promedio
FROM metricas_entrenamiento;
```

### Métricas por usuario

```sql
SELECT 
    usuario_entrenamiento,
    COUNT(*) AS entrenamientos,
    AVG(accuracy) AS accuracy_promedio,
    MAX(accuracy) AS mejor_accuracy
FROM metricas_entrenamiento
GROUP BY usuario_entrenamiento;
```

### Feature importance del último modelo

```sql
SELECT 
    nombre_archivo_csv,
    fecha_entrenamiento,
    JSON_PRETTY(feature_importance) AS importancia_caracteristicas
FROM metricas_entrenamiento
ORDER BY fecha_entrenamiento DESC
LIMIT 1;
```

## 🔗 Integración con Backend

El backend automáticamente guardará las métricas después de cada entrenamiento en el endpoint:

```
POST /api/ml/train
```

### Nuevos Endpoints Disponibles

1. **Historial de métricas:**
   ```
   GET /api/ml/training-metrics/history?limit=10
   ```

2. **Estadísticas generales:**
   ```
   GET /api/ml/training-metrics/stats
   ```

## ⚠️ Notas Importantes

1. **Backup:** Haz backup de tu base de datos antes de ejecutar
2. **Permisos:** Asegúrate de tener permisos de CREATE TABLE
3. **Charset:** La tabla usa utf8mb4_unicode_ci para soportar emojis y caracteres especiales
4. **JSON:** El campo `feature_importance` almacena JSON nativo de MySQL 5.7+

## ✅ Verificación

Después de ejecutar el script, verifica que todo esté correcto:

```sql
-- Ver estructura de la tabla
DESCRIBE metricas_entrenamiento;

-- Ver índices creados
SHOW INDEX FROM metricas_entrenamiento;

-- Verificar vistas
SHOW FULL TABLES WHERE Table_type = 'VIEW';
```

## 🐛 Solución de Problemas

### Error: "Table already exists"

Si recibes este error, la tabla ya existe. Puedes:

1. **Eliminar y recrear:**
   ```sql
   DROP TABLE IF EXISTS metricas_entrenamiento;
   ```
   Luego ejecuta el script nuevamente.

2. **O usar ALTER TABLE** para modificar la estructura existente.

### Error: "JSON column not supported"

Tu versión de MySQL es anterior a 5.7. Opciones:

1. Actualizar MySQL a versión 5.7+
2. Cambiar el tipo de `feature_importance` a `TEXT`

### Error de permisos

```sql
-- Otorgar permisos al usuario
GRANT ALL PRIVILEGES ON my_angular_app_db.* TO 'tu_usuario'@'localhost';
FLUSH PRIVILEGES;
```

## 📚 Referencias

- [MySQL JSON Data Type](https://dev.mysql.com/doc/refman/8.0/en/json.html)
- [MySQL Views](https://dev.mysql.com/doc/refman/8.0/en/views.html)
- [MySQL Indexes](https://dev.mysql.com/doc/refman/8.0/en/optimization-indexes.html)

---

**Autor:** Sistema de Predicción de Deserción Bancaria  
**Fecha:** 09/12/2025  
**Versión:** 1.0
