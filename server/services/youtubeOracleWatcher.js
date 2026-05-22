// server/services/youtubeOracleWatcher.js
//
// Polls Ross's recent videos for new @oracle mentions and dispatches them
// into the oracleYouTubeReply pipeline.
//
// Cadence:
//   - Top 3 most recent videos: every 2 min
//   - Videos 4-5: every 15 min
//   - Video list refreshed every 30 min via search.list
//
// Detects @oracle in BOTH top-level comments AND replies. When @oracle is
// posted as a reply, builds thread context (parent + earlier replies) so
// Oracle can answer the conversation it's joining, not just the one reply.
//
// Quota math (YouTube Data API v3, 10K units/day default):
//   - commentThreads.list with replies = 1 unit per poll
//   - comments.list for full reply chain when thread > 5 replies = 1 unit per long thread
//   - search.list for video list refresh = 100 units, ~48/day = 4,800/day
//   - Posting = 50 units * ~13/day = 650/day
//   Total: ~7,800/day worst case. Fits under 10K.

const User = require('../models/User');
const YouTubeOracleReply = require('../models/YouTubeOracleReply');
const { handleOracleMention } = require('./oracleYouTubeReply');

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
const YOUTUBE_CHANNEL_ID = process.env.YOUTUBE_CHANNEL_ID;        // Ross's channel
const ORACLE_CHANNEL_ID = process.env.ORACLE_CHANNEL_ID || '';    // Oracle's channel — used to skip its own prior replies in thread context
const BASE_URL = 'https://www.googleapis.com/youtube/v3';

// In-memory cache of Ross's recent video IDs + titles. Refreshed periodically.
let cachedVideos = [];   // [{ videoId, title, publishedAt }]
let videosLastRefreshed = 0;
const VIDEO_LIST_TTL_MS = 30 * 60 * 1000;  // 30 min

// Dedup short-term cache so we don't re-attempt the same comment IDs within a run cycle
// YouTubeOracleReply has a unique index on parentCommentId for cross-run dedup.
const recentlyChecked = new Set();
const RECENT_CACHE_MAX = 2000;

async function ytFetch(endpoint, params) {
  const url = new URL(`${BASE_URL}/${endpoint}`);
  url.searchParams.set('key', YOUTUBE_API_KEY);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }
  const res = await fetch(url.toString());
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`YouTube API ${endpoint} failed (${res.status}): ${err}`);
  }
  return res.json();
}

async function refreshVideoList() {
  if (!YOUTUBE_API_KEY || !YOUTUBE_CHANNEL_ID) {
    console.log('⚠️ YouTube Oracle watcher: API key or channel ID missing — skipping refresh');
    return;
  }
  try {
    const data = await ytFetch('search', {
      part: 'snippet',
      channelId: YOUTUBE_CHANNEL_ID,
      order: 'date',
      type: 'video',
      maxResults: '5'
    });
    cachedVideos = (data.items || [])
      .map(v => ({
        videoId: v.id?.videoId,
        title: v.snippet?.title || '',
        publishedAt: v.snippet?.publishedAt
      }))
      .filter(v => !!v.videoId);
    videosLastRefreshed = Date.now();
    console.log(`📺 Oracle watcher: refreshed video list (${cachedVideos.length} videos)`);
  } catch (err) {
    console.error('Oracle watcher: refreshVideoList failed:', err.message);
  }
}

function rememberChecked(commentId) {
  recentlyChecked.add(commentId);
  if (recentlyChecked.size > RECENT_CACHE_MAX) {
    const toDrop = Math.floor(RECENT_CACHE_MAX * 0.25);
    let i = 0;
    for (const key of recentlyChecked) {
      recentlyChecked.delete(key);
      if (++i >= toDrop) break;
    }
  }
}

function getAuthorChannelId(commentSnippet) {
  return commentSnippet?.authorChannelId?.value
    || (typeof commentSnippet?.authorChannelId === 'string' ? commentSnippet.authorChannelId : null);
}

function hasOracleMention(text) {
  if (!text) return false;
  return /@oracle\b/i.test(text);
}

// ============================================================
// Fetch ALL replies for a thread (when totalReplyCount > inline 5)
// Returns array of {id, snippet}
// ============================================================
async function fetchAllReplies(parentCommentId) {
  try {
    const data = await ytFetch('comments', {
      part: 'snippet',
      parentId: parentCommentId,
      maxResults: '100',
      textFormat: 'plainText'
    });
    return data.items || [];
  } catch (err) {
    console.error(`Oracle watcher: fetchAllReplies failed for ${parentCommentId}:`, err.message);
    return [];
  }
}

// ============================================================
// Build thread context for an @oracle reply
// Returns array of {author, text} chronological, oldest first, capped.
// ============================================================
async function buildThreadContext(parentTopLevel, parentCommentId, inlineReplies, atOracleReply) {
  const items = [];
  const atOraclePublishedAt = new Date(atOracleReply.snippet?.publishedAt || Date.now()).getTime();

  // Always include the top-level comment as first context item (the conversation root)
  if (parentTopLevel?.snippet) {
    items.push({
      author: parentTopLevel.snippet.authorDisplayName || 'commenter',
      text: parentTopLevel.snippet.textDisplay || parentTopLevel.snippet.textOriginal || '',
      authorChannelId: getAuthorChannelId(parentTopLevel.snippet),
      publishedAt: new Date(parentTopLevel.snippet.publishedAt || 0).getTime(),
    });
  }

  // Decide whether we need to fetch all replies or whether the inline ones cover us.
  // commentThreads.list inline replies are typically capped at 5. If the thread is
  // longer, fetch the full list to catch older replies that gave context.
  const totalReplyCount = parentTopLevel?.snippet?.totalReplyCount
    ?? (inlineReplies ? inlineReplies.length : 0);
  let replies = inlineReplies || [];
  if (totalReplyCount > replies.length) {
    replies = await fetchAllReplies(parentCommentId);
  }

  for (const reply of replies) {
    if (!reply?.snippet) continue;
    if (reply.id === atOracleReply.id) continue;  // skip the @oracle invocation itself
    items.push({
      author: reply.snippet.authorDisplayName || 'commenter',
      text: reply.snippet.textDisplay || reply.snippet.textOriginal || '',
      authorChannelId: getAuthorChannelId(reply.snippet),
      publishedAt: new Date(reply.snippet.publishedAt || 0).getTime(),
    });
  }

  // Filter: only comments before the @oracle invocation
  // Filter: skip Oracle's own prior replies in this thread
  // Filter: skip very short / non-textual noise
  const filtered = items.filter(item => {
    if (item.publishedAt >= atOraclePublishedAt) return false;
    if (ORACLE_CHANNEL_ID && item.authorChannelId === ORACLE_CHANNEL_ID) return false;
    const clean = (item.text || '').trim();
    if (clean.length < 10) return false;
    const letterCount = (clean.match(/[a-zA-Z]/g) || []).length;
    if (letterCount / clean.length < 0.4) return false;
    return true;
  });

  // Chronological: oldest first
  filtered.sort((a, b) => a.publishedAt - b.publishedAt);

  // Cap: 10 comments max, 500 chars each, 2500 chars total
  const MAX_ITEMS = 10;
  const MAX_CHARS_PER_ITEM = 500;
  const MAX_TOTAL_CHARS = 2500;
  const result = [];
  let totalChars = 0;
  for (const item of filtered.slice(0, MAX_ITEMS)) {
    let text = item.text;
    if (text.length > MAX_CHARS_PER_ITEM) text = text.slice(0, MAX_CHARS_PER_ITEM) + '…';
    if (totalChars + text.length > MAX_TOTAL_CHARS) break;
    result.push({ author: item.author, text });
    totalChars += text.length;
  }
  return result;
}

// ============================================================
// Process one video's comments — finds new @oracle mentions in both
// top-level comments AND replies, dispatches each into the pipeline.
// ============================================================
async function processVideoForOracleMentions(video) {
  if (!video || !video.videoId) return { checked: 0, dispatched: 0 };

  let data;
  try {
    data = await ytFetch('commentThreads', {
      part: 'snippet,replies',
      videoId: video.videoId,
      order: 'time',
      maxResults: '50',
      textFormat: 'plainText'
    });
  } catch (err) {
    console.error(`Oracle watcher: commentThreads failed for ${video.videoId}:`, err.message);
    return { checked: 0, dispatched: 0, error: err.message };
  }

  const threads = data.items || [];
  let checked = 0;
  let dispatched = 0;

  for (const thread of threads) {
    const topLevel = thread.snippet?.topLevelComment;
    const topLevelId = topLevel?.id;
    const topLevelSnippet = topLevel?.snippet;
    if (!topLevelSnippet || !topLevelId) continue;

    const inlineReplies = thread.replies?.comments || [];

    // 1) Check the top-level comment for @oracle
    if (!recentlyChecked.has(topLevelId)) {
      checked++;
      rememberChecked(topLevelId);
      const topLevelText = topLevelSnippet.textDisplay || topLevelSnippet.textOriginal || '';
      if (hasOracleMention(topLevelText)) {
        const handled = await YouTubeOracleReply.exists({ parentCommentId: topLevelId });
        if (!handled) {
          await dispatchMention({
            commentId: topLevelId,
            commentSnippet: topLevelSnippet,
            video,
            threadContext: [],   // top-level mention has no thread context
          }).then(r => { if (r) dispatched++; });
        }
      }
    }

    // 2) Check each reply for @oracle
    //    The inline replies from commentThreads.list return at most 5 replies
    //    (historically oldest-first). When a thread has more replies, we must
    //    fetch the full list — otherwise newer @oracle reply mentions in position
    //    6+ are invisible to the watcher.
    //
    //    Two triggers to fetch the full list:
    //      a) totalReplyCount > inlineReplies.length (API-reported overflow), or
    //      b) inlineReplies.length >= 5 (max inline size — there COULD be more;
    //         totalReplyCount is sometimes cached stale by YouTube so we can't
    //         rely on it alone)
    const inlineCount = inlineReplies.length;
    const totalReplyCount = thread.snippet?.totalReplyCount || inlineCount;
    let repliesToScan = inlineReplies;
    if (totalReplyCount > inlineCount || inlineCount >= 5) {
      const fullReplies = await fetchAllReplies(topLevelId);
      if (fullReplies && fullReplies.length > 0) {
        repliesToScan = fullReplies;
        if (fullReplies.length > inlineCount) {
          console.log(`🔍 Oracle watcher: thread ${topLevelId} on "${video.title}" — fetched ${fullReplies.length} replies (inline=${inlineCount}, totalReplyCount=${totalReplyCount})`);
        }
      }
    }

    for (const reply of repliesToScan) {
      if (!reply?.id) continue;
      if (recentlyChecked.has(reply.id)) continue;
      checked++;
      rememberChecked(reply.id);
      const replyText = reply.snippet?.textDisplay || reply.snippet?.textOriginal || '';
      if (!hasOracleMention(replyText)) continue;

      // Diagnostic log every time @oracle is detected — proves regex matched and
      // surfaces author info so we can debug member-match failures
      const authorChannelId = getAuthorChannelId(reply.snippet);
      const authorName = reply.snippet?.authorDisplayName || '(unknown)';
      console.log(`🜂 Oracle: @oracle detected in reply ${reply.id} by ${authorName} (channelId=${authorChannelId || 'NONE'}) — "${replyText.slice(0, 80)}"`);

      const handled = await YouTubeOracleReply.exists({ parentCommentId: reply.id });
      if (handled) {
        console.log(`🜂 Oracle: reply ${reply.id} already handled — skipping`);
        continue;
      }

      const threadContext = await buildThreadContext(topLevel, topLevelId, repliesToScan, reply);
      const dispatched1 = await dispatchMention({
        commentId: reply.id,
        commentSnippet: reply.snippet,
        video,
        threadContext,
      });
      if (dispatched1) dispatched++;
      else {
        console.log(`🜂 Oracle: dispatch returned false for reply ${reply.id} by ${authorName} (no member match or error)`);
      }
    }
  }

  return { checked, dispatched };
}

async function dispatchMention({ commentId, commentSnippet, video, threadContext }) {
  const authorChannelId = getAuthorChannelId(commentSnippet);
  if (!authorChannelId) return false;

  const member = await User.findOne({ youtubeChannelId: authorChannelId });
  if (!member) {
    // Non-member or unlinked. Silent skip — the mystery does the marketing.
    return false;
  }

  try {
    const result = await handleOracleMention({
      commentId,
      videoId: video.videoId,
      videoTitle: video.title,
      questionText: commentSnippet.textDisplay || commentSnippet.textOriginal || '',
      threadContext: threadContext || [],
      member
    });
    if (result.ok) {
      console.log(`🜂 Oracle replied to ${member.username} on "${video.title}" (tier=${result.tier})`);
      return true;
    } else if (result.reason) {
      console.log(`🜂 Oracle skipped reply to ${member.username} (${result.reason})`);
    }
    return false;
  } catch (err) {
    console.error(`Oracle watcher: dispatch failed for ${member.username}:`, err.message);
    return false;
  }
}

// ============================================================
// Public entrypoints — invoked by cron in app.js
// ============================================================

async function pollHotVideos() {
  if (!YOUTUBE_API_KEY || !YOUTUBE_CHANNEL_ID) return;
  if (Date.now() - videosLastRefreshed > VIDEO_LIST_TTL_MS) {
    await refreshVideoList();
  }
  const hot = cachedVideos.slice(0, 3);
  let totalDispatched = 0;
  for (const v of hot) {
    const result = await processVideoForOracleMentions(v);
    totalDispatched += result.dispatched || 0;
  }
  if (totalDispatched > 0) {
    console.log(`🜂 Oracle watcher (hot): dispatched ${totalDispatched} mention(s)`);
  }
}

async function pollColdVideos() {
  if (!YOUTUBE_API_KEY || !YOUTUBE_CHANNEL_ID) return;
  if (Date.now() - videosLastRefreshed > VIDEO_LIST_TTL_MS) {
    await refreshVideoList();
  }
  const cold = cachedVideos.slice(3, 5);
  let totalDispatched = 0;
  for (const v of cold) {
    const result = await processVideoForOracleMentions(v);
    totalDispatched += result.dispatched || 0;
  }
  if (totalDispatched > 0) {
    console.log(`🜂 Oracle watcher (cold): dispatched ${totalDispatched} mention(s)`);
  }
}

module.exports = {
  pollHotVideos,
  pollColdVideos,
  refreshVideoList,
  // Exposed for testing / admin tools
  processVideoForOracleMentions,
  buildThreadContext,
};
