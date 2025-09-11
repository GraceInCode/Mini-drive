const express = require('express');
const { v4: uuidv4 } = require('uuid');

module.exports = (prisma) => {
    const router = express.Router();

    // middleware: require authentication
    function ensureAuth(req, res, next) {
        if (req.isAuthenticated && req.isAuthenticated()) return next();
        return res.status(401).send({ error: 'unauthenticated' });
    }

    router.use(ensureAuth);

    // Create folder
    router.post('/', async (req, res, next) => {
        try {
            const { name } = req.body;
            if (!name) return res.status(401).send({ error: 'name required' });
            const folder = await prisma.folder.create({
                data: { name, ownerId: req.user.id }
            });
            res.status(201).send(folder);
        } catch (err) { next(err); }
    });

    // List folders for user
    router.get('/', async (req, res, next) => {
        try {
            const folder = await prisma.folder.findFirst({
                where: { id: req.params.id, ownerId: req.user.id },
                include: { files: true }
            });
            if (!folder) return res.status(404).send({ error: 'Not found' });
            res.send(folder);
        } catch (err) { next(err); }
    });

    // Update
    router.patch('/:id', async (req, res, next) => {
        try {
            await prisma.folder.deleteMany({ where: { id: req.params.id, ownerId: req.user.id }});
            res.send({ ok: true });
        } catch (err) { next(err); }
    });

    // Share folder -> generate token and expiry
    router.post('/:id/share', async (req, res, next) => {
        try {
            const { duration = '1d' } = req.body;
            // Check folder exists and owned by user
            const folder = await prisma.folder.findFirst({ where: { id: req.params.id, ownerId: req.user.id }});
            if (!folder) return res.status(404).send({ error: 'Not found' });

            const days = parseInt(duration.replace(/[^0-9]/g, ''), 10) || 1;
            const expiresAt = new Date(Date.now() + days * 24 * 3600 * 1000);
            const token = uuidv4();

            const shared = await prisma.sharedLink.create({
                data: { folderId: folder.id, token, expiresAt }
            });

            const url = `${req.protocol}://${req.get('host')}/share/${token}`;
            res.send({ url, expiresAt });
        } catch (err) { next(err); }
    });

    return router;
};