// server/scripts/backfillEmbeddings.js
// One-time script to generate embeddings for all existing knowledge chunks
// Safe to re-run — skips chunks that already have embeddings
//
// Usage: cd ~/Desktop/rossbased-app/server && node scripts/backfillEmbeddings.js

require('dotenv').config({ path: require('path').resolve(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const KnowledgeChunk = require('../models/KnowledgeChunk');
const { generateEmbedding, isVectorSearchEnabled } = require('../services/embeddings');

const BATCH_DELAY = 200; // ms between API calls to avoid rate limits

async function backfill() {
  if (!isVectorSearchEnabled()) {
    console.error('❌ OPENAI_API_KEY not set. Add it to your .env or Render environment.');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGO_URI);
  console.log('✅ Connected to MongoDB');

  // Find all enabled chunks without embeddings
  const chunks = await KnowledgeChunk.find({
    enabled: true,
    $or: [
      { embedding: { $exists: false } },
      { embedding: null },
      { embedding: { $size: 0 } }
    ]
  }).select('_id content source.name').lean();

  const total = chunks.length;
  console.log(`📊 Found ${total} chunks without embeddings`);

  if (total === 0) {
    console.log('✅ All chunks already have embeddings. Nothing to do.');
    process.exit(0);
  }

  let embedded = 0;
  let failed = 0;

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];

    try {
      const vector = await generateEmbedding(chunk.content);

      if (vector) {
        await KnowledgeChunk.findByIdAndUpdate(chunk._id, { embedding: vector });
        embedded++;
      } else {
        failed++;
        console.warn(`  ⚠️ No embedding returned for chunk ${chunk._id} (${chunk.source?.name})`);
      }
    } catch (err) {
      failed++;
      console.error(`  ❌ Error embedding chunk ${chunk._id}: ${err.message}`);
    }

    // Progress log every 25 chunks
    if ((i + 1) % 25 === 0 || i === chunks.length - 1) {
      const pct = Math.round(((i + 1) / total) * 100);
      console.log(`  ${i + 1}/${total} (${pct}%) — embedded: ${embedded}, failed: ${failed}`);
    }

    // Rate limit delay
    if (i < chunks.length - 1) {
      await new Promise(r => setTimeout(r, BATCH_DELAY));
    }
  }

  console.log('');
  console.log('='.repeat(50));
  console.log('BACKFILL COMPLETE');
  console.log(`  Total chunks: ${total}`);
  console.log(`  Embedded: ${embedded}`);
  console.log(`  Failed: ${failed}`);
  console.log('='.repeat(50));

  process.exit(0);
}

backfill().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
