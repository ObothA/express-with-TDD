const bcrypt = require('bcrypt');

const User = require('./User');

const save = async (body) => {
  const { username, email, password } = body;

  const hash = await bcrypt.hash(password, 10);
  const user = {
    username,
    email,
    password: hash,
  };

  await User.create(user);
};

const findByEmail = async (email) => {
  return await User.findOne({ where: { email } });
};

module.exports = { save, findByEmail };
