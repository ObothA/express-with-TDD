const Sequelize = require('sequelize');

const sequelize = new Sequelize('test-tut', 'my-db-user', 'db-pass', {
  dialect: 'sqlite',
  storage: './database.sqlite',
});

module.exports = sequelize;
