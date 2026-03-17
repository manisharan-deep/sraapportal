const express = require('express');
const { authenticate, authorize } = require('../middlewares/authMiddleware');
const { SUBJECTS_BY_SEMESTER } = require('../config/subjects');

const router = express.Router();

router.use(authenticate, authorize('STAFF', 'ADMIN'));

router.get('/', (req, res) => {
  const semester = Number(req.query.semester);
  if (semester) {
    return res.json({ semester, subjects: SUBJECTS_BY_SEMESTER[semester] || [] });
  }
  return res.json({ subjectsBySemester: SUBJECTS_BY_SEMESTER });
});

module.exports = router;
