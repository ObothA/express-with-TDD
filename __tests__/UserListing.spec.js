const request = require('supertest');

const app = require('../src/app');

describe('Listing Users.', () => {
  it('Returns 200 OK when there are no users in the database.', async () => {
    const response = await request(app).get('/api/1.0/users');
    expect(response.status).toBe(200);
  });

  it('Returns page object as response body.', async () => {
    const response = await request(app).get('/api/1.0/users');
    expect(response.body).toEqual({
      content: [],
      page: 0,
      size: 10,
      totalPages: 0,
    });
  });
});
