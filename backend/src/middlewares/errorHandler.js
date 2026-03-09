const logger = require('../utils/logger');

const notFound = (req, res) => {
  res.status(404).json({ message: 'Resource not found' });
};

const errorHandler = (error, req, res, next) => {
  logger.error('Unhandled error', {
    message: error.message,
    stack: error.stack,
    path: req.path
  });

  const status = error.status || 500;
  const message = process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message;
  res.status(status).json({ message, error: process.env.NODE_ENV === 'production' ? undefined : error.stack });
};

module.exports = { notFound, errorHandler };
