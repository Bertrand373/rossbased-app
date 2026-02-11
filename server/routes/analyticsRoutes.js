// server/routes/analyticsRoutes.js
// Admin Analytics API — queries existing MongoDB User data
// No new collections needed

const express = require('express');
const router = express.Router();
const User = require('../models/User');

// POST /api/analytics/verify — check admin password
router.post('/verify', (req, res) => {
  const { password } = req.body;
  const adminPass = process.env.ADMIN_COCKPIT_PASSWORD || '35slowH?';
  if (password === adminPass) {
    return res.json({ verified: true });
  }
  return res.status(401).json({ verified: false, error: 'Wrong password' });
});

const adminCheck = (req, res, next) => {
  const username = req.user?.username || '';
  const lower = username.toLowerCase();
  const envAdmins = process.env.ADMIN_USERNAMES;
  if (envAdmins) {
    const allowed = envAdmins.split(',').map(u => u.trim().toLowerCase());
    if (allowed.includes(lower)) return next();
  }
  if (lower.startsWith('ross')) return next();
  return res.status(403).json({ error: 'Admin access required' });
};

const getDateRange = (days) => new Date(Date.now() - days * 86400000);
const startOfDay = (date) => { const d = new Date(date); d.setHours(0,0,0,0); return d; };

// Exclude admin accounts from user-facing metrics
const adminFilter = { username: { $not: /^ross/i } };

// GET /api/analytics/overview
router.get('/overview', adminCheck, async (req, res) => {
  try {
    const now = new Date();
    const today = startOfDay(now);
    const sevenDaysAgo = getDateRange(7);
    const thirtyDaysAgo = getDateRange(30);
    const prevThirtyDays = getDateRange(60);

    const totalUsers = await User.countDocuments(adminFilter);
    const premiumUsers = await User.countDocuments({ 
      ...adminFilter,
      'subscription.status': { $in: ['grandfathered', 'active', 'trial', 'canceled'] } 
    });
    const signupsToday = await User.countDocuments({ ...adminFilter, createdAt: { $gte: today } });
    const signupsThisWeek = await User.countDocuments({ ...adminFilter, createdAt: { $gte: sevenDaysAgo } });
    const signupsThisMonth = await User.countDocuments({ ...adminFilter, createdAt: { $gte: thirtyDaysAgo } });
    const signupsPrevMonth = await User.countDocuments({ ...adminFilter, createdAt: { $gte: prevThirtyDays, $lt: thirtyDaysAgo } });
    
    // DAU/WAU/MAU — use lastSeen if available, fall back to updatedAt
    const activeQuery = (since) => ({
      ...adminFilter,
      $or: [{ lastSeen: { $gte: since } }, { updatedAt: { $gte: since } }]
    });
    const dauCount = await User.countDocuments(activeQuery(today));
    const wauCount = await User.countDocuments(activeQuery(sevenDaysAgo));
    const mauCount = await User.countDocuments(activeQuery(thirtyDaysAgo));
    
    const usersWhoLogged = await User.countDocuments({ ...adminFilter, 'benefitTracking.0': { $exists: true } });
    
    // Ghost users = signed up but zero engagement
    const engagedUsers = await User.countDocuments({
      ...adminFilter,
      $or: [
        { 'benefitTracking.0': { $exists: true } },
        { 'urgeLog.0': { $exists: true } },
        { 'emotionalTracking.0': { $exists: true } },
        { 'aiUsage.lifetimeCount': { $gt: 0 } }
      ]
    });
    const ghostUsers = totalUsers - engagedUsers;

    const signupTrend = await User.aggregate([
      { $match: { ...adminFilter, createdAt: { $gte: thirtyDaysAgo } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);

    const growthRate = signupsPrevMonth > 0
      ? Math.round(((signupsThisMonth - signupsPrevMonth) / signupsPrevMonth) * 100)
      : signupsThisMonth > 0 ? 100 : 0;

    res.json({
      totalUsers, premiumUsers,
      premiumRate: totalUsers > 0 ? Math.round((premiumUsers / totalUsers) * 100) : 0,
      signupsToday, signupsThisWeek, signupsThisMonth, growthRate,
      dau: dauCount, wau: wauCount, mau: mauCount,
      usersWhoLogged, engagedUsers, ghostUsers,
      logRate: totalUsers > 0 ? Math.round((usersWhoLogged / totalUsers) * 100) : 0,
      signupTrend
    });
  } catch (error) {
    console.error('Analytics overview error:', error);
    res.status(500).json({ error: 'Failed to load overview' });
  }
});

// GET /api/analytics/engagement
router.get('/engagement', adminCheck, async (req, res) => {
  try {
    const featureAdoption = await User.aggregate([
      {
        $project: {
          hasBenefitLogs: { $gt: [{ $size: { $ifNull: ['$benefitTracking', []] } }, 0] },
          hasEmotionalLogs: { $gt: [{ $size: { $ifNull: ['$emotionalTracking', []] } }, 0] },
          hasUrgeLogs: { $gt: [{ $size: { $ifNull: ['$urgeLog', []] } }, 0] },
          hasToolUsage: { $gt: [{ $size: { $ifNull: ['$urgeToolUsage', []] } }, 0] },
          hasJournalEntries: { $gt: [{ $size: { $objectToArray: { $ifNull: ['$notes', {}] } } }, 0] },
          hasGoal: { $eq: ['$goal.isActive', true] },
          usesLeaderboard: '$showOnLeaderboard',
          usesAI: { $gt: [{ $ifNull: ['$aiUsage.lifetimeCount', 0] }, 0] },
          totalBenefitLogs: { $size: { $ifNull: ['$benefitTracking', []] } },
          totalUrgeLogs: { $size: { $ifNull: ['$urgeLog', []] } },
          totalEmotionalLogs: { $size: { $ifNull: ['$emotionalTracking', []] } },
          totalToolUsage: { $size: { $ifNull: ['$urgeToolUsage', []] } },
          totalJournalEntries: { $size: { $objectToArray: { $ifNull: ['$notes', {}] } } },
          aiLifetimeCount: { $ifNull: ['$aiUsage.lifetimeCount', 0] }
        }
      },
      {
        $group: {
          _id: null,
          totalUsers: { $sum: 1 },
          benefitLogUsers: { $sum: { $cond: ['$hasBenefitLogs', 1, 0] } },
          emotionalLogUsers: { $sum: { $cond: ['$hasEmotionalLogs', 1, 0] } },
          urgeLogUsers: { $sum: { $cond: ['$hasUrgeLogs', 1, 0] } },
          toolUsageUsers: { $sum: { $cond: ['$hasToolUsage', 1, 0] } },
          journalUsers: { $sum: { $cond: ['$hasJournalEntries', 1, 0] } },
          goalUsers: { $sum: { $cond: ['$hasGoal', 1, 0] } },
          leaderboardUsers: { $sum: { $cond: ['$usesLeaderboard', 1, 0] } },
          aiUsers: { $sum: { $cond: ['$usesAI', 1, 0] } },
          totalBenefitLogs: { $sum: '$totalBenefitLogs' },
          totalUrgeLogs: { $sum: '$totalUrgeLogs' },
          totalEmotionalLogs: { $sum: '$totalEmotionalLogs' },
          totalToolUsage: { $sum: '$totalToolUsage' },
          totalJournalEntries: { $sum: '$totalJournalEntries' },
          totalAIMessages: { $sum: '$aiLifetimeCount' }
        }
      }
    ]);

    const s = featureAdoption[0] || {};
    const recentLoggers = await User.countDocuments({ 'benefitTracking': { $elemMatch: { date: { $gte: getDateRange(7) } } } });

    res.json({
      features: {
        benefitTracking: { users: s.benefitLogUsers || 0, totalLogs: s.totalBenefitLogs || 0 },
        emotionalTimeline: { users: s.emotionalLogUsers || 0, totalLogs: s.totalEmotionalLogs || 0 },
        urgeLogs: { users: s.urgeLogUsers || 0, totalLogs: s.totalUrgeLogs || 0 },
        urgeToolkit: { users: s.toolUsageUsers || 0, totalUsage: s.totalToolUsage || 0 },
        journal: { users: s.journalUsers || 0, totalEntries: s.totalJournalEntries || 0 },
        goals: { users: s.goalUsers || 0 },
        leaderboard: { users: s.leaderboardUsers || 0 },
        aiGuide: { users: s.aiUsers || 0, totalMessages: s.totalAIMessages || 0 }
      },
      totalUsers: s.totalUsers || 0,
      recentLoggers
    });
  } catch (error) {
    console.error('Analytics engagement error:', error);
    res.status(500).json({ error: 'Failed to load engagement' });
  }
});

// GET /api/analytics/streaks
router.get('/streaks', adminCheck, async (req, res) => {
  try {
    const streakDistribution = await User.aggregate([
      { $bucket: { groupBy: '$currentStreak', boundaries: [0,1,8,15,31,61,91,181,366,10000], default: 'other', output: { count: { $sum: 1 } } } }
    ]);
    const labels = { 0:'Day 0', 1:'1-7', 8:'8-14', 15:'15-30', 31:'31-60', 61:'61-90', 91:'91-180', 181:'181-365', 366:'365+' };
    const distribution = streakDistribution.map(b => ({ range: labels[b._id] || `${b._id}+`, count: b.count }));

    const avgStreak = await User.aggregate([{ $group: { _id: null, avg: { $avg: '$currentStreak' } } }]);

    const relapseData = await User.aggregate([
      { $unwind: '$streakHistory' },
      { $match: { 'streakHistory.reason': 'relapse' } },
      { $group: { _id: null, totalRelapses: { $sum: 1 }, avgStreakBeforeRelapse: { $avg: '$streakHistory.days' }, streakDays: { $push: '$streakHistory.days' }, triggers: { $push: '$streakHistory.trigger' } } }
    ]);

    const triggerCounts = {};
    (relapseData[0]?.triggers || []).forEach(t => { if (t) triggerCounts[t] = (triggerCounts[t] || 0) + 1; });
    const topTriggers = Object.entries(triggerCounts).sort((a,b) => b[1]-a[1]).slice(0,8).map(([trigger,count]) => ({ trigger, count }));

    const failureDays = {};
    (relapseData[0]?.streakDays || []).forEach(d => {
      const b = d <= 3 ? '1-3' : d <= 7 ? '4-7' : d <= 14 ? '8-14' : d <= 30 ? '15-30' : d <= 60 ? '31-60' : d <= 90 ? '61-90' : '90+';
      failureDays[b] = (failureDays[b] || 0) + 1;
    });

    const topStreaks = await User.find({}, 'username currentStreak longestStreak').sort({ longestStreak: -1 }).limit(10).lean();

    res.json({
      distribution,
      averageStreak: Math.round(avgStreak[0]?.avg || 0),
      totalRelapses: relapseData[0]?.totalRelapses || 0,
      avgStreakBeforeRelapse: Math.round(relapseData[0]?.avgStreakBeforeRelapse || 0),
      topTriggers, failureDays,
      topStreaks: topStreaks.map(u => ({ username: u.username, current: u.currentStreak, longest: u.longestStreak }))
    });
  } catch (error) {
    console.error('Analytics streaks error:', error);
    res.status(500).json({ error: 'Failed to load streak data' });
  }
});

// GET /api/analytics/retention
router.get('/retention', adminCheck, async (req, res) => {
  try {
    const users = await User.find({ 'benefitTracking.0': { $exists: true } }, 'createdAt benefitTracking.date').lean();
    let d1=0, d7=0, d14=0, d30=0, d60=0, d90=0;
    const totalWithData = users.length;

    users.forEach(user => {
      if (!user.createdAt || !user.benefitTracking?.length) return;
      const signup = new Date(user.createdAt).getTime();
      const logs = user.benefitTracking.map(b => new Date(b.date).getTime());
      const after = days => logs.some(d => d >= signup + days * 86400000);
      if (after(1)) d1++;
      if (after(7)) d7++;
      if (after(14)) d14++;
      if (after(30)) d30++;
      if (after(60)) d60++;
      if (after(90)) d90++;
    });

    const totalUsers = await User.countDocuments();
    const rate = (n) => totalWithData > 0 ? Math.round((n / totalWithData) * 100) : 0;

    res.json({
      totalUsers, totalWithData,
      retention: {
        d1: { count: d1, rate: rate(d1) }, d7: { count: d7, rate: rate(d7) },
        d14: { count: d14, rate: rate(d14) }, d30: { count: d30, rate: rate(d30) },
        d60: { count: d60, rate: rate(d60) }, d90: { count: d90, rate: rate(d90) }
      },
      activationRate: totalUsers > 0 ? Math.round((totalWithData / totalUsers) * 100) : 0
    });
  } catch (error) {
    console.error('Analytics retention error:', error);
    res.status(500).json({ error: 'Failed to load retention data' });
  }
});

// GET /api/analytics/users
router.get('/users', adminCheck, async (req, res) => {
  try {
    const { sort = 'recent', limit = 50 } = req.query;
    let sortObj = { createdAt: -1 };
    if (sort === 'streak') sortObj = { currentStreak: -1 };
    if (sort === 'active') sortObj = { lastSeen: -1 };

    const users = await User.find({},
      'username email currentStreak longestStreak relapseCount isPremium subscription.status subscription.trialEndDate subscription.currentPeriodEnd createdAt updatedAt lastSeen benefitTracking urgeLog aiUsage showOnLeaderboard discordUsername'
    ).sort(sortObj).limit(parseInt(limit)).lean();

    res.json({
      users: users.map(u => ({
        username: u.username, email: u.email || '',
        currentStreak: u.currentStreak || 0, longestStreak: u.longestStreak || 0,
        relapses: u.relapseCount || 0, 
        isPremium: (() => {
          const s = u.subscription;
          if (!s) return false;
          if (s.status === 'grandfathered' || s.status === 'active') return true;
          if (s.status === 'trial') return s.trialEndDate ? new Date() < new Date(s.trialEndDate) : false;
          if (s.status === 'canceled') return s.currentPeriodEnd ? new Date() < new Date(s.currentPeriodEnd) : false;
          return false;
        })(),
        subStatus: u.subscription?.status || 'none',
        totalLogs: u.benefitTracking?.length || 0, totalUrges: u.urgeLog?.length || 0,
        aiMessages: u.aiUsage?.lifetimeCount || 0,
        leaderboard: u.showOnLeaderboard || false, discord: u.discordUsername || '',
        joinedAt: u.createdAt, lastActive: u.lastSeen || u.updatedAt
      })),
      total: await User.countDocuments()
    });
  } catch (error) {
    console.error('Analytics users error:', error);
    res.status(500).json({ error: 'Failed to load user list' });
  }
});

// GET /api/analytics/behavior — page views, sessions, popular pages
router.get('/behavior', adminCheck, async (req, res) => {
  try {
    const PageView = require('../models/PageView');
    const now = new Date();
    const today = startOfDay(now);
    const sevenDaysAgo = getDateRange(7);
    const fourteenDaysAgo = getDateRange(14);
    const thirtyDaysAgo = getDateRange(30);
    
    const pvFilter = { userId: { $not: /^ross/i } };

    // Top pages (last 30 days)
    const topPages = await PageView.aggregate([
      { $match: { ...pvFilter, timestamp: { $gte: thirtyDaysAgo } } },
      { $group: { _id: '$page', views: { $sum: 1 }, uniqueUsers: { $addToSet: '$userId' } } },
      { $project: { page: '$_id', views: 1, users: { $size: '$uniqueUsers' }, _id: 0 } },
      { $sort: { views: -1 } },
      { $limit: 15 }
    ]);

    // Session stats (last 7 days)
    const sessions = await PageView.aggregate([
      { $match: { ...pvFilter, timestamp: { $gte: sevenDaysAgo } } },
      { $sort: { timestamp: 1 } },
      { $group: {
        _id: '$sessionId',
        userId: { $first: '$userId' },
        start: { $min: '$timestamp' },
        end: { $max: '$timestamp' },
        pageCount: { $sum: 1 },
        pages: { $push: '$page' }
      }},
      { $project: {
        userId: 1,
        durationMin: { $divide: [{ $subtract: ['$end', '$start'] }, 60000] },
        pageCount: 1
      }}
    ]);

    // Filter out sessions with only 1 page view (no duration data)
    const realSessions = sessions.filter(s => s.pageCount > 1);
    const avgDuration = realSessions.length > 0
      ? Math.round(realSessions.reduce((sum, s) => sum + s.durationMin, 0) / realSessions.length)
      : 0;
    const avgPages = sessions.length > 0
      ? Math.round((sessions.reduce((sum, s) => sum + s.pageCount, 0) / sessions.length) * 10) / 10
      : 0;

    // Counts
    const viewsToday = await PageView.countDocuments({ ...pvFilter, timestamp: { $gte: today } });
    const viewsThisWeek = await PageView.countDocuments({ ...pvFilter, timestamp: { $gte: sevenDaysAgo } });

    // Daily trend (last 14 days)
    const dailyTrend = await PageView.aggregate([
      { $match: { ...pvFilter, timestamp: { $gte: fourteenDaysAgo } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);

    // Active hours (what hour of day gets most views)
    const hourlyActivity = await PageView.aggregate([
      { $match: { ...pvFilter, timestamp: { $gte: thirtyDaysAgo } } },
      { $group: { _id: { $hour: '$timestamp' }, count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 24 }
    ]);

    // Recent activity feed — last 30 page views with user info
    const recentActivity = await PageView.find(pvFilter)
      .sort({ timestamp: -1 }).limit(30).lean();

    res.json({
      topPages,
      totalSessions: sessions.length,
      avgDuration,
      avgPages,
      viewsToday,
      viewsThisWeek,
      dailyTrend,
      hourlyActivity: hourlyActivity.map(h => ({ hour: h._id, views: h.count })),
      recentActivity: recentActivity.map(a => ({
        user: a.userId, page: a.page, time: a.timestamp
      }))
    });
  } catch (error) {
    console.error('Analytics behavior error:', error);
    res.status(500).json({ error: 'Failed to load behavior data' });
  }
});

module.exports = router;
