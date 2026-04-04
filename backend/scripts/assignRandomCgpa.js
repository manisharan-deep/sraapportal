const dotenv = require('dotenv');
const mongoose = require('mongoose');
const path = require('node:path');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const { connectDatabase } = require('../src/config/database');
const Student = require('../src/models/Student');

const randomInRange = (min, max, step = 0.01) => {
  const multiplier = Math.round(1 / step);
  const minScaled = Math.round(min * multiplier);
  const maxScaled = Math.round(max * multiplier);
  const valueScaled = Math.floor(Math.random() * (maxScaled - minScaled + 1)) + minScaled;
  return Number((valueScaled / multiplier).toFixed(2));
};

async function main() {
  await connectDatabase();

  const students = await Student.find({}).select('_id').lean();
  if (!students.length) {
    console.log('No students found. Nothing to update.');
    await mongoose.connection.close();
    return;
  }

  const operations = students.map((student) => ({
    updateOne: {
      filter: { _id: student._id },
      update: {
        $set: {
          cgpa: randomInRange(6.0, 9.95, 0.01),
          backlogs: Math.floor(Math.random() * 5),
          coursesCount: Math.floor(Math.random() * 15) + 25
        }
      }
    }
  }));

  const result = await Student.bulkWrite(operations);
  const modified = result.modifiedCount || result.nModified || 0;

  console.log(`Random CGPA assigned for ${modified} student(s).`);
  await mongoose.connection.close();
}

main().catch(async (error) => {
  console.error('Failed to assign random CGPA values:', error.message);
  await mongoose.connection.close();
  process.exit(1);
});
