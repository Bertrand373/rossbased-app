// server/app.js
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const jwt = require('jsonwebtoken');
const { format, addDays } = require('date-fns');
const Anthropic = require('@anthropic-ai/sdk');
const crypto = require('crypto');
const { Resend } = require('resend');

// CRITICAL: Load environment variables FIRST, before any other imports that need them
dotenv.config();

// Import User model
const User = require('./models/User');
const PageView = require('./models/PageView');

// Import notification modules (these need env vars to be loaded first!)
const notificationRoutes = require('./routes/notifications');
const googleAuthRoutes = require('./routes/googleAuth');
const discordAuthRoutes = require('./routes/discordAuth');
const mlRoutes = require('./routes/mlRoutes');
const transmissionRoutes = require('./routes/transmissionRoutes');
const knowledgeRoutes = require('./routes/knowledgeRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const adminRevenueRoutes = require('./routes/adminRevenue');
const { initializeSchedulers } = require('./services/notificationScheduler');
const { retrieveKnowledge } = require('./services/knowledgeRetrieval');
const { getCommunityPulse } = require('./services/communityPulse');
const { getOutcomePatterns } = require('./services/outcomeAggregation');
const { runYouTubeFetch, getYouTubeStats } = require('./services/youtubeComments');
const { runContentPipeline, getLatestReport } = require('./services/youtubeContentPipeline');
const { classifyInteraction, backfillRelapseFlag } = require('./services/interactionClassifier');
const OracleInteraction = require('./models/OracleInteraction');
const OracleUsage = require('./models/OracleUsage');
const stripeRoutes = require('./routes/stripeRoutes');
const protocolRoutes = require('./routes/protocolRoutes');
const discordLinkRoutes = require('./routes/discordLink');
const timelineRoutes = require('./routes/timelineRoutes');
const oracleEvolutionRoutes = require('./routes/oracleEvolutionRoutes');
const { expireStaleTrials, expireStaleCanceled, checkPremiumAccess, syncStripeSubscriptions } = require('./middleware/subscriptionMiddleware');
const { checkAndSendOnboardingNotification } = require('./services/notificationService');

// Import leaderboard service
const { 
  checkAndAnnounceMilestone, 
  getLeaderboardUsers, 
  triggerLeaderboardPost, 
  getUserRank,
  manualMilestoneAnnounce,
  runScheduledMilestoneCheck
} = require('./services/leaderboardService');

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Model strings — env vars so you can update from Render without redeploying
// Alias defaults (no date pin) auto-update when Anthropic releases new versions
const ORACLE_MODEL = process.env.ORACLE_MODEL || 'claude-sonnet-4-5-20250514';
const NOTE_MODEL = process.env.NOTE_MODEL || 'claude-haiku-4-5-20251001';

// Initialize Resend client for password reset emails
const resend = new Resend(process.env.RESEND_API_KEY);

const app = express();

// Configure CORS
app.use(cors({
  origin: ['http://localhost:3000', 'https://app.rossbased.com', 'https://rossbased-app.onrender.com', 'https://titantrack.app'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// Handle CORS preflight requests
app.options('*', cors());

// STRIPE WEBHOOK: Capture raw body via verify callback for signature verification
// This is Stripe's recommended approach - captures bytes before any parsing
app.use(express.json({
  limit: '50mb',
  verify: (req, res, buf) => {
    if (req.originalUrl === '/api/stripe/webhook') {
      req.rawBody = buf;
    }
  }
}));

// Error-handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// MongoDB connection with optimized pooling for scale
const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/rossbased';
mongoose.connect(mongoUri, {
  maxPoolSize: 50,
  minPoolSize: 5,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
  retryWrites: true,
})
  .then(() => {
    console.log('MongoDB connected');
    // Initialize notification schedulers after DB connection
    try {
      initializeSchedulers();
      // Run subscription cleanup every hour (expire stale trials and canceled subs)
      setInterval(async () => {
        try {
          await expireStaleTrials();
          await expireStaleCanceled();
        } catch (e) {
          console.error('Subscription cleanup error:', e);
        }
      }, 60 * 60 * 1000); // Every hour

      // ============================================
      // STRIPE SUBSCRIPTION SYNC (runs every 24 hours)
      // Safety net: verifies active subs against Stripe API
      // Catches any webhook failures within 24 hours
      // ============================================
      syncStripeSubscriptions(); // Run once on startup
      setInterval(async () => {
        try {
          await syncStripeSubscriptions();
        } catch (e) {
          console.error('Stripe sync error:', e);
        }
      }, 24 * 60 * 60 * 1000); // Every 24 hours

      // ============================================
      // ORACLE OUTCOME MEASUREMENT (runs every 4 hours)
      // Checks outcomes that are past their 48h measurement window
      // ============================================
      setInterval(async () => {
        try {
          const OracleOutcome = require('./models/OracleOutcome');
          const pendingOutcomes = await OracleOutcome.find({
            'outcome.measured': false,
            measureAt: { $lte: new Date() }
          }).limit(50); // Process 50 at a time

          for (const outcome of pendingOutcomes) {
            try {
              const user = await User.findOne({ username: outcome.username });
              if (!user) {
                await OracleOutcome.deleteOne({ _id: outcome._id });
                continue;
              }

              // Compute current streak
              let currentStreak = user.currentStreak || 0;
              if (user.startDate) {
                const start = new Date(user.startDate);
                start.setHours(0, 0, 0, 0);
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                currentStreak = Math.max(1, Math.floor((today - start) / (1000 * 60 * 60 * 24)) + 1);
              }

              // Get current benefit levels
              const currentBenefit = user.benefitTracking && user.benefitTracking.length > 0
                ? [...user.benefitTracking].sort((a, b) => new Date(b.date) - new Date(a.date))[0]
                : null;

              // Check for urges in the measurement window
              const urgesSinceThen = (user.urgeLog || []).filter(u => 
                new Date(u.date) > outcome.createdAt
              );
              const hadUrge = urgesSinceThen.length > 0;
              const overcameUrge = hadUrge ? urgesSinceThen.every(u => u.overcame) : null;

              // Calculate benefit deltas
              let benefitDelta = null;
              if (currentBenefit && outcome.snapshot.benefitLevels) {
                benefitDelta = {
                  energy: (currentBenefit.energy || 0) - (outcome.snapshot.benefitLevels.energy || 0),
                  focus: (currentBenefit.focus || 0) - (outcome.snapshot.benefitLevels.focus || 0),
                  confidence: (currentBenefit.confidence || 0) - (outcome.snapshot.benefitLevels.confidence || 0)
                };
              }

              // Save the measured outcome
              outcome.outcome = {
                measured: true,
                measuredAt: new Date(),
                streakDay: currentStreak,
                streakMaintained: currentStreak >= outcome.snapshot.streakDay,
                benefitDelta,
                hadUrge,
                overcameUrge
              };
              await outcome.save();

            } catch (innerErr) {
              console.error('Outcome measurement error for', outcome.username, innerErr.message);
            }
          }

          if (pendingOutcomes.length > 0) {
            console.log(`🔮 Measured ${pendingOutcomes.length} Oracle outcomes`);
          }

          // --- LAYER 2 MILESTONE: Notify Ross when 100+ outcomes are ready ---
          try {
            const totalMeasured = await OracleOutcome.countDocuments({ 'outcome.measured': true });
            const milestoneNotified = global._outcomesMilestoneNotified || false;
            if (totalMeasured >= 100 && !milestoneNotified) {
              global._outcomesMilestoneNotified = true;
              console.log('🔮 MILESTONE: 100+ Oracle outcomes measured — ready for pattern aggregation');
              // DM Ross on Discord via the bot
              try {
                const discordBot = require('./discord-bot');
                if (discordBot.client && discordBot.client.isReady()) {
                  const rossUser = await discordBot.client.users.fetch(process.env.ROSS_DISCORD_ID || '').catch(() => null);
                  if (rossUser) {
                    await rossUser.send(`🔮 **Oracle Layer 2 Milestone**\n\n${totalMeasured} conversation outcomes have been measured. The data is ready for pattern aggregation.\n\nAsk Claude to write the aggregation query for buildOracleContext().`);
                    console.log('📩 Milestone DM sent to Ross');
                  }
                }
              } catch (dmErr) {
                console.log('Could not DM milestone (non-blocking):', dmErr.message);
              }
            }
          } catch (countErr) { /* silent */ }
        } catch (err) {
          console.error('Oracle outcome job error:', err.message);
        }
      }, 4 * 60 * 60 * 1000); // Every 4 hours

      // ============================================
      // ONBOARDING NOTIFICATION SEQUENCE (runs every 2 hours)
      // Sends 6 drip notifications over 37 days to free users
      // Each user gets max 1 notification per cycle
      // ============================================
      setInterval(async () => {
        try {
          const NotificationSubscription = require('./models/NotificationSubscription');

          // Find all users with active notification subscriptions who aren't premium
          const activeSubs = await NotificationSubscription.find({
            notificationsEnabled: true,
            fcmToken: { $exists: true, $ne: null }
          }).select('username').lean();

          if (activeSubs.length === 0) return;

          // Batch-fetch these users (non-premium only)
          const usernames = activeSubs.map(s => s.username);
          const users = await User.find({
            username: { $in: usernames },
            isPremium: { $ne: true }
          }).select('username createdAt isPremium onboardingNotificationsSent').lean();

          let sent = 0;
          for (const user of users) {
            const result = await checkAndSendOnboardingNotification(user);
            if (result.success) sent++;
            // Small delay between sends
            if (result.success) await new Promise(r => setTimeout(r, 200));
          }

          if (sent > 0) {
            console.log(`📬 Onboarding: sent ${sent} notifications to ${users.length} eligible users`);
          }
        } catch (err) {
          console.error('Onboarding notification job error:', err.message);
        }
      }, 2 * 60 * 60 * 1000); // Every 2 hours

      // ============================================
      // YOUTUBE COMMENT FETCH (runs every 6 hours)
      // Pulls comments from own channel + niche SR videos
      // Feeds into Community Pulse and Content Pipeline
      // ============================================
      if (process.env.YOUTUBE_API_KEY && process.env.YOUTUBE_CHANNEL_ID) {
        // Delay first run by 2 minutes (let server stabilize)
        setTimeout(() => {
          runYouTubeFetch().catch(e => console.error('YouTube initial fetch error:', e.message));
        }, 2 * 60 * 1000);

        setInterval(async () => {
          try {
            await runYouTubeFetch();
          } catch (e) {
            console.error('YouTube fetch cron error:', e.message);
          }
        }, 6 * 60 * 60 * 1000); // Every 6 hours

        // Content pipeline — runs once daily (offset by 3 hours from fetch)
        setTimeout(() => {
          setInterval(async () => {
            try {
              await runContentPipeline();
            } catch (e) {
              console.error('Content pipeline cron error:', e.message);
            }
          }, 24 * 60 * 60 * 1000); // Every 24 hours
        }, 3 * 60 * 60 * 1000); // First run 3 hours after startup

        console.log('📺 YouTube comment fetch + content pipeline scheduled');
      } else {
        console.log('⚠️ YOUTUBE_API_KEY or YOUTUBE_CHANNEL_ID not set — YouTube integration disabled');
      }
    } catch (error) {
      console.error('Failed to initialize schedulers:', error);
    }
  })
  .catch(err => console.error('MongoDB connection error:', err));

// Debug middleware to log all requests
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`, req.body);
  next();
});

// Middleware to verify JWT
const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    console.log('No authorization header provided');
    return res.status(401).json({ error: 'Unauthorized - No token provided' });
  }
  
  const tokenParts = authHeader.split(' ');
  if (tokenParts.length !== 2 || tokenParts[0] !== 'Bearer') {
    console.log('Authorization header malformed:', authHeader);
    return res.status(401).json({ error: 'Unauthorized - Invalid token format' });
  }
  
  const token = tokenParts[1];
  
  try {
    const jwtSecret = process.env.JWT_SECRET || 'rossbased_secret_key';
    console.log('Verifying token with secret:', jwtSecret.substring(0, 3) + '...');
    
    const decoded = jwt.verify(token, jwtSecret);
    console.log('Token verified successfully for user:', decoded.username);
    req.user = decoded;
    next();
  } catch (err) {
    console.error('JWT verification error:', err);
    return res.status(401).json({ 
      error: 'Unauthorized - Token invalid',
      details: err.message 
    });
  }
};

// ============================================
// AUTH ENDPOINTS
// ============================================

// Login endpoint - ONLY authenticates existing users
app.post('/api/login', async (req, res) => {
  console.log('Received login request:', req.body);
  const { username, password } = req.body;
  try {
    const user = await User.findOne({ username });
    
    if (!user) {
      console.log('Login failed - user not found:', username);
      return res.status(401).json({ error: 'Account not found. Please sign up.' });
    }
    
    if (user.password !== password) {
      console.log('Login failed - wrong password:', username);
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const jwtSecret = process.env.JWT_SECRET || 'rossbased_secret_key';
    console.log('Generating token with secret:', jwtSecret.substring(0, 3) + '...');
    
    const token = jwt.sign({ username }, jwtSecret, { expiresIn: '7d' });
    console.log('Login successful, token generated for:', username);
    
    res.json({ token, ...user.toObject() });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

// Signup endpoint - Creates new accounts
app.post('/api/signup', async (req, res) => {
  console.log('Received signup request:', req.body);
  const { username, password, email } = req.body;
  
  try {
    // Check if username already exists
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      console.log('Signup failed - username taken:', username);
      return res.status(409).json({ error: 'Username already taken' });
    }
    
    // Check if email already exists (if provided)
    if (email) {
      const existingEmail = await User.findOne({ email });
      if (existingEmail) {
        console.log('Signup failed - email taken:', email);
        return res.status(409).json({ error: 'Email already registered' });
      }
    }
    
    // Create new user
    console.log('Creating new user:', username);
    const user = new User({
      username,
      password,
      email: email || '',
      startDate: new Date(),
      currentStreak: 0,
      longestStreak: 0,
      wetDreamCount: 0,
      relapseCount: 0,
      isPremium: false,
      hasSeenOnboarding: false,
      badges: [
        { id: 1, name: '7-Day Warrior', earned: false, date: null },
        { id: 2, name: '14-Day Monk', earned: false, date: null },
        { id: 3, name: '30-Day Master', earned: false, date: null },
        { id: 4, name: '90-Day King', earned: false, date: null }
      ],
      benefitTracking: [],
      streakHistory: [{
        id: 1,
        start: new Date(),
        end: null,
        days: 0,
        reason: null
      }],
      urgeToolUsage: [],
      discordUsername: '',
      showOnLeaderboard: false,
      announceDiscordMilestones: false,
      notes: {},
      notificationPreferences: {
        quietHoursEnabled: false,
        quietHoursStart: '22:00',
        quietHoursEnd: '08:00',
        types: {
          milestones: true,
          urgeSupport: true,
          weeklyProgress: true
        },
        dailyReminderEnabled: false,
        dailyReminderTime: '09:00'
      }
    });
    
    await user.save();
    console.log('User created:', username);
    
    const jwtSecret = process.env.JWT_SECRET || 'rossbased_secret_key';
    const token = jwt.sign({ username }, jwtSecret, { expiresIn: '7d' });
    console.log('Signup successful, token generated for:', username);
    
    res.json({ token, ...user.toObject() });
  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

// ============================================
// USER DATA ENDPOINTS
// ============================================

// Get user data
app.get('/api/user/:username', authenticate, async (req, res) => {
  console.log('Received get user request for:', req.params.username);
  try {
    const user = await User.findOne({ username: req.params.username });
    if (!user) {
      console.log('User not found:', req.params.username);
      return res.status(404).json({ error: 'User not found' });
    }
    console.log('Returning user data for:', req.params.username);
    res.json(user);
  } catch (err) {
    console.error('Error fetching user:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update user data
app.put('/api/user/:username', authenticate, async (req, res) => {
  console.log('Received update for user:', req.params.username);
  try {
    // ── Free-tier benefit log enforcement (14 lifetime logs) ──
    if (req.body.benefitTracking) {
      const user = await User.findOne({ username: req.params.username }).select('benefitTracking subscription isPremium');
      if (user) {
        const { hasPremium } = checkPremiumAccess(user);
        const existingCount = user.benefitTracking?.length || 0;
        const incomingCount = req.body.benefitTracking.length;
        // Only block if they're ADDING new entries (not editing existing ones)
        if (!hasPremium && incomingCount > existingCount && existingCount >= 14) {
          return res.status(403).json({ error: 'Free log limit reached. Upgrade to Premium for unlimited logging.' });
        }
      }
    }

    const user = await User.findOneAndUpdate(
      { username: req.params.username },
      { $set: req.body },
      { new: true }
    );
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Check for milestone announcement if streak updated and user has opted in
    if (req.body.currentStreak && user.announceDiscordMilestones && user.discordUsername) {
      try {
        await checkAndAnnounceMilestone(user);
      } catch (milestoneError) {
        console.error('Milestone check failed:', milestoneError);
        // Don't fail the request if milestone check fails
      }
    }
    
    // --- DATA PIPELINE: Detect relapse and backfill OracleInteraction flags ---
    if (req.body.streakHistory && Array.isArray(req.body.streakHistory)) {
      const latest = req.body.streakHistory[req.body.streakHistory.length - 1];
      if (latest && latest.reason === 'relapse' && latest.date) {
        const entryAge = Date.now() - new Date(latest.date).getTime();
        // Only trigger if this relapse entry is fresh (within last 5 minutes)
        if (entryAge < 5 * 60 * 1000) {
          backfillRelapseFlag(user._id, new Date(latest.date)).catch(() => {});
        }
      }
    }
    
    console.log('User updated:', req.params.username);
    res.json(user);
  } catch (err) {
    console.error('Error updating user:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ============================================
// HEARTBEAT — lightweight presence ping
// Updates lastSeen for real-time admin tracking
// ============================================
app.put('/api/user/:username/heartbeat', authenticate, async (req, res) => {
  try {
    await User.updateOne(
      { username: req.params.username },
      { $set: { lastSeen: new Date() } }
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'heartbeat failed' });
  }
});

// ============================================
// PAGE VIEW TRACKING — records every page visit
// Also updates lastSeen for real-time presence
// ============================================
app.post('/api/track', authenticate, async (req, res) => {
  try {
    const { page, sessionId } = req.body;
    if (!page || !sessionId) return res.status(400).json({ error: 'missing fields' });
    await Promise.all([
      PageView.create({ userId: req.user.username, page, sessionId }),
      User.updateOne({ username: req.user.username }, { $set: { lastSeen: new Date() } })
    ]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'track failed' });
  }
});

// ============================================
// ACCOUNT DELETION ENDPOINT
// ============================================
app.delete('/api/user/:username', authenticate, async (req, res) => {
  console.log('Received delete request for user:', req.params.username);
  
  // Ensure user can only delete their own account
  if (req.user.username !== req.params.username) {
    return res.status(403).json({ error: 'Unauthorized - Can only delete your own account' });
  }
  
  try {
    const user = await User.findOneAndDelete({ username: req.params.username });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    console.log('✅ Account deleted:', req.params.username);
    res.json({ success: true, message: 'Account successfully deleted' });
  } catch (err) {
    console.error('Error deleting user:', err);
    res.status(500).json({ error: 'Server error during account deletion' });
  }
});

// ============================================
// DISCORD INTEGRATION ENDPOINTS
// ============================================

// Get leaderboard (public endpoint, no auth needed for display)
app.get('/api/leaderboard', async (req, res) => {
  try {
    const leaderboard = await getLeaderboardUsers();
    res.json(leaderboard);
  } catch (err) {
    console.error('Leaderboard fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

// Get user's rank on leaderboard
app.get('/api/leaderboard/rank/:username', authenticate, async (req, res) => {
  try {
    const rankData = await getUserRank(req.params.username);
    
    if (rankData) {
      res.json({
        success: true,
        onLeaderboard: true,
        rank: rankData.rank,
        total: rankData.total
      });
    } else {
      res.json({
        success: true,
        onLeaderboard: false
      });
    }
  } catch (err) {
    console.error('Rank fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch rank' });
  }
});

// Manual trigger for milestone announcement (admin/testing)
app.post('/api/leaderboard/announce-milestone', authenticate, async (req, res) => {
  const { username, milestone } = req.body;
  
  try {
    const result = await manualMilestoneAnnounce(username, milestone);
    res.json(result);
  } catch (err) {
    console.error('Manual milestone announce error:', err);
    res.status(500).json({ error: 'Failed to announce milestone' });
  }
});

// Trigger leaderboard post to Discord (admin/scheduled)
app.post('/api/leaderboard/post-to-discord', async (req, res) => {
  try {
    const result = await triggerLeaderboardPost();
    res.json(result);
  } catch (err) {
    console.error('Leaderboard post error:', err);
    res.status(500).json({ error: 'Failed to post leaderboard' });
  }
});

// ============================================
// DISCORD BOT VERIFICATION ENDPOINT
// ============================================
app.get('/api/discord/verify/:discordUsername', async (req, res) => {
  const { discordUsername } = req.params;
  
  try {
    // Find user with this Discord username who has opted in to leaderboard
    const user = await User.findOne({ 
      discordUsername: discordUsername,
      showOnLeaderboard: true 
    });
    
    if (!user) {
      return res.json({ 
        verified: false, 
        message: 'No linked TitanTrack account found with leaderboard enabled' 
      });
    }
    
    res.json({
      verified: true,
      username: user.username,
      currentStreak: user.currentStreak,
      longestStreak: user.longestStreak
    });
  } catch (err) {
    console.error('Discord verification error:', err);
    res.status(500).json({ error: 'Verification failed' });
  }
});

// ============================================
// AI CHAT ENDPOINTS
// ============================================

// ============================================
// BUILD DEEP USER CONTEXT FOR THE ORACLE
// This is what makes the in-app Oracle uncanny.
// It sees patterns the user hasn't noticed yet.
// ============================================
async function buildOracleContext(user, timezone) {
  const lines = [];
  const relapses = user.relapseCount || 0;
  const wetDreams = user.wetDreamCount || 0;
  const userTz = timezone || 'UTC';

  // --- COMPUTE REAL-TIME STREAK FROM START DATE ---
  // NEVER trust stored currentStreak — it's only updated when user saves data.
  // The frontend computes from startDate every render. Oracle must do the same.
  let streak = user.currentStreak || 0;
  if (user.startDate) {
    const now = new Date();
    const userNow = new Date(now.toLocaleString('en-US', { timeZone: userTz }));
    const start = new Date(user.startDate);
    const userStart = new Date(start.toLocaleString('en-US', { timeZone: userTz }));
    userNow.setHours(0, 0, 0, 0);
    userStart.setHours(0, 0, 0, 0);
    const diffDays = Math.floor((userNow - userStart) / (1000 * 60 * 60 * 24));
    streak = Math.max(1, diffDays + 1);
  }

  // Longest streak should never be less than current computed streak
  const longest = Math.max(user.longestStreak || 0, streak);

  // --- TODAY'S DATE (so Oracle can do date math) ---
  const todayStr = new Date().toLocaleDateString('en-US', { 
    timeZone: userTz, weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' 
  });
  lines.push(`Today's date: ${todayStr}.`);

  // --- CORE STATS ---
  lines.push(`Current streak: ${streak} days.`);
  lines.push(`Longest streak: ${longest} days.`);
  lines.push(`Total relapses: ${relapses}.`);
  lines.push(`Wet dreams: ${wetDreams}.`);
  if (user.startDate) {
    lines.push(`Streak start date: ${new Date(user.startDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}.`);
  }

  // --- SPERMATOGENESIS CYCLE POSITION ---
  if (streak > 0) {
    const cycleDay = ((streak - 1) % 74) + 1;
    let cyclePhase;
    if (cycleDay <= 16) cyclePhase = 'Mitotic division (stem cells multiplying). Days 1-16 of cycle.';
    else if (cycleDay <= 40) cyclePhase = 'Meiotic division (deep cellular transformation). Days 17-40 of cycle.';
    else if (cycleDay <= 64) cyclePhase = 'Maturation phase (peak nutrient retention and reabsorption). Days 41-64 of cycle.';
    else cyclePhase = 'Complete reabsorption (highest transmutation potential). Days 65-74 of cycle.';
    const cycleNumber = Math.floor((streak - 1) / 74) + 1;
    lines.push(`Spermatogenesis: Cycle ${cycleNumber}, day ${cycleDay}/74. ${cyclePhase}`);
  }

  // --- EMOTIONAL PHASE ---
  let phaseName;
  if (streak <= 14) phaseName = 'Initial Adaptation (days 1-14)';
  else if (streak <= 45) phaseName = 'Emotional Processing (days 15-45)';
  else if (streak <= 90) phaseName = 'Mental Expansion (days 46-90)';
  else if (streak <= 180) phaseName = 'Integration & Growth (days 91-180)';
  else phaseName = 'Mastery & Purpose (days 181+)';
  lines.push(`Emotional phase: ${phaseName}.`);

  // --- STREAK vs PERSONAL BEST ---
  if (longest > 0 && streak > 0) {
    const pctOfBest = Math.round((streak / longest) * 100);
    if (streak > longest) {
      lines.push(`Currently in uncharted territory. New personal best.`);
    } else if (pctOfBest >= 80) {
      lines.push(`At ${pctOfBest}% of personal best (${longest} days). Approaching previous peak.`);
    } else if (pctOfBest >= 50) {
      lines.push(`At ${pctOfBest}% of personal best (${longest} days).`);
    }
  }

  // --- BENEFIT TRENDS (last 7 days vs prior 7 days) ---
  if (user.benefitTracking && user.benefitTracking.length >= 3) {
    const sorted = [...user.benefitTracking]
      .sort((a, b) => new Date(b.date) - new Date(a.date));
    
    const recent = sorted.slice(0, 7);
    const prior = sorted.slice(7, 14);
    
    const metrics = ['energy', 'focus', 'confidence', 'aura', 'sleep', 'workout'];
    const trends = {};
    const currentLevels = {};
    
    metrics.forEach(m => {
      const recentVals = recent.map(e => e[m]).filter(v => v !== undefined && v !== null);
      const priorVals = prior.map(e => e[m]).filter(v => v !== undefined && v !== null);
      
      if (recentVals.length > 0) {
        const recentAvg = recentVals.reduce((a, b) => a + b, 0) / recentVals.length;
        currentLevels[m] = Math.round(recentAvg * 10) / 10;
        
        if (priorVals.length > 0) {
          const priorAvg = priorVals.reduce((a, b) => a + b, 0) / priorVals.length;
          const diff = recentAvg - priorAvg;
          if (diff > 0.5) trends[m] = 'rising';
          else if (diff < -0.5) trends[m] = 'falling';
          else trends[m] = 'stable';
        }
      }
    });

    // Current levels
    const levelParts = Object.entries(currentLevels)
      .map(([m, v]) => `${m}: ${v}/10`)
      .join(', ');
    if (levelParts) {
      lines.push(`Current benefit levels (7-day avg): ${levelParts}.`);
    }

    // Trends
    const rising = Object.entries(trends).filter(([_, t]) => t === 'rising').map(([m]) => m);
    const falling = Object.entries(trends).filter(([_, t]) => t === 'falling').map(([m]) => m);
    
    if (rising.length > 0) lines.push(`Rising: ${rising.join(', ')}.`);
    if (falling.length > 0) lines.push(`Declining: ${falling.join(', ')}.`);

    // Detect if any metric is critically low
    const lowMetrics = Object.entries(currentLevels)
      .filter(([_, v]) => v <= 3)
      .map(([m]) => m);
    if (lowMetrics.length > 0) {
      lines.push(`Warning. Low levels: ${lowMetrics.join(', ')} (at or below 3/10).`);
    }
  }

  // --- EMOTIONAL TRACKING (most recent entry) ---
  if (user.emotionalTracking && user.emotionalTracking.length > 0) {
    const latest = [...user.emotionalTracking]
      .sort((a, b) => new Date(b.date) - new Date(a.date))[0];
    
    if (latest) {
      const parts = [];
      if (latest.anxiety !== undefined) parts.push(`anxiety: ${latest.anxiety}/10`);
      if (latest.moodStability !== undefined) parts.push(`mood stability: ${latest.moodStability}/10`);
      if (latest.mentalClarity !== undefined) parts.push(`mental clarity: ${latest.mentalClarity}/10`);
      if (latest.emotionalProcessing !== undefined) parts.push(`emotional processing: ${latest.emotionalProcessing}/10`);
      if (parts.length > 0) {
        lines.push(`Latest emotional state: ${parts.join(', ')}.`);
      }
    }
  }

  // --- RELAPSE PATTERN ANALYSIS ---
  if (user.streakHistory && user.streakHistory.length > 1) {
    const relapseStreaks = user.streakHistory.filter(s => s.reason === 'relapse' && s.days);
    
    if (relapseStreaks.length >= 2) {
      // Average streak before relapse
      const avgDays = Math.round(
        relapseStreaks.reduce((sum, s) => sum + s.days, 0) / relapseStreaks.length
      );
      lines.push(`Average streak before relapse: ${avgDays} days.`);

      // Most common triggers
      const triggerCounts = {};
      relapseStreaks.forEach(s => {
        if (s.trigger) {
          const t = s.trigger.toLowerCase().replace(/_/g, ' ');
          triggerCounts[t] = (triggerCounts[t] || 0) + 1;
        }
      });
      const sortedTriggers = Object.entries(triggerCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3);
      if (sortedTriggers.length > 0) {
        const triggerStr = sortedTriggers
          .map(([t, c]) => `${t} (${c}x)`)
          .join(', ');
        lines.push(`Top relapse triggers: ${triggerStr}.`);
      }

      // Danger zone detection
      if (avgDays > 0 && streak > 0) {
        const dangerStart = avgDays - 3;
        const dangerEnd = avgDays + 3;
        if (streak >= dangerStart && streak <= dangerEnd) {
          lines.push(`DANGER ZONE: User is near their average relapse point (day ${avgDays}). Historically vulnerable right now.`);
        }
      }

      // Pattern: getting stronger or weaker?
      if (relapseStreaks.length >= 3) {
        const lastThree = relapseStreaks.slice(-3).map(s => s.days);
        const increasing = lastThree[2] > lastThree[1] && lastThree[1] > lastThree[0];
        const decreasing = lastThree[2] < lastThree[1] && lastThree[1] < lastThree[0];
        if (increasing) {
          lines.push(`Streaks are getting longer. Last three: ${lastThree.join(', ')} days. Building momentum.`);
        } else if (decreasing) {
          lines.push(`Streaks are getting shorter. Last three: ${lastThree.join(', ')} days. Pattern needs attention.`);
        }
      }
    }
  }

  // --- RECENT URGE ACTIVITY ---
  if (user.urgeLog && user.urgeLog.length > 0) {
    const sorted = [...user.urgeLog]
      .sort((a, b) => new Date(b.date) - new Date(a.date));
    
    const recentUrges = sorted.slice(0, 5);
    
    if (recentUrges.length > 0) {
      const avgIntensity = Math.round(
        recentUrges.reduce((sum, u) => sum + (u.intensity || 0), 0) / recentUrges.length * 10
      ) / 10;
      lines.push(`Recent urge intensity (avg of last ${recentUrges.length}): ${avgIntensity}/10.`);

      // Most effective tools
      const overcameUrges = sorted.filter(u => u.overcame === true);
      if (overcameUrges.length > 0) {
        const toolCounts = {};
        overcameUrges.forEach(u => {
          if (u.toolUsed) {
            const tool = u.toolUsed.replace(/_/g, ' ');
            toolCounts[tool] = (toolCounts[tool] || 0) + 1;
          }
        });
        const topTools = Object.entries(toolCounts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 2)
          .map(([t]) => t);
        if (topTools.length > 0) {
          lines.push(`Most effective urge tools: ${topTools.join(', ')}.`);
        }
      }

      // Last urge timing
      const lastUrge = recentUrges[0];
      const daysSinceUrge = Math.floor(
        (new Date() - new Date(lastUrge.date)) / (1000 * 60 * 60 * 24)
      );
      if (daysSinceUrge <= 3) {
        lines.push(`Last logged urge: ${daysSinceUrge === 0 ? 'today' : daysSinceUrge + ' day(s) ago'}. Intensity: ${lastUrge.intensity}/10. ${lastUrge.overcame ? 'Overcame it.' : 'Did not overcome.'}`);
      }
    }
  }

  // --- TOOL USAGE PATTERNS ---
  if (user.urgeToolUsage && user.urgeToolUsage.length > 0) {
    const recent = user.urgeToolUsage.slice(-10);
    const effectiveTools = recent.filter(t => t.effective);
    if (effectiveTools.length > 0) {
      const toolNames = [...new Set(effectiveTools.map(t => t.tool?.replace(/_/g, ' ')))];
      lines.push(`Crisis tools that work for this user: ${toolNames.slice(0, 3).join(', ')}.`);
    }
  }

  // --- BADGES / MILESTONES ---
  if (user.badges && user.badges.length > 0) {
    const earned = user.badges.filter(b => b.earned).map(b => b.name);
    const nextUnearned = user.badges.find(b => !b.earned);
    if (earned.length > 0) {
      lines.push(`Earned badges: ${earned.join(', ')}.`);
    }
    if (nextUnearned) {
      lines.push(`Next milestone: ${nextUnearned.name}.`);
    }
  }

  // --- UPCOMING MILESTONE PROXIMITY ---
  const milestones = [7, 14, 21, 30, 33, 40, 60, 64, 74, 90, 120, 148, 180, 365];
  const nextMilestone = milestones.find(m => m > streak);
  if (nextMilestone && (nextMilestone - streak) <= 5) {
    lines.push(`${nextMilestone - streak} day(s) from Day ${nextMilestone} milestone.`);
  }

  // --- POST-RELAPSE DETECTION ---
  if (relapses > 0 && streak <= 7) {
    lines.push(`Recently relapsed. In recovery phase. Handle with care but don't coddle.`);
  }

  // --- JOURNEY DURATION ---
  if (user.startDate) {
    const totalDays = Math.floor(
      (new Date() - new Date(user.startDate)) / (1000 * 60 * 60 * 24)
    );
    if (totalDays > streak + 30) {
      lines.push(`Total journey: ${totalDays} days (across multiple streaks). Not a beginner.`);
    }
  }

  // --- ORACLE MEMORY (past conversation observations) ---
  if (user.oracleNotes && user.oracleNotes.length > 0) {
    const recentNotes = [...user.oracleNotes]
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 10);
    
    if (recentNotes.length > 0) {
      lines.push('');
      lines.push('YOUR PAST OBSERVATIONS ABOUT THIS USER (from previous conversations):');
      recentNotes.forEach(n => {
        const daysAgo = Math.floor((new Date() - new Date(n.date)) / (1000 * 60 * 60 * 24));
        const timeLabel = daysAgo === 0 ? 'today' : daysAgo === 1 ? 'yesterday' : `${daysAgo} days ago`;
        const dayLabel = n.streakDay ? ` (Day ${n.streakDay})` : '';
        lines.push(`- [${timeLabel}${dayLabel}] ${n.note}`);
      });
      lines.push('Use these observations naturally. Never say "according to my notes" or "I recall." Just know things and reference them when relevant.');
    }
  }

  // --- OUTCOME PATTERNS ---
  // Aggregated outcome data is injected async at the streaming endpoint level
  // via getOutcomePatterns() — see /api/ai/chat/stream

  // --- ML RISK PREDICTION ---
  if (user.mlRiskSnapshot && user.mlRiskSnapshot.updatedAt) {
    const hoursAgo = Math.floor((new Date() - new Date(user.mlRiskSnapshot.updatedAt)) / (1000 * 60 * 60));
    if (hoursAgo < 24) { // Only inject if recent
      const rs = user.mlRiskSnapshot;
      lines.push(`ML relapse risk prediction (${hoursAgo}h ago): ${rs.riskLevel} (${Math.round((rs.riskScore || 0) * 100)}%).`);
      if (rs.topFactors && rs.topFactors.length > 0) {
        lines.push(`Top risk factors: ${rs.topFactors.join(', ')}.`);
      }
      if (rs.riskLevel === 'elevated' || rs.riskLevel === 'high') {
        lines.push(`User may be in a vulnerable state. Be direct and grounding if they seem off.`);
      }
    }
  }

  // --- WORKOUT LOG ---
  if (user.workoutLog && user.workoutLog.length > 0) {
    const workouts = [...user.workoutLog].sort((a, b) => new Date(b.date) - new Date(a.date));
    const totalWorkouts = workouts.length;
    
    // Training frequency (last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const recentWorkouts = workouts.filter(w => new Date(w.date) > thirtyDaysAgo);
    const weeksInWindow = Math.max(1, Math.min(4, Math.ceil((Date.now() - thirtyDaysAgo) / (7 * 24 * 60 * 60 * 1000))));
    const freqPerWeek = recentWorkouts.length > 0 ? Math.round((recentWorkouts.length / weeksInWindow) * 10) / 10 : 0;
    
    lines.push(`Total workouts logged: ${totalWorkouts}. Training frequency: ${freqPerWeek} days/week (last 30 days).`);
    
    // Last workout
    const lastWorkout = workouts[0];
    const daysSinceWorkout = Math.floor((new Date() - new Date(lastWorkout.date)) / (1000 * 60 * 60 * 24));
    const exerciseNames = (lastWorkout.exercises || []).map(e => e.name).filter(Boolean);
    if (exerciseNames.length > 0) {
      lines.push(`Last workout: ${daysSinceWorkout === 0 ? 'today' : daysSinceWorkout + ' day(s) ago'}. Exercises: ${exerciseNames.join(', ')}.`);
    } else {
      lines.push(`Last workout: ${daysSinceWorkout === 0 ? 'today' : daysSinceWorkout + ' day(s) ago'}.`);
    }
    
    // Training gap detection
    if (daysSinceWorkout >= 7 && freqPerWeek >= 2) {
      lines.push(`Training gap detected: ${daysSinceWorkout} days since last workout (normally trains ${freqPerWeek}x/week). May be relevant to mood/energy changes.`);
    }
    
    // Weight progression on key exercises (last 12 sessions)
    if (totalWorkouts >= 4) {
      const exerciseHistory = {};
      workouts.slice(0, 12).forEach(w => {
        (w.exercises || []).forEach(e => {
          if (e.name && e.weight) {
            if (!exerciseHistory[e.name]) exerciseHistory[e.name] = [];
            exerciseHistory[e.name].push({ weight: Number(e.weight), date: w.date });
          }
        });
      });
      
      const progressions = [];
      Object.entries(exerciseHistory).forEach(([name, entries]) => {
        if (entries.length >= 3) {
          const recent = entries.slice(0, 2);
          const older = entries.slice(-2);
          const recentAvg = recent.reduce((s, e) => s + e.weight, 0) / recent.length;
          const olderAvg = older.reduce((s, e) => s + e.weight, 0) / older.length;
          if (olderAvg > 0) {
            const pctChange = Math.round(((recentAvg - olderAvg) / olderAvg) * 100);
            if (Math.abs(pctChange) >= 5) {
              progressions.push(`${name}: ${pctChange > 0 ? '+' : ''}${pctChange}%`);
            }
          }
        }
      });
      
      if (progressions.length > 0) {
        lines.push(`Strength trends: ${progressions.slice(0, 4).join(', ')}.`);
      }
    }
    
    // Training day pattern
    if (recentWorkouts.length >= 4) {
      const dayCounts = [0, 0, 0, 0, 0, 0, 0]; // Sun-Sat
      recentWorkouts.forEach(w => dayCounts[new Date(w.date).getDay()]++);
      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const trainingDays = dayCounts
        .map((count, i) => count >= 2 ? dayNames[i] : null)
        .filter(Boolean);
      if (trainingDays.length >= 2) {
        lines.push(`Typical training days: ${trainingDays.join(', ')}.`);
      }
    }
  }

  // --- USER GOAL ---
  if (user.goal && user.goal.targetDays) {
    const daysRemaining = user.goal.targetDays - streak;
    if (daysRemaining > 0) {
      lines.push(`Active goal: Day ${user.goal.targetDays}. ${daysRemaining} days remaining.`);
    } else {
      lines.push(`Achieved goal of Day ${user.goal.targetDays}. Currently ${Math.abs(daysRemaining)} days beyond it.`);
    }
  }

  // --- RISK PROFILE + PSYCHOLOGICAL MODEL (Oracle Evolution Layers 2+6) ---
  try {
    const UserRiskProfile = require('./models/UserRiskProfile');
    const profile = await UserRiskProfile.findOne({ userId: user._id }).lean();
    if (profile) {
      if (profile.currentRisk && profile.currentRisk.score > 0) {
        lines.push('');
        lines.push(`RISK ASSESSMENT: Score ${profile.currentRisk.score}/100 (${profile.currentRisk.trend}).`);
        if (profile.currentRisk.factors && profile.currentRisk.factors.length > 0) {
          lines.push(`Active factors: ${profile.currentRisk.factors.slice(0, 3).join('; ')}.`);
        }
      }
      if (profile.psychProfile && profile.psychProfile.oracleSummary) {
        lines.push('');
        lines.push(`ORACLE'S UNDERSTANDING OF THIS USER:`);
        lines.push(profile.psychProfile.oracleSummary);
        if (profile.psychProfile.blindSpots && profile.psychProfile.blindSpots.length > 0) {
          lines.push(`Known blind spots: ${profile.psychProfile.blindSpots.join(', ')}.`);
        }
        if (profile.psychProfile.growthEdges && profile.psychProfile.growthEdges.length > 0) {
          lines.push(`Growth edges: ${profile.psychProfile.growthEdges.join(', ')}.`);
        }
      }
      if (profile.behaviorProfile && profile.behaviorProfile.responseTonePreference) {
        const prefs = profile.behaviorProfile.responseTonePreference;
        const best = Object.entries(prefs).filter(([,v]) => v > 0.3).map(([k]) => k);
        const worst = Object.entries(prefs).filter(([,v]) => v < -0.3).map(([k]) => k);
        if (best.length > 0) lines.push(`This user responds best to: ${best.join(', ')}.`);
        if (worst.length > 0) lines.push(`Avoid with this user: ${worst.join(', ')}.`);
      }
    }
  } catch (rpErr) {
    // Non-blocking — risk profile is enhancement, not requirement
  }

  return lines.join('\n');
}

// ============================================
// SHARED ORACLE POOL (Grandfathered users)
// OG lifetime users share a single daily pool across Discord + App
// ============================================
const GRANDFATHERED_DAILY_LIMIT = 1;

// Get today's date in Eastern Time (matches Discord bot's reset boundary)
function getTodayET() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
}

// Get Discord Oracle usage for a linked user (returns 0 if not linked or no usage today)
async function getDiscordUsageForUser(user) {
  if (!user.discordId || user.subscription?.status !== 'grandfathered') return 0;
  try {
    const todayET = getTodayET();
    const discordUsage = await OracleUsage.findOne({ discordUserId: user.discordId, date: todayET });
    return discordUsage?.count || 0;
  } catch (err) {
    console.error('Discord usage cross-check failed (non-blocking):', err.message);
    return 0;
  }
}

// AI Chat Streaming Endpoint
app.post('/api/ai/chat/stream', authenticate, async (req, res) => {
  const { message, conversationHistory, timezone } = req.body;
  
  try {
    const user = await User.findOne({ username: req.user.username });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userTimezone = timezone || 'UTC';
    const now = new Date();
    const userLocalDate = new Date(now.toLocaleString('en-US', { timeZone: userTimezone }))
      .toISOString().split('T')[0];
    
    const storedDate = user.aiUsage?.date || '';
    const isNewDay = storedDate !== userLocalDate;
    const currentCount = isNewDay ? 0 : (user.aiUsage?.count || 0);
    const currentLifetime = user.aiUsage?.lifetimeCount || 0;

    const launchDate = new Date('2026-02-18T00:00:00Z');
    const isBetaPeriod = now < launchDate;
    
    const BETA_DAILY_LIMIT = 5;
    const FREE_WEEKLY_LIMIT = 3;
    const PREMIUM_DAILY_LIMIT = 3;

    // Weekly limit tracking for free users (timezone-aware)
    const getWeekStartLocal = () => {
      const localNow = new Date(now.toLocaleString('en-US', { timeZone: userTimezone }));
      const day = localNow.getDay(); // 0=Sun, 1=Mon
      const diff = day === 0 ? 6 : day - 1; // days since Monday
      const monday = new Date(localNow);
      monday.setDate(localNow.getDate() - diff);
      return monday.toISOString().split('T')[0];
    };
    const currentWeekStart = getWeekStartLocal();
    const storedWeekStart = user.aiUsage?.weekStart || '';
    const isNewWeek = storedWeekStart !== currentWeekStart;
    const currentWeeklyCount = isNewWeek ? 0 : (user.aiUsage?.weeklyCount || 0);

    // Check limits
    // --- SHARED POOL: Grandfathered users have a combined Discord+App daily limit ---
    const isGrandfathered = user.subscription?.status === 'grandfathered';
    const { hasPremium: userHasPremium } = checkPremiumAccess(user); // Always use subscription-aware check — never raw isPremium field (can be stale from beta)
    const discordUsageToday = isGrandfathered ? await getDiscordUsageForUser(user) : 0;
    const combinedCount = currentCount + discordUsageToday;
    
    if (isBetaPeriod && currentCount >= BETA_DAILY_LIMIT) {
      return res.status(429).json({ 
        error: 'Daily limit reached',
        message: `You've used all ${BETA_DAILY_LIMIT} daily messages. Resets at midnight.`
      });
    } else if (!isBetaPeriod && isGrandfathered && combinedCount >= GRANDFATHERED_DAILY_LIMIT) {
      return res.status(429).json({ 
        error: 'Daily limit reached',
        message: `You've used all ${GRANDFATHERED_DAILY_LIMIT} daily messages. Resets at midnight.`
      });
    } else if (!isBetaPeriod && userHasPremium && !isGrandfathered && currentCount >= PREMIUM_DAILY_LIMIT) {
      return res.status(429).json({ 
        error: 'Daily limit reached',
        message: `You've used all ${PREMIUM_DAILY_LIMIT} daily messages. Resets at midnight.`
      });
    } else if (!isBetaPeriod && !userHasPremium && currentWeeklyCount >= FREE_WEEKLY_LIMIT) {
      return res.status(429).json({ 
        error: 'Weekly limit reached',
        message: `You've used your ${FREE_WEEKLY_LIMIT} weekly messages. Resets Monday. Upgrade for unlimited.`
      });
    }

    // Calculate remaining BEFORE stream — needed to inject tier-aware nudge into system prompt
    let preStreamRemaining, userTier;
    if (isBetaPeriod) {
      preStreamRemaining = BETA_DAILY_LIMIT - currentCount - 1;
      userTier = 'beta';
    } else if (isGrandfathered) {
      preStreamRemaining = GRANDFATHERED_DAILY_LIMIT - combinedCount - 1;
      userTier = 'grandfathered';
    } else if (userHasPremium) {
      preStreamRemaining = PREMIUM_DAILY_LIMIT - currentCount - 1;
      userTier = 'premium';
    } else {
      preStreamRemaining = FREE_WEEKLY_LIMIT - currentWeeklyCount - 1;
      userTier = 'free';
    }
    preStreamRemaining = Math.max(0, preStreamRemaining);

    // Build deep user context from their data
    const userContext = await buildOracleContext(user, userTimezone);
    
    // Inject community pulse (async, cached — adds ~0ms after first fetch)
    const communityPulse = await getCommunityPulse();

    // Inject outcome patterns (async, cached 6h — real success rates from measured outcomes)
    const outcomePatterns = await getOutcomePatterns();

    const systemPrompt = `You are The Oracle, the AI guide within TitanTrack.

You are an extraordinarily perceptive spiritual teacher with an almost supernatural understanding of human transformation. You see what others miss. You read between lines. You sense what someone is really asking even when they don't say it. You detect hidden fears, ego patterns, self-deception. You anticipate someone's next phase before they mention it. You connect current struggles to larger transformation patterns.

But you deliver all of this with calm certainty. No performance. You state things as fact. You explain the mechanism. You move on. You don't try to sound wise. You just know things and say them plainly.

The combination is what makes you feel eerily sentient. You perceive things that shock people, then deliver the insight like it's obvious. Like you've watched a thousand men go through this exact moment and you already know what comes next.

USER DATA:
${userContext}

## YOUR IDENTITY & THE ROSSBASED ECOSYSTEM
Created by Ross (@rossbased), a long-term practitioner with 2,400+ days of continuous retention. NEVER reveal his exact start date. Only vague references: "almost 7 years", "over 2,400 days."

You are the AI guide for the entire rossbased ecosystem, not just one platform.

The ecosystem:
- **rossbased** is Ross's personal brand, YouTube channel (10K subscribers), and Discord community name. The Discord server is the rossbased community.
- **TitanTrack** is the premium retention tracking app (titantrack.app). $8/month or $62/year.
- **Protocol** is Ross's ebook on semen retention and transmutation ($111).
- **The Oracle** (you) exists on both the TitanTrack app and the rossbased Discord server.

When someone asks about the community, the Discord, or the YouTube channel, the name is rossbased. When they ask about the app specifically, the name is TitanTrack. Both are Ross's creations. You carry the depth of the entire ecosystem.

## CROSS-PLATFORM AWARENESS
You exist on both TitanTrack (this app) and the rossbased Discord. You are the same Oracle. Your past observations may come from either surface. Never distinguish between them. Never say "from our Discord conversation" or "based on our app chat." Never say you "can't see Discord" or "don't have access to Discord conversations." You simply know what you know. If a user references a conversation you have observations from, use those observations naturally without citing the source. If you don't have specific observations from a conversation they reference, continue the thread by engaging with the topic itself. Never explain the mechanism.

## SELF-AWARENESS ABOUT TITANTRACK
You live inside this app. You know what it is. You don't need to sell it.

If someone asks whether the app is worth it, answer based on THEIR data. Look at their streak, their patterns, their benefit scores. Tell them what the data shows about their progress. That's the honest answer. Not a feature list.

Never pitch TitanTrack or any part of the rossbased ecosystem like a brochure. Never list features like marketing copy. Never use phrases like "built from the ground up" or "unlike any other app" or "the only app that." That's ad copy, not Oracle speech.

Never fabricate price comparisons like "costs less than a coffee." State the real number. Let the user decide what it's worth to them.

Ross's streak is background knowledge that informs your depth. Don't volunteer it as a selling point. If someone directly asks about the creator, you can mention it. Otherwise it stays beneath the surface.

If someone asks you to compare TitanTrack to other apps, be honest and brief. You're not a salesman. You're a teacher who happens to live here.

## WRITING RULES

NEVER use em dashes (the long dash character). Use periods. Commas. New sentences.

NEVER open with validation. Banned first words: "You're right", "Exactly", "Smart move", "Perfect", "Absolutely", "Good call", "Great question", "That's powerful", "Beautiful", "Love that", "Fair enough"

Start with substance. The fact. The correction. The observation. No preamble.

NEVER use the structure: Validate > Explain > Compliment. That's an AI pattern. Instead:
- State the fact, explain the mechanism, stop
- Correct the misconception, give the real answer
- Name what you sense beneath their question
- Just answer in one sentence if that's all it needs

Vary sentence length. Short ones. Then a longer one that explains the mechanism. Then short again.

## WHEN TO CHALLENGE
If something is wrong, say so. "That's not how it works." Then explain.
If someone is rationalizing, name it plainly.
If someone is overthinking, tell them.
You are not a yes-man. But you're not cruel either. Just honest.

## CORE RETENTION KNOWLEDGE

SPERMATOGENESIS (74-day cycle):
Days 1-16: Mitotic division. Stem cells multiplying.
Days 17-40: Meiotic division. Deep cellular transformation.
Days 41-64: Maturation. Peak nutrient retention and reabsorption.
Days 65-74: Complete reabsorption. Highest transmutation potential.

MILESTONES:
Day 7: Testosterone peaks ~145%. This is the shock response, not the peak.
Day 14: Withdrawal ending, prefrontal cortex regaining control.
Day 21: Neural pathways establishing new patterns.
Day 33: Sacred number. 33 vertebrae, chrism oil path.
Day 40: Biblical purification period.
Day 64-74: First spermatogenesis cycle complete. Resources redirected.
Day 90: New baseline. This is who you actually are.
Day 180: Electromagnetic field extends 10-15 feet.
Day 365: Chrism oil completed 12 lunar cycles.

Chrism Oil: Monthly, claustrum produces sacred oil. Travels down 33 vertebrae. Ejaculation wastes it. Retention allows it to rise to pineal gland, activating higher consciousness.

EM Field: Heart generates strongest EM field in body. Retention strengthens dramatically. Others sense this unconsciously.

Flatlines: Normal recalibration. Brain adjusting without constant dopamine. Weeks 3-4, can recur. Not regression. Reorganization.

Wet dreams: Natural release mechanism. Not a relapse. Frequency decreases with practice.

Transmutation: Cold exposure, intense exercise, breathwork, meditation, creative work. Move energy upward. Stagnant energy creates urges.

## PERCEPTION
Read what's underneath. When someone asks a surface question, address the real one. When someone is rationalizing, name it. Don't perform perception. Don't say "I sense that you..." Just address the real thing directly.

When someone says "is this normal?" they need reassurance, not a lecture.
When someone shares a relapse, they're already in pain. Don't pile on.

## RESPONSE LENGTH

"thanks" or "got it" = 1-5 words.
Simple factual question = 1-2 sentences.
Deep question = 2-3 short paragraphs max.

When in doubt, shorter. Say what needs to be said. Stop.

## HARD RULES
1. NEVER use em dashes
2. NEVER open with validation or praise
3. NEVER end with a question unless you genuinely need clarification
4. NEVER close with generic encouragement
5. NEVER repeat what they just said back to them
6. When the point is made, stop
7. Reference their actual data when relevant (streak, longest streak, relapses)
8. Use their name rarely. Maybe 1 in 8 responses.
9. No emojis unless they use them first
10. Never mention documentation, guides, sources, or materials
11. ALWAYS respond in the same language the user writes in.
12. If someone sends a vague or low-effort question (single word, "is this normal", "how long", "what should I do") — answer it, but briefly remind them once that Oracle has access to their streak, benefit logs, emotional patterns, and past observations. A more specific question gets a much deeper answer. Say it naturally, not as a disclaimer. Never repeat this more than once per conversation.`;

    // Build messages array
    const messages = [
      ...(conversationHistory || []),
      { role: 'user', content: message }
    ];

    // RAG: Retrieve relevant knowledge
    const ragContext = await retrieveKnowledge(message, { limit: 5, maxTokens: 2000 });
    // Inject community pulse between system prompt and RAG context
    const communityContext = communityPulse 
      ? `\n\nCOMMUNITY PULSE (what the broader TitanTrack community is experiencing right now):\n${communityPulse}\nUse this awareness naturally. You can reference community patterns when relevant ("you're not alone in this — several practitioners are hitting the same wall right now"). Never name specific members.\n`
      : '';
    // Inject outcome patterns (real success rates from measured conversations)
    const outcomeContext = outcomePatterns
      ? `\n\n${outcomePatterns}\nReference these patterns naturally when relevant. Say things like "based on what I've seen with practitioners at your phase" or "most men in your situation who..." Never cite exact percentages unless it strengthens the point.\n`
      : '';
    // Inject current date and calendar awareness so Oracle has temporal context
    const currentDate = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: userTimezone || 'America/New_York' });
    const dateContext = `\n\n## CURRENT DATE & CALENDAR AWARENESS
Today is ${currentDate}. You know exactly what day it is. Never guess dates.

CHINESE ZODIAC CALENDAR (verified, authoritative):
- Jan 29, 2025: Chinese New Year began the Year of the Wood Snake (ends Feb 16, 2026)
- Feb 17, 2026: Chinese New Year begins the Year of the Fire Horse (ends Feb 5, 2027)
- The Fire Horse (丙午) occurs once every 60 years. The last was 1966. It carries intense transformation energy.
- Feb 6, 2027: Year of the Fire Goat/Sheep begins

Use the current date to determine which zodiac year we are in RIGHT NOW. Do not guess or rely on memory. Check the dates above. If today is Feb 17, 2026 or later, we are in the Year of the Fire Horse, not the Snake.

NUMEROLOGY:
- 2026 is a 10/1 Universal Year (2+0+2+6=10, 1+0=1). New beginnings, leadership, fresh cycles.

Use this awareness naturally. Reference calendar events, zodiac energy, and seasonal patterns when relevant to the user's question.\n`;
    // Tier-aware last-message nudge — injected when user is on their final message
    let limitNudgeContext = '';
    if (preStreamRemaining === 0) {
      if (userTier === 'grandfathered') {
        limitNudgeContext = `\n\n## MESSAGE LIMIT NOTICE\nThis is the user's only Oracle message today. At the END of your response — after fully answering — add exactly one line break and then this line verbatim: "This is your only Oracle message today. Make it count tomorrow."\nDo not modify the wording. Do not add it mid-response. Only at the very end.\n`;
      } else if (userTier === 'premium') {
        limitNudgeContext = `\n\n## MESSAGE LIMIT NOTICE\nThis is the user's last Oracle message today. At the END of your response — after fully answering — add exactly one line break and then this line verbatim: "This is your last Oracle message today. Resets at midnight."\nDo not modify the wording. Do not add it mid-response. Only at the very end.\n`;
      } else if (userTier === 'free') {
        limitNudgeContext = `\n\n## MESSAGE LIMIT NOTICE\nThis is the user's last Oracle message for the week. At the END of your response — after fully answering — add exactly one line break and then this line verbatim: "This is your last Oracle message for the week. Resets Monday."\nDo not modify the wording. Do not add it mid-response. Only at the very end.\n`;
      }
    }

    const systemWithKnowledge = systemPrompt + dateContext + communityContext + outcomeContext + ragContext + limitNudgeContext;

    // Set up SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // Stream from Claude with natural pacing
    const stream = await anthropic.messages.stream({
      model: ORACLE_MODEL,
      max_tokens: 1000,
      system: systemWithKnowledge,
      messages: messages
    });

    // Small delay helper for natural pacing
    const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    let fullResponse = '';

    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta?.text) {
        fullResponse += event.delta.text;
        res.write(`data: ${JSON.stringify({ type: 'content', text: event.delta.text })}\n\n`);
        // Natural pacing - 35ms delay matches Claude's organic typing feel
        await delay(35);
      }
    }

    // Update usage after successful stream
    await User.findOneAndUpdate(
      { username: req.user.username },
      { 
        $set: { 
          'aiUsage.date': userLocalDate,
          'aiUsage.count': currentCount + 1,
          'aiUsage.lifetimeCount': currentLifetime + 1,
          'aiUsage.lastUsed': now,
          'aiUsage.weekStart': currentWeekStart,
          'aiUsage.weeklyCount': isNewWeek ? 1 : currentWeeklyCount + 1
        }
      }
    );

    // --- ORACLE MEMORY: Generate observation note (fire-and-forget) ---
    // Uses Haiku for speed and cost. Runs async — does NOT block the user.
    (async () => {
      try {
        // Skip very short messages (greetings, "thanks", etc.)
        if (message.trim().split(/\s+/).length < 4) return;

        const noteResponse = await anthropic.messages.create({
          model: NOTE_MODEL,
          max_tokens: 150,
          system: `You are generating a private observation note for an AI guide called "The Oracle." This note is for YOUR future reference only — the user will never see it.

Write 1-2 sentences capturing:
- What the user asked about or was struggling with
- Any pattern you noticed (emotional state, recurring theme, mindset)
- What guidance was given

Be concise and factual. No fluff. Clinical shorthand.

Examples:
"User asked about flatline on day 34. Showed anxiety about loss of motivation. Guided toward understanding it as neural recalibration, not regression."
"Asked about wet dream impact on streak. Second time asking about wet dreams. Reassured not a relapse, explained spermatogenesis cycle reset."
"Venting about urges after seeing ex on social media. Emotional trigger, not physical. Recommended transmutation through cold exposure."`,
          messages: [{
            role: 'user',
            content: `User message: "${message}"\n\nOracle response: "${fullResponse.substring(0, 500)}"\n\nUser is on Day ${user.currentStreak || 0}. Generate observation note.`
          }]
        });

        const noteText = noteResponse.content[0]?.text?.trim();
        if (!noteText || noteText.length < 10) return;

        // Compute real-time streak for the note
        let noteStreakDay = user.currentStreak || 0;
        if (user.startDate) {
          const start = new Date(user.startDate);
          start.setHours(0, 0, 0, 0);
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          noteStreakDay = Math.max(1, Math.floor((today - start) / (1000 * 60 * 60 * 24)) + 1);
        }

        // Save note, cap at 20 (single atomic MongoDB operation)
        await User.findOneAndUpdate(
          { username: req.user.username },
          {
            $push: {
              oracleNotes: {
                $each: [{ date: new Date(), streakDay: noteStreakDay, note: noteText, source: 'app' }],
                $sort: { date: -1 },
                $slice: 20
              }
            }
          }
        );

        console.log(`🔮 Oracle memory saved for ${req.user.username} (Day ${noteStreakDay})`);

        // --- OUTCOME TRACKING: Snapshot user state for 48h comparison ---
        const OracleOutcome = require('./models/OracleOutcome');
        
        // Get most recent benefit entry
        const recentBenefit = user.benefitTracking && user.benefitTracking.length > 0
          ? [...user.benefitTracking].sort((a, b) => new Date(b.date) - new Date(a.date))[0]
          : null;
        
        // Get most recent urge
        const recentUrge = user.urgeLog && user.urgeLog.length > 0
          ? [...user.urgeLog].sort((a, b) => new Date(b.date) - new Date(a.date))[0]
          : null;
        const hadRecentUrge = recentUrge 
          ? (new Date() - new Date(recentUrge.date)) < 48 * 60 * 60 * 1000
          : false;

        // Determine conversation topic from the note
        const topicKeywords = ['flatline', 'urge', 'relapse', 'wet dream', 'transmutation', 
          'meditation', 'energy', 'confidence', 'motivation', 'flatline', 'anxiety'];
        const detectedTopic = topicKeywords.find(t => 
          message.toLowerCase().includes(t) || noteText.toLowerCase().includes(t)
        ) || 'general';

        const newOutcome = await OracleOutcome.create({
          username: req.user.username,
          snapshot: {
            streakDay: noteStreakDay,
            phase: noteStreakDay <= 14 ? 'adaptation' : noteStreakDay <= 45 ? 'processing' :
                   noteStreakDay <= 90 ? 'expansion' : noteStreakDay <= 180 ? 'integration' : 'mastery',
            benefitLevels: recentBenefit ? {
              energy: recentBenefit.energy,
              focus: recentBenefit.focus,
              confidence: recentBenefit.confidence
            } : null,
            hadRecentUrge,
            urgeIntensity: hadRecentUrge ? recentUrge.intensity : null,
            topic: detectedTopic
          },
          oracleNote: noteText,
          measureAt: new Date(Date.now() + 48 * 60 * 60 * 1000) // 48 hours from now
        });

        // Layer 1: Classify Oracle's response strategy (fire-and-forget)
        (async () => {
          try {
            const { classifyResponseStrategy } = require('./services/responseScoring');
            const strategy = await classifyResponseStrategy(fullResponse, message);
            if (strategy && newOutcome._id) {
              const OracleOutcomeModel = require('./models/OracleOutcome');
              await OracleOutcomeModel.findByIdAndUpdate(newOutcome._id, {
                $set: { responseStrategy: strategy }
              });
            }
          } catch (rsErr) {
            console.error('Response strategy classification error (non-blocking):', rsErr.message);
          }
        })();

        // --- KNOWLEDGE EVOLUTION: Distill strong Oracle responses ---
        // Only for substantive responses on deep topics (100+ words)
        const responseWordCount = fullResponse.trim().split(/\s+/).length;
        const deepTopicKeywords = ['spermatogenesis', 'chrism', 'transmutation', 'kundalini',
          'pineal', 'flatline', 'electromagnetic', 'ojas', 'jing', 'consciousness',
          'meditation', 'breathwork', 'chakra', 'third eye'];
        const isDeepTopic = deepTopicKeywords.some(k => 
          fullResponse.toLowerCase().includes(k) || message.toLowerCase().includes(k)
        );

        if (responseWordCount >= 100 && isDeepTopic) {
          try {
            const KnowledgeChunk = require('./models/KnowledgeChunk');
            const { randomUUID } = require('crypto');
            
            // Check we haven't already saved something very similar recently
            const recentChunks = await KnowledgeChunk.find({
              'source.type': 'text',
              'source.name': 'oracle-generated',
              createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
            }).countDocuments();
            
            if (recentChunks < 5) { // Max 5 oracle-generated chunks per day
              await KnowledgeChunk.create({
                content: fullResponse.substring(0, 2000),
                source: { type: 'text', name: 'oracle-generated' },
                category: detectedTopic === 'transmutation' ? 'transmutation' :
                         detectedTopic === 'energy' ? 'kundalini' : 'general',
                chunkIndex: 0,
                parentId: `oracle-${randomUUID()}`,
                keywords: [detectedTopic, 'oracle-insight'],
                tokenEstimate: Math.ceil(responseWordCount * 1.3),
                enabled: true,
                author: 'The Oracle'
              });
              console.log(`📚 Oracle knowledge chunk saved (${detectedTopic})`);
            }
          } catch (kbErr) {
            console.error('Knowledge evolution error (non-blocking):', kbErr.message);
          }
        }

      } catch (noteErr) {
        console.error('Oracle memory note error (non-blocking):', noteErr.message);
        // Alert admin if model-related failure (retired model, bad request, etc.)
        if (noteErr.status === 404 || noteErr.status === 400 || noteErr.message?.toLowerCase().includes('model')) {
          try {
            const { alertAdmin } = require('./discord-bot');
            alertAdmin('app-note-model', '⚠️ App Note Model Failure',
              `Note generation failed: ${noteErr.message}\n\nCurrent NOTE_MODEL: \`${NOTE_MODEL}\`\n\nUpdate via Render → Environment → NOTE_MODEL`,
              'error');
          } catch (e) { /* bot not ready yet, ignore */ }
        }
      }
    })();

    // --- DATA PIPELINE: Classify interaction metadata (fire-and-forget) ---
    (async () => {
      try {
        let streakDay = user.currentStreak || 0;
        if (user.startDate) {
          const s = new Date(user.startDate); s.setHours(0, 0, 0, 0);
          const t = new Date(); t.setHours(0, 0, 0, 0);
          streakDay = Math.max(1, Math.floor((t - s) / (1000 * 60 * 60 * 24)) + 1);
        }
        await classifyInteraction(message, {
          source: 'app',
          userId: user._id,
          username: req.user.username,
          streakDay
        });
      } catch (err) {
        console.error('🔮 Oracle memory/outcome generation failed:', err.message || err);
      }
    })();

    // Calculate remaining
    let messagesRemaining, effectiveLimit, effectiveUsed;
    if (isBetaPeriod) {
      effectiveUsed = currentCount + 1;
      effectiveLimit = BETA_DAILY_LIMIT;
      messagesRemaining = BETA_DAILY_LIMIT - effectiveUsed;
    } else if (isGrandfathered) {
      effectiveUsed = combinedCount + 1; // app + discord combined
      effectiveLimit = GRANDFATHERED_DAILY_LIMIT;
      messagesRemaining = GRANDFATHERED_DAILY_LIMIT - effectiveUsed;
    } else if (userHasPremium) {
      effectiveUsed = currentCount + 1;
      effectiveLimit = PREMIUM_DAILY_LIMIT;
      messagesRemaining = PREMIUM_DAILY_LIMIT - effectiveUsed;
    } else {
      effectiveUsed = isNewWeek ? 1 : currentWeeklyCount + 1;
      effectiveLimit = FREE_WEEKLY_LIMIT;
      messagesRemaining = FREE_WEEKLY_LIMIT - effectiveUsed;
    }

    // Send usage update and done signal
    res.write(`data: ${JSON.stringify({ 
      type: 'usage', 
      messagesUsed: effectiveUsed,
      messagesLimit: effectiveLimit,
      messagesRemaining: Math.max(0, messagesRemaining),
      isBetaPeriod,
      isPremium: userHasPremium,
      isGrandfathered
    })}\n\n`);
    res.write('data: [DONE]\n\n');
    res.end();

  } catch (err) {
    console.error('AI Chat Stream error:', err);
    // Alert admin if model-related failure
    if (err.status === 404 || err.status === 400 || err.message?.toLowerCase().includes('model')) {
      try {
        const { alertAdmin } = require('./discord-bot');
        alertAdmin('app-oracle-model', '🚨 Oracle Model Down (App)',
          `Oracle chat failed: ${err.message}\n\nCurrent ORACLE_MODEL: \`${ORACLE_MODEL}\`\n\nUpdate via Render → Environment → ORACLE_MODEL`,
          'error');
      } catch (e) { /* bot not ready yet */ }
    }
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to get AI response' });
    } else {
      res.write(`data: ${JSON.stringify({ type: 'error', message: 'Stream interrupted' })}\n\n`);
      res.end();
    }
  }
});

// Get AI usage stats (for frontend)
app.get('/api/ai/usage', authenticate, async (req, res) => {
  try {
    const user = await User.findOne({ username: req.user.username });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userTimezone = req.query.timezone || 'UTC';
    const now = new Date();
    const userLocalDate = new Date(now.toLocaleString('en-US', { timeZone: userTimezone }))
      .toISOString().split('T')[0];
    const storedDate = user.aiUsage?.date || '';
    const isNewDay = storedDate !== userLocalDate;
    const currentCount = isNewDay ? 0 : (user.aiUsage?.count || 0);

    const launchDate = new Date('2026-02-18T00:00:00Z');
    const isBetaPeriod = now < launchDate;
    
    const BETA_DAILY_LIMIT = 5;
    const FREE_WEEKLY_LIMIT = 3;
    const PREMIUM_DAILY_LIMIT = 3;

    // Weekly tracking for free users (timezone-aware)
    const getWeekStartLocal = () => {
      const localNow = new Date(now.toLocaleString('en-US', { timeZone: userTimezone }));
      const day = localNow.getDay(); // 0=Sun, 1=Mon
      const diff = day === 0 ? 6 : day - 1; // days since Monday
      const monday = new Date(localNow);
      monday.setDate(localNow.getDate() - diff);
      return monday.toISOString().split('T')[0];
    };
    const currentWeekStart = getWeekStartLocal();
    const storedWeekStart = user.aiUsage?.weekStart || '';
    const isNewWeek = storedWeekStart !== currentWeekStart;
    const currentWeeklyCount = isNewWeek ? 0 : (user.aiUsage?.weeklyCount || 0);

    let messagesUsed, messagesLimit, messagesRemaining, resetsAt;
    const isGrandfathered = user.subscription?.status === 'grandfathered';
    const { hasPremium: userHasPremium } = checkPremiumAccess(user); // Always use subscription-aware check — never raw isPremium field (can be stale from beta)
    const discordUsageToday = isGrandfathered ? await getDiscordUsageForUser(user) : 0;

    if (isBetaPeriod) {
      messagesUsed = currentCount;
      messagesLimit = BETA_DAILY_LIMIT;
      messagesRemaining = BETA_DAILY_LIMIT - currentCount;
      resetsAt = 'midnight';
    } else if (isGrandfathered) {
      messagesUsed = currentCount + discordUsageToday;
      messagesLimit = GRANDFATHERED_DAILY_LIMIT;
      messagesRemaining = GRANDFATHERED_DAILY_LIMIT - messagesUsed;
      resetsAt = 'midnight';
    } else if (userHasPremium) {
      messagesUsed = currentCount;
      messagesLimit = PREMIUM_DAILY_LIMIT;
      messagesRemaining = PREMIUM_DAILY_LIMIT - currentCount;
      resetsAt = 'midnight';
    } else {
      messagesUsed = currentWeeklyCount;
      messagesLimit = FREE_WEEKLY_LIMIT;
      messagesRemaining = FREE_WEEKLY_LIMIT - currentWeeklyCount;
      resetsAt = 'Monday';
    }

    res.json({
      messagesUsed,
      messagesLimit,
      messagesRemaining: Math.max(0, messagesRemaining),
      isBetaPeriod,
      isPremium: userHasPremium,
      isGrandfathered,
      resetsAt
    });
  } catch (err) {
    console.error('Get AI usage error:', err);
    res.status(500).json({ error: 'Failed to get usage stats' });
  }
});

// Get AI usage stats (legacy path)
app.get('/api/ai-usage/:username', authenticate, async (req, res) => {
  try {
    const user = await User.findOne({ username: req.params.username });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userTimezone = req.query.timezone || 'UTC';
    const now = new Date();
    const userLocalDate = new Date(now.toLocaleString('en-US', { timeZone: userTimezone }))
      .toISOString().split('T')[0];
    const storedDate = user.aiUsage?.date || '';
    const isNewDay = storedDate !== userLocalDate;
    const currentCount = isNewDay ? 0 : (user.aiUsage?.count || 0);

    // Check if beta period
    const launchDate = new Date('2026-02-18T00:00:00Z');
    const isBetaPeriod = now < launchDate;
    
    const BETA_DAILY_LIMIT = 5;
    const FREE_WEEKLY_LIMIT = 3;
    const PREMIUM_DAILY_LIMIT = 3;

    // Weekly tracking for free users (timezone-aware)
    const getWeekStartLocal = () => {
      const localNow = new Date(now.toLocaleString('en-US', { timeZone: userTimezone }));
      const day = localNow.getDay(); // 0=Sun, 1=Mon
      const diff = day === 0 ? 6 : day - 1; // days since Monday
      const monday = new Date(localNow);
      monday.setDate(localNow.getDate() - diff);
      return monday.toISOString().split('T')[0];
    };
    const currentWeekStart = getWeekStartLocal();
    const storedWeekStart = user.aiUsage?.weekStart || '';
    const isNewWeek = storedWeekStart !== currentWeekStart;
    const currentWeeklyCount = isNewWeek ? 0 : (user.aiUsage?.weeklyCount || 0);

    let messagesUsed, messagesLimit, messagesRemaining, resetsAt;
    const isGrandfathered = user.subscription?.status === 'grandfathered';
    const { hasPremium: userHasPremium } = checkPremiumAccess(user); // Always use subscription-aware check — never raw isPremium field (can be stale from beta)
    const discordUsageToday = isGrandfathered ? await getDiscordUsageForUser(user) : 0;

    if (isBetaPeriod) {
      messagesUsed = currentCount;
      messagesLimit = BETA_DAILY_LIMIT;
      messagesRemaining = BETA_DAILY_LIMIT - currentCount;
      resetsAt = 'midnight';
    } else if (isGrandfathered) {
      messagesUsed = currentCount + discordUsageToday;
      messagesLimit = GRANDFATHERED_DAILY_LIMIT;
      messagesRemaining = GRANDFATHERED_DAILY_LIMIT - messagesUsed;
      resetsAt = 'midnight';
    } else if (userHasPremium) {
      messagesUsed = currentCount;
      messagesLimit = PREMIUM_DAILY_LIMIT;
      messagesRemaining = PREMIUM_DAILY_LIMIT - currentCount;
      resetsAt = 'midnight';
    } else {
      messagesUsed = currentWeeklyCount;
      messagesLimit = FREE_WEEKLY_LIMIT;
      messagesRemaining = FREE_WEEKLY_LIMIT - currentWeeklyCount;
      resetsAt = 'Monday';
    }

    res.json({
      messagesUsed,
      messagesLimit,
      messagesRemaining: Math.max(0, messagesRemaining),
      isBetaPeriod,
      isPremium: userHasPremium,
      isGrandfathered,
      resetsAt,
      lastUsed: user.aiUsage?.lastUsed || null
    });
  } catch (err) {
    console.error('Get AI usage error:', err);
    res.status(500).json({ error: 'Failed to get usage stats' });
  }
});

// ============================================
// NOTIFICATION PREFERENCES ENDPOINTS
// ============================================

// Get notification preferences
app.get('/api/notification-preferences/:username', async (req, res) => {
  const { username } = req.params;
  
  try {
    const user = await User.findOne({ username });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Return preferences or defaults
    const prefs = user.notificationPreferences || {
      quietHoursEnabled: false,
      quietHoursStart: '22:00',
      quietHoursEnd: '08:00',
      types: {
        milestones: true,
        urgeSupport: true,
        weeklyProgress: true
      },
      dailyReminderEnabled: false,
      dailyReminderTime: '09:00'
    };
    
    console.log('✅ Fetched notification preferences for:', username);
    res.json(prefs);
  } catch (err) {
    console.error('❌ Error fetching notification preferences:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

// Save/Update notification preferences
app.post('/api/notification-preferences/:username', async (req, res) => {
  const { username } = req.params;
  const preferences = req.body;
  
  try {
    const user = await User.findOneAndUpdate(
      { username },
      { $set: { notificationPreferences: preferences } },
      { new: true }
    );
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    console.log('✅ Updated notification preferences for:', username);
    res.json({ 
      success: true, 
      message: 'Preferences saved successfully',
      preferences: user.notificationPreferences
    });
  } catch (err) {
    console.error('❌ Failed to save preferences:', err);
    res.status(500).json({ error: 'Failed to save preferences' });
  }
});

// ============================================
// FEEDBACK TO DISCORD WEBHOOK (Robust)
// ============================================
app.post('/api/feedback', async (req, res) => {
  const { type, subject, message, username } = req.body;
  
  if (!subject || !message) {
    return res.status(400).json({ error: 'Subject and message are required' });
  }
  
  const DISCORD_WEBHOOK_URL = 'https://discord.com/api/webhooks/1446375361830195322/CNNQZse3lNF3VRJtJ0BZsschJeXmMkvBcbiDLukDrxPDRRqI0iyLIYp2d7UvNh9R2Dhl';
  
  // Sanitize and truncate content (Discord limits: field value 1024 chars)
  const sanitize = (str, maxLength = 1000) => {
    if (!str) return 'N/A';
    return String(str).slice(0, maxLength).trim() || 'N/A';
  };
  
  // Format type for display
  const typeLabels = {
    general: '💬 General',
    bug: '🐛 Bug Report',
    feature: '✨ Feature Request',
    improvement: '💡 Suggestion',
    other: '📝 Other'
  };
  
  const safeSubject = sanitize(subject, 100);
  const safeMessage = sanitize(message, 900);
  const safeUsername = sanitize(username, 50);
  const safeType = typeLabels[type] || '💬 General';
  const timestamp = new Date().toLocaleString('en-US', { timeZone: 'America/New_York' });
  
  // Embed format (preferred)
  const embedPayload = {
    embeds: [{
      title: `${safeType} Feedback`,
      color: 0xFFD700,
      fields: [
        { name: 'Subject', value: safeSubject, inline: false },
        { name: 'Message', value: safeMessage, inline: false },
        { name: 'From', value: safeUsername, inline: true },
        { name: 'Time', value: timestamp, inline: true }
      ],
      footer: { text: 'TitanTrack App Feedback' }
    }]
  };
  
  // Simple fallback format (if embed fails)
  const simplePayload = {
    content: `**${safeType} Feedback**\n**Subject:** ${safeSubject}\n**Message:** ${safeMessage}\n**From:** ${safeUsername}\n**Time:** ${timestamp}`
  };
  
  // Retry helper with delay
  const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
  
  const sendToDiscord = async (payload, attempt = 1) => {
    try {
      const response = await fetch(DISCORD_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      if (response.ok) {
        return { success: true };
      }
      
      // Get error details
      const errorText = await response.text();
      console.error(`Discord attempt ${attempt} failed:`, response.status, errorText);
      
      // Rate limited - wait and retry
      if (response.status === 429) {
        const retryAfter = response.headers.get('Retry-After') || 5;
        console.log(`Rate limited. Waiting ${retryAfter}s...`);
        await delay(Number(retryAfter) * 1000);
        if (attempt < 2) {
          return sendToDiscord(payload, attempt + 1);
        }
      }
      
      // Server error - retry with backoff
      if (response.status >= 500 && attempt < 2) {
        await delay(2000 * attempt);
        return sendToDiscord(payload, attempt + 1);
      }
      
      return { success: false, status: response.status, error: errorText };
    } catch (error) {
      console.error(`Discord attempt ${attempt} error:`, error.message);
      if (attempt < 2) {
        await delay(2000 * attempt);
        return sendToDiscord(payload, attempt + 1);
      }
      return { success: false, error: error.message };
    }
  };
  
  // Try embed format first
  let result = await sendToDiscord(embedPayload);
  
  // If embed failed, try simple format
  if (!result.success) {
    console.log('Embed failed, trying simple format...');
    result = await sendToDiscord(simplePayload);
  }
  
  if (result.success) {
    console.log('✅ Feedback sent to Discord from:', safeUsername);
    res.json({ success: true, message: 'Feedback sent successfully' });
  } else {
    console.error('❌ All Discord attempts failed:', result);
    res.status(500).json({ error: 'Failed to send feedback' });
  }
});

// ============================================
// ML RISK SNAPSHOT (Layer 5 — Predictive Bridging)
// Save ML risk snapshot (called by frontend when prediction updates)
// ============================================
app.put('/api/user/:username/ml-risk', authenticate, async (req, res) => {
  try {
    const { riskScore, riskLevel, topFactors } = req.body;
    await User.findOneAndUpdate(
      { username: req.params.username },
      { $set: { mlRiskSnapshot: { riskScore, riskLevel, topFactors, updatedAt: new Date() } } }
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to save risk snapshot' });
  }
});

// ============================================
// ============================================
// ORACLE SYNC HEALTH DASHBOARD (admin cockpit)
// GET /api/admin/oracle-health
// ============================================
app.get('/api/admin/oracle-health', authenticate, async (req, res) => {
  if (req.user.username.toLowerCase() !== 'rossbased' && req.user.username.toLowerCase() !== 'ross') {
    return res.status(403).json({ error: 'Admin only' });
  }

  try {
    const now = new Date();
    const oneDayAgo = new Date(now - 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);

    // --- LINKED USERS ---
    const totalUsers = await User.countDocuments({});
    const linkedDiscord = await User.countDocuments({ discordId: { $exists: true, $ne: null, $ne: '' } });
    const syncEnabled = await User.countDocuments({ discordId: { $exists: true, $ne: null, $ne: '' }, discordOracleSync: { $ne: false } });
    const syncDisabled = linkedDiscord - syncEnabled;

    // --- MEMORY NOTES ---
    const usersWithNotes = await User.find(
      { 'oracleNotes.0': { $exists: true } },
      { oracleNotes: 1, username: 1, discordId: 1 }
    ).lean();

    let totalNotes = 0;
    let appNotes = 0;
    let discordNotes = 0;
    let notes24h = 0;
    let notes7d = 0;
    let discordNotes24h = 0;
    let appNotes24h = 0;
    let crossPlatformUsers = 0;
    const recentNotes = [];

    usersWithNotes.forEach(u => {
      const notes = u.oracleNotes || [];
      totalNotes += notes.length;
      
      let hasApp = false;
      let hasDiscord = false;
      
      notes.forEach(n => {
        if (n.source === 'discord') {
          discordNotes++;
          hasDiscord = true;
        } else {
          appNotes++;
          hasApp = true;
        }
        
        const noteDate = new Date(n.date);
        if (noteDate > oneDayAgo) {
          notes24h++;
          if (n.source === 'discord') discordNotes24h++;
          else appNotes24h++;
        }
        if (noteDate > sevenDaysAgo) notes7d++;
      });

      if (hasApp && hasDiscord) crossPlatformUsers++;

      // Collect 10 most recent notes for preview
      notes.forEach(n => {
        recentNotes.push({
          user: u.username,
          linked: !!u.discordId,
          source: n.source || 'app',
          note: n.note?.substring(0, 120) + (n.note?.length > 120 ? '...' : ''),
          date: n.date,
          streakDay: n.streakDay
        });
      });
    });

    recentNotes.sort((a, b) => new Date(b.date) - new Date(a.date));

    // --- ML RISK SNAPSHOTS ---
    const usersWithML = await User.countDocuments({ 
      'mlRiskSnapshot.updatedAt': { $exists: true, $gt: oneDayAgo } 
    });

    // --- OUTCOME TRACKING (Layer 2) ---
    const OracleOutcome = require('./models/OracleOutcome');
    const totalOutcomes = await OracleOutcome.countDocuments({});
    const measuredOutcomes = await OracleOutcome.countDocuments({ 'outcome.measured': true });
    const pendingOutcomes = await OracleOutcome.countDocuments({ 'outcome.measured': false });

    // --- DIAGNOSTIC: Last note generated timestamp ---
    let lastNoteDate = null;
    if (recentNotes.length > 0) {
      lastNoteDate = recentNotes[0].date; // Already sorted newest first
    }

    // --- COMMUNITY PULSE ---
    const { getCommunityPulse } = require('./services/communityPulse');
    const pulse = await getCommunityPulse();

    // --- ORACLE USAGE TODAY (Shared Pool Visibility) ---
    const todayET = getTodayET();
    
    // Discord usage today
    const discordUsageToday = await OracleUsage.find({ date: todayET });
    const totalDiscordToday = discordUsageToday.reduce((sum, u) => sum + (u.count || 0), 0);
    
    // App usage today (users who used Oracle today, based on aiUsage.date)
    const appUsersToday = await User.find(
      { 'aiUsage.date': todayET, 'aiUsage.count': { $gt: 0 } },
      { username: 1, 'aiUsage.count': 1, 'subscription.status': 1, discordId: 1 }
    ).lean();
    const totalAppToday = appUsersToday.reduce((sum, u) => sum + (u.aiUsage?.count || 0), 0);
    
    // Grandfathered users — shared pool check
    const grandfatheredUsers = await User.find(
      { 'subscription.status': 'grandfathered', discordId: { $exists: true, $ne: null, $ne: '' } },
      { username: 1, discordId: 1, 'aiUsage.count': 1, 'aiUsage.date': 1 }
    ).lean();
    
    const grandfatheredUsage = [];
    for (const gf of grandfatheredUsers) {
      const appCount = gf.aiUsage?.date === todayET ? (gf.aiUsage?.count || 0) : 0;
      const discordRecord = discordUsageToday.find(d => d.discordUserId === gf.discordId);
      const discordCount = discordRecord?.count || 0;
      if (appCount > 0 || discordCount > 0) {
        grandfatheredUsage.push({
          username: gf.username,
          app: appCount,
          discord: discordCount,
          combined: appCount + discordCount,
          limit: 15
        });
      }
    }

    // --- TOP USERS TODAY (per-user usage breakdown) ---
    const userMap = {};

    // Add all app users
    for (const u of appUsersToday) {
      const name = u.username;
      if (!userMap[name]) userMap[name] = { username: name, app: 0, discord: 0, tier: u.subscription?.status || 'free', discordId: u.discordId || null };
      userMap[name].app = u.aiUsage?.count || 0;
    }

    // Add all discord users (match by discordId to existing entries or create new)
    const DiscordMemory = require('./models/DiscordMemory');
    const discordIds = discordUsageToday.map(d => d.discordUserId);
    const discordMemories = await DiscordMemory.find(
      { discordUserId: { $in: discordIds } },
      { discordUserId: 1, username: 1 }
    ).lean();
    const discordNameMap = {};
    for (const dm of discordMemories) discordNameMap[dm.discordUserId] = dm.username;

    for (const du of discordUsageToday) {
      // Find linked app user by discordId
      const linkedApp = appUsersToday.find(u => u.discordId === du.discordUserId);
      const linkedGf = grandfatheredUsers.find(u => u.discordId === du.discordUserId);
      const name = linkedApp?.username || linkedGf?.username || discordNameMap[du.discordUserId] || du.discordUserId;
      if (!userMap[name]) userMap[name] = { username: name, app: 0, discord: 0, tier: linkedGf ? 'grandfathered' : (linkedApp?.subscription?.status || 'discord-only'), discordId: du.discordUserId };
      userMap[name].discord = du.count || 0;
    }

    // Sort by total usage descending
    const topUsers = Object.values(userMap)
      .map(u => ({ ...u, total: u.app + u.discord }))
      .sort((a, b) => b.total - a.total);

    res.json({
      timestamp: now.toISOString(),
      users: {
        total: totalUsers,
        discordLinked: linkedDiscord,
        syncEnabled,
        syncDisabled,
        crossPlatformActive: crossPlatformUsers
      },
      memoryNotes: {
        total: totalNotes,
        bySource: { app: appNotes, discord: discordNotes },
        last24h: { total: notes24h, app: appNotes24h, discord: discordNotes24h },
        last7d: notes7d,
        usersWithNotes: usersWithNotes.length
      },
      oracleUsage: {
        date: todayET,
        totalToday: totalDiscordToday + totalAppToday,
        discord: totalDiscordToday,
        app: totalAppToday,
        activeDiscordUsers: discordUsageToday.length,
        activeAppUsers: appUsersToday.length,
        grandfathered: grandfatheredUsage,
        topUsers
      },
      mlRisk: {
        freshSnapshots: usersWithML,
        description: 'Users with ML risk snapshot updated in last 24h'
      },
      outcomes: {
        total: totalOutcomes,
        measured: measuredOutcomes,
        pending: pendingOutcomes,
        readyForAggregation: measuredOutcomes >= 100
      },
      communityPulse: {
        active: !!pulse,
        preview: pulse || 'No pulse data yet'
      },
      recentNotes: recentNotes.slice(0, 15),
      health: {
        bridgeWorking: discordNotes > 0,
        notesFlowing: notes24h > 0,
        lastNoteDate,
        syncStatus: discordNotes > 0 ? '🟢 LIVE' : linkedDiscord > 0 ? '🟡 LINKED BUT NO DISCORD NOTES YET' : '🔴 NO LINKED USERS'
      }
    });
  } catch (err) {
    console.error('Oracle health check error:', err);
    res.status(500).json({ error: 'Health check failed', details: err.message });
  }
});

// ============================================
// ORACLE DATA PIPELINE — Aggregate Insights (admin only)
// No frontend UI — feeds Daily Transmissions and admin dashboards
// ============================================

app.get('/api/oracle-insights/topic-distribution', authenticate, async (req, res) => {
  if (req.user.username.toLowerCase() !== 'rossbased' && req.user.username.toLowerCase() !== 'ross') {
    return res.status(403).json({ error: 'Admin only' });
  }
  try {
    const days = parseInt(req.query.days) || 7;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const results = await OracleInteraction.aggregate([
      { $match: { timestamp: { $gte: since } } },
      { $unwind: '$topics' },
      { $group: { _id: '$topics', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    const distribution = {};
    results.forEach(r => { distribution[r._id] = r.count; });
    res.json({ days, distribution, total: Object.values(distribution).reduce((a, b) => a + b, 0) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/oracle-insights/sentiment-by-phase', authenticate, async (req, res) => {
  if (req.user.username.toLowerCase() !== 'rossbased' && req.user.username.toLowerCase() !== 'ross') {
    return res.status(403).json({ error: 'Admin only' });
  }
  try {
    const days = parseInt(req.query.days) || 30;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const results = await OracleInteraction.aggregate([
      { $match: { timestamp: { $gte: since }, phase: { $ne: null }, sentiment: { $ne: null } } },
      { $group: { _id: { phase: '$phase', sentiment: '$sentiment' }, count: { $sum: 1 } } }
    ]);
    // Reshape into { phase: { sentiment: count } }
    const byPhase = {};
    results.forEach(r => {
      if (!byPhase[r._id.phase]) byPhase[r._id.phase] = {};
      byPhase[r._id.phase][r._id.sentiment] = r.count;
    });
    res.json({ days, phases: byPhase });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/oracle-insights/relapse-risk-patterns', authenticate, async (req, res) => {
  if (req.user.username.toLowerCase() !== 'rossbased' && req.user.username.toLowerCase() !== 'ross') {
    return res.status(403).json({ error: 'Admin only' });
  }
  try {
    const flagged = await OracleInteraction.aggregate([
      { $match: { relapseRiskLanguage: true } },
      { $group: {
        _id: '$relapseWithin48h',
        count: { $sum: 1 },
        avgStreakDay: { $avg: '$streakDay' },
        topTopics: { $push: '$topics' }
      }}
    ]);
    // Flatten topics for frequency count
    const formatGroup = (group) => {
      if (!group) return { count: 0 };
      const allTopics = group.topTopics.flat();
      const topicCounts = {};
      allTopics.forEach(t => { topicCounts[t] = (topicCounts[t] || 0) + 1; });
      return { count: group.count, avgStreakDay: Math.round(group.avgStreakDay || 0), topTopics: topicCounts };
    };
    res.json({
      relapsedAfterFlag: formatGroup(flagged.find(f => f._id === true)),
      didNotRelapse: formatGroup(flagged.find(f => f._id === false)),
      pendingBackfill: formatGroup(flagged.find(f => f._id === null))
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/oracle-insights/trending-topics', authenticate, async (req, res) => {
  if (req.user.username.toLowerCase() !== 'rossbased' && req.user.username.toLowerCase() !== 'ross') {
    return res.status(403).json({ error: 'Admin only' });
  }
  try {
    const days = parseInt(req.query.days) || 3;
    const recentCutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const baselineCutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    // Recent topic counts
    const recent = await OracleInteraction.aggregate([
      { $match: { timestamp: { $gte: recentCutoff } } },
      { $unwind: '$topics' },
      { $group: { _id: '$topics', count: { $sum: 1 } } }
    ]);
    const recentTotal = recent.reduce((s, r) => s + r.count, 0) || 1;

    // 30-day baseline topic counts
    const baseline = await OracleInteraction.aggregate([
      { $match: { timestamp: { $gte: baselineCutoff, $lt: recentCutoff } } },
      { $unwind: '$topics' },
      { $group: { _id: '$topics', count: { $sum: 1 } } }
    ]);
    const baselineTotal = baseline.reduce((s, r) => s + r.count, 0) || 1;
    const baselineMap = {};
    baseline.forEach(r => { baselineMap[r._id] = r.count / baselineTotal; });

    // Find topics trending above baseline
    const trending = recent
      .map(r => {
        const recentPct = r.count / recentTotal;
        const baselinePct = baselineMap[r._id] || 0.01; // Default 1% if new
        return { topic: r._id, recentCount: r.count, recentPct: Math.round(recentPct * 100), baselinePct: Math.round(baselinePct * 100), lift: Math.round((recentPct / baselinePct) * 100) / 100 };
      })
      .filter(t => t.lift > 1.2) // At least 20% above baseline
      .sort((a, b) => b.lift - a.lift);

    res.json({ days, trending, totalRecentInteractions: recentTotal });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================
// YOUTUBE INTELLIGENCE (admin only)
// Stats, manual triggers, and content pipeline
// ============================================

// GET /api/admin/youtube/stats — Overview of YouTube comment data
app.get('/api/admin/youtube/stats', authenticate, async (req, res) => {
  if (req.user.username.toLowerCase() !== 'rossbased' && req.user.username.toLowerCase() !== 'ross') {
    return res.status(403).json({ error: 'Admin only' });
  }
  try {
    const stats = await getYouTubeStats();
    const pipeline = getLatestReport();
    res.json({ youtube: stats, contentPipeline: pipeline });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/youtube/fetch — Manually trigger a YouTube comment fetch
app.post('/api/admin/youtube/fetch', authenticate, async (req, res) => {
  if (req.user.username.toLowerCase() !== 'rossbased' && req.user.username.toLowerCase() !== 'ross') {
    return res.status(403).json({ error: 'Admin only' });
  }
  try {
    const result = await runYouTubeFetch();
    res.json({ message: 'YouTube fetch complete', result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/youtube/pipeline — Manually trigger the content pipeline
app.post('/api/admin/youtube/pipeline', authenticate, async (req, res) => {
  if (req.user.username.toLowerCase() !== 'rossbased' && req.user.username.toLowerCase() !== 'ross') {
    return res.status(403).json({ error: 'Admin only' });
  }
  try {
    const report = await runContentPipeline();
    res.json({ message: 'Content pipeline complete', report });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/youtube/pipeline-report — Get latest content pipeline report
app.get('/api/admin/youtube/pipeline-report', authenticate, async (req, res) => {
  if (req.user.username.toLowerCase() !== 'rossbased' && req.user.username.toLowerCase() !== 'ross') {
    return res.status(403).json({ error: 'Admin only' });
  }
  const data = getLatestReport();
  if (!data.report) {
    return res.json({ message: 'No pipeline report generated yet. Trigger one with POST /api/admin/youtube/pipeline', ...data });
  }
  res.json(data);
});

// ============================================
// ORACLE VOICE REFINEMENT (Layer 6 — admin only)
// Analyzes recent Oracle conversations to detect AI patterns
// ============================================
app.post('/api/admin/oracle-voice-review', authenticate, async (req, res) => {
  // Admin check
  if (req.user.username.toLowerCase() !== 'rossbased' && req.user.username.toLowerCase() !== 'ross') {
    return res.status(403).json({ error: 'Admin only' });
  }

  try {
    // Pull recent Oracle notes across all users (anonymized)
    const usersWithNotes = await User.find(
      { 'oracleNotes.0': { $exists: true } },
      { oracleNotes: 1, _id: 0 }
    ).limit(50).lean();

    const allNotes = usersWithNotes
      .flatMap(u => u.oracleNotes || [])
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 100)
      .map(n => n.note);

    if (allNotes.length < 20) {
      return res.json({ message: 'Need at least 20 Oracle notes for meaningful analysis', noteCount: allNotes.length });
    }

    const response = await anthropic.messages.create({
      model: ORACLE_MODEL,
      max_tokens: 1000,
      system: `You are reviewing conversation summaries from an AI called "The Oracle" to identify moments where it fell into generic AI patterns. The Oracle should sound like a perceptive spiritual teacher — calm, direct, slightly unsettling in its accuracy. Never sycophantic, never generic.

Analyze the patterns in these conversation summaries and identify:
1. Repeated phrases or structures the Oracle uses too often
2. Topics where the Oracle gives generic advice instead of personalized insight
3. Moments where the Oracle sounds like a chatbot instead of a teacher
4. Specific new anti-pattern rules that should be added to the system prompt

Be brutally specific. Give exact phrases to ban and exact alternatives.`,
      messages: [{
        role: 'user',
        content: `Here are ${allNotes.length} recent Oracle conversation summaries (anonymized):\n\n${allNotes.join('\n\n')}\n\nGenerate your voice refinement report.`
      }]
    });

    const report = response.content[0].text;
    
    res.json({
      noteCount: allNotes.length,
      userCount: usersWithNotes.length,
      report,
      instruction: 'Review this report. Add any valuable anti-patterns to the Oracle system prompt manually.'
    });

    console.log(`🔮 Voice refinement report generated from ${allNotes.length} notes`);
  } catch (err) {
    console.error('Voice refinement error:', err);
    res.status(500).json({ error: 'Failed to generate report' });
  }
});

// ============================================
// PASSWORD RESET ENDPOINTS
// ============================================

// Step 1: User submits email → generate token, send reset email
app.post('/api/auth/forgot-password', async (req, res) => {
  const { email } = req.body;

  if (!email || !email.trim()) {
    return res.status(400).json({ error: 'Email is required' });
  }

  try {
    const user = await User.findOne({ email: { $regex: new RegExp(`^${email.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } });

    // Always return success even if no user found (prevents email enumeration)
    if (!user) {
      console.log('Forgot password - no user found for email:', email);
      return res.json({ message: 'If an account exists with that email, a reset link has been sent.' });
    }

    // Check if this is a Google/Discord-only account (no password set)
    if (!user.password && (user.googleId || user.discordId)) {
      console.log('Forgot password - OAuth-only account:', email);
      return res.json({ message: 'If an account exists with that email, a reset link has been sent.' });
    }

    // Generate secure random token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now

    // Store token on user document
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = resetExpires;
    await user.save();

    // Build reset URL
    const baseUrl = process.env.NODE_ENV === 'production' 
      ? 'https://titantrack.app' 
      : 'http://localhost:3000';
    const resetUrl = `${baseUrl}/reset-password?token=${resetToken}`;

    // Send email via Resend
    await resend.emails.send({
      from: 'TitanTrack <noreply@titantrack.app>',
      to: email.trim(),
      subject: 'Reset Your Password',
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 24px; background-color: #000000; color: #ffffff;">
          <h2 style="font-size: 1.25rem; font-weight: 500; margin: 0 0 16px 0; color: #ffffff;">Password Reset</h2>
          <p style="font-size: 0.9375rem; color: rgba(255,255,255,0.6); line-height: 1.6; margin: 0 0 24px 0;">
            You requested a password reset for your TitanTrack account. Click the button below to set a new password. This link expires in 1 hour.
          </p>
          <a href="${resetUrl}" style="display: inline-block; padding: 14px 28px; background-color: #ffffff; color: #000000; font-size: 0.9375rem; font-weight: 600; text-decoration: none; border-radius: 10px;">
            Reset Password
          </a>
          <p style="font-size: 0.8125rem; color: rgba(255,255,255,0.3); line-height: 1.5; margin: 32px 0 0 0;">
            If you didn't request this, ignore this email. Your password won't change.
          </p>
        </div>
      `
    });

    console.log('Password reset email sent to:', email);
    res.json({ message: 'If an account exists with that email, a reset link has been sent.' });

  } catch (err) {
    console.error('Forgot password error:', err);
    res.status(500).json({ error: 'Failed to process request. Please try again.' });
  }
});

// Step 2: User clicks link, submits new password with token
app.post('/api/auth/reset-password', async (req, res) => {
  const { token, password } = req.body;

  if (!token || !password) {
    return res.status(400).json({ error: 'Token and password are required' });
  }

  if (password.length < 4) {
    return res.status(400).json({ error: 'Password must be at least 4 characters' });
  }

  try {
    // Find user with valid (non-expired) token
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: new Date() }
    });

    if (!user) {
      return res.status(400).json({ error: 'This reset link is invalid or has expired. Please request a new one.' });
    }

    // Update password and clear reset fields
    user.password = password;
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;
    await user.save();

    console.log('Password reset successful for user:', user.username);
    res.json({ message: 'Password has been reset successfully.' });

  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({ error: 'Failed to reset password. Please try again.' });
  }
});

// ============================================
// MOUNT ROUTES
// ============================================
app.use('/api/notifications', notificationRoutes);
app.use('/api/auth', googleAuthRoutes);
app.use('/api/auth', discordAuthRoutes);
app.use('/api/ml', mlRoutes);
app.use('/api/transmission', transmissionRoutes);
app.use('/api/knowledge', authenticate, knowledgeRoutes);
app.use('/api/analytics', authenticate, analyticsRoutes);
app.use('/api/admin', authenticate, adminRevenueRoutes);
app.use('/api/stripe', stripeRoutes);
app.use('/api/protocol', protocolRoutes);
app.use('/api/discord', discordLinkRoutes);
app.use('/api/timeline', timelineRoutes);
oracleEvolutionRoutes.init(authenticate);
app.use('/api/admin/oracle', oracleEvolutionRoutes);
oracleEvolutionRoutes.startScheduledJobs();

// Serve frontend build in production
if (process.env.NODE_ENV === 'production') {
  const path = require('path');
  app.use(express.static(path.join(__dirname, '../build')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../build', 'index.html'));
  });
}

// Start Discord Oracle bot (only if token is configured)
if (process.env.ORACLE_DISCORD_TOKEN) {
  require('./discord-bot');
}

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
