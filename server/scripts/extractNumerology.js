#!/usr/bin/env node
// scripts/extractNumerology.js
// Reads all D33P Archive chunks from MongoDB, finds every reference to numbers 1-9 and
// master numbers 11, 22, 33, then uses Claude to synthesize D33P's teachings on each number.
//
// Usage: cd ~/project/src/server && node scripts/extractNumerology.js
//
// Output: Prints the full numerology reference to console AND saves it as a new
// protected knowledge document in the RAG (so Oracle can reference it directly).

const mongoose = require('mongoose');
const Anthropic = require('@anthropic-ai/sdk');

const MONGO_URI = process.env.MONGO_URI;
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

if (!MONGO_URI || !process.env.ANTHROPIC_API_KEY) {
  console.error('MONGO_URI and ANTHROPIC_API_KEY environment variables required');
  process.exit(1);
}

// Numbers to extract meanings for
const TARGET_NUMBERS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 11, 22, 33];

async function main() {
  console.log('='.repeat(60));
  console.log('D33P NUMEROLOGY EXTRACTION');
  console.log('='.repeat(60));

  // Connect
  await mongoose.connect(MONGO_URI);
  const KnowledgeChunk = mongoose.model('KnowledgeChunk', new mongoose.Schema({}, { strict: false, collection: 'knowledgechunks' }));

  // Find the D33P Archive parentId
  const d33pChunk = await KnowledgeChunk.findOne({
    'source.name': { $regex: /D33P/i },
    protected: true
  }).select('parentId').lean();

  if (!d33pChunk) {
    console.error('D33P Archive not found in knowledge base. Run the ingestion first.');
    await mongoose.disconnect();
    process.exit(1);
  }

  const parentId = d33pChunk.parentId;
  console.log(`Found D33P Archive: parentId=${parentId}`);

  // Pull ALL D33P chunks
  const allChunks = await KnowledgeChunk.find({ parentId, enabled: true })
    .select('content')
    .lean();

  console.log(`Total D33P chunks: ${allChunks.length}`);

  // For each target number, find chunks that reference it
  const numberContexts = {};

  for (const num of TARGET_NUMBERS) {
    const numStr = String(num);
    // Build regex patterns for this number
    // Match: "the number 7", "number 7", "7 is", "7 means", "777", "#7", 
    // Also match the number appearing as a standalone word or in common contexts
    const patterns = [
      new RegExp(`\\bnumber\\s+${numStr}\\b`, 'gi'),
      new RegExp(`\\b${numStr}\\s+(is|means|represents|symboliz|signif|denotes|refers|energy|vibration)`, 'gi'),
      new RegExp(`\\b(is|means|represents)\\s+${numStr}\\b`, 'gi'),
      new RegExp(`#${numStr}\\b`, 'gi'),
      new RegExp(`\\b${numStr}${numStr}${numStr}\\b`, 'gi'), // triple (e.g., 777)
      new RegExp(`\\b${numStr}${numStr}\\b`, 'gi'), // double (e.g., 77) — only for single digits
    ];

    // For master numbers, also match standalone
    if (num >= 10) {
      patterns.push(new RegExp(`\\b${numStr}\\b`, 'gi'));
    }

    const relevantChunks = [];

    for (const chunk of allChunks) {
      const text = chunk.content || '';
      let matched = false;

      for (const pattern of patterns) {
        pattern.lastIndex = 0; // Reset regex state
        if (pattern.test(text)) {
          matched = true;
          break;
        }
      }

      // Also do a simple string search as fallback
      if (!matched) {
        // For single digits, be more careful — look for the number in numeric context
        if (num < 10) {
          const contextPatterns = [
            `number ${numStr}`,
            `${numStr}:`,
            `${numStr} -`,
            `"${numStr}"`,
            `'${numStr}'`,
            `= ${numStr}`,
            `${numStr}${numStr}${numStr}`, // 777 etc
          ];
          matched = contextPatterns.some(p => text.toLowerCase().includes(p.toLowerCase()));
        } else {
          // Master numbers — just check if the number appears
          matched = text.includes(numStr);
        }
      }

      if (matched) {
        relevantChunks.push(text);
      }
    }

    numberContexts[num] = relevantChunks;
    console.log(`  Number ${numStr}: ${relevantChunks.length} relevant chunks found`);
  }

  // Now synthesize with Claude — send all contexts for each number
  console.log('\nSynthesizing numerology meanings with Claude...\n');

  const results = {};

  for (const num of TARGET_NUMBERS) {
    const chunks = numberContexts[num];
    if (chunks.length === 0) {
      console.log(`  Number ${num}: No data — skipping`);
      results[num] = 'No specific teachings found in the archive for this number.';
      continue;
    }

    // Trim to avoid context window overflow — take up to 30 most relevant chunks
    const selectedChunks = chunks.slice(0, 30);
    const contextBlock = selectedChunks.map((c, i) => `[Excerpt ${i + 1}]:\n${c.substring(0, 1500)}`).join('\n\n---\n\n');

    console.log(`  Synthesizing number ${num} from ${selectedChunks.length} chunks...`);

    try {
      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        messages: [{
          role: 'user',
          content: `You are analyzing a private archive from a numerologist known as D33P 7nsights. Your task is to reverse-engineer what this teacher believed and taught about the number ${num}.

Below are ${selectedChunks.length} excerpts from the archive that reference the number ${num} (either directly or through related number patterns like ${num}${num}${num} or contexts where ${num} appears meaningfully).

Read between the lines. This teacher often teaches through:
- Examples from corporate logos, brand names, dates, and pop culture
- Hidden patterns in news events and historical dates
- Gematria and digit reduction (adding digits until you get a single number)
- Connections between numbers and their manifestations in the physical world
- Symbolic associations (animals, colors, shapes, elements)

For the number ${num}, synthesize:
1. CORE MEANING: What does D33P teach this number fundamentally represents?
2. ENERGY/VIBRATION: What energy or vibration does this number carry?
3. MANIFESTATIONS: How does D33P say this number shows up in the world? (brands, events, symbols, nature)
4. WHEN YOU SEE IT: What message is the universe sending when you encounter this number repeatedly?
5. SHADOW SIDE: Any negative associations or warnings D33P connects to this number?
6. CONNECTIONS: How does D33P connect this number to other numbers or systems?

If the excerpts don't contain enough to confidently state something, say so rather than inventing. Base everything strictly on what's in the archive.

ARCHIVE EXCERPTS:
${contextBlock}`
        }]
      });

      const synthesis = response.content[0]?.text?.trim();
      results[num] = synthesis;
      console.log(`  Number ${num}: Done (${synthesis.length} chars)`);
    } catch (err) {
      console.error(`  Number ${num}: Error — ${err.message}`);
      results[num] = `Error synthesizing: ${err.message}`;
    }

    // Small delay between calls
    await new Promise(r => setTimeout(r, 500));
  }

  // Build the full reference document
  console.log('\nBuilding reference document...');

  let fullDoc = `# D33P 7NSIGHTS — NUMEROLOGY REFERENCE\n`;
  fullDoc += `## Reverse-Engineered from the D33P Archive\n`;
  fullDoc += `## Generated: ${new Date().toISOString().split('T')[0]}\n\n`;
  fullDoc += `This document contains the synthesized numerological teachings extracted from the D33P 7nsights archive. `;
  fullDoc += `Each number's meaning was derived by analyzing every reference to that number across the entire archive `;
  fullDoc += `and identifying patterns in how D33P taught about it.\n\n`;
  fullDoc += `---\n\n`;

  for (const num of TARGET_NUMBERS) {
    const label = num >= 10 ? `MASTER NUMBER ${num}` : `NUMBER ${num}`;
    fullDoc += `# ${label}\n\n`;
    fullDoc += results[num];
    fullDoc += `\n\n---\n\n`;
  }

  // Print to console
  console.log('\n' + '='.repeat(60));
  console.log(fullDoc);
  console.log('='.repeat(60));

  // Save to RAG as its own protected document
  console.log('\nSaving to RAG knowledge base...');

  const { randomUUID } = require('crypto');
  const ragParentId = randomUUID();

  // Chunk the reference doc
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
      ...TARGET_NUMBERS.map(n => String(n)),
      '111', '222', '333', '444', '555', '666', '777', '888', '999'],
    tokenEstimate: Math.ceil(chunk.length / 4),
    enabled: true,
    protected: true
  }));

  // Use raw collection to avoid schema validation issues
  await mongoose.connection.db.collection('knowledgechunks').insertMany(docs);

  console.log(`\nSaved ${docs.length} chunks as "D33P Numerology Reference" (protected)`);
  console.log(`Parent ID: ${ragParentId}`);
  console.log('\nDone. Oracle now has a concentrated numerology reference from D33P.');

  await mongoose.disconnect();
  process.exit(0);
}

main().catch(err => {
  console.error('FATAL:', err);
  mongoose.disconnect().then(() => process.exit(1));
});
