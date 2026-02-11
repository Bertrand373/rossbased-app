// server/models/OracleUsage.js
// Persists Oracle Discord bot daily usage to MongoDB
// Survives server restarts — no more free resets

const mongoose = require('mongoose');

const oracleUsageSchema = new mongoose.Schema({
  discordUserId: { type: String, required: true },
  date: { type: String, required: true }, // YYYY-MM-DD format
  count: { type: Number, default: 0 },
}, { timestamps: true });

// One record per user per day — upsert pattern
oracleUsageSchema.index({ discordUserId: 1, date: 1 }, { unique: true });

// Auto-delete records older than 7 days (cleanup)
oracleUsageSchema.index({ createdAt: 1 }, { expireAfterSeconds: 604800 });

module.exports = mongoose.model('OracleUsage', oracleUsageSchema);
