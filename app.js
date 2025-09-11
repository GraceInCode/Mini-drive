require('dotenv').config();
const express = require('express');
const session = require('express-session');
const { PrismaClient } = require('@prisma/client');
const { PrismaSessionStore } = require('@quixo3/prisma-session-store');
const passport = require('passport');
const path = require('path');
const fs = require('fs');
const { nextTick } = require('process');
const { type } = require('os');

const prisma = new PrismaClient();
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// static uploads folder
const UPLOADS_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR);

// session
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 1000 * 60 * 60 * 24 }, // 1 day
    store: new PrismaSessionStore(
        prisma,
        {
            checkPeriod: 2 * 60 * 1000,  // prune expired session every 2 minutes
            dbRecordIdIsSessionId: true,
            dbRecordIdFunction: undefined,
        }
    )
}));

// passport strategy wiring 
require('./auth')(passport, prisma);

// Passport initialization
app.use(passport.initialize());
app.use(passport.session());

// helper to load route modules that may export either a router or a function that takes prisma and returns a router
function loadRoute(modulePath, ...deps) {
    const mod = require(modulePath);
    // if module exports a function, call it with dependencies and expect a router
    if (typeof mod === 'function') {
        return mod(...deps);
    }
    // if it already exported an Express router (object with 'use' property), return as is
    if (mod && typeof mod === 'object' && typeof mod.use === 'function') {
        return mod;
    }
    // if module exported an object containing router property, try that
    if (mod && mod.router && typeof mod.router.use === 'function') {
        return mod.router;
    }
    // Otherwise throw informative error
    throw new Error(`Module at ${modulePath} does not export a valid Express router or a function returning one.`);
}

// Use the loader to attach routes
app.use('/auth', loadRoute('./routes/auth', passport));
app.use('/folders', loadRoute('./routes/folder', prisma));
app.use('/files', loadRoute('./routes/files', prisma, UPLOADS_DIR));

// public share route
app.use('/share', loadRoute('./routes/share', prisma));

// basic home route
app.get('/', (req, res) => {
  res.send({ message: "Mini Drive API. You're authenticated? " + (!!req.user) });
});

// error handling minimal
app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).send({ error: err.message || 'Internal Server Error' });
})

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});