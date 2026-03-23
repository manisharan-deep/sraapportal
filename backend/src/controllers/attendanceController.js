const Attendance = require('../models/Attendance');
const Staff = require('../models/Staff');
const Student = require('../models/Student');
const mongoose = require('mongoose');

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
      .select('_id name rollNumber branch semester batch')
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
  await recalculateStudentAttendancePercentages(ops.map((op) => op.updateOne.filter.studentId));
  return res.status(200).json({
    message: `Attendance saved for ${ops.length} student(s)`,
    updatedCount: ops.length
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
  markBulkAttendance,
  getAttendance,
  updateAttendance,
  getAttendancePercentage,
  exportAttendance
};
