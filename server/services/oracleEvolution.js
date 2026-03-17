// server/services/oracleEvolution.js
// Layers 4 + 6 + 7: Oracle's self-evolution pipeline
//
// Layer 4: Voice self-assessment — Oracle reviews its own conversation outcomes
//          and discovers which communication patterns produce best results
//
// Layer 6: Psychological profiling — Builds deep per-user understanding
//          that goes beyond flat notes into genuine psychological models
//
// Layer 7: Meta-Oracle — Generates comprehensive system prompt proposals
//          based on all accumulated intelligence

const Anthropic = require('@anthropic-ai/sdk');
const User = require('../models/User');
const UserRiskProfile = require('../models/UserRiskProfile');
const OracleOutcome = require('../models/OracleOutcome');
const OracleInteraction = require('../models/OracleInteraction');
const OracleEvolution = require('../models/OracleEvolution');

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

/**
 * Robust JSON parser — handles markdown fences, truncation, all edge cases
 */
function safeParseJSON(raw, label = 'unknown') {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    try {
      const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      return JSON.parse(cleaned);
    } catch {
      try {
        const jsonMatch = raw.match(/\{[\s\S]*\}/);
        if (jsonMatch) return JSON.parse(jsonMatch[0]);
      } catch { /* fall through */ }
      // Try repairing truncated JSON
      try {
        let repaired = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        const openBraces = (repaired.match(/\{/g) || []).length - (repaired.match(/\}/g) || []).length;
        const openBrackets = (repaired.match(/\[/g) || []).length - (repaired.match(/\]/g) || []).length;
        for (let i = 0; i < openBrackets; i++) repaired += ']';
        for (let i = 0; i < openBraces; i++) repaired += '}';
        repaired = repaired.replace(/,\s*([}\]])/g, '$1');
        return JSON.parse(repaired);
      } catch { /* fall through */ }
      console.error(`[OracleEvolution] JSON parse failed (${label}) — raw length: ${raw.length}`);
      return null;
    }
  }
}

/**
 * Layer 4: Voice Self-Assessment
 * Oracle reviews its own recent conversations against outcomes
 * and identifies what worked vs what didn't in its communication
 * 
 * Runs weekly. Produces actionable anti-patterns and new voice rules.
 */
async function voiceSelfAssessment() {
  try {
    // Get outcomes with response strategies from the last 2 weeks
    const outcomes = await OracleOutcome.find({
      'outcome.measured': true,
      'responseStrategy.strategies': { $exists: true, $ne: [] },
      createdAt: { $gte: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000) }
    })
      .select('snapshot outcome responseStrategy oracleNote')
      .lean();

    if (outcomes.length < 15) {
      console.log(`[OracleEvolution] Only ${outcomes.length} scored outcomes — need 15+ for self-assessment`);
      return null;
    }

    // Split into successful vs unsuccessful
    const successful = outcomes.filter(o => o.outcome.streakMaintained);
    const unsuccessful = outcomes.filter(o => !o.outcome.streakMaintained);

    // Build analysis data
    const successNotes = successful.slice(0, 30).map(o => ({
      context: `Day ${o.snapshot?.streakDay || '?'}, topic: ${o.snapshot?.topic || 'general'}`,
      strategy: o.responseStrategy?.strategies?.join(', ') || 'unknown',
      tone: o.responseStrategy?.tone || 'unknown',
      challenge: o.responseStrategy?.challengeLevel || '?',
      note: o.oracleNote || 'no note'
    }));

    const failNotes = unsuccessful.slice(0, 30).map(o => ({
      context: `Day ${o.snapshot?.streakDay || '?'}, topic: ${o.snapshot?.topic || 'general'}`,
      strategy: o.responseStrategy?.strategies?.join(', ') || 'unknown',
      tone: o.responseStrategy?.tone || 'unknown',
      challenge: o.responseStrategy?.challengeLevel || '?',
      note: o.oracleNote || 'no note'
    }));

    const response = await anthropic.messages.create({
      model: process.env.ORACLE_MODEL || 'claude-sonnet-4-5-20250929',
      max_tokens: 1200,
      system: `You are performing a self-assessment of an AI guide called "The Oracle" for a semen retention community. You are reviewing your own conversations, split into ones where the user maintained their streak vs ones where they didn't.

Your job: identify specific patterns in HOW you communicated that correlated with better vs worse outcomes. Be brutally honest.

Focus on:
1. Which response strategies appeared more in successful vs unsuccessful outcomes
2. Whether tone or challenge level mattered
3. Specific phrases or approaches that may be counterproductive
4. What you should do MORE of (backed by data)
5. What you should STOP doing (backed by data)

Respond ONLY with valid JSON:
{
  "whatWorked": ["specific finding 1", "specific finding 2"],
  "whatFailed": ["specific finding 1", "specific finding 2"],
  "antiPatterns": [{"pattern": "exact behavior", "replacement": "what to do instead", "frequency": N}],
  "voiceRules": ["new rule to add to system prompt"],
  "confidenceLevel": "low/medium/high",
  "summary": "1-2 paragraph honest self-assessment"
}`,
      messages: [{
        role: 'user',
        content: `SUCCESSFUL OUTCOMES (${successful.length} total, showing ${successNotes.length}):\n${JSON.stringify(successNotes, null, 2)}\n\nUNSUCCESSFUL OUTCOMES (${unsuccessful.length} total, showing ${failNotes.length}):\n${JSON.stringify(failNotes, null, 2)}`
      }]
    });

    const raw = response.content[0]?.text?.trim();
    const parsed = safeParseJSON(raw, 'voice-assessment');
    if (!parsed) return null;

    // Dedup: skip if a voice-assessment record already exists from the last 24 hours
    const recentDupe = await OracleEvolution.findOne({
      type: 'voice-assessment',
      createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
    }).select('_id').lean();

    if (recentDupe) {
      console.log('[OracleEvolution] Skipping — voice-assessment record already exists from last 24h');
      return parsed;
    }

    // Save evolution record
    await OracleEvolution.create({
      type: 'voice-assessment',
      content: parsed.summary || 'Voice self-assessment complete.',
      findings: {
        antiPatterns: (parsed.antiPatterns || []).map(ap => ({
          pattern: ap.pattern,
          replacement: ap.replacement,
          frequency: ap.frequency || 0
        })),
        promptChanges: (parsed.voiceRules || []).map(rule => ({
          section: 'HARD RULES',
          currentBehavior: 'N/A',
          proposedChange: rule,
          rationale: 'Discovered through outcome-backed self-assessment',
          confidence: parsed.confidenceLevel === 'high' ? 0.8 : parsed.confidenceLevel === 'medium' ? 0.6 : 0.4
        }))
      },
      dataWindow: {
        from: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
        to: new Date(),
        outcomesAnalyzed: outcomes.length
      }
    });

    console.log(`[OracleEvolution] Voice assessment: ${parsed.antiPatterns?.length || 0} anti-patterns, ${parsed.voiceRules?.length || 0} new rules`);
    return parsed;

  } catch (err) {
    console.error('[OracleEvolution] Voice assessment error:', err.message);
    return null;
  }
}

/**
 * Layer 6: Build/update deep psychological profile for a user
 * Goes beyond flat notes into an evolving psychological model
 * 
 * @param {string} userId - MongoDB ObjectId
 */
async function buildPsychProfile(userId) {
  try {
    const user = await User.findById(userId)
      .select('username oracleNotes benefitTracking streakHistory urgeLog currentStreak startDate')
      .lean();
    if (!user) return null;

    const profile = await UserRiskProfile.findOne({ userId });
    if (!profile) return null;

    // Gather all Oracle notes for this user
    const notes = (user.oracleNotes || [])
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 20)
      .map(n => `[Day ${n.streakDay || '?'}, ${n.source || 'app'}]: ${n.note}`);

    if (notes.length < 5) {
      console.log(`[OracleEvolution] Only ${notes.length} notes for ${user.username} — need 5+ for psych profile`);
      return null;
    }

    // Gather interaction metadata
    const interactions = await OracleInteraction.find({ 
      $or: [{ userId }, { username: user.username }]
    })
      .sort({ timestamp: -1 })
      .limit(50)
      .select('topics sentiment urgency relapseRiskLanguage streakDay')
      .lean();

    // Topic frequency
    const topicFreq = {};
    interactions.forEach(i => {
      (i.topics || []).forEach(t => { topicFreq[t] = (topicFreq[t] || 0) + 1; });
    });
    const topTopics = Object.entries(topicFreq).sort((a, b) => b[1] - a[1]).slice(0, 5);

    // Sentiment trajectory
    const sentimentHistory = interactions.slice(0, 20).map(i => i.sentiment).filter(Boolean);

    // Streak history summary
    const streaks = (user.streakHistory || []).slice(-10).map(s => ({
      days: s.days,
      reason: s.reason || 'unknown',
      trigger: s.trigger || 'unknown'
    }));

    const existingSummary = profile.psychProfile?.oracleSummary || 'No prior summary exists.';

    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 600,
      system: `You are building a psychological profile of a semen retention practitioner for an AI guide called Oracle. This profile helps Oracle understand WHO this person is at a deep level — not just their stats.

Write a concise but profound psychological summary (3-5 sentences) covering:
- Their primary motivation for the practice
- Recurring patterns or blind spots you see
- Their growth trajectory
- What they need most from Oracle right now

Also extract:
- primaryMotivation: one of 'discipline', 'spiritual', 'attraction', 'health', 'purpose', 'freedom'
- blindSpots: 1-3 specific self-deception patterns (strings)
- recurringThemes: 2-4 topics they keep returning to (strings)
- growthEdges: 1-3 areas of active positive change (strings)

PREVIOUS SUMMARY (update, don't start from scratch): ${existingSummary}

Respond ONLY with valid JSON:
{
  "summary": "paragraph",
  "primaryMotivation": "string",
  "blindSpots": ["string"],
  "recurringThemes": ["string"],
  "growthEdges": ["string"]
}`,
      messages: [{
        role: 'user',
        content: `USER: ${user.username}, Day ${user.currentStreak || 0}
Streak history: ${JSON.stringify(streaks)}
Top topics: ${topTopics.map(([t, c]) => `${t} (${c})`).join(', ')}
Recent sentiments: ${sentimentHistory.join(', ')}
Oracle notes (most recent first):
${notes.join('\n')}`
      }]
    });

    const raw = response.content[0]?.text?.trim();
    const parsed = safeParseJSON(raw, 'psych-profile');
    if (!parsed) return null;

    // Update the risk profile with psychological data
    profile.psychProfile = {
      primaryMotivation: parsed.primaryMotivation || profile.psychProfile?.primaryMotivation,
      blindSpots: parsed.blindSpots || profile.psychProfile?.blindSpots || [],
      recurringThemes: parsed.recurringThemes || profile.psychProfile?.recurringThemes || [],
      growthEdges: parsed.growthEdges || profile.psychProfile?.growthEdges || [],
      oracleSummary: parsed.summary || profile.psychProfile?.oracleSummary,
      summaryUpdatedAt: new Date()
    };
    await profile.save();

    console.log(`[OracleEvolution] Psych profile updated for ${user.username}: motivation=${parsed.primaryMotivation}`);
    return parsed;

  } catch (err) {
    console.error('[OracleEvolution] Psych profile error:', err.message);
    return null;
  }
}

/**
 * Layer 7: Meta-Oracle — Generate comprehensive system prompt evolution proposal
 * Synthesizes all accumulated intelligence into proposed prompt changes
 * 
 * Runs monthly (or on-demand via admin). This is the big one.
 */
async function generatePromptProposal() {
  try {
    // Gather recent evolution records
    const recentEvolutions = await OracleEvolution.find({
      createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
    })
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();

    const voiceAssessments = recentEvolutions.filter(e => e.type === 'voice-assessment');
    const patternDiscoveries = recentEvolutions.filter(e => e.type === 'pattern-discovery');
    const responseStrategies = recentEvolutions.filter(e => e.type === 'response-strategy');

    if (recentEvolutions.length < 3) {
      console.log('[OracleEvolution] Not enough evolution data for prompt proposal');
      return null;
    }

    // Gather outcome stats
    const totalOutcomes = await OracleOutcome.countDocuments({ 'outcome.measured': true });
    const totalMaintained = await OracleOutcome.countDocuments({ 'outcome.measured': true, 'outcome.streakMaintained': true });

    // Build synthesis
    const evolutionSummary = {
      voiceFindings: voiceAssessments.flatMap(v => v.findings?.antiPatterns || []),
      patternFindings: patternDiscoveries.flatMap(p => p.findings?.correlations || []),
      strategyFindings: responseStrategies.flatMap(s => s.findings?.strategies || []),
      overallOutcomeRate: totalOutcomes > 0 ? Math.round((totalMaintained / totalOutcomes) * 100) : 0,
      totalOutcomes,
      proposedRules: voiceAssessments.flatMap(v => v.findings?.promptChanges || [])
    };

    const response = await anthropic.messages.create({
      model: process.env.ORACLE_MODEL || 'claude-sonnet-4-5-20250929',
      max_tokens: 2000,
      system: `You are the Meta-Oracle — a system that evolves Oracle's own system prompt based on accumulated intelligence. You have access to:
1. Voice self-assessments (what communication patterns worked/failed)
2. Pattern discoveries (novel correlations found in user data)
3. Response strategy effectiveness (which approaches produce best outcomes)

Your job: propose SPECIFIC, SURGICAL modifications to Oracle's system prompt. Not rewrites. Targeted changes backed by data.

For each proposed change:
- Identify exactly which section of the prompt to modify
- State what Oracle currently does
- State what it should do instead
- Explain WHY with specific data
- Rate your confidence (0-1)

Also propose:
- New knowledge Oracle should reference (from pattern discoveries)
- New behavioral rules (from voice assessments)
- Context-dependent tone adjustments (from strategy analysis)

Respond ONLY with valid JSON:
{
  "promptChanges": [
    {
      "section": "section name",
      "currentBehavior": "what Oracle does now",
      "proposedChange": "what it should do",
      "rationale": "why, with data",
      "confidence": 0.0-1.0
    }
  ],
  "newKnowledge": ["knowledge Oracle should incorporate"],
  "newRules": ["behavioral rules to add"],
  "overallAssessment": "paragraph on Oracle's current state and trajectory"
}`,
      messages: [{
        role: 'user',
        content: `ORACLE EVOLUTION DATA (last 30 days):\n\n${JSON.stringify(evolutionSummary, null, 2)}`
      }]
    });

    const raw = response.content[0]?.text?.trim();
    const parsed = safeParseJSON(raw, 'prompt-proposal');
    if (!parsed) return null;

    // Save as evolution record for Ross to review
    await OracleEvolution.create({
      type: 'prompt-proposal',
      content: parsed.overallAssessment || 'Monthly prompt evolution proposal.',
      findings: {
        promptChanges: (parsed.promptChanges || []).map(pc => ({
          section: pc.section,
          currentBehavior: pc.currentBehavior,
          proposedChange: pc.proposedChange,
          rationale: pc.rationale,
          confidence: pc.confidence || 0.5
        })),
        antiPatterns: (parsed.newRules || []).map(r => ({ pattern: 'N/A', replacement: r, frequency: 0 }))
      },
      dataWindow: {
        from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        to: new Date(),
        outcomesAnalyzed: totalOutcomes
      }
    });

    console.log(`[OracleEvolution] Prompt proposal: ${parsed.promptChanges?.length || 0} changes, ${parsed.newRules?.length || 0} new rules`);
    return parsed;

  } catch (err) {
    console.error('[OracleEvolution] Prompt proposal error:', err.message);
    return null;
  }
}

/**
 * Run the full Oracle Evolution pipeline
 * Called by scheduled job (weekly) or admin command
 * 
 * Runs ALL steps in order:
 * 1. Voice self-assessment (what worked / what didn't)
 * 2. Psych profiles for active users
 * 3. Response strategy analysis (which approaches are most effective)
 * 4. Pattern discovery (cross-dimensional correlations)
 * 5. Opus sweep (process ALL pending proposals through verification gate)
 */
async function runEvolutionPipeline() {
  console.log('[OracleEvolution] ====== EVOLUTION PIPELINE START ======');
  const start = Date.now();

  // Step 1: Voice self-assessment
  const voice = await voiceSelfAssessment();
  console.log(`[OracleEvolution] Voice: ${voice ? 'complete' : 'skipped (insufficient data)'}`);

  // Step 2: Build psych profiles for active users with 5+ Oracle notes
  const usersWithNotes = await User.find({
    'oracleNotes.4': { $exists: true }, // At least 5 notes
    startDate: { $exists: true }
  }).select('_id username').lean();

  let profilesBuilt = 0;
  for (const user of usersWithNotes.slice(0, 50)) { // Cap at 50 users per run for cost
    const profile = await UserRiskProfile.findOne({ userId: user._id });
    if (profile) {
      // Only rebuild psych profile if stale (> 7 days) or missing
      const lastUpdate = profile.psychProfile?.summaryUpdatedAt;
      if (!lastUpdate || (Date.now() - new Date(lastUpdate).getTime()) > 7 * 24 * 60 * 60 * 1000) {
        await buildPsychProfile(user._id);
        profilesBuilt++;
      }
    }
  }
  console.log(`[OracleEvolution] Psych profiles: ${profilesBuilt} updated`);

  // Step 3: Response strategy analysis
  let responseReport = null;
  try {
    const { analyzeResponseEffectiveness } = require('./responseScoring');
    responseReport = await analyzeResponseEffectiveness();
    console.log(`[OracleEvolution] Response analysis: ${responseReport ? 'complete' : 'skipped (insufficient data)'}`);
  } catch (rsErr) {
    console.error('[OracleEvolution] Response analysis error:', rsErr.message);
  }

  // Step 4: Pattern discovery
  let patterns = null;
  try {
    const { discoverPatterns } = require('./patternDiscovery');
    patterns = await discoverPatterns();
    console.log(`[OracleEvolution] Pattern discovery: ${patterns ? `${patterns.patterns?.length || 0} patterns found` : 'skipped (insufficient data)'}`);
  } catch (pdErr) {
    console.error('[OracleEvolution] Pattern discovery error:', pdErr.message);
  }

  // Step 5: Process ALL pending proposals through Opus verification gate
  let opusResults = { processed: 0, approved: 0, flagged: 0 };
  try {
    const { processProposal } = require('./dynamicRules');
    const pending = await OracleEvolution.find({ status: 'pending' }).select('_id type').lean();
    if (pending.length > 0) {
      console.log(`[OracleEvolution] Processing ${pending.length} pending proposal(s) through Opus...`);
      for (const p of pending) {
        const result = await processProposal(p._id);
        opusResults.processed++;
        if (result.rulesCreated > 0) opusResults.approved += result.rulesCreated;
        if (result.flagged > 0) opusResults.flagged += result.flagged;
      }
      console.log(`[OracleEvolution] Opus sweep: ${opusResults.approved} rules approved, ${opusResults.flagged} flagged`);
    } else {
      console.log('[OracleEvolution] No pending proposals to process');
    }
  } catch (opusErr) {
    console.error('[OracleEvolution] Opus processing error:', opusErr.message);
  }

  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  console.log(`[OracleEvolution] ====== PIPELINE COMPLETE (${elapsed}s) ======`);

  return { voice: !!voice, profilesBuilt, responseAnalysis: !!responseReport, patternsFound: patterns?.patterns?.length || 0, opus: opusResults, elapsed };
}

module.exports = { 
  voiceSelfAssessment, 
  buildPsychProfile, 
  generatePromptProposal, 
  runEvolutionPipeline 
};
