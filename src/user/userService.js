const bcrypt = require('bcrypt');
const Sequelize = require('sequelize');

const User = require('./User');
const { sendAccountActivation, sendPasswordReset } = require('../email/EmailService');
const sequelize = require('../config/database');
const EmailException = require('../email/EmailException');
const InvalidTokenException = require('./invalidTokenException');
const NotFoundException = require('../error/NotFoundException');
const { randomString } = require('../shared/generator');

const saveUser = async (body) => {
  const { username, email, password } = body;

  const hash = await bcrypt.hash(password, 10);
  const user = {
    username,
    email,
    password: hash,
    activationToken: randomString(16),
  };

  const transaction = await sequelize.transaction();
  await User.create(user, { transaction });

  try {
    await sendAccountActivation(email, user.activationToken);
    await transaction.commit();
  } catch (catchErr) {
    await transaction.rollback();
    throw new EmailException();
  }
};

const getUsers = async (page, size, authenticatedUser) => {
  const id = authenticatedUser ? authenticatedUser.id : 0; // id 0 doesnt belong to any user.

  const usersWithCount = await User.findAndCountAll({
    where: {
      inactive: false,
      id: {
        [Sequelize.Op.not]: id,
      },
    },
    attributes: ['id', 'username', 'email'],
    limit: size,
    offset: page * size, // to find starting point, offset the staring point by the result here
  });

  return {
    content: usersWithCount.rows,
    page,
    size: Number.parseInt(size),
    totalPages: Math.ceil(usersWithCount.count / size),
  };
};

const getUser = async (id) => {
  const user = await User.findOne({
    where: {
      id,
      inactive: false,
    },
    attributes: ['id', 'username', 'email'],
  });

  if (!user) {
    throw new NotFoundException('User not found.');
  }

  return user;
};

const updateUser = async (id, updateBody) => {
  const user = await User.findOne({
    where: {
      id,
    },
  });

  user.username = updateBody.username;
  user.save();
};

const findByEmail = async (email) => {
  return await User.findOne({ where: { email } });
};

const activate = async (token) => {
  const user = await User.findOne({ where: { activationToken: token } });

  if (!user) {
    throw new InvalidTokenException();
  }

  user.inactive = false;
  user.activationToken = null;
  await user.save();
};

const deleteUser = async (id) => {
  await User.destroy({
    where: {
      id,
    },
  });
};

const passwordResetRequest = async (email) => {
  const user = await findByEmail(email);
  if (!user) {
    throw new NotFoundException('E-mail not found.');
  }

  user.passwordResetToken = randomString(16);
  await user.save();

  await sendPasswordReset(email, user.passwordResetToken);
};

module.exports = { saveUser, findByEmail, activate, getUsers, getUser, updateUser, deleteUser, passwordResetRequest };
