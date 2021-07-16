module.exports = function ForbidenException() {
  this.status = 403;
  this.message = 'Account is inactive.';
};
