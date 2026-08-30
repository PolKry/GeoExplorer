const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const sendEmail = async (to, subject, html) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to,
    subject,
    html,
  };

  console.log('Sending email to:', to);
  if (typeof to !== 'string' || !to.trim()) {
    console.error('Invalid or missing email address:', to);
    return;
  }

  try {
    await transporter.sendMail(mailOptions);
    console.log('Email sent to', to);
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
};

module.exports = { sendEmail };