// server/models/OracleXQueue.js
// Queue for Oracle's X (Twitter) posts
// Pipeline: generate → pending → approved (via Discord reaction) → posted
// ORACLE_X_AUTO=true skips the approval step

const mongoose = require('mongoose');

const oracleXQueueSchema = new mongoose.Schema({
  // The tweet text (≤280 characters)
  text: {
    type: String,
    required: true,
    maxlength: 280
  },

  // Status tracks the lifecycle
  status: {
    type: String,
    enum: ['pending', 'approved', 'posted', 'rejected', 'expired'],
    default: 'pending',
    index: true
  },

  // What community data inspired this post
  sourceType: {
    type: String,
    enum: ['community_pulse', 'oracle_observation', 'manual'],
    default: 'community_pulse'
  },

  // Reference to the CommunityPulse doc that inspired it (if any)
  sourcePulseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CommunityPulse'
  },

  // The raw community observation before X-format rewrite
  sourceText: String,

  // Discord message ID of the approval DM (for reaction tracking)
  discordMessageId: String,

  // X/Twitter post ID after posting
  tweetId: String,

  // Timestamps for each lifecycle stage
  approvedAt: Date,
  rejectedAt: Date,
  postedAt: Date,
  expiredAt: Date

}, { timestamps: true });

// Quick lookups
oracleXQueueSchema.index({ status: 1, createdAt: -1 });

// Auto-delete after 90 days
oracleXQueueSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

module.exports = mongoose.model('OracleXQueue', oracleXQueueSchema);
