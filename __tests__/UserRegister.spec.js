const request = require('supertest');
const { SMTPServer } = require('smtp-server');
const config = require('config');

const app = require('../src/app');
const User = require('../src/user/User');
const sequelize = require('../src/config/database');

let lastMail, mailServer;
let simulateSmtpFailure = false;

beforeAll(async () => {
  mailServer = new SMTPServer({
    authOptional: true,
    onData(stream, session, callback) {
      let mailBody;
      stream.on('data', (data) => {
        mailBody += data.toString();
      });
      stream.on('end', () => {
        if (simulateSmtpFailure) {
          const err = new Error('Invalid mailbox');
          err.ResponseCode = 553;
          return callback(err);
        }
        lastMail = mailBody;
        callback();
      });
    },
  });

  await mailServer.listen(config.mail.port, 'localhost');

  await sequelize.sync();
});

beforeEach(async () => {
  simulateSmtpFailure = false;

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

afterAll(async () => {
  await mailServer.close();
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

  const username_null = 'username cannot be null';
  const username_size = 'Must have min 4 and max 32 characters';
  const email_null = 'E-mail cannot be null';
  const email_invalid = 'E-mail is not valid';
  const password_null = 'password cannot be null';
  const password_size = 'password must be at least 6 characters.';
  const password_pattern = 'password must have at least 1 uppercase, 1 lowercase and 1 number.';

  // dynamic test
  it.each`
    field         | value              | expectedMessage
    ${'username'} | ${null}            | ${username_null}
    ${'username'} | ${'usr'}           | ${username_size}
    ${'username'} | ${'a'.repeat(33)}  | ${username_size}
    ${'email'}    | ${null}            | ${email_null}
    ${'email'}    | ${'mail.com'}      | ${email_invalid}
    ${'email'}    | ${'user.mail.com'} | ${email_invalid}
    ${'email'}    | ${'user@mail'}     | ${email_invalid}
    ${'password'} | ${null}            | ${password_null}
    ${'password'} | ${'P4ssw'}         | ${password_size}
    ${'password'} | ${'alllowercase'}  | ${password_pattern}
    ${'password'} | ${'ALLUPPERCASE'}  | ${password_pattern}
    ${'password'} | ${'12345678'}      | ${password_pattern}
    ${'password'} | ${'lowerandUPPER'} | ${password_pattern}
    ${'password'} | ${'lowerand12345'} | ${password_pattern}
    ${'password'} | ${'UPPERAND12345'} | ${password_pattern}
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

  const email_in_use = 'E-mail already in use.';
  it(`Returns ${email_in_use} when email is already in use.`, async () => {
    await User.create({ ...validUser });
    const response = await postUser();
    expect(response.body.validationErrors.email).toBe(email_in_use);
  });

  it('Returns errors for both username is null and email is in use.', async () => {
    await User.create({ ...validUser });
    const response = await postUser({
      username: null,
      email: validUser.email,
      password: 'PAssword 23',
    });
    const { body } = response;
    expect(Object.keys(body.validationErrors)).toEqual(['username', 'email']);
  });

  it('Creates a user in inactive mode', async () => {
    await postUser();
    const users = await User.findAll();
    const savedUser = users[0];
    expect(savedUser.inactive).toBe(true);
  });

  it('Creates a user in inactive mode even when body contains inactive as false', async () => {
    const newUser = {
      ...validUser,
      inactive: false,
    };
    await postUser(newUser);
    const users = await User.findAll();
    const savedUser = users[0];
    expect(savedUser.inactive).toBe(true);
  });

  it('Creates an activationToken for user', async () => {
    await postUser();
    const users = await User.findAll();
    const savedUser = users[0];
    expect(savedUser.activationToken).toBeTruthy();
  });

  it('Sends an Account activation email with activationToken', async () => {
    await postUser();

    const users = await User.findAll();
    const savedUser = users[0];

    expect(lastMail).toContain('user1@mail.com');
    expect(lastMail).toContain(savedUser.activationToken);
  });

  it('Returns 502 Bad Gateway when sending email fails', async () => {
    simulateSmtpFailure = true;
    const response = await postUser();
    expect(response.status).toBe(502);
  });

  it('Returns email failure message when sending email fails.', async () => {
    simulateSmtpFailure = true;
    const response = await postUser();
    expect(response.body.message).toBe('E-mail failure.');
  });

  it('Doesnt save user to database if activation fails.', async () => {
    simulateSmtpFailure = true;
    await postUser();

    const users = await User.findAll();
    expect(users.length).toBe(0);
  });

  it('Returns validation failure message in error response body when validation fails', async () => {
    const response = await postUser({
      username: null,
      email: validUser.email,
      password: 'whjddPwh2',
    });
    expect(response.body.message).toBe('validation failure');
  });
});

describe('Account activation', () => {
  it('Activates the account when correct token is sent', async () => {
    await postUser();
    let users = await User.findAll();
    const token = users[0].activationToken;

    await request(app).post(`/api/1.0/users/token/${token}`).send();
    users = await User.findAll();
    expect(users[0].inactive).toBe(false);
  });

  it('Removes token from the user table after activation.', async () => {
    await postUser();
    let users = await User.findAll();
    const token = users[0].activationToken;

    await request(app).post(`/api/1.0/users/token/${token}`).send();
    users = await User.findAll();
    expect(users[0].activationToken).toBeFalsy();
  });

  it('It doesnt activate the account when the token is wrong.', async () => {
    await postUser();
    const token = 'this-token-does-not-exist';

    await request(app).post(`/api/1.0/users/token/${token}`).send();
    const users = await User.findAll();
    expect(users[0].inactive).toBe(true);
  });

  it('It returns bad request when the token is wrong.', async () => {
    await postUser();
    const token = 'this-token-does-not-exist';

    const response = await request(app).post(`/api/1.0/users/token/${token}`).send();
    expect(response.status).toBe(400);
  });
});

describe('Error Model', () => {
  it('Returns path, timestamp, message and validation errors when validation fails.', async () => {
    const response = await postUser({
      ...validUser,
      username: null,
    });
    const body = response.body;
    expect(Object.keys(body)).toEqual(['path', 'timestamp', 'message', 'validationErrors']);
  });

  it('Returns path, timestamp, message in response when request fails other than validation errorr.', async () => {
    const token = 'this-token-does-not-exist';

    const response = await request(app).post(`/api/1.0/users/token/${token}`).send();
    const body = response.body;
    expect(Object.keys(body)).toEqual(['path', 'timestamp', 'message']);
  });

  it('Returns path in error object.', async () => {
    const token = 'this-token-does-not-exist';

    const response = await request(app).post(`/api/1.0/users/token/${token}`).send();
    const body = response.body;
    expect(body.path).toEqual(`/api/1.0/users/token/${token}`);
  });

  it('Returns timestamp in milliseconds withing 5 seconds value in error body', async () => {
    const nowInMills = new Date().getTime();
    const fiveSecondsLater = nowInMills + 5 * 1000;
    const token = 'this-token-does-not-exist';

    const response = await request(app).post(`/api/1.0/users/token/${token}`).send();
    const body = response.body;
    expect(body.timestamp).toBeGreaterThan(nowInMills);
    expect(body.timestamp).toBeLessThan(fiveSecondsLater);
  });
});
