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

// Hard cleanup — enforce word limit and strip banned characters no matter what Haiku returns
function cleanPulseOutput(text) {
  let cleaned = text.trim().replace(/^["']|["']$/g, '');
  // Strip em dashes and replace with commas
  cleaned = cleaned.replace(/—/g, ',').replace(/–/g, ',');
  // Strip semicolons
  cleaned = cleaned.replace(/;/g, ',');
  // Hard cap at 25 words
  const words = cleaned.split(/\s+/);
  if (words.length > 25) {
    cleaned = words.slice(0, 25).join(' ');
    // End cleanly — add period if missing
    if (!/[.!?]$/.test(cleaned)) cleaned += '.';
  }
  return cleaned;
}

// Load Oracle's evolved voice rules (same ones used in live chat)
let cachedVoiceRules = null;
let voiceRulesCacheTime = 0;
async function getVoiceRulesForPulse() {
  if (cachedVoiceRules && (Date.now() - voiceRulesCacheTime) < 10 * 60 * 1000) return cachedVoiceRules;
  try {
    const DynamicRule = require('../models/DynamicRule');
    const rules = await DynamicRule.find({ active: true, category: { $in: ['voice', 'tone', 'anti-pattern'] } })
      .select('rule category').lean();
    const lines = [];
    const voice = rules.filter(r => r.category === 'voice').map(r => r.rule);
    const anti = rules.filter(r => r.category === 'anti-pattern').map(r => r.rule);
    const tone = rules.filter(r => r.category === 'tone').map(r => r.rule);
    if (voice.length) lines.push(`Voice: ${voice.join('. ')}`);
    if (anti.length) lines.push(`AVOID: ${anti.join('. ')}`);
    if (tone.length) lines.push(`Tone: ${tone.join('. ')}`);
    cachedVoiceRules = lines.length > 0 ? lines.join('\n') : '';
    voiceRulesCacheTime = Date.now();
    return cachedVoiceRules;
  } catch { return ''; }
}

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
    const hasPremium = user.isPremium || sub.status === 'active' || sub.status === 'grandfathered' || sub.status === 'trialing' || sub.status === 'trial' || sub.status === 'canceled';

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
  if (cycleDay <= 16) spermaPhase = 'Mitotic Division (stem cells multiplying)';
  else if (cycleDay <= 40) spermaPhase = 'Meiotic Division (deep cellular transformation)';
  else if (cycleDay <= 64) spermaPhase = 'Maturation (peak nutrient retention and reabsorption)';
  else spermaPhase = 'Complete Reabsorption (full cycle completion)';

  // Benefit trends (last 7 vs prior 7)
  let benefitContext = 'No benefit data logged yet.';
  if (user.benefitTracking && user.benefitTracking.length >= 2) {
    const sorted = [...user.benefitTracking].sort((a, b) => new Date(b.date) - new Date(a.date));
    const recent = sorted.slice(0, 7);
    const prior = sorted.slice(7, 14);
    const metrics = ['energy', 'focus', 'confidence', 'aura', 'sleep', 'workout'];
    const metricLabels = { energy: 'energy', focus: 'focus', confidence: 'confidence', aura: 'aura', sleep: 'sleep', workout: 'body score' };
    const parts = [];

    metrics.forEach(m => {
      const label = metricLabels[m] || m;
      const recentVals = recent.map(e => e[m]).filter(v => v != null);
      const priorVals = prior.map(e => e[m]).filter(v => v != null);
      if (recentVals.length > 0) {
        const recentAvg = Math.round((recentVals.reduce((a, b) => a + b, 0) / recentVals.length) * 10) / 10;
        if (priorVals.length > 0) {
          const priorAvg = Math.round((priorVals.reduce((a, b) => a + b, 0) / priorVals.length) * 10) / 10;
          const diff = Math.round((recentAvg - priorAvg) * 10) / 10;
          if (Math.abs(diff) >= 0.3) {
            parts.push(`${label}: ${recentAvg}/10 (${diff > 0 ? '+' : ''}${diff} from prior week)`);
          } else {
            parts.push(`${label}: ${recentAvg}/10 (stable)`);
          }
        } else {
          parts.push(`${label}: ${recentAvg}/10`);
        }
      }
    });
    if (parts.length > 0) benefitContext = parts.join(', ');
  }

  // Historical cycle comparison — what happened at this same cycle position in prior cycles
  let cycleHistory = '';
  if (user.benefitTracking && user.benefitTracking.length >= 14 && user.startDate && streak > 74) {
    try {
      const parse = (s) => {
        if (typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s)) {
          const [y, m, d] = s.split('-').map(Number);
          return new Date(y, m - 1, d);
        }
        const d = new Date(s); d.setHours(0, 0, 0, 0); return d;
      };
      const startDate = parse(user.startDate);
      const currentCycleStart = streak - cycleDay + 1; // streak day when current cycle began

      const matchWindow = 3; // ±3 days around current cycle position
      const priorCycleEntries = [];

      user.benefitTracking.forEach(entry => {
        if (!entry.date) return;
        const entryDate = parse(entry.date);
        const entryStreak = Math.max(1, Math.floor((entryDate - startDate) / (1000 * 60 * 60 * 24)) + 1);
        // Skip entries from current cycle
        if (entryStreak >= currentCycleStart) return;
        const entryCycleDay = ((entryStreak - 1) % 74) + 1;
        if (Math.abs(entryCycleDay - cycleDay) <= matchWindow) {
          priorCycleEntries.push(entry);
        }
      });

      if (priorCycleEntries.length >= 3) {
        const metrics = ['energy', 'focus', 'confidence', 'aura', 'sleep', 'workout'];
        const metricLabels = { energy: 'energy', focus: 'focus', confidence: 'confidence', aura: 'aura', sleep: 'sleep', workout: 'body score' };
        const diffs = [];

        metrics.forEach(m => {
          const label = metricLabels[m] || m;
          const histVals = priorCycleEntries.map(e => e[m]).filter(v => v != null);
          if (histVals.length < 2) return;
          const histAvg = Math.round((histVals.reduce((a, b) => a + b, 0) / histVals.length) * 10) / 10;

          // Get current value from recent entries
          const sorted = [...user.benefitTracking].sort((a, b) => new Date(b.date) - new Date(a.date));
          const currentVal = sorted.find(e => e[m] != null)?.[m];
          if (currentVal != null) {
            const diff = Math.round((currentVal - histAvg) * 10) / 10;
            if (Math.abs(diff) >= 0.5) {
              diffs.push(`${label}: currently ${currentVal}, was ${histAvg} at this cycle position before (${diff > 0 ? '+' : ''}${diff})`);
            }
          }
        });

        if (diffs.length > 0) {
          cycleHistory = diffs.slice(0, 3).join('; ');
        } else {
          cycleHistory = `Scores at this cycle position are tracking close to prior cycles (no major deviation).`;
        }
      }
    } catch { /* non-blocking */ }
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

  // Load Oracle's evolved voice rules
  let voiceRules = '';
  try { voiceRules = await getVoiceRulesForPulse(); } catch { /* non-blocking */ }

  // Load per-user tone preferences from risk profile
  let toneNote = '';
  try {
    const UserRiskProfile = require('../models/UserRiskProfile');
    const profile = await UserRiskProfile.findOne({ userId: user._id })
      .select('behaviorProfile.responseTonePreference psychProfile.primaryMotivation').lean();
    if (profile?.behaviorProfile?.responseTonePreference) {
      const prefs = profile.behaviorProfile.responseTonePreference;
      const best = Object.entries(prefs).filter(([,v]) => v > 0.3).map(([k]) => k);
      const worst = Object.entries(prefs).filter(([,v]) => v < -0.3).map(([k]) => k);
      if (best.length) toneNote += `This user responds well to: ${best.join(', ')}. `;
      if (worst.length) toneNote += `Avoid: ${worst.join(', ')}. `;
    }
    if (profile?.psychProfile?.primaryMotivation) {
      toneNote += `Core motivation: ${profile.psychProfile.primaryMotivation}.`;
    }
  } catch { /* non-blocking — psych profile is enhancement */ }

  const prompt = `You generate a daily observation for a semen retention tracker app home screen. This is the first thing the user sees when they open the app.

YOUR JOB: If you have cycle history data, make a prediction about what's coming based on their past patterns. If you don't, observe what's happening now and connect a dot they wouldn't connect themselves.

FORMAT: Two short sentences. 25 words total max.
- Sentence 1: What you see or what happened before at this point.
- Sentence 2: What's likely coming next, or why it matters.

VOICE:
- Calm, knowing, direct. Like a mentor who's seen this before.
- Plain language. No jargon, no pseudo-science, no em dashes, no emojis, no semicolons.
- NEVER say "body jumped" or "body climbed" — say "body score" when referencing that metric.
- NEVER start with or reference the streak day number (e.g. "Day 2527"). The streak is already displayed on screen.

PREDICTION EXAMPLES (when cycle history is available):
"Last time you hit this cycle position, sleep dropped for 3 days. Watch your evenings."
"Your energy was 7.2 here last cycle. It's 8.5 now. You're building stronger each round."
"Confidence dipped here in your last cycle. This time it's climbing. Something shifted."
"Sleep tends to soften around this cycle point for you. Protect it tonight."

OBSERVATION EXAMPLES (when no cycle history):
"Focus hit 9.7 this week. Mitotic division tends to sharpen that even further."
"Energy steady at 8.1 all week. That kind of consistency compounds faster than spikes."
"Cycle day 7 of 74. Stem cells multiplying, everything rebuilds from here."

BAD — never write like this:
"Neural hyperactivity seeking external validation of internal signal."
"Day 2527: Your focus just hit 9.7, and your body jumped almost a point this week."
"Oracle predicts great things ahead for you." (vague, no data)
${voiceRules ? `\nORACLE VOICE RULES (follow these):\n${voiceRules}` : ''}
${toneNote ? `\nUSER TONE PREFERENCE: ${toneNote}` : ''}

USER DATA:
Streak length: ${streak} days
Spermatogenesis: Cycle day ${cycleDay}/74, ${spermaPhase}
Benefit trends (this week vs last): ${benefitContext}
${cycleHistory ? `Cycle history (same position in prior cycles): ${cycleHistory}` : 'No prior cycle data yet (first cycle or insufficient history).'}
Oracle memory: ${memoryContext}
${communityNote}

Two sentences. 25 words max. Go.`;

  try {
    const response = await anthropic.messages.create({
      model: PULSE_MODEL,
      max_tokens: 80,
      messages: [{ role: 'user', content: prompt }]
    });
    return cleanPulseOutput(response.content[0].text);
  } catch (err) {
    console.error('[OraclePulse] Personalized generation error:', err.message);
    return `Cycle day ${cycleDay} of 74, ${spermaPhase.split(' (')[0].toLowerCase()}. Your body is at work.`;
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
    return 'The community is growing. More data sharpens every observation.';
  }

  // Find dominant phase
  const phases = Object.entries(phaseDistribution).sort((a, b) => b[1] - a[1]);
  const topPhase = phases[0][0];
  const topPct = Math.round((phases[0][1] / totalUsers) * 100);

  // Load Oracle's evolved voice rules
  let voiceRules = '';
  try { voiceRules = await getVoiceRulesForPulse(); } catch { /* non-blocking */ }

  const prompt = `You generate a daily community observation for a semen retention tracker app home screen. Free users see this — they see the collective, not personal data.

FORMAT: Two short sentences. 25 words total max.
- Sentence 1: A specific community stat (a real number from the data).
- Sentence 2: What it means for the collective or what Oracle sees in the pattern.

VOICE: Calm, factual, slightly awe-inspiring. Plain language. No jargon, no em dashes, no emojis, no semicolons.

EXAMPLES:
"${topPct}% of practitioners are in ${topPhase} phase this week. The collective is cycling in sync."
"Community average sits at ${avgStreak} days. That baseline keeps climbing month over month."
"${totalUsers} active practitioners right now. More data means sharper observations for everyone."
${voiceRules ? `\nORACLE VOICE RULES (follow these):\n${voiceRules}` : ''}

COMMUNITY DATA:
Total active practitioners: ${totalUsers}
Average streak: ${avgStreak} days
Phase distribution: Mitotic ${phaseDistribution.mitotic}, Meiotic ${phaseDistribution.meiotic}, Maturation ${phaseDistribution.maturation}, Reabsorption ${phaseDistribution.reabsorption}
Dominant phase: ${topPhase} (${topPct}% of users)

Two sentences. 25 words max. Go.`;

  try {
    const response = await anthropic.messages.create({
      model: PULSE_MODEL,
      max_tokens: 80,
      messages: [{ role: 'user', content: prompt }]
    });
    return cleanPulseOutput(response.content[0].text);
  } catch (err) {
    console.error('[OraclePulse] Community generation error:', err.message);
    return `${topPct}% of practitioners are in ${topPhase} phase right now.`;
  }
}

module.exports = router;
