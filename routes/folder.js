const { error } = require('console');
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
            if (!name) return res.status(400).send({ error: 'name required' });
            const folder = await prisma.folder.create({
                data: { name, ownerId: req.user.id }
            });
            res.status(201).send(folder);
        } catch (err) { next(err); }
    });

    // List folders for user
    router.get('/', async (req, res, next) => {
        try {
            const folders = await prisma.folder.findMany({
                where: { ownerId: req.user.id },
                include: { files: true }
            });
            res.send(folders);
        } catch (err) { next(err); }
    });

    // Get single folder
    router.get('/:id', async (req, res, next) => {
        try {
            const folder = await prisma.folder.findUnique({
                where: { id: req.params.id },
                include: { files: true }
            });
            if (!folder || folder.ownerId !== req.user.id) return res.status(404).send({ error: 'Not found' });
            res.send(folder);
        } catch (err) { next(err); }
    });

    // Update folder (e.g., rename)
    router.patch('/:id', async (req, res, next) => {
        try {
            const folder = await prisma.folder.findUnique({ where:  { id: req.params.id } });
            if (!folder || folder.ownerId !== req.user.id) return res.status(404).send({ error: 'Not found' });

            // Delete shared links
            await prisma.sharedLink.deleteMany({ where: { folderId: folder.id } });
            
            // Delete files and clean up storage
            const files = await prisma.file.findMany({ where: { folderId: folder.id } });
            for (const file of files) {
                if (file.localPath && fstat.existsSync(file.localPath)) {
                    fs.unLinkSync(file.localPath);
                }
            }
                await prisma.file.deleteMany({ where: { folderId: folder.id } });

                await prisma.folder.delete({ where: { id: req.params.id } });
                res.send({ ok: true });
        } catch (err) { next(err); }
    });

    // Delete folder
    router.delete('/:id', async (req, res, next) => {
        try {
            const folder = await prisma.folder.findUnique({ where: { id: req.params.id } });
            if (!folder || folder.ownerId !== req.user.id) return res.status(404).send({ error: 'Not found' });
            await prisma.folder.delete({ where: { id: req.params.id } });
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
                data: { folderId: folder.id, token, expireAt: expiresAt }
            });

            const url = `${req.protocol}://${req.get('host')}/index.html?token=${token}`;
            res.send({ url, expiresAt });
        } catch (err) { next(err); }
    });

    return router;
};