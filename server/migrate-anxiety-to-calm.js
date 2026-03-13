// migrate-anxiety-to-calm.js
// Run on Render shell BEFORE deploying the code changes
// Usage: cd ~/project/src/server && node migrate-anxiety-to-calm.js
//
// What this does:
// - Flips all anxiety values in benefitTracking[] from old scale (1=calm, 10=severe)
//   to new calm scale (1=anxious, 10=calm) using formula: new = 11 - old
// - Flips all anxiety values in emotionalLog[] using the same formula
// - Only touches documents that actually have anxiety data
// - Logs exactly what it changed for verification

const mongoose = require('mongoose');

async function migrate() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    const db = mongoose.connection.db;
    const users = db.collection('users');

    // Count users with anxiety data
    const withBenefitAnxiety = await users.countDocuments({
      'benefitTracking.anxiety': { $exists: true }
    });
    const withEmotionalAnxiety = await users.countDocuments({
      'emotionalLog.anxiety': { $exists: true }
    });

    console.log(`Users with benefitTracking anxiety data: ${withBenefitAnxiety}`);
    console.log(`Users with emotionalLog anxiety data: ${withEmotionalAnxiety}`);

    // --- STEP 1: Flip benefitTracking[].anxiety ---
    console.log('\n--- Flipping benefitTracking anxiety values ---');
    
    const benefitCursor = users.find({ 'benefitTracking.anxiety': { $exists: true } });
    let benefitUsersUpdated = 0;
    let benefitEntriesFlipped = 0;

    while (await benefitCursor.hasNext()) {
      const user = await benefitCursor.next();
      let changed = false;

      const updated = (user.benefitTracking || []).map(entry => {
        if (typeof entry.anxiety === 'number') {
          const oldVal = entry.anxiety;
          const newVal = 11 - oldVal;
          // Clamp to 1-10
          entry.anxiety = Math.max(1, Math.min(10, newVal));
          benefitEntriesFlipped++;
          changed = true;
        }
        return entry;
      });

      if (changed) {
        await users.updateOne(
          { _id: user._id },
          { $set: { benefitTracking: updated } }
        );
        benefitUsersUpdated++;
      }
    }

    console.log(`  Users updated: ${benefitUsersUpdated}`);
    console.log(`  Entries flipped: ${benefitEntriesFlipped}`);

    // --- STEP 2: Flip emotionalLog[].anxiety ---
    console.log('\n--- Flipping emotionalLog anxiety values ---');

    const emotionalCursor = users.find({ 'emotionalLog.anxiety': { $exists: true } });
    let emotionalUsersUpdated = 0;
    let emotionalEntriesFlipped = 0;

    while (await emotionalCursor.hasNext()) {
      const user = await emotionalCursor.next();
      let changed = false;

      const updated = (user.emotionalLog || []).map(entry => {
        if (typeof entry.anxiety === 'number') {
          const oldVal = entry.anxiety;
          const newVal = 11 - oldVal;
          entry.anxiety = Math.max(1, Math.min(10, newVal));
          emotionalEntriesFlipped++;
          changed = true;
        }
        return entry;
      });

      if (changed) {
        await users.updateOne(
          { _id: user._id },
          { $set: { emotionalLog: updated } }
        );
        emotionalUsersUpdated++;
      }
    }

    console.log(`  Users updated: ${emotionalUsersUpdated}`);
    console.log(`  Entries flipped: ${emotionalEntriesFlipped}`);

    // --- SUMMARY ---
    console.log('\n=== MIGRATION COMPLETE ===');
    console.log(`benefitTracking: ${benefitUsersUpdated} users, ${benefitEntriesFlipped} entries`);
    console.log(`emotionalLog: ${emotionalUsersUpdated} users, ${emotionalEntriesFlipped} entries`);
    console.log('Formula used: new_value = 11 - old_value (clamped 1-10)');
    console.log('Old: 1=calm, 10=severe → New: 1=anxious, 10=calm');
    console.log('\nDeploy code changes NOW.');

    await mongoose.disconnect();
    process.exit(0);

  } catch (err) {
    console.error('MIGRATION FAILED:', err);
    await mongoose.disconnect();
    process.exit(1);
  }
}

migrate();
