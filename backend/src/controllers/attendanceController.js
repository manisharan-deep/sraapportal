const Attendance = require('../models/Attendance');
const Staff = require('../models/Staff');
const Student = require('../models/Student');
const Course = require('../models/Course');
const mongoose = require('mongoose');
const { attendanceSmsQueue } = require('../queues/attendanceSmsQueue');
const logger = require('../utils/logger');
const { sendAttendanceSms } = require('../services/smsService');

const normalizeDate = (dateInput) => {
  const dt = new Date(dateInput);
  if (Number.isNaN(dt.getTime())) return null;
  return new Date(Date.UTC(dt.getUTCFullYear(), dt.getUTCMonth(), dt.getUTCDate()));
};

const toPositiveInt = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

const getStaffId = async (userId) => {
  const staff = await Staff.findOne({ userId }).select('_id').lean();
  return staff ? staff._id : null;
};

const csvEscape = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;

const toObjectId = (value) => {
  try {
    return new mongoose.Types.ObjectId(String(value));
  } catch (_error) {
    return null;
  }
};

const recalculateStudentAttendancePercentages = async (studentIds = []) => {
  const objectIds = [...new Set(studentIds.map(toObjectId).filter(Boolean).map(String))]
    .map((id) => new mongoose.Types.ObjectId(id));

  if (!objectIds.length) return;

  const stats = await Attendance.aggregate([
    { $match: { studentId: { $in: objectIds } } },
    {
      $group: {
        _id: '$studentId',
        totalClasses: { $sum: 1 },
        presentCount: {
          $sum: {
            $cond: [{ $eq: [{ $toLower: '$status' }, 'present'] }, 1, 0]
          }
        }
      }
    }
  ]);

  const percentByStudent = new Map(
    stats.map((row) => {
      const percentage = row.totalClasses > 0 ? (row.presentCount / row.totalClasses) * 100 : 0;
      return [String(row._id), Number(percentage.toFixed(2))];
    })
  );

  await Student.bulkWrite(
    objectIds.map((studentId) => ({
      updateOne: {
        filter: { _id: studentId },
        update: { $set: { attendancePercentage: percentByStudent.get(String(studentId)) ?? 0 } }
      }
    }))
  );
};

const normalizeStatus = (value) => {
  const status = String(value || '').trim().toLowerCase();
  if (status === 'present') return 'Present';
  if (status === 'absent') return 'Absent';
  return null;
};

const sanitizeHallticket = (value) => String(value || '').trim().toUpperCase();

const escapeRegex = (value) => String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const buildDepartmentFilter = (department) => {
  const raw = String(department || '').trim();
  if (!raw) return null;
  if (raw.toUpperCase().includes('AIML')) {
    return { $regex: 'AIML', $options: 'i' };
  }
  return { $regex: `^${escapeRegex(raw)}$`, $options: 'i' };
};

const isDuplicateKeyError = (error) => error && (error.code === 11000 || String(error.message || '').includes('E11000'));

const enqueueAttendanceSms = async (payload) => {
  try {
    await attendanceSmsQueue.add(payload, {
      delay: 0,
      timeout: 60000
    });
    return { queued: true };
  } catch (error) {
    logger.error('Attendance SMS queue enqueue failed', {
      studentId: payload.studentId,
      error: error.message
    });
    return { queued: false, reason: error.message };
  }
};

const sendAttendanceSmsDirect = async ({ studentId, studentName, status, date }) => {
  const studentProfile = await Student.findById(studentId)
    .select('name phone studentPhone parentPhone fatherMobile motherMobile')
    .lean();

  if (!studentProfile) {
    return { skipped: true, reason: 'Student profile not found for direct SMS' };
  }

  const recipients = [
    studentProfile.studentPhone,
    studentProfile.phone,
    studentProfile.parentPhone,
    studentProfile.fatherMobile,
    studentProfile.motherMobile
  ].filter(Boolean);

  if (!recipients.length) {
    return { skipped: true, reason: 'No student/parent mobile numbers found' };
  }

  const smsText = `Attendance Alert: ${studentName || studentProfile.name} was marked ${status} on ${new Date(date).toISOString().split('T')[0]}.`;

  return sendAttendanceSms({
    studentName: studentName || studentProfile.name,
    status,
    date,
    recipients,
    customMessage: smsText
  });
};

const syncStudentAttendanceHistory = async ({ studentId, subject, date, status }) => {
  await Student.updateOne(
    { _id: studentId },
    {
      $pull: {
        attendance: {
          subject: String(subject).trim(),
          date
        }
      }
    }
  );

  await Student.updateOne(
    { _id: studentId },
    {
      $addToSet: {
        attendance: {
          subject: String(subject).trim(),
          date,
          status
        }
      }
    }
  );
};

const listStudents = async (req, res) => {
  const {
    batch,
    department,
    semester,
    search = '',
    page = 1,
    limit = 25
  } = req.query;

  const filter = {};
  if (batch) filter.batch = String(batch).trim();
  if (department) filter.branch = String(department).trim();
  if (semester) filter.semester = Number(semester);
  if (search) {
    const regex = { $regex: String(search).trim(), $options: 'i' };
    filter.$or = [{ name: regex }, { rollNumber: regex }];
  }

  const safePage = toPositiveInt(page, 1);
  const safeLimit = Math.min(toPositiveInt(limit, 25), 100);

  const [total, students] = await Promise.all([
    Student.countDocuments(filter),
    Student.find(filter)
      .select('_id name rollNumber section batch semester branch')
      .sort({ rollNumber: 1 })
      .skip((safePage - 1) * safeLimit)
      .limit(safeLimit)
      .lean()
  ]);

  return res.json({
    students: students.map((s) => ({
      studentId: s._id,
      fullName: s.name,
      hallTicketNumber: s.rollNumber,
      section: s.section || '',
      batch: s.batch || '',
      semester: s.semester || null,
      department: s.branch || ''
    })),
    pagination: {
      page: safePage,
      limit: safeLimit,
      total,
      totalPages: Math.max(1, Math.ceil(total / safeLimit))
    }
  });
};

const markBulkAttendance = async (req, res) => {
  const { academicYear = '', batch, semester, department, subject, date, records } = req.body;

  if (!batch || !subject || !date || !Array.isArray(records) || !records.length) {
    return res.status(400).json({
      message: 'batch, subject, date and records[] are required'
    });
  }

  const normalizedDate = normalizeDate(date);
  if (!normalizedDate) {
    return res.status(400).json({ message: 'Invalid date format' });
  }

  const facultyId = await getStaffId(req.user._id);
  if (!facultyId) {
    return res.status(404).json({ message: 'Staff profile not found' });
  }

  const studentIds = records.map((r) => r && r.studentId).filter(Boolean);
  const studentDocs = studentIds.length
    ? await Student.find({ _id: { $in: studentIds } })
      .select('_id name rollNumber branch semester batch phone studentPhone parentPhone fatherMobile motherMobile')
      .lean()
    : [];
  const studentById = new Map(studentDocs.map((s) => [String(s._id), s]));

  const ops = records
    .filter((r) => r && r.studentId && r.status)
    .map((record) => {
      const dbStudent = studentById.get(String(record.studentId));
      const studentName = String(record.name || record.studentName || dbStudent?.name || '').trim();
      const hallTicket = String(record.hallTicketNumber || dbStudent?.rollNumber || '').trim();
      const recordDepartment = String(department || record.department || dbStudent?.branch || '').trim();
      const recordBatch = String(batch || record.batch || dbStudent?.batch || '').trim();
      const recordSemester = Number(semester || record.semester || dbStudent?.semester || 1);

      if (!studentName || !hallTicket || !recordDepartment || !recordBatch) return null;

      return {
        updateOne: {
          filter: {
            studentId: record.studentId,
            subject: String(subject).trim(),
            date: normalizedDate
          },
          update: {
            $set: {
              studentId: record.studentId,
              hallTicketNumber: hallTicket,
              name: studentName,
              studentName,
              department: recordDepartment,
              batch: recordBatch,
              semester: recordSemester,
              subject: String(subject).trim(),
              date: normalizedDate,
              status: record.status,
              facultyId,
              markedBy: facultyId,
              academicYear: String(academicYear || '').trim()
            }
          },
          upsert: true
        }
      };
    })
    .filter(Boolean);

  if (!ops.length) {
    return res.status(400).json({ message: 'No valid attendance records provided' });
  }

  await Attendance.bulkWrite(ops);

  await Promise.all(
    ops.map((op) => syncStudentAttendanceHistory({
      studentId: op.updateOne.filter.studentId,
      subject: op.updateOne.filter.subject,
      date: op.updateOne.filter.date,
      status: op.updateOne.update.$set.status
    }))
  );

  const queueResults = await Promise.all(
    ops.map((op) => enqueueAttendanceSms({
      studentId: String(op.updateOne.filter.studentId),
      studentName: op.updateOne.update.$set.studentName,
      status: op.updateOne.update.$set.status,
      date: op.updateOne.filter.date
    }))
  );

  const fallbackTargets = ops
    .map((op, idx) => ({
      op,
      queue: queueResults[idx]
    }))
    .filter((row) => !row.queue.queued);

  const directSmsResults = await Promise.all(
    fallbackTargets.map(async (row) => {
      try {
        return await sendAttendanceSmsDirect({
          studentId: String(row.op.updateOne.filter.studentId),
          studentName: row.op.updateOne.update.$set.studentName,
          status: row.op.updateOne.update.$set.status,
          date: row.op.updateOne.filter.date
        });
      } catch (error) {
        logger.error('Direct SMS fallback failed', {
          studentId: String(row.op.updateOne.filter.studentId),
          error: error.message
        });
        return { skipped: true, reason: error.message };
      }
    })
  );

  await recalculateStudentAttendancePercentages(ops.map((op) => op.updateOne.filter.studentId));
  return res.status(200).json({
    message: `Attendance saved for ${ops.length} student(s)`,
    updatedCount: ops.length,
    sms: {
      queued: queueResults.filter((row) => row.queued).length,
      failedToQueue: queueResults.filter((row) => !row.queued).length,
      directFallbackAttempted: fallbackTargets.length,
      directFallbackSent: directSmsResults.reduce((sum, row) => sum + (Array.isArray(row.sent) ? row.sent.length : 0), 0),
      directFallbackFailed: directSmsResults.reduce((sum, row) => sum + (Array.isArray(row.failed) ? row.failed.length : 0), 0),
      status: 'async_dispatch_attempted'
    }
  });
};

const markAttendance = async (req, res) => {
  const { studentId, hallticket, batch, department, subject, status, date } = req.body;

  const normalizedHallticket = sanitizeHallticket(hallticket);
  const normalizedBatch = String(batch || '').trim();
  const normalizedDepartment = String(department || '').trim();
  const normalizedSubject = String(subject || '').trim();
  const normalizedStatus = normalizeStatus(status);
  const normalizedDate = normalizeDate(date || new Date());

  if ((!studentId && !normalizedHallticket) || !normalizedSubject || !normalizedStatus || !normalizedDate) {
    return res.status(400).json({
      message: 'studentId or hallticket, subject, status (Present/Absent), and a valid date are required'
    });
  }

  const facultyId = await getStaffId(req.user._id);
  if (!facultyId) {
    return res.status(404).json({ message: 'Staff profile not found' });
  }

  let students = [];
  if (studentId) {
    const studentById = await Student.findById(studentId)
      .select('_id name rollNumber hallticket branch semester batch phone studentPhone fatherMobile motherMobile parentPhone subjects')
      .lean();
    students = studentById ? [studentById] : [];
  } else {
    const studentFilter = {
      $or: normalizedHallticket
        ? [
            { hallticket: { $regex: `^${escapeRegex(normalizedHallticket)}$`, $options: 'i' } },
            { rollNumber: { $regex: `^${escapeRegex(normalizedHallticket)}$`, $options: 'i' } }
          ]
        : []
    };
    if (normalizedBatch) studentFilter.batch = normalizedBatch;
    const departmentFilter = buildDepartmentFilter(normalizedDepartment);
    if (departmentFilter) studentFilter.branch = departmentFilter;

    students = await Student.find(studentFilter)
      .select('_id name rollNumber hallticket branch semester batch phone studentPhone fatherMobile motherMobile parentPhone subjects')
      .limit(2)
      .lean();
  }

  if (!students.length) {
    return res.status(404).json({ message: 'Student not found for provided details' });
  }

  if (!studentId && !normalizedBatch && !normalizedDepartment && students.length > 1) {
    return res.status(400).json({
      message: 'Multiple students found for hallticket. Please select department or batch.'
    });
  }

  const student = students[0];

  if (!student) {
    return res.status(404).json({ message: 'Student not found for provided hallticket and batch' });
  }

  const alreadyExists = await Attendance.findOne({
    studentId: student._id,
    subject: normalizedSubject,
    date: normalizedDate
  })
    .select('_id')
    .lean();

  if (alreadyExists) {
    return res.status(409).json({
      message: 'Attendance already marked for this subject and date'
    });
  }

  let attendanceRecord;
  try {
    attendanceRecord = await Attendance.create({
      studentId: student._id,
      hallTicketNumber: student.rollNumber || student.hallticket || normalizedHallticket,
      name: student.name,
      studentName: student.name,
      department: student.branch || normalizedDepartment || 'GENERAL',
      batch: student.batch || normalizedBatch || '',
      semester: Number(student.semester || 1),
      subject: normalizedSubject,
      date: normalizedDate,
      status: normalizedStatus,
      facultyId,
      markedBy: facultyId
    });
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      return res.status(409).json({ message: 'Attendance already marked for this subject and date' });
    }
    throw error;
  }

  await syncStudentAttendanceHistory({
    studentId: student._id,
    subject: normalizedSubject,
    date: normalizedDate,
    status: normalizedStatus
  });

  await recalculateStudentAttendancePercentages([student._id]);

  const queueResult = await enqueueAttendanceSms(
    {
      studentId: String(student._id),
      studentName: student.name,
      status: normalizedStatus,
      date: normalizedDate
    }
  );

  let fallbackSummary = null;
  if (!queueResult.queued) {
    try {
      const directResult = await sendAttendanceSmsDirect({
        studentId: String(student._id),
        studentName: student.name,
        status: normalizedStatus,
        date: normalizedDate
      });
      fallbackSummary = {
        sent: Array.isArray(directResult.sent) ? directResult.sent.length : 0,
        failed: Array.isArray(directResult.failed) ? directResult.failed.length : 0,
        skipped: Boolean(directResult.skipped)
      };
    } catch (error) {
      logger.error('Direct SMS fallback failed', { studentId: String(student._id), error: error.message });
      fallbackSummary = { sent: 0, failed: 0, skipped: true };
    }
  }

  return res.status(201).json({
    message: 'Attendance saved successfully',
    attendance: attendanceRecord,
    sms: {
      queued: queueResult.queued,
      fallback: fallbackSummary,
      status: queueResult.queued ? 'queued_for_async_dispatch' : 'queue_unavailable_fallback_attempted'
    }
  });
};

const getStudentAttendanceHistory = async (req, res) => {
  const { studentId, hallticket, batch, department, subject, page = 1, limit = 20 } = req.query;
  const normalizedHallticket = sanitizeHallticket(hallticket);
  const normalizedBatch = String(batch || '').trim();
  const normalizedDepartment = String(department || '').trim();

  if (!studentId && !normalizedHallticket) {
    return res.status(400).json({ message: 'studentId or hallticket is required' });
  }

  let students = [];
  if (studentId) {
    const studentById = await Student.findById(studentId)
      .select('_id name rollNumber hallticket batch')
      .lean();
    students = studentById ? [studentById] : [];
  } else {
    const studentFilter = {
      $or: [
        { hallticket: { $regex: `^${escapeRegex(normalizedHallticket)}$`, $options: 'i' } },
        { rollNumber: { $regex: `^${escapeRegex(normalizedHallticket)}$`, $options: 'i' } }
      ]
    };
    if (normalizedBatch) studentFilter.batch = normalizedBatch;
    const departmentFilter = buildDepartmentFilter(normalizedDepartment);
    if (departmentFilter) studentFilter.branch = departmentFilter;

    students = await Student.find(studentFilter)
      .select('_id name rollNumber hallticket batch')
      .limit(2)
      .lean();
  }

  if (!students.length) {
    return res.status(404).json({ message: 'Student not found for provided details' });
  }

  if (!studentId && !normalizedBatch && !normalizedDepartment && students.length > 1) {
    return res.status(400).json({ message: 'Multiple students found. Select department or batch to load history.' });
  }

  const student = students[0];

  const query = { studentId: student._id };
  if (subject) query.subject = String(subject).trim();

  const safePage = toPositiveInt(page, 1);
  const safeLimit = Math.min(toPositiveInt(limit, 20), 100);

  const [total, history] = await Promise.all([
    Attendance.countDocuments(query),
    Attendance.find(query)
      .select('subject date status batch hallTicketNumber createdAt')
      .sort({ date: -1, createdAt: -1 })
      .skip((safePage - 1) * safeLimit)
      .limit(safeLimit)
      .lean()
  ]);

  return res.json({
    student: {
      studentId: student._id,
      name: student.name,
      hallticket: student.hallticket || student.rollNumber,
      batch: student.batch
    },
    attendance: history,
    pagination: {
      page: safePage,
      limit: safeLimit,
      total,
      totalPages: Math.max(1, Math.ceil(total / safeLimit))
    }
  });
};

const getAttendanceStudentOptions = async (req, res) => {
  const { batch, hallticket, department } = req.query;
  const filter = {};
  if (batch) filter.batch = String(batch).trim();
  if (department) {
    const departmentFilter = buildDepartmentFilter(String(department).trim());
    if (departmentFilter) filter.branch = departmentFilter;
  }
  if (hallticket) {
    const normalizedHallticket = sanitizeHallticket(hallticket);
    filter.$or = [
      { rollNumber: { $regex: `^${escapeRegex(normalizedHallticket)}$`, $options: 'i' } },
      { hallticket: { $regex: `^${escapeRegex(normalizedHallticket)}$`, $options: 'i' } }
    ];
  }

  const students = await Student.find(filter)
    .select('name rollNumber hallticket batch branch semester subjects')
    .sort({ rollNumber: 1 })
    .limit(200)
    .lean();

  const batchOptions = [...new Set(students.map((s) => s.batch).filter(Boolean))].sort();
  const departmentOptions = [...new Set(students.map((s) => s.branch).filter(Boolean))].sort();

  let subjectOptions = [...new Set(students.flatMap((s) => Array.isArray(s.subjects) ? s.subjects : []).filter(Boolean))].sort();

  if (!subjectOptions.length && students.length) {
    const branchValues = [...new Set(students.map((s) => s.branch).filter(Boolean))];
    const semValues = [...new Set(students.map((s) => Number(s.semester)).filter(Boolean))];
    const courseFilter = {};
    if (branchValues.length) courseFilter.branch = { $in: branchValues };
    if (semValues.length) courseFilter.semester = { $in: semValues };
    const courses = await Course.find(courseFilter).select('name').lean();
    subjectOptions = [...new Set(courses.map((course) => course.name).filter(Boolean))].sort();
  }

  return res.json({
    departments: departmentOptions,
    batches: batchOptions,
    subjects: subjectOptions,
    students: students.map((student) => ({
      name: student.name,
      hallticket: student.hallticket || student.rollNumber,
      batch: student.batch,
      branch: student.branch,
      semester: student.semester,
      subjects: Array.isArray(student.subjects) ? student.subjects : []
    }))
  });
};

const getAttendance = async (req, res) => {
  const { batch, semester, department, date, subject, search = '', page = 1, limit = 50 } = req.query;

  const filter = {};
  if (batch) filter.batch = String(batch).trim();
  if (semester) filter.semester = Number(semester);
  if (department) filter.department = String(department).trim();
  if (subject) filter.subject = String(subject).trim();
  if (date) {
    const normalizedDate = normalizeDate(date);
    if (!normalizedDate) {
      return res.status(400).json({ message: 'Invalid date format' });
    }
    filter.date = normalizedDate;
  }
  if (search) {
    filter.hallTicketNumber = { $regex: String(search).trim(), $options: 'i' };
  }

  const safePage = toPositiveInt(page, 1);
  const safeLimit = Math.min(toPositiveInt(limit, 50), 100);

  const [total, attendance] = await Promise.all([
    Attendance.countDocuments(filter),
    Attendance.find(filter)
      .select('studentId hallTicketNumber name department batch semester subject date status facultyId createdAt updatedAt')
      .sort({ hallTicketNumber: 1 })
      .skip((safePage - 1) * safeLimit)
      .limit(safeLimit)
      .lean()
  ]);

  return res.json({
    attendance,
    pagination: {
      page: safePage,
      limit: safeLimit,
      total,
      totalPages: Math.max(1, Math.ceil(total / safeLimit))
    }
  });
};

const updateAttendance = async (req, res) => {
  const { attendanceId, studentId, subject, date, status } = req.body;
  if (!status) {
    return res.status(400).json({ message: 'status is required' });
  }

  let filter = null;
  if (attendanceId) {
    filter = { _id: attendanceId };
  } else if (studentId && subject && date) {
    const normalizedDate = normalizeDate(date);
    if (!normalizedDate) return res.status(400).json({ message: 'Invalid date format' });
    filter = { studentId, subject: String(subject).trim(), date: normalizedDate };
  } else {
    return res.status(400).json({
      message: 'Provide attendanceId OR (studentId, subject, date)'
    });
  }

  const facultyId = await getStaffId(req.user._id);
  if (!facultyId) {
    return res.status(404).json({ message: 'Staff profile not found' });
  }

  const updated = await Attendance.findOneAndUpdate(
    filter,
    { $set: { status, facultyId, markedBy: facultyId } },
    { new: true }
  ).lean();

  if (!updated) return res.status(404).json({ message: 'Attendance record not found' });
  await recalculateStudentAttendancePercentages([updated.studentId]);
  return res.json({ message: 'Attendance updated successfully', attendance: updated });
};

const getAttendancePercentage = async (req, res) => {
  const { batch, semester, subject, department } = req.query;

  const filter = {};
  if (batch) filter.batch = String(batch).trim();
  if (semester) filter.semester = Number(semester);
  if (subject) filter.subject = String(subject).trim();
  if (department) filter.department = String(department).trim();

  const stats = await Attendance.aggregate([
    { $match: filter },
    {
      $group: {
        _id: {
          studentId: '$studentId',
          hallTicketNumber: '$hallTicketNumber',
          name: '$name'
        },
        totalClasses: { $sum: 1 },
        presentCount: {
          $sum: {
            $cond: [{ $eq: [{ $toLower: '$status' }, 'present'] }, 1, 0]
          }
        }
      }
    },
    {
      $project: {
        _id: 0,
        studentId: '$_id.studentId',
        hallTicketNumber: '$_id.hallTicketNumber',
        name: '$_id.name',
        totalClasses: 1,
        presentCount: 1,
        percentage: {
          $round: [
            {
              $multiply: [
                { $divide: ['$presentCount', { $cond: [{ $eq: ['$totalClasses', 0] }, 1, '$totalClasses'] }] },
                100
              ]
            },
            2
          ]
        }
      }
    },
    { $sort: { hallTicketNumber: 1 } }
  ]);

  return res.json({ percentages: stats });
};

const exportAttendance = async (req, res) => {
  const { batch, semester, date, subject, department } = req.query;
  const filter = {};
  if (batch) filter.batch = String(batch).trim();
  if (semester) filter.semester = Number(semester);
  if (department) filter.department = String(department).trim();
  if (subject) filter.subject = String(subject).trim();
  if (date) {
    const normalizedDate = normalizeDate(date);
    if (!normalizedDate) return res.status(400).json({ message: 'Invalid date format' });
    filter.date = normalizedDate;
  }

  const rows = await Attendance.find(filter)
    .select('hallTicketNumber name department batch semester subject date status createdAt')
    .sort({ hallTicketNumber: 1 })
    .lean();

  const header = ['HallTicketNumber', 'Name', 'Department', 'Batch', 'Semester', 'Subject', 'Date', 'Status', 'CreatedAt'];
  const csv = [
    header.join(','),
    ...rows.map((row) => [
      csvEscape(row.hallTicketNumber),
      csvEscape(row.name),
      csvEscape(row.department),
      csvEscape(row.batch),
      csvEscape(row.semester),
      csvEscape(row.subject),
      csvEscape(new Date(row.date).toISOString().split('T')[0]),
      csvEscape(row.status),
      csvEscape(new Date(row.createdAt).toISOString())
    ].join(','))
  ].join('\n');

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename=attendance-${Date.now()}.csv`);
  return res.status(200).send(csv);
};

module.exports = {
  listStudents,
  markAttendance,
  markBulkAttendance,
  getStudentAttendanceHistory,
  getAttendanceStudentOptions,
  getAttendance,
  updateAttendance,
  getAttendancePercentage,
  exportAttendance
};
