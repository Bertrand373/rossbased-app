// server/models/User.js
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: String,
  startDate: Date,
  currentStreak: Number,
  longestStreak: Number,
  wetDreamCount: Number,
  relapseCount: Number,
  isPremium: Boolean,
  badges: [{ id: Number, name: String, earned: Boolean, date: Date }],
  benefitTracking: [{ date: Date, energy: Number, focus: Number, confidence: Number }],
  streakHistory: [{ id: Number, start: Date, end: Date, days: Number, reason: String }],
  urgeToolUsage: [{ date: Date, tool: String, effective: Boolean }],
  discordUsername: String,
  showOnLeaderboard: Boolean,
  notes: Object
});

const User = mongoose.model('User', userSchema);

module.exports = User;