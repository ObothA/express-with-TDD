const nodeMailer = require('nodemailer');
const nodeMailerStub = require('nodemailer-stub');

const transporter = nodeMailer.createTransport(nodeMailerStub.stubTransport);

module.exports = transporter;
