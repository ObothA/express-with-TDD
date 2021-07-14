const express = require('express');
const { check, validationResult } = require('express-validator');
const { route } = require('../app');

// const User = require('./User');
const { saveUser, findByEmail, activate } = require('./userService');

const router = express.Router();

router.post(
  '/api/1.0/users',
  check('username')
    .notEmpty()
    .withMessage('username cannot be null')
    .bail()
    .isLength({ min: 4, max: 32 })
    .withMessage('Must have min 4 and max 32 characters'),
  check('email')
    .notEmpty()
    .withMessage('E-mail cannot be null')
    .bail()
    .isEmail()
    .withMessage('E-mail is not valid')
    .bail()
    .custom(async (email) => {
      const user = await findByEmail(email);
      if (user) {
        throw new Error('E-mail already in use.');
      }
    }),
  check('password')
    .notEmpty()
    .withMessage('password cannot be null')
    .bail()
    .isLength({ min: 6 })
    .withMessage('password must be at least 6 characters.')
    .bail()
    .matches(/^(?:(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).*)$/)
    .withMessage('password must have at least 1 uppercase, 1 lowercase and 1 number.'),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const validationErrors = {};
      errors.array().forEach((error) => (validationErrors[error.param] = error.msg));
      return res.status(400).send({ validationErrors });
    }

    try {
      await saveUser(req.body);
      return res.send({
        message: 'User created.',
      });
    } catch (catchErr) {
      return res.status(502).send({ message: catchErr.message });
    }
  }
);

router.post('/api/1.0/users/token/:activationToken', async (req, res) => {
  const token = req.params.activationToken;
  await activate(token);
  res.send();
});

module.exports = router;
