const Token = require('./Token');
const Sequelize = require('sequelize');

const { randomString } = require('../shared/generator');

const ONE_WEEK_IN_MILLISECONDS = 7 * 24 * 60 * 60 * 1000;

const createToken = async (user) => {
  const token = randomString(32);
  await Token.create({
    token,
    userId: user.id,
    lastUsedAt: new Date(),
  });

  return token;
};

const verifyToken = async (token) => {
  //prettier-ignore
  const oneWeekAgo = new Date(Date.now() - ONE_WEEK_IN_MILLISECONDS);
  const tokenInDB = await Token.findOne({
    where: {
      token,
      lastUsedAt: {
        [Sequelize.Op.gt]: oneWeekAgo,
      },
    },
  });

  tokenInDB.lastUsedAt = new Date();
  await tokenInDB.save();

  const userId = tokenInDB.userId;
  return { id: userId };
};

const deleteToken = async (token) => {
  await Token.destroy({
    where: {
      token,
    },
  });
};

const deleteTokensOfUser = async (userId) => {
  await Token.destroy({
    where: {
      userId,
    },
  });
};

const scheduledCleanUp = () => {
  setInterval(async () => {
    //prettier-ignore
    const oneWeekAgo = new Date(Date.now() - ONE_WEEK_IN_MILLISECONDS);
    await Token.destroy({
      where: {
        lastUsedAt: {
          [Sequelize.Op.lt]: oneWeekAgo,
        },
      },
    });
  }, 60 * 60 * 1000);
};

module.exports = { createToken, verifyToken, deleteToken, deleteTokensOfUser, scheduledCleanUp };
