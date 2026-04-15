// Express app configuration
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const client = require("prom-client");
const env = require("./config/env");
const { initModels } = require("./models");
const requestLogger = require("./middleware/requestLogger");
const errorHandler = require("./middleware/errorHandler");
const authRoutes = require("./routes/authRoutes");
const taskRoutes = require("./routes/taskRoutes");
const userRoutes = require("./routes/userRoutes");

const app = express();

// Trust reverse proxies (ingress/nginx)
app.set("trust proxy", 1);

// Collect default Prometheus metrics
client.collectDefaultMetrics();
initModels();

// Security and request handling middleware
app.use(helmet());
app.use(cors({ origin: env.corsOrigin, credentials: true }));
app.use(express.json({ limit: "1mb" }));
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200,
    standardHeaders: true,
    legacyHeaders: false
  })
);
app.use(requestLogger);

// Healthcheck endpoint
app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "devops-task-manager" });
});

// Prometheus metrics endpoint
app.get("/metrics", async (_req, res) => {
  res.set("Content-Type", client.register.contentType);
  res.end(await client.register.metrics());
});

app.use("/api/auth", authRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/users", userRoutes);

app.use(errorHandler);

module.exports = app;
