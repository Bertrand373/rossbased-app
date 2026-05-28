// server/routes/photoRoutes.js
//
// Endpoints (all require auth):
//   POST   /api/photos/upload        — multipart photo upload; returns key
//   GET    /api/photos/sign?key=…    — short-lived presigned read URL
//   DELETE /api/photos?key=…         — owner-only hard delete
//   POST   /api/photos/milestone     — server-composited side-by-side PNG
//
// Why "sign?key=" rather than "/api/photos/<key>": object keys contain
// a slash ("photos/<uuid>.jpg") and Express path-param matching fights
// that. Using a query param keeps URLs flat and the key opaque.
//
// Ownership model: we don't keep a separate (key → owner) table. The
// key lives on User.notes[dayStr].photoKey. Ownership is verified by
// scanning the caller's own notes for the key on every access. Cheap
// (in-memory on the user doc) and tamper-proof — the server never
// trusts a client claim of ownership.

const express = require('express');
const router = express.Router();
const multer = require('multer');
const sharp = require('sharp');
const User = require('../models/User');
const photoStorage = require('../services/photoStorage');
const milestoneCompositor = require('../services/milestoneCompositor');

// Upload constraints: large enough for a clean portrait, small enough
// to not be a DoS vector. We resize down hard on the server side.
const MAX_UPLOAD_BYTES = 12 * 1024 * 1024; // 12 MB raw incoming
const MAX_LONG_EDGE = 1600;                 // resize ceiling
const JPEG_QUALITY = 85;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_UPLOAD_BYTES, files: 1 }
});

// ────────────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────────────

/**
 * Return true iff the given storage key appears in the user's
 * notes[dayStr].photoKey for any day. This is how we authorize reads
 * and deletes — only the photo's owner can ever touch it.
 */
async function userOwnsKey(username, key) {
  if (!username || !key) return false;
  const user = await User.findOne({ username }, { notes: 1 }).lean();
  const notes = user?.notes || {};
  for (const dayStr of Object.keys(notes)) {
    const entry = notes[dayStr];
    if (entry && typeof entry === 'object' && entry.photoKey === key) return true;
  }
  return false;
}

/**
 * Process the incoming buffer through sharp: resize to MAX_LONG_EDGE,
 * normalize EXIF rotation, strip metadata (privacy: removes GPS, device
 * info, capture timestamps), output a quality-85 JPEG. Returns a
 * processed buffer ready for upload.
 */
async function processImage(buffer) {
  return await sharp(buffer)
    .rotate()                              // honor EXIF orientation, then drop EXIF
    .resize({
      width: MAX_LONG_EDGE,
      height: MAX_LONG_EDGE,
      fit: 'inside',
      withoutEnlargement: true
    })
    .jpeg({ quality: JPEG_QUALITY, mozjpeg: true })
    .toBuffer();
}

// ────────────────────────────────────────────────────────────────────────
// POST /api/photos/upload — multipart upload
// Multipart field: "photo"
// ────────────────────────────────────────────────────────────────────────
router.post('/upload', upload.single('photo'), async (req, res) => {
  try {
    if (!photoStorage.isConfigured()) {
      return res.status(503).json({ error: 'Photo storage is not configured on this server' });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'A photo file is required (multipart field: photo)' });
    }

    let processed;
    try {
      processed = await processImage(req.file.buffer);
    } catch (err) {
      console.error('Photo processing failed:', err.message);
      return res.status(400).json({ error: 'Could not read this image. Try a different file.' });
    }

    const key = await photoStorage.upload(processed, { contentType: 'image/jpeg' });
    res.json({ ok: true, key, bytes: processed.length });
  } catch (err) {
    console.error('Photo upload error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ────────────────────────────────────────────────────────────────────────
// GET /api/photos/sign?key=… — presigned read URL
// Browser-facing: the URL returned can be set directly on <img src>.
// ────────────────────────────────────────────────────────────────────────
router.get('/sign', async (req, res) => {
  try {
    const key = typeof req.query.key === 'string' ? req.query.key : '';
    if (!key) return res.status(400).json({ error: 'key query param is required' });

    const owns = await userOwnsKey(req.user.username, key);
    if (!owns) return res.status(403).json({ error: 'You do not have access to this photo' });

    const url = await photoStorage.getPresignedUrl(key);
    res.json({ ok: true, url, expiresIn: photoStorage.PRESIGNED_TTL_SECONDS });
  } catch (err) {
    console.error('Photo sign error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ────────────────────────────────────────────────────────────────────────
// DELETE /api/photos?key=… — hard delete + unlink from journal
// ────────────────────────────────────────────────────────────────────────
router.delete('/', async (req, res) => {
  try {
    const key = typeof req.query.key === 'string' ? req.query.key : '';
    if (!key) return res.status(400).json({ error: 'key query param is required' });

    const owns = await userOwnsKey(req.user.username, key);
    if (!owns) return res.status(403).json({ error: 'You do not have access to this photo' });

    // Remove the photoKey from any journal entry referencing it.
    const user = await User.findOne({ username: req.user.username });
    let mutated = false;
    if (user?.notes) {
      const notes = user.notes;
      for (const dayStr of Object.keys(notes)) {
        const entry = notes[dayStr];
        if (entry && typeof entry === 'object' && entry.photoKey === key) {
          if (entry.text) {
            // Keep the text, drop the photo reference + capture data.
            notes[dayStr] = { text: entry.text, photoKey: null, capturedAt: null, framing: null };
          } else {
            // Nothing left worth keeping — drop the entry entirely.
            delete notes[dayStr];
          }
          mutated = true;
        }
      }
      if (mutated) {
        user.markModified('notes');
        await user.save();
      }
    }

    // Then nuke the bytes. Order matters: if the storage delete fails,
    // the journal already lost the reference — better than the reverse
    // (an orphaned reference pointing at vanished bytes).
    try {
      await photoStorage.remove(key);
    } catch (err) {
      console.warn('Photo storage delete failed (already unlinked):', err.message);
    }

    res.json({ ok: true });
  } catch (err) {
    console.error('Photo delete error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ────────────────────────────────────────────────────────────────────────
// POST /api/photos/milestone — build the side-by-side celebration PNG
// Body: { baselineKey, currentKey, baselineDay, currentDay }
// Returns PNG bytes. The client hands these straight to the share sheet.
// ────────────────────────────────────────────────────────────────────────
router.post('/milestone', express.json(), async (req, res) => {
  try {
    const { baselineKey, currentKey, baselineDay, currentDay } = req.body || {};
    if (!baselineKey || !currentKey) {
      return res.status(400).json({ error: 'baselineKey and currentKey are required' });
    }

    // Ownership check on BOTH keys — the user can only composite their own photos.
    const [ownsBaseline, ownsCurrent] = await Promise.all([
      userOwnsKey(req.user.username, baselineKey),
      userOwnsKey(req.user.username, currentKey)
    ]);
    if (!ownsBaseline || !ownsCurrent) {
      return res.status(403).json({ error: 'You do not own one or both photos' });
    }

    const png = await milestoneCompositor.compose({
      baselineKey,
      currentKey,
      baselineDay: Math.max(1, parseInt(baselineDay, 10) || 1),
      currentDay: Math.max(1, parseInt(currentDay, 10) || 1)
    });

    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'private, no-store');
    res.send(png);
  } catch (err) {
    console.error('Milestone compose error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
