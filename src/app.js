const express = require('express');

const errorHandler = require('./error/ErrorHandler');

const app = express();
app.use(express.json());

const userRouter = require('./user/userRouter');
app.use(userRouter);

app.use(errorHandler);

console.log(`env: ${process.env.NODE_ENV}`);

module.exports = app;
