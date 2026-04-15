// Centralized error handler
const logger = require("../services/logger");

const errorHandler = (err, _req, res, _next) => {
  logger.error("Unhandled error", { message: err.message, stack: err.stack });

  if (res.headersSent) {
    return res.end();
  }

  return res.status(500).json({ message: "Internal server error" });
};

module.exports = errorHandler;
