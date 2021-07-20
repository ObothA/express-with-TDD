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

const putUser = async (id = 5, body = null, options = {}) => {
  let agent = request(app);

  let token;
  if (options.auth) {
    const response = await agent.post('/api/1.0/auth').send(options.auth);
    token = response.body.token;
  }

  agent = request(app).put(`/api/1.0/users/${id}`);
  if (token) {
    agent.set('Authorization', `Bearer ${token}`);
  }

  if (options.token) {
    agent.set('Authorization', `Bearer ${options.token}`);
  }

  return agent.send(body);
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

describe('Update User.', () => {
  it('Returns forbiden when request is sent without basic authorization.', async () => {
    const response = await putUser();
    expect(response.status).toBe(403);
  });

  const unauthorized_user_update = 'You are not authorized to update user.';
  it(`Returns error body with ${unauthorized_user_update}.`, async () => {
    const nowInMilliseconds = new Date().getTime();
    const response = await putUser();
    expect(response.body.path).toBe('/api/1.0/users/5');
    expect(response.body.timestamp).toBeGreaterThan(nowInMilliseconds);
    expect(response.body.message).toBe(unauthorized_user_update);
  });

  it('Returns forbiden when request is sent with incorrect email in basic auth.', async () => {
    await addUser();
    const response = await putUser(5, null, {
      auth: {
        email: 'user1000@mail.com',
        password: 'password',
      },
    });
    expect(response.status).toBe(403);
  });

  it('Returns forbiden when request is sent with incorrect password in basic auth.', async () => {
    await addUser();
    const response = await putUser(5, null, {
      auth: {
        email: 'user1000@mail.com',
        password: 'password',
      },
    });
    expect(response.status).toBe(403);
  });

  it('Returns forbidden when update request is sent with correct credentials but for different user.', async () => {
    await addUser();
    const userToBeUpdated = await addUser({
      ...activeUser,
      username: 'user2',
      email: 'user2@mail.com',
    });

    const response = await putUser(userToBeUpdated.id, null, {
      auth: {
        email: 'user1000@mail.com',
        password: 'password',
      },
    });
    expect(response.status).toBe(403);
  });

  it('Returns forbidden when update request is sent by inactive user with correct credentials for its own user.', async () => {
    const inactiveUser = await addUser({
      ...activeUser,
      inactive: true,
    });

    const response = await putUser(inactiveUser.id, null, {
      auth: {
        email: 'user1@mail.com',
        password: 'password',
      },
    });
    expect(response.status).toBe(403);
  });

  it('Returns 200 OK when valid update request is sent from authorized user', async () => {
    const savedUser = await addUser();
    const validUpdate = { username: 'user1-updated' };
    const response = await putUser(savedUser.id, validUpdate, {
      auth: {
        email: savedUser.email,
        password: 'password',
      },
    });

    expect(response.status).toBe(200);
  });

  it('Updates username in database when valid update request is sent from authorized user', async () => {
    const savedUser = await addUser();
    const validUpdate = { username: 'user1-updated' };

    await putUser(savedUser.id, validUpdate, {
      auth: {
        email: savedUser.email,
        password: 'password',
      },
    });

    const inDBUser = await User.findOne({
      where: {
        id: savedUser.id,
      },
    });

    expect(inDBUser.username).toBe(validUpdate.username);
  });

  it('Returns 403 when token is not valid', async () => {
    const response = await putUser(5, null, { token: '123' });
    expect(response.status).toBe(403);
  });
});
