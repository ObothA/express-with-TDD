const jwt = require('jsonwebtoken');

const jwtSecret = 'this-is-our-secret';

const createToken = (user) => {
  return jwt.sign({ id: user.id }, jwtSecret);
};

const verifyToken = (token) => {
  return jwt.verify(token, jwtSecret);
};

module.exports = { createToken, verifyToken };
