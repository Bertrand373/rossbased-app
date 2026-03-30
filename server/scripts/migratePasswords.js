#!/usr/bin/env node
// scripts/migratePasswords.js
// One-time script to hash all existing plaintext passwords to bcrypt
// Run ONCE after deploying the security update
//
// Usage: cd ~/project/src/server && node scripts/migratePasswords.js
//
// Safe to run multiple times — skips already-hashed passwords
// Does NOT touch Google/Discord placeholder passwords (google_xxx, discord_xxx)

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) {
  console.error('MONGO_URI not set. Run from the server directory with .env loaded.');
  process.exit(1);
}

async function migrate() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB');

  const User = require('./models/User');
  const users = await User.find({}, 'username password');

  let migrated = 0;
  let skipped = 0;
  let oauthSkipped = 0;

  for (const user of users) {
    // Skip if no password
    if (!user.password) {
      skipped++;
      continue;
    }

    // Skip OAuth placeholder passwords (google_xxx, discord_xxx)
    if (user.password.startsWith('google_') || user.password.startsWith('discord_')) {
      oauthSkipped++;
      continue;
    }

    // Skip if already bcrypt-hashed (starts with $2a$ or $2b$)
    if (user.password.startsWith('$2')) {
      skipped++;
      continue;
    }

    // This is a plaintext password — hash it
    const hashed = await bcrypt.hash(user.password, 10);
    await User.updateOne({ _id: user._id }, { $set: { password: hashed } });
    migrated++;
    console.log(`  🔒 Migrated: ${user.username}`);
  }

  console.log('');
  console.log('=== Migration Complete ===');
  console.log(`  Migrated to bcrypt: ${migrated}`);
  console.log(`  Already hashed/no password: ${skipped}`);
  console.log(`  OAuth placeholders (untouched): ${oauthSkipped}`);
  console.log(`  Total users processed: ${users.length}`);

  await mongoose.disconnect();
  process.exit(0);
}

migrate().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
