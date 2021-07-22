const express = require('express');

const errorHandler = require('./error/ErrorHandler');
const tokenAuthentication = require('./middleware/tokenAuthentication');

const app = express();
app.use(express.json());

app.use(tokenAuthentication);

const userRouter = require('./user/userRouter');
const authenticationRouter = require('./auth/AuthenticationRouter');
app.use(userRouter);
app.use(authenticationRouter);

app.use(errorHandler);

console.log(`env: ${process.env.NODE_ENV}`);

module.exports = app;
