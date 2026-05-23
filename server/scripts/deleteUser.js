// server/scripts/deleteUser.js
// ============================================
// One-off account deletion by app username.
// Prints what would be deleted, asks for an explicit y/N confirmation,
// then deletes. Useful for cleaning up test accounts.
//
// HOW TO RUN:
//   cd ~/Desktop/rossbased-app/server
//   node scripts/deleteUser.js <username>
//
// Example:
//   node scripts/deleteUser.js fbtest
//
// REQUIRES: MONGO_URI in server/.env

const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const readline = require('readline');

dotenv.config({ path: path.join(__dirname, '../.env') });

const User = require('../models/User');

const MONGO_URI = process.env.MONGO_URI;

const ask = (question) => new Promise((resolve) => {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  rl.question(question, (answer) => {
    rl.close();
    resolve(answer.trim().toLowerCase());
  });
});

async function deleteUser(rawUsername) {
  if (!rawUsername) {
    console.error('Usage: node scripts/deleteUser.js <username>');
    process.exit(1);
  }
  if (!MONGO_URI) {
    console.error('MONGO_URI not set in server/.env');
    process.exit(1);
  }

  await mongoose.connect(MONGO_URI);

  const escaped = rawUsername.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const user = await User.findOne({
    username: { $regex: new RegExp(`^${escaped}$`, 'i') }
  }).lean();

  if (!user) {
    console.log(`\nNo user matching "${rawUsername}".`);
    await mongoose.disconnect();
    process.exit(0);
  }

  console.log('\nFound user:');
  console.log(`  Username:  ${user.username}`);
  console.log(`  Email:     ${user.email || 'N/A'}`);
  console.log(`  Discord:   ${user.discordUsername || 'N/A'}`);
  console.log(`  Signed up: ${user.createdAt ? new Date(user.createdAt).toISOString().slice(0, 10) : 'N/A'}`);
  console.log(`  Premium:   ${user.isPremium ? 'yes' : 'no'}`);

  const answer = await ask(`\nPermanently delete this user? Type "yes" to confirm: `);
  if (answer !== 'yes') {
    console.log('Aborted. Nothing deleted.');
    await mongoose.disconnect();
    process.exit(0);
  }

  const result = await User.deleteOne({ _id: user._id });
  console.log(`\nDeleted ${result.deletedCount} user.`);
  await mongoose.disconnect();
}

deleteUser(process.argv[2]).catch((err) => {
  console.error('Delete failed:', err);
  process.exit(1);
});
