// server/models/EmailAgentState.js
// ============================================================
// EMAIL AGENT STATE — Persists agent configuration & history
// ============================================================

const mongoose = require('mongoose');

const emailAgentStateSchema = new mongoose.Schema({
  // Singleton key — only one document ever exists
  _key: { type: String, default: 'email-agent', unique: true },

  // Current warmup tier (1-4)
  // Tier 1: Engaged openers only (~120 people)
  // Tier 2: Anyone who opened in last 90 days (~300-500)
  // Tier 3: All confirmed subscribers (~800+)
  // Tier 4: Full list (~1,300)
  currentTier: { type: Number, default: 1, min: 1, max: 4 },

  // Kit tag IDs for each tier (tags, not segments)
  tierTags: {
    tier1: { type: String, default: '17485402' }, // engaged-opener tag
    tier2: { type: String, default: '' },
    tier3: { type: String, default: '' },
    tier4: { type: String, default: '' }  // empty = full list (no filter)
  },

  // Approval mode: 'approve' (default), 'auto-send', 'draft-only'
  approvalMode: { type: String, default: 'approve', enum: ['approve', 'auto-send', 'draft-only'] },

  // Send cadence
  cadence: { type: String, default: 'weekly', enum: ['weekly', 'twice-weekly'] },
  sendDay: { type: Number, default: 0 },     // 0=Sunday (was 5=Friday)
  sendHour: { type: Number, default: 12 },    // Noon ET

  // Tracking
  totalSent: { type: Number, default: 0 },
  consecutiveGoodSends: { type: Number, default: 0 },  // 50%+ open rate

  // Last broadcast info
  lastBroadcast: {
    kitBroadcastId: String,
    subject: String,
    sentAt: Date,
    openRate: Number,
    clickRate: Number,
    recipientCount: Number,
    tier: Number
  },

  // Warmup context (what the agent "knows" about reputation state)
  warmupContext: {
    domainReputation: { type: String, default: 'medium' }, // bad, medium, high
    lastReputationCheck: Date,
    notes: { type: String, default: '' }
  }
}, {
  timestamps: true
});

// Always return the singleton (create if missing)
emailAgentStateSchema.statics.getState = async function () {
  let state = await this.findOne({ _key: 'email-agent' });
  if (!state) {
    state = await this.create({ _key: 'email-agent' });
  }
  return state;
};

module.exports = mongoose.model('EmailAgentState', emailAgentStateSchema);
