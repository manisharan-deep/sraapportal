const twilio = require('twilio');
const env = require('../config/env');
const logger = require('../utils/logger');

let twilioClient = null;

const hasTwilioConfig = () => (
  Boolean(env.twilioAccountSid) &&
  Boolean(env.twilioAuthToken) &&
  Boolean(env.twilioFromNumber)
);

const getTwilioClient = () => {
  if (!twilioClient && hasTwilioConfig()) {
    twilioClient = twilio(env.twilioAccountSid, env.twilioAuthToken);
  }
  return twilioClient;
};

const normalizePhone = (phone) => {
  if (!phone) return '';
  const raw = String(phone).trim();
  if (!raw) return '';

  if (raw.startsWith('+')) {
    const digits = raw.slice(1).replace(/\D/g, '');
    return digits ? `+${digits}` : '';
  }

  if (raw.startsWith('00')) {
    const digits = raw.slice(2).replace(/\D/g, '');
    return digits ? `+${digits}` : '';
  }

  const digits = raw.replace(/\D/g, '');
  if (!digits) return '';

  // Default 10-digit local numbers to India country code.
  if (digits.length === 10) return `+91${digits}`;
  if (digits.length === 12 && digits.startsWith('91')) return `+${digits}`;
  return `+${digits}`;
};

const sendAttendanceSms = async ({ studentName, status, subject, date, recipients = [] }) => {
  if (!env.attendanceSmsEnabled) {
    return { skipped: true, reason: 'Attendance SMS disabled by env' };
  }

  const client = getTwilioClient();
  if (!client) {
    return { skipped: true, reason: 'Twilio is not configured' };
  }

  const uniqueRecipients = [...new Set(recipients.map(normalizePhone).filter(Boolean))];
  if (!uniqueRecipients.length) {
    return { skipped: true, reason: 'No valid recipient phone numbers found' };
  }

  const formattedDate = new Date(date).toISOString().split('T')[0];
  const body = `Dear Parent, your child ${studentName} is marked as ${status} for ${subject} on ${formattedDate}.`;

  const sent = [];
  const failed = [];

  await Promise.all(uniqueRecipients.map(async (to) => {
    try {
      const message = await client.messages.create({
        body,
        from: env.twilioFromNumber,
        to
      });
      sent.push({ to, sid: message.sid });
    } catch (error) {
      failed.push({ to, message: error.message });
      logger.warn('Failed to send attendance SMS', { to, error: error.message });
    }
  }));

  return { skipped: false, sent, failed };
};

module.exports = {
  sendAttendanceSms
};
