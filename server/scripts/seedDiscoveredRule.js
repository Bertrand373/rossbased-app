// server/scripts/seedDiscoveredRule.js
// Run once after deploy to submit Oracle's first pattern-discovered conversational rule
// Usage: cd server && node scripts/seedDiscoveredRule.js
// This creates a pending OracleEvolution proposal that Opus will evaluate

require('dotenv').config();
const mongoose = require('mongoose');
const OracleEvolution = require('../models/OracleEvolution');

async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB');

  // Check if this proposal already exists (prevent duplicates)
  const existing = await OracleEvolution.findOne({
    type: 'pattern-discovery',
    'findings.promptChanges.0.section': 'early-streak-redirect'
  });

  if (existing) {
    console.log('Proposal already exists — skipping');
    process.exit(0);
  }

  await OracleEvolution.create({
    type: 'prompt-proposal',
    content: 'Oracle pattern discovery found that users on days 1-14 who discuss "motivation" maintain at 78%, while those who discuss "transmutation" or explicitly name relapse risk maintain at 96-100%. This proposes a conversational redirect rule for early-streak users.',
    findings: {
      promptChanges: [{
        section: 'early-streak-redirect',
        currentBehavior: 'Oracle engages motivation-seeking language directly, validating the emotional state',
        proposedChange: 'When a user in days 1-14 sends motivation-seeking or vague low-energy messages, redirect within 1-2 exchanges toward transmutation framing (energy redirection, specific goals, identity building) or proactive relapse scenario planning ("what is your highest-risk moment this week") rather than engaging the motivational crisis directly.',
        rationale: 'Pattern discovery data: motivation topic days 1-14 = 78% maintenance (n=9), transmutation topic days 1-14 = 100% (n=18), explicit relapse discussion days 1-14 = 96% (n=24). Naming the threat or redirecting toward purpose-building produces dramatically better outcomes than engaging motivation spirals.',
        confidence: 0.65
      }]
    },
    dataWindow: {
      from: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
      to: new Date(),
      outcomesAnalyzed: 366
    },
    status: 'pending'
  });

  console.log('✅ Conversational rule proposal created — pending Opus verification');
  console.log('It will be evaluated on the next weekly pipeline run, or when you tap Approve in the admin panel.');
  process.exit(0);
}

seed().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
