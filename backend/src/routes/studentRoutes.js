const express = require('express');
const studentController = require('../controllers/studentController');
const { authenticate, authorize } = require('../middlewares/authMiddleware');
const validateRequest = require('../middlewares/validateRequest');
const {
	attendanceCalculatorSchema,
	courseRegistrationSchema,
	courseEditSchema,
	profileUpdateSchema
} = require('../config/validationSchemas');

const router = express.Router();

router.use(authenticate, authorize('STUDENT'));

router.get('/dashboard', studentController.dashboard);
router.get('/courses', studentController.courseRegistrations);
router.get('/results-data', studentController.resultsData);
router.get('/exams-data', studentController.examsData);
router.get('/attendance', studentController.attendanceView);
router.post('/attendance/calculate', validateRequest(attendanceCalculatorSchema), studentController.attendanceCalculator);
router.get('/attendance/report', studentController.attendanceReport);
router.get('/academics', studentController.academics);
router.post('/academics/register', validateRequest(courseRegistrationSchema), studentController.registerCourse);
router.post('/academics/:enrollmentId', validateRequest(courseEditSchema), studentController.editCourseRegistration);
router.get('/exams', studentController.exams);
router.get('/fees', studentController.fees);
router.get('/feedback', studentController.feedbackView);
router.post('/feedback', studentController.submitFeedback);
router.get('/leaderboard', studentController.leaderboard);
router.get('/files', studentController.files);
router.get('/calendar', studentController.calendar);
router.get('/profile', studentController.profile);
router.put('/profile', studentController.updateProfile);
router.post('/profile/request-update', validateRequest(profileUpdateSchema), studentController.updateProfileRequest);

module.exports = router;
