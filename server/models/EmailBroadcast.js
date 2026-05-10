// server/models/EmailBroadcast.js
// ============================================================
// EMAIL BROADCAST — Persisted record of every email the agent sends
// ============================================================
//
// One doc per Kit broadcast. Holds the content the agent saw at draft time
// plus the performance Kit reports back later. Feeds the learning loop:
// analyzer compares winners vs losers, learnings get injected back into
// future drafts. Rates stored as decimals (0.5398 not 53.98).

const mongoose = require('mongoose');

const emailBroadcastSchema = new mongoose.Schema({
  kitBroadcastId: { type: String, required: true, unique: true, index: true },

  subject: { type: String, required: true },
  body: { type: String, required: true },

  bodyStructure: {
    type: String,
    enum: ['observational', 'reframe', 'instructional', 'celebratory', 'contrarian', 'prophecy', 'unknown'],
    default: 'unknown'
  },
  hookType: {
    type: String,
    enum: ['community-observation', 'direct-address', 'curiosity-gap', 'declarative', 'unknown'],
    default: 'unknown'
  },
  closerType: {
    type: String,
    enum: ['identity-statement', 'question', 'practice-list', 'benediction', 'unknown'],
    default: 'unknown'
  },

  intelSnapshot: { type: mongoose.Schema.Types.Mixed },
  modelUsed: { type: String, default: '' },

  recipients: { type: Number, default: 0 },
  opens: { type: Number, default: 0 },
  openRate: { type: Number, default: 0 },
  clicks: { type: Number, default: 0 },
  clickRate: { type: Number, default: 0 },
  unsubs: { type: Number, default: 0 },
  unsubRate: { type: Number, default: 0 },

  rollingAverageOpenRate: { type: Number, default: 0 },
  performanceDelta: { type: Number, default: 0 },
  performanceTier: {
    type: String,
    enum: ['strong', 'normal', 'weak', 'pending'],
    default: 'pending'
  },

  sentAt: { type: Date, required: true },
  performanceMeasuredAt: { type: Date }
}, {
  timestamps: true
});

// Most recent first
emailBroadcastSchema.statics.getRecent = async function (limit = 12) {
  return this.find({}).sort({ sentAt: -1 }).limit(limit).lean();
};

module.exports = mongoose.model('EmailBroadcast', emailBroadcastSchema);
