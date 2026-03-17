const Marks = require('../models/Marks');
const Staff = require('../models/Staff');
const Student = require('../models/Student');

const toPositiveInt = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

const csvEscape = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;

const getStaffId = async (userId) => {
  const staff = await Staff.findOne({ userId }).select('_id').lean();
  return staff ? staff._id : null;
};

const calculateGrade = (totalMarks) => {
  if (totalMarks >= 85) return 'A';
  if (totalMarks >= 70) return 'B';
  if (totalMarks >= 55) return 'C';
  return 'Fail';
};

const normalizeMarks = ({ internalMarks = 0, externalMarks = 0, assignmentMarks = 0 }) => {
  const internal = Number(internalMarks) || 0;
  const external = Number(externalMarks) || 0;
  const assignment = Number(assignmentMarks) || 0;
  const total = internal + external + assignment;
  return {
    internalMarks: internal,
    externalMarks: external,
    assignmentMarks: assignment,
    totalMarks: total,
    grade: calculateGrade(total)
  };
};

const addMarks = async (req, res) => {
  const {
    batch,
    subject,
    semester,
    records
  } = req.body;

  if (!batch || !subject || !semester || !Array.isArray(records) || !records.length) {
    return res.status(400).json({ message: 'batch, subject, semester and records[] are required' });
  }

  const facultyId = await getStaffId(req.user._id);
  if (!facultyId) return res.status(404).json({ message: 'Staff profile not found' });

  const ops = records
    .filter((r) => r && r.studentId && r.hallTicketNumber)
    .map((record) => {
      const computed = normalizeMarks(record);
      return {
        updateOne: {
          filter: {
            studentId: record.studentId,
            subject: String(subject).trim(),
            semester: Number(semester)
          },
          update: {
            $set: {
              studentId: record.studentId,
              hallTicketNumber: String(record.hallTicketNumber).trim(),
              subject: String(subject).trim(),
              semester: Number(semester),
              batch: String(batch).trim(),
              internalMarks: computed.internalMarks,
              externalMarks: computed.externalMarks,
              assignmentMarks: computed.assignmentMarks,
              totalMarks: computed.totalMarks,
              grade: computed.grade,
              facultyId
            }
          },
          upsert: true
        }
      };
    });

  if (!ops.length) {
    return res.status(400).json({ message: 'No valid marks records provided' });
  }

  await Marks.bulkWrite(ops);
  return res.status(200).json({ message: `Marks saved for ${ops.length} student(s)` });
};

const getMarks = async (req, res) => {
  const {
    batch,
    semester,
    subject,
    search = '',
    page = 1,
    limit = 50
  } = req.query;

  const filter = {};
  if (batch) filter.batch = String(batch).trim();
  if (semester) filter.semester = Number(semester);
  if (subject) filter.subject = String(subject).trim();
  if (search) filter.hallTicketNumber = { $regex: String(search).trim(), $options: 'i' };

  const safePage = toPositiveInt(page, 1);
  const safeLimit = Math.min(toPositiveInt(limit, 50), 100);

  const [total, marks] = await Promise.all([
    Marks.countDocuments(filter),
    Marks.find(filter)
      .sort({ hallTicketNumber: 1 })
      .skip((safePage - 1) * safeLimit)
      .limit(safeLimit)
      .lean()
  ]);

  return res.json({
    marks,
    pagination: {
      page: safePage,
      limit: safeLimit,
      total,
      totalPages: Math.max(1, Math.ceil(total / safeLimit))
    }
  });
};

const updateMarks = async (req, res) => {
  const { marksId, studentId, subject, semester, internalMarks, externalMarks, assignmentMarks } = req.body;

  let filter = null;
  if (marksId) {
    filter = { _id: marksId };
  } else if (studentId && subject && semester) {
    filter = { studentId, subject: String(subject).trim(), semester: Number(semester) };
  } else {
    return res.status(400).json({ message: 'Provide marksId OR (studentId, subject, semester)' });
  }

  const facultyId = await getStaffId(req.user._id);
  if (!facultyId) return res.status(404).json({ message: 'Staff profile not found' });

  const computed = normalizeMarks({ internalMarks, externalMarks, assignmentMarks });

  const updated = await Marks.findOneAndUpdate(
    filter,
    {
      $set: {
        internalMarks: computed.internalMarks,
        externalMarks: computed.externalMarks,
        assignmentMarks: computed.assignmentMarks,
        totalMarks: computed.totalMarks,
        grade: computed.grade,
        facultyId
      }
    },
    { new: true }
  ).lean();

  if (!updated) return res.status(404).json({ message: 'Marks record not found' });
  return res.json({ message: 'Marks updated successfully', marks: updated });
};

const exportMarks = async (req, res) => {
  const { batch, semester, subject } = req.query;
  const filter = {};
  if (batch) filter.batch = String(batch).trim();
  if (semester) filter.semester = Number(semester);
  if (subject) filter.subject = String(subject).trim();

  const rows = await Marks.find(filter)
    .select('hallTicketNumber subject semester batch internalMarks externalMarks assignmentMarks totalMarks grade createdAt')
    .sort({ hallTicketNumber: 1 })
    .lean();

  const header = ['HallTicketNumber', 'Subject', 'Semester', 'Batch', 'Internal', 'External', 'Assignment', 'Total', 'Grade', 'CreatedAt'];
  const csv = [
    header.join(','),
    ...rows.map((row) => [
      csvEscape(row.hallTicketNumber),
      csvEscape(row.subject),
      csvEscape(row.semester),
      csvEscape(row.batch),
      csvEscape(row.internalMarks),
      csvEscape(row.externalMarks),
      csvEscape(row.assignmentMarks),
      csvEscape(row.totalMarks),
      csvEscape(row.grade),
      csvEscape(new Date(row.createdAt).toISOString())
    ].join(','))
  ].join('\n');

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename=marks-${Date.now()}.csv`);
  return res.status(200).send(csv);
};

const getStudentsForMarks = async (req, res) => {
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

module.exports = {
  addMarks,
  getMarks,
  updateMarks,
  exportMarks,
  getStudentsForMarks
};
