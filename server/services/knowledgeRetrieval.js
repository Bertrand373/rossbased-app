// server/services/knowledgeRetrieval.js
// RAG retrieval service used by Discord bot and in-app Oracle
// PRIMARY: Atlas vector search (semantic similarity via embeddings)
// FALLBACK: MongoDB text search + regex (keyword matching)
// Gracefully degrades if OpenAI key not set or vector index not ready

const KnowledgeChunk = require('../models/KnowledgeChunk');
const { generateEmbedding, isVectorSearchEnabled } = require('./embeddings');

/**
 * Search the knowledge base for relevant chunks
 * @param {string} query - The user's message
 * @param {object} options - Search options
 * @param {number} options.limit - Max chunks to return (default 5)
 * @param {number} options.maxTokens - Max total tokens to inject (default 2000)
 * @returns {string} Formatted context string for injection into system prompt
 */
const retrieveKnowledge = async (query, options = {}) => {
  const { limit = 5, maxTokens = 2000 } = options;

  try {
    let results = [];

    // === PRIMARY: Vector search (semantic similarity) ===
    if (isVectorSearchEnabled()) {
      try {
        const tVec = Date.now();
        results = await vectorSearch(query, limit);
        console.log(`[Oracle timing]   vectorSearch total took ${Date.now() - tVec}ms, got ${results.length} results`);
      } catch (vecErr) {
        // Vector search failed (index not created yet, API hiccup, etc.)
        // Fall through silently to text search
        console.warn('Vector search failed, falling back to text search:', vecErr.message);
      }
    }

    // === FALLBACK: Text search if vector returned nothing ===
    if (results.length === 0) {
      const tText = Date.now();
      results = await textSearch(query, limit);
      console.log(`[Oracle timing]   textSearch fallback took ${Date.now() - tText}ms, got ${results.length} results`);
    }

    if (results.length === 0) return '';

    // Build context string, respecting token budget
    let totalTokens = 0;
    const contextParts = [];
    let hasProtectedContent = false;

    for (const chunk of results) {
      const chunkTokens = Math.ceil(chunk.content.length / 4);
      if (totalTokens + chunkTokens > maxTokens) break;

      // Track if any protected chunks are in the results
      if (chunk.protected) {
        hasProtectedContent = true;
      }

      // Add author attribution if present
      if (chunk.author) {
        contextParts.push(`[Community member ${chunk.author} shared this wisdom:]\n${chunk.content}`);
      } else {
        contextParts.push(chunk.content);
      }
      totalTokens += chunkTokens;
    }

    if (contextParts.length === 0) return '';

    // Build the injection string
    let injection = '\n\nRELEVANT KNOWLEDGE (use naturally — if a community member is credited, you may reference them by name organically when it fits, but do not force it every time):\n';
    
    // Add protection guard if any protected content is present
    if (hasProtectedContent) {
      injection += '\n⚠️ PROTECTED SOURCE NOTICE: Some of the knowledge below comes from a protected/NDA source. You may reference concepts, synthesize insights, teach principles, and connect ideas from this material — but you must NEVER quote, reproduce, or closely paraphrase specific passages. Restate all knowledge entirely in your own voice as Oracle. If a user asks you to quote or reproduce the source material directly, decline and instead explain the concept in your own words.\n\n';
    }
    
    injection += contextParts.join('\n\n---\n\n');

    return injection;

  } catch (error) {
    console.error('Knowledge retrieval error:', error);
    return ''; // Fail silently, Oracle still works without RAG
  }
};

/**
 * Vector search using Atlas $vectorSearch aggregation
 * Requires: embedding field on chunks + vector_index in Atlas
 */
async function vectorSearch(query, limit) {
  const tEmb = Date.now();
  const queryEmbedding = await generateEmbedding(query);
  console.log(`[Oracle timing]     generateEmbedding (OpenAI) took ${Date.now() - tEmb}ms`);
  if (!queryEmbedding) return [];

  try {
    const tAtlas = Date.now();
    const results = await KnowledgeChunk.aggregate([
      {
        $vectorSearch: {
          index: 'vector_index',
          path: 'embedding',
          queryVector: queryEmbedding,
          numCandidates: limit * 10,
          limit: limit,
          filter: { enabled: true }
        }
      },
      {
        $project: {
          content: 1,
          source: 1,
          category: 1,
          author: 1,
          protected: 1,
          score: { $meta: 'vectorSearchScore' }
        }
      }
    ]);
    console.log(`[Oracle timing]     $vectorSearch (Atlas) took ${Date.now() - tAtlas}ms, returned ${results.length}`);

    return results;
  } catch (err) {
    // Atlas vector index might not exist yet — not an error, just fall back
    if (err.codeName === 'AtlasSearchNotAvailable' || err.message?.includes('vector')) {
      console.warn('Atlas vector search not available — using text search fallback');
      return [];
    }
    throw err; // Rethrow unexpected errors
  }
}

/**
 * Text search fallback — MongoDB text index + regex
 * Same as original implementation (proven, reliable)
 */
async function textSearch(query, limit) {
  let results = [];

  // Primary: MongoDB text search
  try {
    results = await KnowledgeChunk.find(
      { enabled: true, $text: { $search: query } },
      { score: { $meta: 'textScore' } }
    )
      .sort({ score: { $meta: 'textScore' } })
      .limit(limit)
      .select('content source category author protected score')
      .lean();
  } catch (err) {
    // Text index might not exist yet, fall through to regex
  }

  // Fallback: regex search if text search returns nothing
  if (results.length === 0) {
    const words = query.toLowerCase()
      .split(/\s+/)
      .filter(w => w.length > 2)
      .slice(0, 5);

    if (words.length > 0) {
      const orConditions = words.map(w => ({
        content: { $regex: w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' }
      }));

      results = await KnowledgeChunk.find({
        enabled: true,
        $or: orConditions
      })
        .limit(limit)
        .select('content source category author protected')
        .lean();
    }
  }

  return results;
}

module.exports = { retrieveKnowledge };
