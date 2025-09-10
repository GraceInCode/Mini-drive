require('dotenv').config();
const express = require('express');
const session = require('express-session');
const { PrismaClient } = require('@prisma/client');
const { PrismaSessionStore } = require('@quixo3/prisma-session-store');
const { passport } = require('passport');
const path = require('path');
const fs = require('fs');
const { nextTick } = require('process');

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

// Passport initialization
app.use(passport.initialize());
app.use(passport.session());

// passport strategy wiring 
require('./auth')(passport, prisma);

// routes
app.use('/auth', require('./routes/auth'))(passport);
app.use('/folders', require('./routes/folders'))(prisma);
app.use('/files', require('./routes/files'))(prisma, UPLOADS_DIR);

// public share route
app.use('/share', require('./routes/share')(prisma));

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