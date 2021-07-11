const app = require('./src/app');
const sequelize = require('./src/config/database');

/**
 * Force sequelize to sync to database with latest updates
 * Not safe for production, cleans the db
 * Strictly for development
 * */
sequelize.sync({ force: true });

app.listen(3000, () => console.log('App is running!'));
