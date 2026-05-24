// server/models/CircleCheckIn.js
//
// One check-in per user per day per circle. Upserted on the (circleId,
// username, date) tuple — if a user changes their note during the day,
// the existing row is updated rather than appended. The date field is a
// "yyyy-MM-dd" string in the user's local timezone, computed client-side
// and validated server-side, so day boundaries respect the user.

const mongoose = require('mongoose');

const NOTE_MAX = 140;

const circleCheckInSchema = new mongoose.Schema({
  circleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Circle', required: true, index: true },
  username: { type: String, required: true },

  // "yyyy-MM-dd" in the user's local timezone. One check-in per user per
  // day. Combined unique index below enforces this.
  date: {
    type: String,
    required: true,
    match: /^\d{4}-\d{2}-\d{2}$/
  },

  // Streak day at the moment of check-in. Frozen here so the row reflects
  // what the user told their circle, not what the streak math may say
  // later (e.g. after a delete-relapse).
  streakDay: { type: Number, default: 0 },

  // The user's free-text note. Optional. Capped short to keep the feed
  // scannable — this is presence, not a journal entry.
  note: { type: String, default: '', maxlength: NOTE_MAX, trim: true },

  // Auto-generated one-line summary of today's benefit log
  // (e.g. "Energy steady · Focus up · Sleep down"). Computed by the
  // route handler from the user's most recent benefitTracking entry so
  // we don't recompute it on every read.
  benefitSummary: { type: String, default: '' }
}, { timestamps: true });

// One check-in per user per day per circle — upsert key.
circleCheckInSchema.index({ circleId: 1, username: 1, date: 1 }, { unique: true });

// Fast "show me today's check-ins for this circle" query.
circleCheckInSchema.index({ circleId: 1, date: 1 });

circleCheckInSchema.statics.NOTE_MAX = NOTE_MAX;

const CircleCheckIn = mongoose.model('CircleCheckIn', circleCheckInSchema);

module.exports = CircleCheckIn;
