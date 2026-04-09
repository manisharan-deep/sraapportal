const app = require('./app');
const env = require('./config/env');
const { connectDatabase } = require('./config/database');
const { connectRedis } = require('./config/redis');
const { startDailyAttendanceWhatsappJob } = require('./services/dailyAttendanceWhatsappJob');
const { startAttendanceSmsWorker } = require('./workers/attendanceSmsWorker');
const logger = require('./utils/logger');

const RETRY_MS = 15000;

const retryWithDelay = (label, task) => {
  const run = async () => {
    try {
      await task();
      logger.info(`${label} initialized`);
    } catch (error) {
      logger.warn(`${label} initialization failed, retrying`, { error: error.message, retryInMs: RETRY_MS });
      setTimeout(run, RETRY_MS);
    }
  };
  run();
};

const startServer = async () => {
  try {
    app.listen(env.port, () => {
      logger.info(`Server running on port ${env.port}`);
    });

    // Keep HTTP server alive on Render even if dependent services are briefly unavailable.
    retryWithDelay('MongoDB', connectDatabase);

    retryWithDelay('Redis', async () => {
      await connectRedis();
      startAttendanceSmsWorker();
    });

    // Start daily automated attendance reports to WhatsApp contacts in student profile.
    startDailyAttendanceWhatsappJob();
  } catch (error) {
    logger.error('Failed to start server', { error: error.message });
    process.exit(1);
  }
};

startServer();
