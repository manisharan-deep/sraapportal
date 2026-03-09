const mongoose = require('mongoose');

const coinSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  type: { type: String, enum: ['ALPHA', 'SIGMA', 'PENALTY'], required: true },
  amount: { type: Number, required: true },
  reason: { type: String, default: '' },
  assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff' }
}, { timestamps: true });

module.exports = mongoose.model('Coin', coinSchema);
