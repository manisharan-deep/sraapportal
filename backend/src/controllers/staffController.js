const Attendance = require('../models/Attendance');
const File = require('../models/File');
const Announcement = require('../models/Announcement');
const Coin = require('../models/Coin');
const Student = require('../models/Student');
const Staff = require('../models/Staff');
const asyncHandler = require('../utils/asyncHandler');

const dashboard = asyncHandler(async (req, res) => {
  const staff = await Staff.findOne({ userId: req.user._id }).populate('mentoringStudents').lean();
  res.render('staff/dashboard', { title: 'Staff Dashboard', staff });
});

const markAttendance = asyncHandler(async (req, res) => {
  const { studentId, courseId, date, status } = req.body;
  const staff = await Staff.findOne({ userId: req.user._id }).lean();

  await Attendance.findOneAndUpdate(
    { studentId, courseId, date: new Date(date) },
    { status, markedBy: staff._id },
    { upsert: true, new: true }
  );

  res.redirect('/staff/dashboard');
});

const uploadFile = asyncHandler(async (req, res) => {
  const staff = await Staff.findOne({ userId: req.user._id }).lean();
  const { name, url, batch } = req.body;
  await File.create({ name, url, batch, uploadedBy: staff._id });
  res.redirect('/staff/dashboard');
});

const createAnnouncement = asyncHandler(async (req, res) => {
  await Announcement.create({ ...req.body, createdBy: req.user._id });
  res.redirect('/staff/dashboard');
});

const assignCoins = asyncHandler(async (req, res) => {
  const staff = await Staff.findOne({ userId: req.user._id }).lean();
  const { studentId, type, amount, reason } = req.body;
  await Coin.create({ studentId, type, amount: Number(amount), reason, assignedBy: staff._id });

  const student = await Student.findById(studentId);
  if (type === 'ALPHA') student.alphaCoins += Number(amount);
  if (type === 'SIGMA') student.sigmaCoins += Number(amount);
  if (type === 'PENALTY') student.penaltyCoins += Number(amount);
  await student.save();

  res.redirect('/staff/dashboard');
});

module.exports = {
  dashboard,
  markAttendance,
  uploadFile,
  createAnnouncement,
  assignCoins
};
