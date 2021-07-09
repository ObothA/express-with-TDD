const express = require('express');

const app = express();
app.use(express.json());

const userRouter = require('./user/userRouter');
app.use(userRouter);

module.exports = app;
