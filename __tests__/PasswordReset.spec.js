const request = require('supertest');

const app = require('../src/app');

const postPasswordReset = (email = 'user1@mail.com') => {
  const agent = request(app).post('/api/1.0/password-reset');
  return agent.send({
    email,
  });
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

    expect(response.body.path).toBe('/api/1.0/password-reset');
    expect(response.body.timestamp).toBeGreaterThan(nowInMilliseconds);
    expect(response.body.message).toBe(email_not_inuse);
  });

  const email_invalid = 'E-mail is not valid.';
  it(`Returns 400 bad request with message "${email_invalid}" when request does not have valid email.`, async () => {
    const response = await postPasswordReset(null);

    expect(response.body.validationErrors.email).toBe(email_invalid);
    expect(response.status).toBe(400);
  });
});
