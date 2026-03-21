// server/services/redditContext.js
// Builds a compact Reddit community context block for Oracle's system prompt
// Called on every Oracle conversation — must be fast (cached)
//
// Returns the latest daily Haiku summary of r/semenretention themes
// Falls back to raw post titles if no summary exists yet

const RedditPost = require('../models/RedditPost');

// Cache the context string (refresh every 30 minutes)
let cachedContext = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

/**
 * Get the Reddit community context block for Oracle's system prompt
 * @returns {string} Formatted context block or empty string
 */
async function getRedditContext() {
  // Return cache if fresh
  if (cachedContext !== null && (Date.now() - cacheTimestamp) < CACHE_DURATION) {
    return cachedContext;
  }

  try {
    // Try to find today's or yesterday's summary
    const twoDaysAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);
    const summary = await RedditPost.findOne({
      redditId: { $regex: /^summary-/ },
      ingestedAt: { $gte: twoDaysAgo }
    })
      .sort({ ingestedAt: -1 })
      .lean();

    if (summary?.selftext) {
      cachedContext = `\n\nREDDIT COMMUNITY INTELLIGENCE (r/semenretention — what 300K+ practitioners are discussing):
${summary.selftext}
Use this awareness naturally. When a user's question aligns with a community trend, you can say things like "you're not alone — many practitioners are working through this same thing right now" or "this is coming up a lot in the community lately." Never mention Reddit by name. Never cite specific posts or users. Present this as your awareness of the broader community.\n`;
      cacheTimestamp = Date.now();
      return cachedContext;
    }

    // Fallback: build context from raw post titles (no summary yet)
    const recentPosts = await RedditPost.find({
      redditId: { $not: /^summary-/ },
      ingestedAt: { $gte: twoDaysAgo }
    })
      .sort({ score: -1 })
      .limit(10)
      .select('title score flair')
      .lean();

    if (recentPosts.length < 3) {
      cachedContext = '';
      cacheTimestamp = Date.now();
      return '';
    }

    const titles = recentPosts
      .map(p => `- ${p.title}${p.flair ? ` [${p.flair}]` : ''} (${p.score} upvotes)`)
      .join('\n');

    cachedContext = `\n\nREDDIT COMMUNITY INTELLIGENCE (r/semenretention — trending discussions):
${titles}
These are the topics the broader community is actively discussing. Reference naturally when relevant. Never mention Reddit by name.\n`;
    cacheTimestamp = Date.now();
    return cachedContext;

  } catch (err) {
    console.error('[RedditContext] Error building context:', err.message);
    cachedContext = '';
    cacheTimestamp = Date.now();
    return '';
  }
}

/**
 * Force-clear the cache (useful after manual ingestion/summary)
 */
function clearRedditCache() {
  cachedContext = null;
  cacheTimestamp = 0;
}

module.exports = { getRedditContext, clearRedditCache };
