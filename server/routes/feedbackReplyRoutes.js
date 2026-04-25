// server/routes/feedbackReplyRoutes.js
// Admin replies to user feedback (bugs, etc) — surfaced as in-app "Transmission" sheet
// on the user's next app load. One-shot: user acknowledges, dismissed forever.

const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const ADMIN_USERNAMES = ['rossbased', 'ross'];

const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'Unauthorized' });
  const token = authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) return res.status(401).json({ error: 'Unauthorized' });
    const decoded = jwt.verify(token, jwtSecret);
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ error: 'Unauthorized' });
  }
};

const requireAdmin = (req, res, next) => {
  const username = req.user?.username?.toLowerCase();
  if (!username || !ADMIN_USERNAMES.includes(username)) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  next();
};

// GET /api/feedback-replies/pending — unacknowledged replies for current user
router.get('/pending', authenticate, async (req, res) => {
  try {
    const user = await User.findOne(
      { username: req.user.username },
      { feedbackReplies: 1 }
    );
    if (!user) return res.status(404).json({ error: 'User not found' });
    const pending = (user.feedbackReplies || []).filter(r => !r.acknowledgedAt);
    res.json({ replies: pending });
  } catch (err) {
    console.error('Fetch feedback replies error:', err);
    res.status(500).json({ error: 'Failed to fetch replies' });
  }
});

// POST /api/feedback-replies/:id/acknowledge
router.post('/:id/acknowledge', authenticate, async (req, res) => {
  try {
    const result = await User.updateOne(
      { username: req.user.username, 'feedbackReplies._id': req.params.id },
      { $set: { 'feedbackReplies.$.acknowledgedAt': new Date() } }
    );
    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'Reply not found' });
    }
    res.json({ success: true });
  } catch (err) {
    console.error('Acknowledge feedback reply error:', err);
    res.status(500).json({ error: 'Failed to acknowledge' });
  }
});

// POST /api/feedback-replies/admin/send
// Admin-only. Body: { username, message, feedbackText?, feedbackType?, status? }
router.post('/admin/send', authenticate, requireAdmin, async (req, res) => {
  try {
    const {
      username,
      message,
      feedbackText = '',
      feedbackType = 'bug',
      status = 'fixed'
    } = req.body;

    if (!username || !message) {
      return res.status(400).json({ error: 'username and message are required' });
    }

    const user = await User.findOne({ username });
    if (!user) return res.status(404).json({ error: 'Target user not found' });

    user.feedbackReplies = user.feedbackReplies || [];
    user.feedbackReplies.push({
      message,
      feedbackText,
      feedbackType,
      status
    });
    await user.save();

    const created = user.feedbackReplies[user.feedbackReplies.length - 1];
    console.log(`📬 Feedback reply sent to ${username} by ${req.user.username}`);
    res.json({ success: true, replyId: created._id });
  } catch (err) {
    console.error('Send feedback reply error:', err);
    res.status(500).json({ error: 'Failed to send reply' });
  }
});

module.exports = router;
