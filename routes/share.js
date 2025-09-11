const express = require('express');


module.exports = (prisma) => {
    const router = express.Router();

    // public endpoint to view folder + files via token
    router.get('/:token', async (req, res, next) => {
        try {
            const { token } = req.params;
            const shared = await prisma.sharedLink.findUnique({
                where: { token },
                include: { folder: { include: { files: true } } }
            });
            if (!shared) return res.status(404).send({ error: 'Link not found' });
            if (shared.expiresAt < new Date()) return res.status(410).send({ error: 'Link expired' });

            // Return folder metadata + files (public)
            const folder = shared.folder;
            const files = folder.files.map(f => ({
                id: f.id,
                name: f.name,
                size: f.size,
                uploadedAt: f.uploadedAt,
                url: f.url || null
            }));


            res.send({ folder: { id: folder.id, name: folder.name }, files });
        } catch (err) {
            next(err);
        }
    });

    return router;
}