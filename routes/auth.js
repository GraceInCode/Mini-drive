const express = require('express');
const bcrypt = require('bcrypt');
const passport = require('passport');
const { error } = require('console');
const { ok } = require('assert');

module.exports = (passport, prisma) => {
  const router = express.Router();

  // Register
  router.post('/register', async (req, res, next) => {
    try {
      const { email, password } = req.body;
      console.log('registering user:', { email });
      if (!email || !password) return res.status(400).send({ error: 'Email or password are required.' });
      const exists = await prisma.user.findUnique({ where: { email } });
      if (exists) return res.status(400).send({ error: 'User already exists.' });
      const hash = await bcrypt.hash(password, 10);
      const user = await prisma.user.create({ data: { email, password: hash } });
      req.login(user, (err) => {
        if (err) {
          console.error('Login error:', err);
          return next(err);
        }
        console.log('User registered and logged in:', user);
        return res.status(201).send({ id: user.id, email: user.email });
      });
    } catch (err) {
      console.error('Error registering user:', err);
      return next(err);
    }
  });

  // Login
  router.post('/login', (req, res, next) => {
    console.log('Login attempt:', req.body.email);
    passport.authenticate('local', (err, user, info) => {
      if (err) {
        console.error('Login error:', err);
        return next(err);
      }
      if (!user) {
        console.log('Authentication failed:', info?.message);
        return res.status(401).send({ error: info?.message });
      }
      req.login(user, (err) => {
        if (err) {
          console.error('Login error:', err);
          return next(err);
        }
        console.log('User logged in:', user.id);
        return res.send({ id: user.id, email: user.email });
      });
    })(req, res, next);
  });

  // Logout
  router.post('/logout', (req, res) => {
    console.log('Logout attempt');
    req.logout(() => {
      req.session.destroy(() => {
        console.log('Sesssion destroyed');
        res.send({ ok: true });
      });
    });
  });

  // Current user
  router.get('/me', (req, res) => {
    console.log('GET /auth/me, user:', req.user ? req.user.id : 'none');
    if (req.user) {
      res.send({ id: req.user.id, email: req.user.email });
    } else {
      res.status(401).send({ error: 'unauthenticated' });
    }
  });

  return router;
}