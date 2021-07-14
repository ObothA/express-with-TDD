module.exports = function EmailException() {
  this.message = 'E-mail failure.';
  this.status = 502;
};
