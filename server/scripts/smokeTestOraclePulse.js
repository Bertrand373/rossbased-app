// server/scripts/smokeTestOraclePulse.js
// One-off smoke test for the new Oracle pulse pipeline.
// Calls evaluateAndGenerate({ force: true, dryRun: true }) so we get a real
// Sonnet generation against live production data WITHOUT writing the result
// to the CommunityPulse collection (so the app feed stays untouched).
//
// Run: node server/scripts/smokeTestOraclePulse.js

const path = require('path');
// override:true because some shells export an empty ANTHROPIC_API_KEY that
// otherwise blocks dotenv from loading the real value from server/.env.
require('dotenv').config({ path: path.join(__dirname, '..', '.env'), override: true });

const mongoose = require('mongoose');
const { evaluateAndGenerate } = require('../services/communityPulseEngine');
const { findCorrelations } = require('../services/oracleCorrelationEngine');
const { getRepetitionContext } = require('../services/oracleRepetitionGuard');

async function main() {
  const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/rossbased';
  console.log(`[SmokeTest] Connecting to ${mongoUri.replace(/:[^:@]+@/, ':***@')}`);
  await mongoose.connect(mongoUri);
  console.log('[SmokeTest] Connected\n');

  // ── Step 1: Show what correlations the engine sees right now ──
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('STEP 1: Cross-source correlations (last 48h)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  const pack = await findCorrelations();
  console.log(`Source totals — reddit: ${pack.totals.reddit}, discord: ${pack.totals.discord}, yt_own: ${pack.totals.youtubeOwn}, yt_niche: ${pack.totals.youtubeNiche}, inapp: ${pack.totals.inapp}`);
  console.log(`Correlations found: ${pack.correlations.length}\n`);
  pack.correlations.forEach((c, i) => {
    console.log(`  [${i + 1}] "${c.theme}" — sources: ${c.sources.join(' + ')}, strength: ${c.strength}`);
    c.whitelistedFacts.forEach(f => {
      console.log(`       [${f.source}] phrase: "${f.approvedPhrase}"`);
      if (f.quote) console.log(`              quote: "${f.quote.substring(0, 100)}..."`);
      if (f.cohortBucket) console.log(`              cohort bucket: "${f.cohortBucket}"`);
    });
  });
  if (pack.streakClusters.length > 0) {
    console.log('\nStreak clusters:');
    pack.streakClusters.forEach(c => console.log(`  - ${c.label}: ${c.count} users`));
  }
  if (pack.lunar) console.log(`\nLunar: ${pack.lunar.phase} (${pack.lunar.illumination}% illuminated)`);
  if (pack.redditTopPost) console.log(`Reddit top post: "${pack.redditTopPost.title}" (${pack.redditTopPost.score} upvotes)`);

  // ── Step 2: Show what the repetition guard is blocking ──
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('STEP 2: Repetition guard context');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  const ctx = await getRepetitionContext();
  console.log(`Suggested tone for this cycle: ${ctx.suggestedTone}`);
  console.log(`Suggested tradition: ${ctx.suggestedTradition}`);
  console.log(`Suggested lead source: ${ctx.suggestedLeadSource}`);
  console.log(`Avoiding nouns: ${ctx.avoidNouns.join(', ') || '(none)'}`);
  console.log(`Avoiding opening phrases: ${ctx.avoidOpenings.length} on cooldown`);
  console.log(`Recent embeddings available for novelty check: ${ctx.recentEmbeddings.length}`);

  // ── Step 3: Run the full generation pipeline (dry run) ──
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('STEP 3: Full generation (DRY RUN — not persisted)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  const result = await evaluateAndGenerate({ force: true, dryRun: true });

  if (!result) {
    console.log('\n[SmokeTest] No pulse generated (returned null). Check logs above for the reason.');
  } else {
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('GENERATED PULSE');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`Trigger: ${result.trigger} | Mode: ${result.mode}`);
    console.log(`Fingerprint: tone=${result.fingerprint.tone}, tradition=${result.fingerprint.traditionCited || 'none'}, leadSource=${result.fingerprint.leadSource || 'none'}, sourcesCited=[${result.fingerprint.sourcesCited.join(', ')}], keyNouns=[${result.fingerprint.keyNouns.join(', ')}]`);
    if (result.novelty) {
      console.log(`Novelty: similarity=${result.novelty.maxSimilarity}, passed=${result.novelty.passed} (${result.novelty.reason})`);
    }
    console.log('\n--- HEADLINE ---');
    console.log(result.headline);
    console.log('\n--- BODY ---');
    console.log(result.body);
    console.log('');
  }

  await mongoose.disconnect();
  console.log('\n[SmokeTest] Disconnected. Done.');
}

main().catch(err => {
  console.error('[SmokeTest] Fatal:', err);
  process.exit(1);
});
