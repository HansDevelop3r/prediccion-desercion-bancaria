const express = require('express');
const { pool } = require('./database');

/**
 * Clase para recolectar métricas del servidor
 */
class MetricsCollector {
  constructor() {
    this.requestCount = 0;
    this.requestTimes = [];
    this.errorCount = 0;
    this.startTime = Date.now();
    this.endpointStats = new Map();
  }

  recordRequest(endpoint, method, duration, statusCode) {
    this.requestCount++;
    this.requestTimes.push(duration);

    // Registrar por endpoint
    const key = `${method} ${endpoint}`;
    if (!this.endpointStats.has(key)) {
      this.endpointStats.set(key, {
        count: 0,
        totalTime: 0,
        errors: 0
      });
    }
    
    const stats = this.endpointStats.get(key);
    stats.count++;
    stats.totalTime += duration;
    
    if (statusCode >= 400) {
      this.errorCount++;
      stats.errors++;
    }
  }

  getMetrics() {
    const uptime = Date.now() - this.startTime;
    const avgResponseTime = this.requestTimes.length > 0
      ? this.requestTimes.reduce((a, b) => a + b, 0) / this.requestTimes.length
      : 0;

    // Calcular percentiles
    const sortedTimes = [...this.requestTimes].sort((a, b) => a - b);
    const p50 = sortedTimes[Math.floor(sortedTimes.length * 0.5)] || 0;
    const p95 = sortedTimes[Math.floor(sortedTimes.length * 0.95)] || 0;
    const p99 = sortedTimes[Math.floor(sortedTimes.length * 0.99)] || 0;

    return {
      uptime_ms: uptime,
      uptime_readable: this.formatUptime(uptime),
      total_requests: this.requestCount,
      error_count: this.errorCount,
      success_count: this.requestCount - this.errorCount,
      success_rate: this.requestCount > 0 
        ? ((this.requestCount - this.errorCount) / this.requestCount * 100).toFixed(2) + '%'
        : '0%',
      avg_response_time_ms: avgResponseTime.toFixed(2),
      median_response_time_ms: p50.toFixed(2),
      p95_response_time_ms: p95.toFixed(2),
      p99_response_time_ms: p99.toFixed(2),
      requests_per_minute: (this.requestCount / (uptime / 60000)).toFixed(2),
      requests_per_second: (this.requestCount / (uptime / 1000)).toFixed(2)
    };
  }

  getEndpointStats() {
    const stats = [];
    this.endpointStats.forEach((value, key) => {
      stats.push({
        endpoint: key,
        count: value.count,
        avg_time_ms: (value.totalTime / value.count).toFixed(2),
        total_time_ms: value.totalTime.toFixed(2),
        errors: value.errors,
        success_rate: ((value.count - value.errors) / value.count * 100).toFixed(2) + '%'
      });
    });
    return stats.sort((a, b) => b.count - a.count);
  }

  formatUptime(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    return `${days}d ${hours % 24}h ${minutes % 60}m ${seconds % 60}s`;
  }

  reset() {
    this.requestCount = 0;
    this.requestTimes = [];
    this.errorCount = 0;
    this.startTime = Date.now();
    this.endpointStats.clear();
  }
}

// Instancia global
const metricsCollector = new MetricsCollector();

/**
 * Middleware para medir tiempo de respuesta
 */
function metricsMiddleware(req, res, next) {
  const start = Date.now();
  
  // Capturar el endpoint original
  const originalUrl = req.originalUrl;
  const method = req.method;
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    metricsCollector.recordRequest(originalUrl, method, duration, res.statusCode);
    
    // Log en consola para debugging
    const emoji = res.statusCode >= 400 ? '❌' : '✅';
    console.log(`${emoji} ${method} ${originalUrl} - ${res.statusCode} - ${duration}ms`);
  });
  
  next();
}

/**
 * Endpoint para obtener métricas del sistema
 */
async function getSystemMetrics(req, res) {
  try {
    // Métricas de base de datos
    const [dbStats] = await pool.execute(`
      SELECT 
        (SELECT COUNT(*) FROM usuarios) as total_usuarios,
        (SELECT COUNT(*) FROM archivos_cargados) as total_archivos,
        (SELECT COUNT(*) FROM predicciones_ml) as total_predicciones,
        (SELECT COUNT(*) FROM predicciones_ml WHERE DATE(fecha_prediccion) = CURDATE()) as predicciones_hoy,
        (SELECT COUNT(*) FROM predicciones_ml WHERE prediccion = 1) as predicciones_desercion
    `);

    // Métricas del modelo
    const [modelStats] = await pool.execute(`
      SELECT 
        nombre_modelo,
        version,
        fecha_entrenamiento,
        metricas,
        estado
      FROM modelo_ml_estado
      ORDER BY fecha_entrenamiento DESC
      LIMIT 1
    `);

    // Distribución de riesgo
    const [riskStats] = await pool.execute(`
      SELECT 
        CASE 
          WHEN probabilidad >= 0.7 THEN 'high'
          WHEN probabilidad >= 0.4 THEN 'medium'
          ELSE 'low'
        END as risk_level,
        COUNT(*) as count
      FROM predicciones_ml
      GROUP BY risk_level
    `);

    // Actividad reciente
    const [recentActivity] = await pool.execute(`
      SELECT 
        DATE(fecha_prediccion) as date,
        COUNT(*) as predictions
      FROM predicciones_ml
      WHERE fecha_prediccion >= DATE_SUB(NOW(), INTERVAL 7 DAY)
      GROUP BY DATE(fecha_prediccion)
      ORDER BY date DESC
    `);

    const metrics = {
      server: metricsCollector.getMetrics(),
      endpoints: metricsCollector.getEndpointStats(),
      database: {
        ...dbStats[0],
        churn_rate: dbStats[0].total_predicciones > 0
          ? ((dbStats[0].predicciones_desercion / dbStats[0].total_predicciones) * 100).toFixed(2) + '%'
          : '0%'
      },
      model: modelStats.length > 0 ? {
        name: modelStats[0].nombre_modelo,
        version: modelStats[0].version,
        last_training: modelStats[0].fecha_entrenamiento,
        status: modelStats[0].estado,
        metrics: modelStats[0].metricas ? JSON.parse(modelStats[0].metricas) : null
      } : null,
      risk_distribution: riskStats.reduce((acc, row) => {
        acc[row.risk_level] = row.count;
        return acc;
      }, {}),
      recent_activity: recentActivity,
      timestamp: new Date().toISOString()
    };

    res.json(metrics);
  } catch (error) {
    console.error('❌ Error getting metrics:', error);
    res.status(500).json({ 
      error: 'Error retrieving metrics',
      message: error.message 
    });
  }
}

/**
 * Endpoint para resetear métricas
 */
function resetMetrics(req, res) {
  metricsCollector.reset();
  res.json({ 
    message: 'Metrics reset successfully',
    timestamp: new Date().toISOString()
  });
}

/**
 * Endpoint de health check
 */
async function healthCheck(req, res) {
  try {
    // Test database connection
    await pool.execute('SELECT 1');
    
    res.json({
      status: 'healthy',
      uptime: metricsCollector.formatUptime(Date.now() - metricsCollector.startTime),
      database: 'connected',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      database: 'disconnected',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
}

module.exports = { 
  metricsMiddleware, 
  getSystemMetrics, 
  resetMetrics,
  healthCheck,
  metricsCollector 
};
