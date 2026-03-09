const Attendance = require('../models/Attendance');
const File = require('../models/File');
const Announcement = require('../models/Announcement');
const Coin = require('../models/Coin');
const Student = require('../models/Student');
const Staff = require('../models/Staff');
const asyncHandler = require('../utils/asyncHandler');

const dashboard = asyncHandler(async (req, res) => {
  const staff = await Staff.findOne({ userId: req.user._id })
    .populate('userId', 'fullName email')
    .populate('mentoringStudents')
    .lean();
  if (!staff) return res.status(404).json({ message: 'Staff profile not found' });

  const [recentAttendance, recentAnnouncements, recentCoins] = await Promise.all([
    Attendance.find({ markedBy: staff._id }).sort({ createdAt: -1 }).limit(5)
      .populate('studentId', 'name rollNumber').lean(),
    Announcement.find({ createdBy: req.user._id }).sort({ createdAt: -1 }).limit(5).lean(),
    Coin.find({ assignedBy: staff._id }).sort({ createdAt: -1 }).limit(5)
      .populate('studentId', 'name rollNumber').lean()
  ]);

  return res.json({ staff, recentAttendance, recentAnnouncements, recentCoins });
});

const markAttendance = asyncHandler(async (req, res) => {
  const { studentId, courseId, date, status } = req.body;
  const staff = await Staff.findOne({ userId: req.user._id }).lean();
  if (!staff) return res.status(404).json({ message: 'Staff profile not found' });

  const record = await Attendance.findOneAndUpdate(
    { studentId, courseId, date: new Date(date) },
    { status, markedBy: staff._id },
    { upsert: true, new: true }
  );

  return res.json({ message: 'Attendance marked', record });
});

const uploadFile = asyncHandler(async (req, res) => {
  const staff = await Staff.findOne({ userId: req.user._id }).lean();
  if (!staff) return res.status(404).json({ message: 'Staff profile not found' });

  const { name, url, batch } = req.body;
  const file = await File.create({ name, url, batch, uploadedBy: staff._id });
  return res.status(201).json({ message: 'File uploaded', file });
});

const createAnnouncement = asyncHandler(async (req, res) => {
  const announcement = await Announcement.create({ ...req.body, createdBy: req.user._id });
  return res.status(201).json({ message: 'Announcement created', announcement });
});

const assignCoins = asyncHandler(async (req, res) => {
  const staff = await Staff.findOne({ userId: req.user._id }).lean();
  if (!staff) return res.status(404).json({ message: 'Staff profile not found' });

  const { studentId, type, amount, reason } = req.body;
  const coin = await Coin.create({ studentId, type, amount: Number(amount), reason, assignedBy: staff._id });

  const student = await Student.findById(studentId);
  if (!student) return res.status(404).json({ message: 'Student not found' });

  if (type === 'ALPHA') student.alphaCoins = (student.alphaCoins || 0) + Number(amount);
  if (type === 'SIGMA') student.sigmaCoins = (student.sigmaCoins || 0) + Number(amount);
  if (type === 'PENALTY') student.penaltyCoins = (student.penaltyCoins || 0) + Number(amount);
  await student.save();

  return res.status(201).json({ message: 'Coins assigned', coin });
});

// ── Get all students (for staff to select when marking attendance/coins) ────
const listStudents = asyncHandler(async (req, res) => {
  const students = await Student.find({}).select('name rollNumber branch section semester').lean();
  return res.json({ students });
});

module.exports = {
  dashboard,
  markAttendance,
  uploadFile,
  createAnnouncement,
  assignCoins,
  listStudents
};
