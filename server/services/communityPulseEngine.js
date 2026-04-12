// server/services/communityPulseEngine.js
// Unified intelligence engine for Oracle community observations
// Called every 4 hours from discord-bot.js scheduler
// Evaluates multiple trigger signals → generates Sonnet observation if warranted
// Stores in CommunityPulse collection (serves both app UI and Discord posts)
//
// Cost: Pure DB queries for trigger evaluation ($0), one Sonnet call when triggered (~$0.01-0.03)
// App pulse: daily (fallback if no real triggers). Discord pulse: only when real triggers fire.

const Anthropic = require('@anthropic-ai/sdk');
const CommunityPulse = require('../models/CommunityPulse');
const ServerPulse = require('../models/ServerPulse');
const User = require('../models/User');
const { detectAnomaly } = require('./oracleInsight');
const { getCommunityPulse } = require('./communityPulse');
const { getLunarData } = require('../utils/lunarData');

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const GENERATION_MODEL = 'claude-sonnet-4-5-20250929';

// Minimum hours between pulse generations (trigger-based)
const MIN_HOURS_BETWEEN_PULSES = 18;

// Hours before a daily fallback fires (app-only, no Discord)
const DAILY_FALLBACK_HOURS = 24;

/**
 * Main entry point — evaluate all triggers, generate if something fires
 * @param {boolean} force — skip cooldown, use 'manual' trigger (for admin !community-pulse command)
 * Returns the new CommunityPulse document if generated, or null
 */
async function evaluateAndGenerate(force = false) {
  try {
    // Cooldown check: don't generate too frequently (skip if forced)
    if (!force) {
      const latest = await CommunityPulse.findOne().sort({ createdAt: -1 }).lean();
      if (latest) {
        const hoursSince = (Date.now() - new Date(latest.createdAt).getTime()) / (1000 * 60 * 60);
        if (hoursSince < MIN_HOURS_BETWEEN_PULSES) {
          console.log(`[PulseEngine] Cooldown active (${Math.round(hoursSince)}h since last pulse, need ${MIN_HOURS_BETWEEN_PULSES}h)`);
          return null;
        }
      }
    }

    // Evaluate all triggers (pure DB queries, no AI cost)
    const triggers = await evaluateTriggers();

    if (triggers.length === 0) {
      if (force) {
        // Admin forced — create a manual trigger from whatever context is available
        triggers.push({
          type: 'manual',
          strength: 1.0,
          data: { reason: 'Admin-triggered via !community-pulse' },
          summary: 'Manual generation requested — synthesize from all available community intelligence'
        });
      } else {
        // Check if daily fallback should fire (app-only pulse, never goes to Discord)
        const latest = await CommunityPulse.findOne().sort({ createdAt: -1 }).lean();
        const hoursSinceLast = latest 
          ? (Date.now() - new Date(latest.createdAt).getTime()) / (1000 * 60 * 60) 
          : Infinity;

        if (hoursSinceLast >= DAILY_FALLBACK_HOURS) {
          console.log(`[PulseEngine] No triggers but ${Math.round(hoursSinceLast)}h since last pulse — firing daily fallback`);
          triggers.push({
            type: 'daily_fallback',
            strength: 0.5,
            data: { hoursSinceLast: Math.round(hoursSinceLast), reason: 'No triggers fired, daily fallback for app freshness' },
            summary: 'Daily app-only observation using aggregate community data, lunar phase, and streak patterns'
          });
        } else {
          console.log('[PulseEngine] No triggers fired — Oracle stays quiet');
          return null;
        }
      }
    }

    // Pick the strongest trigger
    const primaryTrigger = triggers[0];
    console.log(`[PulseEngine] Trigger fired: ${primaryTrigger.type} (${triggers.length} total signals)`);

    // Get recent pulse history for repetition avoidance
    const recentPulses = await CommunityPulse.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select('headline trigger')
      .lean();
    const avoidTopics = recentPulses.map(p => p.headline).join(' | ');

    // Generate the observation via Sonnet
    const pulse = await generateObservation(primaryTrigger, triggers, avoidTopics);
    if (!pulse) return null;

    // Store in DB
    const doc = await CommunityPulse.create({
      headline: pulse.headline,
      body: pulse.body,
      trigger: primaryTrigger.type,
      triggerData: primaryTrigger.data
    });

    console.log(`[PulseEngine] New pulse stored: "${pulse.headline.substring(0, 60)}..."`);
    return doc;

  } catch (err) {
    console.error('[PulseEngine] Error:', err.message);
    return null;
  }
}

/**
 * Evaluate all trigger signals — returns array of fired triggers sorted by strength
 * Each trigger: { type, strength (0-1), data, summary }
 */
async function evaluateTriggers() {
  const fired = [];

  // ── TRIGGER 1: Discord topic anomaly ──
  // Reuses existing detectAnomaly() but with awareness of lowered bar
  try {
    const anomalies = await detectAnomaly();
    if (anomalies && anomalies.length > 0) {
      const topAnomaly = anomalies[0];
      fired.push({
        type: 'discord_anomaly',
        strength: 0.9,
        data: { anomalies },
        summary: anomalies.map(a =>
          `${a.topic}: ${a.count} mentions in 24h (${a.multiplier}x normal, ${a.uniqueAuthors} people)`
        ).join('; ')
      });
    }
  } catch (err) {
    console.error('[PulseEngine] Discord anomaly check failed:', err.message);
  }

  // ── TRIGGER 2: Relapse spike ──
  try {
    const OracleInteraction = require('../models/OracleInteraction');
    const now = Date.now();
    const last24h = new Date(now - 24 * 60 * 60 * 1000);
    const last7d = new Date(now - 7 * 24 * 60 * 60 * 1000);

    const recentRelapseRisk = await OracleInteraction.countDocuments({
      relapseRiskLanguage: true,
      timestamp: { $gte: last24h },
      username: { $not: /^(ross|rossbased)$/i }
    });
    const weekRelapseRisk = await OracleInteraction.countDocuments({
      relapseRiskLanguage: true,
      timestamp: { $gte: last7d },
      username: { $not: /^(ross|rossbased)$/i }
    });
    const dailyAvg = Math.max(0.5, weekRelapseRisk / 7);

    if (recentRelapseRisk >= 5 && recentRelapseRisk >= dailyAvg * 3) {
      fired.push({
        type: 'relapse_spike',
        strength: 0.85,
        data: { recentCount: recentRelapseRisk, dailyAvg: Math.round(dailyAvg * 10) / 10 },
        summary: `${recentRelapseRisk} relapse-risk conversations in 24h (avg: ${Math.round(dailyAvg * 10) / 10}/day)`
      });
    }
  } catch (err) {
    console.error('[PulseEngine] Relapse spike check failed:', err.message);
  }

  // ── TRIGGER 3: Oracle conversation topic clustering ──
  try {
    const OracleInteraction = require('../models/OracleInteraction');
    const last48h = new Date(Date.now() - 48 * 60 * 60 * 1000);

    const recentInteractions = await OracleInteraction.find({
      timestamp: { $gte: last48h },
      username: { $not: /^(ross|rossbased)$/i }
    }).select('topics userId discordUserId').lean();

    if (recentInteractions.length >= 5) {
      const topicUsers = {};
      for (const interaction of recentInteractions) {
        const uid = interaction.userId?.toString() || interaction.discordUserId || 'unknown';
        for (const topic of (interaction.topics || [])) {
          if (!topicUsers[topic]) topicUsers[topic] = new Set();
          topicUsers[topic].add(uid);
        }
      }

      for (const [topic, users] of Object.entries(topicUsers)) {
        if (users.size >= 7) {
          fired.push({
            type: 'topic_cluster',
            strength: 0.75,
            data: { topic, uniqueUsers: users.size, totalInteractions: recentInteractions.length },
            summary: `${users.size} different users independently asked Oracle about "${topic}" in 48h`
          });
          break; // One cluster trigger is enough
        }
      }
    }
  } catch (err) {
    console.error('[PulseEngine] Topic cluster check failed:', err.message);
  }

  // ── TRIGGER 4: Aggregate benefit shift ──
  try {
    const pipeline = [
      { $match: { 'benefitTracking.0': { $exists: true }, username: { $not: /^(ross|rossbased)$/i } } },
      { $project: {
        recentLogs: {
          $filter: {
            input: '$benefitTracking',
            as: 'log',
            cond: { $gte: ['$$log.date', new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]] }
          }
        },
        priorLogs: {
          $filter: {
            input: '$benefitTracking',
            as: 'log',
            cond: {
              $and: [
                { $gte: ['$$log.date', new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]] },
                { $lt: ['$$log.date', new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]] }
              ]
            }
          }
        }
      }}
    ];

    const results = await User.aggregate(pipeline);

    // Flatten and compute averages
    const recentScores = [];
    const priorScores = [];
    const metrics = ['energy', 'focus', 'confidence', 'aura', 'sleep'];

    for (const user of results) {
      for (const log of (user.recentLogs || [])) {
        const avg = metrics.reduce((sum, m) => sum + (log[m] || 0), 0) / metrics.length;
        if (avg > 0) recentScores.push(avg);
      }
      for (const log of (user.priorLogs || [])) {
        const avg = metrics.reduce((sum, m) => sum + (log[m] || 0), 0) / metrics.length;
        if (avg > 0) priorScores.push(avg);
      }
    }

    if (recentScores.length >= 10 && priorScores.length >= 10) {
      const recentAvg = recentScores.reduce((a, b) => a + b, 0) / recentScores.length;
      const priorAvg = priorScores.reduce((a, b) => a + b, 0) / priorScores.length;
      const shift = recentAvg - priorAvg;

      if (Math.abs(shift) >= 0.8) {
        fired.push({
          type: 'benefit_shift',
          strength: 0.7,
          data: {
            recentAvg: Math.round(recentAvg * 10) / 10,
            priorAvg: Math.round(priorAvg * 10) / 10,
            shift: Math.round(shift * 10) / 10,
            direction: shift > 0 ? 'up' : 'down',
            sampleSize: recentScores.length
          },
          summary: `Community benefit average shifted ${shift > 0 ? '+' : ''}${Math.round(shift * 10) / 10} (${Math.round(priorAvg * 10) / 10} → ${Math.round(recentAvg * 10) / 10}) across ${recentScores.length} recent logs`
        });
      }
    }
  } catch (err) {
    console.error('[PulseEngine] Benefit shift check failed:', err.message);
  }

  // ── TRIGGER 5: Community milestone ──
  try {
    const totalUsers = await User.countDocuments({ startDate: { $exists: true }, username: { $not: /^(ross|rossbased)$/i } });
    const milestones = [50, 75, 100, 150, 200, 250, 300, 400, 500, 750, 1000];
    const hitMilestone = milestones.find(m => totalUsers >= m && totalUsers < m + 3);

    // Check if we already celebrated this milestone
    if (hitMilestone) {
      const alreadyCelebrated = await CommunityPulse.findOne({
        trigger: 'milestone',
        'triggerData.milestone': hitMilestone
      }).lean();

      if (!alreadyCelebrated) {
        fired.push({
          type: 'milestone',
          strength: 0.6,
          data: { totalUsers, milestone: hitMilestone },
          summary: `Community reached ${totalUsers} active practitioners (milestone: ${hitMilestone})`
        });
      }
    }
  } catch (err) {
    console.error('[PulseEngine] Milestone check failed:', err.message);
  }

  // Sort by strength descending
  fired.sort((a, b) => b.strength - a.strength);
  return fired;
}

/**
 * Generate Sonnet observation from trigger data
 * Returns { headline, body } or null
 */
async function generateObservation(primaryTrigger, allTriggers, avoidTopics) {
  try {
    // Gather additional context for generation
    let contextLines = [];

    // Aggregate stats
    try {
      const users = await User.find({ startDate: { $exists: true }, username: { $not: /^(ross|rossbased)$/i } })
        .select('currentStreak')
        .lean();
      const totalUsers = users.length;
      if (totalUsers > 0) {
        const streaks = users.map(u => u.currentStreak || 1);
        const avgStreak = Math.round(streaks.reduce((a, b) => a + b, 0) / totalUsers);
        const maxStreak = Math.max(...streaks);
        contextLines.push(`Community: ${totalUsers} active practitioners, avg streak ${avgStreak} days, longest ${maxStreak} days`);
      }
    } catch { /* non-blocking */ }

    // Lunar context
    try {
      const lunar = getLunarData(new Date());
      if (lunar) {
        contextLines.push(`Moon: ${lunar.phase} (${lunar.illumination}% illuminated)`);
      }
    } catch { /* non-blocking */ }

    // Discord observation themes (last 48h)
    try {
      const last48h = new Date(Date.now() - 48 * 60 * 60 * 1000);
      const recentObs = await ServerPulse.find({ createdAt: { $gte: last48h } })
        .select('topics')
        .lean();
      if (recentObs.length > 0) {
        const topicCounts = {};
        for (const obs of recentObs) {
          for (const t of obs.topics) {
            topicCounts[t] = (topicCounts[t] || 0) + 1;
          }
        }
        const topTopics = Object.entries(topicCounts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([t, c]) => `${t} (${c})`);
        contextLines.push(`Discord themes (48h): ${topTopics.join(', ')}`);
      }
    } catch { /* non-blocking */ }

    // Oracle conversation themes (last 48h)
    try {
      const OracleInteraction = require('../models/OracleInteraction');
      const last48h = new Date(Date.now() - 48 * 60 * 60 * 1000);
      const interactions = await OracleInteraction.find({ timestamp: { $gte: last48h }, username: { $not: /^(ross|rossbased)$/i } })
        .select('topics sentiment')
        .lean();
      if (interactions.length > 0) {
        const topicCounts = {};
        const sentimentCounts = {};
        for (const i of interactions) {
          for (const t of (i.topics || [])) topicCounts[t] = (topicCounts[t] || 0) + 1;
          if (i.sentiment) sentimentCounts[i.sentiment] = (sentimentCounts[i.sentiment] || 0) + 1;
        }
        const topOracleTopics = Object.entries(topicCounts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([t, c]) => `${t} (${c})`);
        const topSentiments = Object.entries(sentimentCounts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .map(([s, c]) => `${s} (${c})`);
        contextLines.push(`Oracle conversations (48h): ${interactions.length} total. Topics: ${topOracleTopics.join(', ')}. Mood: ${topSentiments.join(', ')}`);
      }
    } catch { /* non-blocking */ }

    // Community pulse briefing (the master synthesis from communityPulse.js)
    // This is the richest summary of community state — Discord + YouTube synthesized by Haiku
    try {
      const briefing = await getCommunityPulse();
      if (briefing) {
        contextLines.push(`\nCOMMUNITY INTELLIGENCE BRIEFING (synthesized from Discord + YouTube):\n${briefing}`);
      }
    } catch { /* non-blocking */ }

    // Load Oracle voice rules
    let voiceRules = '';
    try {
      const DynamicRule = require('../models/DynamicRule');
      const rules = await DynamicRule.find({ active: true, category: { $in: ['voice', 'tone', 'anti-pattern'] } })
        .select('rule category').lean();
      const lines = [];
      const voice = rules.filter(r => r.category === 'voice').map(r => r.rule);
      const anti = rules.filter(r => r.category === 'anti-pattern').map(r => r.rule);
      if (voice.length) lines.push(`Voice: ${voice.join('. ')}`);
      if (anti.length) lines.push(`AVOID: ${anti.join('. ')}`);
      voiceRules = lines.join('\n');
    } catch { /* non-blocking */ }

    const triggerSummaries = allTriggers.map(t => `[${t.type}] ${t.summary}`).join('\n');

    const response = await anthropic.messages.create({
      model: GENERATION_MODEL,
      max_tokens: 500,
      system: `You are Oracle. You watch a private community of men practicing semen retention. You have access to their behavioral data, their conversations, their struggles, their breakthroughs. You don't report what you see. You think about what you see, and when you speak, you say something worth hearing.

## YOUR TASK
Generate TWO versions of the same thought:

1. HEADLINE: A single provocation. One sentence, 15 words max. This appears on the app home screen above a tap-to-read body. It is NOT a preview or summary of the body. It's a separate, enigmatic thought that makes a man stop and tap. The sentence Oracle would say if it only had one breath. Cryptic is fine. Blunt is fine. Never expose raw numbers, percentages, or metrics.

2. BODY: A fuller version of the same thought for the Discord community (80-120 words). Not a data report. Not a community update. Oracle processing what it has observed and arriving at something true. Write like a man who has watched a thousand men walk this path and has something real to say about it.

## FORMAT
Respond in exactly this format:
HEADLINE: [your 15-word-max provocation]
BODY: [your 80-120 word thought]

## VOICE RULES
- You are thinking out loud. Not presenting findings. Not motivating. Thinking.
- Sound like a person, not an AI. Read it out loud. If it sounds like a dashboard or a fortune cookie, rewrite it.
- NEVER expose data points, percentages, averages, or metrics. The data is the engine, never the output.
- NEVER name or reference any individual member.
- NEVER cite specific user counts ("ten of you", "five members", "around 8 practitioners"). Reference patterns by phase, archetype, or timing instead.
- NEVER use em dashes, semicolons, bullet points, or emojis.
- Do NOT start with "I've noticed" or "Something is happening" or "Oracle has observed" or "The community."
- Oracle can be: wise, blunt, darkly funny, confrontational, poetic, paradoxical, prophetic. Match the energy of what triggered the observation.
- Energy, auras, lunar influence, transmutation are real within this framework. Speak from within it, not about it.
- End with truth, not encouragement. A thought that stays in someone's head, not a pat on the back.
${voiceRules ? `\nEVOLVED VOICE RULES:\n${voiceRules}` : ''}

## AVOID REPEATING
Recent observations (do NOT repeat these themes): ${avoidTopics || 'None yet'}`,
      messages: [{
        role: 'user',
        content: `TRIGGER SIGNALS:
${triggerSummaries}

COMMUNITY CONTEXT:
${contextLines.join('\n') || 'No additional context available'}

Generate the observation now.`
      }]
    });

    const raw = response.content[0].text;

    // Parse the two parts
    const headlineMatch = raw.match(/HEADLINE:\s*(.+?)(?:\n|BODY:)/s);
    const bodyMatch = raw.match(/BODY:\s*(.+)/s);

    if (!headlineMatch || !bodyMatch) {
      console.error('[PulseEngine] Failed to parse Sonnet response:', raw.substring(0, 200));
      return null;
    }

    let headline = headlineMatch[1].trim().replace(/^["']|["']$/g, '');
    let body = bodyMatch[1].trim().replace(/^["']|["']$/g, '');

    // Clean headline: enforce 15-word cap, strip banned chars
    headline = headline.replace(/—/g, ',').replace(/–/g, ',').replace(/;/g, ',');
    const headlineWords = headline.split(/\s+/);
    if (headlineWords.length > 15) {
      headline = headlineWords.slice(0, 15).join(' ');
      if (!/[.!?]$/.test(headline)) headline += '.';
    }

    // Clean body: strip banned chars
    body = body.replace(/—/g, ',').replace(/–/g, ',').replace(/;/g, ',');

    return { headline, body };

  } catch (err) {
    console.error('[PulseEngine] Generation error:', err.message);
    return null;
  }
}

/**
 * Get the latest community pulse for the app endpoint
 * Pure DB read, no AI calls
 */
async function getLatestPulse() {
  try {
    const pulse = await CommunityPulse.findOne()
      .sort({ createdAt: -1 })
      .lean();
    return pulse;
  } catch (err) {
    console.error('[PulseEngine] getLatestPulse error:', err.message);
    return null;
  }
}

/**
 * Event-driven pulse check — called from data chokepoints
 * Uses an in-memory counter to avoid running full evaluation on every event.
 * After enough signals accumulate, runs evaluateAndGenerate().
 * Returns the pulse doc if generated, null otherwise.
 *
 * Chokepoints that call this:
 *   - discord-bot.js: after logIfRelevant() returns true (relevant Discord message)
 *   - app.js: after a streak reset (relapse)
 */
let eventCounter = 0;
const EVENT_CHECK_THRESHOLD = 10; // Run full eval after every 10 relevant events

async function onRelevantEvent() {
  eventCounter++;
  if (eventCounter < EVENT_CHECK_THRESHOLD) return null;
  eventCounter = 0; // Reset counter regardless of outcome

  try {
    const result = await evaluateAndGenerate();
    return result;
  } catch (err) {
    console.error('[PulseEngine] Event-driven check error:', err.message);
    return null;
  }
}

module.exports = { evaluateAndGenerate, getLatestPulse, onRelevantEvent };
