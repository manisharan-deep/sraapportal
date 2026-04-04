const Marks = require('../models/Marks');
const Staff = require('../models/Staff');
const Student = require('../models/Student');
const Course = require('../models/Course');
const { normalizeMarks, calculateCgpa } = require('../utils/academic');

const toPositiveInt = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

const csvEscape = (value) => `"${String(value ?? '').split('"').join('""')}"`;

const getStaffId = async (userId) => {
  const staff = await Staff.findOne({ userId }).select('_id').lean();
  return staff ? staff._id : null;
};

const uniqueValues = (values = []) => [...new Set(values.filter(Boolean))];

const buildCreditsLookup = (courses = []) => {
  const lookup = new Map();

  courses.forEach((course) => {
    const credits = Number(course.credits || 0);
    if (course.code) lookup.set(String(course.code).toLowerCase(), credits);
    if (course.name) lookup.set(String(course.name).toLowerCase(), credits);
  });

  return lookup;
};

const recalculateStudentSemesterCgpa = async (studentId, semester) => {
  const [marksRows, courses] = await Promise.all([
    Marks.find({ studentId, semester }).lean(),
    Course.find({ semester }).select('code name credits').lean()
  ]);

  const cgpa = calculateCgpa(marksRows, buildCreditsLookup(courses));
  await Marks.updateMany({ studentId, semester }, { $set: { cgpa } });
  await Student.updateOne({ _id: studentId }, { $set: { cgpa } });
  return cgpa;
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
    .filter((r) => r?.studentId && r?.hallTicketNumber)
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
  const studentSemesterPairs = uniqueValues(records.map((record) => `${record.studentId}:${Number(semester)}`));
  await Promise.all(
    studentSemesterPairs.map(async (pair) => {
      const [studentIdValue, semesterValue] = pair.split(':');
      await recalculateStudentSemesterCgpa(studentIdValue, Number(semesterValue));
    })
  );
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

  await recalculateStudentSemesterCgpa(updated.studentId, updated.semester);
  return res.json({ message: 'Marks updated successfully', marks: updated });
};

const getStudentMarks = async (req, res) => {
  const { semester } = req.query;
  const filter = { studentId: req.params.studentId };
  if (semester) filter.semester = Number(semester);

  const [marks, student, semesters] = await Promise.all([
    Marks.find(filter).sort({ semester: 1, subject: 1 }).lean(),
    Student.findById(req.params.studentId).select('_id name cgpa').lean(),
    Marks.distinct('semester', { studentId: req.params.studentId })
  ]);

  const sortedSemesters = semesters.toSorted((a, b) => a - b);
  const cgpaSummary = await Promise.all(
    sortedSemesters.map(async (sem) => {
      const semMarks = await Marks.find({ studentId: req.params.studentId, semester: sem }).lean();
      const courses = await Course.find({ semester: sem }).select('code name credits').lean();
      return {
        semester: sem,
        cgpa: calculateCgpa(semMarks, buildCreditsLookup(courses))
      };
    })
  );

  return res.json({
    student,
    marks,
    cgpaSummary,
    overallCgpa: Number(student?.cgpa || 0)
  });
};

const getCgpa = async (req, res) => {
  const { studentId } = req.params;
  const { semester } = req.query;

  const student = await Student.findById(studentId).select('_id name cgpa branch semester').lean();
  if (!student) {
    return res.status(404).json({ message: 'Student not found' });
  }

  const semesters = semester ? [Number(semester)] : uniqueValues(await Marks.distinct('semester', { studentId }));
  const sortedSemesters = semesters.toSorted((a, b) => a - b);
  const summaries = await Promise.all(
    sortedSemesters.map(async (sem) => {
      const semMarks = await Marks.find({ studentId, semester: sem }).lean();
      const courses = await Course.find({ semester: sem }).select('code name credits').lean();
      return {
        semester: sem,
        cgpa: calculateCgpa(semMarks, buildCreditsLookup(courses))
      };
    })
  );

  return res.json({
    student,
    cgpaSummary: summaries,
    overallCgpa: Number(student.cgpa || 0)
  });
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
  getStudentMarks,
  getCgpa,
  exportMarks,
  getStudentsForMarks
};
