// server/services/oracleYouTubePoster.js
// Posts comment replies to YouTube from the dedicated Oracle channel.
//
// One-time setup: run `node scripts/setup-oracle-youtube-oauth.js` while
// logged into the Oracle Google account to capture a refresh token. Store
// it in ORACLE_YT_REFRESH_TOKEN env var on Render. After that, this module
// handles all the access-token refreshing on its own.
//
// Required env vars:
//   ORACLE_YT_CLIENT_ID
//   ORACLE_YT_CLIENT_SECRET
//   ORACLE_YT_REFRESH_TOKEN

const CLIENT_ID = process.env.ORACLE_YT_CLIENT_ID;
const CLIENT_SECRET = process.env.ORACLE_YT_CLIENT_SECRET;
const REFRESH_TOKEN = process.env.ORACLE_YT_REFRESH_TOKEN;

// Cache the access token — Google returns one good for 1h, refresh ~5 min early
let cachedToken = null;
let cachedTokenExpiresAt = 0;

async function getAccessToken() {
  if (!CLIENT_ID || !CLIENT_SECRET || !REFRESH_TOKEN) {
    throw new Error('Oracle YouTube OAuth not configured — missing ORACLE_YT_* env vars');
  }

  const now = Date.now();
  if (cachedToken && now < cachedTokenExpiresAt - 5 * 60 * 1000) {
    return cachedToken;
  }

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      refresh_token: REFRESH_TOKEN,
      grant_type: 'refresh_token'
    })
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Oracle YouTube token refresh failed (${res.status}): ${err}`);
  }

  const data = await res.json();
  if (!data.access_token) {
    throw new Error('Oracle YouTube token refresh returned no access_token');
  }

  cachedToken = data.access_token;
  cachedTokenExpiresAt = now + (data.expires_in || 3600) * 1000;
  return cachedToken;
}

// ============================================================
// POST: Reply to a comment
// Uses comments.insert (50 quota units per call)
// ============================================================
async function postReply(parentCommentId, text) {
  if (!parentCommentId || !text) {
    throw new Error('postReply requires parentCommentId and text');
  }

  const token = await getAccessToken();

  const res = await fetch(
    'https://www.googleapis.com/youtube/v3/comments?part=snippet',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        snippet: {
          parentId: parentCommentId,
          textOriginal: text
        }
      })
    }
  );

  if (!res.ok) {
    const errBody = await res.text();
    const err = new Error(`YouTube reply failed (${res.status}): ${errBody}`);
    err.status = res.status;
    err.body = errBody;
    throw err;
  }

  const data = await res.json();
  return {
    id: data.id,
    publishedAt: data.snippet?.publishedAt,
    raw: data
  };
}

// ============================================================
// DELETE: Remove a reply Oracle posted
// Used by admin kill switch / per-reply moderation
// ============================================================
async function deleteReply(commentId) {
  if (!commentId) throw new Error('deleteReply requires commentId');

  const token = await getAccessToken();

  const res = await fetch(
    `https://www.googleapis.com/youtube/v3/comments?id=${encodeURIComponent(commentId)}`,
    {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    }
  );

  if (!res.ok && res.status !== 204) {
    const errBody = await res.text();
    throw new Error(`YouTube delete failed (${res.status}): ${errBody}`);
  }

  return { success: true };
}

// ============================================================
// VERIFY: Is the Oracle account configured + can it auth?
// Lightweight check used by admin dashboard.
// ============================================================
async function verifyOracleAuth() {
  try {
    if (!CLIENT_ID || !CLIENT_SECRET || !REFRESH_TOKEN) {
      return { ok: false, reason: 'Missing env vars' };
    }
    await getAccessToken();
    return { ok: true };
  } catch (err) {
    return { ok: false, reason: err.message };
  }
}

module.exports = {
  postReply,
  deleteReply,
  verifyOracleAuth,
  getAccessToken  // exposed for testing
};
