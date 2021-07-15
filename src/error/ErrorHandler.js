// eslint-disable-next-line no-unused-vars
module.exports = (err, req, res, next) => {
  const { status, message, errors } = err;

  let responseObject = {
    path: req.originalUrl,
    timestamp: new Date().getTime(),
    message,
  };

  if (errors) {
    const validationErrors = {};
    errors.forEach((error) => (validationErrors[error.param] = error.msg));
    responseObject = {
      ...responseObject,
      validationErrors,
    };
  }

  res.status(status).send(responseObject);
};
