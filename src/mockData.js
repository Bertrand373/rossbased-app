// src/mockData.js - COMPREHENSIVE test data covering ALL scenarios + NEW personality-based users + AI TEST USERS
import { format, subDays, addDays } from 'date-fns';

// Helper function to generate realistic benefit data with some variability
const generateBenefitValue = (baseValue, variability = 1.5) => {
  const variation = (Math.random() - 0.5) * variability;
  return Math.max(1, Math.min(10, Math.round(baseValue + variation)));
};

// Helper function to create benefit tracking data
const createBenefitTracking = (startDate, streakDays, consistency = 'high') => {
  const benefits = [];
  
  // Define consistency patterns
  const patterns = {
    high: { 
      frequency: 0.95, // logs 95% of days
      baseValues: { energy: 7, focus: 7.5, confidence: 7, aura: 6.5, sleep: 7, workout: 6 },
      variability: 1.2
    },
    good: { 
      frequency: 0.75, // logs 75% of days
      baseValues: { energy: 6.5, focus: 6.8, confidence: 6.5, aura: 6, sleep: 6.5, workout: 5.5 },
      variability: 1.8
    },
    moderate: {
      frequency: 0.55, // logs 55% of days (can be lazy)
      baseValues: { energy: 6, focus: 6.2, confidence: 6.2, aura: 6.8, sleep: 6, workout: 5 },
      variability: 2.2
    }
  };
  
  const pattern = patterns[consistency];
  
  for (let i = 0; i < streakDays; i++) {
    const date = addDays(startDate, i);
    
    // Skip some days based on consistency
    if (Math.random() > pattern.frequency) continue;
    
    // Create benefit entry with realistic progression
    const dayProgress = i / streakDays;
    const progressBonus = dayProgress * 0.8; // Slight improvement over time
    
    benefits.push({
      date: date,
      energy: generateBenefitValue(pattern.baseValues.energy + progressBonus, pattern.variability),
      focus: generateBenefitValue(pattern.baseValues.focus + progressBonus, pattern.variability),
      confidence: generateBenefitValue(pattern.baseValues.confidence + progressBonus, pattern.variability),
      aura: generateBenefitValue(pattern.baseValues.aura + progressBonus, pattern.variability),
      sleep: generateBenefitValue(pattern.baseValues.sleep + progressBonus * 0.5, pattern.variability),
      workout: generateBenefitValue(pattern.baseValues.workout + progressBonus * 0.7, pattern.variability)
    });
  }
  
  return benefits;
};

// Helper function to determine earned badges
const getEarnedBadges = (streakDays) => {
  const allBadges = [
    { id: 1, name: '7-Day Warrior', earned: false, date: null },
    { id: 2, name: '14-Day Monk', earned: false, date: null },
    { id: 3, name: '30-Day Master', earned: false, date: null },
    { id: 4, name: '90-Day King', earned: false, date: null },
    { id: 5, name: '180-Day Emperor', earned: false, date: null },
    { id: 6, name: '365-Day Sage', earned: false, date: null }
  ];
  
  const badgeThresholds = [7, 14, 30, 90, 180, 365];
  const startDate = subDays(new Date(), streakDays);
  
  badgeThresholds.forEach((threshold, index) => {
    if (streakDays >= threshold) {
      allBadges[index].earned = true;
      allBadges[index].date = addDays(startDate, threshold);
    }
  });
  
  return allBadges;
};

// ORIGINAL COMPREHENSIVE MOCK DATA (keeping existing)
const comprehensiveMockData = {
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
    // Second attempt: Best streak - 47 days! Relapsed due to loneliness
    {
      id: 2,
      start: new Date(new Date().setDate(new Date().getDate() - 105)),
      end: new Date(new Date().setDate(new Date().getDate() - 58)),
      days: 47,
      reason: 'relapse',
      trigger: 'loneliness'
    },
    // Third attempt: 21 days, relapsed due to boredom
    {
      id: 3,
      start: new Date(new Date().setDate(new Date().getDate() - 57)),
      end: new Date(new Date().setDate(new Date().getDate() - 36)),
      days: 21,
      reason: 'relapse',
      trigger: 'boredom'
    },
    // Fourth attempt: 10 days, relapsed due to social media
    {
      id: 4,
      start: new Date(new Date().setDate(new Date().getDate() - 35)),
      end: new Date(new Date().setDate(new Date().getDate() - 25)),
      days: 10,
      reason: 'relapse',
      trigger: 'social_media'
    },
    // Current streak: 25 days and counting!
    {
      id: 5,
      start: new Date(new Date().setDate(new Date().getDate() - 25)),
      end: null, // Still active
      days: 25,
      reason: null,
      trigger: null
    }
  ],

  // Earned badges from current streak
  badges: [
    { id: 1, name: '7-Day Warrior', earned: true, date: new Date(new Date().setDate(new Date().getDate() - 18)) },
    { id: 2, name: '14-Day Monk', earned: true, date: new Date(new Date().setDate(new Date().getDate() - 11)) },
    { id: 3, name: '30-Day Master', earned: false, date: null }, // Almost there!
    { id: 4, name: '90-Day King', earned: false, date: null },
    { id: 5, name: '180-Day Emperor', earned: false, date: null },
    { id: 6, name: '365-Day Sage', earned: false, date: null }
  ],

  // COMPREHENSIVE: Benefit tracking with realistic progression
  benefitTracking: [
    {
      date: new Date(), // Today
      energy: 8,
      focus: 7,
      confidence: 8,
      aura: 7,
      sleep: 8,
      workout: 7
    },
    {
      date: new Date(new Date().setDate(new Date().getDate() - 1)),
      energy: 7,
      focus: 7,
      confidence: 7,
      aura: 7,
      sleep: 7,
      workout: 8
    },
    {
      date: new Date(new Date().setDate(new Date().getDate() - 2)),
      energy: 7,
      focus: 6,
      confidence: 7,
      aura: 6,
      sleep: 7,
      workout: 6
    },
    // Week ago - slightly lower benefits
    {
      date: new Date(new Date().setDate(new Date().getDate() - 7)),
      energy: 6,
      focus: 6,
      confidence: 6,
      aura: 6,
      sleep: 6,
      workout: 6
    },
    // Two weeks ago - showing progression
    {
      date: new Date(new Date().setDate(new Date().getDate() - 14)),
      energy: 5,
      focus: 5,
      confidence: 5,
      aura: 5,
      sleep: 6,
      workout: 5
    }
  ],

  // COMPREHENSIVE: Emotional tracking
  emotionalTracking: [
    {
      date: new Date(),
      day: 25,
      phase: 3, // Mental expansion phase
      anxiety: 4,
      moodStability: 7,
      mentalClarity: 8,
      emotionalProcessing: 7
    },
    {
      date: new Date(new Date().setDate(new Date().getDate() - 7)),
      day: 18,
      phase: 2, // Emotional purging phase
      anxiety: 6,
      moodStability: 5,
      mentalClarity: 6,
      emotionalProcessing: 5
    },
    {
      date: new Date(new Date().setDate(new Date().getDate() - 14)),
      day: 11,
      phase: 2, // Emotional purging phase
      anxiety: 7,
      moodStability: 4,
      mentalClarity: 5,
      emotionalProcessing: 4
    }
  ],

  // COMPREHENSIVE: Urge log
  urgeLog: [
    {
      date: new Date(new Date().setDate(new Date().getDate() - 3)),
      intensity: 6,
      trigger: 'stress',
      protocol: 'breathing',
      phase: 'Mental Expansion Phase',
      day: 22
    },
    {
      date: new Date(new Date().setDate(new Date().getDate() - 10)),
      intensity: 7,
      trigger: 'social_media',
      protocol: 'timer',
      phase: 'Emotional Purging Phase',
      day: 15
    }
  ],

  // COMPREHENSIVE: Journal notes
  notes: {
    // Today's note
    [new Date().toISOString().split('T')[0]]: "Day 25! Feeling really good. Energy is up, confidence is growing. I can see the light at the end of the tunnel. Going to make it to 30 days this time!",
    
    // A week ago
    [new Date(new Date().setDate(new Date().getDate() - 7)).toISOString().split('T')[0]]: "Day 18. Had a tough urge today but I used the breathing exercises and it passed. Proud of myself for not giving in.",
    
    // Two weeks ago
    [new Date(new Date().setDate(new Date().getDate() - 14)).toISOString().split('T')[0]]: "Day 11 - hitting the emotional purging phase hard. Anxiety was through the roof and I kept having mood swings. But I know from the timeline this is normal for the emotional purging phase. Just have to push through.",
    
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

// NEW PERSONALITY-BASED USERS

// INTJ User - Long term retainer (1+ year) with religious benefit tracking
export const intjMockData = {
  username: 'intj',
  email: 'intj@example.com',
  startDate: subDays(new Date(), 425), // 1 year and 2 months
  currentStreak: 425,
  longestStreak: 425,
  wetDreamCount: 3, // Very few for a long-term retainer
  relapseCount: 0,  // Clean streak
  isPremium: true,  // Long-term users likely premium
  badges: getEarnedBadges(425),
  benefitTracking: createBenefitTracking(subDays(new Date(), 425), 425, 'high'),
  streakHistory: [
    {
      id: 1,
      start: subDays(new Date(), 425),
      end: null, // Current ongoing streak
      days: 425,
      reason: null,
      trigger: null
    }
  ],
  emotionalTracking: [
    {
      date: new Date(),
      day: 425,
      phase: 6, // Beyond mastery
      anxiety: 1,
      moodStability: 10,
      mentalClarity: 10,
      emotionalProcessing: 10
    }
  ],
  urgeLog: [], // Advanced user doesn't need urge tracking
  notes: {
    [format(addDays(subDays(new Date(), 425), 30), 'yyyy-MM-dd')]: "First month complete. Energy through the roof!",
    [format(addDays(subDays(new Date(), 425), 90), 'yyyy-MM-dd')]: "90 days! Mental clarity is incredible. Starting to attract more opportunities.",
    [format(addDays(subDays(new Date(), 425), 180), 'yyyy-MM-dd')]: "6 months - this is a lifestyle now. Deep confidence and purpose.",
    [format(addDays(subDays(new Date(), 425), 365), 'yyyy-MM-dd')]: "One full year! Completely transformed. This journey has made me who I was meant to be."
  },
  discordUsername: 'INTJ_Retainer#1234',
  showOnLeaderboard: true,
  dataSharing: false,
  analyticsOptIn: true,
  marketingEmails: false,
  darkMode: true,
  notifications: true,
  language: 'en',
  wisdomMode: true,
  urgeToolUsage: []
};

// INTP User - 9 months retainer with good (but not perfect) tracking
export const intpMockData = {
  username: 'intp',
  email: 'intp@example.com',
  startDate: subDays(new Date(), 275), // 9 months
  currentStreak: 275,
  longestStreak: 275,
  wetDreamCount: 5, // A few more than INTJ
  relapseCount: 0,  // Clean streak but started later
  isPremium: true,  // Likely premium after 9 months
  badges: getEarnedBadges(275),
  benefitTracking: createBenefitTracking(subDays(new Date(), 275), 275, 'good'), // Good but not perfect tracking
  streakHistory: [
    {
      id: 1,
      start: subDays(new Date(), 275),
      end: null, // Current ongoing streak
      days: 275,
      reason: null,
      trigger: null
    }
  ],
  emotionalTracking: [
    {
      date: new Date(),
      day: 275,
      phase: 5, // Mastery phase
      anxiety: 2,
      moodStability: 9,
      mentalClarity: 9,
      emotionalProcessing: 8
    }
  ],
  urgeLog: [
    {
      date: subDays(new Date(), 150),
      intensity: 4,
      trigger: 'intellectual_curiosity',
      protocol: 'redirect',
      phase: 'Stabilization Phase',
      day: 125
    }
  ],
  notes: {
    [format(addDays(subDays(new Date(), 275), 21), 'yyyy-MM-dd')]: "3 weeks in. Starting to notice better sleep patterns.",
    [format(addDays(subDays(new Date(), 275), 60), 'yyyy-MM-dd')]: "2 months! Focus during work has improved dramatically.",
    [format(addDays(subDays(new Date(), 275), 120), 'yyyy-MM-dd')]: "4 months - confidence in social situations is way up.",
    [format(addDays(subDays(new Date(), 275), 240), 'yyyy-MM-dd')]: "8 months! This practice has fundamentally changed how I approach life."
  },
  discordUsername: 'INTP_Explorer#5678',
  showOnLeaderboard: true,
  dataSharing: false,
  analyticsOptIn: true,
  marketingEmails: false,
  darkMode: true,
  notifications: true,
  language: 'en',
  wisdomMode: false,
  urgeToolUsage: [
    {
      date: subDays(new Date(), 100),
      tool: 'redirect',
      effective: true
    }
  ]
};

// ENFP User - Long SR streaks (1+ year) with some relapses after a year. Moderate tracking (can be lazy)
export const enfpMockData = {
  username: 'enfp',
  email: 'enfp@example.com',
  startDate: subDays(new Date(), 89), // Current streak: 89 days (after relapse)
  currentStreak: 89,
  longestStreak: 423, // Previous best was over 1 year
  wetDreamCount: 8, // More natural, doesn't stress about them
  relapseCount: 3,  // A few relapses over the journey
  isPremium: true,  // Long-term user
  badges: getEarnedBadges(89), // Current streak badges
  benefitTracking: createBenefitTracking(subDays(new Date(), 89), 89, 'moderate'), // Moderate consistency - can be lazy
  streakHistory: [
    // First epic streak - over 1 year!
    {
      id: 1,
      start: subDays(new Date(), 600), // Started 600 days ago
      end: subDays(new Date(), 177), // Ended 177 days ago (423 day streak)
      days: 423,
      reason: 'relapse',
      trigger: 'relationship' // New relationship triggered relapse
    },
    
    // Short relapse recovery
    {
      id: 2,
      start: subDays(new Date(), 176),
      end: subDays(new Date(), 156), // 20 day streak
      days: 20,
      reason: 'relapse',
      trigger: 'stress'
    },
    
    // Another short streak
    {
      id: 3,
      start: subDays(new Date(), 155),
      end: subDays(new Date(), 90), // 65 day streak
      days: 65,
      reason: 'relapse',
      trigger: 'social_media'
    },
    
    // CURRENT STREAK: 89 days and building back up
    {
      id: 4,
      start: subDays(new Date(), 89),
      end: null, // Still active
      days: 89,
      reason: null,
      trigger: null
    }
  ],
  emotionalTracking: [
    {
      date: new Date(),
      day: 89,
      phase: 4, // Spiritual awakening phase
      anxiety: 3,
      moodStability: 7,
      mentalClarity: 8,
      emotionalProcessing: 9
    }
  ],
  urgeLog: [
    {
      date: subDays(new Date(), 30),
      intensity: 5,
      trigger: 'social_energy',
      protocol: 'redirect',
      phase: 'Spiritual Awakening Phase',
      day: 59
    }
  ],
  notes: {
    [format(addDays(subDays(new Date(), 600), 365), 'yyyy-MM-dd')]: "1 YEAR! Can't believe I made it this far. Life is incredible right now. My energy is infectious and people love being around me.",
    [format(addDays(subDays(new Date(), 600), 400), 'yyyy-MM-dd')]: "400+ days! I feel like I'm living in a different reality. Everything just flows so naturally.",
    [format(subDays(new Date(), 177), 'yyyy-MM-dd')]: "Ugh... relapsed after 423 days. Met someone amazing and got caught up in the moment. Don't regret the experience but definitely felt the energy shift immediately.",
    [format(subDays(new Date(), 89), 'yyyy-MM-dd')]: "Back to day 1 again. But I know I can do this - I've done over a year before! This time I'll be more mindful in relationships.",
    [format(addDays(subDays(new Date(), 89), 30), 'yyyy-MM-dd')]: "Month in on this new streak. The energy is coming back fast since I have experience. Social connections feel electric again.",
    [format(addDays(subDays(new Date(), 89), 60), 'yyyy-MM-dd')]: "2 months back! My charisma is through the roof. People keep commenting on my 'glow' - if they only knew! 😄"
  },
  discordUsername: 'ENFP_Vibes#9999',
  showOnLeaderboard: true,
  dataSharing: true, // ENFP loves sharing experiences
  analyticsOptIn: true,
  marketingEmails: true, // Doesn't mind emails
  darkMode: false, // Prefers light mode - more energetic
  notifications: true,
  language: 'en',
  wisdomMode: false,
  urgeToolUsage: [
    {
      date: subDays(new Date(), 45),
      tool: 'redirect',
      effective: true
    },
    {
      date: subDays(new Date(), 60),
      tool: 'breathing',
      effective: true
    }
  ]
};

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

// EXISTING ALTERNATIVE SCENARIOS (keeping as-is)

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
      trigger: 'social_media'
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
      trigger: 'social_media'
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
      trigger: 'home_environment'
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