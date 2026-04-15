// MongoDB schema for activity logs
const mongoose = require("mongoose");

const ActivityLogSchema = new mongoose.Schema(
  {
    userId: { type: String, default: null },
    action: { type: String, required: true },
    entityType: { type: String, default: "request" },
    entityId: { type: String, default: null },
    method: { type: String, default: null },
    path: { type: String, default: null },
    statusCode: { type: Number, default: null },
    ip: { type: String, default: null },
    userAgent: { type: String, default: null },
    metadata: { type: Object, default: {} }
  },
  { timestamps: true }
);

module.exports = mongoose.model("ActivityLog", ActivityLogSchema);
