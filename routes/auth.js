const express = require('express');
const bcrypt = require('bcrypt');

module.exports = (passport) => {
  const router = express.Router();
  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient();

  // Register
  router.post('/register', async (req, res, next) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) return res.status(400).send({ error: 'Email and password are required.' });
      const exists = await prisma.user.findUnique({ where: { email } });
      if (exists) return res.status(400).send({ error: 'Email already in use.' });
      const hash = await bcrypt.hash(password, 10);
      const user = await prisma.user.create({ data: { email, password: hash }});
      req.login(user, err => {
        if (err) return next(err);
        return res.status(201).send({ id: user.id, email: user.email });
      });
    } catch (err) {
      next(err);
    }
  });

  // Login
  router.post('/login', (req, res, next) => {
    passport.authenticate('local', (err, user, info) => {
      if (err) return next(err);
      if (!user) return res.status(401).send({ error: info?.message || 'authentication failed' });
      req.login(user, (err) => {
        if (err) return next(err);
        return res.send({ id: user.id, email: user.email });
      });
    })(req, res, next);
  });

  // Logout
  router.post('/logout', (req, res) => {
    req.logout(() => {
      req.session.destroy(() => {
        res.send({ ok: true });
      });
    });
  });

  return router;
};
