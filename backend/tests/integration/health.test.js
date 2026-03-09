process.env.NODE_ENV = 'test';
process.env.PORT = '3000';
process.env.BASE_URL = 'http://localhost:3000';
process.env.MONGO_URI = 'mongodb://localhost:27017/sru_test';
process.env.REDIS_HOST = 'localhost';
process.env.REDIS_PORT = '6379';
process.env.JWT_ACCESS_SECRET = 'test_access_secret';
process.env.JWT_REFRESH_SECRET = 'test_refresh_secret';
process.env.SESSION_SECRET = 'test_session_secret';

const request = require('supertest');
const app = require('../../src/app');

describe('Health route', () => {
  test('GET /health returns OK', async () => {
    const response = await request(app).get('/health');
    expect(response.statusCode).toBe(200);
    expect(response.body.status).toBe('ok');
  });
});
