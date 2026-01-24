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

  // Build the system prompt - LENGTH CONSTRAINTS FIRST (most important)
  let systemPrompt = `OUTPUT FORMAT (STRICTLY ENFORCED):
- EXACTLY 2 sentences total
- Maximum 120 characters (including "**Day X.**")
- Start with "**Day ${streak}.**" then one insight sentence, then one closing sentence
- STOP after 2 sentences. Do not write a third sentence.

GOOD: "**Day 45.** The flatline tests your resolve while your body repairs. Trust the process."
BAD: Writing 3+ sentences or exceeding 120 characters.

You are generating a daily transmission for a semen retention practitioner.

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
// HELPER: Check if transmission should be regenerated
// ============================================================

const shouldRegenerateTransmission = (cachedTransmission, currentStreak) => {
  if (!cachedTransmission) return true;
  
  const { generatedAt, forStreak } = cachedTransmission;
  
  // Regenerate if streak changed (relapse or date picker change)
  if (forStreak !== currentStreak) return true;
  
  // Regenerate if it's a new day
  const generatedDate = new Date(generatedAt).toDateString();
  const today = new Date().toDateString();
  
  return generatedDate !== today;
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

    const currentStreak = user.currentStreak || 1;

    // Check if we have a valid cached transmission
    if (!shouldRegenerateTransmission(user.dailyTransmission, currentStreak)) {
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
      currentStreak: user.currentStreak,
      relapseCount: user.relapseCount,
      longestStreak: user.longestStreak,
      benefitTracking: user.benefitTracking,
      startDate: user.startDate
    });

    const response = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 60,  // Reduced from 100 to enforce brevity
      system: systemPrompt,
      messages: [
        { role: 'user', content: userContext }
      ]
    });

    const transmissionText = response.content[0].text.trim();

    // Cache the transmission
    user.dailyTransmission = {
      text: transmissionText,
      generatedAt: new Date(),
      forStreak: currentStreak,
      phase: getPhaseFromStreak(currentStreak)
    };
    await user.save();

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

    const currentStreak = user.currentStreak || 1;
    
    console.log(`🔄 Force regenerating transmission for ${user.username} (Day ${currentStreak})`);
    
    const { systemPrompt, userContext } = buildTransmissionPrompt({
      currentStreak: user.currentStreak,
      relapseCount: user.relapseCount,
      longestStreak: user.longestStreak,
      benefitTracking: user.benefitTracking,
      startDate: user.startDate
    });

    const response = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 60,  // Reduced from 100 to enforce brevity
      system: systemPrompt,
      messages: [
        { role: 'user', content: userContext }
      ]
    });

    const transmissionText = response.content[0].text.trim();

    // Update cache
    user.dailyTransmission = {
      text: transmissionText,
      generatedAt: new Date(),
      forStreak: currentStreak,
      phase: getPhaseFromStreak(currentStreak)
    };
    await user.save();

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

module.exports = router;
