const express = require('express');

const app = express();
app.use(express.json());

const userRouter = require('./user/userRouter');
app.use(userRouter);

console.log(`env: ${process.env.NODE_ENV}`);

module.exports = app;
