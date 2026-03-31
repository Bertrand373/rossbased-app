// server/routes/oracleXRoutes.js
// Admin endpoints for Oracle X (@Oracle_Observes) pipeline
// All routes require admin auth (ross/rossbased)

const express = require('express');
const router = express.Router();
const {
  generateXPost,
  postApprovedToX,
  expireStalePosts,
  getXStats
} = require('../services/oracleXEngine');
const OracleXQueue = require('../models/OracleXQueue');

// Admin check middleware
function adminOnly(req, res, next) {
  const username = req.user?.username?.toLowerCase();
  if (username !== 'rossbased' && username !== 'ross') {
    return res.status(403).json({ error: 'Admin only' });
  }
  next();
}

router.use(adminOnly);

// ============================================================
// GET /api/admin/oracle-x/stats
// Dashboard stats for the X pipeline
// ============================================================
router.get('/stats', async (req, res) => {
  try {
    const stats = await getXStats();
    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// POST /api/admin/oracle-x/generate
// Manually trigger a new X post generation
// ============================================================
router.post('/generate', async (req, res) => {
  try {
    const entry = await generateXPost();
    if (!entry) {
      return res.json({ success: false, reason: 'Already generated today or no community data' });
    }
    res.json({ success: true, entry });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// POST /api/admin/oracle-x/post
// Manually trigger posting of approved tweets
// ============================================================
router.post('/post', async (req, res) => {
  try {
    const result = await postApprovedToX();
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// POST /api/admin/oracle-x/approve/:id
// Manually approve a pending post (alternative to Discord reaction)
// ============================================================
router.post('/approve/:id', async (req, res) => {
  try {
    const entry = await OracleXQueue.findById(req.params.id);
    if (!entry) return res.status(404).json({ error: 'Post not found' });
    if (entry.status !== 'pending') {
      return res.json({ success: false, reason: `Post is already ${entry.status}` });
    }
    entry.status = 'approved';
    entry.approvedAt = new Date();
    await entry.save();
    res.json({ success: true, entry });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// POST /api/admin/oracle-x/reject/:id
// Manually reject a pending post
// ============================================================
router.post('/reject/:id', async (req, res) => {
  try {
    const entry = await OracleXQueue.findById(req.params.id);
    if (!entry) return res.status(404).json({ error: 'Post not found' });
    if (entry.status !== 'pending') {
      return res.json({ success: false, reason: `Post is already ${entry.status}` });
    }
    entry.status = 'rejected';
    entry.rejectedAt = new Date();
    await entry.save();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// POST /api/admin/oracle-x/manual
// Submit a manual tweet (bypasses generation, goes straight to queue)
// ============================================================
router.post('/manual', async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || text.length > 280) {
      return res.status(400).json({ error: 'Text required, max 280 chars' });
    }
    const entry = await OracleXQueue.create({
      text,
      status: 'approved', // Manual posts are pre-approved by Ross
      sourceType: 'manual',
      approvedAt: new Date()
    });
    res.json({ success: true, entry });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// GET /api/admin/oracle-x/queue
// View all posts in queue with filtering
// ============================================================
router.get('/queue', async (req, res) => {
  try {
    const { status } = req.query;
    const filter = status ? { status } : {};
    const posts = await OracleXQueue.find(filter)
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();
    res.json({ posts });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
