// src/utils/oauthState.js
// CSRF / login-fixation protection for OAuth redirect flows.
//
// Before redirecting to a provider (Discord/Google) we generate a random
// `state`, stash it in sessionStorage, and append it to the authorize URL.
// On the callback we require the value the provider echoes back to match what
// we stored. An attacker who feeds a victim a crafted callback URL cannot know
// (or set) the victim's sessionStorage value, so the callback aborts — closing
// the login-fixation / CSRF hole. Each flow uses its own key so a stale or
// concurrent flow can't cross-validate.
//
// Added 2026-06-11 (security audit).

function randomState() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  const bytes = new Uint8Array(16);
  (typeof crypto !== 'undefined' ? crypto : window.crypto).getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

const keyFor = (flow) => `oauth_state_${flow}`;

// Create + persist a state value for `flow`; returns it to embed in the URL.
export function createOAuthState(flow) {
  const state = randomState();
  try {
    sessionStorage.setItem(keyFor(flow), state);
  } catch (_) {
    /* sessionStorage unavailable — fall through; callback will fail closed */
  }
  return state;
}

// Validate the returned state against what we stored, then clear it (one-time
// use). Returns true ONLY when both exist and match exactly.
export function consumeOAuthState(flow, returnedState) {
  let expected = null;
  try {
    expected = sessionStorage.getItem(keyFor(flow));
    sessionStorage.removeItem(keyFor(flow));
  } catch (_) {
    /* sessionStorage unavailable */
  }
  return Boolean(expected) && Boolean(returnedState) && expected === returnedState;
}
