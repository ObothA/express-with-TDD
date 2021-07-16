const express = require('express');
const bcrypt = require('bcrypt');
const { check, validationResult } = require('express-validator');

const { findByEmail } = require('../user/userService');
const AuthenticationException = require('./AuthenticationException');
const ForbidenException = require('./ForbidenException');

const router = express.Router();

router.post('/api/1.0/auth', check('email').isEmail(), async (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return next(new AuthenticationException());
  }

  const { email, password } = req.body;

  const user = await findByEmail(email);

  if (!user) {
    return next(new AuthenticationException());
  }

  const match = await bcrypt.compare(password, user.password);
  if (!match) {
    return next(new AuthenticationException());
  }

  if (user.inactive) {
    return next(new ForbidenException());
  }

  res.send({
    id: user.id,
    username: user.username,
  });
});

module.exports = router;
