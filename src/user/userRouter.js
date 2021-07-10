const express = require('express');
const { check, validationResult } = require('express-validator');

const { save } = require('./userService');

const router = express.Router();

router.post(
  '/api/1.0/users',
  check('username').notEmpty().withMessage('username cannot be null'),
  check('email').notEmpty().withMessage('E-mail cannot be null'),
  check('password').notEmpty().withMessage('password cannot be null'),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const validationErrors = {};
      errors.array().forEach((error) => (validationErrors[error.param] = error.msg));
      return res.status(400).send({ validationErrors });
    }

    await save(req.body);

    return res.send({
      message: 'User created.',
    });
  }
);

module.exports = router;
