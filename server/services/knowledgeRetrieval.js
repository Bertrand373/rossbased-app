// server/services/knowledgeRetrieval.js
// RAG retrieval service used by Discord bot and in-app Oracle
// Searches knowledge base and returns formatted context for injection

const KnowledgeChunk = require('../models/KnowledgeChunk');

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
    // Check if collection has any documents
    const count = await KnowledgeChunk.countDocuments({ enabled: true });
    if (count === 0) return '';

    let results = [];

    // Primary: MongoDB text search
    try {
      results = await KnowledgeChunk.find(
        { enabled: true, $text: { $search: query } },
        { score: { $meta: 'textScore' } }
      )
        .sort({ score: { $meta: 'textScore' } })
        .limit(limit)
        .select('content source category score')
        .lean();
    } catch (err) {
      // Text index might not exist yet, fall through to regex
    }

    // Fallback: regex search if text search returns nothing
    if (results.length === 0) {
      const words = query.toLowerCase()
        .split(/\s+/)
        .filter(w => w.length > 2)
        .slice(0, 5); // Limit to 5 key words

      if (words.length > 0) {
        const orConditions = words.map(w => ({
          content: { $regex: w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' }
        }));

        results = await KnowledgeChunk.find({
          enabled: true,
          $or: orConditions
        })
          .limit(limit)
          .select('content source category')
          .lean();
      }
    }

    if (results.length === 0) return '';

    // Build context string, respecting token budget
    let totalTokens = 0;
    const contextParts = [];

    for (const chunk of results) {
      const chunkTokens = Math.ceil(chunk.content.length / 4);
      if (totalTokens + chunkTokens > maxTokens) break;

      contextParts.push(chunk.content);
      totalTokens += chunkTokens;
    }

    if (contextParts.length === 0) return '';

    return '\n\nRELEVANT KNOWLEDGE:\n' + contextParts.join('\n\n---\n\n');

  } catch (error) {
    console.error('Knowledge retrieval error:', error);
    return ''; // Fail silently, Oracle still works without RAG
  }
};

module.exports = { retrieveKnowledge };
