// server/models/GrandfatheredMember.js
// Stores Discord member IDs eligible for lifetime free access
// Populated by one-time snapshot before Feb 17, 2025 cutoff

const mongoose = require('mongoose');

const grandfatheredMemberSchema = new mongoose.Schema({
  // Discord user ID (snowflake) - the unique identifier
  discordId: { 
    type: String, 
    required: true, 
    unique: true,
    index: true
  },
  
  // Discord username at time of snapshot (for reference/debugging)
  discordUsername: { type: String, default: '' },
  
  // Discord display name at time of snapshot
  discordDisplayName: { type: String, default: '' },
  
  // When this member was snapshotted
  snapshotDate: { type: Date, default: Date.now },
  
  // Whether this member has claimed their lifetime access
  // (linked their Discord to a TitanTrack account)
  claimed: { type: Boolean, default: false },
  claimedBy: { type: String, default: null }, // TitanTrack username
  claimedAt: { type: Date, default: null }
  
}, {
  timestamps: true
});

const GrandfatheredMember = mongoose.model('GrandfatheredMember', grandfatheredMemberSchema);

module.exports = GrandfatheredMember;
