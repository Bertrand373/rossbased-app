// server/services/youtubeTranscript.js
//
// Fetches auto-generated transcripts for YouTube videos so Oracle can
// answer questions about the actual content of Ross's videos, not just
// guess from the title.
//
// Uses the `youtube-transcript` package, which pulls the timedtext
// caption track. No OAuth or API key needed — just public captions.
// Auto-generated captions exist on almost every YouTube video.
//
// 24h in-memory cache keyed by videoId. Videos don't change, so 24h
// is plenty. Cache survives process life; refetches on restart.

const { YoutubeTranscript } = require('youtube-transcript');

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;          // 24h
const MAX_TRANSCRIPT_CHARS = 5000;                  // ~1.25K tokens, covers ~10 min of speech
const NEGATIVE_CACHE_TTL_MS = 60 * 60 * 1000;       // 1h for failed fetches — don't retry on every poll
const CACHE_MAX_ENTRIES = 200;                      // bounded LRU-ish

const cache = new Map();   // videoId → { text: string|null, fetchedAt: number, error?: string }

function pruneCache() {
  if (cache.size <= CACHE_MAX_ENTRIES) return;
  // Map iterates insertion order; drop the oldest 25% to amortize prune cost
  const dropCount = Math.floor(CACHE_MAX_ENTRIES * 0.25);
  let i = 0;
  for (const key of cache.keys()) {
    cache.delete(key);
    if (++i >= dropCount) break;
  }
}

function getCached(videoId) {
  const entry = cache.get(videoId);
  if (!entry) return null;
  const ttl = entry.text ? CACHE_TTL_MS : NEGATIVE_CACHE_TTL_MS;
  if (Date.now() - entry.fetchedAt > ttl) {
    cache.delete(videoId);
    return null;
  }
  return entry;
}

// ============================================================
// getTranscript(videoId)
// Returns the transcript text (truncated to MAX_TRANSCRIPT_CHARS) or null
// if not available. Never throws — failures are silently cached.
// ============================================================
async function getTranscript(videoId) {
  if (!videoId) return null;

  const cached = getCached(videoId);
  if (cached) return cached.text;

  try {
    const segments = await YoutubeTranscript.fetchTranscript(videoId);
    if (!segments || segments.length === 0) {
      cache.set(videoId, { text: null, fetchedAt: Date.now(), error: 'empty_transcript' });
      pruneCache();
      return null;
    }

    // Join segment texts. Each segment is { text, duration, offset }.
    // Strip music markers like [♪♪♪] and HTML entities that the package leaves behind.
    const rawText = segments
      .map(s => s.text || '')
      .join(' ')
      .replace(/\[♪+\]/g, '')
      .replace(/&amp;/g, '&')
      .replace(/&#39;/g, "'")
      .replace(/&quot;/g, '"')
      .replace(/\s+/g, ' ')
      .trim();

    const truncated = rawText.length > MAX_TRANSCRIPT_CHARS
      ? rawText.slice(0, MAX_TRANSCRIPT_CHARS) + '…'
      : rawText;

    cache.set(videoId, { text: truncated, fetchedAt: Date.now() });
    pruneCache();
    return truncated;
  } catch (err) {
    // Many videos don't have captions, or the timedtext endpoint refuses for various reasons.
    // Treat as a soft miss — Oracle answers from title + member data only.
    cache.set(videoId, { text: null, fetchedAt: Date.now(), error: err.message });
    pruneCache();
    return null;
  }
}

// ============================================================
// invalidate(videoId)
// Force a refetch on next call. Useful from admin tools.
// ============================================================
function invalidate(videoId) {
  if (videoId) cache.delete(videoId);
}

module.exports = {
  getTranscript,
  invalidate,
};
