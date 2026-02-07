// server/models/ServerPulse.js
// Stores observed messages from the server for pattern analysis
// Oracle passively logs relevant messages, then generates weekly insights

const mongoose = require('mongoose');

const serverPulseSchema = new mongoose.Schema({
  // Message content (original text)
  content: {
    type: String,
    required: true
  },

  // Author display name (for internal analysis only, never exposed publicly)
  author: {
    type: String,
    required: true
  },

  // Channel where message was posted
  channel: {
    type: String,
    required: true
  },

  // Topics detected in message (for pattern grouping)
  topics: [{
    type: String,
    lowercase: true
  }],

  // Whether this message has been included in an insight already
  processed: {
    type: Boolean,
    default: false
  }

}, {
  timestamps: true
});

// Index for fetching unprocessed messages within a time range
serverPulseSchema.index({ processed: 1, createdAt: -1 });

// TTL: auto-delete after 30 days to keep collection lean
serverPulseSchema.index({ createdAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

const ServerPulse = mongoose.model('ServerPulse', serverPulseSchema);

module.exports = ServerPulse;
