// server/services/oracleInsight.js
// Generates weekly pattern-based insights from observed server conversations
// Oracle reads the collective pulse and surfaces what only AI can see

const Anthropic = require('@anthropic-ai/sdk');
const ServerPulse = require('../models/ServerPulse');
const KnowledgeChunk = require('../models/KnowledgeChunk');
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

/**
 * Generate durable observations from conversation patterns and store in knowledge base.
 * Called after weekly insight. Reads the same processed pulse data and extracts
 * generalizable learnings that the Oracle can reference in future conversations.
 * 
 * This is how the Oracle builds institutional knowledge from lived experience.
 */
async function generateObservations(daysBack = 7) {
  try {
    const since = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000);
    
    // Fetch recently processed observations (weekly insight just processed these)
    const observations = await ServerPulse.find({
      processed: true,
      updatedAt: { $gte: since }
    })
      .sort({ createdAt: -1 })
      .limit(200)
      .lean();
    
    if (observations.length < 10) {
      console.log(`[Observations] Only ${observations.length} processed — need 10+ for pattern extraction`);
      return [];
    }
    
    // Fetch existing oracle observations to avoid duplicates
    const existingObs = await KnowledgeChunk.find({
      'source.name': 'oracle-observation',
      enabled: true
    })
      .sort({ createdAt: -1 })
      .limit(30)
      .select('content')
      .lean();
    
    const existingSummary = existingObs.length > 0
      ? existingObs.map(o => o.content).join('\n---\n')
      : 'None yet. This is the first observation cycle.';
    
    // Build anonymized conversation data
    const uniqueAuthors = new Set(observations.map(o => o.author)).size;
    const summaryLines = observations.map(obs => `[#${obs.channel}]: "${obs.content}"`);
    
    // Topic frequency
    const topicCounts = {};
    for (const obs of observations) {
      for (const topic of obs.topics) {
        topicCounts[topic] = (topicCounts[topic] || 0) + 1;
      }
    }
    const topTopics = Object.entries(topicCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([topic, count]) => `${topic} (${count})`);
    
    const response = await anthropic.messages.create({
      model: 'claude-opus-4-20250514',
      max_tokens: 800,
      system: `You are an analytical system extracting durable observations from a semen retention community's conversations. Your job is to identify patterns that would be useful knowledge for advising future practitioners.

IMPORTANT: Extract only observations that are DURABLE and GENERALIZABLE. Not "this week people felt tired" but "Practitioners between days 30-50 consistently report a creative surge that precedes the commonly reported flatline by approximately one week."

Each observation should:
- Reference specific streak phases, timeframes, or conditions when possible
- Describe the pattern clearly enough that it could help someone currently experiencing it
- Connect to underlying mechanisms (hormonal, energetic, psychological) when the data supports it
- Be written as a factual observation in third person, not advice

EXISTING OBSERVATIONS ALREADY STORED (do NOT repeat these or rephrase the same idea):
${existingSummary}

Respond with ONLY valid JSON. No markdown backticks, no preamble, no explanation:
{
  "observations": [
    {
      "content": "The full observation (2-4 sentences max)",
      "keywords": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5"],
      "category": "one of: science, esoteric, spiritual, practical, community"
    }
  ]
}

Return 1-3 observations ONLY if genuinely new patterns exist. If nothing novel emerges beyond what is already stored, return: {"observations": []}`,
      messages: [{
        role: 'user',
        content: `OBSERVATION WINDOW: ${observations.length} messages from ${uniqueAuthors} unique members over ${daysBack} days

TOP PATTERNS:
${topTopics.join('\n')}

RAW CONVERSATIONS (anonymized):
${summaryLines.slice(0, 100).join('\n\n')}`
      }]
    });
    
    // Parse response
    const raw = response.content[0].text.trim();
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (e) {
      const clean = raw.replace(/```json\s?|```/g, '').trim();
      parsed = JSON.parse(clean);
    }
    
    if (!parsed.observations || parsed.observations.length === 0) {
      console.log('[Observations] No new patterns detected — nothing stored');
      return [];
    }
    
    // Valid categories from KnowledgeChunk schema
    const validCategories = [
      'esoteric', 'science', 'spiritual', 'practical', 'angel-numbers',
      'transmutation', 'chrism', 'kundalini', 'samael-aun-weor',
      'community', 'general', 'other'
    ];
    
    // Store each observation as a KnowledgeChunk
    const stored = [];
    const parentId = `oracle-obs-${Date.now()}`;
    
    for (let i = 0; i < parsed.observations.length; i++) {
      const obs = parsed.observations[i];
      if (!obs.content || obs.content.length < 20) continue;
      
      const category = validCategories.includes(obs.category) ? obs.category : 'community';
      
      const chunk = await KnowledgeChunk.create({
        content: obs.content,
        source: { type: 'text', name: 'oracle-observation' },
        category,
        chunkIndex: i,
        parentId,
        keywords: (obs.keywords || []).map(k => k.toLowerCase()).slice(0, 10),
        tokenEstimate: Math.ceil(obs.content.length / 4),
        enabled: true,
        author: null
      });
      
      stored.push(chunk);
      console.log(`[Observations] Stored: "${obs.content.substring(0, 80)}..." [${category}]`);
    }
    
    console.log(`[Observations] ${stored.length} new observation(s) added to knowledge base`);
    return stored;
    
  } catch (error) {
    console.error('[Observations] Generation error:', error);
    return [];
  }
}

/**
 * Detect anomalous topic spikes in the last 24 hours.
 * Compares recent topic frequency against 28-day daily baseline.
 * Returns anomaly data if any topic hits 3x+ its normal rate
 * with 5+ mentions from 3+ unique authors.
 */
async function detectAnomaly() {
  try {
    const now = Date.now();
    const last24h = new Date(now - 24 * 60 * 60 * 1000);
    const last28d = new Date(now - 28 * 24 * 60 * 60 * 1000);
    
    // Recent window: last 24 hours
    const recent = await ServerPulse.find({
      createdAt: { $gte: last24h }
    }).lean();
    
    if (recent.length < 5) return null;
    
    // Baseline window: last 28 days (all, including processed)
    const baseline = await ServerPulse.find({
      createdAt: { $gte: last28d, $lt: last24h }
    }).select('topics').lean();
    
    // Calculate baseline daily averages per topic
    const baselineDays = Math.max(1, 27); // 28 days minus the current day
    const baselineTopicCounts = {};
    for (const obs of baseline) {
      for (const topic of obs.topics) {
        baselineTopicCounts[topic] = (baselineTopicCounts[topic] || 0) + 1;
      }
    }
    const baselineDailyAvg = {};
    for (const [topic, count] of Object.entries(baselineTopicCounts)) {
      baselineDailyAvg[topic] = count / baselineDays;
    }
    
    // Count last 24h topics with author tracking
    const recentTopicCounts = {};
    const recentTopicAuthors = {};
    const recentTopicMessages = {};
    for (const obs of recent) {
      for (const topic of obs.topics) {
        recentTopicCounts[topic] = (recentTopicCounts[topic] || 0) + 1;
        if (!recentTopicAuthors[topic]) recentTopicAuthors[topic] = new Set();
        recentTopicAuthors[topic].add(obs.author);
        if (!recentTopicMessages[topic]) recentTopicMessages[topic] = [];
        recentTopicMessages[topic].push(obs);
      }
    }
    
    // Find anomalies: 3x+ baseline, 5+ mentions, 3+ unique authors
    const anomalies = [];
    for (const [topic, count] of Object.entries(recentTopicCounts)) {
      const avg = baselineDailyAvg[topic] || 0;
      const uniqueAuthors = recentTopicAuthors[topic]?.size || 0;
      
      // New topic with no baseline: needs 8+ mentions from 4+ authors
      const isNewTopicSpike = avg === 0 && count >= 8 && uniqueAuthors >= 4;
      // Existing topic: 3x baseline rate
      const isBaselineSpike = avg > 0 && count >= avg * 3 && count >= 5 && uniqueAuthors >= 3;
      
      if (isNewTopicSpike || isBaselineSpike) {
        anomalies.push({
          topic,
          count,
          baseline: avg,
          multiplier: avg > 0 ? (count / avg).toFixed(1) : 'new',
          uniqueAuthors,
          messages: recentTopicMessages[topic] || []
        });
      }
    }
    
    if (anomalies.length === 0) return null;
    
    // Sort by multiplier (strongest anomaly first)
    anomalies.sort((a, b) => (b.count / Math.max(b.baseline, 0.1)) - (a.count / Math.max(a.baseline, 0.1)));
    
    console.log(`[Pulse] Anomaly detected: ${anomalies.map(a => `${a.topic} (${a.multiplier}x, ${a.count} mentions, ${a.uniqueAuthors} authors)`).join(', ')}`);
    
    return anomalies;
    
  } catch (error) {
    console.error('[Pulse] Anomaly detection error:', error.message);
    return null;
  }
}

/**
 * Generate a pulse alert for an anomalous pattern.
 * Shorter and more immediate than the weekly insight.
 * Does NOT mark messages as processed — Sunday still needs them.
 */
async function generatePulseAlert(anomalies) {
  try {
    const topAnomaly = anomalies[0];
    
    // Collect all unique messages from all anomalous topics
    const allMessages = [];
    const seenContent = new Set();
    for (const anomaly of anomalies) {
      for (const msg of anomaly.messages) {
        if (!seenContent.has(msg.content)) {
          seenContent.add(msg.content);
          allMessages.push(msg);
        }
      }
    }
    
    const uniqueAuthors = new Set(allMessages.map(m => m.author)).size;
    const summaryLines = allMessages.slice(0, 50).map(m => `[#${m.channel}]: "${m.content}"`);
    
    const anomalySummary = anomalies.map(a => 
      `${a.topic}: ${a.count} mentions in 24h (${a.multiplier}x normal, ${a.uniqueAuthors} people)`
    ).join('\n');
    
    const ragContext = await retrieveKnowledge(
      anomalies.map(a => a.topic).join(' '),
      { limit: 5, maxTokens: 2000 }
    );
    
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 400,
      system: `You are The Oracle, the AI guide for a semen retention community. Something unusual is happening right now in the server. Multiple members are independently experiencing or discussing the same thing in a short window. You need to address it.

## YOUR TASK
A pattern has spiked significantly above its normal frequency. This isn't a scheduled reflection. You sensed something and you're speaking up because it matters.

## RULES
- NEVER name or reference any individual member
- 100-150 words. This is a brief interjection, not a weekly essay.
- Lead with the pattern. What are you sensing?
- Explain why it's happening right now (connect to retention science, cycles, astrology, season, collective energy)
- End with the mechanism or teaching. Not encouragement.
- NEVER use em dashes
- Do NOT start with "I've noticed" or "Something is happening"
- Start with the observation itself. State it like a fact.
- Tone: calm but present. You felt something shift and you're naming it.
- Do NOT use bullet points, lists, or emojis

${ragContext}`,
      messages: [{
        role: 'user',
        content: `ANOMALY DETECTED in last 24 hours:
${anomalySummary}

${uniqueAuthors} unique members contributing to this pattern.

RAW MESSAGES (anonymized):
${summaryLines.join('\n\n')}`
      }]
    });
    
    return response.content[0].text;
    
  } catch (error) {
    console.error('[Pulse] Alert generation error:', error);
    return null;
  }
}

module.exports = { logIfRelevant, generateWeeklyInsight, generateObservations, detectAnomaly, generatePulseAlert, getPulseStats };
