// server/utils/streakCalc.js
// Single source of truth for computing a user's current streak DAY from their
// startDate, timezone-aware so the backend agrees with the frontend (which
// computes in the user's local timezone). Render runs the server in UTC, so
// without the timezone a non-UTC user near midnight gets the wrong "Day N"
// (e.g. a Pacific user at 9pm sees Day 30 in-app but the server computes 31).
//
// IMPORTANT: when `timezone` is empty or 'UTC' this is byte-for-byte the old
// server-local computation, so users with no stored timezone are unaffected —
// only users with a known timezone get the corrected (frontend-matching) value.
//
// Mirrors app.js calcStreakFromStartDate (the already-correct reference).
// Added 2026-06-12 (security/correctness audit) to retire the no-timezone
// copies in transmissionEngine / riskEngine / leaderboardService.

// Resolve a user's IANA timezone from the fields the app populates:
// user.timezone (set on each Oracle use) or notificationPreferences.timezone
// (set when notification prefs are saved). Empty string => server-local.
function resolveUserTimezone(user) {
  return (user && (user.timezone || user.notificationPreferences?.timezone)) || '';
}

function calcStreakFromStartDate(startDate, timezone) {
  if (!startDate) return 1;
  let startStr;
  if (typeof startDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(startDate)) {
    startStr = startDate;
  } else {
    const d = new Date(startDate);
    startStr = d.toISOString().split('T')[0];
  }
  const [sy, sm, sd] = startStr.split('-').map(Number);
  const startMs = new Date(sy, sm - 1, sd).getTime();

  let todayMs;
  if (timezone && timezone !== 'UTC') {
    const now = new Date();
    const userNow = new Date(now.toLocaleString('en-US', { timeZone: timezone }));
    userNow.setHours(0, 0, 0, 0);
    todayMs = userNow.getTime();
  } else {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    todayMs = today.getTime();
  }

  const diffDays = Math.floor((todayMs - startMs) / (1000 * 60 * 60 * 24));
  return Math.max(1, diffDays + 1);
}

module.exports = { calcStreakFromStartDate, resolveUserTimezone };
