const { PythonShell } = require('python-shell');
const path = require('path');
const fs = require('fs');

class MLService {
    constructor() {
        this.pythonScriptPath = path.join(__dirname, 'ml_scripts', 'simple_ml.py'); // Usar script simple
        this.modelsPath = path.join(__dirname, 'ml_models');
        
        // Crear directorio de modelos si no existe
        if (!fs.existsSync(this.modelsPath)) {
            fs.mkdirSync(this.modelsPath, { recursive: true });
        }
    }

    /**
     * Entrenar el modelo XGBoost con datos CSV - versión corregida
     */
    async trainModel(csvPath) {
        return new Promise((resolve, reject) => {
            console.log('🐍 Iniciando script de Python para entrenamiento...');
            
            // Convertir a ruta absoluta
            const absoluteCsvPath = path.resolve(csvPath);
            console.log('📁 Ruta absoluta del CSV:', absoluteCsvPath);
            
            const options = {
                mode: 'text',
                pythonPath: 'python',
                pythonOptions: ['-u'],
                scriptPath: path.dirname(this.pythonScriptPath),
                args: ['train', absoluteCsvPath]
            };

            // Timeout reducido para desarrollo
            const timeout = setTimeout(() => {
                console.error('⏱️ Timeout en entrenamiento después de 10 segundos');
                reject(new Error('Timeout en entrenamiento del modelo'));
            }, 10000);

            PythonShell.run('simple_ml.py', options, (err, results) => {
                clearTimeout(timeout);
                
                if (err) {
                    console.error('❌ Error ejecutando Python:', err);
                    reject(new Error(`Error en Python: ${err.message}`));
                } else {
                    try {
                        console.log('📊 Salida del script Python:', results);
                        
                        // Unir toda la salida
                        const fullOutput = results.join('\n');
                        console.log('📝 Salida completa:', fullOutput);
                        
                        // Buscar JSON en la salida
                        const jsonStart = fullOutput.indexOf('{');
                        const jsonEnd = fullOutput.lastIndexOf('}');
                        
                        if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
                            const jsonString = fullOutput.substring(jsonStart, jsonEnd + 1);
                            console.log('🔍 JSON extraído:', jsonString);
                            
                            const result = JSON.parse(jsonString);
                            console.log('✅ Resultado parseado correctamente:', result);
                            resolve(result);
                        } else {
                            console.log('❌ No se encontró JSON válido en la salida');
                            reject(new Error('No se encontró JSON válido en la salida'));
                        }
                    } catch (parseError) {
                        console.error('❌ Error parsing JSON:', parseError);
                        console.log('📝 Raw output:', results);
                        reject(new Error(`Error parsing resultado: ${parseError.message}`));
                    }
                }
            });
        });
    }

    /**
     * Realizar predicción para un cliente individual
     */
    async predictSingle(customerData) {
        return new Promise((resolve, reject) => {
            const options = {
                mode: 'text',
                pythonPath: 'python',
                pythonOptions: ['-u'],
                scriptPath: path.dirname(this.pythonScriptPath),
                args: ['predict', JSON.stringify(customerData)]
            };

            PythonShell.run('xgboost_churn.py', options, (err, results) => {
                if (err) {
                    console.error('Error ejecutando Python:', err);
                    reject(err);
                } else {
                    try {
                        const result = JSON.parse(results.join(''));
                        resolve(result);
                    } catch (parseError) {
                        console.error('Error parsing JSON:', parseError);
                        console.log('Raw output:', results);
                        reject(parseError);
                    }
                }
            });
        });
    }

    /**
     * Verificar si el modelo está entrenado
     */
    async isModelTrained() {
        try {
            const { pool } = require('./database');
            const [rows] = await pool.execute(
                'SELECT entrenado FROM modelo_ml_estado ORDER BY fecha_entrenamiento DESC LIMIT 1'
            );
            
            if (rows.length > 0) {
                return rows[0].entrenado;
            }
            
            return false; // Si no hay registros, el modelo no está entrenado
        } catch (error) {
            console.error('Error checking model training status:', error);
            return false;
        }
    }

    /**
     * Validar formato de datos del cliente
     */
    validateCustomerData(data) {
        const requiredFields = [
            'edad', 'sexo', 'estado_civil', 'nacionalidad',
            'nivel_educativo', 'ingresos_mensuales', 'ocupacion',
            'nivel_riesgo_crediticio', 'tarjeta_credito'
        ];

        const errors = [];

        for (const field of requiredFields) {
            if (!data.hasOwnProperty(field)) {
                errors.push(`Campo requerido: ${field}`);
            }
        }

        // Validaciones específicas
        if (data.edad && (data.edad < 18 || data.edad > 100)) {
            errors.push('La edad debe estar entre 18 y 100 años');
        }

        if (data.ingresos_mensuales && data.ingresos_mensuales < 0) {
            errors.push('Los ingresos mensuales deben ser positivos');
        }

        return errors;
    }

    /**
     * Procesar archivo CSV cargado
     */
    async processCSVFile(filePath) {
        try {
            // Verificar que el archivo existe
            if (!fs.existsSync(filePath)) {
                throw new Error('Archivo CSV no encontrado');
            }

            // Leer primeras líneas para validar formato
            const firstLine = fs.readFileSync(filePath, 'utf8').split('\n')[0];
            const expectedHeaders = [
                'ClienteID', 'edad', 'sexo', 'estado_civil', 'nacionalidad',
                'nivel_educativo', 'ingresos_mensuales', 'ocupacion',
                'nivel_riesgo_crediticio', 'tarjeta_credito'
            ];

            const headers = firstLine.split(',').map(h => h.trim());
            const missingHeaders = expectedHeaders.filter(h => !headers.includes(h));

            if (missingHeaders.length > 0) {
                throw new Error(`Faltan columnas en el CSV: ${missingHeaders.join(', ')}`);
            }

            return {
                success: true,
                message: 'Archivo CSV válido',
                headers: headers,
                path: filePath
            };

        } catch (error) {
            throw new Error(`Error procesando CSV: ${error.message}`);
        }
    }

    /**
     * Obtener estadísticas del modelo
     */
    async getModelStats() {
        try {
            // Primero intentar leer el archivo JSON generado por Python
            const metricsPath = path.join(this.modelsPath, 'metrics_report.json');
            console.log('📊 [DEBUG] Leyendo métricas desde:', metricsPath);
            
            if (fs.existsSync(metricsPath)) {
                try {
                    const metricsData = JSON.parse(fs.readFileSync(metricsPath, 'utf8'));
                    console.log('📊 [DEBUG] Métricas leídas:', {
                        accuracy: metricsData.accuracy,
                        has_feature_importance: !!metricsData.feature_importance,
                        feature_count: metricsData.feature_importance ? Object.keys(metricsData.feature_importance).length : 0
                    });
                    
                    // Obtener información adicional de la base de datos
                    const { pool } = require('./database');
                    const [rows] = await pool.execute(
                        'SELECT fecha_entrenamiento, nombre_archivo, username FROM modelo_ml_estado ORDER BY fecha_entrenamiento DESC LIMIT 1'
                    );
                    
                    const stats = {
                        accuracy: metricsData.accuracy || 0,
                        precision: metricsData.precision || 0,
                        recall: metricsData.recall || 0,
                        f1_score: metricsData.f1_score || 0,
                        roc_auc: metricsData.roc_auc || 0,
                        feature_importance: metricsData.feature_importance || {},
                        training_date: rows.length > 0 ? rows[0].fecha_entrenamiento : null,
                        csv_file: rows.length > 0 ? rows[0].nombre_archivo : null,
                        trained_by: rows.length > 0 ? rows[0].username : null,
                        data_size: metricsData.data_size || 0,
                        training_time: metricsData.training_time || 0
                    };
                    
                    console.log('📊 [DEBUG] Retornando stats con feature_importance:', Object.keys(stats.feature_importance).length, 'items');
                    return stats;
                } catch (jsonError) {
                    console.error('Error leyendo metrics_report.json:', jsonError);
                }
            } else {
                console.log('❌ [DEBUG] Archivo metrics_report.json NO existe en:', metricsPath);
            }
            
            // Fallback: leer solo de la base de datos
            const { pool } = require('./database');
            const [rows] = await pool.execute(
                'SELECT accuracy, feature_importance, fecha_entrenamiento, nombre_archivo, username FROM modelo_ml_estado ORDER BY fecha_entrenamiento DESC LIMIT 1'
            );
            
            if (rows.length > 0) {
                const row = rows[0];
                return {
                    accuracy: row.accuracy || 0,
                    precision: 0, // No disponible en versión antigua
                    recall: 0,
                    f1_score: 0,
                    roc_auc: 0,
                    feature_importance: row.feature_importance,
                    training_date: row.fecha_entrenamiento,
                    csv_file: row.nombre_archivo,
                    trained_by: row.username
                };
            }
            
            return null;
        } catch (error) {
            console.error('Error obteniendo estadísticas:', error);
            return null;
        }
    }

    /**
     * Generar datos de ejemplo para pruebas
     */
    generateSampleData() {
        return {
            ClienteID: 'CLI001',
            edad: 35,
            sexo: 'M',
            estado_civil: 'casado',
            nacionalidad: 'peruana',
            nivel_educativo: 'universitario',
            ingresos_mensuales: 3500,
            ocupacion: 'empleado',
            nivel_riesgo_crediticio: 'medio',
            tarjeta_credito: 'si'
        };
    }
}

module.exports = MLService;
