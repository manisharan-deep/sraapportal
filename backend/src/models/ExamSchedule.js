const mongoose = require('mongoose');

const examScheduleSchema = new mongoose.Schema({
  semester: { type: Number, required: true },
  branch: { type: String, required: true },
  exams: [{
    courseCode: String,
    date: Date,
    startTime: String,
    endTime: String,
    venue: String
  }]
}, { timestamps: true });

module.exports = mongoose.model('ExamSchedule', examScheduleSchema);
