const path = require('path');
const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const Student = require('../src/models/Student');
const Staff = require('../src/models/Staff');
const Attendance = require('../src/models/Attendance');
const Marks = require('../src/models/Marks');
const { SUBJECTS_BY_SEMESTER } = require('../src/config/subjects');

const uri = process.env.MONGO_URI || process.env.MONGODB_URI || process.env.DATABASE_URL;

const gradeFromTotal = (total) => {
  if (total >= 85) return 'A';
  if (total >= 70) return 'B';
  if (total >= 55) return 'C';
  return 'Fail';
};

async function run() {
  if (!uri) throw new Error('Missing MONGO_URI/MONGODB_URI/DATABASE_URL');
  await mongoose.connect(uri);

  const staff = await Staff.findOne({}).select('_id').lean();
  if (!staff) throw new Error('No staff record found. Create one staff user first.');

  const students = await Student.find({ rollNumber: { $exists: true, $ne: '' } }).select('_id name rollNumber branch batch semester').limit(100).lean();
  if (!students.length) throw new Error('No students found to seed sample data.');

  const today = new Date();
  const normalizedDate = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));

  const attendanceOps = [];
  const marksOps = [];

  for (const student of students) {
    const sem = Number(student.semester) || 1;
    const subjects = SUBJECTS_BY_SEMESTER[sem] || SUBJECTS_BY_SEMESTER[1];
    const subject = subjects[0];

    attendanceOps.push({
      updateOne: {
        filter: { studentId: student._id, subject, date: normalizedDate },
        update: {
          $set: {
            studentId: student._id,
            hallTicketNumber: student.rollNumber,
            name: student.name,
            studentName: student.name,
            department: student.branch || 'CSE',
            batch: student.batch || '2022-2026',
            semester: sem,
            subject,
            date: normalizedDate,
            status: Math.random() > 0.15 ? 'Present' : 'Absent',
            facultyId: staff._id,
            markedBy: staff._id
          }
        },
        upsert: true
      }
    });

    const internal = Math.floor(Math.random() * 41);
    const external = Math.floor(Math.random() * 61);
    const assignment = Math.floor(Math.random() * 21);
    const total = internal + external + assignment;

    marksOps.push({
      updateOne: {
        filter: { studentId: student._id, subject, semester: sem },
        update: {
          $set: {
            studentId: student._id,
            hallTicketNumber: student.rollNumber,
            subject,
            semester: sem,
            batch: student.batch || '2022-2026',
            internalMarks: internal,
            externalMarks: external,
            assignmentMarks: assignment,
            totalMarks: total,
            grade: gradeFromTotal(total),
            facultyId: staff._id
          }
        },
        upsert: true
      }
    });
  }

  if (attendanceOps.length) await Attendance.bulkWrite(attendanceOps);
  if (marksOps.length) await Marks.bulkWrite(marksOps);

  console.log(`Seed complete for ${students.length} students.`);
  console.log(`Attendance rows upserted: ${attendanceOps.length}`);
  console.log(`Marks rows upserted: ${marksOps.length}`);

  await mongoose.disconnect();
}

run().catch(async (error) => {
  console.error(error.message);
  try { await mongoose.disconnect(); } catch (_) {}
  process.exit(1);
});
