const Bull = require('bull');
const env = require('../config/env');

const attendanceSmsQueue = new Bull('attendance-sms-queue', {
  redis: {
    host: env.redisHost,
    port: env.redisPort
  },
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000
    },
    removeOnComplete: 1000,
    removeOnFail: 1000
  }
});

module.exports = { attendanceSmsQueue };
