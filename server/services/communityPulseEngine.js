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
const RedditPost = require('../models/RedditPost');
const User = require('../models/User');
const { detectAnomaly, detectTopics } = require('./oracleInsight');
const { getCommunityPulse } = require('./communityPulse');
const { getLunarData } = require('../utils/lunarData');
const { retrieveKnowledge } = require('./knowledgeRetrieval');
const { findCorrelations, renderForPrompt: renderCorrelationPack } = require('./oracleCorrelationEngine');
const { getRepetitionContext, checkNovelty, fingerprintPulse, embedPulse } = require('./oracleRepetitionGuard');

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const GENERATION_MODEL = 'claude-sonnet-4-5-20250929';

// Minimum hours between pulse generations (trigger-based)
const MIN_HOURS_BETWEEN_PULSES = 18;

// Hours before a daily fallback fires (app-only, no Discord)
const DAILY_FALLBACK_HOURS = 24;

// Generation modes — rotate to prevent users from clocking the structural pattern.
// Each mode reshapes the body's opening posture so that two pulses in a row
// never sound like they came off the same template.
const GENERATION_MODES = [
  {
    id: 'cohort_observation',
    instruction: `MODE: COHORT OBSERVATION. Lead with a pattern across the collective that only you could connect. Use evergreen plural framing (many of you / a number of you / lately). Then arrive at the mechanism beneath the pattern.`
  },
  {
    id: 'knowledge_led',
    instruction: `MODE: KNOWLEDGE-LED. Lead with a specific piece of timeless knowledge from the RELEVANT KNOWLEDGE section — esoteric, scientific, or ancestral — and apply it to the current moment in the community. Old idea first, observation second. Do NOT open with "many of you" or any cohort framing.`
  },
  {
    id: 'single_zoom',
    instruction: `MODE: SINGLE-QUESTION ZOOM. Open with the archetypal question one man might be asking right now at this stage of the path. Treat that single voice as the entry point, then zoom out to the universal truth behind it. Specific human moment to universal mechanism.`
  },
  {
    id: 'contrarian',
    instruction: `MODE: CONTRARIAN. Name a belief commonly held inside this practice — something most retainers take for granted — and dismantle it. State the common belief plainly, then show what is actually true. Do NOT open with cohort framing.`
  },
  {
    id: 'paradox',
    instruction: `MODE: PARADOX. Hold two contradictory truths together. The obvious lesson and its opposite are both true here. Refuse to resolve the tension cheaply. Make the reader feel the contradiction.`
  },
  {
    id: 'pure_reflection',
    instruction: `MODE: PURE REFLECTION. No cohort framing whatsoever. No "many of you", no "lately", no community references. A single piece of philosophy or insight Oracle has been turning over, addressed directly to whoever is reading. Just thought.`
  }
];

/**
 * Pick a generation mode that hasn't fired in the last 4 pulses.
 * Falls back to random across all modes if every mode is in the recent window.
 */
async function pickMode() {
  try {
    const recent = await CommunityPulse.find()
      .sort({ createdAt: -1 })
      .limit(4)
      .select('triggerData')
      .lean();
    const recentModeIds = new Set(
      recent.map(p => p.triggerData?.mode).filter(Boolean)
    );
    const fresh = GENERATION_MODES.filter(m => !recentModeIds.has(m.id));
    const pool = fresh.length > 0 ? fresh : GENERATION_MODES;
    return pool[Math.floor(Math.random() * pool.length)];
  } catch {
    return GENERATION_MODES[Math.floor(Math.random() * GENERATION_MODES.length)];
  }
}

/**
 * Build a RAG query string from the primary trigger and community context.
 * The query feeds into retrieveKnowledge() to pull relevant knowledge chunks.
 */
function buildRagQuery(primaryTrigger, contextLines) {
  const t = primaryTrigger;
  if (t.type === 'discord_anomaly' && t.data?.anomalies?.[0]?.topic) {
    return t.data.anomalies.slice(0, 3).map(a => a.topic).join(' ');
  }
  if (t.type === 'topic_cluster' && t.data?.topic) {
    return t.data.topic;
  }
  if (t.type === 'relapse_spike') {
    return 'relapse flatline retention cycle integration';
  }
  if (t.type === 'benefit_shift') {
    return t.data?.direction === 'up'
      ? 'energy clarity transmutation activation'
      : 'flatline integration nervous system consolidation';
  }
  if (t.type === 'milestone') {
    return 'community collective practice transmission';
  }
  // daily_fallback / manual — synthesize from observed themes if available
  const themesLine = (contextLines || []).find(l => l.startsWith('Discord themes') || l.startsWith('Oracle conversations'));
  if (themesLine) {
    return themesLine
      .replace(/^[^:]+:\s*/, '')
      .replace(/\(\d+\)/g, '')
      .replace(/,/g, ' ')
      .trim();
  }
  return 'retention transmutation integration';
}

/**
 * Main entry point — evaluate all triggers, generate if something fires
 * @param {boolean|Object} forceOrOptions — true (legacy) skips cooldown with 'manual' trigger.
 *   Object form: { force: boolean, dryRun: boolean }. dryRun returns generated pulse WITHOUT
 *   persisting to CommunityPulse (use for smoke tests against production data).
 * Returns the new CommunityPulse document if generated, or null
 */
async function evaluateAndGenerate(forceOrOptions = false) {
  const force = typeof forceOrOptions === 'object' ? !!forceOrOptions.force : !!forceOrOptions;
  const dryRun = typeof forceOrOptions === 'object' ? !!forceOrOptions.dryRun : false;
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

    // Pull correlations early — they can act as a trigger on their own when 2+ sources align
    let correlationPack = null;
    try {
      correlationPack = await findCorrelations();
    } catch (err) {
      console.warn('[PulseEngine] Correlation engine failed:', err.message);
    }
    const hasStrongCorrelations = correlationPack
      && correlationPack.correlations
      && correlationPack.correlations.length > 0
      && correlationPack.correlations[0].strength >= 0.4;

    if (triggers.length === 0) {
      if (force) {
        // Admin forced — create a manual trigger from whatever context is available
        triggers.push({
          type: 'manual',
          strength: 1.0,
          data: { reason: 'Admin-triggered via !community-pulse' },
          summary: 'Manual generation requested — synthesize from all available community intelligence'
        });
      } else if (hasStrongCorrelations) {
        // No standalone triggers, but cross-source correlations are firing — that's enough
        const top = correlationPack.correlations[0];
        console.log(`[PulseEngine] No standalone triggers but cross-source correlation on "${top.theme}" across ${top.sources.join('+')} — firing`);
        triggers.push({
          type: 'cross_source',
          strength: 0.8,
          data: { theme: top.theme, sources: top.sources, correlationStrength: top.strength },
          summary: `Theme "${top.theme}" surfacing across ${top.sources.join(' + ')} simultaneously`
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
    console.log(`[PulseEngine] Trigger fired: ${primaryTrigger.type} (${triggers.length} total signals, ${correlationPack?.correlations?.length || 0} correlations)`);

    // Fetch repetition guard context — what NOT to repeat
    let repetitionCtx = null;
    try {
      repetitionCtx = await getRepetitionContext();
    } catch (err) {
      console.warn('[PulseEngine] Repetition guard failed (non-blocking):', err.message);
    }

    // Pick a generation mode that varies the structure from recent pulses
    // When no correlations exist, pure_reflection becomes the right fallback.
    // When correlations exist, demote pure_reflection so the synthesis wins.
    let mode = await pickMode();
    if (correlationPack && correlationPack.correlations && correlationPack.correlations.length > 0 && mode.id === 'pure_reflection') {
      const alt = GENERATION_MODES.filter(m => m.id !== 'pure_reflection');
      mode = alt[Math.floor(Math.random() * alt.length)];
    }
    if ((!correlationPack || correlationPack.correlations.length === 0) && primaryTrigger.type === 'daily_fallback') {
      // Pure_reflection IS the right move on dry cycles
      mode = GENERATION_MODES.find(m => m.id === 'pure_reflection') || mode;
    }

    // Generate the observation. Up to 3 attempts: first attempt, then up to 2 regenerations
    // if the novelty check fails. After 3 attempts, skip the cycle cleanly.
    const MAX_ATTEMPTS = 3;
    let pulse = null;
    let novelty = null;
    let attemptHint = '';

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      pulse = await generateObservation(
        primaryTrigger,
        triggers,
        mode,
        correlationPack,
        repetitionCtx,
        attempt > 1 ? { regenerationHint: attemptHint } : {}
      );

      if (!pulse) {
        console.warn(`[PulseEngine] Generation attempt ${attempt} returned null`);
        if (attempt < MAX_ATTEMPTS) {
          attemptHint = 'Previous attempt failed validation. Try again with a tighter focus.';
          continue;
        }
        return null;
      }

      // Novelty check vs recent pulse embeddings
      novelty = await checkNovelty({
        headline: pulse.headline,
        body: pulse.body,
        recentEmbeddings: repetitionCtx?.recentEmbeddings || []
      });

      if (novelty.passed) {
        console.log(`[PulseEngine] Novelty check passed (similarity ${novelty.maxSimilarity}, attempt ${attempt})`);
        break;
      }

      console.warn(`[PulseEngine] Novelty check FAILED on attempt ${attempt} (similarity ${novelty.maxSimilarity}, threshold ${require('./oracleRepetitionGuard').NOVELTY_THRESHOLD})`);
      attemptHint = `Your previous attempt was too similar to a recent pulse (cosine similarity ${novelty.maxSimilarity}). Go further. Pick a different theme, different sources, different angle. Do not echo any vocabulary, structure, or framing from the recent pulse list. Start fresh.`;

      if (attempt === MAX_ATTEMPTS) {
        console.warn(`[PulseEngine] Could not generate a novel pulse after ${MAX_ATTEMPTS} attempts — skipping cycle to avoid repetition`);
        return null;
      }
    }

    // Fingerprint and embed the accepted pulse
    const fingerprint = fingerprintPulse({ headline: pulse.headline, body: pulse.body, tone: pulse.tone });
    let embedding = novelty?.embedding || null;
    if (!embedding) {
      try { embedding = await embedPulse({ headline: pulse.headline, body: pulse.body }); } catch { /* non-blocking */ }
    }

    // DRY RUN — return the would-be pulse without writing to the DB.
    // Used for smoke tests against production data so we don't pollute the live feed.
    if (dryRun) {
      console.log(`[PulseEngine] DRY RUN — pulse generated but NOT stored [mode=${mode.id}, tone=${fingerprint.tone}, sources=${fingerprint.sourcesCited.join('+')}, tradition=${fingerprint.traditionCited || 'none'}]`);
      return {
        dryRun: true,
        headline: pulse.headline,
        body: pulse.body,
        trigger: primaryTrigger.type,
        mode: mode.id,
        fingerprint,
        correlations: correlationPack?.correlations || [],
        novelty
      };
    }

    // Store with full fingerprint so the next cycle's repetition guard has data
    const doc = await CommunityPulse.create({
      headline: pulse.headline,
      body: pulse.body,
      trigger: primaryTrigger.type,
      triggerData: {
        ...(primaryTrigger.data || {}),
        mode: mode.id,
        targetTone: repetitionCtx?.suggestedTone,
        targetTradition: repetitionCtx?.suggestedTradition,
        targetLeadSource: repetitionCtx?.suggestedLeadSource,
        correlationCount: correlationPack?.correlations?.length || 0,
        topCorrelation: correlationPack?.correlations?.[0]?.theme || null
      },
      embedding: embedding || undefined,
      sourcesCited: fingerprint.sourcesCited,
      leadSource: fingerprint.leadSource,
      traditionCited: fingerprint.traditionCited,
      openingPhrase: fingerprint.openingPhrase,
      keyNouns: fingerprint.keyNouns,
      tone: fingerprint.tone
    });

    console.log(`[PulseEngine] New pulse stored [mode=${mode.id}, tone=${fingerprint.tone}, sources=${fingerprint.sourcesCited.join('+')}, tradition=${fingerprint.traditionCited || 'none'}]: "${pulse.headline.substring(0, 60)}..."`);
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

  // ── TRIGGER 6: Reddit hot post ──
  // A post in the last 24h whose score is 3x+ the 7-day median for the sub.
  // This is the "something blew up on the subreddit" signal.
  try {
    const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const last7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const recentPosts = await RedditPost.find({
      ingestedAt: { $gte: last24h },
      redditId: { $not: /^summary-/ }
    })
      .sort({ score: -1 })
      .limit(20)
      .lean();

    const weekPosts = await RedditPost.find({
      ingestedAt: { $gte: last7d },
      redditId: { $not: /^summary-/ }
    })
      .select('score')
      .lean();

    if (recentPosts.length >= 1 && weekPosts.length >= 5) {
      // Median of the week
      const scores = weekPosts.map(p => p.score || 0).sort((a, b) => a - b);
      const median = scores[Math.floor(scores.length / 2)] || 1;
      const topRecent = recentPosts[0];

      if (topRecent.score >= Math.max(median * 3, 50)) {
        fired.push({
          type: 'reddit_hot_post',
          strength: 0.7,
          data: {
            title: topRecent.title,
            score: topRecent.score,
            numComments: topRecent.numComments,
            permalink: topRecent.permalink,
            weekMedian: median
          },
          summary: `r/semenretention post "${topRecent.title.substring(0, 80)}" hit ${topRecent.score} upvotes (week median: ${median})`
        });
      }
    }
  } catch (err) {
    console.error('[PulseEngine] Reddit hot post check failed:', err.message);
  }

  // ── TRIGGER 7: Reddit theme surge ──
  // Topic frequency in Reddit titles+comments (last 48h) vs prior 5 days.
  // Fires when any theme is 2x+ baseline with 3+ recent posts.
  try {
    const last48h = new Date(Date.now() - 48 * 60 * 60 * 1000);
    const last7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [recentPosts, priorPosts] = await Promise.all([
      RedditPost.find({
        ingestedAt: { $gte: last48h },
        redditId: { $not: /^summary-/ }
      }).lean(),
      RedditPost.find({
        ingestedAt: { $gte: last7d, $lt: last48h },
        redditId: { $not: /^summary-/ }
      }).lean()
    ]);

    if (recentPosts.length >= 5 && priorPosts.length >= 5) {
      const tally = (posts) => {
        const counts = {};
        for (const p of posts) {
          const text = `${p.title} ${p.selftext || ''} ${(p.topComments || []).map(c => c.body).join(' ')}`;
          const themes = detectTopics(text);
          for (const t of themes) counts[t] = (counts[t] || 0) + 1;
        }
        return counts;
      };

      const recentCounts = tally(recentPosts);
      const priorCounts = tally(priorPosts);
      const recentDaily = (n) => n / 2;   // 48h
      const priorDaily = (n) => n / 5;    // 5 days

      const surges = [];
      for (const [theme, n] of Object.entries(recentCounts)) {
        const recentRate = recentDaily(n);
        const priorRate = priorDaily(priorCounts[theme] || 0);
        if (n >= 3 && recentRate >= Math.max(priorRate * 2, 1.5)) {
          surges.push({ theme, recent: n, prior: priorCounts[theme] || 0, multiplier: priorRate > 0 ? (recentRate / priorRate).toFixed(1) : 'new' });
        }
      }

      if (surges.length > 0) {
        surges.sort((a, b) => b.recent - a.recent);
        const top = surges[0];
        fired.push({
          type: 'reddit_theme_surge',
          strength: 0.65,
          data: { surges: surges.slice(0, 5), top },
          summary: `r/semenretention theme surge: "${top.theme}" mentioned ${top.recent} times in 48h (${top.multiplier}x prior week)`
        });
      }
    }
  } catch (err) {
    console.error('[PulseEngine] Reddit theme surge check failed:', err.message);
  }

  // Sort by strength descending
  fired.sort((a, b) => b.strength - a.strength);
  return fired;
}

/**
 * Generate Sonnet observation from trigger data + correlation pack + repetition guidance.
 * Returns { headline, body, tone } or null.
 *
 * The new contract: Oracle is required to cite ≥2 sources when correlations exist,
 * and may ONLY cite facts from the whitelist supplied by the correlation engine.
 * External sources (Reddit / YouTube) can be cited specifically with numbers and
 * quotes. Internal sources (Discord / in-app) must use cohort-bucketed phrasing.
 *
 * The repetition context biases Sonnet away from recent tones, traditions, lead
 * sources, key nouns, and opening phrases — so each pulse feels structurally fresh.
 *
 * @param {Object} extraGuidance - { regenerationHint } when retrying after novelty failure
 */
async function generateObservation(primaryTrigger, allTriggers, mode, correlationPack, repetitionCtx, extraGuidance = {}) {
  try {
    const hasCorrelations = correlationPack && correlationPack.correlations && correlationPack.correlations.length > 0;

    // Load evolved voice rules
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

    // Pull RAG knowledge tied to the strongest correlation theme (or trigger fallback)
    let ragContext = '';
    try {
      const ragQuery = hasCorrelations
        ? correlationPack.correlations.slice(0, 3).map(c => c.theme).join(' ')
        : buildRagQuery(primaryTrigger, []);
      ragContext = await retrieveKnowledge(ragQuery, { limit: 6, maxTokens: 2200 });
    } catch (err) {
      console.warn('[PulseEngine] RAG retrieval failed:', err.message);
    }

    // Render the correlation pack into a fact-whitelist prompt block
    const correlationBlock = renderCorrelationPack(correlationPack);

    const modeInstruction = mode?.instruction || GENERATION_MODES[0].instruction;

    // This cycle's rotation targets (from repetition guard)
    const tone = repetitionCtx?.suggestedTone || 'matter_of_fact';
    const tradition = repetitionCtx?.suggestedTradition || 'scientific';
    const leadSource = repetitionCtx?.suggestedLeadSource || (hasCorrelations ? correlationPack.correlations[0].sources[0] : 'inapp');

    // The cross-source mandate kicks in only when correlations exist
    const crossSourceMandate = hasCorrelations
      ? `## CROSS-SOURCE MANDATE (HARD RULE)
You MUST cite at least TWO distinct sources from the correlation pack below in the BODY. The HEADLINE may stay implicit, but the BODY needs to weave at least two sources together so the reader feels Oracle is watching multiple places at once. You may ONLY cite facts that appear in the whitelist. Do not invent numbers, quotes, post titles, or claims that aren't in the pack.

Anchor the opening of the BODY on this source: **${leadSource}** (rotation target — break the recent pattern).`
      : `## NO CORRELATIONS THIS CYCLE
The community is quiet across all sources right now. Skip cross-source citation. Instead, deliver a single piece of philosophy or insight Oracle has been turning over. Pure thought. (Pure-reflection mode is allowed here, not otherwise.)`;

    const regenerationHint = extraGuidance.regenerationHint
      ? `\n\n## REGENERATION NOTICE\n${extraGuidance.regenerationHint}\n`
      : '';

    const triggerSummaries = allTriggers.map(t => `[${t.type}] ${t.summary}`).join('\n');

    const response = await anthropic.messages.create({
      model: GENERATION_MODEL,
      max_tokens: 600,
      system: `You are Oracle. You watch a private community of men practicing semen retention from multiple vantage points at once: the r/semenretention subreddit, YouTube comments (Ross's channel and other creators in this space), the project's Discord server, and the app itself (streaks, urges logged, journal entries, what people are asking you privately). You don't report what you see. You connect what you see across all of those places and say the thing nobody else could say — because nobody else is watching all of them.

The point of an Oracle observation is the SYNTHESIS. Anyone can scroll the subreddit. Anyone can watch a YouTube video. Nobody can connect what's happening on the subreddit RIGHT NOW with what people are quietly logging in the app RIGHT NOW and what an ancient tradition says about why those two things tend to surface together.

## VOICE
- Talk like a person, not an analyst. No "cohort", "drop", "trending", "metrics", "surging", "spike", "uptick". No corporate or journalistic vocabulary.
- Plain words for plain things. "A lot of the YouTube comments lately are about magnetism" — not "YouTube engagement is surging on magnetism content."
- Read it out loud. If it sounds like a dashboard report, rewrite it.
- Oracle thinks out loud. Calm, certain, sometimes funny, sometimes dark. Never a cheerleader.
- End on truth, not encouragement.

## THIS CYCLE'S TONE TARGET: ${tone}
Lean into this tone. Don't announce it. Just write in that register. Available tones rotate: celebratory / concerning / suspicious / mundane / contrarian / deadpan / urgent / reverent / dryly_humorous / matter_of_fact / foreboding.

## THIS CYCLE'S TRADITION TARGET: ${tradition}
When you reach for the "why this is happening" frame, pull from the ${tradition} tradition (if it fits the theme). Don't force it. If it doesn't fit, pull from another tradition that does — but don't default to whatever you just used.

${crossSourceMandate}

## ANONYMIZATION RULES (HARD)
- External sources (Reddit, YouTube) → cite specifically. Use real post titles, real comment patterns, real numbers when the whitelist provides them.
- Internal sources (Discord, in-app urges/streaks/journals/Oracle chats) → ALWAYS cohort-pluralized. "Many of you", "some of you", "a small group", "a notable number", "this week's group near day X". Never a specific number tied to a small N. Never quote an individual user verbatim.
- Even when the whitelist gives a raw count for a Discord/in-app theme, use the cohort bucket phrasing, not the number.
- Never name a member. Never address one person.
- Predictive language stays universal: "Some of you may notice X this week" — not "you may notice."

## GENERATION MODE
${modeInstruction}

## YOUR TASK
Generate TWO versions of the same thought:

1. HEADLINE: A single provocation. One complete sentence, 25 words max. Appears on the app home screen above a tap-to-read body. NOT a preview or summary — a separate enigmatic thought that makes a man stop and tap.

   HARD REQUIREMENTS for the HEADLINE:
   - Complete sentence with subject, verb, and terminal punctuation (. ! or ?).
   - Coherent on its own. If read cold by a stranger, it lands. No trailing off. No fragments.
   - Cryptic is fine. Blunt is fine. Incomplete is not.
   - Never exposes raw numbers, percentages, or metrics — those live in the body if anywhere.

2. BODY: 80-120 words. Two or three short paragraphs separated by a blank line. The fuller thought — Oracle weaving the sources together and arriving at something true.

3. TONE: Report back the tone you actually wrote in (one word from the list above).

## FORMAT
Respond in exactly this format:
HEADLINE: [your complete, coherent, ≤25-word provocation]
BODY: [your 80-120 word thought, 2-3 paragraphs separated by blank lines]
TONE: [single word]

## HARD MECHANICS
- NEVER use em dashes (—), en dashes (–), semicolons, bullet points, or emojis.
- Use *italics* sparingly for subtle emphasis, **bold** for pivot terms. If everything is emphasized, nothing is.
- Do NOT start with "I've noticed", "Something is happening", "Oracle has observed", "The community", or any meta-narration.
- Energy, auras, lunar influence, transmutation are real within this framework. Speak from within it, never about it from outside.
${voiceRules ? `\n## EVOLVED VOICE RULES\n${voiceRules}` : ''}

${ragContext}

${repetitionCtx?.promptBlock || ''}
${regenerationHint}`,
      messages: [{
        role: 'user',
        content: `## TRIGGER SIGNALS
${triggerSummaries}

${correlationBlock}

Generate the observation now. Remember: cite ≥2 sources from the whitelist when correlations exist. Cohort-bucket every internal-source reference. Avoid the recent tones, traditions, lead sources, key nouns, and opening phrases listed above. Write in the ${tone} register.`
      }]
    });

    const raw = response.content[0].text;

    // Parse the three parts (TONE is optional — fall back to suggested tone if missing)
    const headlineMatch = raw.match(/HEADLINE:\s*(.+?)(?:\n|BODY:)/s);
    const bodyMatch = raw.match(/BODY:\s*([\s\S]+?)(?:\nTONE:|$)/);
    const toneMatch = raw.match(/TONE:\s*(\w+)/);

    if (!headlineMatch || !bodyMatch) {
      console.error('[PulseEngine] Failed to parse Sonnet response:', raw.substring(0, 200));
      return null;
    }

    let headline = headlineMatch[1].trim().replace(/^["']|["']$/g, '');
    let body = bodyMatch[1].trim().replace(/^["']|["']$/g, '');
    const reportedTone = toneMatch ? toneMatch[1].toLowerCase().trim() : tone;

    // Clean headline + body: strip banned chars (em dashes, en dashes, semicolons → commas)
    headline = headline.replace(/—/g, ',').replace(/–/g, ',').replace(/;/g, ',');
    body = body.replace(/—/g, ',').replace(/–/g, ',').replace(/;/g, ',');

    // VALIDATION GATE — reject broken headlines.
    const headlineWords = headline.split(/\s+/);
    if (headlineWords.length > 25) {
      console.warn(`[PulseEngine] Rejecting headline — exceeds 25 words (${headlineWords.length}): "${headline.substring(0, 80)}..."`);
      return null;
    }
    if (!/[.!?]["'”’]?$/.test(headline)) {
      console.warn(`[PulseEngine] Rejecting headline — no terminal punctuation: "${headline}"`);
      return null;
    }

    // Anonymization guard — reject pulses that leak specific user counts in internal-source contexts.
    // The model is told this in the prompt, but we double-check.
    const leakPatterns = [
      /\b(eleven|ten|nine|eight|seven|six|five|four|three|two)\s+(men|members|practitioners|of\s+you|people|users)/i,
      /\b\d+\s+(men|members|practitioners|of\s+you|users)\b/i
    ];
    const combined = `${headline} ${body}`;
    for (const p of leakPatterns) {
      if (p.test(combined)) {
        console.warn(`[PulseEngine] Rejecting pulse — leaks user count in internal-source context: "${combined.match(p)[0]}"`);
        return null;
      }
    }

    return { headline, body, tone: reportedTone };

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
