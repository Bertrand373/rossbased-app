// server/scripts/lookupUser.js
// ============================================
// One-off contact lookup for a user by app username.
// Useful when someone sends feedback and you need to reach
// them outside Discord (email reply, refund, etc.).
//
// HOW TO RUN:
//   cd ~/Desktop/rossbased-app/server
//   node scripts/lookupUser.js <username>
//
// Example:
//   node scripts/lookupUser.js DiamondMind151
//
// REQUIRES: MONGO_URI in server/.env

const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const User = require('../models/User');

const MONGO_URI = process.env.MONGO_URI;

async function lookup(rawUsername) {
  if (!rawUsername) {
    console.error('Usage: node scripts/lookupUser.js <username>');
    process.exit(1);
  }
  if (!MONGO_URI) {
    console.error('MONGO_URI not set in server/.env');
    process.exit(1);
  }

  await mongoose.connect(MONGO_URI);

  // Case-insensitive exact match so "diamondmind151" finds "DiamondMind151"
  const escaped = rawUsername.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const user = await User.findOne({
    username: { $regex: new RegExp(`^${escaped}$`, 'i') }
  }).lean();

  if (!user) {
    console.log(`\nNo user found matching "${rawUsername}".`);
    await mongoose.disconnect();
    process.exit(0);
  }

  const sub = user.subscription || {};
  const fmt = (d) => (d ? new Date(d).toISOString().slice(0, 10) : 'N/A');

  console.log('\n========================================');
  console.log(`USER: ${user.username}`);
  console.log('========================================');
  console.log(`Email:            ${user.email || 'N/A'}`);
  console.log(`Discord username: ${user.discordUsername || 'N/A'}`);
  console.log(`Discord display:  ${user.discordDisplayName || 'N/A'}`);
  console.log(`Country:          ${user.country || 'N/A'}`);
  console.log(`Signed up:        ${fmt(user.createdAt || user.startDate)}`);
  console.log('--- Subscription ---');
  console.log(`Is premium:       ${user.isPremium ? 'yes' : 'no'}`);
  console.log(`Status:           ${sub.status || 'N/A'}`);
  console.log(`Plan:             ${sub.plan || 'N/A'}`);
  console.log(`Tier:             ${sub.tier || 'N/A'}`);
  console.log(`Trial:            ${fmt(sub.trialStartDate)} → ${fmt(sub.trialEndDate)}`);
  console.log(`Current period:   ${fmt(sub.currentPeriodStart)} → ${fmt(sub.currentPeriodEnd)}`);
  console.log(`Cancel at end:    ${sub.cancelAtPeriodEnd ? 'yes' : 'no'}`);
  console.log(`Stripe customer:  ${sub.stripeCustomerId || 'N/A'}`);
  console.log(`Stripe sub ID:    ${sub.stripeSubscriptionId || 'N/A'}`);
  console.log('========================================\n');

  await mongoose.disconnect();
}

lookup(process.argv[2]).catch((err) => {
  console.error('Lookup failed:', err);
  process.exit(1);
});
