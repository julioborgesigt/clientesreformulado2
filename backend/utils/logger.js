// backend/utils/logger.js
const winston = require('winston');
const path = require('path');
require('winston-daily-rotate-file');

// Define níveis de log customizados
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Define cores para cada nível
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'blue',
};

winston.addColors(colors);

// Formato para logs
const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

// Formato para console (mais legível)
const consoleFormat = winston.format.combine(
  winston.format.colorize({ all: true }),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(
    (info) => `${info.timestamp} ${info.level}: ${info.message}`
  )
);

// 🔒 SEGURANÇA E BOA PRÁTICA: Rotação diária de logs
// Previne crescimento ilimitado de arquivos de log
const transports = [
  // Console - sempre ativo
  new winston.transports.Console({
    format: consoleFormat,
  }),
  // Arquivo de erros com rotação diária
  new winston.transports.DailyRotateFile({
    filename: path.join(__dirname, '../../logs/error-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    level: 'error',
    format: format,
    maxSize: '20m', // Rotaciona se arquivo exceder 20MB
    maxFiles: '30d', // Mantém logs por 30 dias
    zippedArchive: true, // Comprime arquivos antigos
  }),
  // Arquivo de todos os logs com rotação diária
  new winston.transports.DailyRotateFile({
    filename: path.join(__dirname, '../../logs/combined-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    format: format,
    maxSize: '20m', // Rotaciona se arquivo exceder 20MB
    maxFiles: '14d', // Mantém logs por 14 dias
    zippedArchive: true, // Comprime arquivos antigos
  }),
];

// Cria o logger
const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  levels,
  format,
  transports,
});

// Middleware para logar requisições HTTP
logger.httpLogger = (req, res, next) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    const message = `${req.method} ${req.originalUrl} ${res.statusCode} - ${duration}ms`;

    if (res.statusCode >= 500) {
      logger.error(message);
    } else if (res.statusCode >= 400) {
      logger.warn(message);
    } else {
      logger.http(message);
    }
  });

  next();
};

module.exports = logger;
