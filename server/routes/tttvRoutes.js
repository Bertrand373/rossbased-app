// server/routes/tttvRoutes.js
//
// TTTV (TitanTrack TV) admin + feed API.
//
// Architecture in one paragraph: the React admin tool POSTs multipart
// (video MP4 + optional poster JPG + metadata fields) to this router.
// Multer parses into memory, we forward the bytes to Firebase Storage
// via firebase-admin (already initialized for FCM in notificationService.js),
// then write a TttvVideo doc to MongoDB with the resulting public URL.
// Reads come back from MongoDB only — Firebase is just bytes-on-disk.
//
// All admin-write routes (POST/PATCH/DELETE) are gated by the same admin
// check used by knowledgeRoutes and adminRevenue: env var ADMIN_USERNAMES
// or a hardcoded ['rossbased','ross'] default.
//
// /feed is read-only and intentionally not admin-gated — premium membership
// gating belongs upstream (the route is mounted under `authenticate`, so
// req.user exists, and PR #3 will add the premium check). For now any
// signed-in user gets the published feed.

const express = require('express');
const router = express.Router();
const multer = require('multer');
const admin = require('firebase-admin');
const { randomUUID } = require('crypto');
const TttvVideo = require('../models/TttvVideo');

// Firebase Storage bucket — matches the one in src/config/firebase.js.
// firebase-admin is already initialized in services/notificationService.js
// at server boot; we just lazily access its storage() handle here.
const STORAGE_BUCKET = 'titan-track-notifications.firebasestorage.app';

// ============================================================
// ADMIN CHECK MIDDLEWARE
// Same shape as routes/knowledgeRoutes.js and routes/adminRevenue.js.
// Keep the three in sync if you ever change the admin set.
// ============================================================
const adminCheck = (req, res, next) => {
  const username = req.user?.username || '';
  const lower = username.toLowerCase();

  const envAdmins = process.env.ADMIN_USERNAMES;
  if (envAdmins) {
    const allowed = envAdmins.split(',').map(u => u.trim().toLowerCase());
    if (allowed.includes(lower)) return next();
  }

  if (lower === 'rossbased' || lower === 'ross') return next();

  console.log(`[TTTV Admin] Access denied for: "${username}"`);
  return res.status(403).json({ error: 'Admin access required' });
};

// ============================================================
// MULTER — memory storage so we can pipe straight to Firebase
// ============================================================
// 200 MB ceiling is generous for 30–90s 9:16 1080p shorts (~15–25 MB each).
// memoryStorage is fine at this scale; revisit if videos start running long.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 200 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.fieldname === 'video') {
      if (!file.mimetype.startsWith('video/')) {
        return cb(new Error('video field must be a video MIME type'));
      }
    } else if (file.fieldname === 'poster') {
      if (!file.mimetype.startsWith('image/')) {
        return cb(new Error('poster field must be an image MIME type'));
      }
    }
    cb(null, true);
  }
});

// Helper: push a buffer into Firebase Storage and return the public URL +
// the internal path (so we can delete it later). Uses object.makePublic()
// so the file is directly streamable from the storage.googleapis.com URL
// without signed-URL ceremony — fine because all uploaded content is
// intentionally public (it's the video feed).
async function uploadToStorage(buffer, filename, contentType) {
  const bucket = admin.storage().bucket(STORAGE_BUCKET);
  const file = bucket.file(filename);
  await file.save(buffer, {
    metadata: {
      contentType,
      cacheControl: 'public, max-age=31536000, immutable'
    },
    resumable: false
  });
  await file.makePublic();
  return {
    url: `https://storage.googleapis.com/${STORAGE_BUCKET}/${filename}`,
    path: filename
  };
}

async function getNextEpisodeNumber() {
  const last = await TttvVideo.findOne({}).sort({ episode: -1 }).lean();
  return (last?.episode || 0) + 1;
}

// ============================================================
// POST /api/tttv/setup-cors
// One-shot admin endpoint to configure Firebase Storage CORS so the
// client can fetch() videos cross-origin. Required for:
//   1. The Blob URL preload pattern (TVFeed fetches MP4s into Blobs
//      for instant playback on iOS Safari)
//   2. Canvas pixel sampling for the per-episode ambient color
//      extraction (extractDominantColor in TVFeed)
//
// Without CORS, both fall back gracefully (storage URL on video element,
// brand-gold ambient color) but iOS feels laggy and the ambient stays
// gold. Call this once after deploy; the config persists on the bucket
// until changed.
//
//   curl -X POST -H "Authorization: Bearer $TOKEN" \
//        https://titantrack.app/api/tttv/setup-cors
//
// Idempotent — safe to call multiple times.
// ============================================================
router.post('/setup-cors', adminCheck, async (req, res) => {
  try {
    const bucket = admin.storage().bucket(STORAGE_BUCKET);
    await bucket.setCorsConfiguration([
      {
        origin: ['*'],
        method: ['GET', 'HEAD'],
        responseHeader: [
          'Content-Type',
          'Content-Length',
          'Content-Range',
          'Accept-Ranges',
          'ETag',
          'Cache-Control'
        ],
        maxAgeSeconds: 3600
      }
    ]);
    return res.json({
      success: true,
      bucket: STORAGE_BUCKET,
      message: 'CORS configured. Blob URL preload + canvas color extraction now work cross-origin.'
    });
  } catch (e) {
    console.error('[TTTV setup-cors] Failed:', e);
    return res.status(500).json({ error: e.message || 'Failed to set CORS' });
  }
});

// ============================================================
// POST /api/tttv/videos
// Upload a new episode (video + optional poster + metadata).
// ============================================================
router.post(
  '/videos',
  adminCheck,
  upload.fields([
    { name: 'video', maxCount: 1 },
    { name: 'poster', maxCount: 1 }
  ]),
  async (req, res) => {
    try {
      const videoFile = req.files?.video?.[0];
      if (!videoFile) {
        return res.status(400).json({ error: 'video file required' });
      }
      const posterFile = req.files?.poster?.[0];

      const {
        title,
        durationSec,
        oracleOverlayText,
        oracleOverlayAt,
        episode,
        isPublished
      } = req.body;

      // One uuid keys both files so the pair is easy to find/delete.
      const id = randomUUID();
      const videoUpload = await uploadToStorage(
        videoFile.buffer,
        `tttv/${id}.mp4`,
        videoFile.mimetype
      );

      let posterUpload = null;
      if (posterFile) {
        posterUpload = await uploadToStorage(
          posterFile.buffer,
          `tttv/${id}.jpg`,
          posterFile.mimetype
        );
      }

      const episodeNum = parseInt(episode, 10) || (await getNextEpisodeNumber());
      const published =
        isPublished === 'true' || isPublished === true || isPublished === '1';

      const doc = await TttvVideo.create({
        title: (title || '').trim() || 'Untitled',
        episode: episodeNum,
        storageUrl: videoUpload.url,
        storagePath: videoUpload.path,
        posterUrl: posterUpload?.url || null,
        posterPath: posterUpload?.path || null,
        durationSec: parseFloat(durationSec) || 0,
        oracleOverlay: {
          text: (oracleOverlayText || '').trim(),
          atSec: parseFloat(oracleOverlayAt) || 0
        },
        isPublished: published,
        order: episodeNum,
        uploadedBy: req.user.username,
        publishedAt: published ? new Date() : null
      });

      res.json(doc);
    } catch (err) {
      console.error('[TTTV upload]', err);
      res.status(500).json({ error: err.message || 'Upload failed' });
    }
  }
);

// ============================================================
// GET /api/tttv/videos
// Admin: list ALL videos (drafts + published).
// ============================================================
router.get('/videos', adminCheck, async (req, res) => {
  try {
    const videos = await TttvVideo.find({})
      .sort({ order: -1, createdAt: -1 })
      .lean();
    res.json(videos);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// GET /api/tttv/feed
// Published videos in feed order.
//
// TEMPORARY DOGFOOD GATE — while Ross iterates on the player, only admins
// get the actual feed. Everyone else gets an empty array, which makes
// /tv render the "Arriving soon." coming-soon state. When ready for
// public release, delete the isAdmin block and let the query run for
// everyone.
// ============================================================
router.get('/feed', async (req, res) => {
  try {
    const username = (req.user?.username || '').toLowerCase();
    const envAdmins = (process.env.ADMIN_USERNAMES || '')
      .split(',').map(u => u.trim().toLowerCase()).filter(Boolean);
    const isAdmin = envAdmins.length
      ? envAdmins.includes(username)
      : (username === 'rossbased' || username === 'ross');

    if (!isAdmin) {
      return res.json([]);
    }

    const videos = await TttvVideo.find({ isPublished: true })
      .sort({ order: -1, publishedAt: -1 })
      .lean();
    res.json(videos);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// PATCH /api/tttv/videos/:id
// Update metadata, toggle publish, reorder.
// ============================================================
router.patch('/videos/:id', adminCheck, async (req, res) => {
  try {
    const existing = await TttvVideo.findById(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Not found' });

    const {
      title,
      oracleOverlayText,
      oracleOverlayAt,
      isPublished,
      order,
      episode
    } = req.body;

    const update = {};
    if (title !== undefined) update.title = String(title).trim() || 'Untitled';
    if (order !== undefined) update.order = parseInt(order, 10) || 0;
    if (episode !== undefined) update.episode = parseInt(episode, 10) || 0;

    if (oracleOverlayText !== undefined || oracleOverlayAt !== undefined) {
      update.oracleOverlay = {
        text:
          oracleOverlayText !== undefined
            ? String(oracleOverlayText).trim()
            : existing.oracleOverlay.text,
        atSec:
          oracleOverlayAt !== undefined
            ? parseFloat(oracleOverlayAt) || 0
            : existing.oracleOverlay.atSec
      };
    }

    if (isPublished !== undefined) {
      const wasPublished = existing.isPublished;
      const willPublish = isPublished === true || isPublished === 'true';
      update.isPublished = willPublish;
      // Stamp publishedAt the first time we go live; preserve the original
      // timestamp on subsequent toggles so the feed sort stays stable.
      if (willPublish && !wasPublished) update.publishedAt = new Date();
    }

    const doc = await TttvVideo.findByIdAndUpdate(req.params.id, update, {
      new: true
    });
    res.json(doc);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// DELETE /api/tttv/videos/:id
// Removes the doc and best-effort cleans Storage files.
// ============================================================
router.delete('/videos/:id', adminCheck, async (req, res) => {
  try {
    const doc = await TttvVideo.findById(req.params.id);
    if (!doc) return res.status(404).json({ error: 'Not found' });

    const bucket = admin.storage().bucket(STORAGE_BUCKET);
    // Best-effort — if Storage cleanup fails, still delete the doc so the
    // admin list stays consistent. Orphaned blobs are findable by path.
    if (doc.storagePath) {
      try {
        await bucket.file(doc.storagePath).delete();
      } catch (e) {
        console.warn('[TTTV delete] storage video cleanup failed:', e.message);
      }
    }
    if (doc.posterPath) {
      try {
        await bucket.file(doc.posterPath).delete();
      } catch (e) {
        console.warn('[TTTV delete] storage poster cleanup failed:', e.message);
      }
    }

    await doc.deleteOne();
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
