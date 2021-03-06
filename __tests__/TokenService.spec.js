const sequelize = require('../src/config/database');

const Token = require('../src/auth/Token');
const { scheduledCleanUp } = require('../src/auth/tokenService');

beforeAll(async () => {
  await sequelize.sync();
});

beforeEach(async () => {
  await Token.destroy({ truncate: true });
});

describe('Scheduled token cleanup', () => {
  it('Clears the expired tokens with a scheduled task', async () => {
    jest.useFakeTimers();
    const token = 'test-token';
    //prettier-ignore
    const eightDaysAgo = new Date(Date.now() - (8 * 24 * 60 * 60 * 1000));
    await Token.create({
      token,
      lastUsedAt: eightDaysAgo,
    });

    scheduledCleanUp();

    jest.advanceTimersByTime(60 * 60 * 1000 + 5000); // 1 hours + 5 seconds

    const tokenInDB = await Token.findOne({
      where: {
        token,
      },
    });

    expect(tokenInDB).toBeNull();
  });
});
