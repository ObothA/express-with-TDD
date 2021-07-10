const express = require('express');

const { save } = require('./userService');

const router = express.Router();

const validateUsername = (req, res, next) => {
  const user = req.body;

  if (!user.username) {
    req.validationErrors = {
      username: 'username cannot be null',
    };
  }
  next();
};

const validateEmail = (req, res, next) => {
  const user = req.body;

  if (!user.email) {
    req.validationErrors = {
      ...req.validationErrors,
      email: 'E-mail cannot be null',
    };
  }
  next();
};

router.post('/api/1.0/users', validateUsername, validateEmail, async (req, res) => {
  if (req.validationErrors) {
    const response = {
      validationErrors: req.validationErrors,
    };
    res.status(400).send(response);
  }

  await save(req.body);

  return res.send({
    message: 'User created.',
  });
});

module.exports = router;
