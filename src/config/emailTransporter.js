const nodeMailer = require('nodemailer');

const transporter = nodeMailer.createTransport({
  host: 'localhost',
  port: 8587,
  tls: {
    rejectUnauthorized: false,
  },
});

module.exports = transporter;
