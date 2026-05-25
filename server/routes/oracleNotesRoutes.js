// server/routes/oracleNotesRoutes.js
// API for Oracle Notes (highlights + marginalia).
// POST   /api/oracle/notes               — create
// GET    /api/oracle/notes/thread/:tid   — all notes in a thread (inline render)
// GET    /api/oracle/notes/library       — paginated, all notes (Library view)
// PATCH  /api/oracle/notes/:id           — edit note text or color
// DELETE /api/oracle/notes/:id           — remove
//
// Premium-gated on create only (matches Pin pattern). Existing notes remain
// readable + editable if subscription lapses.

const express = require('express');
const router = express.Router();
const OracleNote = require('../models/OracleNote');
const User = require('../models/User');
const { checkPremiumAccess } = require('../middleware/subscriptionMiddleware');

const COLORS = ['amber', 'rose', 'azure', 'sage'];
const isAdmin = (u) => ['ross', 'rossbased'].includes(u?.toLowerCase());

// ============================================================
// POST / — create a highlight (with or without a note)
// ============================================================
router.post('/', async (req, res) => {
  try {
    const username = req.user.username;
    const {
      threadId, threadTitle, messageTimestamp,
      startOffset, endOffset, highlightedText,
      contextBefore, contextAfter, color, note
    } = req.body;

    if (!threadId || !messageTimestamp || !highlightedText
      || typeof startOffset !== 'number' || typeof endOffset !== 'number') {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    if (endOffset <= startOffset) {
      return res.status(400).json({ error: 'Invalid range' });
    }
    if (color && !COLORS.includes(color)) {
      return res.status(400).json({ error: 'Invalid color' });
    }

    if (!isAdmin(username)) {
      const user = await User.findOne({ username }).select('subscription isPremium').lean();
      if (!user) return res.status(404).json({ error: 'User not found' });
      const { hasPremium } = checkPremiumAccess(user);
      const isGrandfathered = user.subscription?.status === 'grandfathered';
      if (!hasPremium && !isGrandfathered) {
        return res.status(403).json({ error: 'Premium required', code: 'PREMIUM_REQUIRED' });
      }
    }

    const doc = await OracleNote.create({
      username,
      threadId,
      threadTitle: (threadTitle || '').slice(0, 200),
      messageTimestamp,
      startOffset,
      endOffset,
      highlightedText: String(highlightedText).slice(0, 5000),
      contextBefore: (contextBefore || '').slice(0, 60),
      contextAfter: (contextAfter || '').slice(0, 60),
      color: color || 'amber',
      note: (note || '').slice(0, 1000)
    });

    res.status(201).json({ note: doc });
  } catch (err) {
    console.error('Create Oracle note error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// GET /thread/:threadId — fetch all notes in a thread
// ============================================================
router.get('/thread/:threadId', async (req, res) => {
  try {
    const notes = await OracleNote.find({
      username: req.user.username,
      threadId: req.params.threadId
    }).sort({ createdAt: 1 }).lean();
    res.json({ notes });
  } catch (err) {
    console.error('Get thread notes error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// GET /library — all notes for the Library view (paginated)
// ============================================================
router.get('/library', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 100, 200);
    const skip = parseInt(req.query.skip, 10) || 0;

    const [notes, total] = await Promise.all([
      OracleNote.find({ username: req.user.username })
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      OracleNote.countDocuments({ username: req.user.username })
    ]);

    res.json({ notes, total, hasMore: skip + notes.length < total });
  } catch (err) {
    console.error('Get library error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// PATCH /:id — edit note text or change color
// ============================================================
router.patch('/:id', async (req, res) => {
  try {
    const note = await OracleNote.findById(req.params.id);
    if (!note) return res.status(404).json({ error: 'Note not found' });
    if (note.username !== req.user.username && !isAdmin(req.user.username)) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    if (req.body.color !== undefined) {
      if (!COLORS.includes(req.body.color)) {
        return res.status(400).json({ error: 'Invalid color' });
      }
      note.color = req.body.color;
    }
    if (req.body.note !== undefined) {
      note.note = String(req.body.note).slice(0, 1000);
    }

    await note.save();
    res.json({ note });
  } catch (err) {
    console.error('Update note error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// DELETE /:id — remove a highlight + its note
// ============================================================
router.delete('/:id', async (req, res) => {
  try {
    const note = await OracleNote.findById(req.params.id);
    if (!note) return res.status(404).json({ error: 'Note not found' });
    if (note.username !== req.user.username && !isAdmin(req.user.username)) {
      return res.status(403).json({ error: 'Not authorized' });
    }
    await OracleNote.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    console.error('Delete note error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
