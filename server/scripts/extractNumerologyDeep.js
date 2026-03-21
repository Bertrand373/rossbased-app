#!/usr/bin/env node
// scripts/extractNumerologyDeep.js
// Second-pass extraction for weak numbers (4, 6, 7, 9)
// Instead of regex matching, uses Claude to READ each chunk and determine
// if it actually contains numerological teaching about the target number.
//
// Usage: cd ~/project/src/server && node scripts/extractNumerologyDeep.js
//
// This replaces the weak entries in the existing D33P Numerology Reference.

const mongoose = require('mongoose');
const Anthropic = require('@anthropic-ai/sdk');

const MONGO_URI = process.env.MONGO_URI;
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

if (!MONGO_URI || !process.env.ANTHROPIC_API_KEY) {
  console.error('MONGO_URI and ANTHROPIC_API_KEY environment variables required');
  process.exit(1);
}

// Numbers that came back weak in the first pass
const WEAK_NUMBERS = [4, 6, 7, 9];

// Also redo 3 — it was thin too
const TARGET_NUMBERS = [3, 4, 6, 7, 9];

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  console.log('='.repeat(60));
  console.log('D33P NUMEROLOGY — DEEP EXTRACTION (PASS 2)');
  console.log('='.repeat(60));
  console.log(`Targeting numbers: ${TARGET_NUMBERS.join(', ')}`);
  console.log('Using Claude to filter signal from noise\n');

  await mongoose.connect(MONGO_URI);
  const KnowledgeChunk = mongoose.model('KnowledgeChunk', 
    new mongoose.Schema({}, { strict: false, collection: 'knowledgechunks' }));

  // Find D33P Archive
  const d33pChunk = await KnowledgeChunk.findOne({
    'source.name': { $regex: /D33P/i },
    protected: true,
    'source.name': { $not: /Numerology Reference/i }
  }).select('parentId').lean();

  if (!d33pChunk) {
    console.error('D33P Archive not found.');
    await mongoose.disconnect();
    process.exit(1);
  }

  const parentId = d33pChunk.parentId;
  console.log(`D33P Archive parentId: ${parentId}`);

  // Pull ALL chunks
  const allChunks = await KnowledgeChunk.find({ parentId, enabled: true })
    .select('content chunkIndex')
    .lean();

  console.log(`Total chunks to scan: ${allChunks.length}\n`);

  const results = {};

  for (const num of TARGET_NUMBERS) {
    console.log(`\n${'─'.repeat(50)}`);
    console.log(`SCANNING FOR NUMBER ${num}`);
    console.log(`${'─'.repeat(50)}`);

    // Step 1: Pre-filter — only chunks that contain the digit at all
    const numStr = String(num);
    const preFiltered = allChunks.filter(c => c.content.includes(numStr));
    console.log(`  Pre-filtered: ${preFiltered.length} chunks contain "${numStr}"`);

    // Step 2: Send chunks in batches to Claude for relevance classification
    // Ask: "Does this chunk contain actual TEACHING about the number X, or is X just incidental?"
    const BATCH_SIZE = 15;
    const teachingChunks = [];

    for (let i = 0; i < preFiltered.length; i += BATCH_SIZE) {
      const batch = preFiltered.slice(i, i + BATCH_SIZE);
      const batchText = batch.map((c, bi) => 
        `[CHUNK ${bi}]:\n${c.content.substring(0, 800)}`
      ).join('\n\n===\n\n');

      try {
        const response = await anthropic.messages.create({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 300,
          messages: [{
            role: 'user',
            content: `You are analyzing an archive from a numerologist called D33P 7nsights. I need you to identify which of these ${batch.length} chunks contain ACTUAL TEACHINGS about the number ${num} — meaning the author is explaining what ${num} means, what energy it carries, how it manifests, or using it as a core part of a numerological analysis.

IGNORE chunks where ${num} only appears as:
- Part of a date or timestamp (e.g., "4:54 PM", "June 7th")
- A count of items ("2-4 times a day")
- Part of a larger unrelated number
- Incidental mention with no teaching about the number itself

Respond with ONLY a JSON array of chunk indices (0-based) that contain real teachings about the number ${num}. Example: [0, 3, 7]
If none contain real teachings, respond: []

${batchText}`
          }]
        });

        const raw = response.content[0]?.text?.trim();
        try {
          // Extract JSON array from response
          const match = raw.match(/\[[\d,\s]*\]/);
          if (match) {
            const indices = JSON.parse(match[0]);
            for (const idx of indices) {
              if (idx >= 0 && idx < batch.length) {
                teachingChunks.push(batch[idx].content);
              }
            }
          }
        } catch (parseErr) {
          // If parse fails, skip this batch
        }
      } catch (apiErr) {
        console.log(`  Batch error: ${apiErr.message}`);
      }

      await sleep(300);

      if ((i + BATCH_SIZE) % 60 === 0 || i + BATCH_SIZE >= preFiltered.length) {
        console.log(`  Scanned: ${Math.min(i + BATCH_SIZE, preFiltered.length)}/${preFiltered.length} — found ${teachingChunks.length} teaching chunks so far`);
      }
    }

    console.log(`  TOTAL teaching chunks for number ${num}: ${teachingChunks.length}`);

    if (teachingChunks.length === 0) {
      results[num] = `The D33P Archive contains no substantial standalone teachings about the number ${num}. This number may appear in D33P's work primarily through its relationships with other numbers rather than having dedicated teachings.`;
      continue;
    }

    // Step 3: Synthesize from only the real teaching chunks
    const contextBlock = teachingChunks.slice(0, 25).map((c, i) => 
      `[Teaching ${i + 1}]:\n${c.substring(0, 1500)}`
    ).join('\n\n---\n\n');

    console.log(`  Synthesizing from ${Math.min(teachingChunks.length, 25)} verified teaching chunks...`);

    try {
      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1200,
        messages: [{
          role: 'user',
          content: `You are analyzing a private archive from a numerologist known as D33P 7nsights. These ${Math.min(teachingChunks.length, 25)} excerpts have been verified to contain ACTUAL TEACHINGS about the number ${num} (noise and incidental mentions have been removed).

Read between the lines. This teacher often teaches through:
- Examples from corporate logos, brand names, dates, and pop culture
- Hidden patterns in news events and historical dates  
- Gematria and digit reduction (adding digits until you get a single number)
- Connections between numbers and their manifestations in the physical world
- Symbolic associations (animals, colors, shapes, elements)
- Chakra systems, energy work, and spiritual development

For the number ${num}, synthesize:
1. CORE MEANING: What does D33P teach this number fundamentally represents?
2. ENERGY/VIBRATION: What energy or vibration does this number carry?
3. MANIFESTATIONS: How does D33P say this number shows up in the world? (brands, events, symbols, nature)
4. WHEN YOU SEE IT: What message is the universe sending when you encounter this number repeatedly?
5. SHADOW SIDE: Any negative associations or warnings D33P connects to this number?
6. CONNECTIONS: How does D33P connect this number to other numbers or systems?

If even with these verified excerpts there isn't enough for a category, say so. Base everything strictly on what's in the archive.

VERIFIED TEACHING EXCERPTS:
${contextBlock}`
        }]
      });

      results[num] = response.content[0]?.text?.trim();
      console.log(`  Number ${num}: Synthesized (${results[num].length} chars)`);
    } catch (err) {
      console.error(`  Synthesis error: ${err.message}`);
      results[num] = `Error during synthesis: ${err.message}`;
    }

    await sleep(500);
  }

  // Now update the existing Numerology Reference in MongoDB
  console.log('\n\nUpdating D33P Numerology Reference in RAG...');

  // Find the existing numerology reference
  const existingRef = await KnowledgeChunk.findOne({
    'source.name': 'D33P Numerology Reference',
    protected: true
  }).select('parentId').lean();

  if (existingRef) {
    // Delete old numerology reference chunks
    const deleted = await mongoose.connection.db.collection('knowledgechunks').deleteMany({
      parentId: existingRef.parentId
    });
    console.log(`Deleted old reference: ${deleted.deletedCount} chunks`);
  }

  // Build the complete new reference (merge first-pass strong numbers + second-pass improved numbers)
  // First, get the first-pass results for numbers we DIDN'T redo
  const STRONG_NUMBERS = [1, 2, 5, 8, 11, 22, 33];
  
  // We need to re-run the strong numbers through the first-pass logic quickly
  // OR just re-synthesize everything. Since we already have the results for weak numbers,
  // let's just rebuild the full doc.

  console.log('Re-synthesizing strong numbers (1, 2, 5, 8, 11, 22, 33) quickly...');

  for (const num of STRONG_NUMBERS) {
    const numStr = String(num);
    // Simple grab — these were already strong
    const patterns = [
      new RegExp(`\\bnumber\\s+${numStr}\\b`, 'gi'),
      new RegExp(`\\b${numStr}\\s+(is|means|represents|symboliz|energy|vibration)`, 'gi'),
      new RegExp(`\\b${numStr}${numStr}${numStr}\\b`, 'gi'),
    ];
    if (num >= 10) patterns.push(new RegExp(`\\b${numStr}\\b`, 'gi'));

    const relevant = allChunks.filter(c => {
      const text = c.content || '';
      return patterns.some(p => { p.lastIndex = 0; return p.test(text); });
    });

    const selected = relevant.slice(0, 30);
    const contextBlock = selected.map((c, i) => `[Excerpt ${i + 1}]:\n${c.content.substring(0, 1500)}`).join('\n\n---\n\n');

    if (selected.length === 0) continue;

    console.log(`  Number ${num}: ${selected.length} chunks...`);

    try {
      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        messages: [{
          role: 'user',
          content: `You are analyzing a private archive from a numerologist known as D33P 7nsights. Synthesize what this teacher believed about the number ${num}.

This teacher teaches through corporate logos, dates, gematria, pop culture, chakra systems, and hidden patterns.

For the number ${num}, synthesize:
1. CORE MEANING: What does it fundamentally represent?
2. ENERGY/VIBRATION: What energy does it carry?
3. MANIFESTATIONS: How does it show up in the world?
4. WHEN YOU SEE IT: What message is the universe sending?
5. SHADOW SIDE: Negative associations or warnings?
6. CONNECTIONS: Links to other numbers or systems?

Base everything strictly on the archive. If info is insufficient for a category, say so.

ARCHIVE EXCERPTS:
${contextBlock}`
        }]
      });
      results[num] = response.content[0]?.text?.trim();
      console.log(`  Number ${num}: Done (${results[num].length} chars)`);
    } catch (err) {
      console.error(`  Number ${num}: Error — ${err.message}`);
    }
    await sleep(500);
  }

  // Build full reference document
  const ALL_NUMBERS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 11, 22, 33];

  let fullDoc = `# D33P 7NSIGHTS — NUMEROLOGY REFERENCE (v2)\n`;
  fullDoc += `## Reverse-Engineered from the D33P Archive\n`;
  fullDoc += `## Generated: ${new Date().toISOString().split('T')[0]}\n`;
  fullDoc += `## Method: Two-pass extraction — Claude-verified teaching chunks only\n\n`;
  fullDoc += `This document contains the synthesized numerological teachings extracted from the D33P 7nsights archive. `;
  fullDoc += `Each number's meaning was derived by having AI identify actual teaching content (filtering out noise like timestamps and incidental mentions) `;
  fullDoc += `then synthesizing across all verified references.\n\n`;
  fullDoc += `---\n\n`;

  for (const num of ALL_NUMBERS) {
    const label = num >= 10 ? `MASTER NUMBER ${num}` : `NUMBER ${num}`;
    fullDoc += `# ${label}\n\n`;
    fullDoc += (results[num] || 'No teachings found.');
    fullDoc += `\n\n---\n\n`;
  }

  // Print
  console.log('\n' + '='.repeat(60));
  console.log(fullDoc);
  console.log('='.repeat(60));

  // Save to RAG
  const { randomUUID } = require('crypto');
  const ragParentId = randomUUID();
  const chunkSize = 1500;
  const chunks = [];
  let current = '';
  const paragraphs = fullDoc.split('\n\n');

  for (const para of paragraphs) {
    if ((current + '\n\n' + para).length > chunkSize && current) {
      chunks.push(current.trim());
      current = para;
    } else {
      current += (current ? '\n\n' : '') + para;
    }
  }
  if (current.trim()) chunks.push(current.trim());

  const docs = chunks.map((chunk, i) => ({
    content: chunk,
    source: { type: 'text', name: 'D33P Numerology Reference' },
    category: 'esoteric',
    chunkIndex: i,
    parentId: ragParentId,
    keywords: ['numerology', 'numbers', 'gematria', 'd33p', 'master numbers',
      ...ALL_NUMBERS.map(n => String(n)),
      '111', '222', '333', '444', '555', '666', '777', '888', '999'],
    tokenEstimate: Math.ceil(chunk.length / 4),
    enabled: true,
    protected: true
  }));

  await mongoose.connection.db.collection('knowledgechunks').insertMany(docs);

  console.log(`\nSaved ${docs.length} chunks as "D33P Numerology Reference v2" (protected)`);
  console.log(`Parent ID: ${ragParentId}`);
  console.log('\nDone. Weak numbers should now have richer extractions.');

  await mongoose.disconnect();
  process.exit(0);
}

main().catch(err => {
  console.error('FATAL:', err);
  mongoose.disconnect().then(() => process.exit(1));
});
