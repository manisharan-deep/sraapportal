const Attendance = require('../models/Attendance');
const Student = require('../models/Student');
const env = require('../config/env');
const logger = require('../utils/logger');
const { sendWhatsAppMessage } = require('./whatsappService');

function normalizePhoneNumber(rawPhone) {
  if (!rawPhone) return null;
  const digits = String(rawPhone).replace(/\D/g, '');
  if (!digits) return null;

  if (digits.length === 10) {
    return `+91${digits}`;
  }

  if (digits.length === 12 && digits.startsWith('91')) {
    return `+${digits}`;
  }

  if (digits.startsWith('0') && digits.length === 11) {
    return `+91${digits.slice(1)}`;
  }

  if (digits.length >= 10 && digits.length <= 15) {
    return `+${digits}`;
  }

  return null;
}

function getUniqueProfileNumbers(student) {
  const numbers = [student.phone, student.fatherMobile, student.motherMobile]
    .map(normalizePhoneNumber)
    .filter(Boolean);

  return [...new Set(numbers)];
}

function buildAttendanceMessage({ student, present, absent, total, attendancePercent, dateText }) {
  return [
    `SR University Daily Attendance Report`,
    `Date: ${dateText}`,
    `Name: ${student.name || '-'}`,
    `Roll Number: ${student.rollNumber || '-'}`,
    `Branch: ${student.branch || '-'} | Semester: ${student.semester || '-'}`,
    `Present: ${present}`,
    `Absent: ${absent}`,
    `Total Classes: ${total}`,
    `Attendance: ${attendancePercent}%`
  ].join('\n');
}

async function sendDailyAttendanceForStudent(student, fromDate, toDate, dateText) {
  const contacts = getUniqueProfileNumbers(student);
  if (contacts.length === 0) {
    return { skipped: true, reason: 'No valid phone numbers' };
  }

  const attendanceRecords = await Attendance.find({
    studentId: student._id,
    date: { $gte: fromDate, $lte: toDate }
  })
    .populate('courseId', 'code name')
    .lean();

  const total = attendanceRecords.length;
  const present = attendanceRecords.filter((record) => String(record.status || '').toLowerCase() === 'present').length;
  const absent = total - present;
  const attendancePercent = total > 0 ? ((present / total) * 100).toFixed(2) : '0.00';

  const courseSummary = attendanceRecords.reduce((acc, record) => {
    const key = record.courseId?._id ? String(record.courseId._id) : String(record.courseId || 'unknown');
    const courseLabel = record.courseId?.code || record.courseId?.name || 'Unknown Course';
    if (!acc[key]) {
      acc[key] = { label: courseLabel, present: 0, total: 0 };
    }
    acc[key].total += 1;
    if (String(record.status || '').toLowerCase() === 'present') {
      acc[key].present += 1;
    }
    return acc;
  }, {});

  const message = buildAttendanceMessage({
    student,
    present,
    absent,
    total,
    attendancePercent,
    dateText
  });

  const courseLines = Object.values(courseSummary)
    .slice(0, 5)
    .map((course) => {
      const coursePercent = course.total > 0 ? ((course.present / course.total) * 100).toFixed(0) : '0';
      return `- ${course.label}: ${course.present}/${course.total} (${coursePercent}%)`;
    });

  const detailedMessage = courseLines.length > 0
    ? `${message}\nCourse Summary:\n${courseLines.join('\n')}`
    : `${message}\nCourse Summary: No classes marked today`;

  let sentCount = 0;
  for (const phone of contacts) {
    await sendWhatsAppMessage({ phone, message: detailedMessage });
    sentCount += 1;
  }

  return { skipped: false, sentCount, totalClasses: total };
}

async function runDailyAttendanceWhatsappJob() {
  const now = new Date();
  const dateText = now.toLocaleDateString('en-IN');
  const fromDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const toDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  const students = await Student.find({}, '_id name rollNumber branch semester phone fatherMobile motherMobile').lean();

  let delivered = 0;
  let skipped = 0;

  for (const student of students) {
    try {
      const result = await sendDailyAttendanceForStudent(student, fromDate, toDate, dateText);
      if (result.skipped) {
        skipped += 1;
        continue;
      }
      delivered += result.sentCount;
    } catch (error) {
      logger.error('Failed to send daily attendance to student contacts', {
        studentId: student._id,
        error: error.message
      });
    }
  }

  logger.info('Daily attendance WhatsApp job completed', {
    date: dateText,
    studentsProcessed: students.length,
    messagesDelivered: delivered,
    studentsSkipped: skipped
  });
}

function scheduleNextRun() {
  if (!env.dailyAttendanceWhatsappEnabled) {
    logger.info('Daily attendance WhatsApp job is disabled');
    return;
  }

  const now = new Date();
  const nextRun = new Date(now);
  nextRun.setHours(env.dailyAttendanceHour, env.dailyAttendanceMinute, 0, 0);
  if (nextRun <= now) {
    nextRun.setDate(nextRun.getDate() + 1);
  }

  const delayMs = nextRun.getTime() - now.getTime();

  logger.info('Daily attendance WhatsApp job scheduled', {
    nextRunAt: nextRun.toISOString(),
    hour: env.dailyAttendanceHour,
    minute: env.dailyAttendanceMinute
  });

  setTimeout(async () => {
    try {
      await runDailyAttendanceWhatsappJob();
    } catch (error) {
      logger.error('Daily attendance WhatsApp job failed', { error: error.message });
    } finally {
      scheduleNextRun();
    }
  }, delayMs);
}

function startDailyAttendanceWhatsappJob() {
  scheduleNextRun();
}

module.exports = {
  startDailyAttendanceWhatsappJob,
  runDailyAttendanceWhatsappJob
};
