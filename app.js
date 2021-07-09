const express = require('express');

const app = express();

app.post('/api/1.0/users', (req, res) => {
  return res.send();
});

module.exports = app;
