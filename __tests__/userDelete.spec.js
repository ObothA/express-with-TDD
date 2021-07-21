const request = require('supertest');
const bcrypt = require('bcrypt');

const app = require('../src/app');
const User = require('../src/user/User');
const sequelize = require('../src/config/database');

beforeAll(async () => {
  await sequelize.sync();
});

beforeEach(async () => {
  // Clear user table
  await User.destroy({ truncate: true });
});

const auth = async (options = {}) => {
  let token;
  if (options.auth) {
    const response = await request(app).post('/api/1.0/auth').send(options.auth);
    token = response.body.token;
  }
  return token;
};

const deleteUser = async (id = 5, options = {}) => {
  const agent = request(app).delete(`/api/1.0/users/${id}`);

  if (options.token) {
    agent.set('Authorization', `Bearer ${options.token}`);
  }

  return agent.send();
};

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

describe('User Delete.', () => {
  it('Returns forbiden when request is sent unauthorized.', async () => {
    const response = await deleteUser();
    expect(response.status).toBe(403);
  });

  const unauthorized_user_delete = 'You are not authorized to delete user.';
  it(`Returns error body with ${unauthorized_user_delete}.`, async () => {
    const nowInMilliseconds = new Date().getTime();
    const response = await deleteUser();
    expect(response.body.path).toBe('/api/1.0/users/5');
    expect(response.body.timestamp).toBeGreaterThan(nowInMilliseconds);
    expect(response.body.message).toBe(unauthorized_user_delete);
  });

  it('Returns forbidden when delete request is sent with correct credentials but for different user.', async () => {
    await addUser();
    const userToBeDeleted = await addUser({
      ...activeUser,
      username: 'user2',
      email: 'user2@mail.com',
    });

    const token = await auth({
      auth: {
        email: 'user1@mail.com',
        password: 'password',
      },
    });

    const response = await deleteUser(userToBeDeleted.id, { token });
    expect(response.status).toBe(403);
  });

  it('Returns 403 when token is not valid', async () => {
    const response = await deleteUser(5, { token: '123' });
    expect(response.status).toBe(403);
  });

  it('Returns 200 OK when delete request is sent from authorized user', async () => {
    const savedUser = await addUser();

    const token = await auth({
      auth: {
        email: 'user1@mail.com',
        password: 'password',
      },
    });

    const response = await deleteUser(savedUser.id, { token });

    expect(response.status).toBe(200);
  });

  it('Deletes user from database when valid delete request is sent from authorized user', async () => {
    const savedUser = await addUser();

    const token = await auth({
      auth: {
        email: 'user1@mail.com',
        password: 'password',
      },
    });

    await deleteUser(savedUser.id, { token });

    const inDBUser = await User.findOne({
      where: {
        id: savedUser.id,
      },
    });

    expect(inDBUser).toBeNull();
  });
});
