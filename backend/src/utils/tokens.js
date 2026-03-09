const jwt = require('jsonwebtoken');
const env = require('../config/env');

const signAccessToken = (user) => {
  return jwt.sign({ role: user.role }, env.jwtAccessSecret, {
    subject: String(user._id),
    expiresIn: env.jwtAccessExpires
  });
};

const signRefreshToken = (user) => {
  return jwt.sign({ role: user.role }, env.jwtRefreshSecret, {
    subject: String(user._id),
    expiresIn: env.jwtRefreshExpires
  });
};

module.exports = { signAccessToken, signRefreshToken };
