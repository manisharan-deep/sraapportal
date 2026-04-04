const path = require('node:path');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const mongoSanitize = require('express-mongo-sanitize');
const hpp = require('hpp');
const csrf = require('csurf');
const client = require('prom-client');
const routes = require('./routes');
const { apiLimiter } = require('./middlewares/rateLimiter');
const { notFound, errorHandler } = require('./middlewares/errorHandler');
const env = require('./config/env');
const logger = require('./utils/logger');

const app = express();

app.use(helmet());
const allowedOrigins = new Set(
  (env.corsOrigin || '*')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)
);

app.use(cors({ 
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.has('*') || allowedOrigins.has(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true 
}));
app.use(morgan('combined', { stream: { write: (msg) => logger.info(msg.trim()) } }));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(cookieParser());
app.use(mongoSanitize());
app.use(hpp());
app.use(apiLimiter);

app.use(express.static(path.join(__dirname, '../../frontend-react/dist'), {
  setHeaders(res, filePath) {
    if (filePath.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    }
  }
}));

// Disable caching for HTML files so role-switching on login page always works
app.use(express.static(path.join(__dirname, '../../frontend'), {
  setHeaders(res, filePath) {
    if (filePath.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    }
  }
}));
app.use('/public', express.static(path.join(__dirname, '../public')));

client.collectDefaultMetrics();
const httpRequestDurationMs = new client.Histogram({
  name: 'http_request_duration_ms',
  help: 'Duration of HTTP requests in ms',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [50, 100, 200, 500, 1000, 2000]
});

app.use((req, res, next) => {
  const end = httpRequestDurationMs.startTimer();
  res.on('finish', () => {
    end({ method: req.method, route: req.path, status_code: res.statusCode });
  });
  next();
});

app.get('/metrics', async (req, res) => {
  res.set('Content-Type', client.register.contentType);
  res.end(await client.register.metrics());
});

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.use('/api', routes);
app.use(notFound);
app.use(errorHandler);

module.exports = app;
