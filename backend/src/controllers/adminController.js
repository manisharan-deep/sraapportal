const Student = require('../models/Student');
const Staff = require('../models/Staff');
const User = require('../models/User');
const Attendance = require('../models/Attendance');
const Coin = require('../models/Coin');
const Announcement = require('../models/Announcement');
const File = require('../models/File');
const Enrollment = require('../models/Enrollment');
const Result = require('../models/Result');
const Fee = require('../models/Fee');
const Feedback = require('../models/Feedback');
const HallTicket = require('../models/HallTicket');
const asyncHandler = require('../utils/asyncHandler');

const dashboard = asyncHandler(async (req, res) => {
  const pending = await Student.find({ profileEditPendingApproval: true }).populate('userId').lean();
  const users = await User.find({}).select('fullName role email isActive').lean();

  return res.json({
    pending,
    users
  });
});

const approveProfile = asyncHandler(async (req, res) => {
  const { studentId } = req.params;
  const student = await Student.findById(studentId);
  if (!student) {
    return res.status(404).json({ message: 'Student not found' });
  }

  if (student.pendingProfileData?.branch) student.branch = student.pendingProfileData.branch;
  if (student.pendingProfileData?.section) student.section = student.pendingProfileData.section;
  if (student.pendingProfileData?.semester) student.semester = student.pendingProfileData.semester;
  if (student.pendingProfileData?.mentor) student.mentor = student.pendingProfileData.mentor;
  student.profileEditPendingApproval = false;
  student.pendingProfileData = { branch: null, section: null, semester: null, mentor: null };
  await student.save();

  return res.json({ message: 'Profile approved successfully' });
});

const rejectProfile = asyncHandler(async (req, res) => {
  const { studentId } = req.params;
  const student = await Student.findByIdAndUpdate(studentId, {
    profileEditPendingApproval: false,
    pendingProfileData: { branch: null, section: null, semester: null, mentor: null }
  });
  if (!student) {
    return res.status(404).json({ message: 'Student not found' });
  }
  return res.json({ message: 'Profile rejected successfully' });
});

// ── List all students ───────────────────────────────────────────────────────
const listStudents = asyncHandler(async (req, res) => {
  const students = await Student.find({}).populate('userId', 'fullName email enrollmentNumber isActive').lean();
  return res.json({ students });
});

// ── List all staff ──────────────────────────────────────────────────────────
const listStaff = asyncHandler(async (req, res) => {
  const staff = await Staff.find({}).populate('userId', 'fullName email username isActive').lean();
  return res.json({ staff });
});

// ── Toggle user active/inactive ─────────────────────────────────────────────
const toggleUserStatus = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const user = await User.findById(userId);
  if (!user) return res.status(404).json({ message: 'User not found' });
  user.isActive = !user.isActive;
  await user.save();
  return res.json({ message: `User ${user.isActive ? 'activated' : 'deactivated'}`, isActive: user.isActive });
});

// ── Delete student (cascades all related data) ──────────────────────────────
const deleteStudent = asyncHandler(async (req, res) => {
  const { studentId } = req.params;
  const student = await Student.findById(studentId);
  if (!student) return res.status(404).json({ message: 'Student not found' });

  await Promise.all([
    Attendance.deleteMany({ studentId: student._id }),
    Coin.deleteMany({ studentId: student._id }),
    Enrollment.deleteMany({ studentId: student._id }),
    Result.deleteMany({ studentId: student._id }),
    Fee.deleteMany({ studentId: student._id }),
    Feedback.deleteMany({ studentId: student._id }),
    HallTicket.deleteMany({ studentId: student._id })
  ]);

  await Student.findByIdAndDelete(studentId);
  await User.findByIdAndDelete(student.userId);

  return res.json({ message: 'Student and all related data deleted successfully' });
});

// ── Delete staff ────────────────────────────────────────────────────────────
const deleteStaff = asyncHandler(async (req, res) => {
  const { staffId } = req.params;
  const staffMember = await Staff.findById(staffId);
  if (!staffMember) return res.status(404).json({ message: 'Staff not found' });

  await Announcement.deleteMany({ createdBy: staffMember.userId });

  await Staff.findByIdAndDelete(staffId);
  await User.findByIdAndDelete(staffMember.userId);

  return res.json({ message: 'Staff and related data deleted successfully' });
});

// ── Stats for dashboard summary ─────────────────────────────────────────────
const stats = asyncHandler(async (req, res) => {
  const [totalStudents, totalStaff, totalUsers, pendingCount] = await Promise.all([
    Student.countDocuments(),
    Staff.countDocuments(),
    User.countDocuments(),
    Student.countDocuments({ profileEditPendingApproval: true })
  ]);
  return res.json({ totalStudents, totalStaff, totalUsers, pendingCount });
});

module.exports = {
  dashboard,
  approveProfile,
  rejectProfile,
  listStudents,
  listStaff,
  toggleUserStatus,
  deleteStudent,
  deleteStaff,
  stats
};
