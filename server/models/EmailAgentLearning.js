// server/models/EmailAgentLearning.js
// ============================================================
// EMAIL AGENT LEARNING — Synthesized insights from past broadcasts
// ============================================================
//
// Written by analyzeAndLearnFromBroadcasts() after comparing top 3 vs
// bottom 3 measured sends. The latest doc gets injected into the next
// draft prompt so Opus stops repeating losing patterns.

const mongoose = require('mongoose');

const emailAgentLearningSchema = new mongoose.Schema({
  winningPatterns: { type: [String], default: [] },
  losingPatterns: { type: [String], default: [] },

  subjectLineInsights: { type: String, default: '' },
  structureInsights: { type: String, default: '' },
  voiceInsights: { type: String, default: '' },

  warningsForNextSend: { type: [String], default: [] },

  analyzedBroadcastIds: { type: [String], default: [] },
  topPerformerIds: { type: [String], default: [] },
  bottomPerformerIds: { type: [String], default: [] },

  analyzedAt: { type: Date, required: true }
}, {
  timestamps: true
});

emailAgentLearningSchema.statics.getLatest = async function () {
  return this.findOne({}).sort({ analyzedAt: -1 }).lean();
};

module.exports = mongoose.model('EmailAgentLearning', emailAgentLearningSchema);
