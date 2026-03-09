const mongoose = require('mongoose');

const resultSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  semester: { type: Number, required: true },
  cie: [{ courseCode: String, marks: Number }],
  ete: [{ courseCode: String, marks: Number }],
  semesterMemoUrl: { type: String }
}, { timestamps: true });

resultSchema.index({ studentId: 1, semester: 1 }, { unique: true });

module.exports = mongoose.model('Result', resultSchema);
