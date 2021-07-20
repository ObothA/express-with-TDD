const { verifyToken } = require('../auth/tokenService');

const tokenAuthentication = async (req, res, next) => {
  const { authorization } = req.headers;
  if (authorization) {
    const token = authorization.substring(7);

    try {
      const user = await verifyToken(token);
      req.authenticatedUser = user;
    } catch (error) {
      // eslint-disable-next-line no-empty
    }
  }
  next();
};

module.exports = tokenAuthentication;
