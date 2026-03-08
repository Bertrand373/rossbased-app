// server/scripts/uploadProtocolFiles.js
// One-time script to upload Protocol PDF and EPUB into MongoDB GridFS
//
// Usage (run from ~/Desktop/rossbased-app):
//   node server/scripts/uploadProtocolFiles.js <path-to-pdf> <path-to-epub>
//
// Example:
//   node server/scripts/uploadProtocolFiles.js ~/Downloads/PROTOCOL.pdf ~/Downloads/PROTOCOL.epub

const mongoose = require('mongoose');
const { GridFSBucket } = require('mongodb');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load env vars from server/.env or root .env
dotenv.config({ path: path.join(__dirname, '../.env') });
dotenv.config({ path: path.join(__dirname, '../../.env') });

const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error('❌ MONGO_URI not found in environment. Set it in your .env file.');
  process.exit(1);
}

const pdfPath = process.argv[2];
const epubPath = process.argv[3];

if (!pdfPath || !epubPath) {
  console.error('❌ Usage: node server/scripts/uploadProtocolFiles.js <path-to-pdf> <path-to-epub>');
  process.exit(1);
}

if (!fs.existsSync(pdfPath)) {
  console.error(`❌ PDF not found: ${pdfPath}`);
  process.exit(1);
}

if (!fs.existsSync(epubPath)) {
  console.error(`❌ EPUB not found: ${epubPath}`);
  process.exit(1);
}

async function upload() {
  await mongoose.connect(MONGO_URI);
  console.log('✅ Connected to MongoDB');

  const bucket = new GridFSBucket(mongoose.connection.db, { bucketName: 'protocol' });

  // Delete existing files first (idempotent re-upload)
  const existingFiles = await bucket.find({}).toArray();
  for (const file of existingFiles) {
    await bucket.delete(file._id);
    console.log(`🗑️ Deleted existing file: ${file.filename}`);
  }

  // Upload PDF
  await new Promise((resolve, reject) => {
    const uploadStream = bucket.openUploadStream('protocol.pdf', {
      contentType: 'application/pdf'
    });
    fs.createReadStream(pdfPath)
      .pipe(uploadStream)
      .on('error', reject)
      .on('finish', () => {
        console.log(`✅ Uploaded protocol.pdf (${(fs.statSync(pdfPath).size / 1024 / 1024).toFixed(2)} MB)`);
        resolve();
      });
  });

  // Upload EPUB
  await new Promise((resolve, reject) => {
    const uploadStream = bucket.openUploadStream('protocol.epub', {
      contentType: 'application/epub+zip'
    });
    fs.createReadStream(epubPath)
      .pipe(uploadStream)
      .on('error', reject)
      .on('finish', () => {
        console.log(`✅ Uploaded protocol.epub (${(fs.statSync(epubPath).size / 1024 / 1024).toFixed(2)} MB)`);
        resolve();
      });
  });

  // Verify
  const files = await bucket.find({}).toArray();
  console.log(`\n📦 GridFS 'protocol' bucket now contains ${files.length} file(s):`);
  files.forEach(f => console.log(`   - ${f.filename} (${(f.length / 1024 / 1024).toFixed(2)} MB)`));

  await mongoose.disconnect();
  console.log('\n✅ Done. Files are ready for Protocol delivery.');
}

upload().catch(err => {
  console.error('Upload failed:', err);
  process.exit(1);
});
