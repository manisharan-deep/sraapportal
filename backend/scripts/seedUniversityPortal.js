const dotenv = require('dotenv');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const path = require('node:path');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const { connectDatabase } = require('../src/config/database');
const User = require('../src/models/User');
const Staff = require('../src/models/Staff');
const Student = require('../src/models/Student');
const Course = require('../src/models/Course');
const Attendance = require('../src/models/Attendance');
const Marks = require('../src/models/Marks');

async function upsertUser({ fullName, role, email, password, username, enrollmentNumber }) {
  const passwordHash = await bcrypt.hash(password, 12);
  return User.findOneAndUpdate(
    { email },
    {
      fullName,
      role,
      email,
      password: passwordHash,
      username,
      enrollmentNumber,
      isActive: true
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
}

async function main() {
  await connectDatabase();

  const samplePassword = process.env.SEED_PORTAL_PASSWORD;
  if (!samplePassword) {
    throw new Error('Missing required env variable: SEED_PORTAL_PASSWORD');
  }

  await upsertUser({
    fullName: 'Portal Admin',
    role: 'ADMIN',
    email: 'admin@university.local',
    password: samplePassword,
    username: 'admin'
  });

  const teacherUser = await upsertUser({
    fullName: 'Dr. Anita Rao',
    role: 'STAFF',
    email: 'teacher@university.local',
    password: samplePassword,
    username: 'teacher1'
  });

  const studentUser = await upsertUser({
    fullName: 'Karan Kumar',
    role: 'STUDENT',
    email: 'student@university.local',
    password: samplePassword,
    enrollmentNumber: 'SRU2025001'
  });

  const [teacherStaff, studentProfile] = await Promise.all([
    Staff.findOneAndUpdate(
      { userId: teacherUser._id },
      { userId: teacherUser._id, department: 'CSE', designation: 'Assistant Professor' },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ),
    Student.findOneAndUpdate(
      { userId: studentUser._id },
      {
        userId: studentUser._id,
        name: 'Karan Kumar',
        rollNumber: 'SRU2025001',
        branch: 'CSE',
        section: 'A',
        batch: 'CSE-A-2025',
        semester: 3,
        program: 'BTECH',
        attendancePercentage: 92.5,
        cgpa: 8.4,
        phone: '9876543210',
        fatherMobile: '9123456789',
        motherMobile: '9012345678'
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    )
  ]);

  const course = await Course.findOneAndUpdate(
    { code: 'CS301' },
    {
      code: 'CS301',
      name: 'Data Structures and Algorithms',
      branch: 'CSE',
      semester: 3,
      credits: 4,
      facultyId: teacherStaff._id
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  await Attendance.findOneAndUpdate(
    { studentId: studentProfile._id, subject: course.name, date: new Date('2026-04-01T00:00:00.000Z') },
    {
      studentId: studentProfile._id,
      hallTicketNumber: studentProfile.rollNumber,
      name: studentProfile.name,
      studentName: studentProfile.name,
      department: studentProfile.branch,
      batch: studentProfile.batch,
      semester: studentProfile.semester,
      subject: course.name,
      date: new Date('2026-04-01T00:00:00.000Z'),
      status: 'Present',
      facultyId: teacherStaff._id,
      markedBy: teacherStaff._id
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  await Marks.findOneAndUpdate(
    { studentId: studentProfile._id, subject: course.name, semester: studentProfile.semester },
    {
      studentId: studentProfile._id,
      hallTicketNumber: studentProfile.rollNumber,
      subject: course.name,
      semester: studentProfile.semester,
      batch: studentProfile.batch,
      internalMarks: 34,
      externalMarks: 51,
      assignmentMarks: 16,
      totalMarks: 101,
      grade: 'A+',
      cgpa: 9,
      facultyId: teacherStaff._id
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  console.log('Sample data seeded successfully');
  await mongoose.connection.close();
}

main().catch(async (error) => {
  console.error(error);
  await mongoose.connection.close();
  process.exit(1);
});
