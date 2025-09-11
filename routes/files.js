const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const e = require('express');
const cloudinary = require('cloudinary').v2;

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

module.exports = (prisma, UPLOADS_DIR) => {
    const router = express.Router();


    function ensureAuth(req, res, next) {
        if (req.isAuthenticated && req.isAuthenticated()) return next();
        return res.status(401).send({ error: 'unauthenticated' });
    }

    const storage = multer.diskStorage({
        destination: (req, file, cb) => cb(null, UPLOADS_DIR),
        filename: (req, file, cb) => {
            const ext = path.extname(file.originalname);
            cb(null, `${Date.now()}-${uuidv4()}${ext}`);
        }
    });
    const upload = multer({ storage, limits: { fileSize: 50 * 1024 * 1024 } }) // 50MB

    // upload file to a folder (local save then cloud upload)
    router.post('/folders/:folderId/upload', ensureAuth, upload.single('file'), async (req, res, next) => {
        try {
            const { folderId } = req.params;
            const folder = await prisma.folder.findFirst({ where: { id: folderId, ownerId: req.user.id }});
            if (!folder) return res.status(404).send({ error: 'Folder not found' });
            const file = req.file;
            if (!file) return res.status(400).send({ error: 'File required'});                

            // Save DB entry with localPath initially
            const dbFile = await prisma.file.create({
                data: {
                    name: file.originalname,
                    size: file.size,
                    mimeType: file.mimetype,
                    localPath: file.path,
                    folderId: folder.id,
                    ownerId: req.user.id
                }
            });

            // Optionally upload to Cloudinary
            try {
                const result = await cloudinary.uploader.upload(file.path, {
                    folder: `myapp/${req.user.id}/${folder.id}`,
                    resource_type: 'auto'
                });
                await prisma.file.update({
                    where: { id: dbFile.id },
                    data: { url: result.secure_url}
                });
            } catch (e) {
                console.warn('Cloud upload failed or not configured.', e.message);
                // Leaving local path is acceptable for now
            }

            res.status(201).send({ file: dbFile });    
        } catch (err) { next(err); }
    });

    // file details
    router.get('/:id', ensureAuth, async (req, res, next) => {
        try {
            const file = await prisma.file.findFirst({
                where: { id: req.params.id, ownerId: req.user.id }
            });
            if (!file) return res.status(404).send({ error: 'Not found' });
            res.send({
                id: file.id,
                name: file.name,
                size: file.size,
                mimeType: file.mimeType,
                uploadedAt: file.uploadedAt,
                url: file.url
            });
        } catch (err) { next(err); }
    });

    // Download: prefer remote URL, otherwies stream local
    router.get('/:id/download', ensureAuth, async (req, res, next) => {
        try {
            const file = await prisma.file.findFirst({ where: { id: req.params.id, ownerId: req.user.id }});
            if (!file) return res.status(404).send({ error: 'Not found' });
            
            if (file.url) {
                // redirect to CDN/cloud URL
                return res.redirect(file.url);
            } else if (file.localPath && fs.existsSync(file.localPath)) {
                return res.download(file.localPath, file.name);
            } else {
                return res.status(404).send({ error: 'File not available' });
            }
        } catch (err) { next(err); }
    });

    return router;
}