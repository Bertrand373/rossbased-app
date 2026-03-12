// server/routes/transmissionApiRoutes.js
// API endpoints for Oracle Proactive Transmissions
// Frontend fetches unread transmissions when opening Oracle chat
// Admin can manually trigger the pipeline

const express = require('express');
const router = express.Router();
const OracleTransmission = require('../models/OracleTransmission');
const { runTransmissionPipeline } = require('../services/transmissionEngine');

// ============================================================
// GET /api/oracle/transmissions
// Fetch unread transmissions for the authenticated user
// Called by AIChat.js on open
// ============================================================
router.get('/', async (req, res) => {
  try {
    const User = require('../models/User');
    const user = await User.findOne({ username: req.user.username }).select('_id').lean();
    if (!user) return res.json({ transmissions: [] });

    const unread = await OracleTransmission.find({
      userId: user._id,
      read: false
    })
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    res.json({ transmissions: unread });
  } catch (err) {
    console.error('Fetch transmissions error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// POST /api/oracle/transmissions/:id/read
// Mark a transmission as read
// Called by frontend after user sees it in Oracle chat
// ============================================================
router.post('/:id/read', async (req, res) => {
  try {
    const tx = await OracleTransmission.findByIdAndUpdate(
      req.params.id,
      { $set: { read: true, readAt: new Date() } },
      { new: true }
    );
    if (!tx) return res.status(404).json({ error: 'Transmission not found' });
    res.json({ success: true });
  } catch (err) {
    console.error('Mark transmission read error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// POST /api/admin/oracle/transmissions/run
// Manually trigger the transmission pipeline (admin only)
// ============================================================
router.post('/run', async (req, res) => {
  const username = req.user?.username?.toLowerCase();
  if (username !== 'rossbased') {
    return res.status(403).json({ error: 'Admin only' });
  }

  try {
    const { targetUsername, force } = req.body || {};
    const results = await runTransmissionPipeline({ targetUsername, force });
    res.json(results);
  } catch (err) {
    console.error('Transmission pipeline error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// GET /api/admin/oracle/transmissions/stats
// View transmission stats (admin only)
// ============================================================
router.get('/stats', async (req, res) => {
  const username = req.user?.username?.toLowerCase();
  if (username !== 'rossbased') {
    return res.status(403).json({ error: 'Admin only' });
  }

  try {
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [total, thisWeek, delivered, read, bySource] = await Promise.all([
      OracleTransmission.countDocuments(),
      OracleTransmission.countDocuments({ createdAt: { $gte: weekAgo } }),
      OracleTransmission.countDocuments({ delivered: true }),
      OracleTransmission.countDocuments({ read: true }),
      OracleTransmission.aggregate([
        { $match: { createdAt: { $gte: weekAgo } } },
        { $group: { _id: '$source', count: { $sum: 1 } } }
      ])
    ]);

    const readRate = delivered > 0 ? Math.round((read / delivered) * 100) : 0;

    // Recent transmissions for preview
    const recent = await OracleTransmission.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .select('username source message read createdAt context.streakDay context.riskScore')
      .lean();

    res.json({
      total,
      thisWeek,
      delivered,
      read,
      readRate: `${readRate}%`,
      bySource: bySource.reduce((acc, s) => { acc[s._id] = s.count; return acc; }, {}),
      recent
    });
  } catch (err) {
    console.error('Transmission stats error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
