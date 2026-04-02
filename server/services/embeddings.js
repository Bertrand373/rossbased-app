// server/services/embeddings.js
// Vector embedding generation for semantic RAG search
// Uses OpenAI text-embedding-3-small ($0.02/M tokens — pennies at TitanTrack scale)
// Falls back gracefully if OPENAI_API_KEY not set

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const EMBEDDING_MODEL = 'text-embedding-3-small';
const EMBEDDING_DIMENSIONS = 1536;

/**
 * Check if vector search is available (OpenAI key configured)
 */
function isVectorSearchEnabled() {
  return !!OPENAI_API_KEY;
}

/**
 * Generate an embedding vector for a text string
 * @param {string} text - Text to embed
 * @returns {number[]|null} 1536-dimension embedding vector, or null on failure
 */
async function generateEmbedding(text) {
  if (!OPENAI_API_KEY) return null;

  try {
    // Truncate to ~8000 tokens (~32000 chars) to stay within model limits
    const truncated = text.length > 32000 ? text.substring(0, 32000) : text;

    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: EMBEDDING_MODEL,
        input: truncated
      })
    });

    if (!response.ok) {
      console.error(`Embedding API error: ${response.status}`);
      return null;
    }

    const data = await response.json();
    return data.data?.[0]?.embedding || null;
  } catch (err) {
    console.error('Embedding generation error:', err.message);
    return null;
  }
}

module.exports = { generateEmbedding, isVectorSearchEnabled, EMBEDDING_DIMENSIONS };
