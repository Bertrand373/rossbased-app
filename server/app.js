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
const transmissionRoutes = require('./routes/transmissionRoutes');
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

// AI Chat Endpoint
app.post('/api/ai-chat', authenticate, async (req, res) => {
  const { messages, userContext, timezone } = req.body;
  
  try {
    // Get user for usage tracking
    const user = await User.findOne({ username: req.user.username });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Use timezone from request, or default to UTC
    const userTimezone = timezone || 'UTC';
    const now = new Date();
    
    // Get current date in user's timezone
    const userLocalDate = new Date(now.toLocaleString('en-US', { timeZone: userTimezone }))
      .toISOString().split('T')[0];
    
    // Get stored date (might be from different timezone)
    const storedDate = user.aiUsage?.date || '';
    
    // Reset daily count if it's a new day in user's timezone
    const isNewDay = storedDate !== userLocalDate;
    const currentCount = isNewDay ? 0 : (user.aiUsage?.count || 0);
    const currentLifetime = user.aiUsage?.lifetimeCount || 0;

    // Check if beta period (before Feb 18, 2026)
    const launchDate = new Date('2026-02-18T00:00:00Z');
    const isBetaPeriod = now < launchDate;
    
    // Define limits
    const BETA_DAILY_LIMIT = 5;
    const FREE_LIFETIME_LIMIT = 3;
    const PREMIUM_DAILY_LIMIT = 15;

    // Check limits based on period and premium status
    if (isBetaPeriod) {
      // Beta period: 5 daily messages for everyone
      if (currentCount >= BETA_DAILY_LIMIT) {
        return res.status(429).json({ 
          error: 'Daily limit reached',
          message: `You've used all ${BETA_DAILY_LIMIT} daily messages. Resets at midnight.`,
          limit: BETA_DAILY_LIMIT,
          used: currentCount,
          resetsAt: 'midnight'
        });
      }
    } else if (user.isPremium) {
      // Premium users: 15 daily messages
      if (currentCount >= PREMIUM_DAILY_LIMIT) {
        return res.status(429).json({ 
          error: 'Daily limit reached',
          message: `You've used all ${PREMIUM_DAILY_LIMIT} daily messages. Resets at midnight.`,
          limit: PREMIUM_DAILY_LIMIT,
          used: currentCount,
          resetsAt: 'midnight'
        });
      }
    } else {
      // Free users post-launch: 3 lifetime messages
      if (currentLifetime >= FREE_LIFETIME_LIMIT) {
        return res.status(429).json({ 
          error: 'Free limit reached',
          message: `Free users get ${FREE_LIFETIME_LIMIT} AI messages total. Upgrade to Premium for unlimited access.`,
          limit: FREE_LIFETIME_LIMIT,
          used: currentLifetime,
          isPremiumRequired: true
        });
      }
    }

    // Build system prompt with user context
    const systemPrompt = `You are the AI Mentor for TitanTrack, a semen retention tracking app. You are wise, supportive, and understanding of the challenges men face on this journey.

USER CONTEXT:
${userContext || 'No specific context provided.'}

GUIDELINES:
- Be supportive but honest - don't sugarcoat, but don't be harsh
- Reference their specific data when relevant (streak, benefits, patterns)
- Acknowledge the difficulty of this practice
- Provide practical, actionable advice
- Keep responses concise but meaningful (2-4 paragraphs max)
- Never judge relapses - treat them as learning opportunities
- Use "you" not "the user" - speak directly to them
- If they're struggling, acknowledge the feeling first before advice
- You can reference specific days/milestones from their journey`;

    // Call Claude API
    const response = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 500,
      system: systemPrompt,
      messages: messages
    });

    const assistantMessage = response.content[0].text;

    // Update usage tracking
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

    // Calculate remaining messages for response
    let messagesRemaining;
    if (isBetaPeriod) {
      messagesRemaining = BETA_DAILY_LIMIT - (currentCount + 1);
    } else if (user.isPremium) {
      messagesRemaining = PREMIUM_DAILY_LIMIT - (currentCount + 1);
    } else {
      messagesRemaining = FREE_LIFETIME_LIMIT - (currentLifetime + 1);
    }

    res.json({ 
      message: assistantMessage,
      usage: {
        messagesRemaining,
        isBetaPeriod,
        isPremium: user.isPremium || false
      }
    });
  } catch (err) {
    console.error('AI Chat error:', err);
    res.status(500).json({ error: 'Failed to get AI response' });
  }
});

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
    const PREMIUM_DAILY_LIMIT = 15;

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

    // Build user context from their data
    const streakDays = user.currentStreak || 0;
    const userContext = `Current streak: ${streakDays} days. Longest streak: ${user.longestStreak || 0} days. Total relapses: ${user.relapseCount || 0}.`;

    const systemPrompt = `You are The Oracle, the AI guide for TitanTrack, a semen retention tracking app.

USER CONTEXT:
${userContext}

## CORE BEHAVIOR: MATCH THEIR ENERGY

**The golden rule: Your response length must mirror theirs.** Short message = short response. Detailed question = detailed answer. This is non-negotiable.

### LENGTH CALIBRATION (follow strictly)

**ONE WORD / ONE LINE responses for:**
- "thanks" → "Anytime."
- "got it" → "Good."
- "ok" → "Noted."
- "cool" → "Indeed."
- Simple acknowledgments → 1-5 words MAX

**ONE TO TWO SENTENCES for:**
- "how are you?" → Brief, then pivot or stop
- "what day am I on?" → State the fact
- "is this normal?" → Yes/no + one line context
- Simple questions with simple answers

**TWO TO THREE SENTENCES for:**
- Sharing a struggle briefly
- Asking for quick advice
- Status updates

**FULL DEPTH (3-4 paragraphs) ONLY when:**
- They ask "can you explain..."
- They share a detailed personal situation
- They explicitly request more information
- Complex emotional processing after relapse

## TONE

- Grounded, not preachy
- Wise mentor, not chatty therapist  
- No filler phrases ("I'm so glad you asked!", "That's a great question!")
- No over-validation or excessive praise
- Confident and direct
- Use their name sparingly, not every message

## HARD RULES

1. NEVER end with a question unless you literally cannot help without clarification
2. NEVER pad responses with unnecessary encouragement
3. NEVER repeat what they just said back to them
4. Match their energy - if they're brief, you're brief
5. Deliver value and stop`;

    // Build messages array
    const messages = [
      ...(conversationHistory || []),
      { role: 'user', content: message }
    ];

    // Set up SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // Stream from Claude with natural pacing
    const stream = await anthropic.messages.stream({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      system: systemPrompt,
      messages: messages
    });

    // Small delay helper for natural pacing
    const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta?.text) {
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
// MOUNT ROUTES
// ============================================
app.use('/api/notifications', notificationRoutes);
app.use('/api/auth', googleAuthRoutes);
app.use('/api/auth', discordAuthRoutes);
app.use('/api/ml', mlRoutes);
app.use('/api/transmission', transmissionRoutes);

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
