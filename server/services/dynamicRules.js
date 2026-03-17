// server/services/dynamicRules.js
// Loads active Oracle rules into system prompt + Opus verification gate
//
// Flow:
// 1. Evolution pipeline generates proposals (Sonnet)
// 2. Opus reviews each proposal for quality + safety
// 3. If Opus approves → rule goes active immediately, Ross gets DM
// 4. If Opus flags → stays pending for Ross's manual review
// 5. Ross can deactivate any rule from admin panel anytime

const Anthropic = require('@anthropic-ai/sdk');
const DynamicRule = require('../models/DynamicRule');
const OracleEvolution = require('../models/OracleEvolution');

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Cache active rules (refresh every 5 minutes)
let cachedRules = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Get all active dynamic rules formatted for system prompt injection
 * Called on every Oracle conversation — must be fast (cached)
 * 
 * @returns {string} Formatted rules block or empty string
 */
async function getActiveRules() {
  // Return cache if fresh
  if (cachedRules !== null && (Date.now() - cacheTimestamp) < CACHE_DURATION) {
    return cachedRules;
  }

  try {
    const rules = await DynamicRule.find({ active: true })
      .sort({ activatedAt: -1 })
      .select('rule category')
      .lean();

    if (rules.length === 0) {
      cachedRules = '';
      cacheTimestamp = Date.now();
      return '';
    }

    // Group by category
    const grouped = {};
    rules.forEach(r => {
      if (!grouped[r.category]) grouped[r.category] = [];
      grouped[r.category].push(r.rule);
    });

    // Format for system prompt
    const lines = ['\n## EVOLVED RULES (data-driven, auto-updated)'];
    
    if (grouped['voice']?.length) {
      lines.push('\nVoice refinements:');
      grouped['voice'].forEach(r => lines.push(`- ${r}`));
    }
    if (grouped['tone']?.length) {
      lines.push('\nTone adjustments:');
      grouped['tone'].forEach(r => lines.push(`- ${r}`));
    }
    if (grouped['anti-pattern']?.length) {
      lines.push('\nAnti-patterns (AVOID these):');
      grouped['anti-pattern'].forEach(r => lines.push(`- ${r}`));
    }
    if (grouped['context-rule']?.length) {
      lines.push('\nContext-specific rules:');
      grouped['context-rule'].forEach(r => lines.push(`- ${r}`));
    }
    if (grouped['knowledge']?.length) {
      lines.push('\nDiscovered knowledge:');
      grouped['knowledge'].forEach(r => lines.push(`- ${r}`));
    }
    if (grouped['discovery']?.length) {
      lines.push('\nPattern discoveries:');
      grouped['discovery'].forEach(r => lines.push(`- ${r}`));
    }

    cachedRules = lines.join('\n');
    cacheTimestamp = Date.now();
    return cachedRules;

  } catch (err) {
    console.error('[DynamicRules] Load error:', err.message);
    cachedRules = '';
    cacheTimestamp = Date.now();
    return '';
  }
}

/**
 * Force cache refresh (called after rule changes)
 */
function invalidateCache() {
  cachedRules = null;
  cacheTimestamp = 0;
}

/**
 * Opus verification gate
 * Reviews a proposed rule for quality, safety, and data sufficiency
 * Returns { approved, reasoning, confidence }
 */
async function opusVerify(proposedRule, rationale, sampleSize, category) {
  try {
    const response = await anthropic.messages.create({
      model: 'claude-opus-4-20250514',
      max_tokens: 500,
      system: `You are the quality gate for an AI guide called Oracle that serves a semen retention community. A lower-tier AI analyzed conversation outcome data and proposed a new behavioral rule for Oracle. Your job is to verify whether this rule should go live.

Evaluate:
1. Is the rule logically sound? Does the rationale make sense?
2. Is the sample size sufficient? (Under 20 outcomes = reject. 20-50 = flag. 50+ = acceptable.)
3. Could this rule cause harm or make Oracle less effective?
4. Is the rule specific enough to be useful, or is it too vague?
5. Does it conflict with Oracle's core identity (calm, direct, perceptive, no-nonsense)?

Respond ONLY with valid JSON:
{
  "approved": true/false,
  "confidence": 0.0-1.0,
  "reasoning": "1-3 sentences explaining your decision",
  "suggestedEdit": "If you'd improve the wording, provide it here. Otherwise null."
}`,
      messages: [{
        role: 'user',
        content: `PROPOSED RULE: "${proposedRule}"
CATEGORY: ${category}
RATIONALE: ${rationale}
SAMPLE SIZE: ${sampleSize} measured outcomes
        
Should this rule go live in Oracle's system prompt?`
      }]
    });

    const raw = response.content[0]?.text?.trim();
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
          else throw new Error('No JSON found in Opus response');
        } catch (innerErr) {
          throw new Error(`Opus JSON parse failed: ${innerErr.message}`);
        }
      }
    }

    return {
      approved: parsed.approved === true,
      confidence: parsed.confidence || 0.5,
      reasoning: parsed.reasoning || 'No reasoning provided.',
      suggestedEdit: parsed.suggestedEdit || null
    };

  } catch (err) {
    console.error('[DynamicRules] Opus verification error:', err.message);
    // On Opus failure, DON'T auto-approve — flag for manual review
    return {
      approved: false,
      confidence: 0,
      reasoning: `Opus verification failed: ${err.message}. Flagged for manual review.`,
      suggestedEdit: null
    };
  }
}

/**
 * Process a pending evolution proposal through the Opus gate
 * If approved → creates active DynamicRule + marks proposal approved
 * If flagged → marks proposal as pending for Ross
 * 
 * @param {string} evolutionId - OracleEvolution document ID
 * @returns {object} { approved, rulesCreated, reasoning }
 */
async function processProposal(evolutionId) {
  try {
    const evolution = await OracleEvolution.findById(evolutionId);
    if (!evolution) return { approved: false, error: 'Proposal not found' };
    if (evolution.status !== 'pending') return { approved: false, error: `Already ${evolution.status}` };

    const rulesCreated = [];
    let allApproved = true;
    const flaggedItems = [];

    // Process prompt changes
    const changes = evolution.findings?.promptChanges || [];
    for (const change of changes) {
      if (!change.proposedChange || change.proposedChange.length < 5) continue;

      const verification = await opusVerify(
        change.proposedChange,
        change.rationale || 'No rationale provided',
        evolution.dataWindow?.outcomesAnalyzed || 0,
        mapSectionToCategory(change.section)
      );

      if (verification.approved) {
        const ruleText = verification.suggestedEdit || change.proposedChange;
        const rule = await DynamicRule.create({
          rule: ruleText,
          category: mapSectionToCategory(change.section),
          source: 'opus-verified',
          proposalId: evolution._id,
          opusVerified: true,
          opusAssessment: verification.reasoning,
          opusConfidence: verification.confidence,
          activatedBy: 'opus-auto'
        });
        rulesCreated.push(rule);
      } else {
        allApproved = false;
        flaggedItems.push({
          change: change.proposedChange,
          reason: verification.reasoning
        });
      }
    }

    // Process anti-patterns
    const antiPatterns = evolution.findings?.antiPatterns || [];
    for (const ap of antiPatterns) {
      if (!ap.replacement || ap.replacement === 'N/A') continue;

      const ruleText = ap.pattern !== 'N/A' 
        ? `AVOID: "${ap.pattern}" → Instead: ${ap.replacement}`
        : ap.replacement;

      const verification = await opusVerify(
        ruleText,
        'Discovered through outcome-backed voice assessment',
        evolution.dataWindow?.outcomesAnalyzed || 0,
        'anti-pattern'
      );

      if (verification.approved) {
        const rule = await DynamicRule.create({
          rule: verification.suggestedEdit || ruleText,
          category: 'anti-pattern',
          source: 'opus-verified',
          proposalId: evolution._id,
          opusVerified: true,
          opusAssessment: verification.reasoning,
          opusConfidence: verification.confidence,
          activatedBy: 'opus-auto'
        });
        rulesCreated.push(rule);
      } else {
        allApproved = false;
        flaggedItems.push({ change: ruleText, reason: verification.reasoning });
      }
    }

    // Process pattern discovery correlations
    const correlations = evolution.findings?.correlations || [];
    for (const corr of correlations) {
      if (!corr.description || corr.actionable === false) continue;

      const ruleText = corr.oracleAction
        ? `${corr.description} → Oracle action: ${corr.oracleAction}`
        : corr.description;

      const verification = await opusVerify(
        ruleText,
        `Pattern discovered with strength ${corr.strength || 'unknown'}, mechanism: ${corr.mechanism || 'data-driven correlation'}`,
        corr.sampleSize || evolution.dataWindow?.outcomesAnalyzed || 0,
        'discovery'
      );

      if (verification.approved) {
        const rule = await DynamicRule.create({
          rule: verification.suggestedEdit || ruleText,
          category: 'discovery',
          source: 'opus-verified',
          proposalId: evolution._id,
          opusVerified: true,
          opusAssessment: verification.reasoning,
          opusConfidence: verification.confidence,
          activatedBy: 'opus-auto'
        });
        rulesCreated.push(rule);
      } else {
        allApproved = false;
        flaggedItems.push({ change: ruleText, reason: verification.reasoning });
      }
    }

    // Process response strategy findings — only top performers worth codifying
    const stratFindings = evolution.findings?.strategies || [];
    const topStrategies = stratFindings
      .filter(s => s.sampleSize >= 10 && s.successRate >= 70)
      .slice(0, 3);

    for (const strat of topStrategies) {
      const ruleText = strat.context && strat.context !== 'overall'
        ? `In ${strat.context} phase, prefer "${strat.approach}" strategy (${strat.successRate}% success, n=${strat.sampleSize})`
        : `Prefer "${strat.approach}" strategy when applicable (${strat.successRate}% success, n=${strat.sampleSize})`;

      const verification = await opusVerify(
        ruleText,
        `Response strategy analysis: ${strat.approach} showed ${strat.successRate}% streak maintenance across ${strat.sampleSize} measured outcomes`,
        strat.sampleSize,
        'context-rule'
      );

      if (verification.approved) {
        const rule = await DynamicRule.create({
          rule: verification.suggestedEdit || ruleText,
          category: 'context-rule',
          source: 'opus-verified',
          proposalId: evolution._id,
          opusVerified: true,
          opusAssessment: verification.reasoning,
          opusConfidence: verification.confidence,
          activatedBy: 'opus-auto'
        });
        rulesCreated.push(rule);
      } else {
        allApproved = false;
        flaggedItems.push({ change: ruleText, reason: verification.reasoning });
      }
    }

    // Handle records with no processable content
    const hadAnythingToProcess = changes.length > 0 || antiPatterns.length > 0 || correlations.length > 0 || topStrategies.length > 0;

    // Update evolution status
    if (!hadAnythingToProcess) {
      // Analytics-only record — no actionable rules to extract
      evolution.status = 'approved';
      evolution.reviewNotes = 'Analytics record — no actionable rules to extract. Auto-archived.';
    } else if (rulesCreated.length > 0 && flaggedItems.length === 0) {
      evolution.status = 'approved';
      evolution.reviewNotes = `Opus auto-approved ${rulesCreated.length} rule(s).`;
    } else if (rulesCreated.length > 0 && flaggedItems.length > 0) {
      evolution.status = 'partial';
      evolution.reviewNotes = `Opus approved ${rulesCreated.length}, flagged ${flaggedItems.length} for manual review.`;
    } else {
      // All flagged — leave as pending for Ross
      evolution.reviewNotes = `Opus flagged all ${flaggedItems.length} item(s) for manual review: ${flaggedItems.map(f => f.reason).join('; ')}`;
    }
    evolution.reviewedAt = new Date();
    await evolution.save();

    // Invalidate cache so new rules take effect
    if (rulesCreated.length > 0) {
      invalidateCache();
    }

    // DM Ross about what happened
    try {
      const discordBot = require('../discord-bot');
      if (discordBot.client && discordBot.client.isReady()) {
        const rossUser = await discordBot.client.users.fetch(process.env.ROSS_DISCORD_ID || '').catch(() => null);
        if (rossUser) {
          let dmText = `🔮 **Oracle Evolution Update**\n\n`;
          if (rulesCreated.length > 0) {
            dmText += `✅ ${rulesCreated.length} rule(s) auto-approved by Opus and now active:\n`;
            rulesCreated.forEach(r => { dmText += `• ${r.rule.substring(0, 80)}\n`; });
          }
          if (flaggedItems.length > 0) {
            dmText += `\n⚠️ ${flaggedItems.length} item(s) flagged for your review:\n`;
            flaggedItems.forEach(f => { dmText += `• ${f.reason.substring(0, 80)}\n`; });
          }
          dmText += `\nView in Admin → Oracle → Intelligence → Evolution`;
          await rossUser.send(dmText);
        }
      }
    } catch (dmErr) {
      console.error('[DynamicRules] DM error:', dmErr.message);
    }

    console.log(`[DynamicRules] Proposal ${evolutionId}: ${rulesCreated.length} approved, ${flaggedItems.length} flagged`);
    return { approved: allApproved, rulesCreated: rulesCreated.length, flagged: flaggedItems.length };

  } catch (err) {
    console.error('[DynamicRules] Process proposal error:', err.message);
    return { approved: false, error: err.message };
  }
}

/**
 * Manually approve a rule from the admin panel (Ross taps approve)
 * Creates a DynamicRule directly without Opus verification
 */
async function manualApproveRule(ruleText, category, proposalId) {
  try {
    const rule = await DynamicRule.create({
      rule: ruleText,
      category: category || 'voice',
      source: 'manual',
      proposalId: proposalId || undefined,
      opusVerified: false,
      activatedBy: 'admin-manual'
    });
    invalidateCache();
    return rule;
  } catch (err) {
    console.error('[DynamicRules] Manual approve error:', err.message);
    return null;
  }
}

/**
 * Deactivate a rule (Ross taps remove in admin panel)
 */
async function deactivateRule(ruleId, reason) {
  try {
    const rule = await DynamicRule.findByIdAndUpdate(ruleId, {
      $set: { active: false, deactivatedAt: new Date(), deactivatedReason: reason || 'Admin removed' }
    }, { new: true });
    invalidateCache();
    return rule;
  } catch (err) {
    console.error('[DynamicRules] Deactivate error:', err.message);
    return null;
  }
}

// Helper: map prompt section names to DynamicRule categories
function mapSectionToCategory(section) {
  if (!section) return 'voice';
  const s = section.toLowerCase();
  if (s.includes('hard rule') || s.includes('anti')) return 'anti-pattern';
  if (s.includes('tone') || s.includes('challenge')) return 'tone';
  if (s.includes('knowledge') || s.includes('discovery')) return 'knowledge';
  if (s.includes('context') || s.includes('phase')) return 'context-rule';
  return 'voice';
}

module.exports = { 
  getActiveRules, 
  invalidateCache, 
  opusVerify, 
  processProposal, 
  manualApproveRule, 
  deactivateRule 
};
