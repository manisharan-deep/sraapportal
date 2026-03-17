const mongoose = require('mongoose');

const marksSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true, index: true },
  hallTicketNumber: { type: String, required: true, trim: true, index: true },
  subject: { type: String, required: true, trim: true, index: true },
  semester: { type: Number, required: true, min: 1, max: 8, index: true },
  batch: { type: String, required: true, trim: true, index: true },
  internalMarks: { type: Number, default: 0, min: 0, max: 40 },
  externalMarks: { type: Number, default: 0, min: 0, max: 60 },
  assignmentMarks: { type: Number, default: 0, min: 0, max: 20 },
  totalMarks: { type: Number, default: 0, min: 0, max: 120 },
  grade: { type: String, enum: ['A', 'B', 'C', 'Fail'], default: 'Fail' },
  facultyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff', required: true, index: true }
}, { timestamps: true });

marksSchema.index({ studentId: 1, subject: 1, semester: 1 }, { unique: true });

module.exports = mongoose.model('Marks', marksSchema);
