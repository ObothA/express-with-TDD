const nodeMailer = require('nodemailer');
const config = require('config');

const mailConfig = config.get('mail');

const transporter = nodeMailer.createTransport({ ...mailConfig });

module.exports = transporter;
