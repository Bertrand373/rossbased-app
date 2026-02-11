// server/models/User.js
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: String,
  email: String,
  googleId: String,
  discordId: String,
  discordAvatar: String,
  discordDisplayName: String, // What people see in Discord (global_name)
  startDate: Date,
  
  // NEW: Birth date for Energy Almanac calculations (numerology, Chinese zodiac)
  birthDate: Date,
  
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
  emotionalLog: [{ 
    date: Date, 
    day: Number, 
    phase: Number, 
    anxiety: Number, 
    mood: Number, 
    clarity: Number, 
    processing: Number 
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
  announceDiscordMilestones: { type: Boolean, default: false },
  
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
  
  // Theme preference
  theme: { type: String, enum: ['dark', 'light'], default: 'dark' },
  
  // ============================================
  // SUBSCRIPTION & PAYMENT SYSTEM
  // ============================================
  subscription: {
    // Status determines access level
    // 'none'          = never subscribed (default for new users)
    // 'trial'         = 7-day free trial active
    // 'active'        = paying subscriber
    // 'canceled'      = canceled but still has access until period end
    // 'expired'       = trial or subscription ended, no access
    // 'grandfathered'  = lifetime free access (Discord OG members)
    status: { 
      type: String, 
      enum: ['none', 'trial', 'active', 'canceled', 'expired', 'grandfathered'], 
      default: 'none' 
    },
    
    // Plan type
    plan: { 
      type: String, 
      enum: ['none', 'monthly', 'yearly', 'lifetime'], 
      default: 'none' 
    },
    
    // Stripe identifiers
    stripeCustomerId: { type: String, default: null },
    stripeSubscriptionId: { type: String, default: null },
    
    // Trial tracking
    trialStartDate: { type: Date, default: null },
    trialEndDate: { type: Date, default: null },
    
    // Billing cycle
    currentPeriodStart: { type: Date, default: null },
    currentPeriodEnd: { type: Date, default: null },
    
    // Cancellation
    cancelAtPeriodEnd: { type: Boolean, default: false },
    canceledAt: { type: Date, default: null },
    
    // Grandfather tracking
    grandfatheredAt: { type: Date, default: null },
    grandfatheredReason: { type: String, default: null } // 'discord_og', 'manual', etc.
  },
  
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
  },
  
  // AI Chat Usage Tracking
  aiUsage: {
    type: {
      date: String,
      count: { type: Number, default: 0 },
      lifetimeCount: { type: Number, default: 0 },
      lastUsed: Date
    },
    default: {
      date: '',
      count: 0,
      lifetimeCount: 0,
      lastUsed: null
    }
  },
  
  // Daily Transmission Cache
  // Stores the AI-generated transmission for the current day
  dailyTransmission: {
    text: { type: String, default: '' },
    generatedAt: { type: Date },
    forStreak: { type: Number, default: 0 },
    phase: { type: String, default: '' }
  }
  
}, {
  timestamps: true
});

// ============================================
// VIRTUAL: Computed premium status
// Returns true if user has active access (trial, active, canceled-but-not-expired, or grandfathered)
// ============================================
userSchema.virtual('hasPremiumAccess').get(function() {
  const sub = this.subscription;
  if (!sub) return false;
  
  const now = new Date();
  
  switch (sub.status) {
    case 'grandfathered':
      return true;
    case 'active':
      return true;
    case 'trial':
      return sub.trialEndDate ? now < sub.trialEndDate : false;
    case 'canceled':
      // Still has access until period end
      return sub.currentPeriodEnd ? now < sub.currentPeriodEnd : false;
    case 'expired':
    case 'none':
    default:
      return false;
  }
});

// Ensure virtuals are included in JSON/Object output
userSchema.set('toJSON', { virtuals: true });
userSchema.set('toObject', { virtuals: true });

// Indexes for efficient queries
userSchema.index({ showOnLeaderboard: 1, currentStreak: -1 });
userSchema.index({ mentorEligible: 1, verifiedMentor: 1 });
userSchema.index({ discordId: 1 });
userSchema.index({ googleId: 1 });
userSchema.index({ email: 1 });
userSchema.index({ 'subscription.status': 1 });
userSchema.index({ 'subscription.stripeCustomerId': 1 });

const User = mongoose.model('User', userSchema);

module.exports = User;
