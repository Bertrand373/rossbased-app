// server/routes/oraclePinRoutes.js
// API endpoints for Pin to Journey feature
// POST   /api/oracle/pins       — pin an Oracle message to a day
// GET    /api/oracle/pins       — get pins for a date range (?from=&to=)
// GET    /api/oracle/pins/:date — get pins for a specific day
// DELETE /api/oracle/pins/:id   — remove a pin

const express = require('express');
const router = express.Router();
const OraclePin = require('../models/OraclePin');
const User = require('../models/User');
const { checkPremiumAccess } = require('../middleware/subscriptionMiddleware');

// Admin usernames — exact match, case-insensitive
const isAdmin = (username) => ['ross', 'rossbased'].includes(username?.toLowerCase());

// ============================================================
// POST / — Create a pin
// Body: { message, messageTimestamp, date? }
// Premium-only (admin bypass)
// ============================================================
router.post('/', async (req, res) => {
  try {
    const username = req.user.username;
    const { message, messageTimestamp, date } = req.body;

    if (!message || !messageTimestamp) {
      return res.status(400).json({ error: 'message and messageTimestamp are required' });
    }

    // Premium gate — admins bypass
    if (!isAdmin(username)) {
      const user = await User.findOne({ username }).select('subscription isPremium').lean();
      if (!user) return res.status(404).json({ error: 'User not found' });
      const { hasPremium } = checkPremiumAccess(user);
      const isGrandfathered = user.subscription?.status === 'grandfathered';
      if (!hasPremium && !isGrandfathered) {
        return res.status(403).json({ error: 'Premium required', code: 'PREMIUM_REQUIRED' });
      }
    }

    // Determine pin date — use provided date or derive from user timezone
    let pinDate = date;
    if (!pinDate) {
      // Try to get user's timezone for accurate "today"
      const user = await User.findOne({ username }).select('timezone').lean();
      const tz = user?.timezone || 'UTC';
      try {
        const now = new Date();
        const formatter = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' });
        pinDate = formatter.format(now); // "yyyy-MM-dd" format
      } catch {
        // Fallback to UTC date
        pinDate = new Date().toISOString().split('T')[0];
      }
    }

    // Validate date format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(pinDate)) {
      return res.status(400).json({ error: 'Invalid date format. Use yyyy-MM-dd' });
    }

    const pin = await OraclePin.create({
      username,
      date: pinDate,
      message,
      messageTimestamp
    });

    res.status(201).json({ pin });
  } catch (err) {
    // Duplicate pin (unique index on username + messageTimestamp)
    if (err.code === 11000) {
      return res.status(409).json({ error: 'Already pinned', code: 'ALREADY_PINNED' });
    }
    console.error('Create pin error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// GET / — Get pins for a date range
// Query: ?from=yyyy-MM-dd&to=yyyy-MM-dd
// ============================================================
router.get('/', async (req, res) => {
  try {
    const username = req.user.username;
    const { from, to } = req.query;

    if (!from || !to) {
      return res.status(400).json({ error: 'from and to query params required' });
    }

    const pins = await OraclePin.find({
      username,
      date: { $gte: from, $lte: to }
    }).sort({ date: 1, pinnedAt: 1 }).lean();

    res.json({ pins });
  } catch (err) {
    console.error('Get pins range error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// GET /:date — Get pins for a specific day
// ============================================================
router.get('/:date', async (req, res) => {
  try {
    const username = req.user.username;
    const { date } = req.params;

    // Validate it looks like a date, not a MongoDB ObjectId
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ error: 'Invalid date format. Use yyyy-MM-dd' });
    }

    const pins = await OraclePin.find({
      username,
      date
    }).sort({ pinnedAt: 1 }).lean();

    res.json({ pins });
  } catch (err) {
    console.error('Get day pins error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// DELETE /:id — Remove a pin
// Validates ownership
// ============================================================
router.delete('/:id', async (req, res) => {
  try {
    const username = req.user.username;
    const { id } = req.params;

    const pin = await OraclePin.findById(id);
    if (!pin) {
      return res.status(404).json({ error: 'Pin not found' });
    }
    if (pin.username !== username && !isAdmin(username)) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    await OraclePin.findByIdAndDelete(id);
    res.json({ success: true });
  } catch (err) {
    console.error('Delete pin error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
