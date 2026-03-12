// server/models/OracleChatHistory.js
// Server-side Oracle chat history for cross-device sync
// One document per user, capped at 50 messages (matches localStorage cap)
// Pattern follows DiscordMemory.js

const mongoose = require('mongoose');

const oracleChatHistorySchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, index: true },

  // Rolling conversation history (capped at 50 messages)
  messages: [{
    role: { type: String, enum: ['user', 'assistant'], required: true },
    content: { type: String, required: true },
    timestamp: { type: String }, // ISO string from frontend
    isTransmission: { type: Boolean, default: false }
  }],

  updatedAt: { type: Date, default: Date.now }
}, {
  timestamps: false // We manage updatedAt manually
});

module.exports = mongoose.model('OracleChatHistory', oracleChatHistorySchema);
