const mongoose = require('mongoose');

const hallTicketSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  semester: { type: Number, required: true },
  ticketUrl: { type: String, required: true },
  generatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

hallTicketSchema.index({ studentId: 1, semester: 1 }, { unique: true });

module.exports = mongoose.model('HallTicket', hallTicketSchema);
