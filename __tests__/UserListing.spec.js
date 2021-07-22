const request = require('supertest');
const bcrypt = require('bcrypt');

const app = require('../src/app');
const User = require('../src/user/User');
const sequelize = require('../src/config/database');

beforeAll(async () => {
  await sequelize.sync();
});

beforeEach(async () => {
  /** Clear the table before each test */

  // Clear user table, sqlite specific
  // await User.destroy({ truncate: true });

  // Works for other mysql versions
  await User.destroy({
    truncate: {
      cascade: true,
    },
  });
});

const auth = async (options = {}) => {
  let token;
  if (options.auth) {
    const response = await request(app).post('/api/1.0/auth').send(options.auth);
    token = response.body.token;
  }
  return token;
};

const getUsers = (options = {}) => {
  const agent = request(app).get('/api/1.0/users');
  if (options.token) {
    agent.set('Authorization', `Bearer ${options.token}`);
  }
  return agent;
};

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

  it('Returns 10 users and corresponding size indicator when size is set as to 0 in parameter.', async () => {
    await addUsers(11);
    const response = await getUsers().query({ size: 0 });
    expect(response.body.content.length).toBe(10);
    expect(response.body.size).toBe(10);
  });

  it('Returns page as zero and size as 10 when non numeric query params provided for both.', async () => {
    await addUsers(11);
    const response = await getUsers().query({ size: 'size', page: 'page' });

    expect(response.body.size).toBe(10);
    expect(response.body.page).toBe(0);
  });

  it('Returns user page without logged in user when request has valid authorization.', async () => {
    await addUsers(11);
    const token = await auth({
      auth: {
        email: 'user1@mail.com',
        password: 'password',
      },
    });

    const response = await getUsers({ token });

    expect(response.body.totalPages).toBe(1);
  });
});

describe('Get User', () => {
  const getUser = async (id = 5) => {
    return request(app).get(`/api/1.0/users/${id}`);
  };

  it('Returns 404 when user is not found', async () => {
    const response = await getUser();
    expect(response.status).toBe(404);
  });
  it.each`
    language | message
    ${'en'}  | ${'User not found.'}
  `('Returns $message for unknown user when language is set to  $language', async ({ language, message }) => {
    const response = await request(app).get('/api/1.0/users/5').set('Accept-Language', language);
    expect(response.body.message).toBe(message);
  });

  it('Returns a proper body when user not found.', async () => {
    const nowInMilliseconds = new Date().getTime();
    const response = await getUser();
    const error = response.body;

    expect(error.path).toBe('/api/1.0/users/5');
    expect(error.timestamp).toBeGreaterThan(nowInMilliseconds);
    expect(Object.keys(error)).toEqual(['path', 'timestamp', 'message']);
  });

  it('Returns 200 OK when an active user exists', async () => {
    const user = await User.create({
      username: 'user1',
      email: 'user1@mail.com',
      inactive: false,
    });

    const response = await getUser(user.id);
    expect(response.status).toBe(200);
  });

  it('Returns id, username and email when an active user exists', async () => {
    const user = await User.create({
      username: 'user1',
      email: 'user1@mail.com',
      inactive: false,
    });

    const response = await getUser(user.id);
    expect(Object.keys(response.body)).toEqual(['id', 'username', 'email']);
  });

  it('Returns 404 when the user is inactive.', async () => {
    const user = await User.create({
      username: 'user1',
      email: 'user1@mail.com',
      inactive: true,
    });

    const response = await getUser(user.id);
    expect(response.status).toBe(404);
  });
});
