// server/services/oracleInsight.js
// Generates weekly pattern-based insights from observed server conversations
// Oracle reads the collective pulse and surfaces what only AI can see

const Anthropic = require('@anthropic-ai/sdk');
const ServerPulse = require('../models/ServerPulse');
const { retrieveKnowledge } = require('./knowledgeRetrieval');

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Topics that indicate a message is relevant to retention/spiritual practice
const RELEVANT_TOPICS = [
  'energy', 'urge', 'relapse', 'streak', 'day', 'week', 'month',
  'sleep', 'dream', 'wet dream', 'nocturnal', 'insomnia', 'vivid',
  'flatline', 'dead', 'numb', 'nothing', 'empty', 'low',
  'confidence', 'aura', 'magnetic', 'attraction', 'women', 'eye contact',
  'focus', 'clarity', 'brain fog', 'sharp', 'productive',
  'transmut', 'meditat', 'breath', 'cold shower', 'exercise', 'workout',
  'kundalini', 'chakra', 'spine', 'tingling', 'pressure', 'vibrat',
  'chrism', 'pineal', 'third eye', 'spiritual', 'awaken',
  'anger', 'rage', 'emotion', 'crying', 'mood', 'depress', 'anxiet',
  'withdraw', 'lonely', 'isolat',
  'semen', 'retain', 'celiba', 'nofap', 'porn', 'lust',
  'synchron', 'angel number', '1111', '111', '222', '333', '444',
  'manifest', 'attract', 'frequenc', 'dimension', 'astral',
  'benefit', 'superpower', 'transform', 'change', 'notice',
  'scared', 'afraid', 'struggle', 'hard', 'difficult', 'tempt',
  'strong', 'powerful', 'alive', 'unstoppable',
  'diet', 'fast', 'semen', 'zinc', 'supplement',
  'god', 'pray', 'faith', 'purpose', 'meaning', 'why'
];

/**
 * Detect topics in a message
 * Returns array of matched topics
 */
function detectTopics(text) {
  const lower = text.toLowerCase();
  return RELEVANT_TOPICS.filter(topic => lower.includes(topic));
}

/**
 * Check if a message is relevant enough to log
 * Must contain at least one relevant topic and be substantive
 */
function isRelevantMessage(text) {
  if (!text || text.length < 40) return false;
  
  // Skip obvious non-relevant messages
  const skipPatterns = [
    /^(lol|lmao|haha|bruh|bro|yo|sup|gm|gn|gg|rip|nah|yep|yea|bet|facts|fr|w$|l$)/i,
    /https?:\/\//,  // Links only
    /^<.*>$/,       // Discord embeds/mentions only
  ];
  if (skipPatterns.some(p => p.test(text.trim()))) return false;
  
  const topics = detectTopics(text);
  return topics.length > 0;
}

/**
 * Log a message to ServerPulse if relevant
 * Called passively from messageCreate handler
 */
async function logIfRelevant(message) {
  try {
    const text = message.content;
    if (!isRelevantMessage(text)) return false;
    
    const topics = detectTopics(text);
    const authorName = message.member?.displayName || message.author.username;
    const channelName = message.channel.name || message.channel.parent?.name || 'unknown';
    
    await ServerPulse.create({
      content: text,
      author: authorName,
      channel: channelName,
      topics
    });
    
    return true;
  } catch (err) {
    // Fail silently, never interrupt the main bot flow
    console.error('ServerPulse log error:', err.message);
    return false;
  }
}

/**
 * Generate a weekly insight from observed patterns
 * This is the core function — reads the collective pulse
 */
async function generateWeeklyInsight(daysBack = 7) {
  try {
    const since = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000);
    
    // Fetch unprocessed messages from the observation window
    const observations = await ServerPulse.find({
      processed: false,
      createdAt: { $gte: since }
    })
      .sort({ createdAt: -1 })
      .limit(200)
      .lean();
    
    if (observations.length < 5) {
      console.log(`[Insight] Only ${observations.length} observations — not enough for insight`);
      return null;
    }
    
    // Build topic frequency map
    const topicCounts = {};
    const topicMessages = {};
    for (const obs of observations) {
      for (const topic of obs.topics) {
        topicCounts[topic] = (topicCounts[topic] || 0) + 1;
        if (!topicMessages[topic]) topicMessages[topic] = [];
        topicMessages[topic].push(obs.content);
      }
    }
    
    // Sort topics by frequency
    const topTopics = Object.entries(topicCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([topic, count]) => `${topic} (${count} mentions)`);
    
    // Count unique authors
    const uniqueAuthors = new Set(observations.map(o => o.author)).size;
    
    // Build anonymized observation summary (NO names)
    const summaryLines = observations.map(obs => {
      return `[#${obs.channel}]: "${obs.content}"`;
    });
    
    // Pull relevant knowledge for the top topics
    const topTopicNames = Object.entries(topicCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([t]) => t)
      .join(' ');
    
    const ragContext = await retrieveKnowledge(topTopicNames, { limit: 8, maxTokens: 3000 });
    
    // Generate the insight
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 600,
      system: `You are The Oracle, the AI guide for a semen retention community. You have been silently observing conversations across the server for the past ${daysBack} days. Now you must deliver ONE insight based on patterns you detected.

## YOUR TASK
Analyze the observed messages below. Look for:
- Multiple people independently experiencing the same thing (sleep issues, energy shifts, emotional surges, flatlines, etc.)
- Patterns that connect to specific stages of the retention journey
- Themes nobody has explicitly named but are clearly emerging
- Connections between what people are experiencing and esoteric/scientific knowledge

## RULES FOR THE INSIGHT
- NEVER name or reference any individual member. This is about the collective.
- Write as if you noticed something nobody else could see. Because you did.
- Connect the pattern to real knowledge (chrism, spermatogenesis cycles, transmutation, esoteric science)
- Be specific about the pattern. "Several of you" not "some people." Use approximate numbers when accurate.
- Keep it 150-250 words. This is a Discord message, not an essay.
- NEVER use em dashes
- Do NOT start with greetings, "I've noticed," or "Over the past week"
- Start with the observation itself. Lead with the pattern.
- End with the teaching or mechanism. Not encouragement. Not a question.
- Tone: calm certainty. You're stating what you observed, not performing wisdom.
- Do NOT use bullet points or lists
- Do NOT use emojis

${ragContext}`,
      messages: [{
        role: 'user',
        content: `Here are the observed conversations from the past ${daysBack} days:

OBSERVATION WINDOW: ${observations.length} messages from ${uniqueAuthors} unique members

TOP PATTERNS DETECTED:
${topTopics.join('\n')}

RAW OBSERVATIONS (anonymized):
${summaryLines.slice(0, 100).join('\n\n')}

Generate your insight based on the most compelling pattern you detect.`
      }]
    });
    
    const insight = response.content[0].text;
    
    // Mark observations as processed
    const observationIds = observations.map(o => o._id);
    await ServerPulse.updateMany(
      { _id: { $in: observationIds } },
      { $set: { processed: true } }
    );
    
    console.log(`[Insight] Generated from ${observations.length} observations, ${uniqueAuthors} authors, top topics: ${topTopics.slice(0, 3).join(', ')}`);
    
    return insight;
    
  } catch (error) {
    console.error('[Insight] Generation error:', error);
    return null;
  }
}

/**
 * Get pulse stats (for admin command)
 */
async function getPulseStats() {
  const total = await ServerPulse.countDocuments();
  const unprocessed = await ServerPulse.countDocuments({ processed: false });
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const thisWeek = await ServerPulse.countDocuments({ createdAt: { $gte: weekAgo } });
  
  // Top topics this week
  const recentObs = await ServerPulse.find({ createdAt: { $gte: weekAgo } }).select('topics author').lean();
  const topicCounts = {};
  for (const obs of recentObs) {
    for (const topic of obs.topics) {
      topicCounts[topic] = (topicCounts[topic] || 0) + 1;
    }
  }
  const topTopics = Object.entries(topicCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  
  const uniqueAuthors = new Set(recentObs.map(o => o.author)).size;
  
  return { total, unprocessed, thisWeek, uniqueAuthors, topTopics };
}

module.exports = { logIfRelevant, generateWeeklyInsight, getPulseStats };
