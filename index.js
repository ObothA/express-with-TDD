const app = require('./src/app');
const bcrypt = require('bcrypt');

const sequelize = require('./src/config/database');
const User = require('./src/user/User');
const { scheduledCleanUp } = require('./src/auth/tokenService');

const addUsers = async (activeUserCount, inactiveUserCount = 0) => {
  const hash = await bcrypt.hash('password', 10);
  for (let i = 0; i < activeUserCount + inactiveUserCount; i++) {
    await User.create({
      username: `user${i + 1}`,
      email: `user${i + 1}@mail.com`,
      inactive: i >= activeUserCount,
      password: hash,
    });
  }
};

/**
 * Force sequelize to sync to database with latest updates
 * Not safe for production, cleans the db
 * Strictly for development
 * */
sequelize.sync({ force: true }).then(async () => {
  await addUsers(25);
});

scheduledCleanUp();

app.listen(5000, () => console.log('App is running!'));
