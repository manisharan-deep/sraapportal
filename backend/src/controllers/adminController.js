const Student = require('../models/Student');
const User = require('../models/User');
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

module.exports = {
  dashboard,
  approveProfile,
  rejectProfile
};
