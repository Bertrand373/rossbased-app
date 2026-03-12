// server/routes/oracleChatRoutes.js
// API endpoints for Oracle chat history (cross-device sync)
// GET  /api/oracle/chat-history — load messages
// PUT  /api/oracle/chat-history — save/sync messages
// DELETE /api/oracle/chat-history — clear chat

const express = require('express');
const router = express.Router();
const OracleChatHistory = require('../models/OracleChatHistory');

const MAX_MESSAGES = 50;

// ============================================================
// GET /api/oracle/chat-history
// Load chat history for authenticated user
// ============================================================
router.get('/', async (req, res) => {
  try {
    const username = req.user.username;
    const doc = await OracleChatHistory.findOne({ username }).lean();
    res.json({ messages: doc?.messages || [] });
  } catch (err) {
    console.error('Load chat history error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// PUT /api/oracle/chat-history
// Save/sync messages (full replace, capped at 50)
// ============================================================
router.put('/', async (req, res) => {
  try {
    const username = req.user.username;
    const messages = (req.body.messages || []).slice(-MAX_MESSAGES);

    await OracleChatHistory.findOneAndUpdate(
      { username },
      {
        $set: {
          messages,
          updatedAt: new Date()
        }
      },
      { upsert: true, new: true }
    );

    res.json({ success: true, count: messages.length });
  } catch (err) {
    console.error('Save chat history error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// DELETE /api/oracle/chat-history
// Clear chat history
// ============================================================
router.delete('/', async (req, res) => {
  try {
    const username = req.user.username;
    await OracleChatHistory.findOneAndUpdate(
      { username },
      { $set: { messages: [], updatedAt: new Date() } },
      { upsert: true }
    );
    res.json({ success: true });
  } catch (err) {
    console.error('Clear chat history error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
