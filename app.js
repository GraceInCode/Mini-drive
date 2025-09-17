require('dotenv').config();
const express = require('express');
const session = require('express-session');
const { PrismaClient } = require('@prisma/client');
const passport = require('passport');
const path = require('path');
const fs = require('fs');
const cors = require('cors');

const prisma = new PrismaClient();
const app = express();

// Custom Prisma Session Store
class PrismaStore extends session.Store {
    constructor(prisma) {
        super();
        this.prisma = prisma;
        
        // Prune expired sessions periodically (every 2 minutes, as in your original)
        setInterval(async () => {
            try {
                await this.prisma.session.deleteMany({ where: { expiresAt: { lt: new Date() } } });
            } catch (err) {
                console.error('Error pruning sessions:', err);
            }
        }, 2 * 60 * 1000);
    }

    async get(sid, cb) {
        try {
            const sessionRecord = await this.prisma.session.findUnique({ where: { sid } });
            if (!sessionRecord) return cb(null, null);
            if (sessionRecord.expiresAt < new Date()) {
                await this.destroy(sid);
                return cb(null, null);
            }
            try {
                return cb(null, JSON.parse(sessionRecord.data));
            } catch (e) {
                return cb(e);
            }
        } catch (err) {
            cb(err);
        }
    }

    async set(sid, sess, cb) {
        try {
            const data = JSON.stringify(sess);
            const expiresAt = new Date(Date.now() + (sess.cookie.maxAge || 86400000)); // Default to 1 day if no maxAge
            await this.prisma.session.upsert({
                where: { sid },
                update: { data, expiresAt },
                create: { sid, data, expiresAt }
            });
            cb(null);
        } catch (err) {
            cb(err);
        }
    }

    async destroy(sid, cb) {
        try {
            await this.prisma.session.deleteMany({ where: { sid } });
            cb(null);
        } catch (err) {
            cb(err);
        }
    }
}

app.use(express.static(path.join(__dirname, 'public')));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// enable CORS for all routes (for simplicity, adjust as needed for production)
app.set('trust proxy', 1); // trust first proxy if behind one

app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
}));


// static uploads folder
const UPLOADS_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR);

// session - Use custom PrismaStore
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: { 
      maxAge: 1000 * 60 * 60 * 24, // 1 day
      secure: false, //
      sameSite: process.env.NODE_ENV === 'production' ? 'lax' : 'lax' 
    }, 
    store: new PrismaStore(prisma)
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
app.use('/auth', loadRoute('./routes/auth', passport, prisma));
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