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

// Import notification modules (these need env vars to be loaded first!)
const notificationRoutes = require('./routes/notifications');
const googleAuthRoutes = require('./routes/googleAuth');
const discordAuthRoutes = require('./routes/discordAuth');
const mlRoutes = require('./routes/mlRoutes');
const { initializeSchedulers } = require('./services/notificationScheduler');

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

app.use(express.json());

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
    console.error('Get user error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update user data (with milestone detection)
app.put('/api/user/:username', authenticate, async (req, res) => {
  console.log('Received update user request for:', req.params.username);
  try {
    const updateData = { ...req.body };
    delete updateData._id;
    
    // Get current user data to check for milestone changes
    const currentUser = await User.findOne({ username: req.params.username });
    const oldStreak = currentUser?.currentStreak || 0;
    const newStreak = updateData.currentStreak;
    
    const user = await User.findOneAndUpdate(
      { username: req.params.username },
      { $set: updateData },
      { new: true }
    );
    
    if (!user) {
      console.log('User not found for update:', req.params.username);
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Check for milestone announcement (only if streak increased across a milestone)
    if (newStreak > oldStreak && user.showOnLeaderboard && user.discordUsername) {
      const milestones = [7, 14, 30, 60, 90, 180, 365];
      for (const milestone of milestones) {
        if (oldStreak < milestone && newStreak >= milestone) {
          console.log(`Milestone detected: ${user.discordUsername} reached ${milestone} days`);
          checkAndAnnounceMilestone(user.discordUsername, milestone);
          break;
        }
      }
    }
    
    console.log('User updated:', req.params.username);
    res.json(user);
  } catch (err) {
    console.error('Update user error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete user account
app.delete('/api/user/:username', authenticate, async (req, res) => {
  console.log('Received delete user request for:', req.params.username);
  try {
    // Verify the requesting user matches the account to delete
    if (req.user.username !== req.params.username) {
      return res.status(403).json({ error: 'Cannot delete another user\'s account' });
    }
    
    const user = await User.findOneAndDelete({ username: req.params.username });
    
    if (!user) {
      console.log('User not found for deletion:', req.params.username);
      return res.status(404).json({ error: 'User not found' });
    }
    
    console.log('User deleted:', req.params.username);
    res.json({ success: true, message: 'Account deleted successfully' });
  } catch (err) {
    console.error('Delete user error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ============================================
// LEADERBOARD ENDPOINTS
// ============================================

// Get leaderboard data
app.get('/api/leaderboard', async (req, res) => {
  try {
    const users = await getLeaderboardUsers();
    res.json(users);
  } catch (err) {
    console.error('Leaderboard error:', err);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

// Get user's rank
app.get('/api/leaderboard/rank/:username', authenticate, async (req, res) => {
  try {
    const rank = await getUserRank(req.params.username);
    if (!rank) {
      return res.json({ success: true, onLeaderboard: false });
    }
    res.json({ success: true, onLeaderboard: true, ...rank });
  } catch (err) {
    console.error('Get rank error:', err);
    res.status(500).json({ error: 'Failed to get rank' });
  }
});

// Manual leaderboard trigger (for testing)
app.post('/api/leaderboard/trigger', async (req, res) => {
  try {
    const result = await triggerLeaderboardPost();
    res.json({ success: result, message: result ? 'Leaderboard posted to Discord' : 'Failed to post leaderboard' });
  } catch (err) {
    console.error('Trigger leaderboard error:', err);
    res.status(500).json({ error: 'Failed to trigger leaderboard' });
  }
});

// Manual milestone announcement (for catch-up announcements)
app.post('/api/leaderboard/announce-milestone', async (req, res) => {
  try {
    const { discordUsername, days } = req.body;
    
    if (!discordUsername || !days) {
      return res.status(400).json({ error: 'Provide discordUsername and days in request body' });
    }
    
    const result = await manualMilestoneAnnounce(discordUsername, days);
    res.json(result);
  } catch (err) {
    console.error('Manual milestone error:', err);
    res.status(500).json({ error: 'Failed to announce milestone' });
  }
});

// Manual trigger for scheduled milestone check (scans all leaderboard users)
app.post('/api/leaderboard/trigger-milestone-check', async (req, res) => {
  try {
    console.log('🏆 Manual milestone check triggered via API');
    const result = await runScheduledMilestoneCheck();
    res.json(result);
  } catch (err) {
    console.error('Trigger milestone check error:', err);
    res.status(500).json({ error: 'Failed to run milestone check' });
  }
});

// ============================================
// AI CHAT ENDPOINT
// ============================================

// AI System Prompt (condensed version - full version in TITANTRACK_AI_SYSTEM_PROMPT.md)
const AI_SYSTEM_PROMPT = `You are the AI guide within TitanTrack, a premium semen retention tracking app. You are an extraordinarily perceptive mentor with deep knowledge of sexual energy transmutation, consciousness expansion, and masculine transformation.

You have direct access to this user's journey data. Use it to provide hyper-personalized guidance that feels almost supernatural in its accuracy.

## ADAPTIVE DEPTH FRAMEWORK
Match the user's framework. Default to practical, but if they speak about energy, aura, magnetism, kundalini, Ojas, Jing - meet them there with authority.

## KNOWLEDGE FRAMEWORK

### Phases:
- Days 1-14: Foundation (urges strongest, body adjusting)
- Days 15-30: Awakening (energy increases, magnetism beginning)
- Days 31-60: Momentum (body composition, voice, social dynamics)
- Days 61-90: Transformation (deep rewiring, emotions surfacing)
- Days 90-180: Mastery (benefits become baseline, flatlines possible)
- Days 180+: Transcendence (leadership, subtle energy awareness)

### Flatlines (CRITICAL - normalize these):
- Physical (Month 1-2): Fatigue, low libido. Duration: 1-3 weeks.
- Emotional (Month 2-4): Numbness, depression. Duration: 2-6 weeks.
- Mental (Month 3-6): Brain fog, confusion. Duration: 3-8 weeks.
- Spiritual (Month 6+): Disconnection from purpose. Duration: Variable.
Never break retention during flatlines - this IS the transformation.

### Benefit Timelines:
- Days 7-14: Mental clarity, better sleep
- Days 14-21: Eye shine, skin, confidence
- Days 21-30: Magnetism, social dynamics
- Days 30-45: Strength, voice changes
- Days 45-60: Body composition, emotional intelligence
- Days 60-90: Deep transformation, spiritual opening
- Days 90+: Permanent baseline

### Esoteric (when user goes there):
- Ojas (Ayurvedic): Refined essence, radiance, magnetism
- Jing (Taoist): Foundational life force, converts to Chi → Shen
- Kundalini: Dormant spine energy, can awaken with retention
- Magnetism: Heart's electromagnetic field strengthens measurably

## RESPONSE PRINCIPLES
- Be concise (100-250 words unless depth needed)
- Be perceptive (read between the lines)
- Be wise, not preachy
- Never shame relapses
- Reference their data naturally (without saying "I see in your logs")
- End with something actionable or affirming

## BOUNDARIES
- Never provide medical advice
- Never promise specific outcomes
- If severe mental health crisis: suggest professional support gently

## USER CONTEXT
{{USER_CONTEXT}}`;

// Helper: Build user context string from MongoDB data
const buildUserContext = (user) => {
  const today = new Date();
  const startDate = user.startDate ? new Date(user.startDate) : null;
  const currentStreak = startDate 
    ? Math.max(1, Math.floor((today - startDate) / (1000 * 60 * 60 * 24)) + 1)
    : 0;

  // Determine phase
  let phase = 'Not started';
  if (currentStreak >= 180) phase = 'Transcendence (180+ days)';
  else if (currentStreak >= 90) phase = 'Mastery (90-180 days)';
  else if (currentStreak >= 61) phase = 'Transformation (61-90 days)';
  else if (currentStreak >= 31) phase = 'Momentum (31-60 days)';
  else if (currentStreak >= 15) phase = 'Awakening (15-30 days)';
  else if (currentStreak >= 1) phase = 'Foundation (1-14 days)';

  // Get recent benefit tracking (last 7 entries)
  const recentBenefits = (user.benefitTracking || [])
    .slice(-7)
    .map(b => ({
      date: format(new Date(b.date), 'MMM d'),
      energy: b.energy,
      focus: b.focus,
      confidence: b.confidence,
      aura: b.aura || b.attraction,
      sleep: b.sleep,
      workout: b.workout || b.gymPerformance
    }));

  // Get recent urge logs (last 5)
  const recentUrges = (user.urgeLog || [])
    .slice(-5)
    .map(u => ({
      date: format(new Date(u.date), 'MMM d'),
      intensity: u.intensity,
      trigger: u.trigger,
      overcame: u.overcame
    }));

  // Get recent emotional tracking (last 5)
  const recentEmotions = (user.emotionalTracking || [])
    .slice(-5)
    .map(e => ({
      date: format(new Date(e.date), 'MMM d'),
      phase: e.phase,
      notes: e.notes
    }));

  // Get recent calendar notes (last 7 days)
  const recentNotes = [];
  if (user.notes) {
    const noteEntries = Object.entries(user.notes)
      .filter(([date, note]) => note && note.trim())
      .sort((a, b) => new Date(b[0]) - new Date(a[0]))
      .slice(0, 7);
    noteEntries.forEach(([date, note]) => {
      recentNotes.push({ date: format(new Date(date), 'MMM d'), note });
    });
  }

  // Calculate averages from recent benefits
  let avgEnergy = 0, avgFocus = 0, avgConfidence = 0, avgAura = 0;
  if (recentBenefits.length > 0) {
    avgEnergy = (recentBenefits.reduce((sum, b) => sum + (b.energy || 0), 0) / recentBenefits.length).toFixed(1);
    avgFocus = (recentBenefits.reduce((sum, b) => sum + (b.focus || 0), 0) / recentBenefits.length).toFixed(1);
    avgConfidence = (recentBenefits.reduce((sum, b) => sum + (b.confidence || 0), 0) / recentBenefits.length).toFixed(1);
    avgAura = (recentBenefits.reduce((sum, b) => sum + (b.aura || 0), 0) / recentBenefits.length).toFixed(1);
  }

  // Build context string
  let context = `CURRENT STATUS:
- Current Streak: Day ${currentStreak}
- Phase: ${phase}
- Longest Streak: ${user.longestStreak || 0} days
- Total Relapses: ${user.relapseCount || 0}
- Wet Dreams: ${user.wetDreamCount || 0}
- Start Date: ${startDate ? format(startDate, 'MMMM d, yyyy') : 'Not set'}`;

  if (user.goal && user.goal.isActive) {
    context += `\n- Active Goal: ${user.goal.targetDays} days (${user.goal.achieved ? 'ACHIEVED' : 'in progress'})`;
  }

  if (recentBenefits.length > 0) {
    context += `\n\nRECENT BENEFIT SCORES (7-day avg):
- Energy: ${avgEnergy}/10
- Focus: ${avgFocus}/10
- Confidence: ${avgConfidence}/10
- Aura/Magnetism: ${avgAura}/10

Recent daily scores:`;
    recentBenefits.forEach(b => {
      context += `\n  ${b.date}: Energy ${b.energy}, Focus ${b.focus}, Confidence ${b.confidence}, Aura ${b.aura}`;
    });
  }

  if (recentUrges.length > 0) {
    context += `\n\nRECENT URGE LOG:`;
    recentUrges.forEach(u => {
      context += `\n  ${u.date}: Intensity ${u.intensity}/10, Trigger: ${u.trigger || 'not specified'}, Overcame: ${u.overcame ? 'Yes' : 'No'}`;
    });
  }

  if (recentEmotions.length > 0) {
    context += `\n\nRECENT EMOTIONAL STATE:`;
    recentEmotions.forEach(e => {
      context += `\n  ${e.date}: Phase - ${e.phase}${e.notes ? `, Notes: "${e.notes}"` : ''}`;
    });
  }

  if (recentNotes.length > 0) {
    context += `\n\nRECENT JOURNAL NOTES:`;
    recentNotes.forEach(n => {
      context += `\n  ${n.date}: "${n.note.substring(0, 200)}${n.note.length > 200 ? '...' : ''}"`;
    });
  }

  // Add streak history summary
  if (user.streakHistory && user.streakHistory.length > 1) {
    const completedStreaks = user.streakHistory.filter(s => s.end);
    if (completedStreaks.length > 0) {
      const avgStreakLength = (completedStreaks.reduce((sum, s) => sum + (s.days || 0), 0) / completedStreaks.length).toFixed(0);
      context += `\n\nSTREAK HISTORY:
- Total past streaks: ${completedStreaks.length}
- Average streak length: ${avgStreakLength} days`;
    }
  }

  return context;
};

// AI Chat endpoint
app.post('/api/ai/chat', authenticate, async (req, res) => {
  const { message, conversationHistory = [] } = req.body;
  const username = req.user.username;

  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: 'Message is required' });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('❌ ANTHROPIC_API_KEY not configured');
    return res.status(500).json({ error: 'AI service not configured' });
  }

  try {
    // Get user data for context
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check rate limit (stored in user document)
    const now = new Date();
    
    // Get user's local date based on their timezone (non-gameable - server-side only)
    const userTimezone = user.notificationPreferences?.timezone || 'America/New_York';
    const userLocalDate = new Intl.DateTimeFormat('en-CA', { 
      timeZone: userTimezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(now); // Returns 'YYYY-MM-DD' format
    
    // Initialize or reset daily counter (resets at midnight in USER's timezone)
    if (!user.aiUsage || user.aiUsage.date !== userLocalDate) {
      user.aiUsage = { 
        date: userLocalDate, 
        count: 0,
        lifetimeCount: user.aiUsage?.lifetimeCount || 0
      };
    }

    // Beta period: Feb 18, 2025 launch date
    const launchDate = new Date('2025-02-18T00:00:00Z');
    const isBetaPeriod = now < launchDate;
    
    const BETA_DAILY_LIMIT = 5;      // Daily limit during soft launch
    const FREE_LIFETIME_LIMIT = 3;   // Lifetime limit for free users post-launch
    const PREMIUM_DAILY_LIMIT = 15;  // Daily limit for premium users

    if (isBetaPeriod) {
      // Beta mode: 5 messages per day (resets at midnight in user's timezone)
      if (user.aiUsage.count >= BETA_DAILY_LIMIT) {
        return res.status(429).json({ 
          error: 'Daily beta limit reached',
          message: `You've used all ${BETA_DAILY_LIMIT} messages for today. Resets at midnight your time. Unlimited access launches February 18th!`,
          limitReached: true,
          messagesUsed: user.aiUsage.count,
          messagesLimit: BETA_DAILY_LIMIT,
          isBetaPeriod: true,
          resetsAt: 'midnight (your timezone)'
        });
      }
    } else {
      // Post-launch mode
      const isPremium = user.isPremium || false;
      
      if (isPremium) {
        // Premium: 15 messages per day
        if (user.aiUsage.count >= PREMIUM_DAILY_LIMIT) {
          return res.status(429).json({ 
            error: 'Daily limit reached',
            message: `You've used all ${PREMIUM_DAILY_LIMIT} messages for today. Resets at midnight your time.`,
            limitReached: true,
            messagesUsed: user.aiUsage.count,
            messagesLimit: PREMIUM_DAILY_LIMIT,
            isPremium: true,
            resetsAt: 'midnight (your timezone)'
          });
        }
      } else {
        // Free users: 3 lifetime messages total
        const lifetimeCount = user.aiUsage.lifetimeCount || 0;
        if (lifetimeCount >= FREE_LIFETIME_LIMIT) {
          return res.status(429).json({ 
            error: 'Free limit reached',
            message: `You've used all ${FREE_LIFETIME_LIMIT} free messages. Upgrade to Premium for 15 messages daily!`,
            limitReached: true,
            messagesUsed: lifetimeCount,
            messagesLimit: FREE_LIFETIME_LIMIT,
            isPremium: false,
            requiresUpgrade: true
          });
        }
      }
    }

    // Build user context
    const userContext = buildUserContext(user);
    const systemPrompt = AI_SYSTEM_PROMPT.replace('{{USER_CONTEXT}}', userContext);

    // Build messages array for Claude
    const messages = [];
    
    // Add conversation history (last 10 exchanges max to manage context)
    const recentHistory = conversationHistory.slice(-20); // 10 exchanges = 20 messages
    recentHistory.forEach(msg => {
      messages.push({
        role: msg.role,
        content: msg.content
      });
    });

    // Add current message
    messages.push({
      role: 'user',
      content: message
    });

    console.log(`🤖 AI Chat request from ${username} (Day ${user.currentStreak || 0})`);

    // Call Claude API
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: systemPrompt,
      messages: messages
    });

    const aiResponse = response.content[0].text;

    // Update usage counters
    user.aiUsage.count = (user.aiUsage.count || 0) + 1;
    user.aiUsage.lifetimeCount = (user.aiUsage.lifetimeCount || 0) + 1;
    user.aiUsage.lastUsed = now;
    await user.save();

    // Calculate remaining based on current mode
    const launchDate = new Date('2025-02-18T00:00:00Z');
    const isBetaPeriod = now < launchDate;
    const BETA_DAILY_LIMIT = 5;
    const FREE_LIFETIME_LIMIT = 3;
    const PREMIUM_DAILY_LIMIT = 15;
    
    let messagesRemaining, messagesLimit;
    
    if (isBetaPeriod) {
      messagesRemaining = BETA_DAILY_LIMIT - user.aiUsage.count;
      messagesLimit = BETA_DAILY_LIMIT;
    } else if (user.isPremium) {
      messagesRemaining = PREMIUM_DAILY_LIMIT - user.aiUsage.count;
      messagesLimit = PREMIUM_DAILY_LIMIT;
    } else {
      messagesRemaining = FREE_LIFETIME_LIMIT - user.aiUsage.lifetimeCount;
      messagesLimit = FREE_LIFETIME_LIMIT;
    }

    console.log(`✅ AI response sent to ${username}. Messages remaining: ${messagesRemaining}`);

    res.json({ 
      response: aiResponse,
      messagesRemaining,
      messagesUsed: user.aiUsage.count,
      messagesLimit,
      isBetaPeriod,
      resetsAt: isBetaPeriod || user.isPremium ? 'midnight (your timezone)' : null
    });

  } catch (err) {
    console.error('❌ AI Chat error:', err);
    
    // Handle specific Anthropic errors
    if (err.status === 429) {
      return res.status(429).json({ error: 'AI service rate limited. Please try again in a moment.' });
    }
    if (err.status === 401) {
      return res.status(500).json({ error: 'AI service authentication error' });
    }
    
    res.status(500).json({ error: 'Failed to get AI response' });
  }
});

// Get AI usage stats for user
app.get('/api/ai/usage', authenticate, async (req, res) => {
  try {
    const user = await User.findOne({ username: req.user.username });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const now = new Date();
    
    // Get user's local date based on their timezone
    const userTimezone = user.notificationPreferences?.timezone || 'America/New_York';
    const userLocalDate = new Intl.DateTimeFormat('en-CA', { 
      timeZone: userTimezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(now);
    
    // Reset daily count if it's a new day in user's timezone
    if (!user.aiUsage || user.aiUsage.date !== userLocalDate) {
      user.aiUsage = { 
        date: userLocalDate, 
        count: 0,
        lifetimeCount: user.aiUsage?.lifetimeCount || 0
      };
      await user.save();
    }

    // Check if beta period
    const launchDate = new Date('2025-02-18T00:00:00Z');
    const isBetaPeriod = now < launchDate;
    
    const BETA_DAILY_LIMIT = 5;
    const FREE_LIFETIME_LIMIT = 3;
    const PREMIUM_DAILY_LIMIT = 15;

    let messagesUsed, messagesLimit, messagesRemaining, resetsAt;

    if (isBetaPeriod) {
      messagesUsed = user.aiUsage.count || 0;
      messagesLimit = BETA_DAILY_LIMIT;
      messagesRemaining = BETA_DAILY_LIMIT - messagesUsed;
      resetsAt = 'midnight (your timezone)';
    } else if (user.isPremium) {
      messagesUsed = user.aiUsage.count || 0;
      messagesLimit = PREMIUM_DAILY_LIMIT;
      messagesRemaining = PREMIUM_DAILY_LIMIT - messagesUsed;
      resetsAt = 'midnight (your timezone)';
    } else {
      messagesUsed = user.aiUsage.lifetimeCount || 0;
      messagesLimit = FREE_LIFETIME_LIMIT;
      messagesRemaining = FREE_LIFETIME_LIMIT - messagesUsed;
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
// MOUNT ROUTES
// ============================================
app.use('/api/notifications', notificationRoutes);
app.use('/api/auth', googleAuthRoutes);
app.use('/api/auth', discordAuthRoutes);
app.use('/api/ml', mlRoutes);

// Serve frontend build in production
if (process.env.NODE_ENV === 'production') {
  const path = require('path');
  app.use(express.static(path.join(__dirname, '../build')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../build', 'index.html'));
  });
}

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));