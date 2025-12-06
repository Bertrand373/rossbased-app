// server/models/User.js
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: String,
  email: String,
  googleId: String,
  discordId: String,
  startDate: Date,
  currentStreak: { type: Number, default: 0 },
  longestStreak: { type: Number, default: 0 },
  wetDreamCount: { type: Number, default: 0 },
  relapseCount: { type: Number, default: 0 },
  isPremium: { type: Boolean, default: false },
  hasSeenOnboarding: { type: Boolean, default: false },
  badges: [{ id: Number, name: String, earned: Boolean, date: Date }],
  benefitTracking: [{ 
    date: Date, 
    energy: Number, 
    focus: Number, 
    confidence: Number, 
    aura: Number, 
    sleep: Number, 
    workout: Number 
  }],
  emotionalTracking: [{ 
    date: Date, 
    day: Number, 
    phase: Number, 
    anxiety: Number, 
    moodStability: Number, 
    mentalClarity: Number, 
    emotionalProcessing: Number 
  }],
  streakHistory: [{ 
    id: Number, 
    start: Date, 
    end: Date, 
    days: Number, 
    reason: String, 
    trigger: String 
  }],
  urgeToolUsage: [{ date: Date, tool: String, effective: Boolean }],
  urgeLog: [{ 
    date: Date, 
    intensity: Number, 
    trigger: String, 
    toolUsed: String, 
    overcame: Boolean 
  }],
  
  // Discord Integration
  discordUsername: { type: String, default: '' },
  showOnLeaderboard: { type: Boolean, default: false },
  
  // Mentor System Fields
  mentorEligible: { type: Boolean, default: false },
  verifiedMentor: { type: Boolean, default: false },
  mentorStatus: { 
    type: String, 
    enum: ['available', 'busy', 'inactive'], 
    default: 'inactive' 
  },
  lastMilestoneAnnounced: { type: Number, default: 0 },
  
  // General
  notes: { type: Object, default: {} },
  
  // Notification preferences
  notificationPreferences: {
    type: Object,
    default: {
      quietHoursEnabled: false,
      quietHoursStart: '22:00',
      quietHoursEnd: '08:00',
      types: {
        milestones: true,
        urgeSupport: true,
        weeklyProgress: true
      },
      dailyReminderEnabled: false,
      dailyReminderTime: '09:00'
    }
  }
});

// Indexes for efficient queries
userSchema.index({ showOnLeaderboard: 1, currentStreak: -1 });
userSchema.index({ mentorEligible: 1, verifiedMentor: 1 });
userSchema.index({ discordId: 1 });
userSchema.index({ googleId: 1 });
userSchema.index({ email: 1 });

const User = mongoose.model('User', userSchema);

module.exports = User;