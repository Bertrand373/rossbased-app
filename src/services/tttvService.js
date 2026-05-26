// src/services/tttvService.js
//
// Thin fetch wrapper around /api/tttv/* endpoints. Used by AdminTV today;
// PR #3 will add a listFeed() call here for the public viewer too.
//
// Matches the codebase's existing auth pattern: read the JWT from
// localStorage and pass as Bearer. The API base falls back to the prod
// origin so dev-from-prod-token still works.

const API_BASE =
  process.env.REACT_APP_API_URL || 'https://rossbased-app.onrender.com';

function authHeaders(extra = {}) {
  const token = localStorage.getItem('token');
  return {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extra
  };
}

async function handle(res) {
  if (res.ok) return res.json();
  let detail = '';
  try {
    const j = await res.json();
    detail = j.error || j.message || '';
  } catch {
    /* non-JSON error body */
  }
  throw new Error(detail || `Request failed (${res.status})`);
}

/**
 * List all videos (admin view — includes unpublished drafts).
 */
export async function listAllVideos() {
  const res = await fetch(`${API_BASE}/api/tttv/videos`, {
    headers: authHeaders()
  });
  return handle(res);
}

/**
 * List published videos (member feed).
 */
export async function listFeed() {
  const res = await fetch(`${API_BASE}/api/tttv/feed`, {
    headers: authHeaders()
  });
  return handle(res);
}

/**
 * Upload a new episode. Pass the raw File for video, an optional Blob/File
 * for poster (auto-generated from first frame on the client), plus form
 * fields. Returns the created doc.
 */
export async function uploadVideo({
  videoFile,
  posterBlob,
  title,
  durationSec,
  oracleOverlayText,
  oracleOverlayAt,
  episode,
  isPublished
}) {
  const formData = new FormData();
  formData.append('video', videoFile);
  if (posterBlob) {
    // Posters get a stable .jpg filename so the server's extension-based
    // routing (and Storage caching) behaves predictably.
    formData.append('poster', posterBlob, 'poster.jpg');
  }
  formData.append('title', title || 'Untitled');
  formData.append('durationSec', String(durationSec || 0));
  formData.append('oracleOverlayText', oracleOverlayText || '');
  formData.append('oracleOverlayAt', String(oracleOverlayAt || 0));
  if (episode) formData.append('episode', String(episode));
  formData.append('isPublished', isPublished ? 'true' : 'false');

  // Do NOT set Content-Type — let the browser add the multipart boundary.
  const res = await fetch(`${API_BASE}/api/tttv/videos`, {
    method: 'POST',
    headers: authHeaders(),
    body: formData
  });
  return handle(res);
}

/**
 * Patch an existing episode. Any subset of fields is allowed.
 */
export async function updateVideo(id, updates) {
  const res = await fetch(`${API_BASE}/api/tttv/videos/${id}`, {
    method: 'PATCH',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(updates)
  });
  return handle(res);
}

/**
 * Remove an episode and its Storage files.
 */
export async function deleteVideo(id) {
  const res = await fetch(`${API_BASE}/api/tttv/videos/${id}`, {
    method: 'DELETE',
    headers: authHeaders()
  });
  return handle(res);
}
