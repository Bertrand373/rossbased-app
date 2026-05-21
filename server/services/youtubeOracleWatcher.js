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
// Quota math (YouTube Data API v3, 10K units/day default):
//   - commentThreads.list = 1 unit each. 3 vids * 30/h + 2 vids * 4/h = 2,352/day
//   - search.list for video list refresh = 100 units, ~48/day = 4,800/day
//   - That's the worst case. With caching, search refreshes can be lazy.
//   - Posting = 50 units * ~13/day = 650/day
//   Total: ~7,800/day worst case. Fits under 10K.

const User = require('../models/User');
const YouTubeOracleReply = require('../models/YouTubeOracleReply');
const { handleOracleMention } = require('./oracleYouTubeReply');

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
const YOUTUBE_CHANNEL_ID = process.env.YOUTUBE_CHANNEL_ID;
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
    // Drop the oldest ~25%. Set order preserves insertion, so iterate first N.
    const toDrop = Math.floor(RECENT_CACHE_MAX * 0.25);
    let i = 0;
    for (const key of recentlyChecked) {
      recentlyChecked.delete(key);
      if (++i >= toDrop) break;
    }
  }
}

// ============================================================
// Process one video's comments — finds new @oracle mentions
// ============================================================
async function processVideoForOracleMentions(video) {
  if (!video || !video.videoId) return { checked: 0, dispatched: 0 };

  let data;
  try {
    data = await ytFetch('commentThreads', {
      part: 'snippet',
      videoId: video.videoId,
      order: 'time',          // newest first — we want fresh @oracle mentions fast
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
    const comment = thread.snippet?.topLevelComment?.snippet;
    const commentId = thread.snippet?.topLevelComment?.id;
    if (!comment || !commentId) continue;
    if (recentlyChecked.has(commentId)) continue;

    checked++;
    rememberChecked(commentId);

    // Fast text check — no API call for non-matches
    const text = comment.textDisplay || comment.textOriginal || '';
    if (!/@oracle\b/i.test(text)) continue;

    // Already-handled check via DB (survives restarts)
    const alreadyHandled = await YouTubeOracleReply.exists({ parentCommentId: commentId });
    if (alreadyHandled) continue;

    // Match the commenter to a TitanTrack user
    const authorChannelId = comment.authorChannelId?.value
      || (typeof comment.authorChannelId === 'string' ? comment.authorChannelId : null);
    if (!authorChannelId) continue;

    const member = await User.findOne({ youtubeChannelId: authorChannelId });
    if (!member) {
      // Non-member or unlinked member — silently skip (the mystery does the marketing)
      continue;
    }

    // Dispatch into the Oracle reply pipeline
    try {
      const result = await handleOracleMention({
        commentId,
        videoId: video.videoId,
        videoTitle: video.title,
        videoTranscriptSnippet: '',  // v0: no transcript fetching yet
        questionText: text,
        member
      });
      dispatched++;
      if (result.ok) {
        console.log(`🜂 Oracle replied to ${member.username} on "${video.title}" (tier=${result.tier})`);
      } else if (result.reason) {
        console.log(`🜂 Oracle skipped reply to ${member.username} (${result.reason})`);
      }
    } catch (err) {
      console.error(`Oracle watcher: dispatch failed for ${member.username}:`, err.message);
    }
  }

  return { checked, dispatched };
}

// ============================================================
// Public entrypoints — invoked by cron in app.js
// ============================================================

// Frequent poll: top 3 videos
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

// Slower poll: videos 4-5
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
};
