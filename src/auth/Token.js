const Sequelize = require('sequelize');
const sequelize = require('../config/database');

const Model = Sequelize.Model;

class Token extends Model {}

Token.init(
  {
    token: {
      type: Sequelize.STRING,
    },
    lastUsedAt: {
      type: Sequelize.DATE,
    },
  },
  {
    sequelize,
    modelName: 'token', // this also gives it the table name.
    timestamps: false, // sequelize will not generate createdAt and updatedAt
  }
);

module.exports = Token;
