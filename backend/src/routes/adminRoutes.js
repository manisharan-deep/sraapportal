const express = require('express');
const adminController = require('../controllers/adminController');
const { authenticate, authorize } = require('../middlewares/authMiddleware');

const router = express.Router();

router.use(authenticate, authorize('ADMIN'));

router.get('/dashboard', adminController.dashboard);
router.post('/students/:studentId/approve-profile', adminController.approveProfile);
router.post('/students/:studentId/reject-profile', adminController.rejectProfile);

module.exports = router;
