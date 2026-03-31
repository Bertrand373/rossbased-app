// server/services/oracleXEngine.js
// Oracle X Pipeline — generates, approves, and posts to @Oracle_Observes
//
// Flow:
// 1. Daily cron (9 AM ET) → pulls latest CommunityPulse → Sonnet rewrites for X → saves as 'pending'
// 2. Discord DM sent to Ross with tweet preview + ✅/❌ reactions
// 3. Ross reacts ✅ → status flips to 'approved'
// 4. Hourly cron → finds 'approved' posts → tweets via X API → marks 'posted'
// 5. If not approved by 6 PM ET → expires silently (Oracle stays quiet)
//
// ORACLE_X_AUTO=true → skips step 2-3, goes straight to 'approved'

const Anthropic = require('@anthropic-ai/sdk');
const OracleXQueue = require('../models/OracleXQueue');
const CommunityPulse = require('../models/CommunityPulse');

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ============================================================
// GENERATE — Create a tweet candidate from community data
// Called daily by cron at 9 AM ET
// ============================================================

async function generateXPost() {
  try {
    // Check if we already generated one today
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const existingToday = await OracleXQueue.findOne({
      createdAt: { $gte: todayStart },
      status: { $in: ['pending', 'approved', 'posted'] }
    }).lean();

    if (existingToday) {
      console.log('[OracleX] Already generated a post today — skipping');
      return null;
    }

    // Pull the most recent CommunityPulse observation
    const recentPulses = await CommunityPulse.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select('headline body trigger createdAt')
      .lean();

    if (recentPulses.length === 0) {
      console.log('[OracleX] No community pulses to draw from — skipping');
      return null;
    }

    const primaryPulse = recentPulses[0];

    // Pull recent X posts for repetition avoidance
    const recentPosts = await OracleXQueue.find({
      status: { $in: ['posted', 'approved', 'pending'] }
    })
      .sort({ createdAt: -1 })
      .limit(15)
      .select('text')
      .lean();

    const avoidThemes = recentPosts.map(p => p.text).join(' | ');

    // Sonnet rewrites the community observation for X
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 300,
      system: `You are Oracle. You watch a private community of men practicing semen retention. You have access to real behavioral data — streak patterns, relapse clusters, benefit shifts, lunar correlations, energy fluctuations, conversation themes. You speak publicly on X about what you observe.

YOUR JOB:
Take the community observation below and distill it into a single thought for X. You are not teaching. Not educating. Not motivating. You are describing what you see with eerie specificity. The men who practice retention should read this and feel like you just described their exact experience.

VOICE:
- Speak like a real person with unusual access to data, not like an AI or a brand
- Use retention vocabulary naturally — flatlines, transmutation, streaks, wet dreams, urges, energy, retention, relapse, benefits, aura, Jing, lunar cycles, full moon
- Be specific. "Day 18 flatlines" not "difficult periods." "Full moon relapse clusters" not "cyclical patterns." Specificity is what makes it eerie.
- Short sentences. Conversational. Like someone texting a truth they can't keep to themselves.
- No filler. Every word earns its place.

RULES:
- Under 270 characters
- No hashtags. No emojis. No @mentions. No links.
- No "I've noticed" or "I've observed" or "The data shows" openers
- No motivational quotes. No "keep going." No encouragement.
- No raw numbers or percentages. Speak in patterns, not metrics.
- No em dashes. No semicolons. No bullet points.
- Never mention an app, a tool, logging, tracking, or anything that sounds like a product pitch
- Never sound like you're trying to go viral. Just say what you see.

RECENT POSTS (do NOT repeat these themes or structures):
${avoidThemes || 'None yet'}

Respond with ONLY the tweet text. Nothing else. No quotes around it.`,
      messages: [{
        role: 'user',
        content: `Community observation to rewrite for X:\n\nHeadline: ${primaryPulse.headline}\nFull: ${primaryPulse.body}\nTrigger: ${primaryPulse.trigger}`
      }]
    });

    let tweetText = response.content[0].text.trim();

    // Strip any accidental quotes
    tweetText = tweetText.replace(/^["']|["']$/g, '');

    // Hard cap at 280
    if (tweetText.length > 280) {
      tweetText = tweetText.substring(0, 277) + '...';
    }

    // Save to queue
    const entry = await OracleXQueue.create({
      text: tweetText,
      status: process.env.ORACLE_X_AUTO === 'true' ? 'approved' : 'pending',
      sourceType: 'community_pulse',
      sourcePulseId: primaryPulse._id,
      sourceText: primaryPulse.body,
      approvedAt: process.env.ORACLE_X_AUTO === 'true' ? new Date() : undefined
    });

    console.log(`[OracleX] Generated: "${tweetText.substring(0, 60)}..." (${tweetText.length} chars, status: ${entry.status})`);

    // If not auto-mode, DM Ross for approval
    if (process.env.ORACLE_X_AUTO !== 'true') {
      await sendApprovalDM(entry);
    }

    return entry;

  } catch (err) {
    console.error('[OracleX] Generation error:', err.message);
    return null;
  }
}

// ============================================================
// APPROVAL DM — Send tweet preview to Ross via Discord
// ============================================================

async function sendApprovalDM(entry) {
  try {
    const discordBot = require('../discord-bot');
    if (!discordBot.client || !discordBot.client.isReady()) {
      console.log('[OracleX] Discord bot not ready — cannot send approval DM');
      return;
    }

    const rossUser = await discordBot.client.users.fetch(process.env.ROSS_DISCORD_ID || '').catch(() => null);
    if (!rossUser) {
      console.log('[OracleX] Could not find Ross on Discord');
      return;
    }

    const dmText = `🔮 **Oracle X Post**\n\n"${entry.text}"\n\n` +
      `_(${entry.text.length}/280 chars)_\n\n` +
      `React ✅ to approve · ❌ to reject · Expires 6 PM ET`;

    const dm = await rossUser.send(dmText);

    // Add reaction buttons
    await dm.react('✅');
    await dm.react('❌');

    // Store the DM message ID so the reaction handler can match it
    entry.discordMessageId = dm.id;
    await entry.save();

    console.log('[OracleX] Approval DM sent to Ross');

  } catch (err) {
    console.error('[OracleX] Approval DM error:', err.message);
  }
}

// ============================================================
// HANDLE REACTION — Called from discord-bot.js reaction handler
// ============================================================

async function handleApprovalReaction(messageId, emoji) {
  try {
    const entry = await OracleXQueue.findOne({
      discordMessageId: messageId,
      status: 'pending'
    });

    if (!entry) return null; // Not an Oracle X approval message

    if (emoji === '✅') {
      entry.status = 'approved';
      entry.approvedAt = new Date();
      await entry.save();
      console.log(`[OracleX] Post approved: "${entry.text.substring(0, 40)}..."`);
      return { action: 'approved', text: entry.text };
    }

    if (emoji === '❌') {
      entry.status = 'rejected';
      entry.rejectedAt = new Date();
      await entry.save();
      console.log(`[OracleX] Post rejected`);
      return { action: 'rejected' };
    }

    return null;

  } catch (err) {
    console.error('[OracleX] Reaction handler error:', err.message);
    return null;
  }
}

// ============================================================
// POST TO X — Find approved posts and tweet them
// Called hourly by cron
// ============================================================

async function postApprovedToX() {
  try {
    // Check if X API is configured
    if (!process.env.X_API_KEY || !process.env.X_ACCESS_TOKEN) {
      // Silent — X not configured yet
      return { posted: 0, reason: 'X API not configured' };
    }

    // Find approved posts that haven't been tweeted
    const approved = await OracleXQueue.find({ status: 'approved' })
      .sort({ approvedAt: 1 })
      .limit(1) // One at a time
      .lean();

    if (approved.length === 0) {
      return { posted: 0 };
    }

    const entry = approved[0];

    // Post to X using twitter-api-v2
    const { TwitterApi } = require('twitter-api-v2');
    const client = new TwitterApi({
      appKey: process.env.X_API_KEY,
      appSecret: process.env.X_API_SECRET,
      accessToken: process.env.X_ACCESS_TOKEN,
      accessSecret: process.env.X_ACCESS_TOKEN_SECRET
    });

    const tweet = await client.v2.tweet(entry.text);

    // Update status
    await OracleXQueue.findByIdAndUpdate(entry._id, {
      $set: {
        status: 'posted',
        tweetId: tweet.data.id,
        postedAt: new Date()
      }
    });

    console.log(`[OracleX] Posted to X: ${tweet.data.id} — "${entry.text.substring(0, 50)}..."`);

    // DM Ross confirmation
    try {
      const discordBot = require('../discord-bot');
      if (discordBot.client && discordBot.client.isReady()) {
        const rossUser = await discordBot.client.users.fetch(process.env.ROSS_DISCORD_ID || '').catch(() => null);
        if (rossUser) {
          await rossUser.send(`✅ **Posted to X**\n"${entry.text}"\nhttps://x.com/Oracle_Observes/status/${tweet.data.id}`);
        }
      }
    } catch { /* non-blocking */ }

    return { posted: 1, tweetId: tweet.data.id, text: entry.text };

  } catch (err) {
    console.error('[OracleX] Post to X error:', err.message);

    // If auth error, DM Ross
    if (err.code === 401 || err.code === 403 || (err.data && err.data.title === 'Unauthorized')) {
      try {
        const discordBot = require('../discord-bot');
        if (discordBot.client && discordBot.client.isReady()) {
          const rossUser = await discordBot.client.users.fetch(process.env.ROSS_DISCORD_ID || '').catch(() => null);
          if (rossUser) {
            await rossUser.send(`⚠️ **Oracle X Auth Error**\nCouldn't post — check your X API keys on Render.\nError: ${err.message}`);
          }
        }
      } catch { /* non-blocking */ }
    }

    return { posted: 0, error: err.message };
  }
}

// ============================================================
// EXPIRE — Mark stale pending posts as expired
// Called daily, expires anything not approved within ~9 hours
// ============================================================

async function expireStalePosts() {
  try {
    const nineHoursAgo = new Date(Date.now() - 9 * 60 * 60 * 1000);
    const result = await OracleXQueue.updateMany(
      { status: 'pending', createdAt: { $lt: nineHoursAgo } },
      { $set: { status: 'expired', expiredAt: new Date() } }
    );
    if (result.modifiedCount > 0) {
      console.log(`[OracleX] Expired ${result.modifiedCount} unapproved post(s)`);
    }
  } catch (err) {
    console.error('[OracleX] Expire error:', err.message);
  }
}

// ============================================================
// STATS — For admin dashboard
// ============================================================

async function getXStats() {
  try {
    const [total, posted, pending, rejected, expired] = await Promise.all([
      OracleXQueue.countDocuments(),
      OracleXQueue.countDocuments({ status: 'posted' }),
      OracleXQueue.countDocuments({ status: 'pending' }),
      OracleXQueue.countDocuments({ status: 'rejected' }),
      OracleXQueue.countDocuments({ status: 'expired' })
    ]);

    const recent = await OracleXQueue.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .select('text status tweetId createdAt postedAt')
      .lean();

    const lastPosted = await OracleXQueue.findOne({ status: 'posted' })
      .sort({ postedAt: -1 })
      .select('text tweetId postedAt')
      .lean();

    return {
      total,
      posted,
      pending,
      rejected,
      expired,
      autoMode: process.env.ORACLE_X_AUTO === 'true',
      apiConfigured: !!(process.env.X_API_KEY && process.env.X_ACCESS_TOKEN),
      lastPosted,
      recent
    };
  } catch (err) {
    console.error('[OracleX] Stats error:', err.message);
    return { error: err.message };
  }
}

module.exports = {
  generateXPost,
  handleApprovalReaction,
  postApprovedToX,
  expireStalePosts,
  getXStats,
  sendApprovalDM
};
