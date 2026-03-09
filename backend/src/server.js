const app = require('./app');
const env = require('./config/env');
const { connectDatabase } = require('./config/database');
const { connectRedis } = require('./config/redis');
const { startDailyAttendanceWhatsappJob } = require('./services/dailyAttendanceWhatsappJob');
const logger = require('./utils/logger');

const startServer = async () => {
  try {
    await connectDatabase();
    
    try {
      await connectRedis();
    } catch (redisError) {
      logger.warn('Redis connection failed, continuing without cache', { error: redisError.message });
    }

    // Start daily automated attendance reports to WhatsApp contacts in student profile.
    startDailyAttendanceWhatsappJob();

    app.listen(env.port, () => {
      logger.info(`Server running on port ${env.port}`);
    });
  } catch (error) {
    logger.error('Failed to start server', { error: error.message });
    process.exit(1);
  }
};

startServer();
