// test-cloudinary.js
require('dotenv').config();
const cloudinary = require('cloudinary').v2;
const path = require('path');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

(async () => {
  try {
    console.log('Cloud name:', process.env.CLOUDINARY_CLOUD_NAME ? 'OK' : 'MISSING');
    const file = path.resolve('./somefile.txt'); // change to somefile.png to test images
    console.log('Uploading', file);
    // resource_type: "auto" tells Cloudinary to accept images, raw, etc.
    const res = await cloudinary.uploader.upload(file, { folder: `myapp/test`, resource_type: "auto" });
    console.log('Upload successful:', res.secure_url);
  } catch (err) {
    console.error('Upload error (full):', err);
    if (err && err.message) console.error('message:', err.message);
    process.exit(1);
  }
})();
