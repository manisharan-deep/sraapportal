const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const attendanceController = require('../controllers/attendanceController');
const { authenticate, authorize } = require('../middlewares/authMiddleware');

const router = express.Router();

router.use(authenticate);

router.get('/students', authorize('STAFF', 'ADMIN'), asyncHandler(attendanceController.listStudents));
router.get('/student-options', authorize('STAFF', 'ADMIN'), asyncHandler(attendanceController.getAttendanceStudentOptions));
router.get('/history', authorize('STAFF', 'ADMIN'), asyncHandler(attendanceController.getStudentAttendanceHistory));
router.get('/students/:batch', authorize('STAFF', 'ADMIN'), asyncHandler((req, res) => {
  req.query.batch = req.params.batch;
  return attendanceController.listStudents(req, res);
}));
router.get('/percentage', authorize('STAFF', 'ADMIN'), asyncHandler(attendanceController.getAttendancePercentage));
router.get('/export', authorize('STAFF', 'ADMIN'), asyncHandler(attendanceController.exportAttendance));
router.get('/:batch/:date', authorize('STAFF', 'ADMIN'), asyncHandler((req, res) => {
  req.query.batch = req.params.batch;
  req.query.date = req.params.date;
  return attendanceController.getAttendance(req, res);
}));
router.get('/', authorize('STAFF', 'ADMIN'), asyncHandler(attendanceController.getAttendance));

router.post('/mark-bulk', authorize('STAFF'), asyncHandler(attendanceController.markBulkAttendance));
router.post('/mark-attendance', authorize('STAFF'), asyncHandler(attendanceController.markAttendance));
router.post('/mark', authorize('STAFF'), asyncHandler(attendanceController.markBulkAttendance));
router.put('/update', authorize('STAFF'), asyncHandler(attendanceController.updateAttendance));

module.exports = router;