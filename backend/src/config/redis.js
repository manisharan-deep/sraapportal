const Redis = require('ioredis');
const env = require('./env');
const logger = require('../utils/logger');

const redisClient = new Redis({
  host: env.redisHost,
  port: env.redisPort,
  lazyConnect: true,
  maxRetriesPerRequest: null,
  retryStrategy: () => null,
  enableOfflineQueue: false
});

const connectRedis = async () => {
  await redisClient.connect();
  logger.info('Redis connected');
};

module.exports = { redisClient, connectRedis };
