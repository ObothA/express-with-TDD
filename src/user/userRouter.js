const express = require('express');

const { save } = require('./userService');

const router = express.Router();

router.post('/api/1.0/users', async (req, res) => {
  const user = req.body;

  if (!user.username) {
    return res.status(400).send({
      validationErrors: {
        username: 'username cannot be null',
      },
    });
  }

  await save(req.body);

  return res.send({
    message: 'User created.',
  });
});

module.exports = router;
