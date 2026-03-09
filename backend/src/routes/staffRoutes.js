const express = require('express');
const staffController = require('../controllers/staffController');
const { authenticate, authorize } = require('../middlewares/authMiddleware');
const validateRequest = require('../middlewares/validateRequest');
const { announcementSchema } = require('../config/validationSchemas');

const router = express.Router();

router.use(authenticate, authorize('STAFF'));

router.get('/dashboard', staffController.dashboard);
router.get('/students', staffController.listStudents);
router.post('/attendance', staffController.markAttendance);
router.post('/files', staffController.uploadFile);
router.post('/announcements', validateRequest(announcementSchema), staffController.createAnnouncement);
router.post('/coins', staffController.assignCoins);

module.exports = router;
