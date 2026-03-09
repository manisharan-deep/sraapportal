const fs = require('fs');
const path = require('path');
const { createLogger, format, transports } = require('winston');

const logsDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

const loggerTransports = [new transports.Console()];

// File transports only when the filesystem is writable (local / Docker).
// On ephemeral cloud environments (Render free tier) skip file logging.
if (process.env.NODE_ENV !== 'production') {
  loggerTransports.push(new transports.File({ filename: path.join(logsDir, 'error.log'), level: 'error' }));
  loggerTransports.push(new transports.File({ filename: path.join(logsDir, 'combined.log') }));
}

const logger = createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: format.combine(
    format.timestamp(),
    format.errors({ stack: true }),
    format.json()
  ),
  defaultMeta: { service: 'sru-portal-backend' },
  transports: loggerTransports
});

module.exports = logger;
