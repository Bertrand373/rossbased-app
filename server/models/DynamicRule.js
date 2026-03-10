// server/models/DynamicRule.js
// Active Oracle rules that get injected into the system prompt dynamically
// No redeployment needed — approved rules load on every conversation
// Ross can activate/deactivate from the admin panel with full timestamps

const mongoose = require('mongoose');

const dynamicRuleSchema = new mongoose.Schema({
  // The rule text that gets appended to Oracle's system prompt
  rule: { type: String, required: true },

  // What section of Oracle's behavior this affects
  category: {
    type: String,
    enum: ['voice', 'tone', 'knowledge', 'anti-pattern', 'context-rule', 'discovery'],
    default: 'voice'
  },

  // Where this rule came from
  source: {
    type: String,
    enum: ['evolution-pipeline', 'pattern-discovery', 'manual', 'opus-verified'],
    default: 'evolution-pipeline'
  },

  // Link to the OracleEvolution record that proposed this
  proposalId: { type: mongoose.Schema.Types.ObjectId, ref: 'OracleEvolution' },

  // Approval chain
  opusVerified: { type: Boolean, default: false },
  opusAssessment: String,          // Opus's reasoning for approving/flagging
  opusConfidence: Number,          // 0-1
  
  // Status
  active: { type: Boolean, default: true, index: true },
  activatedAt: { type: Date, default: Date.now },
  deactivatedAt: Date,
  deactivatedReason: String,

  // For rollback — know exactly when each rule went live
  // If something breaks at 3pm, find rules activated after 2pm
  activatedBy: {
    type: String,
    enum: ['opus-auto', 'admin-manual'],
    default: 'opus-auto'
  }

}, { timestamps: true });

// Fast lookup for active rules (called on every Oracle conversation)
dynamicRuleSchema.index({ active: 1, activatedAt: -1 });

module.exports = mongoose.model('DynamicRule', dynamicRuleSchema);
