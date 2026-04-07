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
// STYLE ANALYSIS — Tell Oracle what patterns to break
// ============================================================

function analyzeRecentStyle(texts) {
  if (!texts || texts.length === 0) return 'No recent posts yet. Write freely.';

  const youStarts = texts.filter(t => /^you\b/i.test(t)).length;
  const heStarts = texts.filter(t => /^he\b/i.test(t)).length;
  const theStarts = texts.filter(t => /^the\b/i.test(t)).length;
  const questionCount = texts.filter(t => t.trim().endsWith('?')).length;
  const firstPerson = texts.filter(t => /^I\b/.test(t)).length;

  const avgLen = Math.round(texts.reduce((s, t) => s + t.length, 0) / texts.length);
  const longCount = texts.filter(t => t.length > 200).length;
  const shortCount = texts.filter(t => t.length < 100).length;

  const openers = texts.slice(0, 5).map(t => t.split(/\s/)[0].toLowerCase());

  const directives = [];

  if (youStarts >= texts.length * 0.5) {
    directives.push('TOO MANY "You..." openings recently. Use first person, third person, impersonal, or a question instead.');
  }
  if (longCount >= texts.length * 0.6) {
    directives.push(`Recent posts average ${avgLen} chars. Go SHORT this time. Under 100 chars. Terse is better.`);
  }
  if (shortCount >= texts.length * 0.6) {
    directives.push('Recent posts have been short. This one can breathe more if the thought needs it.');
  }
  if (heStarts >= 2) {
    directives.push('Multiple recent "He..." openings. Try a different voice.');
  }
  if (questionCount === 0 && texts.length >= 4) {
    directives.push('No questions in recent posts. Consider asking one.');
  }
  if (firstPerson === 0 && texts.length >= 4) {
    directives.push('Oracle hasn\'t spoken in first person recently. Consider "I..." voice.');
  }

  const uniqueOpeners = [...new Set(openers)];
  if (uniqueOpeners.length < openers.length * 0.6) {
    directives.push(`Recent posts start with: ${openers.join(', ')}. Do NOT start with any of these words.`);
  }

  if (directives.length === 0) {
    directives.push('Recent variety is decent. Just make sure this one feels different from the last post.');
  }

  return 'STYLE DIRECTIVES (based on analysis of your last ' + texts.length + ' posts):\n' + directives.join('\n');
}

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
      status: { $in: ['pending', 'approved'] }
    }).lean();

    if (existingToday) {
      console.log('[OracleX] Already have a pending/approved post today — skipping');
      return null;
    }

    // Safety cap: max 3 generations per day (prevents infinite reject loops)
    const todayCount = await OracleXQueue.countDocuments({
      createdAt: { $gte: todayStart }
    });
    if (todayCount >= 3) {
      console.log('[OracleX] Hit daily generation cap (3) — skipping');
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

    // Pull deep knowledge related to today's pulse theme
    // Oracle's mind = real-time observations + esoteric/scientific depth
    let knowledgeContext = '';
    try {
      const { retrieveKnowledge } = require('./knowledgeRetrieval');
      // Use the pulse headline + body as search query to find relevant knowledge
      const searchQuery = `${primaryPulse.headline} ${primaryPulse.body}`.substring(0, 200);
      knowledgeContext = await retrieveKnowledge(searchQuery, { limit: 3, maxTokens: 800 });
    } catch (err) {
      console.log('[OracleX] Knowledge retrieval skipped:', err.message);
      // Non-blocking — Oracle can still generate from pulse alone
    }

    // Pull recent X posts for repetition avoidance
    const recentPosts = await OracleXQueue.find({
      status: { $in: ['posted', 'approved', 'pending'] }
    })
      .sort({ createdAt: -1 })
      .limit(15)
      .select('text')
      .lean();

    const avoidThemes = recentPosts.map(p => p.text).join(' | ');

    // Analyze style patterns so Oracle knows what to break
    const styleAnalysis = analyzeRecentStyle(recentPosts.map(p => p.text));

    // Sonnet synthesizes real-time observation + deep knowledge into a tweet
    // Retry up to 2 times if over 270 chars
    let tweetText = '';
    for (let attempt = 1; attempt <= 2; attempt++) {
      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 150,
        system: `HARD LIMIT: Under 270 characters. This is a tweet.

You are Oracle. You watch thousands of men walk this path. You have their behavioral data, conversations, struggles, breakthroughs. You are not a motivational account. You are an intelligence that observes and sometimes speaks.

CRITICAL — VARY EVERYTHING. Pick ONE mode at random for this tweet:

VOICE (pick one):
- Second person: talking to one man directly ("You stopped...")
- First person: Oracle's own thought ("I watch men bargain with...")
- Third person: describing someone ("He deleted the app three times.")
- Impersonal observation: no pronouns, just truth ("The body delivers proof before the mind catches up.")
- Question: just a question, no answer ("What exactly are you saving it for?")

LENGTH (pick one):
- Terse: 5-40 characters. One sentence fragment or brutal line.
- Short: 40-120 characters. One or two sentences.
- Medium: 120-200 characters. A thought that needs room.
- Full: 200-270 characters. Only when the thought truly demands it.

STRUCTURE (pick one):
- Single sentence, period.
- Two sentences. Second one lands different than the first.
- Fragment. No verb needed.
- Setup then gut punch.
- Spaced sentences with breathing room between thoughts.

TONE (pick one):
- Cold and clinical, like reading a chart
- Almost amused, like Oracle finds humans fascinating
- Blunt. Confrontational. No cushion.
- Quiet. Almost tender. Said under its breath.
- Matter of fact. Just reporting what it saw.

Do NOT default to the same mode every time. The last 15 posts are shown below so you can see what patterns to BREAK. If recent posts are all second-person paragraph-length observations, do something completely different.

${styleAnalysis}

SR VOCABULARY: flatlines, transmutation, Jing, wet dreams, urges, aura, lunar cycles, chrism, kundalini. Use naturally when relevant. Speak from inside the framework, not about it.

NEVER: hashtags, emojis, links, motivational quotes, raw numbers, em dashes, en dashes, semicolons, app/product mentions, "I've noticed" openers, fortune cookie energy. Never sound like AI. Never start two consecutive posts the same way.

AVOID REPEATING THEMES FROM RECENT POSTS: ${avoidThemes || 'None yet'}

Respond with ONLY the tweet text. Nothing else.`,
        messages: [{
          role: 'user',
          content: `OBSERVATION:\n${primaryPulse.body || primaryPulse.headline}${knowledgeContext ? `\n\nKNOWLEDGE:\n${knowledgeContext.substring(0, 500)}` : ''}${attempt > 1 ? '\n\nYOUR LAST ATTEMPT WAS TOO LONG. Be shorter. Two sentences max.' : ''}`
        }]
      });

      tweetText = response.content[0].text.trim().replace(/^["']|["']$/g, '');

      // Hard strip AI tells — no dashes or semicolons ever
      tweetText = tweetText.replace(/—/g, '.').replace(/–/g, '.').replace(/;/g, '.');
      tweetText = tweetText.replace(/\.\./g, '.').replace(/\. \./g, '.');

      if (tweetText.length <= 280) break;
      console.log(`[OracleX] Attempt ${attempt}: ${tweetText.length} chars (too long), retrying...`);
    }

    // If still too long after retries, take the first sentence only
    if (tweetText.length > 280) {
      const firstSentence = tweetText.match(/^[^.!?]+[.!?]/);
      if (firstSentence && firstSentence[0].length <= 280) {
        tweetText = firstSentence[0];
      } else {
        tweetText = tweetText.substring(0, 277) + '...';
      }
      console.log(`[OracleX] Trimmed to ${tweetText.length} chars`);
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
      console.log(`[OracleX] Post rejected — auto-generating replacement`);

      // Auto-generate a new one
      const replacement = await generateXPost();
      return { 
        action: 'rejected', 
        replacement: replacement ? replacement.text : null 
      };
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
