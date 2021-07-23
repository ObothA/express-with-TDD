const express = require('express');
const { check, validationResult } = require('express-validator');

// const User = require('./User');
const {
  saveUser,
  findByEmail,
  activate,
  getUsers,
  getUser,
  updateUser,
  deleteUser,
  passwordResetRequest,
} = require('./userService');
const ValidationException = require('../error/ValidationException');
const ForbidenException = require('../error/ForbidenException');
const pagination = require('../middleware/pagination');
const User = require('./User');

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
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(new ValidationException(errors.array()));
    }

    try {
      await saveUser(req.body);
      return res.send({
        message: 'User created.',
      });
    } catch (catchErr) {
      next(catchErr);
    }
  }
);

router.post('/api/1.0/users/token/:activationToken', async (req, res, next) => {
  const token = req.params.activationToken;
  try {
    await activate(token);
    return res.send({ message: 'Account activated successfully.' });
  } catch (CatchError) {
    next(CatchError);
  }
});

router.get('/api/1.0/users', pagination, async (req, res, next) => {
  const authenticatedUser = req.authenticatedUser;

  const { page, size } = req.pagination;
  const users = await getUsers(page, size, authenticatedUser);
  res.send(users);
});

router.get('/api/1.0/users/:id', async (req, res, next) => {
  try {
    const user = await getUser(req.params.id);
    res.send(user);
  } catch (catchErr) {
    next(catchErr);
  }
});

router.put('/api/1.0/users/:id', async (req, res, next) => {
  const authenticatedUser = req.authenticatedUser;

  // eslint-disable-next-line eqeqeq
  if (!authenticatedUser || authenticatedUser.id != req.params.id) {
    return next(new ForbidenException('You are not authorized to update user.'));
  }
  await updateUser(req.params.id, req.body);

  return res.send();
});

router.delete('/api/1.0/users/:id', async (req, res, next) => {
  const authenticatedUser = req.authenticatedUser;

  // eslint-disable-next-line eqeqeq
  if (!authenticatedUser || authenticatedUser.id != req.params.id) {
    return next(new ForbidenException('You are not authorized to delete user.'));
  }

  await deleteUser(req.params.id);

  res.send();
});

router.post(
  '/api/1.0/user/password',
  check('email').isEmail().withMessage('E-mail is not valid.'),
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(new ValidationException(errors.array()));
    }

    try {
      await passwordResetRequest(req.body.email);
      return res.send({
        message: 'Check your email to reset your password.',
      });
    } catch (err) {
      next(err);
    }
  }
);

const passwordResetTokenValidator = async (req, res, next) => {
  const user = await User.findOne({
    where: {
      passwordResetToken: req.body.passwordResetToken,
    },
  });

  if (!user) {
    return next(
      new ForbidenException('You are not authorized to update password. Please follow the password update steps again.')
    );
  }
  next();
};

router.put(
  '/api/1.0/user/password',
  passwordResetTokenValidator,
  check('password')
    .notEmpty()
    .withMessage('password cannot be null')
    .bail()
    .isLength({ min: 6 })
    .withMessage('password must be at least 6 characters.')
    .bail()
    .matches(/^(?:(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).*)$/)
    .withMessage('password must have at least 1 uppercase, 1 lowercase and 1 number.'),
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(new ValidationException(errors.array()));
    }
  }
);

module.exports = router;
