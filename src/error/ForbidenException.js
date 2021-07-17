module.exports = function ForbidenException(message) {
  this.status = 403;
  this.message = message || 'Account is inactive.';
};
