// server/routes/oracleIntroRoutes.js
// Oracle First Contact — streams a Sonnet-generated intro when user first opens Oracle
// Fires ONCE per user (needsOracleIntro flag). Does NOT count against weekly message limit.
// Uses same SSE format as /api/ai/chat/stream so AIChat.js streaming code works unchanged.

const express = require('express');
const router = express.Router();
const Anthropic = require('@anthropic-ai/sdk');
const User = require('../models/User');
const { getLunarData } = require('../utils/lunarData');

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const INTRO_MODEL = process.env.ORACLE_MODEL || 'claude-sonnet-4-5-20250929';

/**
 * Calculate streak from startDate (same logic as app.js buildOracleContext)
 */
function calcStreak(startDate, timezone) {
  if (!startDate) return 1;
  const tz = timezone || 'UTC';
  
  // Parse start date
  let y, m, d;
  const sd = typeof startDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(startDate)
    ? startDate : null;
  if (sd) {
    [y, m, d] = sd.split('-').map(Number);
  } else {
    const dt = new Date(startDate);
    y = dt.getUTCFullYear();
    m = dt.getUTCMonth() + 1;
    d = dt.getUTCDate();
  }

  // Get today in user's timezone
  const nowStr = new Date().toLocaleDateString('en-CA', { timeZone: tz });
  const [ty, tm, td] = nowStr.split('-').map(Number);

  const start = new Date(y, m - 1, d);
  const today = new Date(ty, tm - 1, td);
  const diff = Math.floor((today - start) / (1000 * 60 * 60 * 24));
  return Math.max(1, diff + 1);
}

// ============================================================
// POST /api/oracle/intro/stream
// Streams Oracle's first-contact message via SSE
// Called by AIChat.js when user opens Oracle for the first time
// ============================================================
router.post('/stream', async (req, res) => {
  try {
    const username = req.user.username;
    const { timezone } = req.body;
    const user = await User.findOne({ username }).select('startDate needsOracleIntro currentStreak').lean();

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Guard: only fire once
    if (!user.needsOracleIntro) {
      return res.status(200).json({ skip: true, reason: 'already_introduced' });
    }

    // Guard: need a start date to say anything meaningful
    if (!user.startDate) {
      return res.status(200).json({ skip: true, reason: 'no_start_date' });
    }

    // Compute context
    const streak = calcStreak(user.startDate, timezone);
    const cycleDay = ((streak - 1) % 74) + 1;
    let cyclePhase;
    if (cycleDay <= 16) cyclePhase = 'Mitotic division (stem cells multiplying)';
    else if (cycleDay <= 40) cyclePhase = 'Meiotic division (deep cellular transformation)';
    else if (cycleDay <= 64) cyclePhase = 'Maturation (peak nutrient retention and reabsorption)';
    else cyclePhase = 'Complete reabsorption (highest transmutation potential)';

    const cycleNumber = Math.floor((streak - 1) / 74) + 1;

    // Moon phase
    let moonPhase = 'unknown';
    try {
      const lunar = getLunarData();
      moonPhase = lunar.label || lunar.phase || 'unknown';
    } catch { /* non-blocking */ }

    // Time of day
    const tz = timezone || 'UTC';
    const hourStr = new Date().toLocaleTimeString('en-US', { timeZone: tz, hour: 'numeric', hour12: false });
    const hour = parseInt(hourStr, 10);
    let timeOfDay;
    if (hour >= 5 && hour < 12) timeOfDay = 'morning';
    else if (hour >= 12 && hour < 17) timeOfDay = 'afternoon';
    else if (hour >= 17 && hour < 21) timeOfDay = 'evening';
    else timeOfDay = 'late night';

    // Emotional phase
    let emotionalPhase;
    if (streak <= 14) emotionalPhase = 'Initial Adaptation';
    else if (streak <= 45) emotionalPhase = 'Emotional Processing';
    else if (streak <= 90) emotionalPhase = 'Mental Expansion';
    else if (streak <= 180) emotionalPhase = 'Integration & Growth';
    else emotionalPhase = 'Mastery & Purpose';

    // Set up SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    // Generate via Sonnet (streaming)
    const stream = anthropic.messages.stream({
      model: INTRO_MODEL,
      max_tokens: 200,
      system: `You are The Oracle, the AI guide inside TitanTrack, a semen retention tracking app. This is the FIRST time this user has opened Oracle. You are speaking first. They did not ask you anything.

YOUR TASK: Observe where they are RIGHT NOW and name something about their biology they probably don't know. Connect two data points they wouldn't connect themselves. End with something that invites them to respond or log data, so you can start seeing their patterns.

DATA AVAILABLE:
- Day ${streak} of their streak (cycle ${cycleNumber}, day ${cycleDay}/74)
- Spermatogenesis phase: ${cyclePhase}
- Emotional phase: ${emotionalPhase}
- Current moon: ${moonPhase}
- Time: ${timeOfDay}

VOICE RULES:
- 2-4 sentences max. Short, precise.
- Do NOT introduce yourself. Do NOT say "welcome." Do NOT say "I'm Oracle."
- Do NOT list features or pitch TitanTrack.
- Start with the observation. State it like a fact.
- NEVER use em dashes. Use periods and commas.
- No validation, no encouragement, no motivation. Just observation and mechanism.
- Speak TO them, never about them in third person.`,
      messages: [{
        role: 'user',
        content: 'Generate the first-contact observation now.'
      }]
    });

    let fullText = '';

    stream.on('text', (text) => {
      fullText += text;
      res.write(`data: ${JSON.stringify({ type: 'content', text })}\n\n`);
    });

    stream.on('end', async () => {
      // Flip the flag — never fire again
      await User.updateOne({ username }, { $set: { needsOracleIntro: false } });

      res.write('data: [DONE]\n\n');
      res.end();

      console.log(`🔮 Oracle intro delivered to ${username} (Day ${streak}): "${fullText.substring(0, 80)}..."`);
    });

    stream.on('error', (err) => {
      console.error(`[OracleIntro] Stream error for ${username}:`, err.message);
      res.write(`data: ${JSON.stringify({ type: 'error', message: 'Oracle intro failed' })}\n\n`);
      res.end();
    });

    // Handle client disconnect
    req.on('close', () => {
      stream.abort();
    });

  } catch (err) {
    console.error('[OracleIntro] Error:', err.message);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Intro generation failed' });
    }
  }
});

module.exports = router;
