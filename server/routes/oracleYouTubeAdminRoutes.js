// server/routes/oracleYouTubeAdminRoutes.js
// Admin monitoring + kill switch for Oracle YouTube comment replies.
// Mounted under /api/admin/oracle-youtube — depends on the global authenticate
// middleware in app.js to verify the JWT, then a local adminCheck.

const express = require('express');
const router = express.Router();
const YouTubeOracleReply = require('../models/YouTubeOracleReply');
const { setRuntimeEnabled, isFeatureEnabled } = require('../services/oracleYouTubeReply');
const { deleteReply, verifyOracleAuth } = require('../services/oracleYouTubePoster');

// Admin check — mirrors adminRevenue.js
const adminCheck = (req, res, next) => {
  const username = req.user?.username || '';
  const lower = username.toLowerCase();
  const envAdmins = process.env.ADMIN_USERNAMES;
  if (envAdmins) {
    const allowed = envAdmins.split(',').map(u => u.trim().toLowerCase());
    if (allowed.includes(lower)) return next();
  }
  if (lower === 'rossbased' || lower === 'ross') return next();
  return res.status(403).json({ error: 'Admin access required' });
};

// ============================================================
// GET /api/admin/oracle-youtube/stats
// Counts of posted vs rejected vs failed, today + total
// ============================================================
router.get('/stats', adminCheck, async (req, res) => {
  try {
    const now = new Date();
    const startOfDayUtc = new Date(); startOfDayUtc.setUTCHours(0, 0, 0, 0);
    const sevenDaysAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);

    const [byStatusToday, byStatusWeek, total, auth] = await Promise.all([
      YouTubeOracleReply.aggregate([
        { $match: { createdAt: { $gte: startOfDayUtc } } },
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]),
      YouTubeOracleReply.aggregate([
        { $match: { createdAt: { $gte: sevenDaysAgo } } },
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]),
      YouTubeOracleReply.countDocuments({}),
      verifyOracleAuth()
    ]);

    const toMap = (arr) => Object.fromEntries(arr.map(x => [x._id, x.count]));

    res.json({
      featureEnabled: isFeatureEnabled(),
      oracleAuth: auth,
      today: toMap(byStatusToday),
      week: toMap(byStatusWeek),
      total
    });
  } catch (err) {
    console.error('Oracle YT admin stats error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// GET /api/admin/oracle-youtube/replies
// List recent replies. Query: ?status=posted&limit=50&videoId=X&username=Y
// ============================================================
router.get('/replies', adminCheck, async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 50, 200);
    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    if (req.query.videoId) filter.videoId = req.query.videoId;
    if (req.query.username) filter.username = req.query.username;

    const replies = await YouTubeOracleReply.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    res.json({ replies, count: replies.length });
  } catch (err) {
    console.error('Oracle YT admin replies error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// POST /api/admin/oracle-youtube/delete-reply
// Body: { replyCommentId }
// Deletes the YouTube comment via API and marks the local record as deleted.
// Use this for a bad Oracle reply you want to pull immediately.
// ============================================================
router.post('/delete-reply', adminCheck, async (req, res) => {
  try {
    const { replyCommentId } = req.body;
    if (!replyCommentId) return res.status(400).json({ error: 'replyCommentId required' });

    await deleteReply(replyCommentId);
    await YouTubeOracleReply.updateOne(
      { replyCommentId },
      { $set: { status: 'deleted' } }
    );

    res.json({ success: true });
  } catch (err) {
    console.error('Oracle YT admin delete error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// POST /api/admin/oracle-youtube/toggle
// Body: { enabled: boolean }
// Runtime kill switch. Persists until next restart. For permanent off,
// also set ORACLE_YT_ENABLED=false in Render env.
// ============================================================
router.post('/toggle', adminCheck, async (req, res) => {
  try {
    const { enabled } = req.body;
    if (typeof enabled !== 'boolean') {
      return res.status(400).json({ error: 'enabled must be boolean' });
    }
    setRuntimeEnabled(enabled);
    console.log(`🜂 Oracle YT feature toggled by ${req.user?.username}: ${enabled ? 'ENABLED' : 'DISABLED'}`);
    res.json({ success: true, enabled: isFeatureEnabled() });
  } catch (err) {
    console.error('Oracle YT admin toggle error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// POST /api/admin/oracle-youtube/test-poll
// Manually triggers a hot-video poll. Useful for verifying the pipeline
// without waiting for the 2-minute cron tick.
// ============================================================
router.post('/test-poll', adminCheck, async (req, res) => {
  try {
    const { pollHotVideos, refreshVideoList } = require('../services/youtubeOracleWatcher');
    await refreshVideoList();
    await pollHotVideos();
    res.json({ success: true });
  } catch (err) {
    console.error('Oracle YT admin test-poll error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
