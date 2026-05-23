// server/services/oracleCorrelationEngine.js
// Cross-source triangulation for Oracle observations.
// Aggregates themes across Reddit, YouTube (own + niche), Discord, and in-app signals,
// and surfaces correlations that appear in 2+ sources at once.
//
// Output: ranked list of correlations, each with a WHITELIST of facts the LLM is
// allowed to cite. External sources (Reddit, YouTube) can be cited specifically
// (counts, quotes, titles). Internal sources (Discord ServerPulse, OracleInteraction,
// User streaks/benefits) get bucketed cohort language when fewer than 10 unique
// people are involved — that's the anonymization gate.
//
// The engine is read-only and side-effect-free. Cheap to call: pure DB queries.

const RedditPost = require('../models/RedditPost');
const YouTubeComment = require('../models/YouTubeComment');
const ServerPulse = require('../models/ServerPulse');
const OracleInteraction = require('../models/OracleInteraction');
const User = require('../models/User');
const { getLunarData } = require('../utils/lunarData');
const { detectTopics } = require('./oracleInsight');

const LOOKBACK_HOURS = 48;
const COHORT_BUCKET_THRESHOLD = 10; // Below this N, bucket the count instead of exposing it

// Themes too generic to ever count as a "correlation" — these are the baseline
// vocabulary of the entire community, so finding them across sources is meaningless.
// The whole subreddit talks about "retention" and "semen". That's not a signal.
const CORE_DOMAIN_NOISE = new Set([
  'retention', 'retain', 'semen', 'streak', 'nofap', 'celibacy', 'celiba',
  'practice', 'practitioner', 'community'
]);

// Existing low-signal noise carried over from oracleInsight getPulseStats
const GENERIC_NOISE = new Set([
  'day', 'week', 'month', 'low', 'why', 'fast', 'hard', 'nothing',
  'empty', 'dead', 'women', 'change', 'notice', 'strong', 'alive',
  'numb', 'meaning', 'pressure', 'dimension', 'vivid', 'sharp',
  '111', '222', '333', '444', '1111', 'breath', 'diet', 'god', 'pray'
]);

// Wisdom traditions Oracle can lean on for the "why" frame.
// Used by the repetition guard to force rotation across traditions.
const TRADITIONS = [
  'egyptian', 'taoist', 'vedic', 'hermetic', 'greek_orphic', 'christian_mystic',
  'tantric', 'scientific', 'jungian', 'stoic', 'sufi', 'kabbalistic', 'gnostic',
  'alchemical', 'shamanic'
];

/**
 * Reject a theme that's too generic to be a meaningful correlation signal.
 */
function isNoiseTheme(theme) {
  if (!theme || theme.length < 3) return true;
  if (CORE_DOMAIN_NOISE.has(theme)) return true;
  if (GENERIC_NOISE.has(theme)) return true;
  return false;
}

/**
 * Reject promotional / spam / link-only text from quote candidates.
 * Comments starting with emoji+URL patterns (Ross's pinned promos, other creators'
 * Amazon links, etc.) are not what we want to put in Oracle's mouth.
 */
function isPromoQuote(text) {
  if (!text) return true;
  const t = text.trim();
  if (t.length < 30) return true;
  // Common promo signatures
  if (/rossbased\.com|amazon\.com\/dp|patreon\.com|gumroad\.com|cashapp|venmo/i.test(t)) return true;
  if (/\b(subscribe|link in bio|check out my|free ebook|paperback|kindle|e-book|join my)/i.test(t)) return true;
  // Lines that lead with an emoji followed by promo-looking content
  if (/^[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(t) && /https?:\/\//i.test(t)) return true;
  // Too many emojis in opening 30 chars suggests promotional formatting
  const opener = t.substring(0, 30);
  const emojiCount = (opener.match(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu) || []).length;
  if (emojiCount >= 2) return true;
  return false;
}

/**
 * Clean a quote candidate for display: trim, collapse whitespace, strip surrounding quotes.
 */
function cleanQuote(text) {
  return (text || '').replace(/\s+/g, ' ').replace(/^["'""]+|["'""]+$/g, '').trim();
}

/**
 * Bucket a raw user count into cohort language so small-N data never gets quoted.
 * Returns the phrase Oracle is allowed to use.
 */
function bucketCohort(n) {
  if (n < COHORT_BUCKET_THRESHOLD) return 'a small group';
  if (n < 25) return 'a notable number';
  if (n < 100) return 'many';
  return 'a large share';
}

/**
 * Pull recent Reddit posts and extract themes.
 * Returns { themeMap: { theme: { count, topPosts, topQuotes } }, totalPosts, topPost }.
 */
async function collectRedditSignals(since) {
  const posts = await RedditPost.find({
    ingestedAt: { $gte: since },
    redditId: { $not: /^summary-/ }
  })
    .sort({ score: -1 })
    .limit(50)
    .lean();

  const themeMap = {};
  for (const post of posts) {
    const text = `${post.title} ${post.selftext || ''} ${(post.topComments || []).map(c => c.body).join(' ')}`;
    const themes = detectTopics(text).filter(t => !isNoiseTheme(t));
    for (const theme of themes) {
      if (!themeMap[theme]) themeMap[theme] = { count: 0, topPosts: [], topQuotes: [] };
      themeMap[theme].count += 1;
      if (themeMap[theme].topPosts.length < 3) {
        themeMap[theme].topPosts.push({ title: post.title, score: post.score, numComments: post.numComments });
      }
      // Grab a citable quote from the top comments — first non-promo one
      if (themeMap[theme].topQuotes.length < 3) {
        for (const c of (post.topComments || [])) {
          const candidate = cleanQuote(c.body || '').substring(0, 220);
          if (!isPromoQuote(candidate) && !themeMap[theme].topQuotes.includes(candidate)) {
            themeMap[theme].topQuotes.push(candidate);
            break;
          }
        }
      }
    }
  }

  return {
    themeMap,
    totalPosts: posts.length,
    topPost: posts[0] ? { title: posts[0].title, score: posts[0].score, numComments: posts[0].numComments } : null
  };
}

/**
 * Pull recent YouTube comments (own + niche separately) and extract themes.
 */
async function collectYouTubeSignals(since) {
  const comments = await YouTubeComment.find({ createdAt: { $gte: since } })
    .select('text topics source likeCount videoTitle')
    .lean();

  const own = { themeMap: {}, total: 0, topQuotes: [] };
  const niche = { themeMap: {}, total: 0, topQuotes: [] };

  for (const c of comments) {
    const bucket = c.source === 'own' ? own : niche;
    bucket.total += 1;
    const rawThemes = (c.topics && c.topics.length > 0) ? c.topics : detectTopics(c.text || '');
    const themes = rawThemes.filter(t => !isNoiseTheme(t));
    for (const theme of themes) {
      if (!bucket.themeMap[theme]) bucket.themeMap[theme] = { count: 0, quotes: [] };
      bucket.themeMap[theme].count += 1;
      if (bucket.themeMap[theme].quotes.length < 3) {
        const candidate = cleanQuote(c.text || '').substring(0, 220);
        if (!isPromoQuote(candidate) && !bucket.themeMap[theme].quotes.includes(candidate)) {
          bucket.themeMap[theme].quotes.push(candidate);
        }
      }
    }
  }

  return { own, niche };
}

/**
 * Pull recent Discord ServerPulse and aggregate themes with unique-author tracking.
 * Author counts are kept ONLY to drive the anonymization bucket — never exposed.
 */
async function collectDiscordSignals(since) {
  const obs = await ServerPulse.find({ createdAt: { $gte: since } })
    .select('content topics author')
    .lean();

  const themeMap = {};
  for (const o of obs) {
    for (const theme of (o.topics || [])) {
      if (isNoiseTheme(theme)) continue;
      if (!themeMap[theme]) themeMap[theme] = { count: 0, authors: new Set() };
      themeMap[theme].count += 1;
      if (o.author) themeMap[theme].authors.add(o.author);
    }
  }

  // Convert author sets to counts (we only ever expose the bucket downstream)
  const out = {};
  for (const [theme, data] of Object.entries(themeMap)) {
    out[theme] = { count: data.count, uniqueAuthors: data.authors.size };
  }

  return { themeMap: out, totalMessages: obs.length };
}

/**
 * Pull recent in-app Oracle conversations and aggregate themes.
 */
async function collectOracleConversationSignals(since) {
  const interactions = await OracleInteraction.find({
    timestamp: { $gte: since },
    username: { $not: /^(ross|rossbased)$/i }
  })
    .select('topics sentiment userId discordUserId')
    .lean();

  const themeMap = {};
  for (const i of interactions) {
    const uid = i.userId?.toString() || i.discordUserId || 'unknown';
    for (const theme of (i.topics || [])) {
      if (isNoiseTheme(theme)) continue;
      if (!themeMap[theme]) themeMap[theme] = { count: 0, users: new Set() };
      themeMap[theme].count += 1;
      themeMap[theme].users.add(uid);
    }
  }

  const out = {};
  for (const [theme, data] of Object.entries(themeMap)) {
    out[theme] = { count: data.count, uniqueUsers: data.users.size };
  }
  return { themeMap: out, totalInteractions: interactions.length };
}

/**
 * Compute streak distribution to surface "many of you are near day N" style observations.
 * Returns clusters with at least 5 users, bucketed by day-range.
 */
async function collectStreakClusters() {
  const users = await User.find({
    startDate: { $exists: true },
    username: { $not: /^(ross|rossbased)$/i }
  })
    .select('currentStreak')
    .lean();

  const ranges = [
    { label: 'first week (day 1-7)', min: 1, max: 7 },
    { label: 'second week (day 8-14)', min: 8, max: 14 },
    { label: 'three to four weeks (day 15-30)', min: 15, max: 30 },
    { label: 'one to two months (day 31-60)', min: 31, max: 60 },
    { label: 'two to three months (day 61-90)', min: 61, max: 90 },
    { label: 'past 100 days', min: 100, max: 99999 }
  ];

  const clusters = ranges.map(r => {
    const matched = users.filter(u => (u.currentStreak || 0) >= r.min && (u.currentStreak || 0) <= r.max);
    return { ...r, count: matched.length };
  }).filter(r => r.count >= 5);

  return clusters;
}

/**
 * Main entry — aggregate all sources, find themes that appear in 2+ sources,
 * and return ranked correlations with a fact whitelist for the LLM.
 */
async function findCorrelations(options = {}) {
  const lookbackHours = options.lookbackHours || LOOKBACK_HOURS;
  const since = new Date(Date.now() - lookbackHours * 60 * 60 * 1000);

  const [reddit, youtube, discord, oracleConv, streakClusters] = await Promise.all([
    collectRedditSignals(since).catch(() => ({ themeMap: {}, totalPosts: 0, topPost: null })),
    collectYouTubeSignals(since).catch(() => ({ own: { themeMap: {}, total: 0 }, niche: { themeMap: {}, total: 0 } })),
    collectDiscordSignals(since).catch(() => ({ themeMap: {}, totalMessages: 0 })),
    collectOracleConversationSignals(since).catch(() => ({ themeMap: {}, totalInteractions: 0 })),
    collectStreakClusters().catch(() => [])
  ]);

  // Union of all themes seen anywhere — final noise filter just in case
  const allThemes = new Set([
    ...Object.keys(reddit.themeMap),
    ...Object.keys(youtube.own.themeMap),
    ...Object.keys(youtube.niche.themeMap),
    ...Object.keys(discord.themeMap),
    ...Object.keys(oracleConv.themeMap)
  ]);

  const correlations = [];
  const globallyUsedQuotes = new Set(); // Dedupe quote citations across themes

  for (const theme of allThemes) {
    if (isNoiseTheme(theme)) continue;
    const presentIn = [];
    const whitelistedFacts = [];

    // Helper to pick the first unused quote from a list of candidates
    const pickQuote = (candidates) => {
      for (const q of (candidates || [])) {
        if (q && !globallyUsedQuotes.has(q)) {
          globallyUsedQuotes.add(q);
          return q;
        }
      }
      return null;
    };

    // Reddit — fully citable
    if (reddit.themeMap[theme]) {
      const r = reddit.themeMap[theme];
      presentIn.push('reddit');
      const titleHint = r.topPosts[0]?.title ? ` (top post: "${r.topPosts[0].title.substring(0, 90)}")` : '';
      whitelistedFacts.push({
        source: 'reddit',
        approvedPhrase: `the subreddit has been talking about ${theme} a lot lately${titleHint}`,
        rawCount: r.count,
        quote: pickQuote(r.topQuotes)
      });
    }

    // YouTube own — fully citable
    if (youtube.own.themeMap[theme]) {
      const y = youtube.own.themeMap[theme];
      presentIn.push('youtube_own');
      whitelistedFacts.push({
        source: 'youtube_own',
        approvedPhrase: `a lot of the comments on the channel lately are about ${theme}`,
        rawCount: y.count,
        quote: pickQuote(y.quotes)
      });
    }

    // YouTube niche — fully citable
    if (youtube.niche.themeMap[theme]) {
      const y = youtube.niche.themeMap[theme];
      presentIn.push('youtube_niche');
      whitelistedFacts.push({
        source: 'youtube_niche',
        approvedPhrase: `across other channels in this space, ${theme} keeps coming up`,
        rawCount: y.count,
        quote: pickQuote(y.quotes)
      });
    }

    // Discord — bucketed when low unique authors, otherwise still cohort-pluralized
    if (discord.themeMap[theme]) {
      const d = discord.themeMap[theme];
      presentIn.push('discord');
      const cohort = bucketCohort(d.uniqueAuthors);
      whitelistedFacts.push({
        source: 'discord',
        approvedPhrase: `in Discord, ${cohort} of you have been on ${theme} this week`,
        // never expose rawCount when uniqueAuthors small — only pass the bucket
        cohortBucket: cohort,
        rawCount: d.uniqueAuthors >= COHORT_BUCKET_THRESHOLD ? d.count : null
      });
    }

    // In-app Oracle conversations — bucketed when low unique users
    if (oracleConv.themeMap[theme]) {
      const o = oracleConv.themeMap[theme];
      presentIn.push('inapp');
      const cohort = bucketCohort(o.uniqueUsers);
      whitelistedFacts.push({
        source: 'inapp',
        approvedPhrase: `${cohort} of you have been asking about ${theme} lately`,
        cohortBucket: cohort,
        rawCount: null // never expose user-level counts from app
      });
    }

    // Only count it as a "correlation" if 2+ sources show the theme
    if (presentIn.length >= 2) {
      correlations.push({
        theme,
        sources: presentIn,
        whitelistedFacts,
        strength: scoreCorrelation(presentIn, whitelistedFacts)
      });
    }
  }

  // Sort by strength descending
  correlations.sort((a, b) => b.strength - a.strength);

  // Ambient context — always included, not tied to a specific theme
  let lunar = null;
  try { lunar = getLunarData(new Date()); } catch { /* ignore */ }

  return {
    correlations: correlations.slice(0, 5),
    streakClusters,
    lunar,
    totals: {
      reddit: reddit.totalPosts,
      discord: discord.totalMessages,
      youtubeOwn: youtube.own.total,
      youtubeNiche: youtube.niche.total,
      inapp: oracleConv.totalInteractions
    },
    redditTopPost: reddit.topPost,
    traditions: TRADITIONS
  };
}

/**
 * Score a correlation. More distinct sources = stronger. More raw mentions = stronger.
 */
function scoreCorrelation(sources, facts) {
  const sourceDiversity = Math.min(sources.length / 4, 1); // 4 sources = max
  const totalMentions = facts.reduce((sum, f) => sum + (f.rawCount || 0), 0);
  const mentionScore = Math.min(totalMentions / 30, 1); // 30 mentions across sources = max
  return Number((sourceDiversity * 0.7 + mentionScore * 0.3).toFixed(3));
}

/**
 * Render the correlation pack into a string block for the LLM system prompt.
 * This is the "fact whitelist" — the model can only cite from what appears here.
 */
function renderForPrompt(pack) {
  if (!pack || !pack.correlations || pack.correlations.length === 0) {
    return 'No cross-source correlations detected in the last 48 hours.';
  }

  const lines = [];
  lines.push('## CROSS-SOURCE CORRELATIONS (you may ONLY cite facts from this whitelist)');
  lines.push('');

  pack.correlations.forEach((c, idx) => {
    lines.push(`### Correlation ${idx + 1}: "${c.theme}" (appears in: ${c.sources.join(' + ')}, strength ${c.strength})`);
    for (const fact of c.whitelistedFacts) {
      lines.push(`- [${fact.source}] APPROVED PHRASE: "${fact.approvedPhrase}"`);
      if (fact.quote) lines.push(`  CITABLE QUOTE: "${fact.quote}"`);
      if (fact.rawCount !== null && fact.rawCount !== undefined) {
        lines.push(`  RAW COUNT (do NOT cite a specific number when source is discord/inapp): ${fact.rawCount}`);
      }
      if (fact.cohortBucket) {
        lines.push(`  COHORT BUCKET: "${fact.cohortBucket}" (use this phrasing, not a number)`);
      }
    }
    lines.push('');
  });

  if (pack.streakClusters && pack.streakClusters.length > 0) {
    lines.push('### Streak clusters right now (use cohort language, never the raw N):');
    for (const cluster of pack.streakClusters) {
      const bucket = bucketCohort(cluster.count);
      lines.push(`- ${bucket} of you are in the ${cluster.label}`);
    }
    lines.push('');
  }

  if (pack.lunar) {
    lines.push(`### Ambient: moon is ${pack.lunar.phase} (${pack.lunar.illumination}% illuminated)`);
  }

  if (pack.redditTopPost) {
    lines.push(`### Reddit top post this window: "${pack.redditTopPost.title}" (${pack.redditTopPost.score} upvotes, ${pack.redditTopPost.numComments} comments)`);
  }

  return lines.join('\n');
}

module.exports = {
  findCorrelations,
  renderForPrompt,
  bucketCohort,
  TRADITIONS,
  COHORT_BUCKET_THRESHOLD
};
