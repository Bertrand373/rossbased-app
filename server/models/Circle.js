// server/models/Circle.js
//
// A Circle is a 3-5 person private accountability group. Invite-by-code:
// the creator generates a circle, gets a 6-char code, shares it with
// people they know. Each member's daily Tracker log can be shared as a
// brief check-in visible only to their circle. Quiet daily presence —
// no chat, no feed, just structured check-ins and shared streak counts.

const mongoose = require('mongoose');

const MAX_MEMBERS = 5;
const NAME_MAX = 40;
const CODE_LENGTH = 6;
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // omit I/O/1/0 to avoid confusion when reading codes aloud

const memberSchema = new mongoose.Schema({
  username: { type: String, required: true },
  joinedAt: { type: Date, default: Date.now },
  role: { type: String, enum: ['creator', 'member'], default: 'member' }
}, { _id: false });

const circleSchema = new mongoose.Schema({
  // Short, human-readable invite code. Generated on create, regeneratable
  // by the creator. Uniqueness enforced at create-time with retry loop.
  code: { type: String, required: true, unique: true, uppercase: true },

  // Display name set by the creator. Required so members know which
  // circle they're looking at. Shown in the sheet header.
  name: { type: String, required: true, maxlength: NAME_MAX, trim: true },

  members: {
    type: [memberSchema],
    validate: {
      validator: arr => arr.length <= MAX_MEMBERS,
      message: `A circle cannot have more than ${MAX_MEMBERS} members`
    }
  },

  status: {
    type: String,
    enum: ['active', 'archived'],
    default: 'active'
  },

  createdBy: { type: String, required: true },
  lastActivityAt: { type: Date, default: Date.now },
  archivedAt: { type: Date, default: null }
}, { timestamps: true });

// Fast member lookup — most queries are "find the circle this user is in"
circleSchema.index({ 'members.username': 1, status: 1 });

// Constants exposed for routes
circleSchema.statics.MAX_MEMBERS = MAX_MEMBERS;
circleSchema.statics.NAME_MAX = NAME_MAX;
circleSchema.statics.CODE_LENGTH = CODE_LENGTH;

// Generate a fresh code. Caller is responsible for uniqueness retries
// (collision rate at 6 chars from 32-char alphabet is ~1 in 1B per pair —
// negligible, but we still verify in the create endpoint).
circleSchema.statics.generateCode = function () {
  let code = '';
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return code;
};

const Circle = mongoose.model('Circle', circleSchema);

module.exports = Circle;
