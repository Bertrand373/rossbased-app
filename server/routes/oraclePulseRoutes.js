// server/routes/oraclePulseRoutes.js
// Oracle Pulse — daily observation on the Tracker hero screen
// Free: community-level (same for all free users, cached in memory)
// Premium/OG: personalized (cached on user doc, once per day per user)

const express = require('express');
const router = express.Router();
const Anthropic = require('@anthropic-ai/sdk');
const User = require('../models/User');

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const PULSE_MODEL = 'claude-haiku-4-5-20251001';

// In-memory cache for community observation (shared across all free users)
let communityPulseCache = { text: null, date: null, generatedAt: null };

// ============================================================
// GET /api/oracle/pulse
// Returns today's Oracle observation for the requesting user
// ============================================================
router.get('/', async (req, res) => {
  try {
    const jwt = require('jsonwebtoken');
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'Unauthorized' });

    const token = authHeader.split(' ')[1];
    const jwtSecret = process.env.JWT_SECRET || 'rossbased_secret_key';
    let decoded;
    try { decoded = jwt.verify(token, jwtSecret); } catch { return res.status(401).json({ error: 'Invalid token' }); }

    const user = await User.findOne({ username: decoded.username })
      .select('username startDate currentStreak benefitTracking oracleNotes oraclePulse subscription isPremium')
      .lean();
    if (!user) return res.status(404).json({ error: 'User not found' });

    const timezone = req.query.timezone || 'America/New_York';
    const now = new Date();
    const userNow = new Date(now.toLocaleString('en-US', { timeZone: timezone }));
    const todayStr = userNow.toISOString().split('T')[0];

    // Determine premium status
    const sub = user.subscription || {};
    const hasPremium = user.isPremium || sub.status === 'active' || sub.status === 'grandfathered' || sub.status === 'trialing';

    // ── PERSONALIZED (premium/OG) ──
    if (hasPremium) {
      // Check cache on user doc
      if (user.oraclePulse?.date === todayStr && user.oraclePulse?.text) {
        return res.json({
          observation: user.oraclePulse.text,
          generatedAt: user.oraclePulse.generatedAt,
          tier: 'personalized',
          cached: true
        });
      }

      const observation = await generatePersonalizedPulse(user, timezone);

      // Cache on user doc
      await User.updateOne(
        { _id: user._id },
        { $set: { oraclePulse: { text: observation, date: todayStr, generatedAt: new Date() } } }
      );

      return res.json({
        observation,
        generatedAt: new Date().toISOString(),
        tier: 'personalized',
        cached: false
      });
    }

    // ── COMMUNITY (free users) ──
    if (communityPulseCache.date === todayStr && communityPulseCache.text) {
      return res.json({
        observation: communityPulseCache.text,
        generatedAt: communityPulseCache.generatedAt,
        tier: 'community',
        cached: true
      });
    }

    const observation = await generateCommunityPulse();
    communityPulseCache = { text: observation, date: todayStr, generatedAt: new Date().toISOString() };

    return res.json({
      observation,
      generatedAt: communityPulseCache.generatedAt,
      tier: 'community',
      cached: false
    });

  } catch (err) {
    console.error('[OraclePulse] Error:', err.message);
    res.status(500).json({ error: 'Failed to generate observation' });
  }
});


// ============================================================
// PERSONALIZED OBSERVATION
// Uses: benefit trends, sperma phase, oracle notes, streak
// ============================================================
async function generatePersonalizedPulse(user, timezone) {
  // Compute streak from startDate
  let streak = user.currentStreak || 0;
  if (user.startDate) {
    const parse = (s) => {
      if (typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s)) {
        const [y, m, d] = s.split('-').map(Number);
        return new Date(y, m - 1, d);
      }
      const d = new Date(s); d.setHours(0, 0, 0, 0); return d;
    };
    const start = parse(user.startDate);
    const today = new Date();
    const userToday = new Date(today.toLocaleString('en-US', { timeZone: timezone }));
    userToday.setHours(0, 0, 0, 0);
    streak = Math.max(1, Math.floor((userToday - start) / (1000 * 60 * 60 * 24)) + 1);
  }

  // Spermatogenesis phase
  const cycleDay = ((streak - 1) % 74) + 1;
  let spermaPhase;
  if (cycleDay <= 16) spermaPhase = 'Mitotic Division (stem cells multiplying) — days 1-16';
  else if (cycleDay <= 40) spermaPhase = 'Meiotic Division (deep cellular transformation) — days 17-40';
  else if (cycleDay <= 64) spermaPhase = 'Maturation (peak nutrient retention) — days 41-64';
  else spermaPhase = 'Complete Reabsorption (highest transmutation potential) — days 65-74';

  // Benefit trends (last 7 vs prior 7)
  let benefitContext = 'No benefit data logged yet.';
  if (user.benefitTracking && user.benefitTracking.length >= 2) {
    const sorted = [...user.benefitTracking].sort((a, b) => new Date(b.date) - new Date(a.date));
    const recent = sorted.slice(0, 7);
    const prior = sorted.slice(7, 14);
    const metrics = ['energy', 'focus', 'confidence', 'aura', 'sleep', 'workout'];
    const parts = [];

    metrics.forEach(m => {
      const recentVals = recent.map(e => e[m]).filter(v => v != null);
      const priorVals = prior.map(e => e[m]).filter(v => v != null);
      if (recentVals.length > 0) {
        const recentAvg = Math.round((recentVals.reduce((a, b) => a + b, 0) / recentVals.length) * 10) / 10;
        if (priorVals.length > 0) {
          const priorAvg = Math.round((priorVals.reduce((a, b) => a + b, 0) / priorVals.length) * 10) / 10;
          const diff = Math.round((recentAvg - priorAvg) * 10) / 10;
          if (Math.abs(diff) >= 0.3) {
            parts.push(`${m}: ${recentAvg}/10 (${diff > 0 ? '+' : ''}${diff} from prior week)`);
          } else {
            parts.push(`${m}: ${recentAvg}/10 (stable)`);
          }
        } else {
          parts.push(`${m}: ${recentAvg}/10`);
        }
      }
    });
    if (parts.length > 0) benefitContext = parts.join(', ');
  }

  // Oracle's recent memory notes
  let memoryContext = 'No prior observations recorded.';
  if (user.oracleNotes && user.oracleNotes.length > 0) {
    const notes = [...user.oracleNotes]
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 3)
      .map(n => n.note);
    memoryContext = notes.join(' | ');
  }

  // Aggregate community stat (lightweight — count active users in same sperma phase)
  let communityNote = '';
  try {
    const allUsers = await User.countDocuments({ startDate: { $exists: true } });
    if (allUsers > 10) {
      communityNote = `There are ${allUsers} active practitioners in the community.`;
    }
  } catch { /* non-blocking */ }

  const prompt = `You are Oracle — a predictive AI that monitors semen retention practitioners. Generate a single daily observation for this user's home screen.

RULES:
- ONE sentence. Maximum 25 words. No exceptions.
- Speak as an entity that is watching them. Not motivating. Observing.
- Reference at least ONE specific data point (a number, a phase, a trend direction).
- No greetings, no "I see", no "I notice". Start with the observation itself.
- No em dashes. No emojis. No generic motivation.
- Vary the format: sometimes reference a trend, sometimes a cycle position, sometimes a pattern from memory.

USER DATA:
Streak: Day ${streak}
Spermatogenesis: Cycle day ${cycleDay}/74 — ${spermaPhase}
Benefit trends: ${benefitContext}
Oracle memory: ${memoryContext}
${communityNote}

Generate the observation now. One sentence only.`;

  try {
    const response = await anthropic.messages.create({
      model: PULSE_MODEL,
      max_tokens: 80,
      messages: [{ role: 'user', content: prompt }]
    });
    return response.content[0].text.trim().replace(/^["']|["']$/g, '');
  } catch (err) {
    console.error('[OraclePulse] Personalized generation error:', err.message);
    return `Day ${streak}. Spermatogenesis cycle day ${cycleDay} of 74.`;
  }
}


// ============================================================
// COMMUNITY OBSERVATION
// Same for all free users. Aggregate-level insight.
// ============================================================
async function generateCommunityPulse() {
  // Gather lightweight aggregate stats
  let totalUsers = 0;
  let avgStreak = 0;
  let phaseDistribution = { mitotic: 0, meiotic: 0, maturation: 0, reabsorption: 0 };

  try {
    const users = await User.find({ startDate: { $exists: true } })
      .select('currentStreak')
      .lean();
    totalUsers = users.length;

    if (totalUsers > 0) {
      const streaks = users.map(u => u.currentStreak || 1);
      avgStreak = Math.round(streaks.reduce((a, b) => a + b, 0) / totalUsers);

      streaks.forEach(s => {
        const cd = ((s - 1) % 74) + 1;
        if (cd <= 16) phaseDistribution.mitotic++;
        else if (cd <= 40) phaseDistribution.meiotic++;
        else if (cd <= 64) phaseDistribution.maturation++;
        else phaseDistribution.reabsorption++;
      });
    }
  } catch { /* fallback to static */ }

  if (totalUsers < 5) {
    return 'The collective is forming. Every new practitioner strengthens the field.';
  }

  // Find dominant phase
  const phases = Object.entries(phaseDistribution).sort((a, b) => b[1] - a[1]);
  const topPhase = phases[0][0];
  const topPct = Math.round((phases[0][1] / totalUsers) * 100);

  const prompt = `You are Oracle — a predictive AI observing a community of semen retention practitioners. Generate a single community-level observation for free users.

RULES:
- ONE sentence. Maximum 25 words. No exceptions.
- Reference a real aggregate statistic from the data below.
- Speak as an all-seeing observer of the collective. Not motivating. Reporting.
- No greetings. No em dashes. No emojis.
- Make it feel like a data readout from a sentient system.

COMMUNITY DATA:
Total active practitioners: ${totalUsers}
Average streak: ${avgStreak} days
Phase distribution: Mitotic ${phaseDistribution.mitotic}, Meiotic ${phaseDistribution.meiotic}, Maturation ${phaseDistribution.maturation}, Reabsorption ${phaseDistribution.reabsorption}
Dominant phase: ${topPhase} (${topPct}% of users)

Generate the community observation now. One sentence only.`;

  try {
    const response = await anthropic.messages.create({
      model: PULSE_MODEL,
      max_tokens: 80,
      messages: [{ role: 'user', content: prompt }]
    });
    return response.content[0].text.trim().replace(/^["']|["']$/g, '');
  } catch (err) {
    console.error('[OraclePulse] Community generation error:', err.message);
    return `${topPct}% of the collective is currently in ${topPhase} phase. The field compounds.`;
  }
}

module.exports = router;
