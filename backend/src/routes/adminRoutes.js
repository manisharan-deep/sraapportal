const express = require('express');
const adminController = require('../controllers/adminController');
const { authenticate, authorize } = require('../middlewares/authMiddleware');

const router = express.Router();

router.use(authenticate, authorize('ADMIN'));

router.get('/dashboard', adminController.dashboard);
router.get('/stats', adminController.stats);
router.get('/students', adminController.listStudents);
router.get('/staff', adminController.listStaff);
router.post('/students/:studentId/approve-profile', adminController.approveProfile);
router.post('/students/:studentId/reject-profile', adminController.rejectProfile);
router.delete('/students/:studentId', adminController.deleteStudent);
router.delete('/staff/:staffId', adminController.deleteStaff);
router.patch('/users/:userId/toggle-status', adminController.toggleUserStatus);

module.exports = router;
