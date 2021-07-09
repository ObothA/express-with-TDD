const Sequelize = require('sequelize');

const sequelize = new Sequelize('test-tut', 'my-db-user', 'db-pass', {
  dialect: 'sqlite',
  storage: './database.sqlite',
  logging: false,
});

module.exports = sequelize;
