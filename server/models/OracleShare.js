// server/models/OracleShare.js
// Stores shared Oracle messages with short IDs for public share links
// Each share creates a permanent branded page at titantrack.app/o/:shareId

const mongoose = require('mongoose');
const crypto = require('crypto');

const oracleShareSchema = new mongoose.Schema({
  shareId: {
    type: String,
    required: true,
    unique: true,
    index: true,
    default: () => crypto.randomBytes(4).toString('hex') // 8-char hex
  },
  message: { type: String, required: true },
  username: { type: String, required: true },
  isTransmission: { type: Boolean, default: false }
}, { timestamps: true });

// Auto-delete shares after 90 days
oracleShareSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

module.exports = mongoose.model('OracleShare', oracleShareSchema);
