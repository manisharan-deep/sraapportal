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

const canUseFast2Sms = () => Boolean(env.fast2SmsApiKey);

const stripNonDigits = (value) => String(value).replaceAll(/\D/g, '');

const normalizeFast2SmsNumber = (target) => String(target || '').replace(/^\+/, '');

const formatAttendanceDate = (value) => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'N/A';
  return parsed.toISOString().split('T')[0];
};

const normalizePhone = (phone) => {
  if (!phone) return '';
  const raw = String(phone).trim();
  if (!raw) return '';

  if (raw.startsWith('+')) {
    const digits = stripNonDigits(raw.slice(1));
    return digits ? `+${digits}` : '';
  }

  if (raw.startsWith('00')) {
    const digits = stripNonDigits(raw.slice(2));
    return digits ? `+${digits}` : '';
  }

  const digits = stripNonDigits(raw);
  if (!digits) return '';

  // Default 10-digit local numbers to India country code.
  if (digits.length === 10) return `+91${digits}`;
  if (digits.length === 12 && digits.startsWith('91')) return `+${digits}`;
  return `+${digits}`;
};

const sendWithTwilio = async ({ recipients, body, sent, failed }) => {
  const client = getTwilioClient();
  if (!client) return;

  await Promise.all(recipients.map(async (to) => {
    try {
      const message = await client.messages.create({
        body,
        from: env.twilioFromNumber,
        to
      });
      sent.push({ to, sid: message.sid, provider: 'twilio' });
    } catch (error) {
      failed.push({ to, message: error.message, provider: 'twilio' });
      logger.warn('Twilio send failed for attendance SMS', { to, error: error.message });
    }
  }));
};

const sendWithFast2SmsFallback = async ({ failed, body, sent }) => {
  if (!failed.length || !canUseFast2Sms()) return;

  const retryTargets = failed.splice(0, failed.length).map((row) => row.to);
  const fast2SmsTargets = retryTargets
    .map(normalizeFast2SmsNumber)
    .filter((target) => /^91\d{10}$/.test(target));

  if (fast2SmsTargets.length) {
    try {
      const response = await fetch('https://www.fast2sms.com/dev/bulkV2', {
        method: 'POST',
        headers: {
          authorization: env.fast2SmsApiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          route: 'q',
          sender_id: env.fast2SmsSenderId,
          message: body,
          language: 'english',
          flash: 0,
          numbers: fast2SmsTargets.join(',')
        })
      });

      const data = await response.json().catch(() => ({}));
      if (response.ok && (data.return === true || data.request_id)) {
        fast2SmsTargets.forEach((to) => sent.push({ to: `+${to}`, provider: 'fast2sms' }));
      } else {
        const message = data.message || `Fast2SMS error: ${response.status}`;
        fast2SmsTargets.forEach((to) => failed.push({ to: `+${to}`, message, provider: 'fast2sms' }));
      }
    } catch (error) {
      fast2SmsTargets.forEach((to) => failed.push({ to: `+${to}`, message: error.message, provider: 'fast2sms' }));
    }
  }

  const unsupportedTargets = retryTargets.filter((target) => !/^\+91\d{10}$/.test(target));
  unsupportedTargets.forEach((to) => failed.push({ to, message: 'Fast2SMS supports only Indian numbers', provider: 'fast2sms' }));
};

const sendAttendanceSms = async ({ studentName, status, subject, date, recipients = [], customMessage }) => {
  if (!env.attendanceSmsEnabled) {
    return { skipped: true, reason: 'Attendance SMS disabled by env' };
  }

  const uniqueRecipients = [...new Set(recipients.map(normalizePhone).filter(Boolean))];
  if (!uniqueRecipients.length) {
    return { skipped: true, reason: 'No valid recipient phone numbers found' };
  }

  const formattedDate = formatAttendanceDate(date);
  const body = customMessage || `Attendance Alert: ${studentName} was marked ${status} on ${formattedDate}.`;

  const sent = [];
  const failed = [];

  const shouldUseTwilio = env.smsProvider === 'auto' || env.smsProvider === 'twilio';
  const shouldUseFast2Sms = env.smsProvider === 'auto' || env.smsProvider === 'fast2sms';

  if (shouldUseTwilio) {
    await sendWithTwilio({ recipients: uniqueRecipients, body, sent, failed });
  }

  if (shouldUseFast2Sms) {
    await sendWithFast2SmsFallback({ failed, body, sent });
  }

  if (!sent.length && !failed.length) {
    return {
      skipped: true,
      reason: 'No SMS provider configured. Set Twilio or Fast2SMS env variables.'
    };
  }

  return {
    skipped: false,
    providerTried: env.smsProvider,
    sent,
    failed
  };
};

module.exports = {
  sendAttendanceSms
};
