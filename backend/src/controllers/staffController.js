const Attendance = require('../models/Attendance');
const File = require('../models/File');
const Announcement = require('../models/Announcement');
const Coin = require('../models/Coin');
const Course = require('../models/Course');
const Student = require('../models/Student');
const Staff = require('../models/Staff');
const Result = require('../models/Result');
const asyncHandler = require('../utils/asyncHandler');

const dashboard = asyncHandler(async (req, res) => {
  const staff = await Staff.findOne({ userId: req.user._id })
    .populate('userId', 'fullName email')
    .populate('mentoringStudents')
    .lean();
  if (!staff) return res.status(404).json({ message: 'Staff profile not found' });

  const [recentAttendance, recentAnnouncements, recentCoins, totalStudents] = await Promise.all([
    Attendance.find({ markedBy: staff._id }).sort({ createdAt: -1 }).limit(5)
      .populate('studentId', 'name rollNumber').lean(),
    Announcement.find({ createdBy: req.user._id }).sort({ createdAt: -1 }).limit(5).lean(),
    Coin.find({ assignedBy: staff._id }).sort({ createdAt: -1 }).limit(5)
      .populate('studentId', 'name rollNumber').lean(),
    Student.countDocuments()
  ]);

  return res.json({ staff, recentAttendance, recentAnnouncements, recentCoins, totalStudents });
});

// ── List all students with optional filters ─────────────────────────────────
const listStudents = asyncHandler(async (req, res) => {
  const { branch, section, semester, batch, search } = req.query;
  const filter = {};
  if (branch) filter.branch = branch;
  if (section) filter.section = section;
  if (semester) filter.semester = Number(semester);
  if (batch) filter.batch = batch;
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { rollNumber: { $regex: search, $options: 'i' } }
    ];
  }
  const students = await Student.find(filter)
    .populate('userId', 'email isActive')
    .select('name rollNumber branch section semester batch cgpa backlogs attendancePercentage alphaCoins sigmaCoins penaltyCoins phone email gender mentor userId')
    .sort({ rollNumber: 1 })
    .lean();
  return res.json({ students });
});

// ── Get single student full detail ─────────────────────────────────────────
const getStudentDetail = asyncHandler(async (req, res) => {
  const student = await Student.findById(req.params.studentId)
    .populate('userId', 'email enrollmentNumber isActive createdAt')
    .lean();
  if (!student) return res.status(404).json({ message: 'Student not found' });

  const [recentAttendance, coins, results] = await Promise.all([
    Attendance.find({ studentId: student._id }).sort({ date: -1 }).limit(10)
      .populate('courseId', 'name code').lean(),
    Coin.find({ studentId: student._id }).sort({ createdAt: -1 }).limit(10).lean(),
    Result.find({ studentId: student._id }).sort({ semester: 1 }).lean()
  ]);

  return res.json({ student, recentAttendance, coins, results });
});

// ── List all courses ────────────────────────────────────────────────────────
const listCourses = asyncHandler(async (req, res) => {
  const { branch, semester } = req.query;
  const filter = {};
  if (branch) filter.branch = branch;
  if (semester) filter.semester = Number(semester);
  const courses = await Course.find(filter).sort({ name: 1 }).lean();
  return res.json({ courses });
});

// ── Get distinct branches and sections for filter dropdowns ────────────────
const getFilters = asyncHandler(async (req, res) => {
  const [branches, sections, semesters] = await Promise.all([
    Student.distinct('branch'),
    Student.distinct('section'),
    Student.distinct('semester')
  ]);
  return res.json({
    branches: branches.filter(Boolean).sort(),
    sections: sections.filter(Boolean).sort(),
    semesters: semesters.filter(Boolean).sort((a, b) => a - b)
  });
});

// ── Get attendance status for a course + date (for pre-filling bulk form) ──
const getAttendanceStatus = asyncHandler(async (req, res) => {
  const { courseId, date } = req.query;
  if (!courseId || !date) return res.status(400).json({ message: 'courseId and date required' });
  const records = await Attendance.find({ courseId, date: new Date(date) })
    .select('studentId status').lean();
  const map = {};
  records.forEach(r => { map[String(r.studentId)] = r.status; });
  return res.json({ map });
});

// ── Bulk mark attendance for multiple students ──────────────────────────────
const bulkMarkAttendance = asyncHandler(async (req, res) => {
  const { courseId, date, records } = req.body;
  if (!courseId || !date || !Array.isArray(records) || !records.length) {
    return res.status(400).json({ message: 'courseId, date, and records[] are required' });
  }
  const staff = await Staff.findOne({ userId: req.user._id }).lean();
  if (!staff) return res.status(404).json({ message: 'Staff profile not found' });

  const ops = records.map(r => ({
    updateOne: {
      filter: { studentId: r.studentId, courseId, date: new Date(date) },
      update: { $set: { status: r.status, markedBy: staff._id } },
      upsert: true
    }
  }));
  await Attendance.bulkWrite(ops);
  return res.json({ message: `Attendance saved for ${records.length} student(s)` });
});

// ── Individual attendance ───────────────────────────────────────────────────
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

// ── Save / update CIE + ETE marks for a student+semester ──────────────────
const saveMarks = asyncHandler(async (req, res) => {
  const { studentId, semester, cie, ete } = req.body;
  if (!studentId || !semester) {
    return res.status(400).json({ message: 'studentId and semester are required' });
  }
  const result = await Result.findOneAndUpdate(
    { studentId, semester: Number(semester) },
    { $set: { cie: cie || [], ete: ete || [] } },
    { upsert: true, new: true }
  );
  return res.json({ message: 'Marks saved successfully', result });
});

// ── Get results for a student (optionally filter by semester) ──────────────
const getStudentResults = asyncHandler(async (req, res) => {
  const { semester } = req.query;
  const filter = { studentId: req.params.studentId };
  if (semester) filter.semester = Number(semester);
  const results = await Result.find(filter).sort({ semester: 1 }).lean();
  const result = semester
    ? (results.find(r => r.semester === Number(semester)) || null)
    : null;
  return res.json({ results, result });
});

module.exports = {
  dashboard,
  listStudents,
  getStudentDetail,
  listCourses,
  getFilters,
  getAttendanceStatus,
  bulkMarkAttendance,
  markAttendance,
  uploadFile,
  createAnnouncement,
  assignCoins,
  saveMarks,
  getStudentResults
};
