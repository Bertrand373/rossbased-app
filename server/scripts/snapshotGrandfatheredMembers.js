// server/scripts/snapshotGrandfatheredMembers.js
// ============================================
// ONE-TIME SCRIPT: Run before Feb 17, 2025
// ============================================
// Connects to your Discord server and snapshots ALL member IDs
// into the GrandfatheredMember collection in MongoDB.
//
// HOW TO RUN:
//   cd ~/Desktop/rossbased-app/server
//   node scripts/snapshotGrandfatheredMembers.js
//
// REQUIRES: 
//   - MONGO_URI in your .env
//   - ORACLE_DISCORD_TOKEN (your bot token) in your .env
//   - DISCORD_GUILD_ID in your .env (your server ID)
//
// The bot must have the "Server Members Intent" enabled in Discord Developer Portal
// and must be in your server with permission to read members.

const mongoose = require('mongoose');
const { Client, GatewayIntentBits } = require('discord.js');
const dotenv = require('dotenv');
const path = require('path');

// Load env from server directory
dotenv.config({ path: path.join(__dirname, '../.env') });

// Import model
const GrandfatheredMember = require('../models/GrandfatheredMember');

const GUILD_ID = process.env.DISCORD_GUILD_ID;
const BOT_TOKEN = process.env.ORACLE_DISCORD_TOKEN;
const MONGO_URI = process.env.MONGO_URI;

async function snapshotMembers() {
  console.log('========================================');
  console.log('TITANTRACK GRANDFATHER SNAPSHOT');
  console.log('========================================\n');
  
  if (!GUILD_ID) {
    console.error('❌ Missing DISCORD_GUILD_ID in .env');
    console.log('   Find it: Right-click your server name in Discord → Copy Server ID');
    console.log('   Add to .env: DISCORD_GUILD_ID=your_server_id');
    process.exit(1);
  }
  
  if (!BOT_TOKEN) {
    console.error('❌ Missing ORACLE_DISCORD_TOKEN in .env');
    process.exit(1);
  }
  
  if (!MONGO_URI) {
    console.error('❌ Missing MONGO_URI in .env');
    process.exit(1);
  }
  
  // Connect to MongoDB
  console.log('Connecting to MongoDB...');
  await mongoose.connect(MONGO_URI);
  console.log('✅ MongoDB connected\n');
  
  // Connect Discord bot
  console.log('Connecting Discord bot...');
  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMembers
    ]
  });
  
  await client.login(BOT_TOKEN);
  console.log(`✅ Bot logged in as ${client.user.tag}\n`);
  
  // Fetch guild
  const guild = await client.guilds.fetch(GUILD_ID);
  console.log(`📍 Server: ${guild.name}`);
  console.log(`👥 Approximate members: ${guild.approximateMemberCount || 'unknown'}\n`);
  
  // Fetch ALL members (handles pagination automatically)
  console.log('Fetching all members (this may take a moment)...');
  const members = await guild.members.fetch();
  
  console.log(`📊 Total members fetched: ${members.size}\n`);
  
  // Filter out bots
  const humanMembers = members.filter(m => !m.user.bot);
  console.log(`👤 Human members: ${humanMembers.size}`);
  console.log(`🤖 Bots filtered out: ${members.size - humanMembers.size}\n`);
  
  // Check existing records
  const existingCount = await GrandfatheredMember.countDocuments();
  if (existingCount > 0) {
    console.log(`⚠️  WARNING: ${existingCount} records already exist in GrandfatheredMember collection.`);
    console.log('   This script will ADD new members without duplicating existing ones.\n');
  }
  
  // Insert members
  let inserted = 0;
  let skipped = 0;
  let errors = 0;
  
  for (const [id, member] of humanMembers) {
    try {
      // Use upsert to avoid duplicates
      await GrandfatheredMember.findOneAndUpdate(
        { discordId: id },
        {
          discordId: id,
          discordUsername: member.user.username,
          discordDisplayName: member.user.globalName || member.user.username,
          snapshotDate: new Date()
        },
        { upsert: true, new: true }
      );
      inserted++;
    } catch (err) {
      if (err.code === 11000) {
        skipped++; // Duplicate
      } else {
        errors++;
        console.error(`  Error for ${member.user.username}:`, err.message);
      }
    }
  }
  
  // Summary
  const totalRecords = await GrandfatheredMember.countDocuments();
  
  console.log('\n========================================');
  console.log('SNAPSHOT COMPLETE');
  console.log('========================================');
  console.log(`✅ Inserted/Updated: ${inserted}`);
  console.log(`⏭️  Skipped (existing): ${skipped}`);
  console.log(`❌ Errors: ${errors}`);
  console.log(`📊 Total grandfather records: ${totalRecords}`);
  console.log('========================================\n');
  
  // List first 10 for verification
  const sample = await GrandfatheredMember.find().limit(10).sort({ discordUsername: 1 });
  console.log('Sample records:');
  sample.forEach(m => {
    console.log(`  ${m.discordUsername} (${m.discordId}) ${m.claimed ? '✓ CLAIMED by ' + m.claimedBy : ''}`);
  });
  
  // Cleanup
  client.destroy();
  await mongoose.disconnect();
  console.log('\n✅ Done. Connections closed.');
  process.exit(0);
}

snapshotMembers().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
