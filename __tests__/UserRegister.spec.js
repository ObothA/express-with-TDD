const request = require('supertest');

const app = require('../src/app');
const User = require('../src/user/User');
const sequelize = require('../src/config/database');

beforeAll(() => {
  return sequelize.sync();
});

beforeEach(() => {
  /** Clear the table before each test */
  return User.destroy({ truncate: true });
});

describe('User Registration', () => {
  const postValidUser = () => {
    return request(app).post('/api/1.0/users').send({
      username: 'user1',
      email: 'user1@mail.com',
      password: 'P4ssword',
    });
  };

  it('Returns 200 OK when signup request is valid.', async () => {
    const response = await postValidUser();
    expect(response.status).toBe(200);
  });

  it('Returns success message when signup is valid.', async () => {
    const response = await postValidUser();
    expect(response.body.message).toBe('User created.');
  });

  it('Saves the user to the database.', async () => {
    await postValidUser();
    const userList = await User.findAll();
    expect(userList.length).toBe(1);
  });

  it('Saves the username and email to the database.', async () => {
    await postValidUser();

    const userList = await User.findAll();
    const savedUser = userList[0];
    expect(savedUser.username).toBe('user1');
    expect(savedUser.email).toBe('user1@mail.com');
  });

  it('Hashes password in database', async () => {
    await postValidUser();
    const userList = await User.findAll();
    const savedUser = userList[0];
    expect(savedUser.password).not.toBe('P4ssword');
  });
});
