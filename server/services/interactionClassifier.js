// server/services/interactionClassifier.js
// Lightweight classification pipeline for Oracle interactions
// Runs fire-and-forget after every Oracle response — never blocks the user

const Anthropic = require('@anthropic-ai/sdk');
const OracleInteraction = require('../models/OracleInteraction');

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const VALID_TOPICS = [
  'flatline', 'urge', 'attraction', 'energy', 'workout', 'sleep',
  'spiritual', 'relationship', 'career', 'wet_dream', 'diet',
  'meditation', 'motivation', 'relapse_fear', 'benefits',
  'science', 'protocol', 'general'
];

const VALID_SENTIMENTS = ['distressed', 'anxious', 'neutral', 'curious', 'confident', 'grateful'];
const VALID_URGENCIES = ['low', 'medium', 'high'];

/**
 * Classify an Oracle interaction and save structured metadata.
 * Fire-and-forget — never throws, never blocks.
 *
 * @param {string} userMessage - The user's message text
 * @param {object} opts
 * @param {string} opts.source - 'app' or 'discord'
 * @param {string} [opts.userId] - MongoDB ObjectId (app users)
 * @param {string} [opts.discordUserId] - Discord user ID (discord users)
 * @param {string} [opts.username] - Username for easy querying
 * @param {number} [opts.streakDay] - Current streak day
 * @param {Date}   [opts.startDate] - Streak start date (used to compute sperma position)
 */
async function classifyInteraction(userMessage, opts = {}) {
  try {
    // Skip very short messages (greetings, "thanks", "ok", etc.)
    if (!userMessage || userMessage.trim().split(/\s+/).length < 3) return;

    // --- Haiku classification call ---
    const classifyResponse = await anthropic.messages.create({
      model: 'claude-3-5-haiku-20241022',
      max_tokens: 120,
      system: `Classify this semen retention practitioner's message. Respond ONLY with valid JSON, no preamble, no markdown.

Valid topics (pick 1-3): flatline, urge, attraction, energy, workout, sleep, spiritual, relationship, career, wet_dream, diet, meditation, motivation, relapse_fear, benefits, science, protocol, general
Valid sentiments (pick 1): distressed, anxious, neutral, curious, confident, grateful
Valid urgencies (pick 1): low, medium, high
relapseRiskLanguage: true if the message contains rationalization, bargaining, "does X count as a relapse", "is it okay if I just", minimization of urges, or seeking permission to relapse. Otherwise false.`,
      messages: [{
        role: 'user',
        content: userMessage.substring(0, 500) // Cap input for cost
      }]
    });

    const raw = classifyResponse.content[0]?.text?.trim();
    if (!raw) return;

    // Parse and validate
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      // Haiku sometimes wraps in markdown — try stripping
      const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      parsed = JSON.parse(cleaned);
    }

    // Validate and sanitize
    const topics = Array.isArray(parsed.topics)
      ? parsed.topics.filter(t => VALID_TOPICS.includes(t)).slice(0, 3)
      : ['general'];
    const sentiment = VALID_SENTIMENTS.includes(parsed.sentiment) ? parsed.sentiment : 'neutral';
    const urgency = VALID_URGENCIES.includes(parsed.urgency) ? parsed.urgency : 'low';
    const relapseRiskLanguage = parsed.relapseRiskLanguage === true;

    // --- Compute user state snapshot ---
    const streakDay = opts.streakDay || null;
    let spermaDay = null;
    let spermaCycle = null;
    let phase = null;

    if (streakDay && streakDay > 0) {
      spermaDay = ((streakDay - 1) % 74) + 1;
      spermaCycle = Math.floor((streakDay - 1) / 74) + 1;

      if (streakDay <= 14) phase = 'Initial Adaptation';
      else if (streakDay <= 45) phase = 'Emotional Processing';
      else if (streakDay <= 90) phase = 'Mental Expansion';
      else if (streakDay <= 180) phase = 'Integration & Growth';
      else phase = 'Mastery & Purpose';
    }

    // --- Save to MongoDB ---
    await OracleInteraction.create({
      userId: opts.userId || undefined,
      discordUserId: opts.discordUserId || undefined,
      username: opts.username || undefined,
      source: opts.source || 'app',
      streakDay,
      spermaDay,
      spermaCycle,
      phase,
      topics,
      sentiment,
      urgency,
      relapseRiskLanguage
    });

    if (relapseRiskLanguage) {
      console.log(`⚠️ Relapse-risk language detected: ${opts.username || opts.discordUserId} (${opts.source})`);
    }

  } catch (err) {
    // Completely silent — classification must never impact user experience
    console.error('Interaction classification error (non-blocking):', err.message);
  }
}

/**
 * Backfill relapseWithin48h on recent OracleInteraction documents
 * Called when a relapse is detected through the user update endpoint
 *
 * @param {string} userId - MongoDB ObjectId of the user
 * @param {Date}   [relapseTime] - When the relapse occurred (defaults to now)
 */
async function backfillRelapseFlag(userId, relapseTime) {
  try {
    const cutoff = new Date((relapseTime || new Date()).getTime() - 48 * 60 * 60 * 1000);

    const result = await OracleInteraction.updateMany(
      {
        $or: [{ userId }, { username: userId }], // userId can be ObjectId or username string
        timestamp: { $gte: cutoff },
        relapseWithin48h: null
      },
      { $set: { relapseWithin48h: true } }
    );

    if (result.modifiedCount > 0) {
      console.log(`🔮 Relapse backfill: marked ${result.modifiedCount} interactions for user ${userId}`);
    }
  } catch (err) {
    console.error('Relapse backfill error (non-blocking):', err.message);
  }
}

module.exports = { classifyInteraction, backfillRelapseFlag };
