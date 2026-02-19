// server/scripts/backfillGrandfathered.js
// ============================================
// ONE-TIME FIX: Backfill OG status for existing users
// ============================================
// Matches all users with a discordId against the grandfatheredmembers
// collection and grants lifetime access to anyone who qualifies.
//
// HOW TO RUN:
//   cd ~/Desktop/rossbased-app/server
//   node scripts/backfillGrandfathered.js
//
// REQUIRES: MONGO_URI in your .env
// ============================================

const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load env from server directory
dotenv.config({ path: path.join(__dirname, '../.env') });

const User = require('../models/User');
const GrandfatheredMember = require('../models/GrandfatheredMember');

async function backfill() {
  console.log('========================================');
  console.log('TITANTRACK OG BACKFILL');
  console.log('========================================\n');

  const MONGO_URI = process.env.MONGO_URI;
  if (!MONGO_URI) {
    console.error('❌ Missing MONGO_URI in .env');
    process.exit(1);
  }

  console.log('Connecting to MongoDB...');
  await mongoose.connect(MONGO_URI);
  console.log('✅ Connected\n');

  // Get all grandfathered Discord IDs
  const gfMembers = await GrandfatheredMember.find({}, { discordId: 1 });
  const gfSet = new Set(gfMembers.map(m => m.discordId));
  console.log(`📋 Grandfather list: ${gfSet.size} Discord IDs\n`);

  // Get all users who have a discordId
  const allUsers = await User.find({});
  console.log(`👥 Total users in database: ${allUsers.length}\n`);

  let alreadyOG = 0;
  let upgraded = 0;
  let noDiscordId = 0;
  let notInList = 0;
  let errors = 0;

  for (const user of allUsers) {
    // Skip users without a Discord ID
    if (!user.discordId) {
      noDiscordId++;
      continue;
    }

    // Already grandfathered? Skip
    if (user.subscription && user.subscription.status === 'grandfathered') {
      alreadyOG++;
      console.log(`  ✓ ${user.username} — already OG`);
      continue;
    }

    // Check if their Discord ID is in the grandfather list
    if (gfSet.has(user.discordId)) {
      try {
        user.subscription = {
          ...user.subscription,
          status: 'grandfathered',
          plan: 'lifetime',
          grandfatheredAt: new Date(),
          grandfatheredReason: 'discord_og'
        };
        user.isPremium = true;
        await user.save();
        upgraded++;
        console.log(`  ⬆️  ${user.username} — UPGRADED to OG`);
      } catch (err) {
        errors++;
        console.error(`  ❌ ${user.username} — error: ${err.message}`);
      }
    } else {
      notInList++;
      console.log(`  — ${user.username} — discordId not in grandfather list`);
    }
  }

  console.log('\n========================================');
  console.log('BACKFILL COMPLETE');
  console.log('========================================');
  console.log(`✅ Already OG:       ${alreadyOG}`);
  console.log(`⬆️  Upgraded to OG:   ${upgraded}`);
  console.log(`— Not in list:       ${notInList}`);
  console.log(`🚫 No Discord ID:    ${noDiscordId}`);
  console.log(`❌ Errors:           ${errors}`);
  console.log('========================================\n');

  await mongoose.disconnect();
  console.log('✅ Done. Connection closed.');
}

backfill().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
