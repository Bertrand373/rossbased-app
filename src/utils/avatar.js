// src/utils/avatar.js
//
// Shared avatar resolution. Single source of truth for "what should this
// user look like?" — used by ProfileButton, CircleStack, CircleSheet, and
// any future surface that renders a user's identity.
//
// Two return shapes:
//   resolveAvatar(member)   -> { kind: 'image'|'initial', src?, initial, displayName }
//   buildDiscordAvatarUrl(discordId, discordAvatar, size?)
//
// `member` accepts both client-side userData shapes and server-side circle
// member profile shapes — both expose discordId/discordAvatar/username.

const DEFAULT_SIZE = 128;

export function buildDiscordAvatarUrl(discordId, discordAvatar, size = DEFAULT_SIZE) {
  if (!discordId || !discordAvatar) return null;
  const ext = discordAvatar.startsWith('a_') ? 'gif' : 'png';
  return `https://cdn.discordapp.com/avatars/${discordId}/${discordAvatar}.${ext}?size=${size}`;
}

export function resolveAvatar(member, { size = DEFAULT_SIZE } = {}) {
  if (!member) {
    return { kind: 'initial', src: null, initial: '?', displayName: '' };
  }

  // Server-side circle profile already has avatarUrl resolved
  const preResolvedUrl = member.avatarUrl || null;
  // Client-side userData has the raw discord fields
  const fromRaw = buildDiscordAvatarUrl(member.discordId, member.discordAvatar, size);

  const src = preResolvedUrl || fromRaw;
  const displayName =
    member.displayName ||
    member.discordDisplayName ||
    member.username ||
    member.email ||
    '';
  const initial =
    member.initial ||
    (displayName ? displayName.charAt(0).toUpperCase() : '?');

  if (src) {
    return { kind: 'image', src, initial, displayName };
  }
  return { kind: 'initial', src: null, initial, displayName };
}
