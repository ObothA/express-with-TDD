const express = require('express');

const { save } = require('./userService');

const router = express.Router();

router.post('/api/1.0/users', async (req, res) => {
  await save(req.body);

  return res.send({
    message: 'User created.',
  });
});

module.exports = router;
