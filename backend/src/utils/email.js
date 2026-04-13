const nodemailer = require('nodemailer');

const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT) || 587,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
};

const sendEmail = async ({ to, subject, html, text }) => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.log(`📧 Email skipped (not configured): To: ${to}, Subject: ${subject}`);
    return;
  }
  try {
    const transporter = createTransporter();
    await transporter.sendMail({
      from: `"Property Rental" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html,
      text,
    });
    console.log(`📧 Email sent to ${to}`);
  } catch (error) {
    console.error('Email error:', error.message);
  }
};

module.exports = { sendEmail };
