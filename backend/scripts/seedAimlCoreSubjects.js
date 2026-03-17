const path = require('path');
const mongoose = require('mongoose');
const dotenv = require('dotenv');

const Student = require('../src/models/Student');
const Course = require('../src/models/Course');
const Enrollment = require('../src/models/Enrollment');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI || process.env.DATABASE_URL;

if (!mongoUri) {
  console.error('Missing MONGO_URI (or MONGODB_URI / DATABASE_URL) in backend/.env');
  process.exit(1);
}

const SUBJECTS = [
  { name: 'Machine Learning Fundamentals', credits: 4 },
  { name: 'Deep Learning and Neural Networks', credits: 4 },
  { name: 'Natural Language Processing', credits: 3 },
  { name: 'Computer Vision', credits: 3 },
  { name: 'Data Mining and Analytics', credits: 3 }
];

const slug = (value) => String(value || 'NA')
  .toUpperCase()
  .replace(/[^A-Z0-9]+/g, '-')
  .replace(/(^-|-$)/g, '') || 'NA';

async function run() {
  await mongoose.connect(mongoUri);

  const students = await Student.find({}).select('_id branch semester').lean();
  if (!students.length) {
    console.log('No students found. Nothing to seed.');
    return;
  }

  const combosMap = new Map();
  for (const student of students) {
    const branch = String(student.branch || '').trim() || 'Not Set';
    const semester = Number(student.semester) || 1;
    const key = `${branch}::${semester}`;
    if (!combosMap.has(key)) combosMap.set(key, { branch, semester });
  }

  let createdCourses = 0;
  let updatedCourses = 0;
  let createdEnrollments = 0;

  const comboCourses = new Map();

  for (const combo of combosMap.values()) {
    const courseIds = [];
    const branchCode = slug(combo.branch);

    for (let i = 0; i < SUBJECTS.length; i += 1) {
      const subject = SUBJECTS[i];
      const code = `AIML-${branchCode}-S${combo.semester}-${i + 1}`;

      const result = await Course.updateOne(
        { code },
        {
          $set: {
            name: subject.name,
            branch: combo.branch,
            semester: combo.semester,
            credits: subject.credits
          }
        },
        { upsert: true }
      );

      if (result.upsertedCount > 0) createdCourses += 1;
      else if (result.modifiedCount > 0) updatedCourses += 1;

      const course = await Course.findOne({ code }).select('_id').lean();
      if (course) courseIds.push(course._id);
    }

    comboCourses.set(`${combo.branch}::${combo.semester}`, courseIds);
  }

  for (const student of students) {
    const branch = String(student.branch || '').trim() || 'Not Set';
    const semester = Number(student.semester) || 1;
    const key = `${branch}::${semester}`;
    const courseIds = comboCourses.get(key) || [];

    for (const courseId of courseIds) {
      const enrollResult = await Enrollment.updateOne(
        { studentId: student._id, courseId },
        { $setOnInsert: { status: 'REGISTERED' } },
        { upsert: true }
      );
      if (enrollResult.upsertedCount > 0) createdEnrollments += 1;
    }
  }

  console.log(`Students processed: ${students.length}`);
  console.log(`Branch/Sem combinations: ${combosMap.size}`);
  console.log(`Courses created: ${createdCourses}`);
  console.log(`Courses updated: ${updatedCourses}`);
  console.log(`Enrollments created: ${createdEnrollments}`);
}

run()
  .catch((error) => {
    console.error('Seeding failed:', error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
