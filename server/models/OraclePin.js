// server/models/OraclePin.js
// Stores Oracle messages pinned to specific journey days
const mongoose = require('mongoose');

const oraclePinSchema = new mongoose.Schema({
  username: { type: String, required: true, index: true },
  date: { type: String, required: true }, // "yyyy-MM-dd" format
  message: { type: String, required: true },
  messageTimestamp: { type: String, required: true }, // ISO timestamp of original Oracle message
  pinnedAt: { type: Date, default: Date.now }
});

// Fast lookups: pins for a user in a date range (calendar month fetch)
oraclePinSchema.index({ username: 1, date: 1 });

// Dedup: prevent pinning the same Oracle message twice
oraclePinSchema.index({ username: 1, messageTimestamp: 1 }, { unique: true });

module.exports = mongoose.model('OraclePin', oraclePinSchema);
