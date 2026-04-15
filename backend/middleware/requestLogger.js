// Request logging middleware
const logger = require("../services/logger");
const { logActivity } = require("../services/activityLogService");
const env = require("../config/env");

const requestLogger = (req, res, next) => {
  const start = Date.now();

  res.on("finish", () => {
    const durationMs = Date.now() - start;
    const userId = req.user ? req.user.id : null;

    logger.info("request completed", {
      method: req.method,
      path: req.originalUrl,
      statusCode: res.statusCode,
      durationMs,
      userId
    });

    if (env.nodeEnv !== "test") {
      logActivity({
        userId,
        action: "HTTP_REQUEST",
        method: req.method,
        path: req.originalUrl,
        statusCode: res.statusCode,
        ip: req.ip,
        userAgent: req.get("user-agent") || null,
        metadata: { durationMs }
      });
    }
  });

  next();
};

module.exports = requestLogger;
