// src/utils/photoUrl.js
//
// Module-scoped cache for presigned photo URLs so the same key isn't
// re-signed on every render. The server-side TTL is 15 min; we keep
// the URL until 30s before expiration and then re-sign.
//
// All callers go through getPresignedUrl(key) — the cache, the auth
// header, and the re-sign timing live here so consumers don't have to
// think about them.

const API_URL = process.env.REACT_APP_API_URL || 'https://rossbased-app.onrender.com';

const cache = new Map(); // key → { url, expiresAt }

export async function getPresignedUrl(key) {
  if (!key) return null;
  const cached = cache.get(key);
  if (cached && cached.expiresAt > Date.now() + 30_000) return cached.url;

  const token = localStorage.getItem('token');
  if (!token) return null;

  try {
    const res = await fetch(`${API_URL}/api/photos/sign?key=${encodeURIComponent(key)}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) return null;
    const data = await res.json();
    cache.set(key, {
      url: data.url,
      expiresAt: Date.now() + Math.max(60_000, (data.expiresIn - 60) * 1000)
    });
    return data.url;
  } catch {
    return null;
  }
}

/** Drop a single key from the cache. Use after deleting a photo. */
export function invalidate(key) {
  if (key) cache.delete(key);
}

/** Drop everything. Use on logout or major data refresh. */
export function clearCache() {
  cache.clear();
}
