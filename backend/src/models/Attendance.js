const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true, index: true },
  hallTicketNumber: { type: String, required: true, trim: true, index: true },
  name: { type: String, required: true, trim: true },
  studentName: { type: String, trim: true },
  department: { type: String, required: true, trim: true, index: true },
  batch: { type: String, required: true, trim: true, index: true },
  semester: { type: Number, required: true, min: 1, max: 8, index: true },
  subject: { type: String, default: '', trim: true },
  date: { type: Date, required: true, index: true },
  status: {
    type: String,
    enum: ['Present', 'Absent', 'PRESENT', 'ABSENT'],
    required: true,
    set: (value) => {
      if (value === 'PRESENT') return 'Present';
      if (value === 'ABSENT') return 'Absent';
      return value;
    }
  },
  courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course' },
  facultyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff', index: true },
  markedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff' }
}, { timestamps: true });

attendanceSchema.pre('validate', function syncLegacyFields(next) {
  if (!this.studentName && this.name) this.studentName = this.name;
  if (!this.name && this.studentName) this.name = this.studentName;
  if (!this.facultyId && this.markedBy) this.facultyId = this.markedBy;
  if (!this.markedBy && this.facultyId) this.markedBy = this.facultyId;
  next();
});

attendanceSchema.index({ studentId: 1, subject: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('Attendance', attendanceSchema);
