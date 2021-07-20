const request = require('supertest');
const app = require('../src/app');
const bcrypt = require('bcrypt');

const User = require('../src/user/User');
const sequelize = require('../src/config/database');

beforeAll(async () => {
  await sequelize.sync();
});

beforeEach(async () => {
  // Clear user table
  await User.destroy({ truncate: true });
});

const activeUser = {
  username: 'user1',
  email: 'user1@mail.com',
  password: 'password',
  inactive: false,
};

const addUser = async (user = { ...activeUser }) => {
  const hash = await bcrypt.hash(user.password, 10);
  user.password = hash;
  return await User.create(user);
};

const postAuthentication = async (credentials) => {
  return await request(app).post('/api/1.0/auth').send(credentials);
};

describe('Authentication', () => {
  it('Returns 200 when credentials are correct', async () => {
    await addUser();
    const response = await postAuthentication({
      username: 'user1',
      email: 'user1@mail.com',
      password: 'password',
    });

    expect(response.status).toBe(200);
  });

  it('Returns only user id and username when login is successful.', async () => {
    const user = await addUser();
    const response = await postAuthentication({
      email: 'user1@mail.com',
      password: 'password',
    });

    expect(response.body.id).toBe(user.id);
    expect(response.body.username).toBe(user.username);
    expect(Object.keys(response.body)).toEqual(['id', 'username']);
  });

  it('Returns 401 when user doesnt exist.', async () => {
    const response = await postAuthentication({
      username: 'user1',
      email: 'user1@mail.com',
    });

    expect(response.status).toBe(401);
  });

  it('Returns proper error body when authentication fails.', async () => {
    const nowInMilliseconds = new Date().getTime();
    const response = await postAuthentication({
      username: 'user1',
      email: 'user1@mail.com',
    });
    const error = response.body;

    expect(error.path).toBe('/api/1.0/auth');
    expect(error.message).toBe('Incorrect Credentials.');
    expect(error.timestamp).toBeGreaterThan(nowInMilliseconds);
    expect(Object.keys(error)).toEqual(['path', 'timestamp', 'message']);
  });

  it('Returns 401 when password is wrong.', async () => {
    await addUser();
    const response = await postAuthentication({
      email: 'user1@mail.com',
      password: 'passwordwe',
    });

    expect(response.status).toBe(401);
  });

  it('Returns 403 when loggin in with an inactive account.', async () => {
    await addUser({
      ...activeUser,
      inactive: true,
    });

    const response = await postAuthentication({
      email: 'user1@mail.com',
      password: 'password',
    });

    expect(response.status).toBe(403);
  });

  it('Returns proper error body when inactive authentication fails.', async () => {
    await addUser({
      ...activeUser,
      inactive: true,
    });

    const nowInMilliseconds = new Date().getTime();
    const response = await postAuthentication({
      email: 'user1@mail.com',
      password: 'password',
    });
    const error = response.body;

    expect(error.path).toBe('/api/1.0/auth');
    expect(error.message).toBe('Account is inactive.');
    expect(error.timestamp).toBeGreaterThan(nowInMilliseconds);
    expect(Object.keys(error)).toEqual(['path', 'timestamp', 'message']);
  });

  it('Returns 401 when e-mail is not valid', async () => {
    const response = await postAuthentication({
      password: 'password',
    });
    expect(response.status).toBe(401);
  });

  it('Returns 401 when password is not valid', async () => {
    const response = await postAuthentication({
      email: 'user1@mail.com',
    });
    expect(response.status).toBe(401);
  });

  it('Returns token in responses body when credentials are correct.', async () => {
    await addUser();
    const response = await postAuthentication({
      email: 'user1@mail.com',
      password: 'password',
    });

    // expect(response.body.token).not.toBeUndefined();
    expect(response.body.token).toBeTruthy();
  });
});
