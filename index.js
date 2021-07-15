const app = require('./src/app');
const sequelize = require('./src/config/database');
const User = require('./src/user/User');

const addUsers = async (activeUserCount, inactiveUserCount = 0) => {
  for (let i = 0; i < activeUserCount + inactiveUserCount; i++) {
    await User.create({
      username: `user${i + 1}`,
      email: `user${i + 1}@mail.com`,
      inactive: i >= activeUserCount,
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

app.listen(5000, () => console.log('App is running!'));
