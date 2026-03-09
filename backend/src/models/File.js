const mongoose = require('mongoose');

const fileSchema = new mongoose.Schema({
  name: { type: String, required: true },
  url: { type: String, required: true },
  batch: { type: String, required: true },
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff', required: true },
  mimeType: { type: String, default: 'application/octet-stream' }
}, { timestamps: true });

module.exports = mongoose.model('File', fileSchema);
