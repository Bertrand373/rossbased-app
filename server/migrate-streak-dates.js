// migrate-streak-dates.js
// ONE-TIME MIGRATION: Convert streakHistory start/end from Date objects to "yyyy-MM-dd" strings
// Also converts startDate, lastRelapse to date strings
//
// Run on Render shell:
//   cd ~/project/src/server && node migrate-streak-dates.js
//
// SAFE: Idempotent — running twice won't break anything (already-string values pass through)

const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) {
  console.error('❌ MONGO_URI not set');
  process.exit(1);
}

// Convert a Date or ISO string to "yyyy-MM-dd" using UTC
// Why UTC: Server stores dates in UTC. Most streak starts happen during waking hours
// where UTC date = local date. Edge cases (late-night) may be ±1 day in history,
// but going forward all new data will be correct.
function toDateStr(val) {
  if (!val) return null;
  // Already a date string
  if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(val)) return val;
  const d = new Date(val);
  if (isNaN(d.getTime())) return null;
  return d.toISOString().split('T')[0];
}

async function migrate() {
  await mongoose.connect(MONGO_URI);
  console.log('✅ Connected to MongoDB');
  
  const db = mongoose.connection.db;
  const users = db.collection('users');
  
  const cursor = users.find({});
  let total = 0;
  let modified = 0;
  let errors = 0;
  
  while (await cursor.hasNext()) {
    const user = await cursor.next();
    total++;
    
    try {
      const updates = {};
      let needsUpdate = false;
      
      // Convert startDate
      if (user.startDate && !(typeof user.startDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(user.startDate))) {
        const converted = toDateStr(user.startDate);
        if (converted) {
          updates.startDate = converted;
          needsUpdate = true;
        }
      }
      
      // Convert lastRelapse
      if (user.lastRelapse && !(typeof user.lastRelapse === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(user.lastRelapse))) {
        const converted = toDateStr(user.lastRelapse);
        if (converted) {
          updates.lastRelapse = converted;
          needsUpdate = true;
        }
      }
      
      // Convert streakHistory entries
      if (user.streakHistory && user.streakHistory.length > 0) {
        let historyChanged = false;
        const newHistory = user.streakHistory.map(entry => {
          const newEntry = { ...entry };
          
          if (entry.start && !(typeof entry.start === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(entry.start))) {
            const converted = toDateStr(entry.start);
            if (converted) {
              newEntry.start = converted;
              historyChanged = true;
            }
          }
          
          if (entry.end && !(typeof entry.end === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(entry.end))) {
            const converted = toDateStr(entry.end);
            if (converted) {
              newEntry.end = converted;
              historyChanged = true;
            }
          }
          
          return newEntry;
        });
        
        if (historyChanged) {
          updates.streakHistory = newHistory;
          needsUpdate = true;
        }
      }
      
      if (needsUpdate) {
        await users.updateOne({ _id: user._id }, { $set: updates });
        modified++;
        console.log(`  ✓ ${user.username || user._id} — migrated`);
      }
    } catch (err) {
      errors++;
      console.error(`  ✗ ${user.username || user._id} — ERROR: ${err.message}`);
    }
  }
  
  console.log('\n========================================');
  console.log(`Total users:    ${total}`);
  console.log(`Modified:       ${modified}`);
  console.log(`Errors:         ${errors}`);
  console.log(`Already clean:  ${total - modified - errors}`);
  console.log('========================================');
  
  await mongoose.disconnect();
  console.log('✅ Done');
}

migrate().catch(err => {
  console.error('❌ Migration failed:', err);
  mongoose.disconnect();
  process.exit(1);
});
