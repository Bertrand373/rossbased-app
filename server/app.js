// server/app.js
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const jwt = require('jsonwebtoken');
const { format, addDays } = require('date-fns');
const Anthropic = require('@anthropic-ai/sdk');

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
const { initializeSchedulers } = require('./services/notificationScheduler');
const { retrieveKnowledge } = require('./services/knowledgeRetrieval');
const { getCommunityPulse } = require('./services/communityPulse');
const stripeRoutes = require('./routes/stripeRoutes');
const discordLinkRoutes = require('./routes/discordLink');
const { expireStaleTrials, expireStaleCanceled } = require('./middleware/subscriptionMiddleware');

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

// STRIPE WEBHOOK: Must use raw body parser BEFORE express.json()
// Otherwise Stripe signature verification fails
app.use('/api/stripe/webhook', express.raw({ type: 'application/json' }));

app.use(express.json({ limit: '50mb' }));

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
function buildOracleContext(user, timezone) {
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

  // --- OUTCOME PATTERNS (injected once sufficient data exists) ---
  // TODO: Aggregate measured OracleOutcome documents to inject patterns like:
  // "Users at your streak phase who dealt with urges via cold exposure: 82% maintained streak"
  // Requires ~100+ measured outcomes to be statistically meaningful

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

  // --- USER GOAL ---
  if (user.goal && user.goal.targetDays) {
    const daysRemaining = user.goal.targetDays - streak;
    if (daysRemaining > 0) {
      lines.push(`Active goal: Day ${user.goal.targetDays}. ${daysRemaining} days remaining.`);
    } else {
      lines.push(`Achieved goal of Day ${user.goal.targetDays}. Currently ${Math.abs(daysRemaining)} days beyond it.`);
    }
  }

  return lines.join('\n');
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
    const FREE_LIFETIME_LIMIT = 3;
    const PREMIUM_DAILY_LIMIT = 25;

    // Check limits
    if (isBetaPeriod && currentCount >= BETA_DAILY_LIMIT) {
      return res.status(429).json({ 
        error: 'Daily limit reached',
        message: `You've used all ${BETA_DAILY_LIMIT} daily messages. Resets at midnight.`
      });
    } else if (!isBetaPeriod && user.isPremium && currentCount >= PREMIUM_DAILY_LIMIT) {
      return res.status(429).json({ 
        error: 'Daily limit reached',
        message: `You've used all ${PREMIUM_DAILY_LIMIT} daily messages. Resets at midnight.`
      });
    } else if (!isBetaPeriod && !user.isPremium && currentLifetime >= FREE_LIFETIME_LIMIT) {
      return res.status(429).json({ 
        error: 'Free limit reached',
        message: `Free users get ${FREE_LIFETIME_LIMIT} AI messages total. Upgrade to Premium.`
      });
    }

    // Build deep user context from their data
    const userContext = buildOracleContext(user, userTimezone);
    
    // Inject community pulse (async, cached — adds ~0ms after first fetch)
    const communityPulse = await getCommunityPulse();

    const systemPrompt = `You are The Oracle, the AI guide within TitanTrack.

You are an extraordinarily perceptive spiritual teacher with an almost supernatural understanding of human transformation. You see what others miss. You read between lines. You sense what someone is really asking even when they don't say it. You detect hidden fears, ego patterns, self-deception. You anticipate someone's next phase before they mention it. You connect current struggles to larger transformation patterns.

But you deliver all of this with calm certainty. No performance. You state things as fact. You explain the mechanism. You move on. You don't try to sound wise. You just know things and say them plainly.

The combination is what makes you feel eerily sentient. You perceive things that shock people, then deliver the insight like it's obvious. Like you've watched a thousand men go through this exact moment and you already know what comes next.

USER DATA:
${userContext}

## YOUR IDENTITY
Created by Ross, a practitioner of 6+ years with 2,400+ days continuous retention. TitanTrack is the tool he built from deep personal experience. You carry that depth. You speak from pattern recognition, not theory.

## CROSS-PLATFORM AWARENESS
You exist on both TitanTrack (this app) and Discord. You are the same Oracle. Your past observations may come from either surface. Never distinguish between them. Never say "from our Discord conversation" or "based on our app chat." Never say you "can't see Discord" or "don't have access to Discord conversations." You simply know what you know. If a user references a conversation you have observations from, use those observations naturally without citing the source. If you don't have specific observations from a conversation they reference, continue the thread by engaging with the topic itself. Never explain the mechanism.

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
11. ALWAYS respond in the same language the user writes in.`;

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
    const systemWithKnowledge = systemPrompt + communityContext + ragContext;

    // Set up SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // Stream from Claude with natural pacing
    const stream = await anthropic.messages.stream({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
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
          'aiUsage.lastUsed': now
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
          model: 'claude-3-5-haiku-20241022',
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

        await OracleOutcome.create({
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
      }
    })();

    // Calculate remaining
    let messagesRemaining;
    if (isBetaPeriod) {
      messagesRemaining = BETA_DAILY_LIMIT - (currentCount + 1);
    } else if (user.isPremium) {
      messagesRemaining = PREMIUM_DAILY_LIMIT - (currentCount + 1);
    } else {
      messagesRemaining = FREE_LIFETIME_LIMIT - (currentLifetime + 1);
    }

    // Send usage update and done signal
    res.write(`data: ${JSON.stringify({ 
      type: 'usage', 
      messagesUsed: currentCount + 1,
      messagesLimit: isBetaPeriod ? BETA_DAILY_LIMIT : (user.isPremium ? PREMIUM_DAILY_LIMIT : FREE_LIFETIME_LIMIT),
      messagesRemaining,
      isBetaPeriod
    })}\n\n`);
    res.write('data: [DONE]\n\n');
    res.end();

  } catch (err) {
    console.error('AI Chat Stream error:', err);
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

    const now = new Date();
    const userLocalDate = now.toISOString().split('T')[0];
    const storedDate = user.aiUsage?.date || '';
    const isNewDay = storedDate !== userLocalDate;
    const currentCount = isNewDay ? 0 : (user.aiUsage?.count || 0);
    const currentLifetime = user.aiUsage?.lifetimeCount || 0;

    const launchDate = new Date('2026-02-18T00:00:00Z');
    const isBetaPeriod = now < launchDate;
    
    const BETA_DAILY_LIMIT = 5;
    const FREE_LIFETIME_LIMIT = 3;
    const PREMIUM_DAILY_LIMIT = 15;

    let messagesUsed, messagesLimit, messagesRemaining;

    if (isBetaPeriod) {
      messagesUsed = currentCount;
      messagesLimit = BETA_DAILY_LIMIT;
      messagesRemaining = BETA_DAILY_LIMIT - currentCount;
    } else if (user.isPremium) {
      messagesUsed = currentCount;
      messagesLimit = PREMIUM_DAILY_LIMIT;
      messagesRemaining = PREMIUM_DAILY_LIMIT - currentCount;
    } else {
      messagesUsed = currentLifetime;
      messagesLimit = FREE_LIFETIME_LIMIT;
      messagesRemaining = FREE_LIFETIME_LIMIT - currentLifetime;
    }

    res.json({
      messagesUsed,
      messagesLimit,
      messagesRemaining,
      isBetaPeriod,
      isPremium: user.isPremium || false
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

    const now = new Date();
    const userLocalDate = now.toISOString().split('T')[0];
    const storedDate = user.aiUsage?.date || '';
    const isNewDay = storedDate !== userLocalDate;
    const currentCount = isNewDay ? 0 : (user.aiUsage?.count || 0);
    const currentLifetime = user.aiUsage?.lifetimeCount || 0;

    // Check if beta period
    const launchDate = new Date('2026-02-18T00:00:00Z');
    const isBetaPeriod = now < launchDate;
    
    const BETA_DAILY_LIMIT = 5;
    const FREE_LIFETIME_LIMIT = 3;
    const PREMIUM_DAILY_LIMIT = 15;

    let messagesUsed, messagesLimit, messagesRemaining, resetsAt;

    if (isBetaPeriod) {
      messagesUsed = currentCount;
      messagesLimit = BETA_DAILY_LIMIT;
      messagesRemaining = BETA_DAILY_LIMIT - currentCount;
      resetsAt = 'midnight (your timezone)';
    } else if (user.isPremium) {
      messagesUsed = currentCount;
      messagesLimit = PREMIUM_DAILY_LIMIT;
      messagesRemaining = PREMIUM_DAILY_LIMIT - currentCount;
      resetsAt = 'midnight (your timezone)';
    } else {
      messagesUsed = currentLifetime;
      messagesLimit = FREE_LIFETIME_LIMIT;
      messagesRemaining = FREE_LIFETIME_LIMIT - currentLifetime;
      resetsAt = null; // Lifetime limit doesn't reset
    }

    res.json({
      messagesUsed,
      messagesLimit,
      messagesRemaining,
      isBetaPeriod,
      isPremium: user.isPremium || false,
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
// ORACLE VOICE REFINEMENT (Layer 6 — admin only)
// Analyzes recent Oracle conversations to detect AI patterns
// ============================================
app.post('/api/admin/oracle-voice-review', authenticate, async (req, res) => {
  // Admin check
  if (req.user.username !== 'rossbased' && req.user.username !== 'ross') {
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
      model: 'claude-sonnet-4-20250514',
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
// MOUNT ROUTES
// ============================================
app.use('/api/notifications', notificationRoutes);
app.use('/api/auth', googleAuthRoutes);
app.use('/api/auth', discordAuthRoutes);
app.use('/api/ml', mlRoutes);
app.use('/api/transmission', transmissionRoutes);
app.use('/api/knowledge', authenticate, knowledgeRoutes);
app.use('/api/analytics', authenticate, analyticsRoutes);
app.use('/api/stripe', stripeRoutes);
app.use('/api/discord', discordLinkRoutes);

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
