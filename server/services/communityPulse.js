// server/services/communityPulse.js
// Generates an AI-powered community pulse briefing from Discord observations
// Refreshed every 12 hours using Haiku, cached in memory
// Injected into in-app Oracle context so it knows what the community is experiencing

const Anthropic = require('@anthropic-ai/sdk');
const ServerPulse = require('../models/ServerPulse');

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

let cachedPulse = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 12 * 60 * 60 * 1000; // 12 hours

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
    const fortyEightHours = new Date(Date.now() - 48 * 60 * 60 * 1000);
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    // Get recent observations WITH actual message content
    const recentObs = await ServerPulse.find({
      createdAt: { $gte: fortyEightHours }
    })
      .select('content topics author channel createdAt')
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    // Get prior 5 days for comparison context
    const priorObs = await ServerPulse.find({
      createdAt: { $gte: weekAgo, $lt: fortyEightHours }
    })
      .select('topics author')
      .lean();

    if (recentObs.length < 5) {
      cachedPulse = '';
      cacheTimestamp = Date.now();
      return '';
    }

    const recentAuthors = new Set(recentObs.map(o => o.author)).size;
    const priorAuthors = new Set(priorObs.map(o => o.author)).size;

    // Build anonymized observation feed — real content, no usernames
    const obsLines = recentObs.map(o => {
      return `[#${o.channel}]: ${o.content.substring(0, 250)}`;
    });

    // Topic shift detection (for the prompt context, not the output)
    const recentTopics = {};
    const priorTopics = {};
    for (const o of recentObs) {
      for (const t of (o.topics || [])) recentTopics[t] = (recentTopics[t] || 0) + 1;
    }
    for (const o of priorObs) {
      for (const t of (o.topics || [])) priorTopics[t] = (priorTopics[t] || 0) + 1;
    }

    // Find topics that spiked vs prior period
    const spikes = [];
    for (const [topic, count] of Object.entries(recentTopics)) {
      const priorCount = priorTopics[topic] || 0;
      const priorDaily = priorCount / 5; // 5 prior days
      const recentDaily = count / 2;      // 2 recent days
      if (recentDaily > priorDaily * 1.5 && count >= 3) {
        spikes.push(topic);
      }
    }

    const spikeNote = spikes.length > 0 
      ? `\nTOPIC SPIKES vs prior week: ${spikes.join(', ')}` 
      : '';

    const response = await anthropic.messages.create({
      model: 'claude-3-5-haiku-20241022',
      max_tokens: 250,
      system: `You generate a community pulse briefing for an AI guide called "The Oracle" that serves a semen retention community. This briefing will be injected into the Oracle's context so it knows what the community is collectively experiencing RIGHT NOW.

Write 3-4 sentences that capture:
- What members are actually struggling with or celebrating (be specific about the experiences described)
- Which streak day ranges are seeing the most activity or difficulty
- Any emotional or physical patterns (energy crashes, urge waves, flatline clusters, confidence shifts, spiritual experiences)
- The overall community mood or energy

Rules:
- Write in present tense as a briefing to a guide who needs situational awareness
- Be specific: "Members around day 10-14 are reporting energy crashes and questioning their commitment" NOT "energy is a popular topic"
- Name real patterns visible in the messages, do not fabricate
- 3-4 sentences maximum. No bullets, no emojis, no headers, no labels
- If you cannot detect a clear pattern, say less rather than inventing one`,
      messages: [{
        role: 'user',
        content: `LAST 48 HOURS: ${recentObs.length} messages from ${recentAuthors} members
PRIOR 5 DAYS: ${priorObs.length} messages from ${priorAuthors} members${spikeNote}

RECENT COMMUNITY MESSAGES (anonymized):
${obsLines.join('\n')}`
      }]
    });

    cachedPulse = response.content[0].text;
    cacheTimestamp = Date.now();

    console.log(`🔮 Community pulse refreshed (AI): ${recentObs.length} observations, ${recentAuthors} authors → ${cachedPulse.length} chars`);
    return cachedPulse;

  } catch (err) {
    console.error('Community pulse error:', err.message);
    // On failure, return empty — Oracle still works without pulse
    cachedPulse = '';
    cacheTimestamp = Date.now();
    return '';
  }
}

module.exports = { getCommunityPulse };
