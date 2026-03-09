const express = require('express');
const authRoutes = require('./authRoutes');
const studentRoutes = require('./studentRoutes');
const staffRoutes = require('./staffRoutes');
const adminRoutes = require('./adminRoutes');

const router = express.Router();

router.get('/', (req, res) => {
  res.json({ message: 'SR University Portal API', version: '1.0.0' });
});

router.use('/auth', authRoutes);
router.use('/student', studentRoutes);
router.use('/staff', staffRoutes);
router.use('/admin', adminRoutes);

module.exports = router;
