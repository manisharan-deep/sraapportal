const path = require('path');
const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const uri = process.env.MONGO_URI || process.env.MONGODB_URI || process.env.DATABASE_URL;

async function run() {
  if (!uri) throw new Error('Missing MONGO_URI/MONGODB_URI/DATABASE_URL');
  await mongoose.connect(uri);

  const collection = mongoose.connection.collection('attendances');
  const indexes = await collection.indexes();
  const byName = new Map(indexes.map((idx) => [idx.name, idx]));

  if (byName.has('hallTicketNumber_1_date_1')) {
    await collection.dropIndex('hallTicketNumber_1_date_1');
    console.log('Dropped old index hallTicketNumber_1_date_1');
  } else {
    console.log('Old index hallTicketNumber_1_date_1 not found');
  }

  if (byName.has('studentId_1_courseId_1_date_1')) {
    await collection.dropIndex('studentId_1_courseId_1_date_1');
    console.log('Dropped old index studentId_1_courseId_1_date_1');
  } else {
    console.log('Old index studentId_1_courseId_1_date_1 not found');
  }

  try {
    await collection.createIndex({ studentId: 1, subject: 1, date: 1 }, { unique: true, name: 'studentId_1_subject_1_date_1' });
    console.log('Created index studentId_1_subject_1_date_1');
  } catch (error) {
    if (String(error.message).includes('already exists')) {
      console.log('Index studentId_1_subject_1_date_1 already exists');
    } else {
      throw error;
    }
  }

  await mongoose.disconnect();
}

run().catch(async (error) => {
  console.error(error.message);
  try { await mongoose.disconnect(); } catch (_) {}
  process.exit(1);
});
