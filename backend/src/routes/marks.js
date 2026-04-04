const express = require('express');
const { authenticate, authorize } = require('../middlewares/authMiddleware');
const asyncHandler = require('../utils/asyncHandler');
const marksController = require('../controllers/marksController');

const router = express.Router();

router.use(authenticate);

router.get('/students', authorize('STAFF', 'ADMIN'), asyncHandler(marksController.getStudentsForMarks));
router.get('/export', authorize('STAFF', 'ADMIN'), asyncHandler(marksController.exportMarks));
router.get('/student/:studentId', authorize('STUDENT', 'STAFF', 'ADMIN'), asyncHandler(marksController.getStudentMarks));
router.get('/cgpa/:studentId', authorize('STUDENT', 'STAFF', 'ADMIN'), asyncHandler(marksController.getCgpa));
router.get('/', authorize('STAFF', 'ADMIN'), asyncHandler(marksController.getMarks));

router.post('/add', authorize('STAFF'), asyncHandler(marksController.addMarks));
router.put('/update', authorize('STAFF'), asyncHandler(marksController.updateMarks));

module.exports = router;
