// backfill-empty-streak-history.js
// ONE-TIME BACKFILL: Create an initial streakHistory entry for any user that's missing one.
//
// Why: The Google OAuth signup path historically did not initialize streakHistory,
// so Google-signup users have an empty streakHistory array. This breaks the Calendar
// edit-day flow ("No actions available for this day" on every tap) because
// getDayStatus() in src/components/Calendar/Calendar.js returns null when there is
// no current/former streak covering the tapped date.
//
// Strategy: Pick the EARLIEST signal so all of the user's existing data
// (wet dreams, benefit logs, notes, workouts, etc) falls inside the new streak
// and is reachable in the Calendar. We take the min of:
//   - user.startDate (if explicitly set)
//   - earliest date across every activity field on the user
//   - user.createdAt (signup date)
// Falling back to today if literally none of the above exist.
//
// Then create one open streakHistory entry: { start, end: null, days: 0, reason: null }.
// Also set startDate to that same value if it's missing, so the Tracker UI
// doesn't keep popping the DatePicker on a user that already has a streak.
//
// Run on Render shell:
//   cd ~/project/src/server && node backfill-empty-streak-history.js
//
// SAFE: Idempotent — only touches users with empty/missing streakHistory.

const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) {
  console.error('❌ MONGO_URI not set');
  process.exit(1);
}

function toDateStr(val) {
  if (!val) return null;
  if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(val)) return val;
  const d = new Date(val);
  if (isNaN(d.getTime())) return null;
  return d.toISOString().split('T')[0];
}

// Scan every date-stamped field on the user and return the earliest yyyy-MM-dd string,
// or null if no activity dates were found. Mirrors the User schema in server/models/User.js.
function earliestActivityDate(user) {
  const dates = [];

  // Single-date scalar fields
  const scalars = ['lastWetDream', 'lastRelapse'];
  for (const f of scalars) {
    const s = toDateStr(user[f]);
    if (s) dates.push(s);
  }

  // Array fields where each entry has a .date
  const arrays = [
    'wetDreams',
    'benefitTracking',
    'emotionalTracking',
    'emotionalLog',
    'urgeToolUsage',
    'urgeLog',
    'oracleNotes',
    'peakRecordings',
    'workoutLog'
  ];
  for (const f of arrays) {
    const arr = user[f];
    if (!Array.isArray(arr)) continue;
    for (const entry of arr) {
      const s = toDateStr(entry && entry.date);
      if (s) dates.push(s);
    }
  }

  // notes is an object keyed by yyyy-MM-dd — keys ARE the activity dates
  if (user.notes && typeof user.notes === 'object') {
    for (const key of Object.keys(user.notes)) {
      if (/^\d{4}-\d{2}-\d{2}$/.test(key)) dates.push(key);
    }
  }

  if (dates.length === 0) return null;
  return dates.sort()[0]; // lexicographic sort works for yyyy-MM-dd
}

// Pick the earliest meaningful date so the backfilled streak covers all existing data.
// Returns { startStr, source } where source explains which signal won (for logging).
function pickStreakStart(user) {
  const candidates = [];
  const startDateStr = toDateStr(user.startDate);
  const activityStr = earliestActivityDate(user);
  const createdStr = toDateStr(user.createdAt);

  if (startDateStr) candidates.push({ str: startDateStr, source: 'startDate' });
  if (activityStr) candidates.push({ str: activityStr, source: 'activity' });
  if (createdStr) candidates.push({ str: createdStr, source: 'createdAt' });

  if (candidates.length === 0) {
    return { startStr: toDateStr(new Date()), source: 'today' };
  }

  // Pick the earliest by date string (yyyy-MM-dd sorts lexicographically)
  candidates.sort((a, b) => a.str.localeCompare(b.str));
  return { startStr: candidates[0].str, source: candidates[0].source };
}

async function backfill() {
  await mongoose.connect(MONGO_URI);
  console.log('✅ Connected to MongoDB');

  const db = mongoose.connection.db;
  const users = db.collection('users');

  const cursor = users.find({
    $or: [
      { streakHistory: { $exists: false } },
      { streakHistory: { $size: 0 } }
    ]
  });

  let total = 0;
  let modified = 0;
  let errors = 0;
  const sourceCounts = { startDate: 0, activity: 0, createdAt: 0, today: 0 };

  while (await cursor.hasNext()) {
    const user = await cursor.next();
    total++;

    try {
      const { startStr, source } = pickStreakStart(user);
      sourceCounts[source] = (sourceCounts[source] || 0) + 1;

      const startDateObj = new Date(`${startStr}T00:00:00.000Z`);

      const updates = {
        streakHistory: [{
          id: 1,
          start: startDateObj,
          end: null,
          days: 0,
          reason: null
        }]
      };

      // If startDate is missing, set it too — keeps Tracker from re-prompting DatePicker
      if (!user.startDate) {
        updates.startDate = startStr;
      }

      await users.updateOne({ _id: user._id }, { $set: updates });
      modified++;
      console.log(`  ✓ ${user.username || user._id} — backfilled (start=${startStr}, source=${source})`);
    } catch (err) {
      errors++;
      console.error(`  ✗ ${user.username || user._id} — ERROR: ${err.message}`);
    }
  }

  console.log('\n========================================');
  console.log(`Affected users: ${total}`);
  console.log(`Backfilled:     ${modified}`);
  console.log(`Errors:         ${errors}`);
  console.log('--- start sources ---');
  for (const [src, count] of Object.entries(sourceCounts)) {
    if (count > 0) console.log(`  ${src.padEnd(10)} ${count}`);
  }
  console.log('========================================');

  await mongoose.disconnect();
  console.log('✅ Done');
}

backfill().catch(err => {
  console.error('❌ Backfill failed:', err);
  mongoose.disconnect();
  process.exit(1);
});
