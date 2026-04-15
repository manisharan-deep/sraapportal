// MongoDB-backed activity log service
const ActivityLog = require("../models/ActivityLog");
const logger = require("./logger");

const logActivity = async (data) => {
  try {
    await ActivityLog.create(data);
  } catch (error) {
    logger.warn("Failed to write activity log", { error: error.message });
  }
};

module.exports = { logActivity };
