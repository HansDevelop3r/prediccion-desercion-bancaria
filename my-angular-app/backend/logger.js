const winston = require('winston');
const path = require('path');

// Configuración de formatos personalizados
const customFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ timestamp, level, message, stack }) => {
    if (stack) {
      return `[${timestamp}] ${level.toUpperCase()}: ${message}\n${stack}`;
    }
    return `[${timestamp}] ${level.toUpperCase()}: ${message}`;
  })
);

// Crear carpeta de logs si no existe
const fs = require('fs');
const logsDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir);
}

// Configuración del logger - TODO EN UN SOLO ARCHIVO
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: customFormat,
  transports: [
    // UN SOLO ARCHIVO DE LOG
    new winston.transports.File({
      filename: path.join(logsDir, 'application.log'),
      maxsize: 20971520, // 20MB
      maxFiles: 10,
    }),
    
    // Consola (solo en desarrollo)
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ timestamp, level, message }) => {
          return `[${timestamp}] ${level}: ${message}`;
        })
      )
    })
  ],
  // Manejo de excepciones no capturadas
  exceptionHandlers: [
    new winston.transports.File({ 
      filename: path.join(logsDir, 'application.log')
    })
  ],
  // Manejo de rechazos de promesas no capturados
  rejectionHandlers: [
    new winston.transports.File({ 
      filename: path.join(logsDir, 'application.log')
    })
  ]
});

// Funciones helper para diferentes tipos de logs
const log = {
  // Logs generales
  info: (message, meta = {}) => {
    logger.info(message, meta);
  },
  
  warn: (message, meta = {}) => {
    logger.warn(message, meta);
  },
  
  error: (message, error = null, meta = {}) => {
    if (error) {
      logger.error(message, { error: error.message, stack: error.stack, ...meta });
    } else {
      logger.error(message, meta);
    }
  },
  
  debug: (message, meta = {}) => {
    logger.debug(message, meta);
  },
  
  // Logs específicos de la aplicación
  startup: (message) => {
    logger.info(`🚀 STARTUP: ${message}`);
  },
  
  shutdown: (message) => {
    logger.info(`🛑 SHUTDOWN: ${message}`);
  },
  
  database: (message, meta = {}) => {
    logger.debug(`💾 DATABASE: ${message}`, meta);
  },
  
  api: (method, endpoint, status, duration, meta = {}) => {
    const message = `${method} ${endpoint} - Status: ${status} - Duration: ${duration}ms`;
    logger.http(`🌐 API: ${message}`, meta);
  },
  
  auth: (action, username, success, meta = {}) => {
    const status = success ? '✅' : '❌';
    logger.info(`🔐 AUTH: ${status} ${action} - User: ${username}`, meta);
  },
  
  ml: (action, meta = {}) => {
    logger.info(`🧠 ML: ${action}`, meta);
  },
  
  file: (action, filename, meta = {}) => {
    logger.info(`📁 FILE: ${action} - ${filename}`, meta);
  },
  
  security: (event, meta = {}) => {
    logger.warn(`🔒 SECURITY: ${event}`, meta);
  }
};

// Middleware para Express (logging de peticiones HTTP)
const requestLogger = (req, res, next) => {
  const startTime = Date.now();
  
  // Log cuando termina la respuesta
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const { method, originalUrl, ip } = req;
    const { statusCode } = res;
    
    log.api(method, originalUrl, statusCode, duration, {
      ip,
      userAgent: req.get('user-agent'),
      user: req.user?.username || 'anonymous'
    });
  });
  
  next();
};

module.exports = {
  logger,
  log,
  requestLogger
};
