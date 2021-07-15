// eslint-disable-next-line no-unused-vars
module.exports = (err, req, res, next) => {
  const { status, message, errors } = err;

  let validationErrors = {};
  if (errors) {
    errors.forEach((error) => (validationErrors[error.param] = error.msg));
  }

  res.status(status).send({
    path: '',
    timestamp: '',
    message,
    validationErrors,
  });
};
