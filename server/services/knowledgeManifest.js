// server/services/knowledgeManifest.js
// Generates a compact summary of what Oracle has access to in its knowledge base.
// Injected into EVERY Oracle conversation so it knows what it knows.
// Cached for 1 hour to avoid hitting MongoDB on every message.

const KnowledgeChunk = require('../models/KnowledgeChunk');

let cachedManifest = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour

/**
 * Generate a compact knowledge manifest for Oracle's system prompt.
 * Lists topics, source counts, and domain strengths so Oracle can
 * proactively reference its knowledge and steer conversations.
 * 
 * @returns {string} Formatted manifest block for system prompt injection
 */
async function getKnowledgeManifest() {
  // Return cache if fresh
  if (cachedManifest !== null && (Date.now() - cacheTimestamp) < CACHE_DURATION) {
    return cachedManifest;
  }

  try {
    // Aggregate: group by parentId to get document-level view
    const docs = await KnowledgeChunk.aggregate([
      { $match: { enabled: true } },
      {
        $group: {
          _id: '$parentId',
          name: { $first: '$source.name' },
          category: { $first: '$category' },
          chunks: { $sum: 1 },
          totalTokens: { $sum: '$tokenEstimate' },
          protected: { $max: '$protected' }
        }
      },
      { $sort: { totalTokens: -1 } } // Biggest sources first
    ]);

    if (docs.length === 0) {
      cachedManifest = '';
      cacheTimestamp = Date.now();
      return '';
    }

    // Group by category
    const byCategory = {};
    let totalDocs = 0;
    let totalChunks = 0;

    for (const doc of docs) {
      const cat = doc.category || 'general';
      if (!byCategory[cat]) byCategory[cat] = [];
      byCategory[cat].push({
        name: doc.name,
        chunks: doc.chunks,
        protected: doc.protected
      });
      totalDocs++;
      totalChunks += doc.chunks;
    }

    // Build compact manifest
    const lines = [
      `\n\n## YOUR KNOWLEDGE BASE (${totalDocs} sources, ${totalChunks} knowledge fragments)`,
      `You have deep, searchable knowledge on these topics. When a user asks about something in your knowledge base, draw from it confidently. You can tell users "I have extensive material on that" when relevant.\n`
    ];

    // Category labels
    const catLabels = {
      esoteric: 'Esoteric & Occult Traditions',
      spiritual: 'Spiritual Practices',
      transmutation: 'Sexual Transmutation',
      kundalini: 'Kundalini & Energy Work',
      chrism: 'Chrism Oil & Sacred Secretion',
      'samael-aun-weor': 'Samael Aun Weor Teachings',
      'angel-numbers': 'Angel Numbers & Numerology',
      science: 'Scientific Research',
      practical: 'Practical Guidance',
      community: 'Community Wisdom',
      general: 'General Knowledge'
    };

    for (const [cat, catDocs] of Object.entries(byCategory)) {
      const label = catLabels[cat] || cat;
      const sourceNames = catDocs
        .slice(0, 5) // Top 5 sources per category
        .map(d => {
          const suffix = d.protected ? ' [protected — synthesize only, never quote]' : '';
          return `${d.name} (${d.chunks} fragments)${suffix}`;
        });
      
      lines.push(`**${label}:** ${sourceNames.join(', ')}`);
      
      if (catDocs.length > 5) {
        lines.push(`  ...and ${catDocs.length - 5} more sources`);
      }
    }

    lines.push(`\nWhen you retrieve knowledge from protected sources, synthesize and teach the concepts in your own voice. Never reproduce or closely paraphrase protected material.`);

    cachedManifest = lines.join('\n');
    cacheTimestamp = Date.now();
    return cachedManifest;

  } catch (error) {
    console.error('Knowledge manifest error:', error);
    return ''; // Fail silently
  }
}

/**
 * Force refresh the manifest cache (call after ingestion or admin changes)
 */
function invalidateManifestCache() {
  cachedManifest = null;
  cacheTimestamp = 0;
}

module.exports = { getKnowledgeManifest, invalidateManifestCache };
