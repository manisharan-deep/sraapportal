const dotenv = require('dotenv');

dotenv.config();

const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT || 3000),
  baseUrl: process.env.BASE_URL || 'http://localhost:3000',
  mongoUri: process.env.MONGO_URI,
  redisHost: process.env.REDIS_HOST || 'localhost',
  redisPort: Number(process.env.REDIS_PORT || 6379),
  jwtAccessSecret: process.env.JWT_ACCESS_SECRET,
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET,
  jwtAccessExpires: process.env.JWT_ACCESS_EXPIRES || '15m',
  jwtRefreshExpires: process.env.JWT_REFRESH_EXPIRES || '7d',
  sessionSecret: process.env.SESSION_SECRET,
  corsOrigin: process.env.CORS_ORIGIN || '*',
  smtpHost: process.env.SMTP_HOST,
  smtpPort: Number(process.env.SMTP_PORT || 2525),
  smtpUser: process.env.SMTP_USER,
  smtpPass: process.env.SMTP_PASS,
  emailFrom: process.env.EMAIL_FROM || 'no-reply@sru-portal.local',
  whatsappApiUrl: process.env.WHATSAPP_API_URL,
  whatsappApiKey: process.env.WHATSAPP_API_KEY,
  dailyAttendanceWhatsappEnabled: (process.env.DAILY_ATTENDANCE_WHATSAPP_ENABLED || 'true') === 'true',
  dailyAttendanceHour: Number(process.env.DAILY_ATTENDANCE_HOUR || 20),
  dailyAttendanceMinute: Number(process.env.DAILY_ATTENDANCE_MINUTE || 0)
};

const required = ['mongoUri', 'jwtAccessSecret', 'jwtRefreshSecret', 'sessionSecret'];
for (const key of required) {
  if (!env[key]) {
    throw new Error(`Missing required env variable: ${key}`);
  }
}

module.exports = env;
