// server/models/OracleThread.js
// Oracle conversation threads — one doc per thread, embedded messages.
// Replaces the single-rolling-window OracleChatHistory for users who have
// any threads created. OracleChatHistory stays for back-compat (lazy migration).
//
// Design notes:
// - threadId is a client-generated UUID so the client can optimistically render
//   a new thread without a server round-trip.
// - Messages cap at 200 per thread (vs the legacy 50 global) — generous enough
//   to feel "infinite" in practice, bounded enough to keep doc size sane.
// - Compound index (username, lastMessageAt) for the sidebar list (sorted DESC).

const mongoose = require('mongoose');

const MAX_MESSAGES_PER_THREAD = 200;

const oracleMessageSchema = new mongoose.Schema({
  role: { type: String, enum: ['user', 'assistant'], required: true },
  content: { type: String, required: true },
  timestamp: { type: String }, // ISO string from frontend
  isTransmission: { type: Boolean, default: false }
}, { _id: false });

const oracleThreadSchema = new mongoose.Schema({
  username: { type: String, required: true, index: true },
  threadId: { type: String, required: true }, // client-generated uuid

  title: { type: String, default: '' }, // empty until auto-title runs
  isPinned: { type: Boolean, default: false },
  isArchived: { type: Boolean, default: false },

  messages: { type: [oracleMessageSchema], default: [] },
  messageCount: { type: Number, default: 0 },

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  lastMessageAt: { type: Date, default: Date.now }
}, {
  timestamps: false // managed manually so PUT sync is explicit
});

// One thread per (user, threadId)
oracleThreadSchema.index({ username: 1, threadId: 1 }, { unique: true });
// Sidebar listing — newest first
oracleThreadSchema.index({ username: 1, lastMessageAt: -1 });

oracleThreadSchema.statics.MAX_MESSAGES_PER_THREAD = MAX_MESSAGES_PER_THREAD;

module.exports = mongoose.model('OracleThread', oracleThreadSchema);
