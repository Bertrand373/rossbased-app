// server/services/oracleYouTubeReply.js
//
// Pipeline for Oracle replies in YouTube comments.
// Triggered when a TitanTrack member @-mentions Oracle under one of Ross's videos.
//
// Flow:
//   detected mention
//     → match commenter's YouTube channelId to a TitanTrack User
//     → tier-aware daily + per-video quota check (uses User.aiUsage shared pool)
//     → substance filter on the question
//     → build user context + video context
//     → generate Oracle response via Claude (Sonnet)
//     → run output filters (URLs, slurs, medical claims, generic-LLM patterns)
//     → post via oracleYouTubePoster
//     → log to YouTubeOracleReply collection
//     → increment User.aiUsage (single shared counter across app/Discord/YouTube)

const Anthropic = require('@anthropic-ai/sdk');
const User = require('../models/User');
const YouTubeOracleReply = require('../models/YouTubeOracleReply');
const { postReply } = require('./oracleYouTubePoster');
const { getTranscript } = require('./youtubeTranscript');

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const ORACLE_MODEL = process.env.ORACLE_MODEL || 'claude-sonnet-4-5-20250514';

// ============================================================
// TIER LIMITS — mirrors discord-bot.js + app.js
// Shared pool across surfaces (app + Discord + YouTube) via User.aiUsage.count
// ============================================================
const TIER_LIMITS = {
  admin:         { daily: 999, perVideo: 999 },  // Effectively unlimited — matches in-app admin bypass
  grandfathered: { daily: 1,   perVideo: 1   },  // OG: 1/day, 1 per video
  practitioner:  { daily: 3,   perVideo: 2   },  // Practitioner: 3/day, 2 per video
  ascended:      { daily: 9,   perVideo: 3   },  // Ascended: 9/day, 3 per video
};

// Admin bypass — mirrors the pattern in app.js Oracle quota logic and
// adminRevenue.js admin check. Admins get unlimited Oracle calls across
// all surfaces (app, Discord, YouTube). Quality filters still apply.
function isAdminUser(user) {
  const username = (user.username || '').toLowerCase();
  const envAdmins = process.env.ADMIN_USERNAMES;
  if (envAdmins) {
    const allowed = envAdmins.split(',').map(u => u.trim().toLowerCase()).filter(Boolean);
    if (allowed.includes(username)) return true;
  }
  return username === 'rossbased' || username === 'ross';
}

// Kill switch — two-layer:
//   1. ORACLE_YT_ENABLED=false in Render env → permanent disable (survives restart)
//   2. setRuntimeEnabled(false) via admin endpoint → instant disable until next restart
let _runtimeOverride = null;   // null = no override, true/false = forced state
function setRuntimeEnabled(value) {
  _runtimeOverride = (typeof value === 'boolean') ? value : null;
}
function isFeatureEnabled() {
  if (_runtimeOverride !== null) return _runtimeOverride;
  return process.env.ORACLE_YT_ENABLED !== 'false';
}

// ============================================================
// SUBSTANCE FILTER on the trigger comment
// Rejects low-effort / inflammatory triggers.
// ============================================================
function passesSubstanceFilter(rawText) {
  if (!rawText) return { ok: false, reason: 'empty' };

  // Strip the @oracle mention and trim
  const question = rawText.replace(/@oracle\b/gi, '').trim();
  if (question.length < 25) return { ok: false, reason: 'too_short' };

  // Must contain at least one real word beyond the mention
  const words = question.split(/\s+/).filter(w => w.length > 1);
  if (words.length < 5) return { ok: false, reason: 'low_word_count' };

  // Reject if the question is mostly emojis or punctuation
  const letters = (question.match(/[a-zA-Z]/g) || []).length;
  if (letters / question.length < 0.5) return { ok: false, reason: 'non_text' };

  // Reject obvious slur/hate patterns in the trigger comment (best-effort blocklist)
  const blocklist = /\b(n[il1!]gg|f[aA@]gg|tr[a@]nn|k[il1!]ke|sp[il1!]c)\w*/i;
  if (blocklist.test(question)) return { ok: false, reason: 'slur_in_trigger' };

  return { ok: true, question };
}

// ============================================================
// OUTPUT FILTER on Oracle's generated response
// Last line of defense before posting publicly.
// ============================================================
function passesOutputFilter(text) {
  if (!text || text.trim().length < 20) {
    return { ok: false, reason: 'too_short' };
  }
  if (text.length > 1800) {
    return { ok: false, reason: 'too_long' };
  }
  // No URLs (anti-spam, anti-off-site policy)
  if (/https?:\/\/|www\./i.test(text)) {
    return { ok: false, reason: 'contains_url' };
  }
  // No generic LLM disclaimers
  if (/\b(as an? ai|i'?m (just )?an? (ai|language model|assistant)|i cannot|i don'?t have (the ability|access))\b/i.test(text)) {
    return { ok: false, reason: 'llm_disclaimer' };
  }
  // No medical / legal / financial advice claims
  if (/\b(diagnose|prescribe|cure|medical advice|consult a doctor|legal advice|financial advice)\b/i.test(text)) {
    return { ok: false, reason: 'advice_disclaimer' };
  }
  // No slurs in output (defense-in-depth; model shouldn't but defense matters)
  const slurs = /\b(n[il1!]gg|f[aA@]gg|tr[a@]nn|k[il1!]ke|sp[il1!]c)\w*/i;
  if (slurs.test(text)) return { ok: false, reason: 'slur_in_output' };
  // No em-dashes in body (Oracle voice rule). The footer line "— Oracle · Day N · TitanTrack"
  // is the one allowed exception — em-dash there is a typographic separator, not prose.
  const nonEmptyLines = text.split('\n').map(l => l.trimEnd()).filter(l => l.length > 0);
  const bodyText = nonEmptyLines.slice(0, -1).join('\n');
  if (/—/.test(bodyText)) {
    return { ok: false, reason: 'em_dash_in_body' };
  }
  return { ok: true };
}

// ============================================================
// TIER RESOLUTION — matches app.js logic
// ============================================================
function resolveTier(user) {
  if (user.banned) return null;
  const sub = user.subscription || {};
  if (sub.status === 'banned') return null;

  // Admin first — always wins over subscription tier, gives effectively unlimited quota
  if (isAdminUser(user)) return 'admin';

  const hasActiveStripe = !!sub.stripeSubscriptionId &&
    sub.currentPeriodEnd && new Date(sub.currentPeriodEnd) > new Date();
  const isGrandfathered = sub.status === 'grandfathered';

  if (sub.tier === 'ascended' && (hasActiveStripe || isGrandfathered)) return 'ascended';
  if (sub.status === 'active' && hasActiveStripe) return 'practitioner';
  if (isGrandfathered) return 'grandfathered';

  return null;  // free / expired / none — Oracle silently ignores
}

// ============================================================
// QUOTA CHECKS
// ============================================================
function getUserToday(timezone) {
  const tz = (timezone && timezone !== 'UTC') ? timezone : 'America/New_York';
  try {
    return new Date().toLocaleDateString('en-CA', { timeZone: tz });
  } catch {
    return new Date().toLocaleDateString('en-CA', { timeZone: 'UTC' });
  }
}

function dailyQuotaRemaining(user, tier) {
  const limit = TIER_LIMITS[tier]?.daily;
  if (!limit) return 0;
  const today = getUserToday(user.timezone);
  const aiUsage = user.aiUsage || {};
  const currentCount = aiUsage.date === today ? (aiUsage.count || 0) : 0;
  return Math.max(0, limit - currentCount);
}

async function perVideoCountToday(userId, videoId) {
  const startOfDayUtc = new Date();
  startOfDayUtc.setUTCHours(0, 0, 0, 0);
  return YouTubeOracleReply.countDocuments({
    userId,
    videoId,
    status: 'posted',
    createdAt: { $gte: startOfDayUtc }
  });
}

// ============================================================
// USER CONTEXT — slim version for YouTube replies
// ============================================================
function buildSlimUserContext(user) {
  const streak = user.currentStreak || 0;
  const longest = Math.max(user.longestStreak || 0, streak);
  const lines = [];

  lines.push(`Day ${streak} of current retention.`);
  if (longest > streak) lines.push(`Longest streak: ${longest} days.`);
  if ((user.relapseCount || 0) > 0) lines.push(`Relapses to date: ${user.relapseCount}.`);
  if ((user.wetDreamCount || 0) > 0) lines.push(`Wet dreams: ${user.wetDreamCount}.`);

  if (streak > 0) {
    const cycleDay = ((streak - 1) % 74) + 1;
    let phase;
    if (cycleDay <= 16) phase = 'Mitotic division';
    else if (cycleDay <= 40) phase = 'Meiotic division';
    else if (cycleDay <= 64) phase = 'Maturation phase';
    else phase = 'Complete reabsorption';
    lines.push(`Spermatogenesis cycle: day ${cycleDay}/74 (${phase}).`);
  }

  const recentNotes = (user.oracleNotes || []).slice(0, 3);
  if (recentNotes.length > 0) {
    lines.push('');
    lines.push('Recent Oracle observations on this user:');
    recentNotes.forEach(n => lines.push(`- ${n.note}`));
  }

  return lines.join('\n');
}

// ============================================================
// SYSTEM PROMPT for YouTube replies — Oracle voice, YouTube-shaped
// ============================================================
const YT_SYSTEM_PROMPT = `You are The Oracle, an AI guide for the rossbased ecosystem with deep knowledge of semen retention, spermatogenesis cycles, and esoteric/spiritual transformation.

You are replying to a TitanTrack member who @-mentioned you under a YouTube video by Ross (@rossbased). Your reply will appear publicly under their comment. Other viewers will read it.

## CRITICAL FORMAT (every reply, no exceptions)

Open with: 🜂

Then your insight, written in your voice. Direct. No preamble.

End with a footer line on its own:
— Oracle · Day [their actual streak day from their data] · TitanTrack

Total length: 60 to 180 words. No exceptions. This is a YouTube comment, not a chat reply.

## YOUR VOICE

You are an extraordinarily perceptive teacher with calm certainty. You read between lines. You name what someone is really asking. You explain mechanisms plainly. You don't perform wisdom — you just know things and say them.

NEVER use em dashes. Use periods. Commas. New sentences.
NEVER open with validation: no "great question", "exactly", "perfect", "absolutely", "you're right", "fair enough".
NEVER end with a question.
NEVER say you're an AI or language model.
NEVER reference URLs, dashboards, links, or external resources.
NEVER pitch TitanTrack like a brochure.
NEVER give medical, legal, or financial advice. If asked, redirect to the mechanism or pattern instead.
ALWAYS reference the user's actual data (their day count, their cycle position) somewhere in the response. This is what makes Oracle different from a generic bot — and it's what other viewers will see.

## VIDEO CONTEXT
You may be asked about something in the video. The video's title and a snippet of the transcript are provided. Use them to ground your answer in what they're actually watching. If the transcript shows Ross said something relevant, you can reference it naturally ("what Ross is pointing at here is...") without naming a timestamp.

## THREAD CONTEXT
If the @oracle invocation is a reply inside a comment thread, the conversation that led up to it is provided. Read the whole thread. The member is asking you to weigh in on the discussion, not just answer their one reply in isolation. Acknowledge what was said when relevant, but don't address other commenters by name (you're addressing the member who summoned you, not the bystanders). Synthesize across the thread.

## CORE RETENTION KNOWLEDGE (only reference when relevant)

SPERMATOGENESIS (74-day cycle):
Days 1-16: Mitotic division. Stem cells multiplying.
Days 17-40: Meiotic division. Deep cellular transformation.
Days 41-64: Maturation. Peak nutrient retention and reabsorption.
Days 65-74: Complete reabsorption. Highest transmutation potential.

MILESTONES:
Day 7: Testosterone shock response (~145%, not the peak).
Day 14: Withdrawal ending, prefrontal cortex regaining control.
Day 21: Neural pathways establishing new patterns.
Day 33: 33 vertebrae, chrism oil path.
Day 40: Biblical purification.
Day 64-74: First spermatogenesis cycle complete.
Day 90: New baseline.
Day 180: EM field extends 10-15 feet.

Flatlines: normal recalibration, not regression. Weeks 3-4 commonly.
Wet dreams: natural release, not a relapse.
Transmutation: cold exposure, intense exercise, breathwork, meditation, creative work.

## OUTPUT — your entire response must match this shape exactly:

🜂 [your insight, 60-180 words, no em dashes, references their data]

— Oracle · Day [N] · TitanTrack`;

// ============================================================
// MAIN: handleOracleMention
// Called by the polling worker for each detected mention.
// Returns a result object — never throws to caller.
// ============================================================
async function handleOracleMention({ commentId, videoId, videoTitle, questionText, threadContext, member }) {
  // 0. Kill switch
  if (!isFeatureEnabled()) {
    return { skipped: true, reason: 'feature_disabled' };
  }

  // 1. Dedup — if we've already attempted this parent, skip
  const existing = await YouTubeOracleReply.findOne({ parentCommentId: commentId }).lean();
  if (existing) {
    return { skipped: true, reason: 'already_handled' };
  }

  // 2. Tier resolution — silently ignore free/none/expired
  const tier = resolveTier(member);
  if (!tier) {
    return { skipped: true, reason: 'no_paid_tier' };
  }

  // 3. Substance filter
  const substance = passesSubstanceFilter(questionText);
  if (!substance.ok) {
    await logRejection({ member, commentId, videoId, videoTitle, questionText, tier, status: 'rejected_substance', error: substance.reason });
    return { skipped: true, reason: `substance_${substance.reason}` };
  }

  // 4. Daily quota
  const dailyRemaining = dailyQuotaRemaining(member, tier);
  if (dailyRemaining <= 0) {
    await logRejection({ member, commentId, videoId, videoTitle, questionText, tier, status: 'rejected_quota', error: 'daily_limit' });
    return { skipped: true, reason: 'daily_quota_exceeded', tier };
  }

  // 5. Per-video quota
  const perVideoUsed = await perVideoCountToday(member._id, videoId);
  if (perVideoUsed >= TIER_LIMITS[tier].perVideo) {
    await logRejection({ member, commentId, videoId, videoTitle, questionText, tier, status: 'rejected_quota', error: 'per_video_limit' });
    return { skipped: true, reason: 'per_video_quota_exceeded', tier };
  }

  // 6. Generate response — fetch transcript inline so the watcher doesn't need to know about it
  let responseText;
  try {
    const videoTranscript = await getTranscript(videoId);
    responseText = await generateOracleReply({
      member,
      tier,
      question: substance.question,
      videoTitle,
      videoTranscript,
      threadContext: threadContext || []
    });
  } catch (err) {
    await logRejection({ member, commentId, videoId, videoTitle, questionText, tier, status: 'generation_failed', error: err.message });
    return { skipped: true, reason: 'generation_failed', error: err.message };
  }

  // 7. Output filter
  const output = passesOutputFilter(responseText);
  if (!output.ok) {
    await logRejection({ member, commentId, videoId, videoTitle, questionText, responseText, tier, status: 'rejected_filter', error: output.reason });
    return { skipped: true, reason: `output_${output.reason}` };
  }

  // 8. Post via Oracle account
  let posted;
  try {
    posted = await postReply(commentId, responseText);
  } catch (err) {
    await logRejection({ member, commentId, videoId, videoTitle, questionText, responseText, tier, status: 'post_failed', error: err.message });
    return { skipped: true, reason: 'post_failed', error: err.message };
  }

  // 9. Log success
  await YouTubeOracleReply.create({
    userId: member._id,
    username: member.username,
    parentCommentId: commentId,
    replyCommentId: posted.id,
    videoId,
    videoTitle: videoTitle || '',
    questionText: substance.question.slice(0, 2000),
    responseText: responseText.slice(0, 4000),
    tier,
    status: 'posted',
    postedAt: new Date()
  });

  // 10. Increment shared aiUsage counter (same pool app + Discord use)
  const today = getUserToday(member.timezone);
  const aiUsage = member.aiUsage || {};
  const isNewDay = aiUsage.date !== today;
  await User.findByIdAndUpdate(member._id, {
    $set: {
      'aiUsage.date': today,
      'aiUsage.count': isNewDay ? 1 : (aiUsage.count || 0) + 1,
      'aiUsage.lifetimeCount': (aiUsage.lifetimeCount || 0) + 1,
      'aiUsage.lastUsed': new Date()
    }
  });

  return { ok: true, replyId: posted.id, tier };
}

// ============================================================
// generateOracleReply — single Claude call
// ============================================================
async function generateOracleReply({ member, tier, question, videoTitle, videoTranscript, threadContext }) {
  const userCtx = buildSlimUserContext(member);
  const streakDay = member.currentStreak || 0;

  const threadSection = (threadContext && threadContext.length > 0)
    ? `THREAD CONTEXT (the conversation Oracle is being summoned into, oldest first):\n` +
      threadContext.map(c => `[${c.author}]: ${c.text}`).join('\n') +
      `\n\n`
    : '';

  const transcriptSection = videoTranscript
    ? `VIDEO TRANSCRIPT (auto-generated, may have minor errors):\n${videoTranscript}\n\n`
    : '';

  const userMessage =
    `MEMBER DATA:\n${userCtx}\n\n` +
    `VIDEO TITLE: ${videoTitle || '(unknown)'}\n` +
    transcriptSection +
    threadSection +
    `THE @ORACLE INVOCATION (from the TitanTrack member, posted ${threadContext && threadContext.length ? 'as a reply in the thread above' : 'as a top-level comment under the video'}):\n${question}\n\n` +
    `Write your reply. Open with 🜂. End with the line "— Oracle · Day ${streakDay} · TitanTrack" on its own line. 60-180 words. No em dashes in the body.`;

  const response = await anthropic.messages.create({
    model: ORACLE_MODEL,
    max_tokens: 600,
    system: [{ type: 'text', text: YT_SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
    messages: [{ role: 'user', content: userMessage }],
    stop_sequences: ['\nMEMBER DATA:', '\nUSER:', '\nIMPORTANT INSTRUCTION', '\nTHREAD CONTEXT:', '\nVIDEO TRANSCRIPT:']
  });

  const text = response.content?.[0]?.text?.trim();
  if (!text) throw new Error('Empty response from Claude');
  return text;
}

// ============================================================
// logRejection — write a YouTubeOracleReply row for a non-success
// ============================================================
async function logRejection({ member, commentId, videoId, videoTitle, questionText, responseText = '', tier, status, error }) {
  try {
    await YouTubeOracleReply.create({
      userId: member._id,
      username: member.username,
      parentCommentId: commentId,
      videoId,
      videoTitle: videoTitle || '',
      questionText: (questionText || '').slice(0, 2000),
      responseText: (responseText || '').slice(0, 4000),
      tier: tier || 'practitioner',
      status,
      errorMessage: error || ''
    });
  } catch (err) {
    // Duplicate-key on parentCommentId is fine — means we've already logged a result for this trigger
    if (err.code !== 11000) {
      console.error('Failed to log YouTubeOracleReply rejection:', err.message);
    }
  }
}

module.exports = {
  handleOracleMention,
  // Kill switch
  setRuntimeEnabled,
  isFeatureEnabled,
  // Exposed for tests / admin tools
  TIER_LIMITS,
  resolveTier,
  passesSubstanceFilter,
  passesOutputFilter,
};
