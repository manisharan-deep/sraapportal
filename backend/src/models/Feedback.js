const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  category: { type: String, enum: ['FACULTY', 'MENTOR', 'COLLEGE'], required: true },
  subject: { type: String, required: true },
  rating: { type: Number, min: 1, max: 5, required: true },
  comments: { type: String, default: '' }
}, { timestamps: true });

module.exports = mongoose.model('Feedback', feedbackSchema);
