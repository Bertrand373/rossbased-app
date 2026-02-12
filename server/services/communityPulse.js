// server/services/communityPulse.js
// Generates a lightweight community pulse summary from Discord observations
// Refreshed every 6 hours, cached in memory
// Injected into in-app Oracle context via buildOracleContext()

const ServerPulse = require('../models/ServerPulse');

let cachedPulse = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 6 * 60 * 60 * 1000; // 6 hours

/**
 * Get the current community pulse summary
 * Returns a formatted string for injection into Oracle context, or empty string
 */
async function getCommunityPulse() {
  // Return cache if fresh
  if (cachedPulse && (Date.now() - cacheTimestamp) < CACHE_DURATION) {
    return cachedPulse;
  }

  try {
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const fortyEightHours = new Date(Date.now() - 48 * 60 * 60 * 1000);

    // Get observations from last 7 days
    const observations = await ServerPulse.find({
      createdAt: { $gte: weekAgo }
    }).select('topics author createdAt').lean();

    if (observations.length < 5) {
      cachedPulse = '';
      cacheTimestamp = Date.now();
      return '';
    }

    // Count topics
    const topicCounts = {};
    const recentTopicCounts = {}; // Last 48h specifically
    const uniqueAuthors = new Set();

    for (const obs of observations) {
      uniqueAuthors.add(obs.author);
      for (const topic of (obs.topics || [])) {
        topicCounts[topic] = (topicCounts[topic] || 0) + 1;
        if (new Date(obs.createdAt) >= fortyEightHours) {
          recentTopicCounts[topic] = (recentTopicCounts[topic] || 0) + 1;
        }
      }
    }

    // Top 5 topics this week
    const topTopics = Object.entries(topicCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    // Detect surging topics (significantly more active in last 48h vs weekly average)
    const surgingTopics = Object.entries(recentTopicCounts)
      .filter(([topic, count]) => {
        const weeklyCount = topicCounts[topic] || 0;
        const dailyAvg = weeklyCount / 7;
        const recentDaily = count / 2;
        return recentDaily > dailyAvg * 1.5 && count >= 3; // 50% above average and minimum 3
      })
      .map(([topic]) => topic);

    // Build the summary
    const lines = [];
    lines.push(`Active community members this week: ~${uniqueAuthors.size}.`);
    lines.push(`Top discussion topics: ${topTopics.map(([t, c]) => `${t} (${c})`).join(', ')}.`);
    
    if (surgingTopics.length > 0) {
      lines.push(`Surging in last 48h: ${surgingTopics.join(', ')}. Multiple members discussing this right now.`);
    }

    cachedPulse = lines.join('\n');
    cacheTimestamp = Date.now();
    
    console.log(`🔮 Community pulse refreshed: ${observations.length} observations, ${uniqueAuthors.size} authors`);
    return cachedPulse;

  } catch (err) {
    console.error('Community pulse error:', err.message);
    cachedPulse = '';
    cacheTimestamp = Date.now();
    return '';
  }
}

module.exports = { getCommunityPulse };
