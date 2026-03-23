// server/routes/analyticsRoutes.js
// Admin Analytics API — queries existing MongoDB User data
// No new collections needed

const express = require('express');
const router = express.Router();
const User = require('../models/User');

// Timezone-safe streak calculation — handles "yyyy-MM-dd" strings AND legacy Date objects
// Accepts optional timezone (e.g. 'America/New_York') so admin shows correct day
function calcStreak(startDate, timezone) {
  if (!startDate) return 0;
  let y, m, d;
  if (typeof startDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(startDate)) {
    [y, m, d] = startDate.split('-').map(Number);
  } else {
    const dt = new Date(startDate);
    y = dt.getUTCFullYear(); m = dt.getUTCMonth() + 1; d = dt.getUTCDate();
  }
  const startMs = Date.UTC(y, m - 1, d);
  let todayMs;
  if (timezone) {
    try {
      const localStr = new Date().toLocaleDateString('en-CA', { timeZone: timezone });
      const [ty, tm, td] = localStr.split('-').map(Number);
      todayMs = Date.UTC(ty, tm - 1, td);
    } catch { const t = new Date(); t.setHours(0,0,0,0); todayMs = t.getTime(); }
  } else {
    const t = new Date(); t.setHours(0,0,0,0); todayMs = t.getTime();
  }
  return Math.max(1, Math.floor((todayMs - startMs) / 86400000) + 1);
}

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
  if (lower === 'rossbased' || lower === 'ross') return next();
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
      { $match: adminFilter },
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
          hasWetDreams: { $gt: [{ $ifNull: ['$wetDreamCount', 0] }, 0] },
          totalBenefitLogs: { $size: { $ifNull: ['$benefitTracking', []] } },
          totalUrgeLogs: { $size: { $ifNull: ['$urgeLog', []] } },
          totalEmotionalLogs: { $size: { $ifNull: ['$emotionalTracking', []] } },
          totalToolUsage: { $size: { $ifNull: ['$urgeToolUsage', []] } },
          totalJournalEntries: { $size: { $objectToArray: { $ifNull: ['$notes', {}] } } },
          aiLifetimeCount: { $ifNull: ['$aiUsage.lifetimeCount', 0] },
          totalWetDreams: { $ifNull: ['$wetDreamCount', 0] }
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
          wetDreamUsers: { $sum: { $cond: ['$hasWetDreams', 1, 0] } },
          totalBenefitLogs: { $sum: '$totalBenefitLogs' },
          totalUrgeLogs: { $sum: '$totalUrgeLogs' },
          totalEmotionalLogs: { $sum: '$totalEmotionalLogs' },
          totalToolUsage: { $sum: '$totalToolUsage' },
          totalJournalEntries: { $sum: '$totalJournalEntries' },
          totalAIMessages: { $sum: '$aiLifetimeCount' },
          totalWetDreams: { $sum: '$totalWetDreams' }
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
        oracle: { users: s.aiUsers || 0, totalMessages: s.totalAIMessages || 0 },
        wetDreams: { users: s.wetDreamUsers || 0, totalLogged: s.totalWetDreams || 0 }
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
    // FIXED: Compute real streaks from startDate (not stale currentStreak field)
    const allUsers = await User.find(
      { ...adminFilter, startDate: { $exists: true, $ne: null } },
      'username startDate currentStreak longestStreak timezone'
    ).lean();

    const realStreaks = allUsers.map(u => ({
      username: u.username,
      current: calcStreak(u.startDate, u.timezone),
      longest: Math.max(u.longestStreak || 0, calcStreak(u.startDate, u.timezone))
    }));

    const buckets = { 'Day 0': 0, '1-7': 0, '8-14': 0, '15-30': 0, '31-60': 0, '61-90': 0, '91-180': 0, '181-365': 0, '365+': 0 };
    realStreaks.forEach(u => {
      const d = u.current;
      if (d <= 0) buckets['Day 0']++;
      else if (d <= 7) buckets['1-7']++;
      else if (d <= 14) buckets['8-14']++;
      else if (d <= 30) buckets['15-30']++;
      else if (d <= 60) buckets['31-60']++;
      else if (d <= 90) buckets['61-90']++;
      else if (d <= 180) buckets['91-180']++;
      else if (d <= 365) buckets['181-365']++;
      else buckets['365+']++;
    });
    const distribution = Object.entries(buckets).map(([range, count]) => ({ range, count }));

    const avgStreakVal = realStreaks.length > 0
      ? Math.round(realStreaks.reduce((sum, u) => sum + u.current, 0) / realStreaks.length)
      : 0;

    const topStreaks = [...realStreaks].sort((a, b) => b.longest - a.longest).slice(0, 10);

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

    res.json({
      distribution,
      averageStreak: avgStreakVal,
      totalRelapses: relapseData[0]?.totalRelapses || 0,
      avgStreakBeforeRelapse: Math.round(relapseData[0]?.avgStreakBeforeRelapse || 0),
      topTriggers, failureDays,
      topStreaks: topStreaks.map(u => ({ username: u.username, current: u.current, longest: u.longest }))
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
    const { sort = 'recent', limit = 500 } = req.query;
    let sortObj = { createdAt: -1 };
    if (sort === 'streak') sortObj = { currentStreak: -1 };
    if (sort === 'active') sortObj = { lastSeen: -1 };

    const users = await User.find({},
      'username email currentStreak startDate longestStreak relapseCount isPremium subscription.status subscription.tier subscription.trialEndDate subscription.currentPeriodEnd subscription.grandfatheredAt subscription.stripeSubscriptionId createdAt updatedAt lastSeen benefitTracking urgeLog aiUsage showOnLeaderboard discordUsername timezone'
    ).sort(sortObj).limit(parseInt(limit)).lean();

    res.json({
      users: users.map(u => {
        // Compute real-time streak from startDate (same as Oracle)
        let streak = u.currentStreak || 0;
        if (u.startDate) {
          streak = calcStreak(u.startDate, u.timezone);
        }
        return {
        username: u.username, email: u.email || '',
        currentStreak: streak, longestStreak: Math.max(u.longestStreak || 0, streak),
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
        subTier: u.subscription?.tier || 'practitioner',
        isOG: !!u.subscription?.grandfatheredAt,
        hasActiveStripeSub: !!(u.subscription?.stripeSubscriptionId && u.subscription?.currentPeriodEnd && new Date(u.subscription.currentPeriodEnd) > new Date()),
        totalLogs: u.benefitTracking?.length || 0, totalUrges: u.urgeLog?.length || 0,
        aiMessages: u.aiUsage?.lifetimeCount || 0,
        aiToday: u.aiUsage?.count || 0,
        aiDate: u.aiUsage?.date || null,
        aiLastUsed: u.aiUsage?.lastUsed || null,
        leaderboard: u.showOnLeaderboard || false, discord: u.discordUsername || '',
        joinedAt: u.createdAt, lastActive: u.lastSeen || u.updatedAt
      }; }),
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

// GET /api/analytics/checkins — check-in frequency, streaks, depth, drop-off
router.get('/checkins', adminCheck, async (req, res) => {
  try {
    const now = new Date();
    const sevenDaysAgo = getDateRange(7);
    const thirtyDaysAgo = getDateRange(30);

    // Pull all users with any check-in data
    const users = await User.find({
      ...adminFilter,
      $or: [
        { 'benefitTracking.0': { $exists: true } },
        { 'emotionalTracking.0': { $exists: true } }
      ]
    }, 'benefitTracking emotionalTracking currentStreak startDate createdAt').lean();

    // ── FREQUENCY ──
    // Who logged in last 7d vs 30d
    let benefit7d = 0, benefit30d = 0, emotional7d = 0, emotional30d = 0;
    let totalBenefitLogs7d = 0, totalEmotionalLogs7d = 0;

    users.forEach(u => {
      const bLogs = (u.benefitTracking || []);
      const eLogs = (u.emotionalTracking || []);
      const bRecent7 = bLogs.filter(l => new Date(l.date) >= sevenDaysAgo);
      const bRecent30 = bLogs.filter(l => new Date(l.date) >= thirtyDaysAgo);
      const eRecent7 = eLogs.filter(l => new Date(l.date) >= sevenDaysAgo);
      const eRecent30 = eLogs.filter(l => new Date(l.date) >= thirtyDaysAgo);
      if (bRecent7.length > 0) { benefit7d++; totalBenefitLogs7d += bRecent7.length; }
      if (bRecent30.length > 0) benefit30d++;
      if (eRecent7.length > 0) { emotional7d++; totalEmotionalLogs7d += eRecent7.length; }
      if (eRecent30.length > 0) emotional30d++;
    });

    // ── CHECK-IN STREAKS ──
    // For each user, calculate longest consecutive-day logging streak for benefits
    const streakDistribution = { '1': 0, '2-3': 0, '4-7': 0, '8-14': 0, '15-30': 0, '30+': 0 };
    const allConsecStreaks = [];

    users.forEach(u => {
      const dates = (u.benefitTracking || [])
        .map(l => new Date(l.date).toISOString().split('T')[0])
        .filter((v, i, a) => a.indexOf(v) === i) // unique dates
        .sort();
      if (dates.length === 0) return;

      let maxConsec = 1, current = 1;
      for (let i = 1; i < dates.length; i++) {
        const prev = new Date(dates[i - 1]);
        const curr = new Date(dates[i]);
        const diff = Math.round((curr - prev) / 86400000);
        if (diff === 1) { current++; maxConsec = Math.max(maxConsec, current); }
        else { current = 1; }
      }
      maxConsec = Math.max(maxConsec, current);
      allConsecStreaks.push(maxConsec);

      // Bucket
      if (maxConsec === 1) streakDistribution['1']++;
      else if (maxConsec <= 3) streakDistribution['2-3']++;
      else if (maxConsec <= 7) streakDistribution['4-7']++;
      else if (maxConsec <= 14) streakDistribution['8-14']++;
      else if (maxConsec <= 30) streakDistribution['15-30']++;
      else streakDistribution['30+']++;
    });

    const avgConsecStreak = allConsecStreaks.length > 0
      ? Math.round((allConsecStreaks.reduce((s, v) => s + v, 0) / allConsecStreaks.length) * 10) / 10
      : 0;

    // ── CHECK-IN DEPTH (variance) ──
    // Are users moving sliders or just slamming 5s?
    let lowVariance = 0, medVariance = 0, highVariance = 0;
    const allVariances = [];

    users.forEach(u => {
      const logs = u.benefitTracking || [];
      if (logs.length < 3) return;

      // Look at last 14 entries for this user
      const recent = logs.slice(-14);
      const metrics = ['confidence', 'energy', 'focus', 'aura', 'sleep', 'workout'];
      const values = [];
      recent.forEach(log => {
        metrics.forEach(m => { if (log[m] !== undefined) values.push(log[m]); });
      });

      if (values.length < 6) return;
      const mean = values.reduce((s, v) => s + v, 0) / values.length;
      const variance = values.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / values.length;
      const stdDev = Math.sqrt(variance);
      allVariances.push(stdDev);

      if (stdDev < 0.5) lowVariance++;      // slamming same numbers
      else if (stdDev < 1.5) medVariance++;  // moderate variation
      else highVariance++;                    // thoughtful tracking
    });

    const avgVariance = allVariances.length > 0
      ? Math.round((allVariances.reduce((s, v) => s + v, 0) / allVariances.length) * 100) / 100
      : 0;

    // ── DROP-OFF TIMING ──
    // At what streak day do users stop checking in?
    // Compare: user's current streak vs days since their last check-in
    const dropOffBuckets = { '1-7': 0, '8-14': 0, '15-30': 0, '31-60': 0, '61-90': 0, '90+': 0 };
    let activeCheckers = 0, staleCheckers = 0;

    users.forEach(u => {
      const logs = u.benefitTracking || [];
      if (logs.length === 0) return;

      const lastLog = new Date(Math.max(...logs.map(l => new Date(l.date).getTime())));
      const daysSinceLast = Math.floor((now - lastLog) / 86400000);

      if (daysSinceLast <= 3) {
        activeCheckers++;
      } else {
        staleCheckers++;
        // What streak day were they on when they stopped?
        // Approximate: their total logs gives a rough "they were active for N days"
        const activeDays = logs.length;
        const bucket = activeDays <= 7 ? '1-7' : activeDays <= 14 ? '8-14' :
          activeDays <= 30 ? '15-30' : activeDays <= 60 ? '31-60' :
          activeDays <= 90 ? '61-90' : '90+';
        dropOffBuckets[bucket]++;
      }
    });

    // ── DAILY LOG TREND (last 14 days) ──
    const dailyLogTrend = [];
    for (let i = 13; i >= 0; i--) {
      const dayStart = new Date(now);
      dayStart.setDate(dayStart.getDate() - i);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(dayStart);
      dayEnd.setDate(dayEnd.getDate() + 1);
      const dateStr = dayStart.toISOString().split('T')[0];

      let benefitCount = 0, emotionalCount = 0;
      users.forEach(u => {
        (u.benefitTracking || []).forEach(l => {
          const d = new Date(l.date);
          if (d >= dayStart && d < dayEnd) benefitCount++;
        });
        (u.emotionalTracking || []).forEach(l => {
          const d = new Date(l.date);
          if (d >= dayStart && d < dayEnd) emotionalCount++;
        });
      });
      dailyLogTrend.push({ _id: dateStr, benefits: benefitCount, emotional: emotionalCount, count: benefitCount + emotionalCount });
    }

    res.json({
      totalCheckInUsers: users.length,
      frequency: {
        benefit: { active7d: benefit7d, active30d: benefit30d, logsThisWeek: totalBenefitLogs7d },
        emotional: { active7d: emotional7d, active30d: emotional30d, logsThisWeek: totalEmotionalLogs7d },
        avgBenefitLogsPerWeek: benefit7d > 0 ? Math.round((totalBenefitLogs7d / benefit7d) * 10) / 10 : 0,
        avgEmotionalLogsPerWeek: emotional7d > 0 ? Math.round((totalEmotionalLogs7d / emotional7d) * 10) / 10 : 0
      },
      streaks: {
        distribution: Object.entries(streakDistribution).map(([range, count]) => ({ range, count })),
        avgConsecutive: avgConsecStreak,
        totalTracked: allConsecStreaks.length
      },
      depth: {
        low: lowVariance,
        medium: medVariance,
        high: highVariance,
        avgStdDev: avgVariance,
        totalAnalyzed: allVariances.length
      },
      dropOff: {
        activeCheckers,
        staleCheckers,
        buckets: Object.entries(dropOffBuckets).map(([range, count]) => ({ range, count })),
        staleRate: users.length > 0 ? Math.round((staleCheckers / users.length) * 100) : 0
      },
      dailyLogTrend
    });
  } catch (error) {
    console.error('Analytics checkins error:', error);
    res.status(500).json({ error: 'Failed to load check-in data' });
  }
});

// GET /api/analytics/user/:username/activity — per-user activity feed for admin detail panel
router.get('/user/:username/activity', adminCheck, async (req, res) => {
  try {
    const PageView = require('../models/PageView');
    const { username } = req.params;
    const sevenDaysAgo = getDateRange(7);
    const thirtyDaysAgo = getDateRange(30);

    // Parallel fetch: user doc + page views
    const [user, recentPages, pageStats] = await Promise.all([
      User.findOne({ username }, 
        'benefitTracking urgeLog streakHistory oracleNotes aiUsage subscription timezone startDate currentStreak longestStreak relapseCount wetDreamCount discordUsername email createdAt lastSeen showOnLeaderboard'
      ).lean(),
      PageView.find({ userId: username, timestamp: { $gte: sevenDaysAgo } })
        .sort({ timestamp: -1 }).limit(200).lean(),
      PageView.aggregate([
        { $match: { userId: username, timestamp: { $gte: thirtyDaysAgo } } },
        { $group: { _id: '$page', count: { $sum: 1 }, lastVisit: { $max: '$timestamp' } } },
        { $sort: { count: -1 } }
      ])
    ]);

    if (!user) return res.status(404).json({ error: 'User not found' });

    // Build merged activity timeline (last 7 days, capped at 50 events)
    const events = [];

    // Page visits → collapsed into sessions (group visits < 2min apart)
    recentPages.forEach(pv => {
      events.push({ type: 'page', page: pv.page, at: pv.timestamp, sid: pv.sessionId });
    });

    // Benefit logs
    (user.benefitTracking || []).filter(l => new Date(l.date) >= sevenDaysAgo).forEach(l => {
      events.push({ type: 'log', at: l.date, data: { energy: l.energy, focus: l.focus, confidence: l.confidence, aura: l.aura, sleep: l.sleep, workout: l.workout } });
    });

    // Urge logs
    (user.urgeLog || []).filter(l => new Date(l.date) >= sevenDaysAgo).forEach(l => {
      events.push({ type: 'urge', at: l.date, data: { intensity: l.intensity, trigger: l.trigger, overcame: l.overcame } });
    });

    // Relapses from streak history
    (user.streakHistory || []).filter(s => s.end && new Date(s.end) >= sevenDaysAgo).forEach(s => {
      events.push({ type: 'relapse', at: s.end, data: { days: s.days, trigger: s.trigger, reason: s.reason } });
    });

    // Oracle notes (last 5)
    const recentNotes = (user.oracleNotes || []).slice(-5).reverse();

    // Sort events by time desc, cap at 50
    events.sort((a, b) => new Date(b.at) - new Date(a.at));

    // Page time analysis — estimate time on each page from sequential visits
    const pageTime = {};
    const sortedPages = [...recentPages].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    for (let i = 0; i < sortedPages.length - 1; i++) {
      const dur = (new Date(sortedPages[i + 1].timestamp) - new Date(sortedPages[i].timestamp)) / 1000;
      if (dur > 0 && dur < 1800) { // cap at 30 min per page
        const pg = sortedPages[i].page;
        if (!pageTime[pg]) pageTime[pg] = { total: 0, visits: 0 };
        pageTime[pg].total += dur;
        pageTime[pg].visits++;
      }
    }

    // Sessions (group page views by sessionId)
    const sessionMap = {};
    recentPages.forEach(pv => {
      if (!sessionMap[pv.sessionId]) sessionMap[pv.sessionId] = { start: pv.timestamp, end: pv.timestamp, pages: 0 };
      const s = sessionMap[pv.sessionId];
      if (new Date(pv.timestamp) < new Date(s.start)) s.start = pv.timestamp;
      if (new Date(pv.timestamp) > new Date(s.end)) s.end = pv.timestamp;
      s.pages++;
    });
    const sessions = Object.values(sessionMap)
      .map(s => ({ ...s, duration: Math.round((new Date(s.end) - new Date(s.start)) / 1000) }))
      .sort((a, b) => new Date(b.start) - new Date(a.start));

    res.json({
      timeline: events.slice(0, 50),
      pageStats: pageStats.map(p => ({
        page: p._id,
        visits: p.count,
        lastVisit: p.lastVisit,
        avgTime: pageTime[p._id] ? Math.round(pageTime[p._id].total / pageTime[p._id].visits) : null
      })),
      sessions: sessions.slice(0, 10),
      oracle: {
        lifetime: user.aiUsage?.lifetimeCount || 0,
        today: user.aiUsage?.count || 0,
        todayDate: user.aiUsage?.date || null,
        lastUsed: user.aiUsage?.lastUsed || null,
        weeklyCount: user.aiUsage?.weeklyCount || 0,
        recentNotes
      },
      profile: {
        email: user.email || '',
        timezone: user.timezone || '',
        startDate: user.startDate,
        streak: user.startDate ? calcStreak(user.startDate, user.timezone) : (user.currentStreak || 0),
        longestStreak: user.longestStreak || 0,
        relapses: user.relapseCount || 0,
        wetDreams: user.wetDreamCount || 0,
        totalLogs: (user.benefitTracking || []).length,
        totalUrges: (user.urgeLog || []).length,
        leaderboard: user.showOnLeaderboard || false,
        discord: user.discordUsername || '',
        joinedAt: user.createdAt,
        lastSeen: user.lastSeen
      }
    });
  } catch (error) {
    console.error('User activity error:', error);
    res.status(500).json({ error: 'Failed to load user activity' });
  }
});

module.exports = router;
