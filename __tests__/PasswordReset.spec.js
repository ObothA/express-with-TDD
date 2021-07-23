const request = require('supertest');
const bcrypt = require('bcrypt');
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

const addUser = async (user = { ...activeUser }) => {
  const hash = await bcrypt.hash(user.password, 10);
  user.password = hash;
  return await User.create(user);
};

const activeUser = {
  username: 'user1',
  email: 'user1@mail.com',
  password: 'password',
  inactive: false,
};

const postPasswordReset = (email = 'user1@mail.com') => {
  const agent = request(app).post('/api/1.0/user/password');
  return agent.send({
    email,
  });
};

const putPasswordUpdate = (body = {}, options = {}) => {
  const agent = request(app).put('/api/1.0/user/password');

  return agent.send(body);
};

describe('Password Reset Request', () => {
  it('Returns 404 when a password reset request is sent for an unknown e-mail.', async () => {
    const response = await postPasswordReset();

    expect(response.status).toBe(404);
  });

  const email_not_inuse = 'E-mail not found.';
  it(`Returns error body with ${email_not_inuse} for unknown email for password reset.`, async () => {
    const nowInMilliseconds = new Date().getTime();
    const response = await postPasswordReset();

    expect(response.body.path).toBe('/api/1.0/user/password');
    expect(response.body.timestamp).toBeGreaterThan(nowInMilliseconds);
    expect(response.body.message).toBe(email_not_inuse);
  });

  const email_invalid = 'E-mail is not valid.';
  it(`Returns 400 bad request with message "${email_invalid}" when request does not have valid email.`, async () => {
    const response = await postPasswordReset(null);

    expect(response.body.validationErrors.email).toBe(email_invalid);
    expect(response.status).toBe(400);
  });

  it('Returns 200 OK when a password reset request is sent for known e-mail', async () => {
    const user = await addUser();
    const response = await postPasswordReset(user.email);
    expect(response.status).toBe(200);
  });

  const password_reset_request_success = 'Check your email to reset your password.';
  it(`Returns success response with message "${password_reset_request_success}" for known email for password reset.`, async () => {
    const user = await addUser();
    const response = await postPasswordReset(user.email);
    expect(response.body.message).toBe(password_reset_request_success);
  });

  it('Creates a password reset token when a password reset request is sent for a known e-mail.', async () => {
    const user = await addUser();
    await postPasswordReset(user.email);
    const userInDB = await User.findOne({
      where: {
        email: user.email,
      },
    });

    expect(userInDB.passwordResetToken).toBeTruthy();
  });

  it('Sends a password reset email with password reset token.', async () => {
    const user = await addUser();
    await postPasswordReset(user.email);
    const userInDB = await User.findOne({
      where: {
        email: user.email,
      },
    });

    const passwordResetToken = userInDB.passwordResetToken;
    expect(lastMail).toContain('user1@mail.com');
    expect(lastMail).toContain(passwordResetToken);
  });

  it('Returns 502 bad gateway when sending email fails.', async () => {
    simulateSmtpFailure = true;

    const user = await addUser();
    const response = await postPasswordReset(user.email);

    expect(response.status).toBe(502);
  });

  const email_failure = 'E-mail failure.';
  it(`Returns "${email_failure}" after email failure.`, async () => {
    simulateSmtpFailure = true;

    const user = await addUser();
    const response = await postPasswordReset(user.email);

    expect(response.body.message).toBe(email_failure);
  });
});

describe('Password update', () => {
  it('Returns 403 when password update request does not have a valid password reset token', async () => {
    const response = await putPasswordUpdate({
      password: 'passowrd-reset',
      passwordResetToken: 'abcd',
    });
    expect(response.status).toBe(403);
  });

  const unauthorized_password_reset =
    'You are not authorized to update password. Please follow the password update steps again.';
  it(`Returns error body with message "${unauthorized_password_reset}" after trying to update with invalid token`, async () => {
    const nowInMilliseconds = new Date().getTime();
    const response = await putPasswordUpdate({
      password: 'passowrd-reset',
      passwordResetToken: 'abcd',
    });

    expect(response.body.path).toBe('/api/1.0/user/password');
    expect(response.body.timestamp).toBeGreaterThan(nowInMilliseconds);
    expect(response.body.message).toBe(unauthorized_password_reset);
  });

  it('Returns 403 when password update request with invalid password pattern and reset token is invalid', async () => {
    const response = await putPasswordUpdate({
      password: 'not-valid',
      passwordResetToken: 'abcd',
    });
    expect(response.status).toBe(403);
  });

  it('Returns 400 bad request when trying to update with invalid password and reset token is valid', async () => {
    const user = await addUser();
    user.passwordResetToken = 'test-token';
    await user.save();

    const response = await putPasswordUpdate({
      password: 'not-valid',
      passwordResetToken: 'test-token',
    });
    expect(response.status).toBe(400);
  });

  const password_null = 'password cannot be null';
  const password_size = 'password must be at least 6 characters.';
  const password_pattern = 'password must have at least 1 uppercase, 1 lowercase and 1 number.';
  it.each`
    field         | value              | expectedMessage
    ${'password'} | ${null}            | ${password_null}
    ${'password'} | ${'P4ssw'}         | ${password_size}
    ${'password'} | ${'alllowercase'}  | ${password_pattern}
    ${'password'} | ${'ALLUPPERCASE'}  | ${password_pattern}
    ${'password'} | ${'12345678'}      | ${password_pattern}
    ${'password'} | ${'lowerandUPPER'} | ${password_pattern}
    ${'password'} | ${'lowerand12345'} | ${password_pattern}
    ${'password'} | ${'UPPERAND12345'} | ${password_pattern}
  `(
    'Returns password validation error $expectedMessage when $field is $value',
    async ({ field, expectedMessage, value }) => {
      const user = await addUser();
      user.passwordResetToken = 'test-token';
      await user.save();

      const response = await putPasswordUpdate({
        password: value,
        passwordResetToken: 'test-token',
      });
      expect(response.body.validationErrors.password).toBe(expectedMessage);
    }
  );
});
