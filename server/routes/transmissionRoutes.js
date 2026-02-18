// server/routes/transmissionRoutes.js
// API endpoint for generating daily transmissions using Claude Haiku

const express = require('express');
const router = express.Router();
const Anthropic = require('@anthropic-ai/sdk');
const User = require('../models/User');
const {
  CORE_WISDOM,
  PHASE_WISDOM,
  POST_RELAPSE_WISDOM,
  BENEFIT_TREND_CONTEXT,
  getPhaseFromStreak,
  getPhaseDisplayName,
  getSpecialDayWisdom,
  getStreakBreakdown
} = require('../data/transmissionWisdom');

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// ============================================================
// HELPER: Build the prompt for Haiku
// ============================================================

const buildTransmissionPrompt = (userData) => {
  const {
    currentStreak,
    relapseCount,
    longestStreak,
    benefitTracking,
    startDate
  } = userData;

  const streak = currentStreak || 1;
  const phase = getPhaseFromStreak(streak);
  const phaseName = getPhaseDisplayName(phase);
  const isPostRelapse = relapseCount > 0 && streak <= 7;
  const specialDayWisdom = getSpecialDayWisdom(streak);
  const streakBreakdown = getStreakBreakdown(streak);

  // Calculate benefit trends if data exists
  let benefitTrends = null;
  if (benefitTracking && benefitTracking.length >= 3) {
    const recent = benefitTracking.slice(-7);
    const metrics = ['energy', 'focus', 'confidence', 'aura', 'sleep', 'workout'];
    benefitTrends = {};
    
    metrics.forEach(metric => {
      const values = recent.map(b => b[metric]).filter(v => v !== undefined);
      if (values.length >= 2) {
        const first = values.slice(0, Math.floor(values.length / 2));
        const second = values.slice(Math.floor(values.length / 2));
        const firstAvg = first.reduce((a, b) => a + b, 0) / first.length;
        const secondAvg = second.reduce((a, b) => a + b, 0) / second.length;
        const diff = secondAvg - firstAvg;
        
        if (diff > 0.5) benefitTrends[metric] = 'rising';
        else if (diff < -0.5) benefitTrends[metric] = 'falling';
        else benefitTrends[metric] = 'stable';
      }
    });
  }

  // Build the system prompt - guidance not hard constraints
  let systemPrompt = `You are generating a daily transmission for a semen retention practitioner.

Write 2-3 sentences of wisdom for Day ${streak}. Start with "**Day ${streak}.**" followed by your insight.

Keep it grounded and practical. Reference their specific phase and benefits when relevant. No fluff.

${CORE_WISDOM}

${PHASE_WISDOM[phase]}
`;

  // Add special day wisdom if applicable
  if (specialDayWisdom) {
    systemPrompt += `\n${specialDayWisdom}\n`;
  }

  // Add post-relapse context if applicable
  if (isPostRelapse) {
    systemPrompt += `\n${POST_RELAPSE_WISDOM}\n`;
  }

  // Add benefit trend context if data exists
  if (benefitTrends && Object.keys(benefitTrends).length > 0) {
    systemPrompt += `\n${BENEFIT_TREND_CONTEXT}\n`;
  }

  // Build user context message - keep simple, constraints are in system prompt
  let userContext = `Generate transmission for Day ${streak} (${phaseName}).`;

  if (streakBreakdown) {
    userContext += ` ${streakBreakdown}.`;
  }

  if (longestStreak && longestStreak > streak) {
    userContext += ` Previous best: ${longestStreak} days.`;
  }

  if (isPostRelapse) {
    userContext += ` Recently relapsed, now recovering.`;
  }

  if (benefitTrends && Object.keys(benefitTrends).length > 0) {
    const rising = Object.entries(benefitTrends)
      .filter(([_, trend]) => trend === 'rising')
      .map(([metric]) => metric);
    if (rising.length > 0) {
      userContext += ` Rising: ${rising.join(', ')}.`;
    }
  }

  return { systemPrompt, userContext };
};

// ============================================================
// HELPER: Calculate current streak from startDate (timezone-aware)
// This ensures transmission always shows correct day in user's timezone
// ============================================================

const calculateStreakFromStartDate = (startDate, timezone = 'UTC') => {
  if (!startDate) return 1;
  
  // Get current date in user's timezone
  const now = new Date();
  const userNow = new Date(now.toLocaleString('en-US', { timeZone: timezone }));
  
  // Get start date in user's timezone
  const start = new Date(startDate);
  const userStart = new Date(start.toLocaleString('en-US', { timeZone: timezone }));
  
  // Reset time portions for accurate day calculation
  userStart.setHours(0, 0, 0, 0);
  userNow.setHours(0, 0, 0, 0);
  
  const diffTime = userNow.getTime() - userStart.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  // Return at least 1 (day 1 is the start day)
  return Math.max(1, diffDays + 1);
};

// ============================================================
// HELPER: Post-process transmission to ensure quality
// - Ensures proper punctuation
// - Ensures "Day X." format at start
// - Lets Haiku complete its thought (no arbitrary sentence cap)
// ============================================================

const postProcessTransmission = (text, streak) => {
  if (!text) return `**Day ${streak}.** Your journey continues. Trust the process.`;
  
  let cleaned = text.trim();
  
  // Ensure it starts with **Day X.** format - strip any existing
  const dayPattern = /^\*?\*?Day\s*\d[\d,]*\.?\*?\*?\.?\s*/i;
  cleaned = cleaned.replace(dayPattern, '');
  
  // Ensure text ends with punctuation
  if (cleaned && !/[.!?]$/.test(cleaned)) {
    cleaned += '.';
  }
  
  // If no content, use fallback
  if (!cleaned) {
    return `**Day ${streak}.** Your energy builds with each passing day. Trust the process.`;
  }
  
  return `**Day ${streak}.** ${cleaned}`;
};

// ============================================================
// HELPER: Check if transmission should be regenerated
// ============================================================

const shouldRegenerateTransmission = (cachedTransmission, currentStreak, timezone = 'UTC') => {
  if (!cachedTransmission) return true;
  
  const { generatedAt, forStreak } = cachedTransmission;
  
  // Regenerate if streak changed (relapse or date picker change)
  if (forStreak !== currentStreak) return true;
  
  // Regenerate if it's a new day in user's timezone
  const now = new Date();
  const userNow = new Date(now.toLocaleString('en-US', { timeZone: timezone }));
  const generatedDate = new Date(generatedAt);
  const userGenerated = new Date(generatedDate.toLocaleString('en-US', { timeZone: timezone }));
  
  return userNow.toDateString() !== userGenerated.toDateString();
};

// ============================================================
// GET /api/transmission
// Returns cached transmission or generates new one
// ============================================================

router.get('/', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const token = authHeader.split(' ')[1];
    const jwt = require('jsonwebtoken');
    const jwtSecret = process.env.JWT_SECRET || 'rossbased_secret_key';
    
    let decoded;
    try {
      decoded = jwt.verify(token, jwtSecret);
    } catch (err) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const user = await User.findOne({ username: decoded.username });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get timezone from query param (sent by frontend)
    const timezone = req.query.timezone || 'America/New_York';

    // Calculate current streak dynamically from startDate in user's timezone
    // This ensures transmission always shows correct day
    const currentStreak = user.startDate 
      ? calculateStreakFromStartDate(user.startDate, timezone)
      : (user.currentStreak || 1);

    // Check if we have a valid cached transmission
    if (!shouldRegenerateTransmission(user.dailyTransmission, currentStreak, timezone)) {
      console.log(`📦 Returning cached transmission for ${user.username}`);
      return res.json({
        transmission: user.dailyTransmission.text,
        cached: true,
        generatedAt: user.dailyTransmission.generatedAt,
        phase: getPhaseDisplayName(getPhaseFromStreak(currentStreak)),
        streakBreakdown: getStreakBreakdown(currentStreak)
      });
    }

    // Generate new transmission
    console.log(`✨ Generating new transmission for ${user.username} (Day ${currentStreak})`);
    
    const { systemPrompt, userContext } = buildTransmissionPrompt({
      currentStreak: currentStreak,
      relapseCount: user.relapseCount,
      longestStreak: user.longestStreak,
      benefitTracking: user.benefitTracking,
      startDate: user.startDate
    });

    const response = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 200,  // Let Haiku write complete thoughts
      system: systemPrompt,
      messages: [
        { role: 'user', content: userContext }
      ]
    });

    const rawText = response.content[0].text.trim();
    const transmissionText = postProcessTransmission(rawText, currentStreak);

    // Cache the transmission
    user.dailyTransmission = {
      text: transmissionText,
      generatedAt: new Date(),
      forStreak: currentStreak,
      phase: getPhaseFromStreak(currentStreak)
    };
    await user.save({ validateModifiedOnly: true });

    console.log(`✅ Transmission generated and cached for ${user.username}`);

    res.json({
      transmission: transmissionText,
      cached: false,
      generatedAt: user.dailyTransmission.generatedAt,
      phase: getPhaseDisplayName(getPhaseFromStreak(currentStreak)),
      streakBreakdown: getStreakBreakdown(currentStreak)
    });

  } catch (error) {
    console.error('Transmission generation error:', error);
    
    // Return a fallback transmission if API fails
    res.status(500).json({ 
      error: 'Failed to generate transmission',
      fallback: true,
      transmission: "Your journey continues. Every day builds upon the last."
    });
  }
});

// ============================================================
// POST /api/transmission/regenerate
// Force regenerate transmission (for testing or after streak change)
// ============================================================

router.post('/regenerate', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const token = authHeader.split(' ')[1];
    const jwt = require('jsonwebtoken');
    const jwtSecret = process.env.JWT_SECRET || 'rossbased_secret_key';
    
    let decoded;
    try {
      decoded = jwt.verify(token, jwtSecret);
    } catch (err) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const user = await User.findOne({ username: decoded.username });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Calculate current streak dynamically from startDate
    const currentStreak = user.startDate 
      ? calculateStreakFromStartDate(user.startDate)
      : (user.currentStreak || 1);
    
    console.log(`🔄 Force regenerating transmission for ${user.username} (Day ${currentStreak})`);
    
    const { systemPrompt, userContext } = buildTransmissionPrompt({
      currentStreak: currentStreak,
      relapseCount: user.relapseCount,
      longestStreak: user.longestStreak,
      benefitTracking: user.benefitTracking,
      startDate: user.startDate
    });

    const response = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 200,  // Let Haiku write complete thoughts
      system: systemPrompt,
      messages: [
        { role: 'user', content: userContext }
      ]
    });

    const rawText = response.content[0].text.trim();
    const transmissionText = postProcessTransmission(rawText, currentStreak);

    // Update cache
    user.dailyTransmission = {
      text: transmissionText,
      generatedAt: new Date(),
      forStreak: currentStreak,
      phase: getPhaseFromStreak(currentStreak)
    };
    await user.save({ validateModifiedOnly: true });

    res.json({
      transmission: transmissionText,
      cached: false,
      generatedAt: user.dailyTransmission.generatedAt,
      phase: getPhaseDisplayName(getPhaseFromStreak(currentStreak)),
      streakBreakdown: getStreakBreakdown(currentStreak)
    });

  } catch (error) {
    console.error('Transmission regeneration error:', error);
    res.status(500).json({ error: 'Failed to regenerate transmission' });
  }
});

// ============================================================
// POST /api/transmission/synthesis
// AI-generated synthesis of all alignment data
// Called by EnergyAlmanac with calculated alignment values
// ============================================================

router.post('/synthesis', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const token = authHeader.split(' ')[1];
    const jwt = require('jsonwebtoken');
    const jwtSecret = process.env.JWT_SECRET || 'rossbased_secret_key';
    
    let decoded;
    try {
      decoded = jwt.verify(token, jwtSecret);
    } catch (err) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const user = await User.findOne({ username: decoded.username });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const { streakDays, sperma, moon, personalDay, zodiac } = req.body;

    // Check cache — only regenerate once per day per user
    const timezone = req.body.timezone || 'America/New_York';
    const now = new Date();
    const userNow = new Date(now.toLocaleString('en-US', { timeZone: timezone }));
    
    if (user.dailySynthesis?.generatedAt) {
      const genDate = new Date(user.dailySynthesis.generatedAt);
      const userGen = new Date(genDate.toLocaleString('en-US', { timeZone: timezone }));
      if (userNow.toDateString() === userGen.toDateString() && user.dailySynthesis.forStreak === streakDays) {
        return res.json({ synthesis: user.dailySynthesis.text, cached: true });
      }
    }

    // Build a focused synthesis prompt with ALL alignment data
    const synthesisPrompt = `You synthesize alignment data into one powerful, specific daily insight for a semen retention practitioner.

You receive concrete data points. Your job: weave them into 2-3 sentences that feel like a personalized daily briefing. Be SPECIFIC — reference the actual numbers, phases, and alignments. No generic motivation.

RULES:
- Start with "Day ${streakDays}."
- 2-3 sentences MAX. Tight, specific, actionable
- Reference at least 2-3 data points naturally woven together
- Speak as a knowing guide, not a horoscope
- No fluff, no "channel your energy" without context
- Connect the dots between the data — that's the whole point`;

    let userData = `ALIGNMENT DATA FOR TODAY:

STREAK: Day ${streakDays}

SPERMATOGENESIS: Day ${sperma.position} of ${sperma.cycleLength} (Cycle ${sperma.cycleNumber})
Phase: ${sperma.phase}
Note: ${sperma.description}`;

    userData += `

LUNAR: ${moon.phase} (${moon.illumination}% illuminated)
Energy: ${moon.energy}`;

    if (personalDay) {
      userData += `

PERSONAL DAY: ${personalDay.number} — ${personalDay.theme}
Guidance: ${personalDay.guidance}`;
    }

    if (zodiac) {
      userData += `

CHINESE ZODIAC: ${zodiac.element} ${zodiac.animal} (${zodiac.yinYang})
Current Year: ${zodiac.currentAnimal} year
Year Type: ${zodiac.yearType}
Energy: ${zodiac.yearEnergy}`;
    }

    userData += `

Generate the synthesis now.`;

    console.log(`🔮 Generating synthesis for ${user.username} (Day ${streakDays})`);

    const response = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 150,
      system: synthesisPrompt,
      messages: [{ role: 'user', content: userData }]
    });

    const synthesisText = response.content[0].text.trim();

    // Cache it
    user.dailySynthesis = {
      text: synthesisText,
      generatedAt: new Date(),
      forStreak: streakDays
    };
    await user.save({ validateModifiedOnly: true });

    console.log(`✅ Synthesis generated for ${user.username}`);
    res.json({ synthesis: synthesisText, cached: false });

  } catch (error) {
    console.error('Synthesis generation error:', error);
    res.status(500).json({ error: 'Failed to generate synthesis' });
  }
});

module.exports = router;
