// APPEND TO THE END OF YOUR EXISTING mockData.js file
// (Keep all your existing users, just add these new ones at the bottom)

// ========================================
// ENHANCED AI TEST USERS - Complete Coverage
// ========================================

// AI Test User 4: HIGH RISK PREDICTION (65% - Moderate Risk in evening)
export const aiTestUser4HighRisk = {
  username: 'aitest4_highrisk',
  email: 'aitest4@example.com',
  startDate: subDays(new Date(), 52), // 52 days - good streak
  currentStreak: 52,
  longestStreak: 52,
  wetDreamCount: 2,
  relapseCount: 5, // Multiple relapses for AI pattern learning
  isPremium: true,
  badges: getEarnedBadges(52),
  
  // High-risk factors: Evening time + Low energy + In purge phase + Anxiety
  benefitTracking: createBenefitTracking(subDays(new Date(), 52), 52, 'high').map((benefit, index) => {
    // Simulate energy drop in last 2 days
    if (index >= 50) {
      return {
        ...benefit,
        energy: 3, // Low energy (high risk factor)
        focus: 4,
        confidence: 5,
        anxiety: 8, // High anxiety
        moodStability: 3
      };
    }
    return benefit;
  }),
  
  streakHistory: [
    {
      id: 1,
      start: subDays(new Date(), 200),
      end: subDays(new Date(), 188),
      days: 12,
      reason: 'relapse',
      trigger: 'stress'
    },
    {
      id: 2,
      start: subDays(new Date(), 187),
      end: subDays(new Date(), 165),
      days: 22,
      reason: 'relapse',
      trigger: 'loneliness'
    },
    {
      id: 3,
      start: subDays(new Date(), 164),
      end: subDays(new Date(), 135),
      days: 29,
      reason: 'relapse',
      trigger: 'boredom'
    },
    {
      id: 4,
      start: subDays(new Date(), 134),
      end: subDays(new Date(), 90),
      days: 44,
      reason: 'relapse',
      trigger: 'social_media'
    },
    {
      id: 5,
      start: subDays(new Date(), 89),
      end: subDays(new Date(), 53),
      days: 36,
      reason: 'relapse',
      trigger: 'home_environment'
    },
    {
      id: 6,
      start: subDays(new Date(), 52),
      end: null, // Current streak
      days: 52,
      reason: null,
      trigger: null
    }
  ],
  
  emotionalTracking: [
    {
      date: new Date(),
      day: 52,
      phase: 4,
      anxiety: 8, // High anxiety - risk factor
      moodStability: 3, // Low mood stability - risk factor
      mentalClarity: 5,
      emotionalProcessing: 6
    }
  ],
  
  urgeLog: [
    {
      date: subDays(new Date(), 2),
      intensity: 7,
      trigger: 'stress',
      protocol: 'breathing',
      phase: 'Spiritual Awakening Phase',
      day: 50
    }
  ],
  
  notes: {
    [format(new Date(), 'yyyy-MM-dd')]: "Day 52. AI showing 65% risk tonight. Energy has been low last couple days and anxiety is up. Good thing I have the predictions!"
  },
  
  discordUsername: 'AITest4_HighRisk#0004',
  showOnLeaderboard: true,
  dataSharing: true,
  analyticsOptIn: true,
  marketingEmails: false,
  darkMode: true,
  notifications: true,
  language: 'en',
  wisdomMode: false,
  urgeToolUsage: [
    {
      date: subDays(new Date(), 2),
      tool: 'breathing',
      effective: true
    }
  ]
};

// AI Test User 5: EXTREME HIGH RISK (85% - High Risk in purge phase)
export const aiTestUser5ExtremeRisk = {
  username: 'aitest5_extremerisk',
  email: 'aitest5@example.com',
  startDate: subDays(new Date(), 38), // 38 days - smack in the middle of purge phase
  currentStreak: 38,
  longestStreak: 38,
  wetDreamCount: 1,
  relapseCount: 6, // Lots of relapses for AI learning
  isPremium: true,
  badges: getEarnedBadges(38),
  
  // Extreme risk factors: Purge phase + Low energy + High anxiety + Weekend + Evening
  benefitTracking: createBenefitTracking(subDays(new Date(), 38), 38, 'high').map((benefit, index) => {
    // Simulate purge phase symptoms
    if (index >= 35) {
      return {
        ...benefit,
        energy: 2, // Very low energy
        focus: 3,
        confidence: 4,
        anxiety: 9, // Very high anxiety
        moodStability: 2 // Very low mood stability
      };
    }
    return benefit;
  }),
  
  streakHistory: [
    // Pattern: User always relapses around day 30-45 (purge phase)
    {
      id: 1,
      start: subDays(new Date(), 250),
      end: subDays(new Date(), 218),
      days: 32, // Relapsed at day 32
      reason: 'relapse',
      trigger: 'stress'
    },
    {
      id: 2,
      start: subDays(new Date(), 217),
      end: subDays(new Date(), 178),
      days: 39, // Relapsed at day 39
      reason: 'relapse',
      trigger: 'anxiety'
    },
    {
      id: 3,
      start: subDays(new Date(), 177),
      end: subDays(new Date(), 145),
      days: 32, // Relapsed at day 32 again
      reason: 'relapse',
      trigger: 'mood_swings'
    },
    {
      id: 4,
      start: subDays(new Date(), 144),
      end: subDays(new Date(), 109),
      days: 35, // Relapsed at day 35
      reason: 'relapse',
      trigger: 'emotional_overwhelm'
    },
    {
      id: 5,
      start: subDays(new Date(), 108),
      end: subDays(new Date(), 67),
      days: 41, // Relapsed at day 41
      reason: 'relapse',
      trigger: 'loneliness'
    },
    {
      id: 6,
      start: subDays(new Date(), 66),
      end: subDays(new Date(), 39),
      days: 27, // Relapsed earlier this time
      reason: 'relapse',
      trigger: 'stress'
    },
    {
      id: 7,
      start: subDays(new Date(), 38),
      end: null, // Current streak - day 38, DANGER ZONE!
      days: 38,
      reason: null,
      trigger: null
    }
  ],
  
  emotionalTracking: [
    {
      date: new Date(),
      day: 38,
      phase: 2, // Emotional purging phase - HIGH RISK
      anxiety: 9, // Extreme anxiety
      moodStability: 2, // Very unstable
      mentalClarity: 4,
      emotionalProcessing: 3
    }
  ],
  
  urgeLog: [
    {
      date: new Date(),
      intensity: 9,
      trigger: 'emotional_overwhelm',
      protocol: 'breathing',
      phase: 'Emotional Purging Phase',
      day: 38
    },
    {
      date: subDays(new Date(), 1),
      intensity: 8,
      trigger: 'anxiety',
      protocol: 'coldshower',
      phase: 'Emotional Purging Phase',
      day: 37
    }
  ],
  
  notes: {
    [format(new Date(), 'yyyy-MM-dd')]: "Day 38 - AI showing 85% EXTREME RISK! This is my danger zone - I've relapsed around day 30-40 every single time. The purge phase is brutal. But this time I'm aware thanks to AI. Using all the tools!"
  },
  
  discordUsername: 'AITest5_ExtremeRisk#0005',
  showOnLeaderboard: true,
  dataSharing: true,
  analyticsOptIn: true,
  marketingEmails: false,
  darkMode: true,
  notifications: true,
  language: 'en',
  wisdomMode: false,
  urgeToolUsage: [
    {
      date: new Date(),
      tool: 'breathing',
      effective: true
    },
    {
      date: subDays(new Date(), 1),
      tool: 'coldshower',
      effective: true
    }
  ]
};

// AI Test User 6: LOW RISK (25% - Safe zone)
export const aiTestUser6LowRisk = {
  username: 'aitest6_lowrisk',
  email: 'aitest6@example.com',
  startDate: subDays(new Date(), 95), // 95 days - well past danger zones
  currentStreak: 95,
  longestStreak: 95,
  wetDreamCount: 4,
  relapseCount: 3,
  isPremium: true,
  badges: getEarnedBadges(95),
  
  // Low risk: Good energy, stable mood, past danger zones
  benefitTracking: createBenefitTracking(subDays(new Date(), 95), 95, 'high').map((benefit, index) => {
    // Great benefits in mastery phase
    if (index >= 90) {
      return {
        ...benefit,
        energy: 9,
        focus: 9,
        confidence: 9,
        anxiety: 2,
        moodStability: 9
      };
    }
    return benefit;
  }),
  
  streakHistory: [
    {
      id: 1,
      start: subDays(new Date(), 200),
      end: subDays(new Date(), 165),
      days: 35,
      reason: 'relapse',
      trigger: 'stress'
    },
    {
      id: 2,
      start: subDays(new Date(), 164),
      end: subDays(new Date(), 122),
      days: 42,
      reason: 'relapse',
      trigger: 'social_media'
    },
    {
      id: 3,
      start: subDays(new Date(), 121),
      end: subDays(new Date(), 96),
      days: 25,
      reason: 'relapse',
      trigger: 'boredom'
    },
    {
      id: 4,
      start: subDays(new Date(), 95),
      end: null, // Current streak - crushing it!
      days: 95,
      reason: null,
      trigger: null
    }
  ],
  
  emotionalTracking: [
    {
      date: new Date(),
      day: 95,
      phase: 4, // Mastery phase
      anxiety: 2,
      moodStability: 9,
      mentalClarity: 10,
      emotionalProcessing: 9
    }
  ],
  
  urgeLog: [], // No recent urges
  
  notes: {
    [format(new Date(), 'yyyy-MM-dd')]: "Day 95! AI showing only 25% risk. Life is good. Energy is high, mind is clear. The AI has been incredibly accurate - it warned me during my danger periods and now confirms I'm in a safe zone."
  },
  
  discordUsername: 'AITest6_LowRisk#0006',
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

// AI Test User 7: BUILDING DATA - 18 days (should show progress bar)
export const aiTestUser7BuildingData = {
  username: 'aitest7_building',
  email: 'aitest7@example.com',
  startDate: subDays(new Date(), 18), // 18 days - in building phase
  currentStreak: 18,
  longestStreak: 18,
  wetDreamCount: 0,
  relapseCount: 4, // HAS relapse history (required for widget to show)
  isPremium: true,
  badges: getEarnedBadges(18),
  
  // Good tracking consistency (required for benefitDays calculation)
  benefitTracking: createBenefitTracking(subDays(new Date(), 18), 18, 'high'), // High consistency = 17-18 days logged
  
  streakHistory: [
    {
      id: 1,
      start: subDays(new Date(), 60),
      end: subDays(new Date(), 52),
      days: 8,
      reason: 'relapse',
      trigger: 'stress'
    },
    {
      id: 2,
      start: subDays(new Date(), 51),
      end: subDays(new Date(), 40),
      days: 11,
      reason: 'relapse',
      trigger: 'social_media'
    },
    {
      id: 3,
      start: subDays(new Date(), 39),
      end: subDays(new Date(), 33),
      days: 6,
      reason: 'relapse',
      trigger: 'boredom'
    },
    {
      id: 4,
      start: subDays(new Date(), 32),
      end: subDays(new Date(), 19),
      days: 13,
      reason: 'relapse',
      trigger: 'loneliness'
    },
    {
      id: 5,
      start: subDays(new Date(), 18),
      end: null, // Current streak
      days: 18,
      reason: null,
      trigger: null
    }
  ],
  
  emotionalTracking: [
    {
      date: new Date(),
      day: 18,
      phase: 2,
      anxiety: 5,
      moodStability: 6,
      mentalClarity: 7,
      emotionalProcessing: 6
    }
  ],
  
  urgeLog: [],
  
  notes: {
    [format(new Date(), 'yyyy-MM-dd')]: "Day 18! Widget says 18/20 days tracked. Almost there! Can't wait to train the AI and see my patterns."
  },
  
  discordUsername: 'AITest7_Building#0007',
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

// Export all AI test users
export const allAITestUsers = {
  aiTestUser1, // 15 days - should show building data widget
  aiTestUser2, // 23 days - should show "ready to train" widget
  aiTestUser3, // 45 days - should show "model active" widget
  aiTestUser4HighRisk, // 52 days - should show 65% moderate risk prediction
  aiTestUser5ExtremeRisk, // 38 days - should show 85% high risk prediction
  aiTestUser6LowRisk, // 95 days - should show 25% low risk prediction
  aiTestUser7BuildingData // 18 days - should show building data widget (18/20)
};

// Keep your existing default export at the very bottom
// export default comprehensiveMockData;