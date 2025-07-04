// src/mockData.js - COMPREHENSIVE test data covering ALL scenarios
export const comprehensiveMockData = {
  username: 'testuser',
  email: 'testuser@example.com',
  
  // SCENARIO: User started 120 days ago, had multiple relapses with different triggers
  startDate: new Date(new Date().setDate(new Date().getDate() - 25)), // Current streak: 25 days
  currentStreak: 25,
  longestStreak: 47, // Their best streak so far
  wetDreamCount: 3,
  relapseCount: 4, // Had 4 relapses total
  isPremium: true,
  
  // COMPREHENSIVE: Complete streak history showing the full journey
  streakHistory: [
    // First attempt: 14 days, relapsed due to stress
    {
      id: 1,
      start: new Date(new Date().setDate(new Date().getDate() - 120)), // 120 days ago
      end: new Date(new Date().setDate(new Date().getDate() - 106)), // Relapsed after 14 days
      days: 14,
      reason: 'relapse',
      trigger: 'stress'
    },
    
    // Second attempt: 8 days, relapsed due to explicit content
    {
      id: 2,
      start: new Date(new Date().setDate(new Date().getDate() - 105)), // Next day after relapse
      end: new Date(new Date().setDate(new Date().getDate() - 97)), // Relapsed after 8 days
      days: 8,
      reason: 'relapse',
      trigger: 'explicit_content'
    },
    
    // Third attempt: BEST STREAK - 47 days, relapsed due to loneliness
    {
      id: 3,
      start: new Date(new Date().setDate(new Date().getDate() - 96)), // Next day after relapse
      end: new Date(new Date().setDate(new Date().getDate() - 49)), // Relapsed after 47 days
      days: 47,
      reason: 'relapse',
      trigger: 'loneliness'
    },
    
    // Fourth attempt: 22 days, relapsed due to being home alone
    {
      id: 4,
      start: new Date(new Date().setDate(new Date().getDate() - 48)), // Next day after relapse
      end: new Date(new Date().setDate(new Date().getDate() - 26)), // Relapsed after 22 days
      days: 22,
      reason: 'relapse',
      trigger: 'home_alone'
    },
    
    // CURRENT STREAK: 25 days and counting (started 25 days ago)
    {
      id: 5,
      start: new Date(new Date().setDate(new Date().getDate() - 25)), // Current streak start
      end: null, // Still active
      days: 25,
      reason: null,
      trigger: null
    }
  ],

  // COMPREHENSIVE: Badge progress (some earned, some not) - UPDATED with 6 badges
  badges: [
    { id: 1, name: '7-Day Warrior', earned: true, date: new Date(new Date().setDate(new Date().getDate() - 18)) },
    { id: 2, name: '14-Day Monk', earned: true, date: new Date(new Date().setDate(new Date().getDate() - 11)) },
    { id: 3, name: '30-Day Master', earned: false, date: null }, // Close but not yet earned
    { id: 4, name: '90-Day King', earned: false, date: null },
    { id: 5, name: '180-Day Emperor', earned: false, date: null },
    { id: 6, name: '365-Day Sage', earned: false, date: null }
  ],

  // COMPREHENSIVE: Benefit tracking for the last 10 days (mix of high and low days)
  benefitTracking: [
    // Recent days - current streak
    {
      date: new Date(), // Today
      energy: 8,
      focus: 9,
      confidence: 7,
      aura: 8,
      sleep: 8,
      workout: 9
    },
    {
      date: new Date(new Date().setDate(new Date().getDate() - 1)), // Yesterday
      energy: 7,
      focus: 8,
      confidence: 6,
      aura: 7,
      sleep: 7,
      workout: 8
    },
    {
      date: new Date(new Date().setDate(new Date().getDate() - 2)), // 2 days ago
      energy: 9,
      focus: 8,
      confidence: 8,
      aura: 9,
      sleep: 9,
      workout: 7
    },
    {
      date: new Date(new Date().setDate(new Date().getDate() - 3)), // 3 days ago
      energy: 6,
      focus: 7,
      confidence: 5,
      aura: 6,
      sleep: 6,
      workout: 8
    },
    {
      date: new Date(new Date().setDate(new Date().getDate() - 4)), // 4 days ago
      energy: 8,
      focus: 9,
      confidence: 7,
      aura: 8,
      sleep: 8,
      workout: 9
    },
    {
      date: new Date(new Date().setDate(new Date().getDate() - 5)), // 5 days ago
      energy: 5,
      focus: 6,
      confidence: 4,
      aura: 5,
      sleep: 5,
      workout: 6
    },
    // Week ago data
    {
      date: new Date(new Date().setDate(new Date().getDate() - 7)), // 1 week ago
      energy: 7,
      focus: 8,
      confidence: 6,
      aura: 7,
      sleep: 7,
      workout: 8
    }
  ],

  // COMPREHENSIVE: Emotional tracking for each phase of the streak
  emotionalTracking: [
    // Current phase entry (Day 25 - Mental Expansion phase)
    {
      date: new Date(), // Today
      day: 25,
      phase: 3, // Mental Expansion (days 15-45)
      anxiety: 3,
      moodStability: 8,
      mentalClarity: 9,
      emotionalProcessing: 7
    },
    
    // A week ago - still in Mental Expansion
    {
      date: new Date(new Date().setDate(new Date().getDate() - 7)),
      day: 18,
      phase: 3,
      anxiety: 4,
      moodStability: 7,
      mentalClarity: 8,
      emotionalProcessing: 6
    },
    
    // Two weeks ago - transition from Emotional Purging to Mental Expansion
    {
      date: new Date(new Date().setDate(new Date().getDate() - 14)),
      day: 11,
      phase: 2, // Emotional Purging (days 1-14)
      anxiety: 7,
      moodStability: 4,
      mentalClarity: 5,
      emotionalProcessing: 3
    },
    
    // Three weeks ago - early streak, Emotional Purging phase
    {
      date: new Date(new Date().setDate(new Date().getDate() - 21)),
      day: 4,
      phase: 2,
      anxiety: 9,
      moodStability: 2,
      mentalClarity: 3,
      emotionalProcessing: 2
    }
  ],

  // COMPREHENSIVE: Urge log showing improvement over time
  urgeLog: [
    // Day 3 - worst urge during early streak
    {
      date: new Date(new Date().setDate(new Date().getDate() - 22)),
      intensity: 9,
      trigger: 'lustful_thoughts',
      protocol: 'timer',
      phase: 'Emotional Purging Phase',
      day: 3
    },
    
    // Day 7 - still struggling but improving
    {
      date: new Date(new Date().setDate(new Date().getDate() - 18)),
      intensity: 7,
      trigger: 'stress',
      protocol: 'breathing',
      phase: 'Emotional Purging Phase',
      day: 7
    },
    
    // Day 12 - moderate urge handled well
    {
      date: new Date(new Date().setDate(new Date().getDate() - 13)),
      intensity: 6,
      trigger: 'boredom',
      protocol: 'redirect',
      phase: 'Emotional Purging Phase',
      day: 12
    },
    
    // Day 20 - minor urge, easily handled
    {
      date: new Date(new Date().setDate(new Date().getDate() - 5)),
      intensity: 3,
      trigger: 'social_media',
      protocol: 'affirmation',
      phase: 'Mental Expansion Phase',
      day: 20
    }
  ],

  // COMPREHENSIVE: Journal notes throughout the streak
  notes: {
    // Today
    [new Date().toISOString().split('T')[0]]: "Day 25 and feeling stronger than ever. The Mental Expansion phase is real - my focus at work has been incredible. People keep asking me what's different about me. I can actually feel the confidence building.",
    
    // Yesterday
    [new Date(new Date().setDate(new Date().getDate() - 1)).toISOString().split('T')[0]]: "Had some stress at work and felt urges creeping in. Used the breathing protocol and it really helped. Amazing how much stronger I feel compared to my early days. The emotional processing is getting so much easier.",
    
    // 3 days ago
    [new Date(new Date().setDate(new Date().getDate() - 3)).toISOString().split('T')[0]]: "Weekend was tough with more free time, but I redirected that energy into a killer workout. Sleep quality has been amazing lately. I can see why they call this the Mental Expansion phase.",
    
    // 1 week ago
    [new Date(new Date().setDate(new Date().getDate() - 7)).toISOString().split('T')[0]]: "Week 3 complete! The emotional rollercoaster from the first two weeks has mellowed out. I'm starting to feel like this is sustainable. My aura is definitely different - people at work keep asking if I've been working out.",
    
    // 2 weeks ago (early struggles)
    [new Date(new Date().setDate(new Date().getDate() - 14)).toISOString().split('T')[0]]: "Day 11 was brutal. Anxiety was through the roof and I kept having mood swings. But I know from the timeline this is normal for the emotional purging phase. Just have to push through.",
    
    // 3 weeks ago (very early)
    [new Date(new Date().setDate(new Date().getDate() - 21)).toISOString().split('T')[0]]: "Day 4 and I'm questioning everything. The urges are insane and I feel like I'm going crazy. But I remember my longest streak was 47 days and how amazing I felt, so I'm going to stick with it."
  },

  // User preferences and settings
  discordUsername: 'TestWarrior#1234',
  showOnLeaderboard: true,
  dataSharing: false,
  analyticsOptIn: true,
  marketingEmails: false,
  darkMode: true,
  notifications: true,
  language: 'en',
  wisdomMode: false,

  // TESTING: Urge tool usage history
  urgeToolUsage: [
    {
      date: new Date(new Date().setDate(new Date().getDate() - 1)),
      tool: 'timer',
      effective: true
    },
    {
      date: new Date(new Date().setDate(new Date().getDate() - 3)),
      tool: 'redirect',
      effective: true
    },
    {
      date: new Date(new Date().setDate(new Date().getDate() - 6)),
      tool: 'affirmation',
      effective: false
    }
  ]
};

// ALTERNATIVE SCENARIOS: Different mock users for testing edge cases

// Scenario 1: Brand new user (Day 0)
export const newUserMockData = {
  username: 'newbie',
  email: 'newbie@example.com',
  startDate: new Date(), // Started today
  currentStreak: 0,
  longestStreak: 0,
  wetDreamCount: 0,
  relapseCount: 0,
  isPremium: false,
  badges: [
    { id: 1, name: '7-Day Warrior', earned: false, date: null },
    { id: 2, name: '14-Day Monk', earned: false, date: null },
    { id: 3, name: '30-Day Master', earned: false, date: null },
    { id: 4, name: '90-Day King', earned: false, date: null },
    { id: 5, name: '180-Day Emperor', earned: false, date: null },
    { id: 6, name: '365-Day Sage', earned: false, date: null }
  ],
  streakHistory: [{
    id: 1,
    start: new Date(),
    end: null,
    days: 0,
    reason: null,
    trigger: null
  }],
  benefitTracking: [],
  emotionalTracking: [],
  urgeLog: [],
  notes: {},
  discordUsername: '',
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

// Scenario 2: Long-term successful user (127 days)
export const veteranUserMockData = {
  username: 'veteran',
  email: 'veteran@example.com',
  startDate: new Date(new Date().setDate(new Date().getDate() - 127)), // 127 days ago
  currentStreak: 127,
  longestStreak: 127,
  wetDreamCount: 8,
  relapseCount: 2, // Only 2 relapses ever
  isPremium: true,
  badges: [
    { id: 1, name: '7-Day Warrior', earned: true, date: new Date(new Date().setDate(new Date().getDate() - 120)) },
    { id: 2, name: '14-Day Monk', earned: true, date: new Date(new Date().setDate(new Date().getDate() - 113)) },
    { id: 3, name: '30-Day Master', earned: true, date: new Date(new Date().setDate(new Date().getDate() - 97)) },
    { id: 4, name: '90-Day King', earned: true, date: new Date(new Date().setDate(new Date().getDate() - 37)) },
    { id: 5, name: '180-Day Emperor', earned: false, date: null }, // Not quite there yet
    { id: 6, name: '365-Day Sage', earned: false, date: null }
  ],
  streakHistory: [
    // Old relapse from way back
    {
      id: 1,
      start: new Date(new Date().setDate(new Date().getDate() - 200)),
      end: new Date(new Date().setDate(new Date().getDate() - 185)),
      days: 15,
      reason: 'relapse',
      trigger: 'stress'
    },
    // Another old relapse
    {
      id: 2,
      start: new Date(new Date().setDate(new Date().getDate() - 184)),
      end: new Date(new Date().setDate(new Date().getDate() - 128)),
      days: 56,
      reason: 'relapse',
      trigger: 'explicit_content'
    },
    // Current epic streak
    {
      id: 3,
      start: new Date(new Date().setDate(new Date().getDate() - 127)),
      end: null,
      days: 127,
      reason: null,
      trigger: null
    }
  ],
  // High-level benefits (veteran user)
  benefitTracking: [
    {
      date: new Date(),
      energy: 10,
      focus: 10,
      confidence: 9,
      aura: 10,
      sleep: 9,
      workout: 10
    }
  ],
  // Stable emotions (veteran user)
  emotionalTracking: [
    {
      date: new Date(),
      day: 127,
      phase: 5, // Mastery phase
      anxiety: 1,
      moodStability: 10,
      mentalClarity: 10,
      emotionalProcessing: 10
    }
  ],
  urgeLog: [], // Veteran doesn't need urge tools anymore
  notes: {
    [new Date().toISOString().split('T')[0]]: "Day 127. I barely think about urges anymore. Life is about so much more now. Helping others on their journey has become my passion."
  },
  discordUsername: 'KingVeteran#0001',
  showOnLeaderboard: true,
  dataSharing: true,
  analyticsOptIn: true,
  marketingEmails: true,
  darkMode: true,
  notifications: true,
  language: 'en',
  wisdomMode: true, // Veteran uses esoteric view
  urgeToolUsage: []
};

// Scenario 3: Struggling user (frequent relapses)
export const strugglingUserMockData = {
  username: 'struggling',
  email: 'struggling@example.com',
  startDate: new Date(new Date().setDate(new Date().getDate() - 3)), // Just restarted 3 days ago
  currentStreak: 3,
  longestStreak: 12, // Best was only 12 days
  wetDreamCount: 1,
  relapseCount: 8, // Many relapses
  isPremium: false,
  badges: [
    { id: 1, name: '7-Day Warrior', earned: true, date: new Date(new Date().setDate(new Date().getDate() - 20)) }, // Earned once
    { id: 2, name: '14-Day Monk', earned: false, date: null },
    { id: 3, name: '30-Day Master', earned: false, date: null },
    { id: 4, name: '90-Day King', earned: false, date: null },
    { id: 5, name: '180-Day Emperor', earned: false, date: null },
    { id: 6, name: '365-Day Sage', earned: false, date: null }
  ],
  streakHistory: [
    // Multiple short streaks with various triggers
    {
      id: 1,
      start: new Date(new Date().setDate(new Date().getDate() - 50)),
      end: new Date(new Date().setDate(new Date().getDate() - 47)),
      days: 3,
      reason: 'relapse',
      trigger: 'lustful_thoughts'
    },
    {
      id: 2,
      start: new Date(new Date().setDate(new Date().getDate() - 46)),
      end: new Date(new Date().setDate(new Date().getDate() - 41)),
      days: 5,
      reason: 'relapse',
      trigger: 'boredom'
    },
    // Best streak
    {
      id: 3,
      start: new Date(new Date().setDate(new Date().getDate() - 40)),
      end: new Date(new Date().setDate(new Date().getDate() - 28)),
      days: 12,
      reason: 'relapse',
      trigger: 'stress'
    },
    // More relapses
    {
      id: 4,
      start: new Date(new Date().setDate(new Date().getDate() - 27)),
      end: new Date(new Date().setDate(new Date().getDate() - 25)),
      days: 2,
      reason: 'relapse',
      trigger: 'explicit_content'
    },
    {
      id: 5,
      start: new Date(new Date().setDate(new Date().getDate() - 24)),
      end: new Date(new Date().setDate(new Date().getDate() - 17)),
      days: 7,
      reason: 'relapse',
      trigger: 'loneliness'
    },
    {
      id: 6,
      start: new Date(new Date().setDate(new Date().getDate() - 16)),
      end: new Date(new Date().setDate(new Date().getDate() - 14)),
      days: 2,
      reason: 'relapse',
      trigger: 'social_media'
    },
    {
      id: 7,
      start: new Date(new Date().setDate(new Date().getDate() - 13)),
      end: new Date(new Date().setDate(new Date().getDate() - 7)),
      days: 6,
      reason: 'relapse',
      trigger: 'home_alone'
    },
    {
      id: 8,
      start: new Date(new Date().setDate(new Date().getDate() - 6)),
      end: new Date(new Date().setDate(new Date().getDate() - 4)),
      days: 2,
      reason: 'relapse',
      trigger: 'relationship'
    },
    // Current attempt
    {
      id: 9,
      start: new Date(new Date().setDate(new Date().getDate() - 3)),
      end: null,
      days: 3,
      reason: null,
      trigger: null
    }
  ],
  // Low benefits (struggling user)
  benefitTracking: [
    {
      date: new Date(),
      energy: 4,
      focus: 3,
      confidence: 2,
      aura: 3,
      sleep: 4,
      workout: 3
    }
  ],
  // High anxiety (struggling user)
  emotionalTracking: [
    {
      date: new Date(),
      day: 3,
      phase: 1,
      anxiety: 8,
      moodStability: 2,
      mentalClarity: 3,
      emotionalProcessing: 2
    }
  ],
  // Lots of urge tool usage
  urgeLog: [
    {
      date: new Date(new Date().setDate(new Date().getDate() - 1)),
      intensity: 9,
      trigger: 'lustful_thoughts',
      protocol: 'breathing',
      phase: 'Initial Adaptation Phase',
      day: 2
    },
    {
      date: new Date(),
      intensity: 8,
      trigger: 'stress',
      protocol: 'breathing',
      phase: 'Initial Adaptation Phase',
      day: 3
    }
  ],
  notes: {
    [new Date().toISOString().split('T')[0]]: "Day 3 again... I keep relapsing and I'm getting frustrated. But I'm not giving up. Going to try to get past day 7 this time."
  },
  discordUsername: '',
  showOnLeaderboard: false,
  dataSharing: false,
  analyticsOptIn: true,
  marketingEmails: false,
  darkMode: true,
  notifications: true,
  language: 'en',
  wisdomMode: false,
  urgeToolUsage: [
    {
      date: new Date(),
      tool: 'timer',
      effective: false
    },
    {
      date: new Date(new Date().setDate(new Date().getDate() - 1)),
      tool: 'breathing',
      effective: true
    }
  ]
};

// Export the main comprehensive data as default
export default comprehensiveMockData;