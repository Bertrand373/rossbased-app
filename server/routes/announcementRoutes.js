// server/routes/announcementRoutes.js
// What's New — announcement CRUD, public version endpoint, Haiku draft generator

const express = require('express');
const router = express.Router();
const Announcement = require('../models/Announcement');

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
// ============================================
router.post('/', authWrap, async (req, res) => {
  if (!isAdmin(req)) return res.status(403).json({ error: 'Admin only' });
  try {
    const { version, title, body } = req.body;
    if (!version || !body) {
      return res.status(400).json({ error: 'Version and body are required' });
    }
    const announcement = await Announcement.create({
      version: version.trim(),
      title: title ? title.trim() : '',
      body: body.trim(),
      status: 'draft',
      publishedBy: req.user.username
    });
    console.log(`📝 Announcement draft created: v${announcement.version} — ${announcement.title}`);
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
    const { version, title, body } = req.body;
    const updated = await Announcement.findByIdAndUpdate(
      req.params.id,
      { version: version?.trim(), title: title?.trim(), body: body?.trim() },
      { new: true }
    );
    if (!updated) return res.status(404).json({ error: 'Announcement not found' });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update announcement' });
  }
});

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
