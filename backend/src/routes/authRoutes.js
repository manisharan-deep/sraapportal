const express = require('express');
const authController = require('../controllers/authController');
const validateRequest = require('../middlewares/validateRequest');
const { authLimiter } = require('../middlewares/rateLimiter');
const { loginSchema } = require('../config/validationSchemas');
const { authenticate } = require('../middlewares/authMiddleware');

const router = express.Router();

router.post('/register', authController.register);
router.post('/login', authLimiter, authController.login);
router.post('/refresh', authController.refresh);
router.post('/logout', authenticate, authController.logout);
router.post('/seed/admin', authController.seedAdmin);

module.exports = router;
