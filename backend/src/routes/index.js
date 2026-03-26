const express = require('express');
const authRoutes = require('./authRoutes');
const studentRoutes = require('./studentRoutes');
const staffRoutes = require('./staffRoutes');
const adminRoutes = require('./adminRoutes');
const attendanceRoutes = require('./attendance');
const marksRoutes = require('./marks');
const subjectsRoutes = require('./subjects');
const asyncHandler = require('../utils/asyncHandler');
const attendanceController = require('../controllers/attendanceController');
const { authenticate, authorize } = require('../middlewares/authMiddleware');

const router = express.Router();

router.get('/', (req, res) => {
  res.json({ message: 'SR University Portal API', version: '1.0.0' });
});

router.use('/auth', authRoutes);
router.use('/student', studentRoutes);
router.use('/staff', staffRoutes);
router.use('/admin', adminRoutes);
router.use('/attendance', attendanceRoutes);
router.use('/marks', marksRoutes);
router.use('/subjects', subjectsRoutes);

router.post('/mark-attendance', authenticate, authorize('STAFF'), asyncHandler(attendanceController.markAttendance));

module.exports = router;
