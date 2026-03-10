// server/services/responseScoring.js
// Layer 1: Conversation Scoring — Oracle learns which responses work
// Classifies Oracle's response approach, then correlates with 48h outcomes
// This is how Oracle discovers what *it said* that actually helped

const Anthropic = require('@anthropic-ai/sdk');
const OracleOutcome = require('../models/OracleOutcome');
const OracleEvolution = require('../models/OracleEvolution');

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const VALID_STRATEGIES = [
  'direct_confrontation',    // Called out the user's BS directly
  'philosophical_reframe',   // Gave a deeper perspective shift
  'practical_guidance',      // Specific actionable steps
  'empathic_acknowledgment', // Validated the struggle, held space
  'pattern_mirror',          // Showed the user a pattern about themselves
  'mechanism_explanation',   // Explained the science/physiology
  'challenge_issued',        // Pushed the user to step up
  'boundary_held'            // Refused to enable, held the standard
];

/**
 * Classify Oracle's response strategy (called during outcome creation)
 * Lightweight Haiku call — fire-and-forget, never blocks user
 * 
 * @param {string} oracleResponse - What Oracle said (first 500 chars)
 * @param {string} userMessage - What the user asked
 * @returns {object} { strategy, tone, challengeLevel }
 */
async function classifyResponseStrategy(oracleResponse, userMessage) {
  try {
    if (!oracleResponse || oracleResponse.length < 20) return null;

    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 200,
      system: `Classify this AI guide's response strategy. Respond ONLY with valid JSON.

Valid strategies (pick 1-2): direct_confrontation, philosophical_reframe, practical_guidance, empathic_acknowledgment, pattern_mirror, mechanism_explanation, challenge_issued, boundary_held

tone: one of "firm", "warm", "neutral", "intense", "measured"
challengeLevel: 1-5 (1 = gentle, 5 = hard confrontation)
responseLength: "brief", "moderate", "detailed"`,
      messages: [{
        role: 'user',
        content: `User asked: "${userMessage.substring(0, 200)}"\n\nOracle responded: "${oracleResponse.substring(0, 500)}"`
      }]
    });

    const raw = response.content[0]?.text?.trim();
    if (!raw) return null;

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
          else return null;
        } catch {
          return null;
        }
      }
    }

    const strategies = Array.isArray(parsed.strategies)
      ? parsed.strategies.filter(s => VALID_STRATEGIES.includes(s)).slice(0, 2)
      : (VALID_STRATEGIES.includes(parsed.strategy) ? [parsed.strategy] : ['practical_guidance']);

    return {
      strategies,
      tone: ['firm', 'warm', 'neutral', 'intense', 'measured'].includes(parsed.tone) ? parsed.tone : 'neutral',
      challengeLevel: Math.min(5, Math.max(1, parseInt(parsed.challengeLevel) || 3)),
      responseLength: ['brief', 'moderate', 'detailed'].includes(parsed.responseLength) ? parsed.responseLength : 'moderate'
    };
  } catch (err) {
    console.error('Response strategy classification error (non-blocking):', err.message);
    return null;
  }
}

/**
 * Analyze which response strategies produce the best outcomes
 * Runs weekly as part of Oracle Evolution pipeline
 * 
 * @returns {object} Strategy effectiveness report
 */
async function analyzeResponseEffectiveness() {
  try {
    const outcomes = await OracleOutcome.find({
      'outcome.measured': true,
      'responseStrategy.strategies': { $exists: true, $ne: [] }
    })
      .select('snapshot outcome responseStrategy')
      .lean();

    if (outcomes.length < 30) {
      console.log(`[ResponseScoring] Only ${outcomes.length} scored outcomes — need 30+`);
      return null;
    }

    // === Aggregate by strategy + context ===
    const strategyStats = {};

    outcomes.forEach(o => {
      const strategies = o.responseStrategy?.strategies || [];
      const phase = o.snapshot?.phase || 'unknown';
      const topic = o.snapshot?.topic || 'general';
      const maintained = o.outcome?.streakMaintained === true;
      const overcameUrge = o.outcome?.overcameUrge === true;

      strategies.forEach(strategy => {
        // Overall strategy performance
        const key = strategy;
        if (!strategyStats[key]) {
          strategyStats[key] = { total: 0, maintained: 0, overcameUrge: 0, contexts: {} };
        }
        strategyStats[key].total++;
        if (maintained) strategyStats[key].maintained++;
        if (overcameUrge) strategyStats[key].overcameUrge++;

        // Strategy + phase context
        const contextKey = `${strategy}|${phase}`;
        if (!strategyStats[key].contexts[contextKey]) {
          strategyStats[key].contexts[contextKey] = { total: 0, maintained: 0, phase, topic };
        }
        strategyStats[key].contexts[contextKey].total++;
        if (maintained) strategyStats[key].contexts[contextKey].maintained++;
      });
    });

    // Build findings
    const strategies = Object.entries(strategyStats)
      .filter(([, stats]) => stats.total >= 5)
      .map(([approach, stats]) => ({
        approach,
        context: 'overall',
        successRate: Math.round((stats.maintained / stats.total) * 100),
        sampleSize: stats.total
      }))
      .sort((a, b) => b.successRate - a.successRate);

    // Context-specific strategies (phase + strategy combos with 3+ samples)
    const contextStrategies = [];
    Object.values(strategyStats).forEach(stats => {
      Object.entries(stats.contexts).forEach(([, ctx]) => {
        if (ctx.total >= 3) {
          contextStrategies.push({
            approach: ctx.topic,
            context: ctx.phase,
            successRate: Math.round((ctx.maintained / ctx.total) * 100),
            sampleSize: ctx.total
          });
        }
      });
    });

    // Tone analysis
    const toneStats = {};
    outcomes.forEach(o => {
      const tone = o.responseStrategy?.tone;
      if (!tone) return;
      if (!toneStats[tone]) toneStats[tone] = { total: 0, maintained: 0 };
      toneStats[tone].total++;
      if (o.outcome?.streakMaintained) toneStats[tone].maintained++;
    });

    // Challenge level analysis
    const challengeStats = {};
    outcomes.forEach(o => {
      const level = o.responseStrategy?.challengeLevel;
      if (!level) return;
      if (!challengeStats[level]) challengeStats[level] = { total: 0, maintained: 0 };
      challengeStats[level].total++;
      if (o.outcome?.streakMaintained) challengeStats[level].maintained++;
    });

    const report = {
      totalScored: outcomes.length,
      overallStrategies: strategies,
      contextStrategies: contextStrategies.sort((a, b) => b.successRate - a.successRate).slice(0, 15),
      toneEffectiveness: Object.entries(toneStats)
        .filter(([, s]) => s.total >= 5)
        .map(([tone, s]) => ({ tone, rate: Math.round((s.maintained / s.total) * 100), n: s.total })),
      challengeEffectiveness: Object.entries(challengeStats)
        .filter(([, s]) => s.total >= 3)
        .map(([level, s]) => ({ level: parseInt(level), rate: Math.round((s.maintained / s.total) * 100), n: s.total }))
    };

    // Save as evolution record
    await OracleEvolution.create({
      type: 'response-strategy',
      content: JSON.stringify(report, null, 2),
      findings: { strategies: [...strategies, ...contextStrategies.slice(0, 10)] },
      dataWindow: {
        from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        to: new Date(),
        outcomesAnalyzed: outcomes.length
      }
    });

    console.log(`[ResponseScoring] Analysis complete: ${outcomes.length} outcomes, ${strategies.length} strategies scored`);
    return report;

  } catch (err) {
    console.error('[ResponseScoring] Analysis error:', err.message);
    return null;
  }
}

module.exports = { classifyResponseStrategy, analyzeResponseEffectiveness };
