// server/routes/announcementRoutes.js
// What's New — announcement CRUD, public version endpoint, Haiku draft generator

const express = require('express');
const router = express.Router();
const multer = require('multer');
const admin = require('firebase-admin');
const { randomUUID } = require('crypto');
const Announcement = require('../models/Announcement');

// Same bucket TTTV uses — already initialized in services/notificationService.js
const STORAGE_BUCKET = 'titan-track-notifications.firebasestorage.app';

// Slide images are PNG/JPEG, ≤ 5 MB. Smaller cap than TTTV because these
// are downsized Canva exports, not 1080p video.
const slideUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Slide must be an image (PNG or JPEG)'));
    }
    cb(null, true);
  },
});

async function uploadSlideToStorage(buffer, contentType) {
  const ext = contentType === 'image/jpeg' ? 'jpg' : 'png';
  const filename = `announcements/slides/${randomUUID()}.${ext}`;
  const bucket = admin.storage().bucket(STORAGE_BUCKET);
  const file = bucket.file(filename);
  await file.save(buffer, {
    metadata: {
      contentType,
      cacheControl: 'public, max-age=31536000, immutable',
    },
    resumable: false,
  });
  await file.makePublic();
  return `https://storage.googleapis.com/${STORAGE_BUCKET}/${filename}`;
}

// Auth middleware passed from app.js via init()
let _authenticate;
function init(authMiddleware) {
  _authenticate = authMiddleware;
}

function authWrap(req, res, next) {
  if (!_authenticate) return res.status(500).json({ error: 'Auth not initialized' });
  _authenticate(req, res, next);
}

function isAdmin(req) {
  const username = req.user?.username?.toLowerCase();
  return username === 'rossbased' || username === 'ross';
}

// ============================================
// PUBLIC: Get latest announcement (for What's New sheet)
// Regular users see only 'published'. Admin with ?preview=true sees latest draft.
// ============================================
router.get('/latest', async (req, res) => {
  try {
    const preview = req.query.preview === 'true';

    if (preview) {
      // Admin preview — authenticate and check admin, then return latest regardless of status
      if (!_authenticate) return res.json(null);
      _authenticate(req, res, async () => {
        if (!isAdmin(req)) return res.json(null);
        const latest = await Announcement.findOne().sort({ publishedAt: -1 }).lean();
        if (!latest) return res.json(null);
        res.json(latest);
      });
      return;
    }

    // Regular users — published only
    const latest = await Announcement.findOne({ status: 'published' }).sort({ publishedAt: -1 }).lean();
    if (!latest) return res.json(null);
    res.json(latest);
  } catch (err) {
    console.error('Get latest announcement error:', err);
    res.status(500).json({ error: 'Failed to fetch announcement' });
  }
});

// ============================================
// PUBLIC: Get current version string only
// ============================================
router.get('/version', async (req, res) => {
  try {
    const latest = await Announcement.findOne({ status: 'published' }).sort({ publishedAt: -1 }).select('version').lean();
    res.json({ version: latest?.version || '1.0.0' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch version' });
  }
});

// ============================================
// ADMIN: List all announcements (newest first)
// ============================================
router.get('/', authWrap, async (req, res) => {
  if (!isAdmin(req)) return res.status(403).json({ error: 'Admin only' });
  try {
    const announcements = await Announcement.find().sort({ publishedAt: -1 }).lean();
    res.json(announcements);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch announcements' });
  }
});

// ============================================
// ADMIN: Create new announcement (as draft)
// Accepts EITHER legacy `body` (markdown-ish text) OR `slides[]` (the new
// visual deck) — at least one is required.
// ============================================
router.post('/', authWrap, async (req, res) => {
  if (!isAdmin(req)) return res.status(403).json({ error: 'Admin only' });
  try {
    const { version, title, body, slides } = req.body;
    if (!version) {
      return res.status(400).json({ error: 'Version is required' });
    }
    const hasBody = body && body.trim().length > 0;
    const hasSlides = Array.isArray(slides) && slides.length > 0;
    if (!hasBody && !hasSlides) {
      return res.status(400).json({ error: 'Announcement needs either body or at least one slide' });
    }
    const announcement = await Announcement.create({
      version: version.trim(),
      title: title ? title.trim() : '',
      body: hasBody ? body.trim() : '',
      slides: hasSlides ? sanitizeSlides(slides) : [],
      status: 'draft',
      publishedBy: req.user.username,
    });
    console.log(`📝 Announcement draft created: v${announcement.version} — ${announcement.title || `${announcement.slides.length} slide(s)`}`);
    res.json(announcement);
  } catch (err) {
    console.error('Create announcement error:', err);
    res.status(500).json({ error: 'Failed to create announcement' });
  }
});

// ============================================
// ADMIN: Update announcement
// ============================================
router.put('/:id', authWrap, async (req, res) => {
  if (!isAdmin(req)) return res.status(403).json({ error: 'Admin only' });
  try {
    const { version, title, body, slides } = req.body;
    const patch = {};
    if (version !== undefined) patch.version = version.trim();
    if (title !== undefined) patch.title = title.trim();
    if (body !== undefined) patch.body = body.trim();
    if (slides !== undefined) patch.slides = sanitizeSlides(slides);

    const updated = await Announcement.findByIdAndUpdate(
      req.params.id, patch, { new: true, runValidators: true }
    );
    if (!updated) return res.status(404).json({ error: 'Announcement not found' });
    res.json(updated);
  } catch (err) {
    console.error('Update announcement error:', err);
    res.status(500).json({ error: 'Failed to update announcement' });
  }
});

// Strip unknown keys + coerce types so the client can't inject extras.
function sanitizeSlides(slides) {
  if (!Array.isArray(slides)) return [];
  return slides
    .filter((s) => s && typeof s.image === 'string' && s.image.trim().length > 0)
    .map((s) => ({
      image: s.image.trim(),
      title: typeof s.title === 'string' ? s.title.trim() : '',
      body: typeof s.body === 'string' ? s.body.trim() : '',
      cta: {
        label: typeof s.cta?.label === 'string' ? s.cta.label.trim() : '',
        route: typeof s.cta?.route === 'string' ? s.cta.route.trim() : '',
      },
    }));
}

// ============================================
// ADMIN: Go Live — flip draft → published
// ============================================
router.put('/:id/publish', authWrap, async (req, res) => {
  if (!isAdmin(req)) return res.status(403).json({ error: 'Admin only' });
  try {
    const updated = await Announcement.findByIdAndUpdate(
      req.params.id,
      { status: 'published', publishedAt: new Date() },
      { new: true }
    );
    if (!updated) return res.status(404).json({ error: 'Announcement not found' });
    console.log(`📢 Announcement published: v${updated.version} — ${updated.title}`);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Failed to publish announcement' });
  }
});

// ============================================
// ADMIN: Upload a single slide image — returns the public URL
// Used by the AdminCockpit slide builder before saving the parent
// announcement. The admin chooses N PNGs, each is uploaded individually,
// and the resulting URLs are stored as `slides[i].image`.
// ============================================
router.post('/upload-slide', authWrap, slideUpload.single('image'), async (req, res) => {
  if (!isAdmin(req)) return res.status(403).json({ error: 'Admin only' });
  if (!req.file) return res.status(400).json({ error: 'No image provided' });
  try {
    const url = await uploadSlideToStorage(req.file.buffer, req.file.mimetype);
    console.log(`🖼️  Slide uploaded: ${url}`);
    res.json({ url });
  } catch (err) {
    console.error('Slide upload error:', err);
    res.status(500).json({ error: 'Failed to upload slide' });
  }
});

// ============================================
// ADMIN: Delete announcement
// ============================================
router.delete('/:id', authWrap, async (req, res) => {
  if (!isAdmin(req)) return res.status(403).json({ error: 'Admin only' });
  try {
    await Announcement.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete announcement' });
  }
});

// ============================================
// ADMIN: Generate draft from commit messages via Haiku
// ============================================
router.post('/draft', authWrap, async (req, res) => {
  if (!isAdmin(req)) return res.status(403).json({ error: 'Admin only' });
  try {
    const { commitMessages } = req.body;
    if (!commitMessages || !commitMessages.trim()) {
      return res.status(400).json({ error: 'Paste your recent commit messages' });
    }

    const Anthropic = require('@anthropic-ai/sdk');
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const NOTE_MODEL = process.env.NOTE_MODEL || 'claude-haiku-4-5-20251001';

    const response = await anthropic.messages.create({
      model: NOTE_MODEL,
      max_tokens: 500,
      system: `You write app update announcements for TitanTrack, a semen retention tracking app. 
Turn developer commit messages into a brief, friendly update for users. 
Rules:
- Write 2-4 short bullet points (use • character, not markdown)
- Use plain, motivating language — no technical jargon
- Focus on what changed FOR THE USER, not how it was built
- Skip internal/admin-only changes entirely
- If a change is a bug fix, say "Fixed [thing]" simply
- Keep the total under 100 words
- Do NOT include a title or version — just the bullet points`,
      messages: [{
        role: 'user',
        content: `Here are the recent git commits. Turn them into a user-facing app update:\n\n${commitMessages.trim()}`
      }]
    });

    const draft = response.content[0].text;
    res.json({ draft });
  } catch (err) {
    console.error('Draft generation error:', err);
    res.status(500).json({ error: 'Failed to generate draft' });
  }
});

// Export router + init function (same pattern as oracleEvolutionRoutes)
router.init = init;
module.exports = router;
