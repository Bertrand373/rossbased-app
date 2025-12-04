// src/mockData.js - COMPREHENSIVE test data with ALL users + 6 AI TEST USERS + AI CARD TEST USER
import { format, subDays, addDays } from 'date-fns';

// Helper functions
const generateBenefitValue = (baseValue, variability = 1.5) => {
  const variation = (Math.random() - 0.5) * variability;
  return Math.max(1, Math.min(10, Math.round(baseValue + variation)));
};

const createBenefitTracking = (startDate, streakDays, consistency = 'high') => {
  const benefits = [];
  const patterns = {
    high: { 
      frequency: 0.95,
      baseValues: { energy: 7, focus: 7.5, confidence: 7, aura: 6.5, sleep: 7, workout: 6 },
      variability: 1.2
    },
    good: { 
      frequency: 0.75,
      baseValues: { energy: 6.5, focus: 6.8, confidence: 6.5, aura: 6, sleep: 6.5, workout: 5.5 },
      variability: 1.8
    },
    moderate: {
      frequency: 0.55,
      baseValues: { energy: 6, focus: 6.2, confidence: 6.2, aura: 6.8, sleep: 6, workout: 5 },
      variability: 2.2
    }
  };
  
  const pattern = patterns[consistency];
  
  for (let i = 0; i < streakDays; i++) {
    const date = addDays(startDate, i);
    if (Math.random() > pattern.frequency) continue;
    
    const dayProgress = i / streakDays;
    const progressBonus = dayProgress * 0.8;
    
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

// Helper function to create comprehensive emotional tracking data
const createEmotionalTracking = (startDate, streakDays) => {
  const tracking = [];
  
  // Define phase boundaries
  const getPhase = (day) => {
    if (day <= 7) return 1;      // Initial Adaptation
    if (day <= 21) return 2;     // Emotional Purging
    if (day <= 45) return 3;     // Mental Expansion
    if (day <= 90) return 4;     // Spiritual Awakening
    if (day <= 180) return 5;    // Stabilization
    return 6;                    // Mastery
  };
  
  // Create entries for key days (not every day, but enough for analysis)
  const keyDays = [1, 3, 5, 7, 10, 12, 14, 17, 19, 21, 24, 26, 28];
  
  keyDays.forEach(day => {
    if (day > streakDays) return;
    
    const date = addDays(startDate, day - 1);
    const phase = getPhase(day);
    
    // Simulate realistic emotional patterns through phases
    let anxiety, moodStability, mentalClarity, emotionalProcessing;
    
    if (phase === 1) {
      // Initial Adaptation: Higher anxiety, lower stability
      anxiety = Math.min(10, Math.max(1, Math.round(7 - (day * 0.3) + (Math.random() * 2 - 1))));
      moodStability = Math.min(10, Math.max(1, Math.round(4 + (day * 0.2) + (Math.random() * 2 - 1))));
      mentalClarity = Math.min(10, Math.max(1, Math.round(4 + (day * 0.15) + (Math.random() * 2 - 1))));
      emotionalProcessing = Math.min(10, Math.max(1, Math.round(3 + (day * 0.2) + (Math.random() * 2 - 1))));
    } else if (phase === 2) {
      // Emotional Purging: Volatile, peaks and valleys
      const volatility = Math.sin(day * 0.5) * 2;
      anxiety = Math.min(10, Math.max(1, Math.round(5 + volatility + (Math.random() * 2 - 1))));
      moodStability = Math.min(10, Math.max(1, Math.round(5 - volatility * 0.5 + (Math.random() * 2 - 1))));
      mentalClarity = Math.min(10, Math.max(1, Math.round(5 + (day - 7) * 0.15 + (Math.random() * 2 - 1))));
      emotionalProcessing = Math.min(10, Math.max(1, Math.round(5 + (day - 7) * 0.1 + (Math.random() * 2 - 1))));
    } else {
      // Later phases: Generally improving
      const progress = (day - 21) / streakDays;
      anxiety = Math.min(10, Math.max(1, Math.round(4 - progress * 2 + (Math.random() * 2 - 1))));
      moodStability = Math.min(10, Math.max(1, Math.round(6 + progress * 3 + (Math.random() * 2 - 1))));
      mentalClarity = Math.min(10, Math.max(1, Math.round(6 + progress * 3 + (Math.random() * 2 - 1))));
      emotionalProcessing = Math.min(10, Math.max(1, Math.round(6 + progress * 2 + (Math.random() * 2 - 1))));
    }
    
    tracking.push({
      date,
      day,
      phase,
      anxiety,
      moodStability,
      mentalClarity,
      emotionalProcessing
    });
  });
  
  return tracking;
};

// ========================================
// AI TEST USERS (6 scenarios)
// ========================================

export const aiTestUser1 = {
  username: 'aitest1',
  email: 'aitest1@example.com',
  startDate: subDays(new Date(), 12),
  currentStreak: 12,
  longestStreak: 15,
  wetDreamCount: 0,
  relapseCount: 2,
  isPremium: true,
  badges: getEarnedBadges(12),
  benefitTracking: createBenefitTracking(subDays(new Date(), 12), 12, 'good'),
  streakHistory: [
    { id: 1, start: subDays(new Date(), 35), end: subDays(new Date(), 28), days: 7, reason: 'relapse', trigger: 'stress' },
    { id: 2, start: subDays(new Date(), 27), end: subDays(new Date(), 13), days: 14, reason: 'relapse', trigger: 'social_media' },
    { id: 3, start: subDays(new Date(), 12), end: null, days: 12, reason: null, trigger: null }
  ],
  emotionalTracking: [{ date: new Date(), day: 12, phase: 2, anxiety: 5, moodStability: 6, mentalClarity: 7, emotionalProcessing: 6 }],
  urgeLog: [],
  notes: { [format(new Date(), 'yyyy-MM-dd')]: "Day 12 - Building training data!" },
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

export const aiTestUser2 = {
  username: 'aitest2',
  email: 'aitest2@example.com',
  startDate: subDays(new Date(), 21),
  currentStreak: 21,
  longestStreak: 21,
  wetDreamCount: 1,
  relapseCount: 3,
  isPremium: true,
  badges: getEarnedBadges(21),
  benefitTracking: createBenefitTracking(subDays(new Date(), 21), 21, 'high'),
  streakHistory: [
    { id: 1, start: subDays(new Date(), 50), end: subDays(new Date(), 42), days: 8, reason: 'relapse', trigger: 'boredom' },
    { id: 2, start: subDays(new Date(), 41), end: subDays(new Date(), 30), days: 11, reason: 'relapse', trigger: 'stress' },
    { id: 3, start: subDays(new Date(), 29), end: subDays(new Date(), 22), days: 7, reason: 'relapse', trigger: 'social_media' },
    { id: 4, start: subDays(new Date(), 21), end: null, days: 21, reason: null, trigger: null }
  ],
  emotionalTracking: [{ date: new Date(), day: 21, phase: 2, anxiety: 4, moodStability: 7, mentalClarity: 7, emotionalProcessing: 7 }],
  urgeLog: [{ date: subDays(new Date(), 10), intensity: 6, trigger: 'stress', protocol: 'breathing', phase: 'Emotional Purging Phase', day: 11 }],
  notes: { [format(new Date(), 'yyyy-MM-dd')]: "Day 21! Ready to train!" },
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

export const aiTestUser3 = {
  username: 'aitest3',
  email: 'aitest3@example.com',
  startDate: subDays(new Date(), 38),
  currentStreak: 38,
  longestStreak: 38,
  wetDreamCount: 2,
  relapseCount: 3,
  isPremium: true,
  badges: getEarnedBadges(38),
  benefitTracking: createBenefitTracking(subDays(new Date(), 38), 38, 'high'),
  streakHistory: [
    { id: 1, start: subDays(new Date(), 100), end: subDays(new Date(), 90), days: 10, reason: 'relapse', trigger: 'stress' },
    { id: 2, start: subDays(new Date(), 89), end: subDays(new Date(), 75), days: 14, reason: 'relapse', trigger: 'loneliness' },
    { id: 3, start: subDays(new Date(), 74), end: subDays(new Date(), 39), days: 35, reason: 'relapse', trigger: 'social_media' },
    { id: 4, start: subDays(new Date(), 38), end: null, days: 38, reason: null, trigger: null }
  ],
  emotionalTracking: [{ date: new Date(), day: 38, phase: 3, anxiety: 2, moodStability: 9, mentalClarity: 9, emotionalProcessing: 8 }],
  urgeLog: [],
  notes: { [format(new Date(), 'yyyy-MM-dd')]: "Day 38 - Low risk (35%)" },
  discordUsername: 'AITester3#0003',
  showOnLeaderboard: true,
  dataSharing: true,
  analyticsOptIn: true,
  marketingEmails: false,
  darkMode: true,
  notifications: true,
  language: 'en',
  wisdomMode: false,
  urgeToolUsage: []
};

export const aiTestUser4 = {
  username: 'aitest4',
  email: 'aitest4@example.com',
  startDate: subDays(new Date(), 18),
  currentStreak: 18,
  longestStreak: 28,
  wetDreamCount: 1,
  relapseCount: 5,
  isPremium: true,
  badges: getEarnedBadges(18),
  benefitTracking: createBenefitTracking(subDays(new Date(), 18), 18, 'good'),
  streakHistory: [
    { id: 1, start: subDays(new Date(), 120), end: subDays(new Date(), 112), days: 8, reason: 'relapse', trigger: 'stress' },
    { id: 2, start: subDays(new Date(), 111), end: subDays(new Date(), 97), days: 14, reason: 'relapse', trigger: 'loneliness' },
    { id: 3, start: subDays(new Date(), 96), end: subDays(new Date(), 68), days: 28, reason: 'relapse', trigger: 'social_media' },
    { id: 4, start: subDays(new Date(), 67), end: subDays(new Date(), 56), days: 11, reason: 'relapse', trigger: 'boredom' },
    { id: 5, start: subDays(new Date(), 55), end: subDays(new Date(), 19), days: 36, reason: 'relapse', trigger: 'evening' },
    { id: 6, start: subDays(new Date(), 18), end: null, days: 18, reason: null, trigger: null }
  ],
  emotionalTracking: [{ date: new Date(), day: 18, phase: 2, anxiety: 6, moodStability: 5, mentalClarity: 6, emotionalProcessing: 5 }],
  urgeLog: [{ date: subDays(new Date(), 2), intensity: 7, trigger: 'stress', protocol: 'breathing', phase: 'Emotional Purging Phase', day: 16 }],
  notes: { [format(new Date(), 'yyyy-MM-dd')]: "Day 18 - MODERATE RISK (55%)" },
  discordUsername: 'AITester4#0004',
  showOnLeaderboard: false,
  dataSharing: false,
  analyticsOptIn: true,
  marketingEmails: false,
  darkMode: true,
  notifications: true,
  language: 'en',
  wisdomMode: false,
  urgeToolUsage: [{ date: subDays(new Date(), 2), tool: 'breathing', effective: true }]
};

export const aiTestUser5 = {
  username: 'aitest5',
  email: 'aitest5@example.com',
  startDate: subDays(new Date(), 19),
  currentStreak: 19,
  longestStreak: 22,
  wetDreamCount: 0,
  relapseCount: 6,
  isPremium: true,
  badges: getEarnedBadges(19),
  benefitTracking: createBenefitTracking(subDays(new Date(), 19), 19, 'moderate'),
  streakHistory: [
    { id: 1, start: subDays(new Date(), 150), end: subDays(new Date(), 140), days: 10, reason: 'relapse', trigger: 'stress' },
    { id: 2, start: subDays(new Date(), 139), end: subDays(new Date(), 121), days: 18, reason: 'relapse', trigger: 'evening' },
    { id: 3, start: subDays(new Date(), 120), end: subDays(new Date(), 100), days: 20, reason: 'relapse', trigger: 'social_media' },
    { id: 4, start: subDays(new Date(), 99), end: subDays(new Date(), 77), days: 22, reason: 'relapse', trigger: 'evening' },
    { id: 5, start: subDays(new Date(), 76), end: subDays(new Date(), 58), days: 18, reason: 'relapse', trigger: 'stress' },
    { id: 6, start: subDays(new Date(), 57), end: subDays(new Date(), 38), days: 19, reason: 'relapse', trigger: 'evening' },
    { id: 7, start: subDays(new Date(), 19), end: null, days: 19, reason: null, trigger: null }
  ],
  emotionalTracking: [{ date: new Date(), day: 19, phase: 2, anxiety: 8, moodStability: 3, mentalClarity: 5, emotionalProcessing: 4 }],
  urgeLog: [
    { date: new Date(), intensity: 8, trigger: 'evening', protocol: 'breathing', phase: 'Emotional Purging Phase', day: 19 },
    { date: subDays(new Date(), 1), intensity: 7, trigger: 'stress', protocol: 'cold_shower', phase: 'Emotional Purging Phase', day: 18 }
  ],
  notes: { [format(new Date(), 'yyyy-MM-dd')]: "Day 19 - HIGH RISK (72%)!" },
  discordUsername: 'AITester5#0005',
  showOnLeaderboard: false,
  dataSharing: true,
  analyticsOptIn: true,
  marketingEmails: false,
  darkMode: true,
  notifications: true,
  language: 'en',
  wisdomMode: false,
  urgeToolUsage: [
    { date: new Date(), tool: 'breathing', effective: true },
    { date: subDays(new Date(), 1), tool: 'cold_shower', effective: true }
  ]
};

export const aiTestUser6 = {
  username: 'aitest6',
  email: 'aitest6@example.com',
  startDate: subDays(new Date(), 45),
  currentStreak: 45,
  longestStreak: 45,
  wetDreamCount: 2,
  relapseCount: 4,
  isPremium: true,
  badges: getEarnedBadges(45),
  benefitTracking: createBenefitTracking(subDays(new Date(), 45), 45, 'high'),
  streakHistory: [
    { id: 1, start: subDays(new Date(), 120), end: subDays(new Date(), 110), days: 10, reason: 'relapse', trigger: 'stress' },
    { id: 2, start: subDays(new Date(), 109), end: subDays(new Date(), 95), days: 14, reason: 'relapse', trigger: 'loneliness' },
    { id: 3, start: subDays(new Date(), 94), end: subDays(new Date(), 70), days: 24, reason: 'relapse', trigger: 'social_media' },
    { id: 4, start: subDays(new Date(), 69), end: subDays(new Date(), 46), days: 23, reason: 'relapse', trigger: 'home_environment' },
    { id: 5, start: subDays(new Date(), 45), end: null, days: 45, reason: null, trigger: null }
  ],
  emotionalTracking: [{ date: new Date(), day: 45, phase: 4, anxiety: 2, moodStability: 9, mentalClarity: 9, emotionalProcessing: 9 }],
  urgeLog: [{ date: subDays(new Date(), 20), intensity: 5, trigger: 'stress', protocol: 'breathing', phase: 'Mental Expansion Phase', day: 25 }],
  notes: { [format(new Date(), 'yyyy-MM-dd')]: "Day 45! AI active (42%)" },
  discordUsername: 'AITester6#0006',
  showOnLeaderboard: true,
  dataSharing: true,
  analyticsOptIn: true,
  marketingEmails: false,
  darkMode: true,
  notifications: true,
  language: 'en',
  wisdomMode: false,
  urgeToolUsage: [{ date: subDays(new Date(), 20), tool: 'breathing', effective: true }]
};

// ========================================
// AI CARD TEST USER - Pre-trained model, shows PatternInsightCard
// UPDATED: Now has comprehensive emotional tracking for analysis tab testing
// ========================================

export const aiCardTestUser = {
  username: 'aicard',
  email: 'aicard@example.com',
  startDate: subDays(new Date(), 28),
  currentStreak: 28,
  longestStreak: 35,
  wetDreamCount: 1,
  relapseCount: 5,
  isPremium: true,
  badges: getEarnedBadges(28),
  benefitTracking: createBenefitTracking(subDays(new Date(), 28), 28, 'moderate'),
  streakHistory: [
    { id: 1, start: subDays(new Date(), 120), end: subDays(new Date(), 105), days: 15, reason: 'relapse', trigger: 'stress' },
    { id: 2, start: subDays(new Date(), 104), end: subDays(new Date(), 85), days: 19, reason: 'relapse', trigger: 'evening' },
    { id: 3, start: subDays(new Date(), 84), end: subDays(new Date(), 49), days: 35, reason: 'relapse', trigger: 'social_media' },
    { id: 4, start: subDays(new Date(), 48), end: subDays(new Date(), 35), days: 13, reason: 'relapse', trigger: 'boredom' },
    { id: 5, start: subDays(new Date(), 34), end: subDays(new Date(), 29), days: 5, reason: 'relapse', trigger: 'evening' },
    { id: 6, start: subDays(new Date(), 28), end: null, days: 28, reason: null, trigger: null }
  ],
  // COMPREHENSIVE emotional tracking for analysis tab testing
  emotionalTracking: [
    // Phase 1: Initial Adaptation (Days 1-7) - Higher anxiety, lower stability
    { date: subDays(new Date(), 27), day: 1, phase: 1, anxiety: 7, moodStability: 4, mentalClarity: 4, emotionalProcessing: 3 },
    { date: subDays(new Date(), 25), day: 3, phase: 1, anxiety: 6, moodStability: 4, mentalClarity: 5, emotionalProcessing: 4 },
    { date: subDays(new Date(), 23), day: 5, phase: 1, anxiety: 6, moodStability: 5, mentalClarity: 5, emotionalProcessing: 4 },
    { date: subDays(new Date(), 21), day: 7, phase: 1, anxiety: 5, moodStability: 5, mentalClarity: 5, emotionalProcessing: 5 },
    
    // Phase 2: Emotional Purging (Days 8-21) - Volatile, peaks and valleys
    { date: subDays(new Date(), 18), day: 10, phase: 2, anxiety: 7, moodStability: 4, mentalClarity: 6, emotionalProcessing: 5 },
    { date: subDays(new Date(), 16), day: 12, phase: 2, anxiety: 5, moodStability: 6, mentalClarity: 6, emotionalProcessing: 5 },
    { date: subDays(new Date(), 14), day: 14, phase: 2, anxiety: 8, moodStability: 3, mentalClarity: 5, emotionalProcessing: 4 },
    { date: subDays(new Date(), 11), day: 17, phase: 2, anxiety: 6, moodStability: 5, mentalClarity: 6, emotionalProcessing: 6 },
    { date: subDays(new Date(), 9), day: 19, phase: 2, anxiety: 5, moodStability: 6, mentalClarity: 7, emotionalProcessing: 6 },
    { date: subDays(new Date(), 7), day: 21, phase: 2, anxiety: 4, moodStability: 6, mentalClarity: 7, emotionalProcessing: 6 },
    
    // Phase 3: Mental Expansion (Days 22-28) - Generally improving
    { date: subDays(new Date(), 4), day: 24, phase: 3, anxiety: 4, moodStability: 7, mentalClarity: 7, emotionalProcessing: 7 },
    { date: subDays(new Date(), 2), day: 26, phase: 3, anxiety: 5, moodStability: 6, mentalClarity: 7, emotionalProcessing: 6 },
    { date: new Date(), day: 28, phase: 3, anxiety: 7, moodStability: 4, mentalClarity: 5, emotionalProcessing: 5 }
  ],
  urgeLog: [
    { date: new Date(), intensity: 7, trigger: 'evening', protocol: 'breathing', phase: 'Mental Expansion Phase', day: 28 },
    { date: subDays(new Date(), 1), intensity: 6, trigger: 'stress', protocol: 'cold_shower', phase: 'Mental Expansion Phase', day: 27 },
    { date: subDays(new Date(), 5), intensity: 5, trigger: 'boredom', protocol: 'exercise', phase: 'Mental Expansion Phase', day: 23 },
    { date: subDays(new Date(), 10), intensity: 8, trigger: 'stress', protocol: 'breathing', phase: 'Emotional Purging Phase', day: 18 },
    { date: subDays(new Date(), 14), intensity: 7, trigger: 'evening', protocol: 'cold_shower', phase: 'Emotional Purging Phase', day: 14 }
  ],
  notes: { 
    [format(new Date(), 'yyyy-MM-dd')]: "Day 28 - Testing AI Card!",
    [format(subDays(new Date(), 7), 'yyyy-MM-dd')]: "Day 21 - Made it through the purge phase!",
    [format(subDays(new Date(), 14), 'yyyy-MM-dd')]: "Day 14 - Rough day but staying strong.",
    [format(subDays(new Date(), 21), 'yyyy-MM-dd')]: "Day 7 - First week complete!"
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
    { date: new Date(), tool: 'breathing', effective: true },
    { date: subDays(new Date(), 1), tool: 'cold_shower', effective: true },
    { date: subDays(new Date(), 5), tool: 'exercise', effective: true },
    { date: subDays(new Date(), 10), tool: 'breathing', effective: false },
    { date: subDays(new Date(), 14), tool: 'cold_shower', effective: true }
  ]
};

// ========================================
// ORIGINAL PERSONALITY USERS
// ========================================

export const intjMockData = {
  username: 'intj',
  email: 'intj@example.com',
  startDate: subDays(new Date(), 425),
  currentStreak: 425,
  longestStreak: 425,
  wetDreamCount: 3,
  relapseCount: 0,
  isPremium: true,
  badges: getEarnedBadges(425),
  benefitTracking: createBenefitTracking(subDays(new Date(), 425), 425, 'high'),
  streakHistory: [{ id: 1, start: subDays(new Date(), 425), end: null, days: 425, reason: null, trigger: null }],
  emotionalTracking: [{ date: new Date(), day: 425, phase: 6, anxiety: 1, moodStability: 10, mentalClarity: 10, emotionalProcessing: 10 }],
  urgeLog: [],
  notes: {
    [format(addDays(subDays(new Date(), 425), 365), 'yyyy-MM-dd')]: "One full year! Completely transformed."
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

export const intpMockData = {
  username: 'intp',
  email: 'intp@example.com',
  startDate: subDays(new Date(), 275),
  currentStreak: 275,
  longestStreak: 275,
  wetDreamCount: 5,
  relapseCount: 0,
  isPremium: true,
  badges: getEarnedBadges(275),
  benefitTracking: createBenefitTracking(subDays(new Date(), 275), 275, 'good'),
  streakHistory: [{ id: 1, start: subDays(new Date(), 275), end: null, days: 275, reason: null, trigger: null }],
  emotionalTracking: [{ date: new Date(), day: 275, phase: 5, anxiety: 2, moodStability: 9, mentalClarity: 9, emotionalProcessing: 8 }],
  urgeLog: [{ date: subDays(new Date(), 150), intensity: 4, trigger: 'intellectual_curiosity', protocol: 'redirect', phase: 'Stabilization Phase', day: 125 }],
  notes: {
    [format(addDays(subDays(new Date(), 275), 240), 'yyyy-MM-dd')]: "8 months! Life transformed."
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
  urgeToolUsage: [{ date: subDays(new Date(), 100), tool: 'redirect', effective: true }]
};

export const enfpMockData = {
  username: 'enfp',
  email: 'enfp@example.com',
  startDate: subDays(new Date(), 89),
  currentStreak: 89,
  longestStreak: 423,
  wetDreamCount: 8,
  relapseCount: 3,
  isPremium: true,
  badges: getEarnedBadges(89),
  benefitTracking: createBenefitTracking(subDays(new Date(), 89), 89, 'moderate'),
  streakHistory: [
    { id: 1, start: subDays(new Date(), 600), end: subDays(new Date(), 177), days: 423, reason: 'relapse', trigger: 'relationship' },
    { id: 2, start: subDays(new Date(), 176), end: subDays(new Date(), 156), days: 20, reason: 'relapse', trigger: 'stress' },
    { id: 3, start: subDays(new Date(), 155), end: subDays(new Date(), 90), days: 65, reason: 'relapse', trigger: 'social_media' },
    { id: 4, start: subDays(new Date(), 89), end: null, days: 89, reason: null, trigger: null }
  ],
  emotionalTracking: [{ date: new Date(), day: 89, phase: 4, anxiety: 3, moodStability: 7, mentalClarity: 8, emotionalProcessing: 9 }],
  urgeLog: [{ date: subDays(new Date(), 30), intensity: 5, trigger: 'social_energy', protocol: 'redirect', phase: 'Spiritual Awakening Phase', day: 59 }],
  notes: {
    [format(addDays(subDays(new Date(), 600), 365), 'yyyy-MM-dd')]: "1 YEAR! Life is incredible."
  },
  discordUsername: 'ENFP_Vibes#9999',
  showOnLeaderboard: true,
  dataSharing: true,
  analyticsOptIn: true,
  marketingEmails: true,
  darkMode: false,
  notifications: true,
  language: 'en',
  wisdomMode: false,
  urgeToolUsage: [
    { date: subDays(new Date(), 45), tool: 'redirect', effective: true },
    { date: subDays(new Date(), 60), tool: 'breathing', effective: true }
  ]
};

// ========================================
// ORIGINAL SCENARIO USERS
// ========================================

export const newUserMockData = {
  username: 'newbie',
  email: 'newbie@example.com',
  startDate: new Date(),
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
  streakHistory: [{ id: 1, start: new Date(), end: null, days: 0, reason: null, trigger: null }],
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

export const veteranUserMockData = {
  username: 'veteran',
  email: 'veteran@example.com',
  startDate: new Date(new Date().setDate(new Date().getDate() - 127)),
  currentStreak: 127,
  longestStreak: 127,
  wetDreamCount: 8,
  relapseCount: 2,
  isPremium: true,
  badges: [
    { id: 1, name: '7-Day Warrior', earned: true, date: new Date(new Date().setDate(new Date().getDate() - 120)) },
    { id: 2, name: '14-Day Monk', earned: true, date: new Date(new Date().setDate(new Date().getDate() - 113)) },
    { id: 3, name: '30-Day Master', earned: true, date: new Date(new Date().setDate(new Date().getDate() - 97)) },
    { id: 4, name: '90-Day King', earned: true, date: new Date(new Date().setDate(new Date().getDate() - 37)) },
    { id: 5, name: '180-Day Emperor', earned: false, date: null },
    { id: 6, name: '365-Day Sage', earned: false, date: null }
  ],
  streakHistory: [
    { id: 1, start: new Date(new Date().setDate(new Date().getDate() - 200)), end: new Date(new Date().setDate(new Date().getDate() - 185)), days: 15, reason: 'relapse', trigger: 'stress' },
    { id: 2, start: new Date(new Date().setDate(new Date().getDate() - 184)), end: new Date(new Date().setDate(new Date().getDate() - 128)), days: 56, reason: 'relapse', trigger: 'social_media' },
    { id: 3, start: new Date(new Date().setDate(new Date().getDate() - 127)), end: null, days: 127, reason: null, trigger: null }
  ],
  benefitTracking: [{ date: new Date(), energy: 10, focus: 10, confidence: 9, aura: 10, sleep: 9, workout: 10 }],
  emotionalTracking: [{ date: new Date(), day: 127, phase: 5, anxiety: 1, moodStability: 10, mentalClarity: 10, emotionalProcessing: 10 }],
  urgeLog: [],
  notes: { [new Date().toISOString().split('T')[0]]: "Day 127. Life is beautiful." },
  discordUsername: 'KingVeteran#0001',
  showOnLeaderboard: true,
  dataSharing: true,
  analyticsOptIn: true,
  marketingEmails: true,
  darkMode: true,
  notifications: true,
  language: 'en',
  wisdomMode: true,
  urgeToolUsage: []
};

export const strugglingUserMockData = {
  username: 'struggling',
  email: 'struggling@example.com',
  startDate: new Date(new Date().setDate(new Date().getDate() - 3)),
  currentStreak: 3,
  longestStreak: 12,
  wetDreamCount: 1,
  relapseCount: 8,
  isPremium: false,
  badges: [
    { id: 1, name: '7-Day Warrior', earned: true, date: new Date(new Date().setDate(new Date().getDate() - 20)) },
    { id: 2, name: '14-Day Monk', earned: false, date: null },
    { id: 3, name: '30-Day Master', earned: false, date: null },
    { id: 4, name: '90-Day King', earned: false, date: null },
    { id: 5, name: '180-Day Emperor', earned: false, date: null },
    { id: 6, name: '365-Day Sage', earned: false, date: null }
  ],
  streakHistory: [
    { id: 1, start: new Date(new Date().setDate(new Date().getDate() - 50)), end: new Date(new Date().setDate(new Date().getDate() - 47)), days: 3, reason: 'relapse', trigger: 'lustful_thoughts' },
    { id: 2, start: new Date(new Date().setDate(new Date().getDate() - 46)), end: new Date(new Date().setDate(new Date().getDate() - 41)), days: 5, reason: 'relapse', trigger: 'boredom' },
    { id: 3, start: new Date(new Date().setDate(new Date().getDate() - 40)), end: new Date(new Date().setDate(new Date().getDate() - 28)), days: 12, reason: 'relapse', trigger: 'stress' },
    { id: 4, start: new Date(new Date().setDate(new Date().getDate() - 27)), end: new Date(new Date().setDate(new Date().getDate() - 25)), days: 2, reason: 'relapse', trigger: 'social_media' },
    { id: 5, start: new Date(new Date().setDate(new Date().getDate() - 24)), end: new Date(new Date().setDate(new Date().getDate() - 17)), days: 7, reason: 'relapse', trigger: 'loneliness' },
    { id: 6, start: new Date(new Date().setDate(new Date().getDate() - 16)), end: new Date(new Date().setDate(new Date().getDate() - 14)), days: 2, reason: 'relapse', trigger: 'social_media' },
    { id: 7, start: new Date(new Date().setDate(new Date().getDate() - 13)), end: new Date(new Date().setDate(new Date().getDate() - 7)), days: 6, reason: 'relapse', trigger: 'home_environment' },
    { id: 8, start: new Date(new Date().setDate(new Date().getDate() - 6)), end: new Date(new Date().setDate(new Date().getDate() - 4)), days: 2, reason: 'relapse', trigger: 'relationship' },
    { id: 9, start: new Date(new Date().setDate(new Date().getDate() - 3)), end: null, days: 3, reason: null, trigger: null }
  ],
  benefitTracking: [{ date: new Date(), energy: 4, focus: 3, confidence: 2, aura: 3, sleep: 4, workout: 3 }],
  emotionalTracking: [{ date: new Date(), day: 3, phase: 1, anxiety: 8, moodStability: 2, mentalClarity: 3, emotionalProcessing: 2 }],
  urgeLog: [
    { date: new Date(new Date().setDate(new Date().getDate() - 1)), intensity: 9, trigger: 'lustful_thoughts', protocol: 'breathing', phase: 'Initial Adaptation Phase', day: 2 },
    { date: new Date(), intensity: 8, trigger: 'stress', protocol: 'breathing', phase: 'Initial Adaptation Phase', day: 3 }
  ],
  notes: { [new Date().toISOString().split('T')[0]]: "Day 3 again... Not giving up." },
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
    { date: new Date(), tool: 'timer', effective: false },
    { date: new Date(new Date().setDate(new Date().getDate() - 1)), tool: 'breathing', effective: true }
  ]
};

// ========================================
// DEFAULT COMPREHENSIVE MOCK DATA
// ========================================

const comprehensiveMockData = {
  username: 'testuser',
  email: 'testuser@example.com',
  startDate: new Date(new Date().setDate(new Date().getDate() - 25)),
  currentStreak: 25,
  longestStreak: 47,
  wetDreamCount: 3,
  relapseCount: 4,
  isPremium: true,
  streakHistory: [
    { id: 1, start: new Date(new Date().setDate(new Date().getDate() - 120)), end: new Date(new Date().setDate(new Date().getDate() - 106)), days: 14, reason: 'relapse', trigger: 'stress' },
    { id: 2, start: new Date(new Date().setDate(new Date().getDate() - 105)), end: new Date(new Date().setDate(new Date().getDate() - 97)), days: 8, reason: 'relapse', trigger: 'social_media' },
    { id: 3, start: new Date(new Date().setDate(new Date().getDate() - 96)), end: new Date(new Date().setDate(new Date().getDate() - 49)), days: 47, reason: 'relapse', trigger: 'loneliness' },
    { id: 4, start: new Date(new Date().setDate(new Date().getDate() - 48)), end: new Date(new Date().setDate(new Date().getDate() - 26)), days: 22, reason: 'relapse', trigger: 'home_environment' },
    { id: 5, start: new Date(new Date().setDate(new Date().getDate() - 25)), end: null, days: 25, reason: null, trigger: null }
  ],
  badges: [
    { id: 1, name: '7-Day Warrior', earned: true, date: new Date(new Date().setDate(new Date().getDate() - 18)) },
    { id: 2, name: '14-Day Monk', earned: true, date: new Date(new Date().setDate(new Date().getDate() - 11)) },
    { id: 3, name: '30-Day Master', earned: false, date: null },
    { id: 4, name: '90-Day King', earned: false, date: null },
    { id: 5, name: '180-Day Emperor', earned: false, date: null },
    { id: 6, name: '365-Day Sage', earned: false, date: null }
  ],
  benefitTracking: [
    { date: new Date(), energy: 8, focus: 9, confidence: 7, aura: 8, sleep: 8, workout: 9 },
    { date: new Date(new Date().setDate(new Date().getDate() - 1)), energy: 7, focus: 8, confidence: 6, aura: 7, sleep: 7, workout: 8 },
    { date: new Date(new Date().setDate(new Date().getDate() - 7)), energy: 7, focus: 8, confidence: 6, aura: 7, sleep: 7, workout: 8 }
  ],
  emotionalTracking: [
    { date: new Date(), day: 25, phase: 3, anxiety: 3, moodStability: 8, mentalClarity: 9, emotionalProcessing: 7 }
  ],
  urgeLog: [
    { date: new Date(new Date().setDate(new Date().getDate() - 5)), intensity: 3, trigger: 'social_media', protocol: 'affirmation', phase: 'Mental Expansion Phase', day: 20 }
  ],
  notes: {
    [new Date().toISOString().split('T')[0]]: "Day 25 and feeling stronger than ever."
  },
  discordUsername: 'TestWarrior#1234',
  showOnLeaderboard: true,
  dataSharing: false,
  analyticsOptIn: true,
  marketingEmails: false,
  darkMode: true,
  notifications: true,
  language: 'en',
  wisdomMode: false,
  urgeToolUsage: []
};

export default comprehensiveMockData;