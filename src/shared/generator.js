const crypto = require('crypto');

const randomString = (length) => {
  return crypto.randomBytes(length).toString('hex').substring(0, length);

  // gets half the data to get our require length
  // .substring(0, length);
};

module.exports = {
  randomString,
};
