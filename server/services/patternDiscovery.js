// server/services/patternDiscovery.js
// Layer 5: Pattern Discovery — Oracle finds what humans haven't named
// Cross-references outcomes with lunar phases, numerology, spermatogenesis,
// benefit trajectories, and conversation metadata to surface novel correlations
//
// This is the layer that generates NEW KNOWLEDGE about retention
// that feeds back into The Protocol and Ross's content.

const Anthropic = require('@anthropic-ai/sdk');
const OracleOutcome = require('../models/OracleOutcome');
const OracleInteraction = require('../models/OracleInteraction');
const OracleEvolution = require('../models/OracleEvolution');
const User = require('../models/User');
const { getLunarData } = require('../utils/lunarData');

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

/**
 * Run comprehensive pattern discovery across all measured outcomes
 * This is the big analysis — runs weekly, uses Sonnet for deep reasoning
 * 
 * @returns {object} Discovered patterns with confidence levels
 */
async function discoverPatterns() {
  try {
    // === GATHER ALL DATA DIMENSIONS ===

    // 1. Measured outcomes with full snapshots
    const outcomes = await OracleOutcome.find({ 'outcome.measured': true })
      .select('snapshot outcome responseStrategy createdAt')
      .lean();

    if (outcomes.length < 30) {
      console.log(`[PatternDiscovery] Only ${outcomes.length} outcomes — need 30+ for discovery`);
      return null;
    }

    // 2. Interaction metadata (topics, sentiments, urgency patterns)
    const interactions = await OracleInteraction.find({
      timestamp: { $gte: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000) }
    })
      .select('streakDay spermaDay phase topics sentiment urgency relapseRiskLanguage relapseWithin48h')
      .lean();

    // 3. Aggregate benefit data from users (anonymized)
    const usersWithBenefits = await User.find({
      'benefitTracking.0': { $exists: true },
      startDate: { $exists: true }
    })
      .select('benefitTracking startDate currentStreak streakHistory')
      .limit(200)
      .lean();

    // === COMPUTE CROSS-DIMENSIONAL CORRELATIONS ===

    // A. Spermatogenesis cycle position vs outcomes
    const spermaCycleOutcomes = {};
    outcomes.forEach(o => {
      const day = o.snapshot?.streakDay;
      if (!day || day < 1) return;
      const spermaDay = ((day - 1) % 74) + 1;
      let spermaPhase;
      if (spermaDay <= 16) spermaPhase = 'mitotic';
      else if (spermaDay <= 40) spermaPhase = 'meiotic';
      else if (spermaDay <= 64) spermaPhase = 'maturation';
      else spermaPhase = 'reabsorption';

      if (!spermaCycleOutcomes[spermaPhase]) {
        spermaCycleOutcomes[spermaPhase] = { total: 0, maintained: 0, avgBenefitDelta: [] };
      }
      spermaCycleOutcomes[spermaPhase].total++;
      if (o.outcome?.streakMaintained) spermaCycleOutcomes[spermaPhase].maintained++;
      
      const delta = o.outcome?.benefitDelta;
      if (delta) {
        const avg = ((delta.energy || 0) + (delta.focus || 0) + (delta.confidence || 0)) / 3;
        spermaCycleOutcomes[spermaPhase].avgBenefitDelta.push(avg);
      }
    });

    // B. Lunar phase at conversation time vs outcomes
    const lunarOutcomes = {};
    outcomes.forEach(o => {
      if (!o.createdAt) return;
      const lunar = getLunarData(new Date(o.createdAt));
      const phase = lunar.label || lunar.phase || 'unknown';
      if (!lunarOutcomes[phase]) {
        lunarOutcomes[phase] = { total: 0, maintained: 0, hadUrge: 0, overcameUrge: 0 };
      }
      lunarOutcomes[phase].total++;
      if (o.outcome?.streakMaintained) lunarOutcomes[phase].maintained++;
      if (o.outcome?.hadUrge) {
        lunarOutcomes[phase].hadUrge++;
        if (o.outcome?.overcameUrge) lunarOutcomes[phase].overcameUrge++;
      }
    });

    // C. Topic + streak day compound patterns
    const compoundPatterns = {};
    outcomes.forEach(o => {
      const topic = o.snapshot?.topic || 'general';
      const day = o.snapshot?.streakDay;
      if (!day) return;
      
      let dayBucket;
      if (day <= 14) dayBucket = '1-14';
      else if (day <= 30) dayBucket = '15-30';
      else if (day <= 60) dayBucket = '31-60';
      else if (day <= 90) dayBucket = '61-90';
      else dayBucket = '90+';

      const key = `${topic}|days_${dayBucket}`;
      if (!compoundPatterns[key]) {
        compoundPatterns[key] = { total: 0, maintained: 0, topic, dayBucket };
      }
      compoundPatterns[key].total++;
      if (o.outcome?.streakMaintained) compoundPatterns[key].maintained++;
    });

    // D. Benefit trajectory patterns before relapse vs maintenance
    const trajectoryPatterns = { preRelapse: [], preMaintenance: [] };
    usersWithBenefits.forEach(user => {
      const benefits = (user.benefitTracking || []).sort((a, b) => new Date(a.date) - new Date(b.date));
      const history = user.streakHistory || [];

      history.forEach(streak => {
        if (!streak.end || !streak.days || streak.days < 14) return;
        
        const endDate = new Date(streak.end);
        // Get benefits in the 7 days before streak end
        const preBenefits = benefits.filter(b => {
          const bDate = new Date(b.date);
          return bDate > new Date(endDate - 7 * 24 * 60 * 60 * 1000) && bDate <= endDate;
        });

        if (preBenefits.length >= 3) {
          const scores = preBenefits.map(b => {
            const vals = [b.energy, b.focus, b.confidence].filter(v => v != null);
            return vals.length > 0 ? vals.reduce((a, c) => a + c, 0) / vals.length : null;
          }).filter(s => s !== null);

          if (scores.length >= 3) {
            const trend = scores[scores.length - 1] - scores[0];
            trajectoryPatterns.preRelapse.push({ days: streak.days, trend, scores });
          }
        }
      });
    });

    // E. Relapse risk language accuracy
    const riskLanguageAccuracy = {
      flaggedTotal: interactions.filter(i => i.relapseRiskLanguage).length,
      flaggedRelapsed: interactions.filter(i => i.relapseRiskLanguage && i.relapseWithin48h === true).length,
      flaggedSurvived: interactions.filter(i => i.relapseRiskLanguage && i.relapseWithin48h === false).length
    };

    // === BUILD STATISTICAL SUMMARY FOR AI ANALYSIS ===
    const dataPackage = {
      totalOutcomes: outcomes.length,
      totalInteractions: interactions.length,
      totalUsersAnalyzed: usersWithBenefits.length,

      spermatogenesisByPhase: Object.entries(spermaCycleOutcomes).map(([phase, stats]) => ({
        phase,
        total: stats.total,
        maintenanceRate: stats.total > 0 ? Math.round((stats.maintained / stats.total) * 100) : 0,
        avgBenefitChange: stats.avgBenefitDelta.length > 0
          ? Math.round((stats.avgBenefitDelta.reduce((a, b) => a + b, 0) / stats.avgBenefitDelta.length) * 100) / 100
          : null
      })),

      lunarByPhase: Object.entries(lunarOutcomes)
        .filter(([, s]) => s.total >= 3)
        .map(([phase, stats]) => ({
          phase,
          total: stats.total,
          maintenanceRate: Math.round((stats.maintained / stats.total) * 100),
          urgeOvercomeRate: stats.hadUrge > 0 ? Math.round((stats.overcameUrge / stats.hadUrge) * 100) : null
        })),

      compoundPatterns: Object.values(compoundPatterns)
        .filter(p => p.total >= 5)
        .map(p => ({
          topic: p.topic,
          dayRange: p.dayBucket,
          total: p.total,
          maintenanceRate: Math.round((p.maintained / p.total) * 100)
        }))
        .sort((a, b) => a.maintenanceRate - b.maintenanceRate),

      preRelapseBenefitTrend: trajectoryPatterns.preRelapse.length > 0
        ? {
          avgTrend: Math.round((trajectoryPatterns.preRelapse.reduce((s, p) => s + p.trend, 0) / trajectoryPatterns.preRelapse.length) * 100) / 100,
          sampleSize: trajectoryPatterns.preRelapse.length,
          avgRelapsedDay: Math.round(trajectoryPatterns.preRelapse.reduce((s, p) => s + p.days, 0) / trajectoryPatterns.preRelapse.length)
        }
        : null,

      relapseLanguageAccuracy: riskLanguageAccuracy
    };

    // === AI PATTERN ANALYSIS ===
    const response = await anthropic.messages.create({
      model: process.env.ORACLE_MODEL || 'claude-sonnet-4-5-20250929',
      max_tokens: 4096,
      system: `You are an analytical system discovering novel patterns in semen retention data. You have access to cross-dimensional data: spermatogenesis cycles, lunar phases, benefit tracking, conversation topics, and measured outcomes.

Your job: find the 3-5 STRONGEST patterns. Not obvious things like "urges are hard." Focus on:
- Non-obvious correlations between biological cycles and outcomes
- Compound patterns (topic X + day range Y = specific outcome)
- Timing patterns that could enable PREDICTIVE intervention

For each discovery, be CONCISE:
1. State the pattern clearly
2. Quantify it
3. Explain the mechanism in one sentence
4. State whether Oracle can act on this

CRITICAL: Keep your response under 3000 tokens. Limit to 5 patterns max. No lengthy explanations.

Respond ONLY with valid JSON:
{
  "patterns": [
    {
      "description": "Clear description of the pattern",
      "variables": ["variable1", "variable2"],
      "strength": 0.0-1.0,
      "sampleSize": N,
      "mechanism": "Why this happens",
      "actionable": true/false,
      "oracleAction": "What Oracle should do with this knowledge"
    }
  ],
  "metaInsight": "One paragraph on the biggest surprise in this data"
}`,
      messages: [{
        role: 'user',
        content: `Analyze this cross-dimensional dataset and discover novel patterns:\n\n${JSON.stringify(dataPackage, null, 2)}`
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
          if (jsonMatch) {
            parsed = JSON.parse(jsonMatch[0]);
          } else {
            throw new Error('No JSON object found');
          }
        } catch {
          try {
            let repaired = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
            const openBraces = (repaired.match(/\{/g) || []).length - (repaired.match(/\}/g) || []).length;
            const openBrackets = (repaired.match(/\[/g) || []).length - (repaired.match(/\]/g) || []).length;
            for (let i = 0; i < openBrackets; i++) repaired += ']';
            for (let i = 0; i < openBraces; i++) repaired += '}';
            repaired = repaired.replace(/,\s*([}\]])/g, '$1');
            parsed = JSON.parse(repaired);
            console.log('[PatternDiscovery] Repaired truncated JSON successfully');
          } catch {
            console.error('[PatternDiscovery] All parse attempts failed — raw length:', raw.length);
            return null;
          }
        }
      }
    }

    const patterns = (parsed.patterns || []).filter(p => p.sampleSize >= 5);

    // Save as evolution record
    await OracleEvolution.create({
      type: 'pattern-discovery',
      content: parsed.metaInsight || 'Pattern discovery analysis complete.',
      findings: {
        correlations: patterns.map(p => ({
          description: p.description,
          variables: p.variables || [],
          strength: p.strength || 0.5,
          sampleSize: p.sampleSize || 0,
          actionable: p.actionable !== false
        }))
      },
      dataWindow: {
        from: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
        to: new Date(),
        outcomesAnalyzed: outcomes.length,
        interactionsAnalyzed: interactions.length,
        usersAnalyzed: usersWithBenefits.length
      }
    });

    console.log(`[PatternDiscovery] Found ${patterns.length} patterns from ${outcomes.length} outcomes`);
    return { patterns, metaInsight: parsed.metaInsight, dataPackage };

  } catch (err) {
    console.error('[PatternDiscovery] Error:', err.message);
    return null;
  }
}

module.exports = { discoverPatterns };
