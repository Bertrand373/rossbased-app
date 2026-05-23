// server/routes/recoveryRoutes.js
// POST /api/recovery — record a relapse-recovery covenant
//
// Called by the RecoveryFlow component at the end of its 5-screen flow.
// Appends an entry to user.recoveryHistory and grants ONE bonus Oracle
// message (recoveryBypassRemaining++) that the chat endpoint consumes
// when the request body carries useRecoveryBypass: true.

const express = require('express');
const router = express.Router();
const User = require('../models/User');

const MAX_TEXT = 280;
const MAX_TRIGGER = 60;

const clean = (val, max) => {
  if (typeof val !== 'string') return '';
  return val.trim().slice(0, max);
};

router.post('/', async (req, res) => {
  try {
    const username = req.user.username;
    const { trigger, triggerNote, why, anchor, dayCount } = req.body || {};

    const entry = {
      date: new Date(),
      trigger: clean(trigger, MAX_TRIGGER),
      triggerNote: clean(triggerNote, MAX_TEXT),
      why: clean(why, MAX_TEXT),
      anchor: clean(anchor, MAX_TEXT),
      dayCount: Math.max(0, parseInt(dayCount, 10) || 0)
    };

    const user = await User.findOneAndUpdate(
      { username },
      {
        $push: { recoveryHistory: entry },
        $inc: { recoveryBypassRemaining: 1 }
      },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      success: true,
      entry,
      recoveryBypassRemaining: user.recoveryBypassRemaining
    });
  } catch (err) {
    console.error('Recovery save error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
