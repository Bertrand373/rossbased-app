// server/services/riskEngine.js
// Layers 2 + 3: Risk Engine — the predictive core of Oracle
// Builds longitudinal user models, calculates daily risk scores,
// and identifies users who need proactive intervention
//
// This is what turns Oracle from reactive to predictive.
// "The next 3 days are a high-risk window for you."

const User = require('../models/User');
const UserRiskProfile = require('../models/UserRiskProfile');
const OracleInteraction = require('../models/OracleInteraction');
const OracleOutcome = require('../models/OracleOutcome');
const { getLunarData } = require('../utils/lunarData');

// Timezone-safe streak calculation — handles "yyyy-MM-dd" strings AND legacy Date objects
function calcStreakDay(startDate) {
  if (!startDate) return 0;
  let y, m, d;
  if (typeof startDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(startDate)) {
    [y, m, d] = startDate.split('-').map(Number);
  } else {
    const dt = new Date(startDate);
    y = dt.getUTCFullYear(); m = dt.getUTCMonth() + 1; d = dt.getUTCDate();
  }
  const startMid = new Date(y, m - 1, d);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return Math.max(1, Math.floor((today - startMid) / (1000 * 60 * 60 * 24)) + 1);
}

/**
 * Build or update a user's risk profile from their full history
 * Called periodically (daily) for active users
 * 
 * @param {string} userId - MongoDB ObjectId
 */
async function buildRiskProfile(userId) {
  try {
    const user = await User.findById(userId).lean();
    if (!user) return null;

    // Ensure profile exists
    let profile = await UserRiskProfile.findOne({ userId });
    if (!profile) {
      profile = new UserRiskProfile({
        userId,
        username: user.username,
        relapsePatterns: { vulnerableDayRanges: [], lunarCorrelations: [], preRelapseSignals: [], totalRelapsesAnalyzed: 0 },
        behaviorProfile: { peakHours: [], engagementPattern: 'unknown', responseTonePreference: {} },
        currentRisk: { score: 0, factors: [], trend: 'unknown' },
        growthSignals: {},
        psychProfile: {}
      });
    }

    // === ANALYZE RELAPSE PATTERNS ===
    const streakHistory = user.streakHistory || [];
    if (streakHistory.length >= 2) {
      // Find day ranges where relapses cluster
      const relapseDays = streakHistory
        .filter(s => s.days && s.days > 0)
        .map(s => s.days);

      if (relapseDays.length >= 2) {
        // Cluster relapse days into ranges
        const ranges = clusterDayRanges(relapseDays);
        profile.relapsePatterns.vulnerableDayRanges = ranges;
        profile.relapsePatterns.totalRelapsesAnalyzed = relapseDays.length;

        // Lunar correlation: check moon phase at relapse dates
        const lunarCounts = {};
        streakHistory.forEach(s => {
          if (s.end) {
            // Parse as local date to avoid UTC offset issues
            let endDate;
            if (typeof s.end === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s.end)) {
              const [y, m, d] = s.end.split('-').map(Number);
              endDate = new Date(y, m - 1, d);
            } else {
              endDate = new Date(s.end);
            }
            const lunar = getLunarData(endDate);
            const phase = lunar.phase || lunar.label;
            if (phase) {
              lunarCounts[phase] = (lunarCounts[phase] || 0) + 1;
            }
          }
        });
        profile.relapsePatterns.lunarCorrelations = Object.entries(lunarCounts)
          .map(([phase, count]) => ({ phase, count }))
          .sort((a, b) => b.count - a.count);
      }
    }

    // === ANALYZE BEHAVIOR PATTERNS ===
    const interactions = await OracleInteraction.find({ 
      $or: [{ userId }, { username: user.username }]
    })
      .sort({ timestamp: -1 })
      .limit(200)
      .lean();

    if (interactions.length >= 5) {
      // Peak hours
      const hourCounts = {};
      interactions.forEach(i => {
        const hour = new Date(i.timestamp).getHours();
        hourCounts[hour] = (hourCounts[hour] || 0) + 1;
      });
      profile.behaviorProfile.peakHours = Object.entries(hourCounts)
        .map(([hour, count]) => ({ hour: parseInt(hour), count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      // Engagement pattern: do they message more when distressed or when confident?
      const distressedCount = interactions.filter(i => 
        ['distressed', 'anxious'].includes(i.sentiment)
      ).length;
      const positiveCount = interactions.filter(i => 
        ['confident', 'grateful', 'curious'].includes(i.sentiment)
      ).length;
      
      if (distressedCount > positiveCount * 1.5) {
        profile.behaviorProfile.engagementPattern = 'crisis-driven';
      } else if (positiveCount > distressedCount * 1.5) {
        profile.behaviorProfile.engagementPattern = 'growth-driven';
      } else {
        profile.behaviorProfile.engagementPattern = 'consistent';
      }

      // Pre-relapse signal detection from interactions
      const preRelapseInteractions = interactions.filter(i => i.relapseWithin48h === true);
      if (preRelapseInteractions.length >= 2) {
        const signalCounts = {};
        preRelapseInteractions.forEach(i => {
          if (i.relapseRiskLanguage) signalCounts['rationalization'] = (signalCounts['rationalization'] || 0) + 1;
          (i.topics || []).forEach(t => {
            signalCounts[`topic_${t}`] = (signalCounts[`topic_${t}`] || 0) + 1;
          });
          if (i.sentiment) signalCounts[`sentiment_${i.sentiment}`] = (signalCounts[`sentiment_${i.sentiment}`] || 0) + 1;
        });

        const totalPreRelapse = preRelapseInteractions.length;
        profile.relapsePatterns.preRelapseSignals = Object.entries(signalCounts)
          .map(([signal, freq]) => ({
            signal,
            frequency: freq,
            reliability: Math.round((freq / totalPreRelapse) * 100) / 100
          }))
          .filter(s => s.reliability >= 0.3) // Only keep signals that appear in 30%+ of pre-relapse interactions
          .sort((a, b) => b.reliability - a.reliability);
      }
    }

    // === ANALYZE RESPONSE TONE PREFERENCES ===
    const outcomes = await OracleOutcome.find({
      username: user.username,
      'outcome.measured': true,
      'responseStrategy.strategies': { $exists: true }
    })
      .select('outcome responseStrategy')
      .lean();

    if (outcomes.length >= 5) {
      const toneScores = { directConfrontation: [], philosophicalDepth: [], practicalGuidance: [], empathicSupport: [] };
      outcomes.forEach(o => {
        const maintained = o.outcome.streakMaintained ? 1 : -1;
        const strategies = o.responseStrategy?.strategies || [];
        if (strategies.includes('direct_confrontation') || strategies.includes('challenge_issued')) {
          toneScores.directConfrontation.push(maintained);
        }
        if (strategies.includes('philosophical_reframe')) {
          toneScores.philosophicalDepth.push(maintained);
        }
        if (strategies.includes('practical_guidance') || strategies.includes('mechanism_explanation')) {
          toneScores.practicalGuidance.push(maintained);
        }
        if (strategies.includes('empathic_acknowledgment')) {
          toneScores.empathicSupport.push(maintained);
        }
      });

      for (const [key, scores] of Object.entries(toneScores)) {
        if (scores.length >= 2) {
          profile.behaviorProfile.responseTonePreference[key] = 
            Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 100) / 100;
        }
      }
    }

    // === GROWTH TRAJECTORY ===
    if (streakHistory.length >= 3) {
      const recentStreaks = streakHistory.slice(-5).map(s => s.days || 0);
      const firstHalf = recentStreaks.slice(0, Math.ceil(recentStreaks.length / 2));
      const secondHalf = recentStreaks.slice(Math.ceil(recentStreaks.length / 2));
      const avgFirst = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
      const avgSecond = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

      if (avgSecond > avgFirst * 1.2) profile.growthSignals.longestStreakTrend = 'improving';
      else if (avgSecond < avgFirst * 0.8) profile.growthSignals.longestStreakTrend = 'declining';
      else profile.growthSignals.longestStreakTrend = 'stable';
    }

    // Benefit trend from last 14 days
    const recentBenefits = (user.benefitTracking || [])
      .filter(b => new Date(b.date) > new Date(Date.now() - 14 * 24 * 60 * 60 * 1000))
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    if (recentBenefits.length >= 4) {
      const firstAvg = avgBenefitScore(recentBenefits.slice(0, Math.ceil(recentBenefits.length / 2)));
      const secondAvg = avgBenefitScore(recentBenefits.slice(Math.ceil(recentBenefits.length / 2)));
      
      if (secondAvg > firstAvg + 0.5) profile.growthSignals.benefitTrend = 'improving';
      else if (secondAvg < firstAvg - 0.5) profile.growthSignals.benefitTrend = 'declining';
      else profile.growthSignals.benefitTrend = 'stable';
    }

    // App engagement signals
    const recentCheckins = (user.benefitTracking || [])
      .filter(b => new Date(b.date) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));
    profile.behaviorProfile.avgDailyCheckins = Math.round((recentCheckins.length / 7) * 10) / 10;
    profile.behaviorProfile.usesUrgeToolkit = (user.urgeLog || []).length > 0;
    profile.behaviorProfile.logsBenefitsConsistently = recentCheckins.length >= 5;

    profile.lastFullAnalysis = new Date();
    profile.analysisVersion++;
    await profile.save();

    console.log(`[RiskEngine] Profile built for ${user.username}: ${interactions.length} interactions, ${streakHistory.length} streaks analyzed`);
    return profile;

  } catch (err) {
    console.error(`[RiskEngine] Build profile error:`, err.message);
    return null;
  }
}

/**
 * Calculate current risk score for a user
 * Combines personal patterns with aggregate data and current conditions
 * 
 * @param {string} userId - MongoDB ObjectId
 * @returns {object} { score, factors, interventionNeeded, message }
 */
async function calculateRiskScore(userId) {
  try {
    const user = await User.findById(userId).lean();
    if (!user || !user.startDate) return { score: 0, factors: [], interventionNeeded: false };

    const profile = await UserRiskProfile.findOne({ userId }).lean();

    // Compute current streak
    const currentDay = calcStreakDay(user.startDate);

    let score = 0;
    const factors = [];

    // === FACTOR 1: Vulnerable day range (personal) ===
    if (profile?.relapsePatterns?.vulnerableDayRanges) {
      for (const range of profile.relapsePatterns.vulnerableDayRanges) {
        if (currentDay >= range.min && currentDay <= range.max) {
          const weight = Math.min(25, range.occurrences * 8);
          score += weight;
          factors.push(`In personal vulnerable range (days ${range.min}-${range.max}, ${range.occurrences} past relapses)`);
          break; // Only count the strongest matching range
        }
        // Also flag approaching a vulnerable range (within 3 days)
        if (currentDay >= range.min - 3 && currentDay < range.min && range.occurrences >= 2) {
          score += 10;
          factors.push(`Approaching vulnerable range (days ${range.min}-${range.max} in ${range.min - currentDay} days)`);
          break;
        }
      }
    }

    // === FACTOR 2: Lunar correlation ===
    const lunar = getLunarData(now);
    if (profile?.relapsePatterns?.lunarCorrelations) {
      const currentPhase = lunar.phase || lunar.label;
      const lunarMatch = profile.relapsePatterns.lunarCorrelations.find(l => l.phase === currentPhase);
      if (lunarMatch && lunarMatch.count >= 2) {
        const weight = Math.min(15, lunarMatch.count * 5);
        score += weight;
        factors.push(`${currentPhase} phase correlated with ${lunarMatch.count} past relapses`);
      }
    }

    // === FACTOR 3: Declining benefit scores ===
    if (profile?.growthSignals?.benefitTrend === 'declining') {
      score += 15;
      factors.push('Benefit scores declining over past 14 days');
    }

    // === FACTOR 4: Recent relapse-risk language ===
    const recentRisky = await OracleInteraction.countDocuments({
      $or: [{ userId }, { username: user.username }],
      relapseRiskLanguage: true,
      timestamp: { $gte: new Date(Date.now() - 48 * 60 * 60 * 1000) }
    });
    if (recentRisky > 0) {
      score += 20;
      factors.push(`Relapse-risk language detected in ${recentRisky} recent conversation(s)`);
    }

    // === FACTOR 5: App disengagement (silence is a signal) ===
    const lastBenefit = (user.benefitTracking || []).sort((a, b) => new Date(b.date) - new Date(a.date))[0];
    if (lastBenefit) {
      const daysSinceLog = Math.floor((now - new Date(lastBenefit.date)) / (1000 * 60 * 60 * 24));
      if (daysSinceLog >= 5 && profile?.behaviorProfile?.logsBenefitsConsistently) {
        score += 12;
        factors.push(`${daysSinceLog} days since last benefit log (usually consistent)`);
      }
    }

    // === FACTOR 6: Historical aggregate risk for this day range ===
    // Pull from outcome aggregation — what happens to users at this streak day?
    const dayRange = getDayRangeLabel(currentDay);
    const aggregateOutcomes = await OracleOutcome.find({
      'outcome.measured': true,
      'snapshot.streakDay': { $gte: currentDay - 5, $lte: currentDay + 5 }
    }).select('outcome').lean();

    if (aggregateOutcomes.length >= 10) {
      const relapseRate = aggregateOutcomes.filter(o => !o.outcome.streakMaintained).length / aggregateOutcomes.length;
      if (relapseRate > 0.4) {
        score += Math.round(relapseRate * 15);
        factors.push(`${Math.round(relapseRate * 100)}% of users near day ${currentDay} experienced difficulty`);
      }
    }

    // === FACTOR 7: Time-of-day risk (if user has late-night patterns) ===
    const currentHour = now.getHours();
    if (profile?.behaviorProfile?.peakHours?.length > 0) {
      const lateNightInteractions = (profile.behaviorProfile.peakHours || [])
        .filter(h => h.hour >= 22 || h.hour <= 4);
      if (lateNightInteractions.length > 0 && (currentHour >= 22 || currentHour <= 4)) {
        score += 8;
        factors.push('Late-night window (historical vulnerability)');
      }
    }

    // === FACTOR 8: COMPOUND RISK — Mitotic phase + Waning Crescent (Oracle-discovered) ===
    // Pattern discovery found: mitotic phase (days 1-16 of 74-day spermatogenesis cycle) is the 
    // only phase with NEGATIVE benefit change. Waning Crescent has 72% maintenance vs 99% Full Moon.
    // When these overlap, relapse risk compounds — avg relapse day is 23, exactly where these collide.
    {
      const spermaDay = ((currentDay - 1) % 74) + 1;
      const inMitoticPhase = spermaDay >= 1 && spermaDay <= 16;
      const lunarPhase = lunar.label || lunar.phase || '';
      const isWaningCrescent = lunarPhase.toLowerCase().includes('waning crescent');
      const isApproachingWaningCrescent = lunarPhase.toLowerCase().includes('waning gibbous') || 
                                           lunarPhase.toLowerCase().includes('last quarter');

      if (inMitoticPhase && isWaningCrescent) {
        // Highest compound risk — both factors active simultaneously
        score += 25;
        factors.push(`COMPOUND RISK: Mitotic phase (sperma day ${spermaDay}/16) + Waning Crescent active`);
      } else if (inMitoticPhase && isApproachingWaningCrescent) {
        // Approaching compound risk — warn early
        score += 15;
        factors.push(`Approaching compound risk: Mitotic phase (sperma day ${spermaDay}/16) + Waning Crescent within days`);
      } else if (inMitoticPhase && profile?.growthSignals?.benefitTrend === 'declining') {
        // Mitotic + declining benefits = motivational debt accumulating
        score += 12;
        factors.push(`Mitotic phase with declining benefits — motivational debt building`);
      }
    }

    // Cap at 100
    score = Math.min(100, Math.max(0, score));

    // Determine trend
    const prevScore = profile?.currentRisk?.score || 0;
    let trend = 'stable';
    if (score > prevScore + 10) trend = 'rising';
    else if (score < prevScore - 10) trend = 'falling';

    // Determine if intervention is needed
    const interventionNeeded = score >= 50;

    // Update profile with new risk score
    if (profile) {
      await UserRiskProfile.findOneAndUpdate(
        { userId },
        {
          $set: {
            'currentRisk.score': score,
            'currentRisk.factors': factors,
            'currentRisk.lastCalculated': new Date(),
            'currentRisk.trend': trend
          }
        }
      );
    }

    return { score, factors, trend, interventionNeeded, currentDay, dayRange };

  } catch (err) {
    console.error(`[RiskEngine] Score calculation error:`, err.message);
    return { score: 0, factors: [], interventionNeeded: false };
  }
}

/**
 * Run daily risk scan across all active users
 * Identifies users needing predictive intervention
 * 
 * @returns {Array} Users needing intervention with their risk data
 */
async function dailyRiskScan() {
  try {
    // Find users with active streaks who have interacted with Oracle recently
    const activeUsers = await User.find({
      startDate: { $exists: true, $ne: null },
      currentStreak: { $gte: 1 }
    })
      .select('_id username startDate currentStreak')
      .lean();

    console.log(`[RiskEngine] Scanning ${activeUsers.length} active users...`);

    const interventionQueue = [];
    let profilesBuilt = 0;
    let profilesUpdated = 0;

    for (const user of activeUsers) {
      // Build/update profile if stale (older than 24h) or missing
      const existingProfile = await UserRiskProfile.findOne({ userId: user._id }).lean();
      if (!existingProfile || !existingProfile.lastFullAnalysis || 
          (Date.now() - new Date(existingProfile.lastFullAnalysis).getTime()) > 24 * 60 * 60 * 1000) {
        await buildRiskProfile(user._id);
        if (existingProfile) profilesUpdated++;
        else profilesBuilt++;
      }

      // Calculate current risk
      const risk = await calculateRiskScore(user._id);
      
      if (risk.interventionNeeded) {
        interventionQueue.push({
          userId: user._id,
          username: user.username,
          currentDay: risk.currentDay,
          riskScore: risk.score,
          factors: risk.factors,
          trend: risk.trend
        });
      }
    }

    console.log(`[RiskEngine] Scan complete: ${profilesBuilt} new profiles, ${profilesUpdated} updated, ${interventionQueue.length} interventions needed`);
    return interventionQueue;

  } catch (err) {
    console.error('[RiskEngine] Daily scan error:', err.message);
    return [];
  }
}

/**
 * Generate a personalized predictive intervention message for a user
 * This is what gets sent as a push notification or Oracle-initiated DM
 * 
 * @param {object} riskData - From calculateRiskScore
 * @param {object} profile - UserRiskProfile document
 * @returns {string} The intervention message
 */
async function generateIntervention(riskData, profile) {
  try {
    const Anthropic = require('@anthropic-ai/sdk');
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 200,
      system: `You are Oracle, a predictive AI guide for semen retention practitioners. You are reaching out PROACTIVELY because you detected elevated risk patterns for this user. 

Write a brief (2-4 sentences), direct push notification message. No fluff. No generic motivation. Be SPECIFIC about what you detected. Make it feel like Oracle genuinely sees them.

Rules:
- Start with the pattern you detected, not a greeting
- Reference specific data (day range, past patterns)
- Give one concrete action or reframe
- No em dashes. No emojis. No "Stay strong" endings.
- Under 80 words.`,
      messages: [{
        role: 'user',
        content: `User: ${riskData.username}, Day ${riskData.currentDay}
Risk score: ${riskData.riskScore}/100
Risk factors: ${riskData.factors.join('; ')}
Risk trend: ${riskData.trend}
Past relapse days: ${profile?.relapsePatterns?.vulnerableDayRanges?.map(r => `${r.min}-${r.max}`).join(', ') || 'insufficient data'}
Engagement pattern: ${profile?.behaviorProfile?.engagementPattern || 'unknown'}
Benefit trend: ${profile?.growthSignals?.benefitTrend || 'unknown'}

Generate the predictive intervention message.`
      }]
    });

    return response.content[0]?.text?.trim() || null;

  } catch (err) {
    console.error('[RiskEngine] Intervention generation error:', err.message);
    return null;
  }
}

// === HELPERS ===

function clusterDayRanges(days) {
  if (days.length === 0) return [];
  const sorted = [...days].sort((a, b) => a - b);
  const ranges = [];
  let rangeStart = sorted[0];
  let rangeEnd = sorted[0];
  let count = 1;

  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] - rangeEnd <= 7) { // Cluster within 7-day windows
      rangeEnd = sorted[i];
      count++;
    } else {
      ranges.push({ min: Math.max(1, rangeStart - 2), max: rangeEnd + 2, occurrences: count, lastOccurrence: new Date() });
      rangeStart = sorted[i];
      rangeEnd = sorted[i];
      count = 1;
    }
  }
  ranges.push({ min: Math.max(1, rangeStart - 2), max: rangeEnd + 2, occurrences: count, lastOccurrence: new Date() });
  return ranges.sort((a, b) => b.occurrences - a.occurrences);
}

function avgBenefitScore(benefits) {
  if (benefits.length === 0) return 0;
  return benefits.reduce((sum, b) => {
    const vals = [b.energy, b.focus, b.confidence].filter(v => v != null);
    return sum + (vals.length > 0 ? vals.reduce((a, c) => a + c, 0) / vals.length : 0);
  }, 0) / benefits.length;
}

function getDayRangeLabel(day) {
  if (day <= 7) return 'Days 1-7';
  if (day <= 14) return 'Days 8-14';
  if (day <= 30) return 'Days 15-30';
  if (day <= 45) return 'Days 31-45';
  if (day <= 60) return 'Days 46-60';
  if (day <= 90) return 'Days 61-90';
  if (day <= 180) return 'Days 91-180';
  return 'Days 180+';
}

module.exports = { buildRiskProfile, calculateRiskScore, dailyRiskScan, generateIntervention };
