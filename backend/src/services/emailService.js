const nodemailer = require('nodemailer');
const env = require('../config/env');

const transporter = nodemailer.createTransport({
  host: env.smtpHost,
  port: env.smtpPort,
  auth: env.smtpUser ? { user: env.smtpUser, pass: env.smtpPass } : undefined
});

const sendEmail = async ({ to, subject, html, text }) => {
  return transporter.sendMail({
    from: env.emailFrom,
    to,
    subject,
    text,
    html
  });
};

module.exports = { sendEmail };
