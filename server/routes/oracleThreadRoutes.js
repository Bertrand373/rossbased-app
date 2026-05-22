// server/routes/oracleThreadRoutes.js
// Thread organization for the Oracle chat. Each user can have many threads,
// each with its own message history. Replaces the single-rolling-window model
// for users who have any threads.
//
// Routes (all authenticated, mounted at /api/oracle/threads):
//   GET    /                        — sidebar list (pinned first, then by recency)
//   POST   /                        — create new thread { threadId?, title? }
//   GET    /:threadId               — full thread + messages
//   PUT    /:threadId               — replace messages (debounced sync from client)
//   PATCH  /:threadId               — rename / pin / archive { title?, isPinned?, isArchived? }
//   DELETE /:threadId               — hard delete a thread
//   POST   /:threadId/auto-title    — Haiku-generated title from first exchange
//
// Lazy migration: GET / will auto-create an "Earlier conversations" thread
// from the legacy OracleChatHistory if the user has no threads yet AND has
// legacy history. Zero data loss for existing users.

const express = require('express');
const Anthropic = require('@anthropic-ai/sdk');
const OracleThread = require('../models/OracleThread');
const OracleChatHistory = require('../models/OracleChatHistory');

const router = express.Router();

const MAX_MESSAGES_PER_THREAD = OracleThread.MAX_MESSAGES_PER_THREAD || 200;
const NOTE_MODEL = process.env.NOTE_MODEL || 'claude-haiku-4-5-20251001';

// Lightweight singleton — same shape as app.js
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ============================================================
// Helpers
// ============================================================

const sanitizeMessages = (raw) => {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(m => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
    .map(m => ({
      role: m.role,
      content: m.content,
      timestamp: m.timestamp || new Date().toISOString(),
      isTransmission: !!m.isTransmission
    }))
    .slice(-MAX_MESSAGES_PER_THREAD);
};

const threadSummary = (t) => ({
  threadId: t.threadId,
  title: t.title || '',
  isPinned: !!t.isPinned,
  isArchived: !!t.isArchived,
  messageCount: t.messageCount || (t.messages?.length || 0),
  createdAt: t.createdAt,
  updatedAt: t.updatedAt,
  lastMessageAt: t.lastMessageAt,
  // 1-line preview of last user-or-assistant message (no transmissions to avoid duplication)
  preview: (() => {
    const msgs = t.messages || [];
    for (let i = msgs.length - 1; i >= 0; i--) {
      const m = msgs[i];
      if (!m || m.isTransmission) continue;
      const txt = (m.content || '').replace(/\s+/g, ' ').trim();
      return txt.length > 120 ? txt.slice(0, 117) + '…' : txt;
    }
    return '';
  })()
});

// Migrate legacy OracleChatHistory.messages → a single pinned thread.
// Runs at most once per user (only when they have zero threads AND legacy history).
async function migrateLegacyHistoryIfNeeded(username) {
  const existingThread = await OracleThread.findOne({ username }).select('_id').lean();
  if (existingThread) return null;

  const legacy = await OracleChatHistory.findOne({ username }).lean();
  if (!legacy?.messages?.length) return null;

  const messages = sanitizeMessages(legacy.messages);
  if (messages.length === 0) return null;

  // Use the latest message's timestamp for lastMessageAt so sort order makes sense
  const lastTs = messages[messages.length - 1].timestamp;
  const lastDate = lastTs ? new Date(lastTs) : new Date();

  const threadId = `legacy-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  const thread = await OracleThread.create({
    username,
    threadId,
    title: 'Earlier conversations',
    isPinned: true,
    isArchived: false,
    messages,
    messageCount: messages.length,
    createdAt: legacy.updatedAt || lastDate,
    updatedAt: new Date(),
    lastMessageAt: lastDate
  });
  return thread;
}

// ============================================================
// GET /  — list threads for sidebar
// ============================================================
router.get('/', async (req, res) => {
  try {
    const username = req.user.username;

    // Lazy migration (best-effort, never blocks list)
    try { await migrateLegacyHistoryIfNeeded(username); } catch (e) {
      console.error('[OracleThread] migration failed (continuing):', e.message);
    }

    const threads = await OracleThread.find({ username })
      .sort({ isPinned: -1, lastMessageAt: -1 })
      .lean();

    res.json({ threads: threads.map(threadSummary) });
  } catch (err) {
    console.error('[OracleThread] list error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// POST /  — create new thread
// ============================================================
router.post('/', async (req, res) => {
  try {
    const username = req.user.username;
    const { threadId, title } = req.body || {};

    if (!threadId || typeof threadId !== 'string' || threadId.length > 80) {
      return res.status(400).json({ error: 'threadId required' });
    }

    // Idempotent: if same threadId already exists for this user, return it
    const existing = await OracleThread.findOne({ username, threadId }).lean();
    if (existing) {
      return res.json({ thread: threadSummary(existing), messages: existing.messages || [] });
    }

    const now = new Date();
    const thread = await OracleThread.create({
      username,
      threadId,
      title: (typeof title === 'string' ? title.slice(0, 80) : ''),
      messages: [],
      messageCount: 0,
      createdAt: now,
      updatedAt: now,
      lastMessageAt: now
    });

    res.json({ thread: threadSummary(thread.toObject()), messages: [] });
  } catch (err) {
    console.error('[OracleThread] create error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// GET /search?q=...  — full-text search across all of the user's messages
// Returns up to 50 matching snippets with thread context.
// MUST be declared BEFORE /:threadId so Express doesn't route "search"
// to the per-thread handler.
// ============================================================
router.get('/search', async (req, res) => {
  try {
    const username = req.user.username;
    const q = (req.query.q || '').toString().trim();
    if (q.length < 2) return res.json({ results: [] });

    // Walk all of user's threads. For modest user volumes this is fine;
    // can later be swapped for a Mongo text index if we add full-text search.
    const threads = await OracleThread.find({ username })
      .select('threadId title isPinned isArchived messages lastMessageAt')
      .lean();

    const qLower = q.toLowerCase();
    const results = [];

    for (const thread of threads) {
      const msgs = thread.messages || [];
      for (let i = 0; i < msgs.length; i++) {
        const msg = msgs[i];
        if (!msg || typeof msg.content !== 'string') continue;
        const lower = msg.content.toLowerCase();
        const idx = lower.indexOf(qLower);
        if (idx === -1) continue;

        // Snippet — context window around the match.
        const PRE = 50;
        const POST = 90;
        const start = Math.max(0, idx - PRE);
        const end = Math.min(msg.content.length, idx + q.length + POST);
        let snippet = msg.content.slice(start, end).replace(/\s+/g, ' ').trim();
        if (start > 0) snippet = '…' + snippet;
        if (end < msg.content.length) snippet = snippet + '…';

        results.push({
          threadId: thread.threadId,
          threadTitle: thread.title || 'New conversation',
          isPinned: !!thread.isPinned,
          isArchived: !!thread.isArchived,
          messageTimestamp: msg.timestamp || '',
          messageRole: msg.role,
          snippet,
          messageIndex: i
        });

        // Cap matches per thread so one chatty thread can't dominate
        if (results.filter(r => r.threadId === thread.threadId).length >= 3) break;
      }
    }

    // Pinned first, then newest. Active archive can sit at the bottom (rare).
    results.sort((a, b) => {
      if (a.isArchived !== b.isArchived) return a.isArchived ? 1 : -1;
      if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
      return new Date(b.messageTimestamp || 0) - new Date(a.messageTimestamp || 0);
    });

    res.json({ results: results.slice(0, 50) });
  } catch (err) {
    console.error('[OracleThread] search error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// GET /:threadId  — fetch one thread with messages
// ============================================================
router.get('/:threadId', async (req, res) => {
  try {
    const username = req.user.username;
    const { threadId } = req.params;

    const thread = await OracleThread.findOne({ username, threadId }).lean();
    if (!thread) return res.status(404).json({ error: 'Thread not found' });

    res.json({
      thread: threadSummary(thread),
      messages: thread.messages || []
    });
  } catch (err) {
    console.error('[OracleThread] get error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// PUT /:threadId  — replace messages (debounced sync from client)
// ============================================================
router.put('/:threadId', async (req, res) => {
  try {
    const username = req.user.username;
    const { threadId } = req.params;

    const messages = sanitizeMessages(req.body?.messages);
    const lastTs = messages.length ? messages[messages.length - 1].timestamp : null;
    const lastDate = lastTs ? new Date(lastTs) : new Date();
    const now = new Date();

    const thread = await OracleThread.findOneAndUpdate(
      { username, threadId },
      {
        $set: {
          messages,
          messageCount: messages.length,
          lastMessageAt: lastDate,
          updatedAt: now
        },
        $setOnInsert: {
          username,
          threadId,
          createdAt: now,
          title: '',
          isPinned: false,
          isArchived: false
        }
      },
      { upsert: true, new: true }
    ).lean();

    res.json({ success: true, count: messages.length, thread: threadSummary(thread) });
  } catch (err) {
    console.error('[OracleThread] sync error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// PATCH /:threadId  — rename / pin / archive
// ============================================================
router.patch('/:threadId', async (req, res) => {
  try {
    const username = req.user.username;
    const { threadId } = req.params;
    const { title, isPinned, isArchived } = req.body || {};

    const update = { updatedAt: new Date() };
    if (typeof title === 'string') update.title = title.slice(0, 80);
    if (typeof isPinned === 'boolean') update.isPinned = isPinned;
    if (typeof isArchived === 'boolean') update.isArchived = isArchived;

    const thread = await OracleThread.findOneAndUpdate(
      { username, threadId },
      { $set: update },
      { new: true }
    ).lean();

    if (!thread) return res.status(404).json({ error: 'Thread not found' });
    res.json({ thread: threadSummary(thread) });
  } catch (err) {
    console.error('[OracleThread] patch error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// DELETE /:threadId  — hard delete
// ============================================================
router.delete('/:threadId', async (req, res) => {
  try {
    const username = req.user.username;
    const { threadId } = req.params;

    const result = await OracleThread.deleteOne({ username, threadId });
    if (result.deletedCount === 0) return res.status(404).json({ error: 'Thread not found' });

    res.json({ success: true });
  } catch (err) {
    console.error('[OracleThread] delete error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// POST /:threadId/auto-title  — Haiku-generated title from messages
// Client calls this after the first Oracle response in a fresh thread.
// Returns { title } and persists it on the thread.
// ============================================================
router.post('/:threadId/auto-title', async (req, res) => {
  try {
    const username = req.user.username;
    const { threadId } = req.params;

    const thread = await OracleThread.findOne({ username, threadId }).lean();
    if (!thread) return res.status(404).json({ error: 'Thread not found' });

    // If already titled, return what we have (idempotent)
    if (thread.title && thread.title !== 'New conversation') {
      return res.json({ title: thread.title });
    }

    // Pull first user + first assistant message as the seed
    const msgs = (thread.messages || []).filter(m => !m.isTransmission);
    const firstUser = msgs.find(m => m.role === 'user');
    const firstAssistant = msgs.find(m => m.role === 'assistant');
    if (!firstUser) return res.json({ title: '' });

    const seed = [
      firstUser ? `User: ${firstUser.content.slice(0, 400)}` : '',
      firstAssistant ? `Oracle: ${firstAssistant.content.slice(0, 400)}` : ''
    ].filter(Boolean).join('\n\n');

    let title = '';
    try {
      const completion = await anthropic.messages.create({
        model: NOTE_MODEL,
        max_tokens: 24,
        temperature: 0.3,
        messages: [{
          role: 'user',
          content: `Summarize the topic of this conversation in 3 to 5 words. Output ONLY the title — no quotes, no punctuation at the end, no prefix like "Title:". Title case is fine.\n\n${seed}`
        }]
      });
      title = (completion.content?.[0]?.text || '').trim()
        .replace(/^["'`]+|["'`]+$/g, '')
        .replace(/\.+$/, '')
        .slice(0, 60);
    } catch (e) {
      console.error('[OracleThread] auto-title Haiku error:', e.message);
      // Fallback: first 5 words of the user's message
      title = firstUser.content.split(/\s+/).slice(0, 5).join(' ').slice(0, 60);
    }

    if (!title) title = 'Conversation';

    await OracleThread.updateOne(
      { username, threadId },
      { $set: { title, updatedAt: new Date() } }
    );

    res.json({ title });
  } catch (err) {
    console.error('[OracleThread] auto-title error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
