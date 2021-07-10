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

const validUser = {
  username: 'user1',
  email: 'user1@mail.com',
  password: 'P4ssword',
};

const postUser = (user = validUser) => {
  return request(app).post('/api/1.0/users').send(user);
};

describe('User Registration', () => {
  it('Returns 200 OK when signup request is valid.', async () => {
    const response = await postUser();
    expect(response.status).toBe(200);
  });

  it('Returns success message when signup is valid.', async () => {
    const response = await postUser();
    expect(response.body.message).toBe('User created.');
  });

  it('Saves the user to the database.', async () => {
    await postUser();
    const userList = await User.findAll();
    expect(userList.length).toBe(1);
  });

  it('Saves the username and email to the database.', async () => {
    await postUser();

    const userList = await User.findAll();
    const savedUser = userList[0];
    expect(savedUser.username).toBe('user1');
    expect(savedUser.email).toBe('user1@mail.com');
  });

  it('Hashes password in database', async () => {
    await postUser();
    const userList = await User.findAll();
    const savedUser = userList[0];
    expect(savedUser.password).not.toBe('P4ssword');
  });

  it('Returns 400 when username is null', async () => {
    const response = await postUser({
      username: null,
      email: 'user1@mail.com',
      password: 'P4ssword',
    });

    expect(response.status).toBe(400);
  });

  it('Returns validationErrors field in response body when validation error occurs', async () => {
    const response = await postUser({
      username: null,
      email: 'user1@mail.com',
      password: 'P4ssword',
    });
    const body = response.body;
    expect(body.validationErrors).not.toBeUndefined();
  });

  it('Returns errors for both username and email when they are null', async () => {
    const response = await postUser({
      username: null,
      email: null,
      password: 'P4ssword',
    });
    const body = response.body;
    expect(Object.keys(body.validationErrors)).toEqual(['username', 'email']);
  });

  // dynamic test
  it.each`
    field         | value             | expectedMessage
    ${'username'} | ${null}           | ${'username cannot be null'}
    ${'username'} | ${'usr'}          | ${'Must have min 4 and max 32 characters'}
    ${'username'} | ${'a'.repeat(33)} | ${'Must have min 4 and max 32 characters'}
    ${'email'}    | ${null}           | ${'E-mail cannot be null'}
    ${'password'} | ${null}           | ${'password cannot be null'}
  `('Returns $expectedMessage when $field is $value', async ({ field, expectedMessage, value }) => {
    const user = {
      username: 'user1',
      email: 'user1@mail.com',
      password: 'eyiwownikdoww',
    };
    user[field] = value;
    const response = await postUser(user);
    const body = response.body;
    expect(body.validationErrors[field]).toBe(expectedMessage);
  });

  /*
  it('Returns username cannot be null when username is null', async () => {
    const response = await postUser({
      username: null,
      email: 'user1@mail.com',
      password: 'P4ssword',
    });
    const body = response.body;
    expect(body.validationErrors.username).toBe('username cannot be null');
  });

  it('Returns E-mail cannot be null when email is null', async () => {
    const response = await postUser({
      username: 'user1',
      email: null,
      password: 'P4ssword',
    });
    const body = response.body;
    expect(body.validationErrors.email).toBe('E-mail cannot be null');
  });

  it('Returns password cannot be null when a null password is provided', async () => {
    const response = await postUser({
      username: 'user1',
      email: 'user1@mail.com',
      password: null,
    });
    const body = response.body;
    expect(body.validationErrors.password).toBe('password cannot be null');
  });
*/
});
