// server/routes/circleRoutes.js
//
// All endpoints require auth (mounted with authenticate middleware in app.js).
// The acting user is always req.user.username — never trust username in the
// body or params for membership decisions.
//
// Endpoints:
//   POST   /api/circles               create a new circle (creator becomes first member)
//   POST   /api/circles/join          join a circle by 6-char code
//   GET    /api/circles/mine          get the user's current circle + members + today's check-ins
//   POST   /api/circles/check-in      upsert today's check-in for the user
//   DELETE /api/circles/leave         leave the current circle (auto-archives if last member)
//   DELETE /api/circles/check-in      remove today's check-in (user changed their mind)
//
// Naming convention: routes return { ok: true, ... } on success and
// { error: '...', code?: '...' } on failure. The Circle home screen
// renders directly from /mine's response shape — keep it stable.

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Circle = require('../models/Circle');
const CircleCheckIn = require('../models/CircleCheckIn');
const User = require('../models/User');
const { checkPremiumAccess } = require('../middleware/subscriptionMiddleware');

const NAME_MAX = Circle.NAME_MAX;
const MAX_MEMBERS = Circle.MAX_MEMBERS;
const NOTE_MAX = CircleCheckIn.NOTE_MAX;

// ────────────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────────────

// Resolve display + avatar bits for a list of usernames. The Circle home
// renders avatars for every member, so we batch this in one query rather
// than N round-trips. Avatar resolution mirrors the frontend
// ProfileButton helper (Discord avatar URL or initial fallback) so what
// users see in the Circle matches what they see elsewhere.
async function buildMemberProfiles(usernames) {
  if (!usernames || usernames.length === 0) return {};
  const users = await User.find(
    { username: { $in: usernames } },
    {
      username: 1,
      discordId: 1,
      discordAvatar: 1,
      discordDisplayName: 1,
      currentStreak: 1,
      startDate: 1
    }
  ).lean();

  const profiles = {};
  for (const u of users) {
    let avatarUrl = null;
    if (u.discordAvatar && u.discordId) {
      const ext = u.discordAvatar.startsWith('a_') ? 'gif' : 'png';
      avatarUrl = `https://cdn.discordapp.com/avatars/${u.discordId}/${u.discordAvatar}.${ext}?size=128`;
    }
    profiles[u.username] = {
      username: u.username,
      displayName: u.discordDisplayName || u.username,
      avatarUrl,
      initial: (u.username || '?').charAt(0).toUpperCase(),
      currentStreak: u.currentStreak || 0
    };
  }
  return profiles;
}

// Given the user's most recent benefit log (today's), compute a short
// scannable summary like "Energy up · Focus steady · Sleep down". We
// compare today vs the previous logged day per-metric using a small
// threshold (±0.75) so noise doesn't read as movement. Returns "" if no
// log exists.
const SUMMARY_METRICS = [
  ['energy', 'Energy'],
  ['focus', 'Focus'],
  ['confidence', 'Confidence'],
  ['aura', 'Aura'],
  ['sleep', 'Sleep'],
  ['workout', 'Body']
];

function computeBenefitSummary(user) {
  const logs = (user.benefitTracking || []).slice();
  if (logs.length === 0) return '';
  // Latest log is today's (since we just saved it). Compare to the
  // previous one if any, otherwise call everything "logged".
  logs.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const today = logs[logs.length - 1];
  const prev = logs.length >= 2 ? logs[logs.length - 2] : null;

  // Pick the top 2 movers (largest absolute delta vs prev) to keep the
  // summary short. If no prev, just show "Logged today".
  if (!prev) return 'Logged today.';

  const movers = SUMMARY_METRICS
    .map(([k, label]) => {
      const t = today[k];
      const p = prev[k];
      if (typeof t !== 'number' || typeof p !== 'number') return null;
      return { label, delta: t - p, value: t };
    })
    .filter(Boolean)
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));

  const parts = movers.slice(0, 2).map(m => {
    if (m.delta >= 0.75) return `${m.label} up`;
    if (m.delta <= -0.75) return `${m.label} down`;
    return `${m.label} steady`;
  });
  if (parts.length === 0) return 'Logged today.';
  return parts.join(' · ') + '.';
}

// Build the same client-facing circle shape that /mine returns: members
// hydrated with profile + reported state, plus viewerReportedToday.
// Used by GET /mine AND by POST /circles + POST /circles/join so the
// client can set its state directly from the action response without a
// follow-up refresh round-trip (which was racing the create flow).
async function buildFullCirclePayload(circle, viewerUsername, date) {
  const memberUsernames = circle.members.map(m => m.username);
  const [profiles, checkIns] = await Promise.all([
    buildMemberProfiles(memberUsernames),
    CircleCheckIn.find({ circleId: circle._id, date }).lean()
  ]);
  const checkInByUser = Object.fromEntries(checkIns.map(c => [c.username, c]));

  const members = circle.members.map(m => {
    const profile = profiles[m.username] || {
      username: m.username,
      displayName: m.username,
      avatarUrl: null,
      initial: (m.username || '?').charAt(0).toUpperCase(),
      currentStreak: 0
    };
    const check = checkInByUser[m.username] || null;
    return {
      ...profile,
      role: m.role,
      joinedAt: m.joinedAt,
      reported: !!check,
      note: check?.note || '',
      benefitSummary: check?.benefitSummary || '',
      streakDayAtCheckIn: check?.streakDay ?? null,
      checkedInAt: check?.createdAt || null
    };
  });

  return {
    ...serializeCircle(circle),
    members,
    viewerReportedToday: !!checkInByUser[viewerUsername]
  };
}

// Resolve the date the client should use for today's check-in window.
// Accepts a yyyy-MM-dd string in req.body or req.query, falls back to
// UTC today. Centralized so create/join/mine all agree on the key.
function resolveLocalDate(req) {
  const fromBody = req.body?.date;
  const fromQuery = req.query?.date;
  const cand = fromBody || fromQuery;
  if (typeof cand === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(cand)) return cand;
  return new Date().toISOString().slice(0, 10);
}

// ────────────────────────────────────────────────────────────────────────
// POST /api/circles — create a new circle
// Body: { name: string, date?: 'yyyy-MM-dd' (for today's check-in window) }
// ────────────────────────────────────────────────────────────────────────
router.post('/', async (req, res) => {
  try {
    const username = req.user.username;
    const rawName = typeof req.body.name === 'string' ? req.body.name.trim() : '';
    if (!rawName) return res.status(400).json({ error: 'Name is required' });
    if (rawName.length > NAME_MAX) return res.status(400).json({ error: `Name must be ${NAME_MAX} chars or fewer` });

    // Pay-to-create: creating a circle is a Premium action (joining stays
    // free). checkPremiumAccess respects the PAYWALL_ENABLED switch + test
    // users, so this is a no-op pre-launch and for grandfathered/active subs.
    const actor = await User.findOne({ username }, { circleId: 1, subscription: 1, username: 1 }).lean();
    const { hasPremium } = checkPremiumAccess(actor || { username });
    if (!hasPremium) {
      return res.status(403).json({ error: 'Creating a circle is a Premium feature', code: 'PREMIUM_REQUIRED' });
    }

    // Already in a circle? Block — one circle per user.
    if (actor?.circleId) {
      return res.status(409).json({ error: 'You are already in a circle', code: 'ALREADY_IN_CIRCLE' });
    }

    // Generate a unique code (retry on collision — extremely rare).
    let code = null;
    for (let attempt = 0; attempt < 5; attempt++) {
      const candidate = Circle.generateCode();
      const taken = await Circle.exists({ code: candidate });
      if (!taken) { code = candidate; break; }
    }
    if (!code) {
      return res.status(500).json({ error: 'Could not generate a unique code, please try again' });
    }

    const circle = await Circle.create({
      code,
      name: rawName,
      createdBy: username,
      members: [{ username, role: 'creator' }],
      status: 'active',
      lastActivityAt: new Date()
    });

    await User.updateOne({ username }, { $set: { circleId: circle._id } });

    // Return the full hydrated shape so the client can setCircle directly
    // (no follow-up GET needed; eliminates the create→stale-header race).
    const date = resolveLocalDate(req);
    const payload = await buildFullCirclePayload(circle, username, date);
    res.json({ ok: true, circle: payload });
  } catch (err) {
    console.error('Circle create error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ────────────────────────────────────────────────────────────────────────
// POST /api/circles/join — join by code
// Body: { code: string }
// ────────────────────────────────────────────────────────────────────────
router.post('/join', async (req, res) => {
  try {
    const username = req.user.username;
    const rawCode = typeof req.body.code === 'string' ? req.body.code.trim().toUpperCase() : '';
    if (!rawCode) return res.status(400).json({ error: 'Code is required' });

    // Already in a circle? Block — one circle per user.
    const me = await User.findOne({ username }, { circleId: 1 }).lean();
    if (me?.circleId) {
      return res.status(409).json({ error: 'You are already in a circle. Leave it first to join another.', code: 'ALREADY_IN_CIRCLE' });
    }

    // Atomic join: $push with conditions so we can't exceed MAX_MEMBERS
    // even under concurrent joins (last writer wouldn't win if size has
    // already grown). Mongo evaluates the filter on each candidate doc.
    const updated = await Circle.findOneAndUpdate(
      {
        code: rawCode,
        status: 'active',
        [`members.${MAX_MEMBERS - 1}`]: { $exists: false }, // size < MAX_MEMBERS
        'members.username': { $ne: username }                // not already a member (defensive)
      },
      {
        $push: { members: { username, role: 'member', joinedAt: new Date() } },
        $set: { lastActivityAt: new Date() }
      },
      { new: true }
    );

    if (!updated) {
      // Distinguish full-circle vs not-found for a better error message
      const existed = await Circle.findOne({ code: rawCode, status: 'active' }).lean();
      if (!existed) return res.status(404).json({ error: 'No active circle with that code' });
      if (existed.members.length >= MAX_MEMBERS) return res.status(409).json({ error: 'This circle is full', code: 'FULL' });
      if (existed.members.some(m => m.username === username)) return res.status(409).json({ error: 'You are already in this circle', code: 'ALREADY_MEMBER' });
      return res.status(409).json({ error: 'Could not join this circle' });
    }

    await User.updateOne({ username }, { $set: { circleId: updated._id } });

    // Return the full hydrated shape so the client can setCircle directly.
    const date = resolveLocalDate(req);
    const payload = await buildFullCirclePayload(updated, username, date);
    res.json({ ok: true, circle: payload });
  } catch (err) {
    console.error('Circle join error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ────────────────────────────────────────────────────────────────────────
// GET /api/circles/mine — get the user's current circle + members + today's check-ins
// Query: ?date=yyyy-MM-dd (optional; defaults to UTC today — client should pass local)
// ────────────────────────────────────────────────────────────────────────
router.get('/mine', async (req, res) => {
  try {
    const username = req.user.username;
    const date = resolveLocalDate(req);

    const me = await User.findOne({ username }, { circleId: 1 }).lean();
    if (!me?.circleId) return res.json({ ok: true, circle: null });

    const circle = await Circle.findOne({ _id: me.circleId, status: 'active' }).lean();
    if (!circle) {
      // Circle was archived; clear our pointer so the UI shows empty state
      await User.updateOne({ username }, { $set: { circleId: null } });
      return res.json({ ok: true, circle: null });
    }

    const payload = await buildFullCirclePayload(circle, username, date);
    res.json({ ok: true, circle: payload });
  } catch (err) {
    console.error('Circle mine error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ────────────────────────────────────────────────────────────────────────
// POST /api/circles/check-in — upsert today's check-in
// Body: { date: 'yyyy-MM-dd', note?: string, streakDay?: number }
// ────────────────────────────────────────────────────────────────────────
router.post('/check-in', async (req, res) => {
  try {
    const username = req.user.username;
    const date = typeof req.body.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(req.body.date)
      ? req.body.date
      : null;
    if (!date) return res.status(400).json({ error: 'Valid date (yyyy-MM-dd) is required' });

    const note = typeof req.body.note === 'string' ? req.body.note.trim().slice(0, NOTE_MAX) : '';
    const streakDay = Math.max(0, parseInt(req.body.streakDay, 10) || 0);

    // Member-check + circle lookup in one query
    const user = await User.findOne({ username });
    if (!user?.circleId) return res.status(404).json({ error: 'You are not in a circle' });

    const circle = await Circle.findOne({ _id: user.circleId, status: 'active' });
    if (!circle) return res.status(404).json({ error: 'Your circle is no longer active' });
    if (!circle.members.some(m => m.username === username)) {
      // Inverse-pointer drift recovery
      await User.updateOne({ username }, { $set: { circleId: null } });
      return res.status(404).json({ error: 'You are not a member of this circle' });
    }

    const benefitSummary = computeBenefitSummary(user);

    const checkIn = await CircleCheckIn.findOneAndUpdate(
      { circleId: circle._id, username, date },
      {
        $set: { note, streakDay, benefitSummary },
        $setOnInsert: { circleId: circle._id, username, date }
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // Bump the circle's last-activity stamp so the home query can sort
    // and the future stale-detection cron has a signal to read.
    await Circle.updateOne({ _id: circle._id }, { $set: { lastActivityAt: new Date() } });

    res.json({ ok: true, checkIn });
  } catch (err) {
    console.error('Circle check-in error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ────────────────────────────────────────────────────────────────────────
// DELETE /api/circles/check-in — remove today's check-in
// Query: ?date=yyyy-MM-dd
// ────────────────────────────────────────────────────────────────────────
router.delete('/check-in', async (req, res) => {
  try {
    const username = req.user.username;
    const date = typeof req.query.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(req.query.date)
      ? req.query.date
      : null;
    if (!date) return res.status(400).json({ error: 'Valid date (yyyy-MM-dd) is required' });

    const me = await User.findOne({ username }, { circleId: 1 }).lean();
    if (!me?.circleId) return res.status(404).json({ error: 'You are not in a circle' });

    await CircleCheckIn.deleteOne({ circleId: me.circleId, username, date });
    res.json({ ok: true });
  } catch (err) {
    console.error('Circle check-in delete error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ────────────────────────────────────────────────────────────────────────
// DELETE /api/circles/leave — leave the current circle
// Archives the circle if it becomes empty.
// ────────────────────────────────────────────────────────────────────────
router.delete('/leave', async (req, res) => {
  try {
    const username = req.user.username;
    const me = await User.findOne({ username }, { circleId: 1 }).lean();
    if (!me?.circleId) return res.status(404).json({ error: 'You are not in a circle' });

    const circle = await Circle.findById(me.circleId);
    if (!circle) {
      await User.updateOne({ username }, { $set: { circleId: null } });
      return res.json({ ok: true });
    }

    circle.members = circle.members.filter(m => m.username !== username);
    if (circle.members.length === 0) {
      circle.status = 'archived';
      circle.archivedAt = new Date();
    }
    await circle.save();
    await User.updateOne({ username }, { $set: { circleId: null } });

    res.json({ ok: true });
  } catch (err) {
    console.error('Circle leave error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ────────────────────────────────────────────────────────────────────────
// Serialization helper — strips Mongo internals, keeps a clean shape.
// ────────────────────────────────────────────────────────────────────────
function serializeCircle(c) {
  return {
    id: String(c._id),
    code: c.code,
    name: c.name,
    status: c.status,
    createdBy: c.createdBy,
    createdAt: c.createdAt,
    lastActivityAt: c.lastActivityAt,
    maxSize: MAX_MEMBERS,
    memberCount: (c.members || []).length
  };
}

module.exports = router;
