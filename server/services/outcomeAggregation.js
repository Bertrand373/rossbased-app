// server/services/outcomeAggregation.js
// Aggregates measured OracleOutcome data into actionable patterns
// Injected into Oracle context so it can reference real success rates
// Cached for 6 hours to avoid repeated DB queries

const OracleOutcome = require('../models/OracleOutcome');

let cachedPatterns = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 6 * 60 * 60 * 1000; // 6 hours

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
    // Only aggregate measured outcomes
    const outcomes = await OracleOutcome.find({
      'outcome.measured': true
    })
      .select('snapshot outcome')
      .lean();

    // Need 50+ for any meaningful patterns
    if (outcomes.length < 50) {
      cachedPatterns = '';
      cacheTimestamp = Date.now();
      return '';
    }

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

    // === AGGREGATE BY PHASE ===
    const phaseStats = {};
    outcomes.forEach(o => {
      const phase = o.snapshot?.phase || 'unknown';
      if (!phaseStats[phase]) {
        phaseStats[phase] = { total: 0, maintained: 0, benefitImproved: 0 };
      }
      phaseStats[phase].total++;
      if (o.outcome.streakMaintained) phaseStats[phase].maintained++;

      // Check if benefits improved
      const delta = o.outcome.benefitDelta;
      if (delta) {
        const avgDelta = ((delta.energy || 0) + (delta.focus || 0) + (delta.confidence || 0)) / 3;
        if (avgDelta > 0) phaseStats[phase].benefitImproved++;
      }
    });

    // === OVERALL STATS ===
    const totalMeasured = outcomes.length;
    const totalMaintained = outcomes.filter(o => o.outcome.streakMaintained).length;
    const overallRate = Math.round((totalMaintained / totalMeasured) * 100);

    // === BUILD CONTEXT STRING ===
    const lines = [];

    lines.push(`ORACLE OUTCOME DATA (${totalMeasured} conversations measured):`);
    lines.push(`Overall: ${overallRate}% of users who consulted Oracle maintained their streak within 48 hours.`);

    // Phase patterns (only include phases with 10+ outcomes)
    const phaseNames = {
      adaptation: 'Days 1-14 (Adaptation)',
      processing: 'Days 15-45 (Processing)',
      expansion: 'Days 46-90 (Expansion)',
      integration: 'Days 91-180 (Integration)',
      mastery: 'Days 180+ (Mastery)'
    };

    Object.entries(phaseStats).forEach(([phase, stats]) => {
      if (stats.total >= 10) {
        const rate = Math.round((stats.maintained / stats.total) * 100);
        const name = phaseNames[phase] || phase;
        lines.push(`${name}: ${rate}% streak maintenance (${stats.total} conversations).`);
      }
    });

    // Topic patterns (only include topics with 8+ outcomes)
    const topicInsights = [];
    Object.entries(topicStats).forEach(([topic, stats]) => {
      if (stats.total >= 8 && topic !== 'general') {
        const rate = Math.round((stats.maintained / stats.total) * 100);
        topicInsights.push({ topic, rate, total: stats.total });
        
        // Urge-specific insight
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

    // Sort by sample size, take top 5
    topicInsights
      .sort((a, b) => b.total - a.total)
      .slice(0, 5)
      .forEach(t => {
        if (t.isUrge) {
          lines.push(`Users discussing ${t.topic}: ${t.rate}% overcame the urge (${t.total} cases).`);
        } else {
          lines.push(`Users discussing ${t.topic}: ${t.rate}% maintained streak (${t.total} conversations).`);
        }
      });

    cachedPatterns = lines.join('\n');
    cacheTimestamp = Date.now();

    console.log(`🔮 Outcome patterns refreshed: ${totalMeasured} measured, ${overallRate}% overall maintenance`);
    return cachedPatterns;

  } catch (err) {
    console.error('Outcome aggregation error:', err.message);
    cachedPatterns = '';
    cacheTimestamp = Date.now();
    return '';
  }
}

module.exports = { getOutcomePatterns };
