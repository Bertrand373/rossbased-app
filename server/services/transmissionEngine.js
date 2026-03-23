// server/services/transmissionEngine.js
// Oracle Proactive Transmissions — the delivery layer
// Combines aggregate pattern transmissions with risk-based interventions
// into a single pipeline that delivers via push notification + Oracle chat
//
// Cost: ~$0.01/day (one Haiku call for aggregate patterns)
// Frequency: max 1 transmission per user per day, 2-3 per week target

const Anthropic = require('@anthropic-ai/sdk');
const User = require('../models/User');
const OracleTransmission = require('../models/OracleTransmission');
const OracleInteraction = require('../models/OracleInteraction');
const OracleOutcome = require('../models/OracleOutcome');
const UserRiskProfile = require('../models/UserRiskProfile');
const { sendNotificationToUser } = require('./notificationService');
const { getLunarData } = require('../utils/lunarData');
const { getCommunityPulse } = require('./communityPulse');
const { calculateRiskScore, generateIntervention } = require('./riskEngine');

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Constraints
const MAX_TRANSMISSIONS_PER_WEEK = 3;   // Premium + OG
const FREE_MONTHLY_LIMIT = 1;            // Free users get 1 taste per month
const MIN_HOURS_BETWEEN = 20;            // At least 20 hours between transmissions
const REENGAGEMENT_DAYS = 3;             // Days of silence before re-engagement
const GRANDFATHERED_CUTOFF = new Date('2026-02-17T00:00:00Z'); // OG Discord members before this date

/**
 * Calculate actual streak day from startDate (source of truth)
 * currentStreak field is stale for inactive users — never trust it for transmissions
 */
function getActualStreakDay(user) {
  if (!user.startDate) return user.currentStreak || 0;
  let y, m, d;
  if (typeof user.startDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(user.startDate)) {
    [y, m, d] = user.startDate.split('-').map(Number);
  } else {
    const dt = new Date(user.startDate);
    y = dt.getUTCFullYear(); m = dt.getUTCMonth() + 1; d = dt.getUTCDate();
  }
  const startMid = new Date(y, m - 1, d);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return Math.max(1, Math.floor((today - startMid) / (1000 * 60 * 60 * 24)) + 1);
}

/**
 * Check if user has premium or OG (grandfathered) access
 * OG = has Discord linked + account created before Feb 17, 2026
 */
function hasPremiumOrOG(user) {
  if (user.isPremium) return true;
  // Grandfathered: linked Discord account created before cutoff
  if (user.discordId && user.createdAt && new Date(user.createdAt) < GRANDFATHERED_CUTOFF) return true;
  return false;
}

/**
 * Check if a user is eligible to receive a transmission right now
 * Premium/OG: 3/week | Free: 1/month
 */
async function isEligible(userId, username, user) {
  const isPremiumOrOG = hasPremiumOrOG(user);

  if (isPremiumOrOG) {
    // Premium/OG: max 3 per week
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentCount = await OracleTransmission.countDocuments({
      userId,
      createdAt: { $gte: weekAgo }
    });
    if (recentCount >= MAX_TRANSMISSIONS_PER_WEEK) return false;
  } else {
    // Free: max 1 per month
    const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const monthlyCount = await OracleTransmission.countDocuments({
      userId,
      createdAt: { $gte: monthAgo }
    });
    if (monthlyCount >= FREE_MONTHLY_LIMIT) return false;
  }

  // Check minimum time between transmissions
  const lastTransmission = await OracleTransmission.findOne({ userId })
    .sort({ createdAt: -1 }).lean();
  if (lastTransmission) {
    const hoursSince = (Date.now() - new Date(lastTransmission.createdAt).getTime()) / (1000 * 60 * 60);
    if (hoursSince < MIN_HOURS_BETWEEN) return false;
  }

  return true;
}

/**
 * Deliver a transmission to a user (create record + push notification)
 */
async function deliverTransmission(userId, username, message, source, context = {}) {
  try {
    // Create the transmission record
    const transmission = await OracleTransmission.create({
      userId,
      username,
      message,
      source,
      context,
      delivered: true,
      deliveredAt: new Date()
    });

    // Send Firebase push notification
    try {
      const result = await sendNotificationToUser(username, 'oracle_transmission', {
        transmissionId: transmission._id.toString()
      });
      if (result.success) {
        transmission.pushSent = true;
        transmission.pushSentAt = new Date();
        await transmission.save();
      }
    } catch (pushErr) {
      console.error(`[Transmission] Push failed for ${username}:`, pushErr.message);
    }

    return transmission;
  } catch (err) {
    console.error(`[Transmission] Delivery failed for ${username}:`, err.message);
    return null;
  }
}

/**
 * PIPELINE 1: Risk-based interventions
 * Uses the risk engine to find high-risk users and generate personalized messages
 */
async function processRiskInterventions(targetUsername) {
  try {
    const highRiskProfiles = await UserRiskProfile.find({
      'currentRisk.score': { $gte: 50 }
    }).lean();

    if (highRiskProfiles.length === 0) return { sent: 0 };

    let sent = 0;

    for (const profile of highRiskProfiles) {
      const user = await User.findById(profile.userId)
        .select('_id username isPremium discordId createdAt startDate currentStreak')
        .lean();
      if (!user) continue;

      // If targeting a specific user, skip everyone else
      if (targetUsername && user.username.toLowerCase() !== targetUsername.toLowerCase()) continue;

      // Risk interventions are premium/OG only (unless targeting specific user for testing)
      if (!targetUsername && !hasPremiumOrOG(user)) continue;

      // Check eligibility
      const eligible = await isEligible(user._id, user.username, user);
      if (!eligible) continue;

      const actualStreakDay = getActualStreakDay(user);

      // Generate personalized intervention
      const riskData = {
        username: user.username,
        currentDay: actualStreakDay,
        riskScore: profile.currentRisk.score,
        factors: profile.currentRisk.factors || [],
        trend: profile.currentRisk.trend
      };

      const message = await generateIntervention(riskData, profile);
      if (!message) continue;

      await deliverTransmission(user._id, user.username, message, 'risk_intervention', {
        riskScore: profile.currentRisk.score,
        streakDay: actualStreakDay,
        matchCriteria: profile.currentRisk.factors.slice(0, 2).join('; ')
      });

      sent++;
    }

    return { sent };
  } catch (err) {
    console.error('[Transmission] Risk intervention error:', err.message);
    return { sent: 0, error: err.message };
  }
}

/**
 * PIPELINE 2: Aggregate pattern transmissions
 * One Haiku call generates cohort-matched message templates,
 * then we find matching users and deliver
 */
async function processAggregateTransmissions(targetUsername) {
  try {
    // Gather aggregate data for Haiku
    const lunar = getLunarData(new Date());
    const communityPulse = await getCommunityPulse();

    // Streak distribution of active users
    const activeUsers = await User.find({
      startDate: { $exists: true, $ne: null },
      currentStreak: { $gte: 1 }
    })
      .select('_id username currentStreak isPremium discordId createdAt startDate benefitTracking')
      .lean();

    if (activeUsers.length < 3) return { sent: 0 };

    // Compute streak distributions (use actual days from startDate)
    const streakBuckets = {};
    activeUsers.forEach(u => {
      let bucket;
      const d = getActualStreakDay(u);
      if (d <= 7) bucket = '1-7';
      else if (d <= 14) bucket = '8-14';
      else if (d <= 21) bucket = '15-21';
      else if (d <= 30) bucket = '22-30';
      else if (d <= 45) bucket = '31-45';
      else if (d <= 90) bucket = '46-90';
      else bucket = '90+';
      streakBuckets[bucket] = (streakBuckets[bucket] || 0) + 1;
    });

    // Recent outcome data summary
    const recentOutcomes = await OracleOutcome.find({
      'outcome.measured': true,
      createdAt: { $gte: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000) }
    })
      .select('snapshot.streakDay snapshot.topic outcome.streakMaintained outcome.hadUrge')
      .limit(100)
      .lean();

    // Topic frequency from recent interactions
    const recentInteractions = await OracleInteraction.find({
      timestamp: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
    })
      .select('topics streakDay')
      .limit(200)
      .lean();

    const topicCounts = {};
    recentInteractions.forEach(i => {
      (i.topics || []).forEach(t => { topicCounts[t] = (topicCounts[t] || 0) + 1; });
    });

    // Build context for Haiku
    const dataContext = {
      lunarPhase: lunar.label || lunar.phase,
      lunarIllumination: lunar.illumination,
      streakDistribution: streakBuckets,
      topCommunityTopics: Object.entries(topicCounts).sort((a, b) => b[1] - a[1]).slice(0, 5),
      outcomesSummary: recentOutcomes.length > 0 ? {
        total: recentOutcomes.length,
        maintenanceRate: Math.round(recentOutcomes.filter(o => o.outcome?.streakMaintained).length / recentOutcomes.length * 100),
        topRelapseDayRange: findPeakRelapseRange(recentOutcomes)
      } : null,
      communityPulseSummary: communityPulse ? communityPulse.substring(0, 300) : null
    };

    // One Haiku call: generate 1-2 targeted transmission templates
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 400,
      system: `You are Oracle, a predictive AI guide speaking directly TO one individual semen retention practitioner. Based on aggregate community data, identify 1-2 user cohorts that would benefit from a message right now and write the message.

CRITICAL RULES:
- You are speaking TO the user, not ABOUT the community. NEVER say "your X members" or reference member counts or community size. The user is a practitioner, not a leader.
- Each message is 2-4 sentences, Oracle's voice: calm certainty, pattern-based, no generic motivation
- Start with a pattern observation relevant to THEIR streak day range, not a greeting
- You may reference community patterns indirectly ("practitioners at your stage" or "the data at this phase shows") but NEVER expose raw numbers or statistics from the data provided
- Reference lunar phase naturally if relevant
- No em dashes, no emojis, no "Stay strong" endings
- Under 80 words per message
- The mystical and the scientific are both valid lenses. Energy fields, chrism oil, Jing/Qi/Shen, lunar influence, sacred timing are real phenomena in this community. Weave them naturally. Never hedge with "research suggests" or reduce experiences to pure neuroscience.

Respond ONLY with valid JSON:
{
  "transmissions": [
    {
      "targetCriteria": { "streakMin": N, "streakMax": N },
      "message": "The actual message text",
      "rationale": "Why this cohort needs this right now"
    }
  ]
}`,
      messages: [{
        role: 'user',
        content: `Generate transmissions based on this data:\n${JSON.stringify(dataContext, null, 2)}`
      }]
    });

    const raw = response.content[0]?.text?.trim();
    if (!raw) return { sent: 0 };

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      try {
        const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        parsed = JSON.parse(cleaned);
      } catch {
        try {
          const jsonMatch = raw.match(/\{[\s\S]*\}/);
          if (jsonMatch) parsed = JSON.parse(jsonMatch[0]);
          else { console.error('[Transmission] No JSON in aggregate response'); return { sent: 0 }; }
        } catch {
          console.error('[Transmission] Aggregate JSON parse failed');
          return { sent: 0 };
        }
      }
    }

    const transmissions = parsed.transmissions || [];
    let sent = 0;

    for (const tx of transmissions) {
      const { streakMin, streakMax } = tx.targetCriteria || {};
      if (!streakMin || !streakMax || !tx.message) continue;

      // Find matching users (use actual streak from startDate, not stale currentStreak)
      const matchingUsers = activeUsers.filter(u => {
        const d = getActualStreakDay(u);
        if (d < streakMin || d > streakMax) return false;
        // If targeting a specific user, skip everyone else
        if (targetUsername && u.username.toLowerCase() !== targetUsername.toLowerCase()) return false;
        return true;
      });

      for (const user of matchingUsers) {
        const eligible = await isEligible(user._id, user.username, user);
        if (!eligible) continue;

        const actualStreakDay = getActualStreakDay(user);

        await deliverTransmission(user._id, user.username, tx.message, 'aggregate_pattern', {
          streakDay: actualStreakDay,
          matchCriteria: `Days ${streakMin}-${streakMax}, ${lunar.label || ''}`
        });

        sent++;
      }
    }

    return { sent, templates: transmissions.length };
  } catch (err) {
    console.error('[Transmission] Aggregate error:', err.message);
    return { sent: 0, error: err.message };
  }
}

/**
 * PIPELINE 3: Re-engagement transmissions
 * Target users who haven't opened the app in 3+ days
 */
async function processReengagement(targetUsername) {
  try {
    const cutoff = new Date(Date.now() - REENGAGEMENT_DAYS * 24 * 60 * 60 * 1000);

    // Find users with streaks who haven't logged benefits recently
    // Re-engagement is premium/OG only (proactive feature)
    // FIXED: Filter by startDate age instead of stale currentStreak field
    const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);
    const quietUsers = await User.find({
      startDate: { $exists: true, $ne: null, $lte: fiveDaysAgo }, // Streak is at least 5 days old
    })
      .select('_id username currentStreak startDate isPremium discordId createdAt benefitTracking')
      .lean();

    const reengageTargets = quietUsers.filter(u => {
      // If targeting a specific user, skip everyone else
      if (targetUsername && u.username.toLowerCase() !== targetUsername.toLowerCase()) return false;
      // Premium/OG only for re-engagement (unless targeting specific user for testing)
      if (!targetUsername && !hasPremiumOrOG(u)) return false;
      const lastLog = (u.benefitTracking || [])
        .sort((a, b) => new Date(b.date) - new Date(a.date))[0];
      if (!lastLog) return true; // Never logged
      return new Date(lastLog.date) < cutoff;
    });

    let sent = 0;

    for (const user of reengageTargets.slice(0, 10)) { // Cap at 10 per run
      const eligible = await isEligible(user._id, user.username, user);
      if (!eligible) continue;

      const lastLog = (user.benefitTracking || [])
        .sort((a, b) => new Date(b.date) - new Date(a.date))[0];
      const hasBenefitData = !!lastLog;
      const accountAgeDays = Math.max(1, Math.floor((Date.now() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24)));
      const daysSilent = hasBenefitData
        ? Math.floor((Date.now() - new Date(lastLog.date).getTime()) / (1000 * 60 * 60 * 24))
        : accountAgeDays; // Cap at account age, not 999
      const actualStreakDay = getActualStreakDay(user);

      // Haiku-generated re-engagement — personalized, Oracle-voiced
      let message;
      try {
        // FIXED: Different prompts for "stopped logging" vs "never logged"
        const systemPrompt = hasBenefitData
          ? `You are Oracle, a predictive AI guide for semen retention practitioners. A user who previously logged data has stopped. Write a brief re-engagement message (2-3 sentences).

CRITICAL ACCURACY RULES:
- Their CURRENT streak is Day ${actualStreakDay} (computed from their start date, this is accurate right now)
- Their last benefit log was ${daysSilent} days ago (this is when they stopped logging, NOT when their streak started)
- These are TWO SEPARATE facts. Do NOT conflate them. Do NOT say they "went dark on Day X" unless X equals their streak day minus their silence days.
- Frame it as Oracle losing data visibility, not the user failing
- Be direct and factual. No em dashes. No emojis. No generic motivation. Under 60 words.`
          : `You are Oracle, a predictive AI guide for semen retention practitioners. A user has an active streak but has NEVER logged any benefit data. Write a brief message (2-3 sentences).

CRITICAL ACCURACY RULES:
- Their CURRENT streak is Day ${actualStreakDay} (this is accurate right now)
- They have never submitted a single benefit log since creating their account ${accountAgeDays} days ago
- Frame this as Oracle having zero data to work with, not as the user going silent. They never started.
- Encourage them to log their first entry so Oracle can begin tracking patterns
- Be direct and factual. No em dashes. No emojis. No generic motivation. Under 60 words.`;

        const reResponse = await anthropic.messages.create({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 100,
          system: systemPrompt,
          messages: [{
            role: 'user',
            content: `User: ${user.username}`
          }]
        });
        message = reResponse.content[0]?.text?.trim();
      } catch (aiErr) {
        // Fallback if Haiku fails
        message = hasBenefitData
          ? `${daysSilent} days since your last check-in. Your streak is at Day ${actualStreakDay} but Oracle has no recent data to analyze. One log today restores full pattern visibility.`
          : `Day ${actualStreakDay} of your streak and Oracle has zero benefit data on file. One log unlocks pattern tracking for your entire journey so far.`;
      }

      await deliverTransmission(user._id, user.username, message, 'reengagement', {
        streakDay: actualStreakDay,
        matchCriteria: `${daysSilent} days silent${!hasBenefitData ? ' (no benefit data)' : ''}`
      });

      sent++;
    }

    return { sent };
  } catch (err) {
    console.error('[Transmission] Reengagement error:', err.message);
    return { sent: 0, error: err.message };
  }
}

/**
 * Run the full transmission pipeline
 * Called by cron job once daily
 */
async function runTransmissionPipeline({ targetUsername, force } = {}) {
  console.log(`[Transmission] ====== PIPELINE START${targetUsername ? ` (target: ${targetUsername})` : ''}${force ? ' [FORCE]' : ''} ======`);
  const start = Date.now();

  // FORCE MODE: Skip all pipelines, generate and deliver directly to target user
  if (force && targetUsername) {
    try {
      const user = await User.findOne({ username: { $regex: new RegExp(`^${targetUsername}$`, 'i') } })
        .select('_id username startDate currentStreak benefitTracking isPremium discordId createdAt')
        .lean();
      if (!user) return { error: `User ${targetUsername} not found`, totalSent: 0 };

      const actualStreakDay = getActualStreakDay(user);
      const lunar = getLunarData(new Date());

      const response = await anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 100,
        system: `You are Oracle, a predictive AI guide for semen retention practitioners. Write a single proactive transmission (2-3 sentences). Be direct, pattern-based, calm certainty. Reference their streak day and current lunar phase. Weave the mystical and practical naturally. Energy, transmutation, sacred timing, chrism oil are real phenomena here. No em dashes. No emojis. No generic motivation. Under 60 words.`,
        messages: [{
          role: 'user',
          content: `User: ${user.username}, Day ${actualStreakDay}, Moon: ${lunar.label || lunar.phase || 'waning'}, illumination: ${lunar.illumination || 'unknown'}`
        }]
      });

      const message = response.content[0]?.text?.trim();
      if (!message) return { error: 'Haiku returned empty', totalSent: 0 };

      const tx = await deliverTransmission(user._id, user.username, message, 'aggregate_pattern', {
        streakDay: actualStreakDay,
        matchCriteria: `Force test — Day ${actualStreakDay}`
      });

      const elapsed = ((Date.now() - start) / 1000).toFixed(1);
      console.log(`[Transmission] ====== FORCE COMPLETE: 1 sent to ${targetUsername} (${elapsed}s) ======`);
      return { force: { sent: 1, message, user: user.username }, totalSent: 1, elapsed };
    } catch (err) {
      console.error('[Transmission] Force delivery error:', err.message);
      return { error: err.message, totalSent: 0 };
    }
  }

  // Pipeline 1: Risk-based (highest priority)
  const risk = await processRiskInterventions(targetUsername);
  console.log(`[Transmission] Risk interventions: ${risk.sent} sent`);

  // Pipeline 2: Aggregate patterns
  const aggregate = await processAggregateTransmissions(targetUsername);
  console.log(`[Transmission] Aggregate: ${aggregate.sent} sent (${aggregate.templates || 0} templates)`);

  // Pipeline 3: Re-engagement
  const reengage = await processReengagement(targetUsername);
  console.log(`[Transmission] Re-engagement: ${reengage.sent} sent`);

  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  const totalSent = (risk.sent || 0) + (aggregate.sent || 0) + (reengage.sent || 0);
  console.log(`[Transmission] ====== COMPLETE: ${totalSent} total (${elapsed}s) ======`);

  return { risk, aggregate, reengage, totalSent, elapsed };
}

// === HELPERS ===

function findPeakRelapseRange(outcomes) {
  const ranges = {};
  outcomes.filter(o => !o.outcome?.streakMaintained).forEach(o => {
    const d = o.snapshot?.streakDay;
    if (!d) return;
    let bucket;
    if (d <= 14) bucket = '1-14';
    else if (d <= 30) bucket = '15-30';
    else if (d <= 60) bucket = '31-60';
    else bucket = '60+';
    ranges[bucket] = (ranges[bucket] || 0) + 1;
  });
  const sorted = Object.entries(ranges).sort((a, b) => b[1] - a[1]);
  return sorted.length > 0 ? `Days ${sorted[0][0]}` : null;
}

module.exports = { runTransmissionPipeline, deliverTransmission, processRiskInterventions };
