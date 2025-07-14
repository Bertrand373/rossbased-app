// components/Stats/StatsUtils.js - ENHANCED: Performance Optimized with Defensive Programming + Relapse Pattern Analytics
import { format, subDays, addDays, startOfDay, differenceInDays } from 'date-fns';
import toast from 'react-hot-toast';

// ENHANCED: Memoization cache for expensive calculations
const calculationCache = new Map();
const CACHE_EXPIRY = 5 * 60 * 1000; // 5 minutes

// ENHANCED: Cache key generator with defensive checks
const generateCacheKey = (userData, ...args) => {
  try {
    const safeUserData = userData || {};
    const benefitTrackingLength = safeUserData.benefitTracking?.length || 0;
    const currentStreak = safeUserData.currentStreak || 0;
    return `${benefitTrackingLength}-${currentStreak}-${args.join('-')}-${Date.now() % 60000}`;
  } catch (error) {
    console.warn('Cache key generation error:', error);
    return `fallback-${Date.now()}`;
  }
};

// ENHANCED: Safe cache getter with expiry
const getCachedResult = (key) => {
  try {
    const cached = calculationCache.get(key);
    if (cached && (Date.now() - cached.timestamp) < CACHE_EXPIRY) {
      return cached.result;
    }
    return null;
  } catch (error) {
    console.warn('Cache retrieval error:', error);
    return null;
  }
};

// ENHANCED: Safe cache setter
const setCachedResult = (key, result) => {
  try {
    calculationCache.set(key, { result, timestamp: Date.now() });
    // Cleanup old entries if cache gets too large
    if (calculationCache.size > 50) {
      const oldestKey = calculationCache.keys().next().value;
      calculationCache.delete(oldestKey);
    }
  } catch (error) {
    console.warn('Cache storage error:', error);
  }
};

// ENHANCED: Safe data validator
const validateUserData = (userData) => {
  if (!userData || typeof userData !== 'object') {
    return {
      currentStreak: 0,
      longestStreak: 0,
      startDate: new Date(),
      benefitTracking: [],
      badges: [],
      streakHistory: []
    };
  }

  return {
    currentStreak: Number.isInteger(userData.currentStreak) ? userData.currentStreak : 0,
    longestStreak: Number.isInteger(userData.longestStreak) ? userData.longestStreak : 0,
    startDate: userData.startDate ? new Date(userData.startDate) : new Date(),
    benefitTracking: Array.isArray(userData.benefitTracking) ? userData.benefitTracking : [],
    badges: Array.isArray(userData.badges) ? userData.badges : [],
    streakHistory: Array.isArray(userData.streakHistory) ? userData.streakHistory : [],
    ...userData
  };
};

// Helper function to convert markdown-style **text** to HTML bold
export const renderTextWithBold = (text) => {
  if (!text || typeof text !== 'string') return { __html: '' };
  try {
    const htmlText = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    return { __html: htmlText };
  } catch (error) {
    console.warn('Text rendering error:', error);
    return { __html: text };
  }
};

// Helper function to get time range display text
export const getTimeRangeDisplayText = (timeRange) => {
  const ranges = {
    'week': '(Last 7 Days)',
    'month': '(Last 30 Days)',
    'quarter': '(Last 90 Days)'
  };
  return ranges[timeRange] || '';
};

// ENHANCED: Badge checking logic with better error handling
export const checkAndUpdateBadges = (userData) => {
  try {
    const safeData = validateUserData(userData);
    
    if (!Array.isArray(safeData.badges)) {
      return safeData;
    }

    const currentStreak = safeData.currentStreak || 0;
    const longestStreak = safeData.longestStreak || 0;
    const maxStreak = Math.max(currentStreak, longestStreak);
    let hasNewBadges = false;
    
    const badgeThresholds = [
      { name: '7-Day Warrior', days: 7 },
      { name: '14-Day Monk', days: 14 },
      { name: '30-Day Master', days: 30 },
      { name: '90-Day King', days: 90 },
      { name: '180-Day Emperor', days: 180 },
      { name: '365-Day Sage', days: 365 }
    ];

    const updatedBadges = safeData.badges.map(badge => {
      if (!badge || typeof badge !== 'object') return badge;
      
      const threshold = badgeThresholds.find(t => t.name === badge.name);
      if (!threshold) return badge;

      const shouldBeEarned = maxStreak >= threshold.days;
      
      if (!badge.earned && shouldBeEarned) {
        hasNewBadges = true;
        
        try {
          toast.success(`🏆 Achievement Unlocked: ${badge.name}!`, {
            duration: 4000,
            style: {
              background: '#1a1a1a',
              color: '#ffffff',
              border: '1px solid #ffdd00'
            }
          });
        } catch (toastError) {
          console.warn('Toast notification error:', toastError);
        }
        
        return {
          ...badge,
          earned: true,
          date: new Date()
        };
      }
      
      return badge;
    });

    if (hasNewBadges) {
      return {
        ...safeData,
        badges: updatedBadges
      };
    }

    return safeData;
  } catch (error) {
    console.error('Badge update error:', error);
    return userData;
  }
};

// Get current phase based on streak
export const getCurrentPhase = (userData) => {
  try {
    const safeData = validateUserData(userData);
    const currentStreak = safeData.currentStreak || 0;
    
    if (currentStreak <= 14) return 'Foundation';
    if (currentStreak <= 45) return 'Purification';
    if (currentStreak <= 90) return 'Expansion';
    if (currentStreak <= 180) return 'Integration';
    return 'Mastery';
  } catch (error) {
    console.warn('Phase calculation error:', error);
    return 'Foundation';
  }
};

// Helper function for phase guidance
export const getPhaseGuidance = (phase, streak) => {
  try {
    const safeStreak = Number.isInteger(streak) ? streak : 0;
    const safePhase = typeof phase === 'string' ? phase : 'Foundation';
    
    const guidance = {
      'Foundation': `Day ${safeStreak}: Building new neural pathways. Every urge resisted strengthens your willpower circuitry.`,
      'Purification': `Day ${safeStreak}: Emotional purging active. Mood swings indicate deep healing - maintain practices even when motivation dips.`,
      'Expansion': `Day ${safeStreak}: Mental clarity emerging. Channel rising energy into creative projects and learning.`,
      'Integration': `Day ${safeStreak}: Spiritual integration beginning. You're developing natural magnetism and leadership presence.`,
      'Mastery': `Day ${safeStreak}: Mastery phase - your energy serves higher purposes. Focus on mentoring and service.`
    };
    
    return guidance[safePhase] || 'Continue building momentum with consistent daily practices.';
  } catch (error) {
    console.warn('Phase guidance error:', error);
    return 'Continue building momentum with consistent daily practices.';
  }
};

// ENHANCED: Filter benefit data with better error handling and caching
export const getFilteredBenefitData = (userData, timeRange) => {
  try {
    const cacheKey = generateCacheKey(userData, 'filtered', timeRange);
    const cached = getCachedResult(cacheKey);
    if (cached) return cached;

    const safeData = validateUserData(userData);
    
    if (!Array.isArray(safeData.benefitTracking)) {
      return [];
    }
    
    const timeRangeOptions = {
      week: 7,
      month: 30,
      quarter: 90
    };
    
    const days = timeRangeOptions[timeRange] || 7;
    const cutoffDate = subDays(new Date(), days);
    
    const result = safeData.benefitTracking
      .filter(item => {
        try {
          if (!item || !item.date) return false;
          const itemDate = new Date(item.date);
          return !isNaN(itemDate.getTime()) && itemDate >= cutoffDate;
        } catch (filterError) {
          console.warn('Date filtering error:', filterError);
          return false;
        }
      })
      .sort((a, b) => {
        try {
          return new Date(a.date) - new Date(b.date);
        } catch (sortError) {
          console.warn('Sort error:', sortError);
          return 0;
        }
      });

    setCachedResult(cacheKey, result);
    return result;
  } catch (error) {
    console.error('Filter benefit data error:', error);
    return [];
  }
};

// ENHANCED: Generate chart data with defensive programming
export const generateChartData = (userData, selectedMetric, timeRange) => {
  try {
    const cacheKey = generateCacheKey(userData, 'chart', selectedMetric, timeRange);
    const cached = getCachedResult(cacheKey);
    if (cached) return cached;

    const safeData = validateUserData(userData);
    const allUserData = safeData.benefitTracking || [];
    
    const timeRangeOptions = {
      week: 7,
      month: 30,
      quarter: 90
    };
    
    const days = timeRangeOptions[timeRange] || 7;
    const today = new Date();
    
    // Create complete time range array
    const timeRangeArray = [];
    const dataMap = new Map();
    
    // Build data map from user's actual data with error handling
    allUserData.forEach(item => {
      try {
        if (!item || !item.date) return;
        
        const itemDate = startOfDay(new Date(item.date));
        if (isNaN(itemDate.getTime())) return;
        
        let value = null;
        if (selectedMetric === 'sleep') {
          value = item[selectedMetric] || item.attraction || null;
        } else {
          value = item[selectedMetric] || null;
        }
        
        // Validate value is a number between 1-10
        if (typeof value === 'number' && value >= 1 && value <= 10) {
          dataMap.set(itemDate.getTime(), value);
        }
      } catch (itemError) {
        console.warn('Chart data item error:', itemError);
      }
    });
    
    // Generate time range labels and data
    for (let i = days - 1; i >= 0; i--) {
      try {
        const date = startOfDay(subDays(today, i));
        timeRangeArray.push({
          date,
          value: dataMap.get(date.getTime()) || null
        });
      } catch (dateError) {
        console.warn('Date generation error:', dateError);
      }
    }
    
    // Format labels based on time range
    const labels = timeRangeArray.map(item => {
      try {
        if (timeRange === 'week') {
          return format(item.date, 'EEE');
        } else if (timeRange === 'month') {
          return format(item.date, 'MMM d');
        } else {
          return format(item.date, 'MMM d');
        }
      } catch (formatError) {
        console.warn('Label formatting error:', formatError);
        return '';
      }
    });
    
    const data = timeRangeArray.map(item => item.value);
    
    const datasets = [{
      label: selectedMetric ? selectedMetric.charAt(0).toUpperCase() + selectedMetric.slice(1) : 'Data',
      data: data,
      borderColor: '#ffdd00',
      backgroundColor: 'rgba(255, 221, 0, 0.1)',
      tension: 0.3,
      fill: false,
      pointBackgroundColor: '#ffdd00',
      pointBorderColor: '#ffdd00',
      pointHoverBackgroundColor: '#f6cc00',
      pointHoverBorderColor: '#f6cc00',
      pointRadius: (context) => {
        try {
          return context.parsed.y !== null ? (timeRange === 'quarter' ? 4 : 6) : 0;
        } catch (contextError) {
          return 6;
        }
      },
      pointHoverRadius: (context) => {
        try {
          return context.parsed.y !== null ? (timeRange === 'quarter' ? 6 : 8) : 0;
        } catch (contextError) {
          return 8;
        }
      },
      pointBorderWidth: 2,
      pointHoverBorderWidth: 3,
      spanGaps: false
    }];
    
    const result = { labels, datasets, timeRangeArray };
    setCachedResult(cacheKey, result);
    return result;
  } catch (error) {
    console.error('Chart data generation error:', error);
    return {
      labels: [],
      datasets: [{
        label: 'Data',
        data: [],
        borderColor: '#ffdd00',
        backgroundColor: 'rgba(255, 221, 0, 0.1)'
      }],
      timeRangeArray: []
    };
  }
};

// ENHANCED: Calculate average with better error handling
export const calculateAverage = (userData, selectedMetric, timeRange, isPremium) => {
  try {
    const cacheKey = generateCacheKey(userData, 'average', selectedMetric, timeRange, isPremium);
    const cached = getCachedResult(cacheKey);
    if (cached) return cached;

    const safeData = validateUserData(userData);
    
    if (!isPremium) {
      const allData = safeData.benefitTracking || [];
      const last7DaysData = allData
        .filter(item => {
          try {
            if (!item || !item.date) return false;
            const itemDate = new Date(item.date);
            const cutoffDate = subDays(new Date(), 7);
            return !isNaN(itemDate.getTime()) && itemDate >= cutoffDate;
          } catch (filterError) {
            return false;
          }
        })
        .sort((a, b) => {
          try {
            return new Date(a.date) - new Date(b.date);
          } catch (sortError) {
            return 0;
          }
        });
      
      if (last7DaysData.length === 0) {
        setCachedResult(cacheKey, 'N/A');
        return 'N/A';
      }
      
      const validValues = last7DaysData
        .map(item => item.energy || 0)
        .filter(val => typeof val === 'number' && val >= 1 && val <= 10);
        
      if (validValues.length === 0) {
        setCachedResult(cacheKey, 'N/A');
        return 'N/A';
      }
      
      const sum = validValues.reduce((acc, val) => acc + val, 0);
      const result = (sum / validValues.length).toFixed(1);
      setCachedResult(cacheKey, result);
      return result;
    }
    
    const filteredData = getFilteredBenefitData(safeData, timeRange);
    if (filteredData.length === 0) {
      setCachedResult(cacheKey, 'N/A');
      return 'N/A';
    }
    
    const validValues = filteredData
      .map(item => {
        if (selectedMetric === 'sleep') {
          return item[selectedMetric] || item.attraction || 0;
        }
        return item[selectedMetric] || 0;
      })
      .filter(val => typeof val === 'number' && val >= 1 && val <= 10);
      
    if (validValues.length === 0) {
      setCachedResult(cacheKey, 'N/A');
      return 'N/A';
    }
    
    const sum = validValues.reduce((acc, val) => acc + val, 0);
    const result = (sum / validValues.length).toFixed(1);
    setCachedResult(cacheKey, result);
    return result;
  } catch (error) {
    console.error('Average calculation error:', error);
    return 'N/A';
  }
};

// NEW: Calculate days since last relapse for smart reframing
export const calculateDaysSinceLastRelapse = (userData) => {
  try {
    const safeData = validateUserData(userData);
    const streakHistory = safeData.streakHistory || [];
    
    // Filter for actual relapses (not wet dreams or other reasons)
    const relapses = streakHistory.filter(streak => 
      streak && streak.reason === 'relapse' && streak.end
    );
    
    if (relapses.length === 0) {
      return null; // Never relapsed
    }
    
    // Find the most recent relapse
    const mostRecentRelapse = relapses.reduce((latest, current) => {
      try {
        const currentDate = new Date(current.end);
        const latestDate = new Date(latest.end);
        return currentDate > latestDate ? current : latest;
      } catch (error) {
        return latest;
      }
    });
    
    if (!mostRecentRelapse || !mostRecentRelapse.end) {
      return null;
    }
    
    const lastRelapseDate = new Date(mostRecentRelapse.end);
    const today = new Date();
    const daysDifference = Math.floor((today - lastRelapseDate) / (1000 * 60 * 60 * 24));
    
    return daysDifference >= 0 ? daysDifference : 0;
  } catch (error) {
    console.error('Days since last relapse calculation error:', error);
    return null;
  }
};

// NEW: Relapse Pattern Analytics - Brutally Honest Trigger Analysis
export const generateRelapsePatternAnalysis = (userData) => {
  try {
    const cacheKey = generateCacheKey(userData, 'relapsePatterns');
    const cached = getCachedResult(cacheKey);
    if (cached) return cached;

    const safeData = validateUserData(userData);
    const streakHistory = safeData.streakHistory || [];
    const currentStreak = safeData.currentStreak || 0;
    
    // Filter for actual relapses (not wet dreams or other reasons)
    const relapses = streakHistory.filter(streak => 
      streak && streak.reason === 'relapse' && streak.trigger && streak.end
    );
    
    if (relapses.length === 0) {
      const result = {
        hasData: false,
        message: 'No relapse data available for pattern analysis',
        insights: ['Track your relapses with triggers to identify dangerous patterns and build targeted defenses.']
      };
      setCachedResult(cacheKey, result);
      return result;
    }

    if (relapses.length < 2) {
      const result = {
        hasData: false,
        message: 'Need 2+ relapses for meaningful pattern analysis',
        insights: [`Your single relapse trigger was **${relapses[0].trigger}**. This is your known vulnerability - build specific countermeasures now.`]
      };
      setCachedResult(cacheKey, result);
      return result;
    }

    const insights = [];
    
    // 1. PRIMARY TRIGGER ANALYSIS
    const triggerCounts = {};
    relapses.forEach(relapse => {
      const trigger = relapse.trigger;
      triggerCounts[trigger] = (triggerCounts[trigger] || 0) + 1;
    });
    
    const sortedTriggers = Object.entries(triggerCounts)
      .sort(([,a], [,b]) => b - a);
    
    const primaryTrigger = sortedTriggers[0];
    const primaryTriggerRate = ((primaryTrigger[1] / relapses.length) * 100).toFixed(0);
    
    if (primaryTriggerRate >= 40) {
      insights.push(`**Primary Vulnerability**: ${primaryTriggerRate}% of your relapses stem from **${primaryTrigger[0]}**. This is your Achilles heel - you cannot achieve mastery without addressing this specific trigger.`);
    }

    // 2. PHASE-SPECIFIC TRIGGER ANALYSIS
    const getPhaseFromDays = (days) => {
      if (days <= 7) return 'Foundation (Days 1-7)';
      if (days <= 14) return 'Early Foundation (Days 8-14)';
      if (days <= 30) return 'Purification (Days 15-30)';
      if (days <= 45) return 'Deep Purification (Days 31-45)';
      if (days <= 90) return 'Expansion (Days 46-90)';
      if (days <= 180) return 'Integration (Days 91-180)';
      return 'Mastery (180+ Days)';
    };

    const phaseBreakdowns = {};
    relapses.forEach(relapse => {
      try {
        const streakDays = relapse.days || 0;
        const phase = getPhaseFromDays(streakDays);
        const trigger = relapse.trigger;
        
        if (!phaseBreakdowns[phase]) {
          phaseBreakdowns[phase] = {};
        }
        phaseBreakdowns[phase][trigger] = (phaseBreakdowns[phase][trigger] || 0) + 1;
      } catch (phaseError) {
        console.warn('Phase breakdown error:', phaseError);
      }
    });

    // Identify most dangerous phase
    const phaseRelapseCount = Object.entries(phaseBreakdowns)
      .map(([phase, triggers]) => [phase, Object.values(triggers).reduce((sum, count) => sum + count, 0)])
      .sort(([,a], [,b]) => b - a);
    
    if (phaseRelapseCount.length > 0) {
      const [dangerousPhase, relapseCount] = phaseRelapseCount[0];
      const dangerousPhaseRate = ((relapseCount / relapses.length) * 100).toFixed(0);
      
      if (dangerousPhaseRate >= 40) {
        const phaseTriggers = Object.entries(phaseBreakdowns[dangerousPhase])
          .sort(([,a], [,b]) => b - a);
        const mainPhaseTrigger = phaseTriggers[0];
        
        insights.push(`**Critical Phase Vulnerability**: ${dangerousPhaseRate}% of relapses occur during **${dangerousPhase}** - specifically from **${mainPhaseTrigger[0]}**. This phase-trigger combination is your greatest threat.`);
      }
    }

    // 3. TRIGGER-SPECIFIC COUNTERMEASURES (Brutal honesty + retention wisdom)
    const triggerCountermeasures = {
      'stress': {
        explanation: 'Stress floods your system with cortisol, which directly depletes semen. Your body mistakenly believes reproduction is urgent during stress.',
        countermeasures: [
          '**Immediate**: 4-7-8 breathing technique (inhale 4, hold 7, exhale 8) to reset nervous system',
          '**Daily**: Cold exposure builds stress resilience - cold showers become your armor',
          '**Deep Work**: Stress often comes from unfinished business - complete what you start',
          '**Energy Management**: Schedule high-stress activities during your peak energy hours'
        ]
      },
      'boredom': {
        explanation: 'Boredom is dopamine starvation. Your brain craves stimulation and will destroy months of progress for 30 seconds of pleasure.',
        countermeasures: [
          '**Immediate**: Physical movement - 20 push-ups or 60-second plank breaks the boredom trance',
          '**Prevention**: Always have 3 meaningful activities ready when boredom hits',
          '**Purpose**: Boredom means you lack compelling life direction - find your mission',
          '**Environment**: Remove all triggers from your space - boredom + access = relapse'
        ]
      },
      'loneliness': {
        explanation: 'Loneliness triggers pair-bonding neurochemicals that make you crave connection. Your brain confuses sexual release with human intimacy.',
        countermeasures: [
          '**Immediate**: Call a friend or family member - actual human connection breaks the loneliness spiral',
          '**Social Investment**: Build genuine relationships before you need them',
          '**Self-Companionship**: Learn to enjoy your own company through meditation and journaling',
          '**Service**: Help others when lonely - it dissolves self-focused isolation'
        ]
      },
      'lustful_thoughts': {
        explanation: 'Mental fantasies drain sexual energy as much as physical acts. Thoughts become chemistry become actions become destiny.',
        countermeasures: [
          '**Immediate**: "Thought replacement" - immediately engage in complex mental tasks (math, memory games)',
          '**Transmutation**: Channel sexual energy upward through breathwork and movement',
          '**Mental Discipline**: Treat your mind like a muscle - train it to reject unwanted thoughts',
          '**Environmental Control**: Avoid known triggers - certain places, content, or people activate lustful thinking'
        ]
      },
      'social_media': {
        explanation: 'Social media hijacks your dopamine system with infinite scroll and suggestive content. Each scroll weakens your retention willpower.',
        countermeasures: [
          '**Immediate**: Delete apps during vulnerable periods - friction prevents impulsive usage',
          '**Time Limits**: Use built-in screen time controls - treat social media like a controlled substance',
          '**Content Curation**: Unfollow anything remotely suggestive - your feed determines your thoughts',
          '**Replacement Activity**: Have analog alternatives ready - books, exercise, real-world activities'
        ]
      },
      'relationship': {
        explanation: 'Relationship conflicts create emotional turbulence that clouds judgment. Wounded emotions seek quick relief through sexual release.',
        countermeasures: [
          '**Immediate**: Process emotions through journaling before acting - write out the pain',
          '**Communication**: Address conflicts directly instead of avoiding through sexual distraction',
          '**Boundary Setting**: Relationship drama often stems from unclear boundaries',
          '**Self-Worth**: Don\'t seek validation through sexual conquest - build internal confidence'
        ]
      },
      'home_environment': {
        explanation: 'Your environment programs your behavior. Familiar spaces with old habits trigger automatic relapse patterns.',
        countermeasures: [
          '**Immediate**: Change your physical location - leave the triggering space',
          '**Environmental Design**: Remove all triggers from your living space - create a retention sanctuary',
          '**New Associations**: Build new positive habits in the same spaces where you used to relapse',
          '**Accountability**: Have someone who can check your environment and hold you accountable'
        ]
      }
    };

    // Add specific countermeasures for primary trigger
    if (primaryTrigger && triggerCountermeasures[primaryTrigger[0]]) {
      const triggerData = triggerCountermeasures[primaryTrigger[0]];
      insights.push(`**Why ${primaryTrigger[0]} Destroys Retention**: ${triggerData.explanation}`);
      
      triggerData.countermeasures.forEach(countermeasure => {
        insights.push(countermeasure);
      });
    }

    // 4. CURRENT STREAK VULNERABILITY ASSESSMENT
    const currentPhase = getCurrentPhase(safeData);
    const currentPhaseRelapses = relapses.filter(relapse => {
      const streakDays = relapse.days || 0;
      const relapsePhase = getPhaseFromDays(streakDays);
      return relapsePhase.includes(currentPhase);
    });

    if (currentPhaseRelapses.length > 0) {
      const currentPhaseTriggers = {};
      currentPhaseRelapses.forEach(relapse => {
        const trigger = relapse.trigger;
        currentPhaseTriggers[trigger] = (currentPhaseTriggers[trigger] || 0) + 1;
      });
      
      const mostDangerousTrigger = Object.entries(currentPhaseTriggers)
        .sort(([,a], [,b]) => b - a)[0];
      
      insights.push(`**Current Phase Alert**: You're in ${currentPhase} phase where **${mostDangerousTrigger[0]}** has caused ${mostDangerousTrigger[1]} previous relapse(s). Extra vigilance required against this specific trigger.`);
    }

    // 5. PATTERN EVOLUTION ANALYSIS
    if (relapses.length >= 3) {
      const recentRelapses = relapses.slice(-3);
      const oldRelapses = relapses.slice(0, -3);
      
      const recentTriggers = {};
      const oldTriggers = {};
      
      recentRelapses.forEach(relapse => {
        const trigger = relapse.trigger;
        recentTriggers[trigger] = (recentTriggers[trigger] || 0) + 1;
      });
      
      oldRelapses.forEach(relapse => {
        const trigger = relapse.trigger;
        oldTriggers[trigger] = (oldTriggers[trigger] || 0) + 1;
      });
      
      const recentMostCommon = Object.entries(recentTriggers)
        .sort(([,a], [,b]) => b - a)[0];
      const oldMostCommon = Object.entries(oldTriggers)
        .sort(([,a], [,b]) => b - a)[0];
      
      if (recentMostCommon && oldMostCommon && recentMostCommon[0] !== oldMostCommon[0]) {
        insights.push(`**Evolving Threat Pattern**: Your relapse triggers have shifted from **${oldMostCommon[0]}** to **${recentMostCommon[0]}**. As you master one trigger, others become more dangerous.`);
      }
    }

    // 6. STREAK LENGTH vs TRIGGER ANALYSIS
    const avgStreakLength = relapses.reduce((sum, relapse) => sum + (relapse.days || 0), 0) / relapses.length;
    
    if (avgStreakLength < 7) {
      insights.push(`**Foundation Phase Trap**: Average streak length ${avgStreakLength.toFixed(1)} days indicates you're stuck in Foundation phase. Focus on basic habits before advanced retention techniques.`);
    } else if (avgStreakLength > 30) {
      insights.push(`**Advanced Practitioner Warning**: ${avgStreakLength.toFixed(1)}-day average streaks show advanced practice, but recurring relapses indicate subtle vulnerabilities that require deeper self-awareness.`);
    }

    const result = {
      hasData: true,
      relapseCount: relapses.length,
      primaryTrigger: primaryTrigger[0],
      insights: insights,
      triggerBreakdown: sortedTriggers
    };
    
    setCachedResult(cacheKey, result);
    return result;
  } catch (error) {
    console.error('Relapse pattern analysis error:', error);
    return {
      hasData: false,
      message: 'Unable to analyze relapse patterns at this time',
      insights: ['Pattern analysis temporarily unavailable. Continue tracking relapses with triggers for future insights.']
    };
  }
};

// ENHANCED: Smart Urge Management with caching and error handling
export const generateUrgeManagementGuidance = (userData, timeRange) => {
  try {
    const cacheKey = generateCacheKey(userData, 'urge', timeRange);
    const cached = getCachedResult(cacheKey);
    if (cached) return cached;

    const safeData = validateUserData(userData);
    const currentStreak = safeData.currentStreak || 0;
    const currentHour = new Date().getHours();
    const currentDay = new Date().getDay();
    const isWeekend = currentDay === 0 || currentDay === 6;
    const isEvening = currentHour >= 20 && currentHour <= 23;
    const filteredData = getFilteredBenefitData(safeData, timeRange);
    
    // Return N/A if insufficient data for meaningful analysis
    if (filteredData.length < 3 && currentStreak < 7) {
      const result = {
        guidance: ['Need 7+ days of streak data or 3+ days of benefit tracking for urge management assessment'],
        riskLevel: 'N/A'
      };
      setCachedResult(cacheKey, result);
      return result;
    }
    
    const guidance = [];
    let riskLevel = 'Low';
    
    // Time-based vulnerability
    if (isEvening) {
      riskLevel = 'Medium';
      guidance.push("**Evening Hours (8-11pm)**: High-risk period detected. Dopamine peaks naturally at night, increasing urge intensity. Consider ending screen time now.");
    }
    
    if (isWeekend) {
      riskLevel = riskLevel === 'Medium' ? 'High' : 'Medium';
      guidance.push("**Weekend Period**: Reduced structure increases vulnerability. Plan activities now - visit family, go to gym, or work on projects.");
    }
    
    // Critical spermatogenesis phase
    if (currentStreak >= 60 && currentStreak <= 74) {
      riskLevel = 'High';
      guidance.push(`**Day ${currentStreak} - Critical Phase**: Approaching spermatogenesis completion (67-74 days). Your body is transitioning from reproduction mode to optimization mode. Urges may intensify temporarily.`);
    }
    
    // Energy-based recommendations
    if (filteredData.length >= 3) {
      const last3Days = filteredData.slice(-3);
      const validEnergyValues = last3Days
        .map(day => day.energy || 5)
        .filter(val => typeof val === 'number' && val >= 1 && val <= 10);
        
      if (validEnergyValues.length > 0) {
        const avgEnergy = validEnergyValues.reduce((sum, val) => sum + val, 0) / validEnergyValues.length;
        
        if (avgEnergy < 5) {
          riskLevel = riskLevel === 'Low' ? 'Medium' : 'High';
          guidance.push(`**Low Energy Detected**: Energy averaging ${avgEnergy.toFixed(1)}/10. Low vitality increases relapse risk. Take a cold shower, do 20 push-ups, or call a friend immediately.`);
        }
      }
    }
    
    // Phase-specific guidance
    const phase = getCurrentPhase(safeData);
    const phaseGuidance = {
      'Foundation': "**Foundation Phase (Days 1-14)**: Building new neural pathways. Every urge resisted literally rewires your brain for self-mastery. You're becoming stronger each moment.",
      'Purification': "**Purification Phase (Days 15-45)**: Emotional purging active. If feeling anxious or depressed, this is normal - your psyche is healing. Urges may spike during emotional lows.",
      'Expansion': "**Expansion Phase (Days 46-90)**: Mental clarity emerging. Channel rising energy into creative projects, learning, or physical challenges. Your mind is becoming your superpower.",
      'Integration': "**Integration Phase (Days 91-180)**: Spiritual integration beginning. You're developing natural magnetism. Others may test you - stay centered and lead by example.",
      'Mastery': "**Mastery Phase (180+ days)**: You've transcended basic urges. Any current challenge is about service and using your power responsibly. You're now a teacher and healer."
    };
    
    guidance.push(phaseGuidance[phase] || phaseGuidance['Foundation']);
    
    const result = { guidance, riskLevel };
    setCachedResult(cacheKey, result);
    return result;
  } catch (error) {
    console.error('Urge management guidance error:', error);
    return {
      guidance: ['Unable to generate guidance at this time. Please try again later.'],
      riskLevel: 'Low'
    };
  }
};

// ENHANCED: Pattern Recognition with caching and better error handling
export const generatePatternRecognition = (userData, selectedMetric, isPremium) => {
  try {
    const cacheKey = generateCacheKey(userData, 'patterns', selectedMetric, isPremium);
    const cached = getCachedResult(cacheKey);
    if (cached) return cached;

    const safeData = validateUserData(userData);
    const allData = safeData.benefitTracking || [];
    const currentStreak = safeData.currentStreak || 0;
    
    // Require substantial data for meaningful patterns
    if (allData.length < 14) {
      const result = ['Need 14+ days of benefit tracking to identify meaningful patterns in your data'];
      setCachedResult(cacheKey, result);
      return result;
    }
    
    const patterns = [];
    
    // Energy-focus relationship (require significant data)
    if (isPremium && allData.length >= 20) {
      try {
        const energyData = allData.filter(d => d && typeof d.energy === 'number' && d.energy >= 7);
        if (energyData.length >= 5) {
          const validFocusValues = energyData
            .map(d => d.focus || 0)
            .filter(val => typeof val === 'number' && val >= 1 && val <= 10);
            
          const allValidFocusValues = allData
            .map(d => d.focus || 0)
            .filter(val => typeof val === 'number' && val >= 1 && val <= 10);
            
          if (validFocusValues.length >= 3 && allValidFocusValues.length >= 10) {
            const avgFocusWhenEnergyHigh = validFocusValues.reduce((sum, val) => sum + val, 0) / validFocusValues.length;
            const overallAvgFocus = allValidFocusValues.reduce((sum, val) => sum + val, 0) / allValidFocusValues.length;
            const improvement = ((avgFocusWhenEnergyHigh - overallAvgFocus) / overallAvgFocus * 100).toFixed(0);
            
            if (improvement > 20) {
              patterns.push(`**Energy-Focus Pattern**: When your energy hits 7+, focus averages ${avgFocusWhenEnergyHigh.toFixed(1)}/10 (${improvement}% above baseline). Schedule important work during high-energy periods.`);
            }
          }
        }
      } catch (patternError) {
        console.warn('Energy-focus pattern error:', patternError);
      }
    }
    
    // Sleep-confidence pattern (require significant data)
    if (isPremium && allData.length >= 20) {
      try {
        const poorSleepDays = allData.filter(d => {
          const sleepValue = d && (d.sleep || 5);
          return typeof sleepValue === 'number' && sleepValue < 5;
        });
        
        if (poorSleepDays.length >= 5) {
          const nextDayConfidence = poorSleepDays.map(d => {
            try {
              const dayAfter = allData.find(next => {
                if (!next || !next.date || !d.date) return false;
                const dayAfterDate = new Date(d.date);
                dayAfterDate.setDate(dayAfterDate.getDate() + 1);
                const nextDate = new Date(next.date);
                return !isNaN(nextDate.getTime()) && 
                       nextDate.toISOString().split('T')[0] === dayAfterDate.toISOString().split('T')[0];
              });
              return dayAfter && typeof dayAfter.confidence === 'number' ? dayAfter.confidence : null;
            } catch (dayError) {
              return null;
            }
          }).filter(confidence => confidence !== null && confidence >= 1 && confidence <= 10);
          
          if (nextDayConfidence.length >= 3) {
            const lowConfidenceRate = (nextDayConfidence.filter(c => c < 5).length / nextDayConfidence.length * 100).toFixed(0);
            if (lowConfidenceRate >= 60) {
              patterns.push(`**Sleep-Confidence Pattern**: Poor sleep leads to low confidence the next day ${lowConfidenceRate}% of the time (${nextDayConfidence.length} instances tracked). Sleep optimization is critical for emotional stability.`);
            }
          }
        }
      } catch (sleepError) {
        console.warn('Sleep-confidence pattern error:', sleepError);
      }
    }
    
    // Spermatogenesis phase insights
    if (currentStreak >= 74 && safeData.startDate) {
      try {
        const startDate = new Date(safeData.startDate);
        if (!isNaN(startDate.getTime())) {
          const post74Data = allData.filter(d => {
            try {
              if (!d || !d.date) return false;
              const itemDate = new Date(d.date);
              const daysSinceStart = Math.floor((itemDate - startDate) / (1000 * 60 * 60 * 24));
              return !isNaN(daysSinceStart) && daysSinceStart >= 74;
            } catch (filterError) {
              return false;
            }
          });
          
          if (post74Data.length > 7) {
            const validPost74Energy = post74Data
              .map(d => d.energy || 0)
              .filter(val => typeof val === 'number' && val >= 1 && val <= 10);
              
            const pre74Data = allData.filter(d => {
              try {
                if (!d || !d.date) return false;
                const itemDate = new Date(d.date);
                const daysSinceStart = Math.floor((itemDate - startDate) / (1000 * 60 * 60 * 24));
                return !isNaN(daysSinceStart) && daysSinceStart < 74;
              } catch (filterError) {
                return false;
              }
            });
            
            const validPre74Energy = pre74Data
              .map(d => d.energy || 0)
              .filter(val => typeof val === 'number' && val >= 1 && val <= 10);
            
            if (validPost74Energy.length > 0 && validPre74Energy.length > 0) {
              const avgEnergyPost74 = validPost74Energy.reduce((sum, val) => sum + val, 0) / validPost74Energy.length;
              const avgEnergyPre74 = validPre74Energy.reduce((sum, val) => sum + val, 0) / validPre74Energy.length;
              
              const improvement = ((avgEnergyPost74 - avgEnergyPre74) / avgEnergyPre74 * 100).toFixed(0);
              if (improvement > 10) {
                patterns.push(`**Post-Spermatogenesis Pattern**: Energy after day 74 averages ${avgEnergyPost74.toFixed(1)}/10 (${improvement}% higher than pre-74). Your body completed the biological transition from reproduction to cellular optimization.`);
              }
            }
          }
        }
      } catch (spermatogenesisError) {
        console.warn('Spermatogenesis pattern error:', spermatogenesisError);
      }
    }
    
    // Energy trend prediction (require sufficient recent data)
    if (allData.length >= 7) {
      try {
        const last5Days = allData.slice(-5);
        if (last5Days.length >= 3) {
          const firstEnergy = last5Days[0]?.energy;
          const lastEnergy = last5Days[last5Days.length - 1]?.energy;
          
          if (typeof firstEnergy === 'number' && typeof lastEnergy === 'number' && 
              firstEnergy >= 1 && firstEnergy <= 10 && lastEnergy >= 1 && lastEnergy <= 10) {
            const energyTrend = lastEnergy - firstEnergy;
            if (Math.abs(energyTrend) >= 1) {
              if (energyTrend > 0) {
                patterns.push(`**Energy Trend**: Rising ${energyTrend.toFixed(1)} points over 5 days. This upward momentum suggests successful energy transmutation - maintain current practices.`);
              } else {
                patterns.push(`**Energy Decline**: Dropped ${Math.abs(energyTrend).toFixed(1)} points over 5 days. Energy fluctuations during retention are normal - focus on rest and gentle movement.`);
              }
            }
          }
        }
      } catch (trendError) {
        console.warn('Energy trend error:', trendError);
      }
    }
    
    // Only add phase insights if user has been in current phase for meaningful time
    if (currentStreak >= 7) {
      const phase = getCurrentPhase(safeData);
      patterns.push(`**${phase} Phase**: ${getPhaseGuidance(phase, currentStreak)}`);
    }
    
    setCachedResult(cacheKey, patterns);
    return patterns;
  } catch (error) {
    console.error('Pattern recognition error:', error);
    return ['Unable to analyze patterns at this time. Please try again later.'];
  }
};

// ENHANCED: Optimization Guidance with better error handling
export const generateOptimizationGuidance = (userData, selectedMetric, timeRange, isPremium) => {
  try {
    const cacheKey = generateCacheKey(userData, 'optimization', selectedMetric, timeRange, isPremium);
    const cached = getCachedResult(cacheKey);
    if (cached) return cached;

    const safeData = validateUserData(userData);
    const allData = safeData.benefitTracking || [];
    const currentStreak = safeData.currentStreak || 0;
    
    if (allData.length < 10) {
      const result = {
        optimalRate: 'N/A',
        criteria: isPremium ? 'Energy 7+, Sleep 6+, Confidence 5+' : 'Energy 7+, Confidence 5+',
        recommendations: ['Need 10+ days of benefit tracking for optimization analysis']
      };
      setCachedResult(cacheKey, result);
      return result;
    }
    
    // Calculate optimal performance zone based on actual data
    const optimalDays = allData.filter(d => {
      try {
        if (!d) return false;
        const energy = d.energy || 0;
        const confidence = d.confidence || 0;
        const sleep = d.sleep || 0;
        
        const energyValid = typeof energy === 'number' && energy >= 7;
        const confidenceValid = typeof confidence === 'number' && confidence >= 5;
        const sleepValid = !isPremium || (typeof sleep === 'number' && sleep >= 6);
        
        return energyValid && confidenceValid && sleepValid;
      } catch (filterError) {
        return false;
      }
    });
    
    const optimalPercentage = allData.length > 0 ? (optimalDays.length / allData.length * 100).toFixed(0) : '0';
    const currentAvgEnergy = parseFloat(calculateAverage(safeData, selectedMetric, timeRange, isPremium));
    
    const guidance = {
      optimalRate: `${optimalPercentage}% optimal days`,
      criteria: isPremium ? 'Energy 7+, Sleep 6+, Confidence 5+' : 'Energy 7+, Confidence 5+',
      recommendations: []
    };
    
    // Base recommendations on actual data patterns, not assumptions
    if (currentAvgEnergy >= 7 && !isNaN(currentAvgEnergy)) {
      guidance.recommendations.push(`**Peak Performance Active**: Energy at ${currentAvgEnergy}/10 enables optimal training and decision-making. Your body can handle increased physical and mental challenges.`);
      
      // Only mention timing if we have data to support it
      if (allData.length >= 14) {
        guidance.recommendations.push("**High Energy Period**: This is your window for important decisions, challenging workouts, and creative projects. Your retention benefits are maximized right now.");
      }
    }
    
    // Recovery period guidance based on data
    if (currentAvgEnergy < 6 && !isNaN(currentAvgEnergy)) {
      guidance.recommendations.push(`**Integration Mode**: Energy at ${currentAvgEnergy}/10 indicates natural recovery cycle. Prioritize rest, gentle movement, and avoid forcing major decisions.`);
      
      // Phase-specific context only if meaningful
      if (currentStreak >= 15 && currentStreak <= 45) {
        guidance.recommendations.push("**Purification Phase Support**: Lower energy during emotional purging is normal. Your psyche is healing - allow the process and maintain basic practices.");
      }
    }
    
    // Pattern-based optimization (only with sufficient data)
    if (isPremium && allData.length >= 20) {
      try {
        const highConfidenceDays = allData.filter(d => {
          const confidence = d?.confidence || 0;
          return typeof confidence === 'number' && confidence >= 7;
        });
        
        if (highConfidenceDays.length >= 5) {
          const validEnergyValues = highConfidenceDays
            .map(d => d.energy || 0)
            .filter(val => typeof val === 'number' && val >= 1 && val <= 10);
            
          if (validEnergyValues.length > 0) {
            const avgEnergyHighConfidence = validEnergyValues.reduce((sum, val) => sum + val, 0) / validEnergyValues.length;
            guidance.recommendations.push(`**Decision-Making Pattern**: Your energy averages ${avgEnergyHighConfidence.toFixed(1)}/10 when confidence is high. This is your optimal window for important choices.`);
          }
        }
      } catch (patternError) {
        console.warn('Optimization pattern error:', patternError);
      }
    }
    
    setCachedResult(cacheKey, guidance);
    return guidance;
  } catch (error) {
    console.error('Optimization guidance error:', error);
    return {
      optimalRate: 'N/A',
      criteria: 'Energy 7+, Confidence 5+',
      recommendations: ['Unable to generate optimization guidance at this time.']
    };
  }
};

// ENHANCED: Historical comparison with better error handling
export const calculateHistoricalComparison = (userData, selectedMetric) => {
  try {
    const cacheKey = generateCacheKey(userData, 'historical', selectedMetric);
    const cached = getCachedResult(cacheKey);
    if (cached) return cached;

    const safeData = validateUserData(userData);
    const allData = safeData.benefitTracking || [];
    const currentStreak = safeData.currentStreak || 0;
    
    if (allData.length < 14) {
      const result = {
        hasData: false,
        message: 'Need 14+ days of benefit tracking for meaningful historical analysis'
      };
      setCachedResult(cacheKey, result);
      return result;
    }
    
    // Phase-based analysis instead of arbitrary time periods
    const getPhaseData = (phaseName, dayRange) => {
      try {
        if (!safeData.startDate) return null;
        
        const startDate = new Date(safeData.startDate);
        if (isNaN(startDate.getTime())) return null;
        
        const phaseData = allData.filter(item => {
          try {
            if (!item || !item.date) return false;
            const itemDate = new Date(item.date);
            const daysSinceStart = Math.floor((itemDate - startDate) / (1000 * 60 * 60 * 24));
            return !isNaN(daysSinceStart) && daysSinceStart >= dayRange.start && daysSinceStart <= dayRange.end;
          } catch (filterError) {
            return false;
          }
        });
        
        if (phaseData.length === 0) return null;
        
        const validValues = phaseData.map(item => {
          let value = null;
          if (selectedMetric === 'sleep') {
            value = item[selectedMetric] || item.attraction || 0;
          } else {
            value = item[selectedMetric] || 0;
          }
          return typeof value === 'number' && value >= 1 && value <= 10 ? value : null;
        }).filter(val => val !== null);
        
        if (validValues.length === 0) return null;
        
        const avg = validValues.reduce((sum, val) => sum + val, 0) / validValues.length;
        
        return { average: avg.toFixed(1), days: validValues.length };
      } catch (phaseError) {
        console.warn('Phase data error:', phaseError);
        return null;
      }
    };
    
    // Define meaningful phases
    const foundationPhase = getPhaseData('Foundation', { start: 1, end: 14 });
    const purificationPhase = getPhaseData('Purification', { start: 15, end: 45 });
    const expansionPhase = getPhaseData('Expansion', { start: 46, end: 90 });
    
    // Current phase average
    const currentAvg = calculateAverage(safeData, selectedMetric, 'week', true);
    
    // Find your best performing phase
    const phases = [
      { name: 'Foundation', data: foundationPhase, range: '1-14 days' },
      { name: 'Purification', data: purificationPhase, range: '15-45 days' },
      { name: 'Expansion', data: expansionPhase, range: '46-90 days' }
    ].filter(p => p.data !== null);
    
    if (phases.length === 0) {
      const result = {
        hasData: false,
        message: 'Tracking multiple phases needed for comparison'
      };
      setCachedResult(cacheKey, result);
      return result;
    }
    
    const bestPhase = phases.reduce((best, current) => 
      parseFloat(current.data.average) > parseFloat(best.data.average) ? current : best
    );
    
    const result = {
      hasData: true,
      current: currentAvg,
      bestPhase: bestPhase,
      allPhases: phases,
      insight: currentAvg !== 'N/A' && parseFloat(currentAvg) >= parseFloat(bestPhase.data.average) ? 
        'current_best' : 'room_for_improvement'
    };
    
    setCachedResult(cacheKey, result);
    return result;
  } catch (error) {
    console.error('Historical comparison error:', error);
    return {
      hasData: false,
      message: 'Unable to calculate historical comparison at this time'
    };
  }
};

// ENHANCED: Relapse risk assessment with better error handling
export const calculateRelapseRisk = (userData, timeRange, isPremium) => {
  try {
    const cacheKey = generateCacheKey(userData, 'risk', timeRange, isPremium);
    const cached = getCachedResult(cacheKey);
    if (cached) return cached;

    const safeData = validateUserData(userData);
    const filteredData = getFilteredBenefitData(safeData, timeRange);
    const currentStreak = safeData.currentStreak || 0;
    
    if (filteredData.length < 3) {
      const result = { 
        score: 'N/A', 
        factors: ['Need 3+ days of benefit tracking for risk assessment'], 
        level: 'Insufficient Data' 
      };
      setCachedResult(cacheKey, result);
      return result;
    }
    
    const last3Days = filteredData.slice(-3);
    let riskScore = 0;
    const riskFactors = [];
    
    // Energy decline trend
    if (last3Days.length >= 2) {
      try {
        const firstEnergy = last3Days[0]?.energy;
        const lastEnergy = last3Days[last3Days.length - 1]?.energy;
        
        if (typeof firstEnergy === 'number' && typeof lastEnergy === 'number' && 
            firstEnergy >= 1 && firstEnergy <= 10 && lastEnergy >= 1 && lastEnergy <= 10) {
          const energyTrend = lastEnergy - firstEnergy;
          if (energyTrend < -1) {
            riskScore += 25;
            riskFactors.push(`**Energy declining**: Dropped ${Math.abs(energyTrend).toFixed(1)} points in 3 days. Low vitality increases vulnerability - take cold shower or exercise immediately.`);
          }
        }
      } catch (energyError) {
        console.warn('Energy trend calculation error:', energyError);
      }
    }
    
    // Low confidence
    try {
      const validConfidenceValues = last3Days
        .map(day => day?.confidence || 5)
        .filter(val => typeof val === 'number' && val >= 1 && val <= 10);
        
      if (validConfidenceValues.length > 0) {
        const avgConfidence = validConfidenceValues.reduce((sum, val) => sum + val, 0) / validConfidenceValues.length;
        if (avgConfidence < 4) {
          riskScore += 20;
          riskFactors.push(`**Confidence low**: Averaging ${avgConfidence.toFixed(1)}/10. Emotional instability precedes most relapses - practice self-compassion and avoid isolation.`);
        }
      }
    } catch (confidenceError) {
      console.warn('Confidence calculation error:', confidenceError);
    }
    
    // Poor sleep quality
    if (isPremium) {
      try {
        const validSleepValues = last3Days
          .map(day => day?.sleep || 5)
          .filter(val => typeof val === 'number' && val >= 1 && val <= 10);
          
        if (validSleepValues.length > 0) {
          const avgSleep = validSleepValues.reduce((sum, val) => sum + val, 0) / validSleepValues.length;
          if (avgSleep < 5) {
            riskScore += 15;
            riskFactors.push(`**Sleep disrupted**: Quality at ${avgSleep.toFixed(1)}/10. Poor sleep weakens willpower - optimize evening routine and avoid screens after 9pm.`);
          }
        }
      } catch (sleepError) {
        console.warn('Sleep calculation error:', sleepError);
      }
    }
    
    // Low focus
    if (isPremium) {
      try {
        const validFocusValues = last3Days
          .map(day => day?.focus || 5)
          .filter(val => typeof val === 'number' && val >= 1 && val <= 10);
          
        if (validFocusValues.length > 0) {
          const avgFocus = validFocusValues.reduce((sum, val) => sum + val, 0) / validFocusValues.length;
          if (avgFocus < 4) {
            riskScore += 20;
            riskFactors.push(`**Focus scattered**: Averaging ${avgFocus.toFixed(1)}/10. Mental fog often signals approaching flatline - maintain practices and trust the process.`);
          }
        }
      } catch (focusError) {
        console.warn('Focus calculation error:', focusError);
      }
    }
    
    // Critical spermatogenesis phase
    if (currentStreak >= 60 && currentStreak <= 74) {
      riskScore += 15;
      riskFactors.push(`**Critical phase**: Day ${currentStreak} approaching spermatogenesis completion. Biological transition increases urge intensity - extra vigilance needed.`);
    }
    
    // Time-based risks
    try {
      const currentHour = new Date().getHours();
      const isWeekend = new Date().getDay() === 0 || new Date().getDay() === 6;
      const isEvening = currentHour >= 20 && currentHour <= 23;
      
      if (isWeekend) {
        riskScore += 10;
        riskFactors.push('**Weekend vulnerability**: Reduced structure increases risk - plan specific activities and avoid idle time.');
      }
      
      if (isEvening) {
        riskScore += 10;
        riskFactors.push('**Evening hours**: Natural dopamine peaks increase urge intensity - end screen time and prepare for sleep.');
      }
    } catch (timeError) {
      console.warn('Time-based risk calculation error:', timeError);
    }
    
    // Determine risk level
    let level = 'Low';
    if (riskScore >= 50) level = 'High';
    else if (riskScore >= 25) level = 'Medium';
    
    if (riskFactors.length === 0) {
      riskFactors.push('All metrics stable - retention patterns appear sustainable');
    }
    
    const result = {
      score: Math.min(riskScore, 100),
      factors: riskFactors,
      level
    };
    
    setCachedResult(cacheKey, result);
    return result;
  } catch (error) {
    console.error('Risk calculation error:', error);
    return {
      score: 'N/A',
      factors: ['Unable to calculate risk at this time'],
      level: 'Low'
    };
  }
};

// Info banner logic
export const shouldShowInfoBanner = (userData, timeRange) => {
  try {
    const safeData = validateUserData(userData);
    const benefitData = getFilteredBenefitData(safeData, timeRange);
    const hasMinimalData = benefitData.length < 7;
    const currentStreak = safeData.currentStreak || 0;
    const isNewUser = currentStreak <= 3;
    
    return hasMinimalData || isNewUser;
  } catch (error) {
    console.warn('Info banner check error:', error);
    return true; // Show banner on error to be safe
  }
};

// Calculate data quality for analysis
export const calculateDataQuality = (userData) => {
  try {
    const safeData = validateUserData(userData);
    const allData = safeData.benefitTracking || [];
    
    const recentData = allData.filter(item => {
      try {
        if (!item || !item.date) return false;
        const itemDate = new Date(item.date);
        const cutoffDate = subDays(new Date(), 14);
        return !isNaN(itemDate.getTime()) && itemDate >= cutoffDate;
      } catch (filterError) {
        return false;
      }
    });

    const recentCount = recentData.length;

    if (recentCount >= 14) {
      return { level: 'rich', label: 'Rich Analytics', days: recentCount };
    } else if (recentCount >= 7) {
      return { level: 'good', label: 'Good Data Set', days: recentCount };
    } else if (recentCount >= 3) {
      return { level: 'minimal', label: 'Basic Analysis', days: recentCount };
    } else {
      return { level: 'insufficient', label: 'Insufficient Data', days: recentCount };
    }
  } catch (error) {
    console.error('Data quality calculation error:', error);
    return { level: 'insufficient', label: 'Insufficient Data', days: 0 };
  }
};

// ENHANCED: Cache cleanup utility
export const clearStatsCache = () => {
  try {
    calculationCache.clear();
    console.log('Stats calculation cache cleared');
  } catch (error) {
    console.warn('Cache clear error:', error);
  }
};

// ENHANCED: Performance monitoring utility
export const getStatsPerformanceMetrics = () => {
  try {
    return {
      cacheSize: calculationCache.size,
      cacheKeys: Array.from(calculationCache.keys()),
      memoryUsage: calculationCache.size * 100 // Rough estimate in bytes
    };
  } catch (error) {
    console.warn('Performance metrics error:', error);
    return {
      cacheSize: 0,
      cacheKeys: [],
      memoryUsage: 0
    };
  }
};

// ENHANCED: Data validation utility for external use
export const validateBenefitTrackingData = (benefitData) => {
  try {
    if (!Array.isArray(benefitData)) {
      return { isValid: false, errors: ['Benefit data must be an array'] };
    }

    const errors = [];
    const validatedData = benefitData.map((item, index) => {
      const itemErrors = [];
      
      // Validate date
      if (!item.date) {
        itemErrors.push(`Item ${index}: Missing date`);
      } else {
        const date = new Date(item.date);
        if (isNaN(date.getTime())) {
          itemErrors.push(`Item ${index}: Invalid date format`);
        }
      }

      // Validate numeric fields
      const numericFields = ['energy', 'focus', 'confidence', 'aura', 'sleep', 'workout'];
      numericFields.forEach(field => {
        if (item[field] !== undefined) {
          const value = Number(item[field]);
          if (isNaN(value) || value < 1 || value > 10) {
            itemErrors.push(`Item ${index}: ${field} must be a number between 1-10`);
          }
        }
      });

      errors.push(...itemErrors);
      return item;
    });

    return {
      isValid: errors.length === 0,
      errors: errors,
      validatedData: errors.length === 0 ? validatedData : null
    };
  } catch (error) {
    console.error('Benefit data validation error:', error);
    return {
      isValid: false,
      errors: ['Validation process failed'],
      validatedData: null
    };
  }
};

// ENHANCED: Export configuration for debugging
export const STATS_CONFIG = {
  CACHE_EXPIRY_MS: CACHE_EXPIRY,
  MAX_CACHE_SIZE: 50,
  MIN_DATA_FOR_PATTERNS: 14,
  MIN_DATA_FOR_OPTIMIZATION: 10,
  MIN_DATA_FOR_RISK_ANALYSIS: 3,
  DEFAULT_LOADING_DURATION: 800,
  BADGE_THRESHOLDS: [
    { name: '7-Day Warrior', days: 7 },
    { name: '14-Day Monk', days: 14 },
    { name: '30-Day Master', days: 30 },
    { name: '90-Day King', days: 90 },
    { name: '180-Day Emperor', days: 180 },
    { name: '365-Day Sage', days: 365 }
  ]
};

// ENHANCED: Utility for migrating legacy data
export const migrateLegacyBenefitData = (userData) => {
  try {
    const safeData = validateUserData(userData);
    
    if (!Array.isArray(safeData.benefitTracking)) {
      return safeData;
    }

    // Migrate attraction -> sleep field
    const migratedBenefitTracking = safeData.benefitTracking.map(item => {
      if (!item) return item;
      
      const migratedItem = { ...item };
      
      // If sleep doesn't exist but attraction does, migrate it
      if (!migratedItem.sleep && migratedItem.attraction) {
        migratedItem.sleep = migratedItem.attraction;
        delete migratedItem.attraction;
      }
      
      // If gymPerformance exists but workout doesn't, migrate it
      if (!migratedItem.workout && migratedItem.gymPerformance) {
        migratedItem.workout = migratedItem.gymPerformance;
        delete migratedItem.gymPerformance;
      }
      
      return migratedItem;
    });

    return {
      ...safeData,
      benefitTracking: migratedBenefitTracking
    };
  } catch (error) {
    console.error('Legacy data migration error:', error);
    return userData;
  }
};

// ENHANCED: Debug utility for development
export const debugStatsCalculations = (userData, selectedMetric, timeRange, isPremium) => {
  try {
    console.group('🔍 Stats Debug Information');
    
    const safeData = validateUserData(userData);
    console.log('Validated User Data:', safeData);
    
    const filteredData = getFilteredBenefitData(safeData, timeRange);
    console.log(`Filtered Data (${timeRange}):`, filteredData);
    
    const average = calculateAverage(safeData, selectedMetric, timeRange, isPremium);
    console.log(`Average ${selectedMetric}:`, average);
    
    const dataQuality = calculateDataQuality(safeData);
    console.log('Data Quality:', dataQuality);
    
    const currentPhase = getCurrentPhase(safeData);
    console.log('Current Phase:', currentPhase);
    
    const performanceMetrics = getStatsPerformanceMetrics();
    console.log('Performance Metrics:', performanceMetrics);
    
    console.groupEnd();
    
    return {
      safeData,
      filteredData,
      average,
      dataQuality,
      currentPhase,
      performanceMetrics
    };
  } catch (error) {
    console.error('Debug calculation error:', error);
    return null;
  }
};