// server/models/BannedIP.js
const mongoose = require('mongoose');

const bannedIPSchema = new mongoose.Schema({
  ip: { type: String, required: true, unique: true },
  reason: { type: String, default: 'Multi-account abuse' },
  bannedBy: { type: String, default: 'admin' }, // username of admin who banned
  bannedAt: { type: Date, default: Date.now },
  // Store associated usernames at time of ban for reference
  associatedUsernames: [String]
});

bannedIPSchema.index({ ip: 1 });

module.exports = mongoose.model('BannedIP', bannedIPSchema);
