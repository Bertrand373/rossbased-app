// server/services/youtubeComments.js
// Fetches YouTube comments from:
//   1. Ross's own channel (for Community Pulse)
//   2. Niche-wide SR videos (for broader Oracle awareness)
// Runs on cron — every 6 hours for own channel, every 12 hours for niche
//
// YouTube Data API v3 quota: 10,000 units/day
// - search.list = 100 units per call
// - commentThreads.list = 1 unit per call
// - videos.list = 1 unit per call
// Budget: ~50 niche searches/day + unlimited comment fetches

const YouTubeComment = require('../models/YouTubeComment');

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
const YOUTUBE_CHANNEL_ID = process.env.YOUTUBE_CHANNEL_ID;
const BASE_URL = 'https://www.googleapis.com/youtube/v3';

// Niche search terms — rotated to stay under quota
const NICHE_SEARCH_TERMS = [
  'semen retention',
  'semen retention benefits',
  'semen retention flatline',
  'nofap transformation',
  'semen retention attraction',
  'semen retention energy',
  'semen retention spiritual',
  'celibacy benefits men',
  'brahmacharya benefits',
  'sexual transmutation'
];

/**
 * Fetch JSON from YouTube API
 */
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

// ============================================================
// FEATURE 1: Own Channel Comments
// Pulls comments from Ross's most recent videos
// ============================================================

async function fetchOwnChannelComments() {
  if (!YOUTUBE_API_KEY || !YOUTUBE_CHANNEL_ID) {
    console.log('⚠️ YouTube API key or channel ID not configured, skipping own channel fetch');
    return { fetched: 0, new: 0 };
  }

  try {
    // Step 1: Get the channel's recent videos (last 10)
    // Use search.list to find videos from the channel (100 units)
    const searchData = await ytFetch('search', {
      part: 'snippet',
      channelId: YOUTUBE_CHANNEL_ID,
      order: 'date',
      type: 'video',
      maxResults: '10'
    });

    const videoIds = (searchData.items || []).map(v => v.id.videoId).filter(Boolean);
    if (videoIds.length === 0) {
      console.log('📺 No videos found for own channel');
      return { fetched: 0, new: 0 };
    }

    // Step 2: Fetch comments for each video
    let totalFetched = 0;
    let totalNew = 0;

    for (const videoId of videoIds) {
      try {
        const result = await fetchCommentsForVideo(videoId, 'own');
        totalFetched += result.fetched;
        totalNew += result.new;
      } catch (err) {
        // Individual video failures are non-blocking
        console.error(`Comment fetch failed for video ${videoId}:`, err.message);
      }
    }

    console.log(`📺 Own channel: fetched ${totalFetched} comments, ${totalNew} new`);
    return { fetched: totalFetched, new: totalNew };

  } catch (err) {
    console.error('fetchOwnChannelComments error:', err.message);
    return { fetched: 0, new: 0, error: err.message };
  }
}

// ============================================================
// FEATURE 2: Niche-Wide Comment Mining
// Searches for SR-related videos and pulls their comments
// ============================================================

async function fetchNicheComments() {
  if (!YOUTUBE_API_KEY) {
    console.log('⚠️ YouTube API key not configured, skipping niche fetch');
    return { fetched: 0, new: 0 };
  }

  try {
    // Pick 2 random search terms per run (200 quota units for searches)
    const shuffled = [...NICHE_SEARCH_TERMS].sort(() => Math.random() - 0.5);
    const terms = shuffled.slice(0, 2);

    let totalFetched = 0;
    let totalNew = 0;

    for (const term of terms) {
      try {
        // Search for recent videos (last 7 days) on this topic
        const publishedAfter = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

        const searchData = await ytFetch('search', {
          part: 'snippet',
          q: term,
          type: 'video',
          order: 'relevance',
          publishedAfter,
          maxResults: '5',
          relevanceLanguage: 'en'
        });

        const videos = (searchData.items || []).filter(v => {
          // Skip our own channel (we already fetch those)
          return v.snippet?.channelId !== YOUTUBE_CHANNEL_ID;
        });

        for (const video of videos) {
          try {
            const result = await fetchCommentsForVideo(video.id.videoId, 'niche', {
              channelId: video.snippet.channelId,
              channelTitle: video.snippet.channelTitle,
              videoTitle: video.snippet.title
            });
            totalFetched += result.fetched;
            totalNew += result.new;
          } catch (err) {
            // Individual video failures are non-blocking
            console.error(`Niche comment fetch failed for ${video.id.videoId}:`, err.message);
          }
        }
      } catch (err) {
        console.error(`Niche search failed for "${term}":`, err.message);
      }
    }

    console.log(`🌐 Niche mining: fetched ${totalFetched} comments, ${totalNew} new (terms: ${terms.join(', ')})`);
    return { fetched: totalFetched, new: totalNew, terms };

  } catch (err) {
    console.error('fetchNicheComments error:', err.message);
    return { fetched: 0, new: 0, error: err.message };
  }
}

// ============================================================
// SHARED: Fetch comments for a single video
// ============================================================

async function fetchCommentsForVideo(videoId, source, meta = {}) {
  // Get top-level comment threads (1 quota unit per call)
  const data = await ytFetch('commentThreads', {
    part: 'snippet',
    videoId,
    order: 'relevance',
    maxResults: '50',
    textFormat: 'plainText'
  });

  const threads = data.items || [];
  let fetched = 0;
  let newCount = 0;

  const bulkOps = [];

  for (const thread of threads) {
    const comment = thread.snippet?.topLevelComment?.snippet;
    if (!comment) continue;

    // Skip very short comments (less useful for pattern detection)
    if (comment.textDisplay.length < 15) continue;

    fetched++;

    bulkOps.push({
      updateOne: {
        filter: { commentId: thread.snippet.topLevelComment.id },
        update: {
          $setOnInsert: {
            commentId: thread.snippet.topLevelComment.id,
            text: comment.textDisplay.substring(0, 1000), // cap at 1000 chars
            authorName: comment.authorDisplayName || '',
            videoId,
            videoTitle: meta.videoTitle || comment.videoId || '',
            channelId: meta.channelId || comment.channelId || YOUTUBE_CHANNEL_ID,
            channelTitle: meta.channelTitle || '',
            source,
            likeCount: comment.likeCount || 0,
            publishedAt: new Date(comment.publishedAt),
            pipelineProcessed: false,
            topics: []
          }
        },
        upsert: true
      }
    });
  }

  if (bulkOps.length > 0) {
    const result = await YouTubeComment.bulkWrite(bulkOps, { ordered: false });
    newCount = result.upsertedCount || 0;
  }

  return { fetched, new: newCount };
}

// ============================================================
// COMBINED: Run both fetches (called by cron)
// ============================================================

async function runYouTubeFetch() {
  console.log('📺 Starting YouTube comment fetch...');
  const own = await fetchOwnChannelComments();
  const niche = await fetchNicheComments();

  return {
    own,
    niche,
    timestamp: new Date().toISOString()
  };
}

// ============================================================
// QUERY HELPERS: For Community Pulse and Content Pipeline
// ============================================================

/**
 * Get recent comments from own channel (for Community Pulse)
 * Returns plain text lines, anonymized, similar to ServerPulse format
 */
async function getRecentOwnComments(hours = 48) {
  const since = new Date(Date.now() - hours * 60 * 60 * 1000);
  const comments = await YouTubeComment.find({
    source: 'own',
    createdAt: { $gte: since }
  })
    .select('text videoTitle publishedAt')
    .sort({ publishedAt: -1 })
    .limit(50)
    .lean();

  return comments;
}

/**
 * Get recent niche comments (for broader Oracle awareness)
 */
async function getRecentNicheComments(hours = 48) {
  const since = new Date(Date.now() - hours * 60 * 60 * 1000);
  const comments = await YouTubeComment.find({
    source: 'niche',
    createdAt: { $gte: since }
  })
    .select('text videoTitle channelTitle publishedAt')
    .sort({ publishedAt: -1 })
    .limit(100)
    .lean();

  return comments;
}

/**
 * Get unprocessed comments for the content pipeline
 */
async function getUnprocessedComments(limit = 200) {
  const comments = await YouTubeComment.find({
    pipelineProcessed: false
  })
    .select('text source videoTitle likeCount publishedAt')
    .sort({ likeCount: -1, publishedAt: -1 })
    .limit(limit)
    .lean();

  return comments;
}

/**
 * Mark comments as processed by the content pipeline
 */
async function markCommentsProcessed(commentIds) {
  await YouTubeComment.updateMany(
    { _id: { $in: commentIds } },
    { $set: { pipelineProcessed: true } }
  );
}

/**
 * Get stats for admin dashboard
 */
async function getYouTubeStats() {
  const now = new Date();
  const oneDayAgo = new Date(now - 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);

  const [total, own, niche, last24h, last7d] = await Promise.all([
    YouTubeComment.countDocuments({}),
    YouTubeComment.countDocuments({ source: 'own' }),
    YouTubeComment.countDocuments({ source: 'niche' }),
    YouTubeComment.countDocuments({ createdAt: { $gte: oneDayAgo } }),
    YouTubeComment.countDocuments({ createdAt: { $gte: sevenDaysAgo } })
  ]);

  return { total, own, niche, last24h, last7d };
}

module.exports = {
  fetchOwnChannelComments,
  fetchNicheComments,
  runYouTubeFetch,
  getRecentOwnComments,
  getRecentNicheComments,
  getUnprocessedComments,
  markCommentsProcessed,
  getYouTubeStats
};
