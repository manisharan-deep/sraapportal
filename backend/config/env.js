// Centralized environment configuration
const dotenv = require("dotenv");

dotenv.config();

const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: process.env.PORT || 4000,
  corsOrigin: process.env.CORS_ORIGIN || "http://localhost:3000",
  jwtSecret: process.env.JWT_SECRET || "change_me",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "1d",
  pg: {
    host: process.env.PG_HOST || "localhost",
    port: process.env.PG_PORT || 5432,
    database: process.env.PG_DB || "devops_task_manager",
    username: process.env.PG_USER || "postgres",
    password: process.env.PG_PASSWORD || "postgres"
  },
  mongoUri: process.env.MONGO_URI || "mongodb://localhost:27017/devops_task_manager_logs",
  logLevel: process.env.LOG_LEVEL || "info"
};

module.exports = env;
