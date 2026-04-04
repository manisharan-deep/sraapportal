const Student = require('../models/Student');
const Attendance = require('../models/Attendance');
const Enrollment = require('../models/Enrollment');
const Course = require('../models/Course');
const Marks = require('../models/Marks');
const Result = require('../models/Result');
const Fee = require('../models/Fee');
const Feedback = require('../models/Feedback');
const File = require('../models/File');
const Announcement = require('../models/Announcement');
const ExamSchedule = require('../models/ExamSchedule');
const HallTicket = require('../models/HallTicket');
const asyncHandler = require('../utils/asyncHandler');
const { classesRequiredFor75 } = require('../utils/attendance');
const { calculateCgpa } = require('../utils/academic');
const { generateAttendancePdf } = require('../services/pdfService');
const { sendEmail } = require('../services/emailService');
const { sendWhatsAppMessage } = require('../services/whatsappService');

const isPresentStatus = (value) => String(value || '').toLowerCase() === 'present';
const toIsoDate = (value) => new Date(value).toISOString().slice(0, 10);
const alphabetOnlyRegex = /^[A-Za-z\s.'-]+$/;
const mobileRegex = /^\d{10}$/;

const buildCreditsLookup = (courses = []) => {
  const lookup = new Map();
  courses.forEach((course) => {
    const credits = Number(course.credits || 0);
    if (course.code) lookup.set(String(course.code).toLowerCase(), credits);
    if (course.name) lookup.set(String(course.name).toLowerCase(), credits);
  });
  return lookup;
};

const dashboard = asyncHandler(async (req, res) => {
  const student = await Student.findOne({ userId: req.user._id }).lean();
  if (!student) {
    return res.status(404).json({ message: 'Student profile not found' });
  }

  const [announcements, attendanceRecords] = await Promise.all([
    Announcement.find({
      $or: [
        { scope: 'GLOBAL' },
        { scope: 'BATCH', batch: `${student.branch}-${student.section}` },
        { scope: 'INDIVIDUAL', studentId: student._id }
      ]
    }).sort({ createdAt: -1 }).limit(10).lean(),
    Attendance.find({ studentId: student._id })
      .select('date status subject')
      .sort({ date: -1, createdAt: -1 })
      .lean()
  ]);

  const marksRecords = await Marks.find({ studentId: student._id })
    .sort({ semester: 1, subject: 1 })
    .lean();

  const completedSubjects = marksRecords.filter((row) => String(row.grade || '').toLowerCase() !== 'fail').length;

  const semesters = [...new Set(marksRecords.map((row) => row.semester).filter(Boolean))].sort((a, b) => a - b);
  const cgpaSummary = await Promise.all(
    semesters.map(async (semester) => {
      const semesterMarks = marksRecords.filter((row) => row.semester === semester);
      const semesterCourses = await Course.find({ semester }).select('code name credits').lean();
      return {
        semester,
        cgpa: calculateCgpa(semesterMarks, buildCreditsLookup(semesterCourses))
      };
    })
  );

  const lastWeekAttendance = attendanceRecords.slice(0, 7).map((record) => {
    const status = isPresentStatus(record.status) ? 'Present' : 'Absent';
    return {
      date: toIsoDate(record.date),
      held: 1,
      attend: status,
      status
    };
  });

  const courseAccumulator = new Map();
  attendanceRecords.forEach((record) => {
    const courseName = (record.subject || 'General').trim() || 'General';
    if (!courseAccumulator.has(courseName)) {
      courseAccumulator.set(courseName, {
        courseName,
        held: 0,
        present: 0,
        absent: 0,
        latestDate: null,
        latestStatus: null
      });
    }

    const row = courseAccumulator.get(courseName);
    const present = isPresentStatus(record.status);
    row.held += 1;
    row.present += present ? 1 : 0;
    row.absent += present ? 0 : 1;
    if (!row.latestDate || new Date(record.date) > new Date(row.latestDate)) {
      row.latestDate = record.date;
      row.latestStatus = present ? 'Present' : 'Absent';
    }
  });

  const courseAttendance = [...courseAccumulator.values()]
    .map((row) => {
      const percentage = row.held > 0 ? (row.present / row.held) * 100 : 0;
      return {
        courseName: row.courseName,
        ltp: '-',
        held: row.held,
        present: row.present,
        absent: row.absent,
        percentage: Number(percentage.toFixed(2)),
        latestStatus: row.latestStatus || '-',
        loss: Number((100 - percentage).toFixed(2))
      };
    })
    .sort((a, b) => a.courseName.localeCompare(b.courseName));

  return res.json({
    student,
    announcements,
    lastWeekAttendance,
    courseAttendance,
    marks: marksRecords,
    cgpaSummary,
    overallCgpa: Number(student.cgpa || 0),
    completedSubjects,
    semesterLabel: student.yearSem || `Semester ${student.semester || '-'}`
  });
});

const attendanceView = asyncHandler(async (req, res) => {
  const student = await Student.findOne({ userId: req.user._id }).lean();
  const attendance = await Attendance.find({ studentId: student._id }).populate('courseId', 'code name').sort({ date: -1 }).limit(100).lean();

  const byCourse = {};
  const last10Days = attendance.filter((entry) => entry.date >= new Date(Date.now() - 10 * 24 * 60 * 60 * 1000));

  attendance.forEach((entry) => {
    const key = String(entry.courseId?._id || entry.courseId);
    if (!byCourse[key]) byCourse[key] = { present: 0, total: 0 };
    byCourse[key].total += 1;
    if (entry.status === 'PRESENT') byCourse[key].present += 1;
  });

  const courseWise = Object.entries(byCourse).map(([courseId, value]) => ({
    course: attendance.find((a) => String(a.courseId?._id || a.courseId) === courseId)?.courseId?.name || courseId,
    present: value.present,
    total: value.total,
    percentage: value.total ? ((value.present / value.total) * 100).toFixed(2) : 0
  }));

  res.render('student/attendance', {
    title: 'Attendance',
    last10Days,
    courseWise,
    calcResult: null
  });
});

const attendanceCalculator = asyncHandler(async (req, res) => {
  const { totalClasses, presentClasses } = req.validated.body;
  const required = classesRequiredFor75(totalClasses, presentClasses);
  const percentage = totalClasses > 0 ? ((presentClasses / totalClasses) * 100).toFixed(2) : '0.00';

  const student = await Student.findOne({ userId: req.user._id }).lean();
  const attendance = await Attendance.find({ studentId: student._id }).sort({ date: -1 }).limit(100).lean();

  res.render('student/attendance', {
    title: 'Attendance',
    last10Days: attendance.slice(0, 10),
    courseWise: [],
    calcResult: { required, percentage }
  });
});

const attendanceReport = asyncHandler(async (req, res) => {
  const student = await Student.findOne({ userId: req.user._id }).populate('userId').lean();
  const attendance = await Attendance.find({ studentId: student._id }).lean();

  const summary = {
    overallPercentage: attendance.length
      ? ((attendance.filter((a) => a.status === 'PRESENT').length / attendance.length) * 100).toFixed(2)
      : 0
  };

  const courseWise = [];
  const pdfBuffer = await generateAttendancePdf({
    studentName: student.userId.fullName,
    courseWise,
    summary
  });

  await sendEmail({
    to: req.user.email,
    subject: 'Attendance Report',
    text: `Your attendance is ${summary.overallPercentage}%`
  });

  await sendWhatsAppMessage({
    phone: '+910000000000',
    message: `Attendance: ${summary.overallPercentage}%`
  });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename=attendance-report.pdf');
  res.send(pdfBuffer);
});

const academics = asyncHandler(async (req, res) => {
  const student = await Student.findOne({ userId: req.user._id }).lean();
  const enrollments = await Enrollment.find({ studentId: student._id }).populate('courseId').lean();
  const availableCourses = await Course.find({ branch: student.branch, semester: student.semester }).lean();
  const results = await Result.find({ studentId: student._id }).sort({ semester: 1 }).lean();
  res.render('student/academics', { title: 'Academics', enrollments, availableCourses, results, student });
});

const resultsData = asyncHandler(async (req, res) => {
  const student = await Student.findOne({ userId: req.user._id }).lean();
  if (!student) {
    return res.status(404).json({ message: 'Student profile not found' });
  }

  const results = await Result.find({ studentId: student._id }).sort({ semester: 1 }).lean();

  return res.json({
    student: {
      name: student.name,
      rollNumber: student.rollNumber,
      branch: student.branch,
      program: student.program
    },
    results
  });
});

const courseRegistrations = asyncHandler(async (req, res) => {
  const student = await Student.findOne({ userId: req.user._id }).lean();
  const enrollments = await Enrollment.find({ studentId: student._id }).populate('courseId').populate('courseId.facultyId').lean();
  
  // Group courses by academic year and semester
  const coursesByYear = {};
  enrollments.forEach(enrollment => {
    const course = enrollment.courseId;
    if (course) {
      const academicYear = student.admissionYear ? `${student.admissionYear}-${student.admissionYear + 1}` : '2025-26';
      const key = `${academicYear}_Sem${course.semester}`;
      
      if (!coursesByYear[key]) {
        coursesByYear[key] = {
          academicYear,
          semester: course.semester,
          courses: []
        };
      }
      
      coursesByYear[key].courses.push({
        code: course.code,
        name: course.name,
        credits: course.credits,
        facultyName: course.facultyId?.fullName || 'TBA'
      });
    }
  });
  
  res.json({
    student: {
      fullName: student.name,
      enrollmentNumber: student.rollNumber,
      degree: `${student.program}-${student.branch}`
    },
    coursesByYear: Object.values(coursesByYear).sort((a, b) => b.semester - a.semester)
  });
});

const registerCourse = asyncHandler(async (req, res) => {
  const student = await Student.findOne({ userId: req.user._id }).lean();
  const { courseId } = req.validated.body;

  const course = await Course.findById(courseId).lean();
  if (course?.branch !== student.branch || course?.semester !== student.semester) {
    return res.status(400).render('errors/400', { title: 'Validation Error', errors: [{ message: 'Invalid course selection' }] });
  }

  await Enrollment.findOneAndUpdate(
    { studentId: student._id, courseId },
    { status: 'REGISTERED' },
    { upsert: true, new: true }
  );
  res.redirect('/student/academics');
});

const editCourseRegistration = asyncHandler(async (req, res) => {
  const student = await Student.findOne({ userId: req.user._id }).lean();
  const { enrollmentId } = req.validated.params;
  const { status } = req.validated.body;

  const enrollment = await Enrollment.findOne({ _id: enrollmentId, studentId: student._id });
  if (!enrollment) {
    return res.status(404).render('errors/404', { title: 'Not Found' });
  }

  enrollment.status = status;
  await enrollment.save();
  res.redirect('/student/academics');
});

const exams = asyncHandler(async (req, res) => {
  const student = await Student.findOne({ userId: req.user._id }).lean();
  const schedules = await ExamSchedule.find({ semester: student.semester, branch: student.branch }).lean();
  const hallTicket = await HallTicket.findOne({ studentId: student._id, semester: student.semester }).lean();
  res.render('student/exams', { title: 'Exams', schedules, hallTicket });
});

const examsData = asyncHandler(async (req, res) => {
  const student = await Student.findOne({ userId: req.user._id }).lean();
  if (!student) {
    return res.status(404).json({ message: 'Student profile not found' });
  }

  const schedules = await ExamSchedule.find({ semester: student.semester, branch: student.branch }).lean();
  const hallTicket = await HallTicket.findOne({ studentId: student._id, semester: student.semester }).lean();
  const feesData = await Fee.find({ studentId: student._id }).sort({ semester: -1, createdAt: -1 }).lean();

  const exams = schedules.flatMap((scheduleDoc) => (scheduleDoc.exams || []).map((exam) => ({
    semester: scheduleDoc.semester,
    branch: scheduleDoc.branch,
    courseCode: exam.courseCode,
    date: exam.date,
    startTime: exam.startTime,
    endTime: exam.endTime,
    venue: exam.venue
  })));

  return res.json({
    student: {
      name: student.name,
      rollNumber: student.rollNumber,
      semester: student.semester,
      branch: student.branch
    },
    exams,
    payments: feesData,
    hallTicket
  });
});

const fees = asyncHandler(async (req, res) => {
  const student = await Student.findOne({ userId: req.user._id }).lean();
  const feesData = await Fee.find({ studentId: student._id }).lean();
  res.render('student/fees', { title: 'Fees', feesData });
});

const feedbackView = asyncHandler(async (req, res) => {
  res.render('student/feedback', { title: 'Feedback' });
});

const submitFeedback = asyncHandler(async (req, res) => {
  const student = await Student.findOne({ userId: req.user._id }).lean();
  await Feedback.create({ ...req.body, studentId: student._id });
  res.redirect('/student/feedback');
});

const leaderboard = asyncHandler(async (req, res) => {
  const ranking = await Student.find({})
    .populate('userId', 'fullName')
    .sort({ alphaCoins: -1, sigmaCoins: -1, penaltyCoins: 1 })
    .limit(20)
    .lean();
  res.render('student/leaderboard', { title: 'Leaderboard', ranking });
});

const files = asyncHandler(async (req, res) => {
  const student = await Student.findOne({ userId: req.user._id }).lean();
  const batch = `${student.branch}-${student.section}`;
  const filesData = await File.find({ batch }).sort({ createdAt: -1 }).lean();
  res.render('student/files', { title: 'Files', filesData });
});

const calendar = asyncHandler(async (req, res) => {
  res.render('student/calendar', { title: 'Academic Calendar' });
});

const profile = asyncHandler(async (req, res) => {
  const student = await Student.findOne({ userId: req.user._id }).populate('userId').lean();
  res.render('student/profile', { title: 'Profile', student });
});

const updateProfileRequest = asyncHandler(async (req, res) => {
  const { branch, section, semester, mentor } = req.validated.body;
  await Student.updateOne(
    { userId: req.user._id },
    {
      profileEditPendingApproval: true,
      pendingProfileData: { branch, section, semester, mentor }
    }
  );
  res.redirect('/student/profile');
});

const updateProfile = asyncHandler(async (req, res) => {
  const student = await Student.findOne({ userId: req.user._id });
  
  if (!student) {
    return res.status(404).json({ message: 'Student profile not found' });
  }

  const alphabetOnlyFields = [
    ['name', 'Student Name'],
    ['fatherName', 'Father Name'],
    ['motherName', 'Mother Name'],
    ['fatherOccupation', 'Father Occupation'],
    ['motherOccupation', 'Mother Occupation']
  ];

  for (const [key, label] of alphabetOnlyFields) {
    if (req.body[key] === undefined || req.body[key] === null || req.body[key] === '') {
      continue;
    }

    const value = String(req.body[key]).trim();
    if (!alphabetOnlyRegex.test(value)) {
      return res.status(400).json({ message: `${label} should contain only alphabets` });
    }
    req.body[key] = value;
  }

  const phoneFields = [
    ['phone', 'Student Mobile Number'],
    ['fatherMobile', 'Father Mobile Number'],
    ['motherMobile', 'Mother Mobile Number'],
    ['alternatePhone', 'Alternate Mobile Number'],
    ['emergencyContact', 'Emergency Contact Number']
  ];

  for (const [key, label] of phoneFields) {
    if (req.body[key] === undefined || req.body[key] === null || req.body[key] === '') {
      continue;
    }

    const value = String(req.body[key]).replaceAll(/\D/g, '');
    if (!mobileRegex.test(value)) {
      return res.status(400).json({ message: `${label} must be exactly 10 digits` });
    }
    req.body[key] = value;
  }

  const updateData = {
    name: req.body.name,
    fatherName: req.body.fatherName,
    fatherOccupation: req.body.fatherOccupation,
    fatherMobile: req.body.fatherMobile,
    motherName: req.body.motherName,
    motherOccupation: req.body.motherOccupation,
    motherMobile: req.body.motherMobile,
    dateOfBirth: req.body.dateOfBirth,
    gender: req.body.gender,
    bloodGroup: req.body.bloodGroup,
    nationality: req.body.nationality,
    email: req.body.email,
    phone: req.body.phone,
    profilePhoto: req.body.profilePhoto,
    alternatePhone: req.body.alternatePhone,
    emergencyContact: req.body.emergencyContact,
    address: req.body.address,
    branch: req.body.branch,
    section: req.body.section,
    batch: req.body.batch,
    yearSem: req.body.yearSem,
    admissionYear: req.body.admissionYear,
    program: req.body.program,
    aadharNumber: req.body.aadharNumber,
    hostelResident: req.body.hostelResident,
    transport: req.body.transport
  };

  // Remove undefined values
  Object.keys(updateData).forEach(key => {
    if (updateData[key] === undefined || updateData[key] === '') {
      delete updateData[key];
    }
  });

  await Student.updateOne({ userId: req.user._id }, updateData);

  const updatedStudent = await Student.findOne({ userId: req.user._id }).lean();
  
  return res.json({
    message: 'Profile updated successfully',
    student: updatedStudent
  });
});

module.exports = {
  dashboard,
  attendanceView,
  attendanceCalculator,
  attendanceReport,
  academics,
  resultsData,
  courseRegistrations,
  registerCourse,
  editCourseRegistration,
  exams,
  examsData,
  fees,
  feedbackView,
  submitFeedback,
  leaderboard,
  files,
  calendar,
  profile,
  updateProfileRequest,
  updateProfile
};
