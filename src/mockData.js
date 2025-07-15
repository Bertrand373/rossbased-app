// src/mockData.js - COMPREHENSIVE test data covering ALL scenarios + NEW personality-based users
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
    
    // Second attempt: 8 days, relapsed due to social media
    {
      id: 2,
      start: new Date(new Date().setDate(new Date().getDate() - 105)), // Next day after relapse
      end: new Date(new Date().setDate(new Date().getDate() - 97)), // Relapsed after 8 days
      days: 8,
      reason: 'relapse',
      trigger: 'social_media'
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
      trigger: 'home_environment'
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
    
    // Another short streak - FIXED: Changed 'celebration' to 'social_media'
    {
      id: 3,
      start: subDays(new Date(), 155),
      end: subDays(new Date(), 90), // 65 day streak
      days: 65,
      reason: 'relapse',
      trigger: 'social_media' // FIXED: Changed from invalid 'celebration' trigger
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