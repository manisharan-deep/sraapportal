const mongoose = require('mongoose');

const feeSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  type: { type: String, enum: ['EXAM', 'SEMESTER'], required: true },
  semester: { type: Number, required: true },
  amount: { type: Number, required: true },
  status: { type: String, enum: ['PENDING', 'PAID'], default: 'PENDING' },
  paidAt: { type: Date }
}, { timestamps: true });

module.exports = mongoose.model('Fee', feeSchema);
