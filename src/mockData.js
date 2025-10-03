// Add these 3 test users to your mockData.js file
// Place them AFTER the ENFP user and BEFORE the "EXISTING ALTERNATIVE SCENARIOS" section

// ========================================
// AI PROGRESSION TEST USERS
// ========================================

// AI Test User 1: NO AI (Building Data Phase - 15 days, not ready yet)
export const aiTestUser1 = {
  username: 'aitest1',
  email: 'aitest1@example.com',
  startDate: subDays(new Date(), 15), // 15 days
  currentStreak: 15,
  longestStreak: 15,
  wetDreamCount: 0,
  relapseCount: 2, // Has relapse history for AI training
  isPremium: true,
  badges: getEarnedBadges(15),
  benefitTracking: createBenefitTracking(subDays(new Date(), 15), 15, 'good'),
  streakHistory: [
    {
      id: 1,
      start: subDays(new Date(), 30),
      end: subDays(new Date(), 23),
      days: 7,
      reason: 'relapse',
      trigger: 'stress'
    },
    {
      id: 2,
      start: subDays(new Date(), 22),
      end: subDays(new Date(), 16),
      days: 6,
      reason: 'relapse',
      trigger: 'social_media'
    },
    {
      id: 3,
      start: subDays(new Date(), 15),
      end: null, // Current streak
      days: 15,
      reason: null,
      trigger: null
    }
  ],
  emotionalTracking: [
    {
      date: new Date(),
      day: 15,
      phase: 2,
      anxiety: 5,
      moodStability: 6,
      mentalClarity: 7,
      emotionalProcessing: 6
    }
  ],
  urgeLog: [],
  notes: {
    [format(new Date(), 'yyyy-MM-dd')]: "Day 15 - Getting close to unlocking AI predictions! Excited to see what patterns it finds."
  },
  discordUsername: 'AITester1#0001',
  showOnLeaderboard: false,
  dataSharing: false,
  analyticsOptIn: true,
  marketingEmails: false,
  darkMode: true,
  notifications: true,
  language: 'en',
  wisdomMode: false,
  urgeToolUsage: []
};

// AI Test User 2: READY TO TRAIN (Has 20+ days, can train but hasn't yet)
export const aiTestUser2 = {
  username: 'aitest2',
  email: 'aitest2@example.com',
  startDate: subDays(new Date(), 23), // 23 days
  currentStreak: 23,
  longestStreak: 23,
  wetDreamCount: 1,
  relapseCount: 3, // Has relapse history for AI training
  isPremium: true,
  badges: getEarnedBadges(23),
  benefitTracking: createBenefitTracking(subDays(new Date(), 23), 23, 'high'), // Good tracking consistency
  streakHistory: [
    {
      id: 1,
      start: subDays(new Date(), 50),
      end: subDays(new Date(), 42),
      days: 8,
      reason: 'relapse',
      trigger: 'boredom'
    },
    {
      id: 2,
      start: subDays(new Date(), 41),
      end: subDays(new Date(), 30),
      days: 11,
      reason: 'relapse',
      trigger: 'stress'
    },
    {
      id: 3,
      start: subDays(new Date(), 29),
      end: subDays(new Date(), 24),
      days: 5,
      reason: 'relapse',
      trigger: 'social_media'
    },
    {
      id: 4,
      start: subDays(new Date(), 23),
      end: null, // Current streak
      days: 23,
      reason: null,
      trigger: null
    }
  ],
  emotionalTracking: [
    {
      date: new Date(),
      day: 23,
      phase: 3,
      anxiety: 4,
      moodStability: 7,
      mentalClarity: 8,
      emotionalProcessing: 7
    }
  ],
  urgeLog: [
    {
      date: subDays(new Date(), 10),
      intensity: 6,
      trigger: 'stress',
      protocol: 'breathing',
      phase: 'Emotional Purging Phase',
      day: 13
    }
  ],
  notes: {
    [format(new Date(), 'yyyy-MM-dd')]: "Day 23! Finally have enough data to train the AI. Should I do it now or wait a bit longer?"
  },
  discordUsername: 'AITester2#0002',
  showOnLeaderboard: false,
  dataSharing: false,
  analyticsOptIn: true,
  marketingEmails: false,
  darkMode: true,
  notifications: true,
  language: 'en',
  wisdomMode: false,
  urgeToolUsage: []
};

// AI Test User 3: MODEL ACTIVE (Trained AI, making predictions)
export const aiTestUser3 = {
  username: 'aitest3',
  email: 'aitest3@example.com',
  startDate: subDays(new Date(), 45), // 45 days - in spiritual awakening phase
  currentStreak: 45,
  longestStreak: 45,
  wetDreamCount: 2,
  relapseCount: 4, // Has relapse history for AI training
  isPremium: true,
  badges: getEarnedBadges(45),
  benefitTracking: createBenefitTracking(subDays(new Date(), 45), 45, 'high'), // Excellent tracking
  streakHistory: [
    {
      id: 1,
      start: subDays(new Date(), 120),
      end: subDays(new Date(), 110),
      days: 10,
      reason: 'relapse',
      trigger: 'stress'
    },
    {
      id: 2,
      start: subDays(new Date(), 109),
      end: subDays(new Date(), 95),
      days: 14,
      reason: 'relapse',
      trigger: 'loneliness'
    },
    {
      id: 3,
      start: subDays(new Date(), 94),
      end: subDays(new Date(), 70),
      days: 24,
      reason: 'relapse',
      trigger: 'social_media'
    },
    {
      id: 4,
      start: subDays(new Date(), 69),
      end: subDays(new Date(), 46),
      days: 23,
      reason: 'relapse',
      trigger: 'home_environment'
    },
    {
      id: 5,
      start: subDays(new Date(), 45),
      end: null, // Current streak - longest yet!
      days: 45,
      reason: null,
      trigger: null
    }
  ],
  emotionalTracking: [
    {
      date: new Date(),
      day: 45,
      phase: 4, // Spiritual awakening phase
      anxiety: 2,
      moodStability: 9,
      mentalClarity: 9,
      emotionalProcessing: 9
    },
    {
      date: subDays(new Date(), 7),
      day: 38,
      phase: 3,
      anxiety: 3,
      moodStability: 8,
      mentalClarity: 8,
      emotionalProcessing: 8
    },
    {
      date: subDays(new Date(), 15),
      day: 30,
      phase: 3,
      anxiety: 3,
      moodStability: 8,
      mentalClarity: 8,
      emotionalProcessing: 7
    }
  ],
  urgeLog: [
    {
      date: subDays(new Date(), 20),
      intensity: 5,
      trigger: 'stress',
      protocol: 'breathing',
      phase: 'Mental Expansion Phase',
      day: 25
    },
    {
      date: subDays(new Date(), 8),
      intensity: 4,
      trigger: 'social_media',
      protocol: 'redirect',
      phase: 'Spiritual Awakening Phase',
      day: 37
    }
  ],
  notes: {
    [format(subDays(new Date(), 20), 'yyyy-MM-dd')]: "Day 25 - Trained the AI model! Accuracy is 87%. Excited to see how accurate the predictions are.",
    [format(subDays(new Date(), 10), 'yyyy-MM-dd')]: "Day 35 - The AI predicted high risk yesterday evening and it was RIGHT. Got the notification, did breathing exercises, urge passed. This is incredible!",
    [format(new Date(), 'yyyy-MM-dd')]: "Day 45 - Longest streak ever! The AI has been spot-on with predictions. It's like having a personal coach that knows my patterns better than I do."
  },
  discordUsername: 'AITester3#0003',
  showOnLeaderboard: true,
  dataSharing: true, // Sharing to help others
  analyticsOptIn: true,
  marketingEmails: false,
  darkMode: true,
  notifications: true, // Has notifications enabled
  language: 'en',
  wisdomMode: false,
  urgeToolUsage: [
    {
      date: subDays(new Date(), 20),
      tool: 'breathing',
      effective: true
    },
    {
      date: subDays(new Date(), 8),
      tool: 'redirect',
      effective: true
    }
  ]
};