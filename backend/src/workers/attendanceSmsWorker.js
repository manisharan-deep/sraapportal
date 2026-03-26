const Student = require('../models/Student');
const { attendanceSmsQueue } = require('../queues/attendanceSmsQueue');
const { sendAttendanceSms } = require('../services/smsService');
const logger = require('../utils/logger');

const startAttendanceSmsWorker = () => {
  attendanceSmsQueue.process(async (job) => {
    const { studentId, studentName, status, date } = job.data;

    const studentProfile = await Student.findById(studentId)
      .select('name phone studentPhone parentPhone fatherMobile motherMobile')
      .lean();

    if (!studentProfile) {
      logger.warn('Attendance SMS skipped: student profile not found', { studentId });
      return { skipped: true, reason: 'Student profile not found' };
    }

    const recipients = [
      studentProfile.studentPhone,
      studentProfile.phone,
      studentProfile.parentPhone,
      studentProfile.fatherMobile,
      studentProfile.motherMobile
    ].filter(Boolean);

    if (!recipients.length) {
      logger.info('Attendance SMS skipped: no student/parent mobile numbers', { studentId });
      return { skipped: true, reason: 'No recipient numbers found' };
    }

    const smsText = `Attendance Alert: ${studentName || studentProfile.name} was marked ${status} on ${new Date(date).toISOString().split('T')[0]}.`;

    return sendAttendanceSms({
      studentName: studentName || studentProfile.name,
      status,
      date,
      recipients,
      customMessage: smsText
    });
  });

  attendanceSmsQueue.on('completed', (job) => {
    logger.info('Attendance SMS job completed', { jobId: job.id });
  });

  attendanceSmsQueue.on('failed', (job, err) => {
    logger.error('Attendance SMS job failed', {
      jobId: job ? job.id : null,
      error: err.message
    });
  });

  logger.info('Attendance SMS worker started');
};

module.exports = { startAttendanceSmsWorker };
