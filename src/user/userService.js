const bcrypt = require('bcrypt');
const crypto = require('crypto');

const User = require('./User');
const { sendAccountActivation } = require('../email/EmailService');
const sequelize = require('../config/database');
const EmailException = require('../email/EmailException');
const InvalidTokenException = require('./invalidTokenException');

const generateToken = (length) => {
  const randomString = crypto.randomBytes(length).toString('hex');

  // get half the data to get our require length
  return randomString.substring(0, length);
};

const saveUser = async (body) => {
  const { username, email, password } = body;

  const hash = await bcrypt.hash(password, 10);
  const user = {
    username,
    email,
    password: hash,
    activationToken: generateToken(16),
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

const getUsers = async (page, size) => {
  const usersWithCount = await User.findAndCountAll({
    where: { inactive: false },
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

module.exports = { saveUser, findByEmail, activate, getUsers };
