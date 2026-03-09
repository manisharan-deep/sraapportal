const express = require('express');
const staffController = require('../controllers/staffController');
const { authenticate, authorize } = require('../middlewares/authMiddleware');
const validateRequest = require('../middlewares/validateRequest');
const { announcementSchema } = require('../config/validationSchemas');

const router = express.Router();

router.use(authenticate, authorize('STAFF'));

router.get('/dashboard', staffController.dashboard);
router.get('/filters', staffController.getFilters);
router.get('/students', staffController.listStudents);
router.get('/students/:studentId', staffController.getStudentDetail);
router.get('/courses', staffController.listCourses);
router.get('/attendance/status', staffController.getAttendanceStatus);
router.post('/attendance', staffController.markAttendance);
router.post('/attendance/bulk', staffController.bulkMarkAttendance);
router.post('/files', staffController.uploadFile);
router.post('/announcements', validateRequest(announcementSchema), staffController.createAnnouncement);
router.post('/coins', staffController.assignCoins);
router.post('/results', staffController.saveMarks);
router.get('/results/:studentId', staffController.getStudentResults);

module.exports = router;
