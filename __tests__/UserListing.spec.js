const request = require('supertest');

const app = require('../src/app');
const User = require('../src/user/User');
const sequelize = require('../src/config/database');

beforeAll(async () => {
  await sequelize.sync();
});

beforeEach(() => {
  /** Clear the table before each test */
  return User.destroy({ truncate: true });
});

const getUsers = () => {
  return request(app).get('/api/1.0/users');
};

const addUsers = async (activeUserCount, inactiveUserCount = 0) => {
  for (let i = 0; i < activeUserCount + inactiveUserCount; i++) {
    await User.create({
      username: `user${i + 1}`,
      email: `user${i + 1}@mail.com`,
      inactive: i >= activeUserCount,
    });
  }
};

describe('Listing Users.', () => {
  it('Returns 200 OK when there are no users in the database.', async () => {
    const response = await getUsers();
    expect(response.status).toBe(200);
  });

  it('Returns page object as response body.', async () => {
    const response = await getUsers();
    expect(response.body).toEqual({
      content: [],
      page: 0,
      size: 10,
      totalPages: 0,
    });
  });

  it('Returns 10 users when there are 11 users in the database', async () => {
    await addUsers(11);

    const response = await getUsers();
    expect(response.body.content.length).toBe(10);
  });

  it('Returns 6 users in page content when there are 6 active users and 5 inactive users in db.', async () => {
    await addUsers(6, 5);

    const response = await getUsers();
    expect(response.body.content.length).toBe(6);
  });

  it('Returns only id, username and email in content array for each user.', async () => {
    await addUsers(11);
    const response = await getUsers();
    const user = response.body.content[0];

    expect(Object.keys(user)).toEqual(['id', 'username', 'email']);
  });

  it('Returns 2 total pages when there are 15 active users and 7 inactive users.', async () => {
    await addUsers(15, 7);
    const response = await getUsers();
    const { body } = response;

    expect(body.totalPages).toBe(2);
  });

  it('Returns first page when page is set below zero as request paramter.', async () => {
    await addUsers(11);
    const response = await getUsers().query({ page: -5 });
    expect(response.body.page).toBe(0);
  });

  it('Returns 5 users and corresponding size indicator when size is set as to 5 in parameter.', async () => {
    await addUsers(11);
    const response = await getUsers().query({ size: 5 });
    expect(response.body.content.length).toBe(5);
    expect(response.body.size).toBe(5);
  });

  it('Returns 10 users and corresponding size indicator when size is set as to 1000 in parameter.', async () => {
    await addUsers(11);
    const response = await getUsers().query({ size: 1000 });
    expect(response.body.content.length).toBe(10);
    expect(response.body.size).toBe(10);
  });
});
