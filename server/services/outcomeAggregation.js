// server/services/outcomeAggregation.js
// Aggregates measured OracleOutcome data into actionable patterns
// Injected into Oracle context so it can reference real success rates
// Cached for 6 hours to avoid repeated DB queries

const OracleOutcome = require('../models/OracleOutcome');

let cachedPatterns = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 6 * 60 * 60 * 1000; // 6 hours

// Normalize phase names — app stores 'initial'/'purging', aggregator was looking for 'adaptation'/'processing'
// This maps every known variant to a canonical display name
function normalizePhase(raw) {
  const map = {
    // App-side phase keys
    'initial': 'Days 1-14 (Adaptation)',
    'purging': 'Days 15-45 (Processing)',
    'expansion': 'Days 46-90 (Expansion)',
    'integration': 'Days 91-180 (Integration)',
    'mastery': 'Days 180+ (Mastery)',
    // Legacy keys (old naming convention)
    'adaptation': 'Days 1-14 (Adaptation)',
    'processing': 'Days 15-45 (Processing)',
    // Numeric phase IDs (some snapshots store phase.id as number)
    '1': 'Days 1-14 (Adaptation)',
    '2': 'Days 15-45 (Processing)',
    '3': 'Days 46-90 (Expansion)',
    '4': 'Days 91-180 (Integration)',
    '5': 'Days 180+ (Mastery)',
  };
  if (!raw) return null;
  const key = String(raw).toLowerCase().trim();
  return map[key] || null; // Return null for unknown phases — skip them
}

// Derive phase from streak day if phase field is missing/unknown
function phaseFromStreakDay(day) {
  if (!day || day < 1) return null;
  if (day <= 14) return 'Days 1-14 (Adaptation)';
  if (day <= 45) return 'Days 15-45 (Processing)';
  if (day <= 90) return 'Days 46-90 (Expansion)';
  if (day <= 180) return 'Days 91-180 (Integration)';
  return 'Days 180+ (Mastery)';
}

/**
 * Get aggregated outcome patterns for Oracle context injection
 * Returns a formatted string, or empty string if insufficient data
 */
async function getOutcomePatterns() {
  // Return cache if fresh
  if (cachedPatterns && (Date.now() - cacheTimestamp) < CACHE_DURATION) {
    return cachedPatterns;
  }

  try {
    // Only aggregate measured outcomes (exclude admin test accounts)
    const outcomes = await OracleOutcome.find({
      'outcome.measured': true,
      username: { $not: /^(ross|rossbased)$/i }
    })
      .select('snapshot outcome')
      .lean();

    // Need 50+ for any meaningful patterns
    if (outcomes.length < 50) {
      cachedPatterns = '';
      cacheTimestamp = Date.now();
      return '';
    }

    // === OVERALL STATS ===
    const totalMeasured = outcomes.length;
    const totalMaintained = outcomes.filter(o => o.outcome.streakMaintained).length;
    const overallRate = Math.round((totalMaintained / totalMeasured) * 100);

    // === AGGREGATE BY PHASE (with normalization + fallback to streak day) ===
    const phaseStats = {};
    outcomes.forEach(o => {
      // Try normalized phase first, fall back to deriving from streakDay
      let phase = normalizePhase(o.snapshot?.phase) ||
                  normalizePhase(o.snapshot?.phase?.id) ||
                  phaseFromStreakDay(o.snapshot?.streakDay);
      if (!phase) return; // Skip unclassifiable outcomes

      if (!phaseStats[phase]) {
        phaseStats[phase] = { total: 0, maintained: 0, benefitImproved: 0 };
      }
      phaseStats[phase].total++;
      if (o.outcome.streakMaintained) phaseStats[phase].maintained++;

      const delta = o.outcome.benefitDelta;
      if (delta) {
        const avgDelta = ((delta.energy || 0) + (delta.focus || 0) + (delta.confidence || 0)) / 3;
        if (avgDelta > 0) phaseStats[phase].benefitImproved++;
      }
    });

    // === AGGREGATE BY STREAK DAY RANGE (the moat data) ===
    const dayRanges = [
      { label: 'Days 1-7', min: 1, max: 7 },
      { label: 'Days 8-14', min: 8, max: 14 },
      { label: 'Days 15-30', min: 15, max: 30 },
      { label: 'Days 31-45', min: 31, max: 45 },
      { label: 'Days 46-60', min: 46, max: 60 },
      { label: 'Days 61-90', min: 61, max: 90 },
      { label: 'Days 91-180', min: 91, max: 180 },
      { label: 'Days 180+', min: 181, max: Infinity },
    ];

    const dayRangeStats = {};
    outcomes.forEach(o => {
      const day = o.snapshot?.streakDay;
      if (!day || day < 1) return;
      const range = dayRanges.find(r => day >= r.min && day <= r.max);
      if (!range) return;
      if (!dayRangeStats[range.label]) {
        dayRangeStats[range.label] = { total: 0, maintained: 0, urgeTotal: 0, urgeOvercome: 0 };
      }
      dayRangeStats[range.label].total++;
      if (o.outcome.streakMaintained) dayRangeStats[range.label].maintained++;
      if (o.outcome.hadUrge) {
        dayRangeStats[range.label].urgeTotal++;
        if (o.outcome.overcameUrge) dayRangeStats[range.label].urgeOvercome++;
      }
    });

    // === AGGREGATE BY TOPIC ===
    const topicStats = {};
    outcomes.forEach(o => {
      const topic = o.snapshot?.topic || 'general';
      if (!topicStats[topic]) {
        topicStats[topic] = { total: 0, maintained: 0, overcameUrge: 0, hadUrge: 0 };
      }
      topicStats[topic].total++;
      if (o.outcome.streakMaintained) topicStats[topic].maintained++;
      if (o.outcome.hadUrge) {
        topicStats[topic].hadUrge++;
        if (o.outcome.overcameUrge) topicStats[topic].overcameUrge++;
      }
    });

    // === BUILD CONTEXT STRING ===
    const lines = [];

    lines.push(`ORACLE OUTCOME DATA (${totalMeasured} conversations measured, ${overallRate}% overall streak maintenance):`);

    // Phase patterns (10+ outcomes per phase)
    const phaseOrder = [
      'Days 1-14 (Adaptation)',
      'Days 15-45 (Processing)',
      'Days 46-90 (Expansion)',
      'Days 91-180 (Integration)',
      'Days 180+ (Mastery)'
    ];
    const phaseLines = [];
    phaseOrder.forEach(phase => {
      const stats = phaseStats[phase];
      if (stats && stats.total >= 10) {
        const rate = Math.round((stats.maintained / stats.total) * 100);
        phaseLines.push(`${phase}: ${rate}% streak maintenance (${stats.total} conversations).`);
      }
    });
    if (phaseLines.length > 0) {
      lines.push('');
      lines.push('BY PHASE:');
      lines.push(...phaseLines);
    }

    // Streak day range patterns (5+ outcomes per range) — this is the moat data
    const dayRangeLines = [];
    dayRanges.forEach(range => {
      const stats = dayRangeStats[range.label];
      if (stats && stats.total >= 5) {
        const maintainRate = Math.round((stats.maintained / stats.total) * 100);
        let line = `${range.label}: ${maintainRate}% maintenance (${stats.total} conversations)`;
        if (stats.urgeTotal >= 3) {
          const urgeRate = Math.round((stats.urgeOvercome / stats.urgeTotal) * 100);
          line += `, ${urgeRate}% overcame urges when they arose`;
        }
        line += '.';
        dayRangeLines.push(line);
      }
    });
    if (dayRangeLines.length > 0) {
      lines.push('');
      lines.push('BY STREAK DAY RANGE:');
      lines.push(...dayRangeLines);
    }

    // Topic patterns (8+ outcomes, exclude 'general')
    const topicInsights = [];
    Object.entries(topicStats).forEach(([topic, stats]) => {
      if (stats.total >= 8 && topic !== 'general') {
        const rate = Math.round((stats.maintained / stats.total) * 100);
        topicInsights.push({ topic, rate, total: stats.total });
        if (stats.hadUrge >= 5) {
          const urgeRate = Math.round((stats.overcameUrge / stats.hadUrge) * 100);
          topicInsights.push({
            topic: `${topic} (urge outcomes)`,
            rate: urgeRate,
            total: stats.hadUrge,
            isUrge: true
          });
        }
      }
    });

    if (topicInsights.length > 0) {
      lines.push('');
      lines.push('BY TOPIC:');
      topicInsights
        .sort((a, b) => b.total - a.total)
        .slice(0, 6)
        .forEach(t => {
          if (t.isUrge) {
            lines.push(`Users discussing ${t.topic}: ${t.rate}% overcame the urge (${t.total} cases).`);
          } else {
            lines.push(`Users discussing ${t.topic}: ${t.rate}% maintained streak (${t.total} conversations).`);
          }
        });
    }

    cachedPatterns = lines.join('\n');
    cacheTimestamp = Date.now();

    console.log(`🔮 Outcome patterns refreshed: ${totalMeasured} measured, ${overallRate}% overall, ${Object.keys(phaseStats).length} phases, ${Object.keys(dayRangeStats).length} day ranges`);
    return cachedPatterns;

  } catch (err) {
    console.error('Outcome aggregation error:', err.message);
    cachedPatterns = '';
    cacheTimestamp = Date.now();
    return '';
  }
}

module.exports = { getOutcomePatterns };
