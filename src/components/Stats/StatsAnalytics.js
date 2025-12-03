// src/components/Stats/StatsAnalytics.js
// ML-enhanced analytics - discovers user-specific patterns
// Works with MLPredictionService for pattern recognition

import mlPredictionService from '../../services/MLPredictionService';

// ============================================================
// YOUR NUMBERS - Calculate weekly averages and deltas
// ============================================================

export const calculateYourNumbers = (userData) => {
  const tracking = userData?.benefitTracking || [];
  
  if (tracking.length === 0) {
    return {
      weeklyAverages: {},
      deltas: {},
      hasData: false
    };
  }

  const metrics = ['energy', 'focus', 'confidence', 'aura', 'sleep', 'workout'];
  
  // Get last 7 days
  const thisWeek = tracking.slice(-7);
  // Get previous 7 days
  const lastWeek = tracking.slice(-14, -7);

  const weeklyAverages = {};
  const deltas = {};

  metrics.forEach(metric => {
    // This week average
    const thisWeekValues = thisWeek
      .map(d => d[metric])
      .filter(v => typeof v === 'number' && v >= 1 && v <= 10);
    
    const thisWeekAvg = thisWeekValues.length > 0
      ? thisWeekValues.reduce((a, b) => a + b, 0) / thisWeekValues.length
      : null;

    weeklyAverages[metric] = thisWeekAvg;

    // Last week average for delta
    if (lastWeek.length > 0) {
      const lastWeekValues = lastWeek
        .map(d => d[metric])
        .filter(v => typeof v === 'number' && v >= 1 && v <= 10);
      
      const lastWeekAvg = lastWeekValues.length > 0
        ? lastWeekValues.reduce((a, b) => a + b, 0) / lastWeekValues.length
        : null;

      if (thisWeekAvg !== null && lastWeekAvg !== null) {
        deltas[metric] = thisWeekAvg - lastWeekAvg;
      } else {
        deltas[metric] = null;
      }
    } else {
      deltas[metric] = null;
    }
  });

  return {
    weeklyAverages,
    deltas,
    hasData: true
  };
};

// ============================================================
// YOUR TRENDS - 14+ days analysis
// ============================================================

export const calculateYourTrends = (userData, selectedMetric) => {
  const tracking = userData?.benefitTracking || [];
  const streakHistory = userData?.streakHistory || [];
  
  if (tracking.length < 14) {
    return null;
  }

  const trends = {};

  // 1. Relapse frequency trend
  const relapses = streakHistory.filter(s => s.reason === 'relapse' && s.end);
  
  if (relapses.length >= 2) {
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    
    const recentRelapses = relapses.filter(r => new Date(r.end) >= ninetyDaysAgo);
    const recentRate = (recentRelapses.length / 3).toFixed(1); // per month
    
    const totalMonths = Math.max(1, tracking.length / 30);
    const overallRate = (relapses.length / totalMonths).toFixed(1);
    
    let trend = 'stable';
    if (parseFloat(recentRate) < parseFloat(overallRate) * 0.7) {
      trend = 'improving';
    } else if (parseFloat(recentRate) > parseFloat(overallRate) * 1.3) {
      trend = 'worsening';
    }
    
    trends.relapseFrequency = {
      recentRate: `${recentRate}/mo`,
      overallRate: `${overallRate}/mo`,
      trend
    };
  }

  // 2. Benefit performance trend
  const last7 = tracking.slice(-7);
  const overall = tracking;
  
  const recentValues = last7
    .map(d => d[selectedMetric])
    .filter(v => typeof v === 'number');
  
  const overallValues = overall
    .map(d => d[selectedMetric])
    .filter(v => typeof v === 'number');
  
  if (recentValues.length > 0 && overallValues.length > 0) {
    const recentAvg = recentValues.reduce((a, b) => a + b, 0) / recentValues.length;
    const overallAvg = overallValues.reduce((a, b) => a + b, 0) / overallValues.length;
    
    let trend = 'stable';
    if (recentAvg > overallAvg + 0.5) {
      trend = 'improving';
    } else if (recentAvg < overallAvg - 0.5) {
      trend = 'declining';
    }
    
    trends.benefitPerformance = {
      recentAvg: recentAvg.toFixed(1),
      overallAvg: overallAvg.toFixed(1),
      trend
    };
  }

  // 3. Weekday pattern
  const byDay = { weekday: [], weekend: [] };
  
  tracking.forEach(d => {
    if (!d.date || !d[selectedMetric]) return;
    const day = new Date(d.date).getDay();
    const isWeekend = day === 0 || day === 6;
    
    if (isWeekend) {
      byDay.weekend.push(d[selectedMetric]);
    } else {
      byDay.weekday.push(d[selectedMetric]);
    }
  });
  
  if (byDay.weekday.length >= 5 && byDay.weekend.length >= 2) {
    const weekdayAvg = byDay.weekday.reduce((a, b) => a + b, 0) / byDay.weekday.length;
    const weekendAvg = byDay.weekend.reduce((a, b) => a + b, 0) / byDay.weekend.length;
    
    const diff = Math.abs(weekdayAvg - weekendAvg);
    
    if (diff >= 1) {
      if (weekdayAvg > weekendAvg) {
        trends.weekdayPattern = `${selectedMetric.charAt(0).toUpperCase() + selectedMetric.slice(1)} dips on weekends (${weekendAvg.toFixed(1)} vs ${weekdayAvg.toFixed(1)} weekdays)`;
      } else {
        trends.weekdayPattern = `${selectedMetric.charAt(0).toUpperCase() + selectedMetric.slice(1)} peaks on weekends (${weekendAvg.toFixed(1)} vs ${weekdayAvg.toFixed(1)} weekdays)`;
      }
    }
  }

  return trends;
};

// ============================================================
// RELAPSE PATTERNS - Concrete analysis
// ============================================================

export const calculateRelapsePatterns = (userData) => {
  const streakHistory = userData?.streakHistory || [];
  const relapses = streakHistory.filter(s => s.reason === 'relapse');
  
  if (relapses.length === 0) {
    return { hasData: false };
  }

  const patterns = { hasData: true };

  // Average streak before relapse
  const streakDays = relapses
    .map(r => r.days)
    .filter(d => typeof d === 'number' && d > 0);
  
  if (streakDays.length > 0) {
    const avg = streakDays.reduce((a, b) => a + b, 0) / streakDays.length;
    patterns.averageStreakBeforeRelapse = Math.round(avg);
  }

  // Day of week pattern
  const relapsesWithDates = relapses.filter(r => r.end);
  if (relapsesWithDates.length >= 3) {
    const dayCount = [0, 0, 0, 0, 0, 0, 0]; // Sun-Sat
    relapsesWithDates.forEach(r => {
      const day = new Date(r.end).getDay();
      dayCount[day]++;
    });
    
    const weekendCount = dayCount[0] + dayCount[6];
    const weekdayCount = dayCount.slice(1, 6).reduce((a, b) => a + b, 0);
    const weekendPct = Math.round((weekendCount / relapsesWithDates.length) * 100);
    
    if (weekendPct >= 50) {
      patterns.dayOfWeekPattern = `${weekendPct}% of relapses on weekends`;
    } else if (weekendPct <= 20) {
      patterns.dayOfWeekPattern = `${100 - weekendPct}% of relapses on weekdays`;
    }
  }

  // Top triggers
  const triggersWithData = relapses.filter(r => r.trigger);
  if (triggersWithData.length >= 2) {
    const triggerCounts = {};
    triggersWithData.forEach(r => {
      triggerCounts[r.trigger] = (triggerCounts[r.trigger] || 0) + 1;
    });
    
    const sorted = Object.entries(triggerCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([trigger, count]) => ({
        name: formatTriggerName(trigger),
        count
      }));
    
    patterns.topTriggers = sorted;
  }

  // Danger zone (common streak length at relapse)
  if (streakDays.length >= 3) {
    const ranges = {
      early: streakDays.filter(d => d <= 14).length,
      mid: streakDays.filter(d => d > 14 && d <= 30).length,
      late: streakDays.filter(d => d > 30 && d <= 60).length,
      veteran: streakDays.filter(d => d > 60).length
    };
    
    const maxRange = Object.entries(ranges).sort((a, b) => b[1] - a[1])[0];
    
    if (maxRange[1] >= 2) {
      const rangeLabels = {
        early: 'Days 1-14',
        mid: 'Days 15-30',
        late: 'Days 31-60',
        veteran: 'Days 60+'
      };
      const pct = Math.round((maxRange[1] / streakDays.length) * 100);
      patterns.dangerZone = `${rangeLabels[maxRange[0]]} is your danger zone (${pct}% of relapses)`;
    }
  }

  return patterns;
};

// ============================================================
// ML-DISCOVERED PATTERNS - Uses trained model
// ============================================================

export const discoverMLPatterns = async (userData) => {
  const tracking = userData?.benefitTracking || [];
  const streakHistory = userData?.streakHistory || [];
  const relapses = streakHistory.filter(s => s.reason === 'relapse');
  
  // Need sufficient data
  if (tracking.length < 20 || relapses.length < 2) {
    return [];
  }

  const patterns = [];

  try {
    // Initialize ML service
    await mlPredictionService.initialize();
    
    // Get pattern analysis from ML service
    const mlAnalysis = {
      streak: mlPredictionService.analyzeStreakPatterns(userData),
      time: mlPredictionService.analyzeTimePatterns(userData),
      benefits: mlPredictionService.analyzeBenefitDrops(userData),
      triggers: mlPredictionService.getTopTriggers(userData)
    };

    // 1. Streak day patterns
    if (mlAnalysis.streak?.isHighRiskDay && mlAnalysis.streak.relapsesInRange >= 2) {
      patterns.push({
        condition: `Days ${mlAnalysis.streak.rangeDays[0]}-${mlAnalysis.streak.rangeDays[1]} in your streak`,
        outcome: `${mlAnalysis.streak.relapsesInRange} of ${mlAnalysis.streak.totalRelapses} relapses occurred here`
      });
    }

    // 2. Time patterns
    if (mlAnalysis.time?.eveningPercentage >= 50) {
      patterns.push({
        condition: 'Evening hours (after 8pm)',
        outcome: `${mlAnalysis.time.eveningPercentage}% of your relapses`
      });
    }

    // 3. Benefit drop patterns
    if (mlAnalysis.benefits?.hasSignificantDrop) {
      // Analyze if benefit drops preceded relapses
      const dropsBeforeRelapse = analyzeDropsBeforeRelapses(userData);
      if (dropsBeforeRelapse) {
        patterns.push({
          condition: dropsBeforeRelapse.condition,
          outcome: dropsBeforeRelapse.outcome
        });
      }
    }

    // 4. Combined conditions (ML-discovered correlations)
    const combinedPatterns = findCombinedPatterns(userData);
    patterns.push(...combinedPatterns);

  } catch (error) {
    console.error('ML pattern discovery error:', error);
    // Fall back to rule-based patterns
    return discoverRuleBasedPatterns(userData);
  }

  return patterns.slice(0, 4); // Max 4 patterns
};

// Analyze if benefit drops preceded relapses
const analyzeDropsBeforeRelapses = (userData) => {
  const tracking = userData?.benefitTracking || [];
  const relapses = (userData?.streakHistory || []).filter(s => s.reason === 'relapse' && s.end);
  
  if (tracking.length < 14 || relapses.length < 2) return null;
  
  let dropsBeforeRelapse = 0;
  let totalAnalyzed = 0;
  
  relapses.forEach(relapse => {
    const relapseDate = new Date(relapse.end);
    
    // Get 3 days before relapse
    const beforeRelapse = tracking.filter(d => {
      const date = new Date(d.date);
      const daysBefore = (relapseDate - date) / (1000 * 60 * 60 * 24);
      return daysBefore >= 1 && daysBefore <= 4;
    });
    
    if (beforeRelapse.length >= 2) {
      totalAnalyzed++;
      
      // Check for energy drop
      const energies = beforeRelapse.map(d => d.energy).filter(e => e);
      if (energies.length >= 2) {
        const firstEnergy = energies[0];
        const lastEnergy = energies[energies.length - 1];
        if (firstEnergy - lastEnergy >= 2) {
          dropsBeforeRelapse++;
        }
      }
    }
  });
  
  if (totalAnalyzed >= 2 && dropsBeforeRelapse / totalAnalyzed >= 0.6) {
    const pct = Math.round((dropsBeforeRelapse / totalAnalyzed) * 100);
    return {
      condition: 'Energy drop of 2+ points over 3 days',
      outcome: `Preceded ${pct}% of your relapses`
    };
  }
  
  return null;
};

// Find combined condition patterns
const findCombinedPatterns = (userData) => {
  const tracking = userData?.benefitTracking || [];
  const relapses = (userData?.streakHistory || []).filter(s => s.reason === 'relapse' && s.end);
  
  if (relapses.length < 3) return [];
  
  const patterns = [];
  
  // Check: Low energy + weekend
  const weekendRelapses = relapses.filter(r => {
    const day = new Date(r.end).getDay();
    return day === 0 || day === 6;
  });
  
  if (weekendRelapses.length >= 2) {
    // Check if energy was low before weekend relapses
    let lowEnergyWeekendCount = 0;
    
    weekendRelapses.forEach(relapse => {
      const relapseDate = new Date(relapse.end);
      const dayBefore = tracking.find(d => {
        const date = new Date(d.date);
        const diff = (relapseDate - date) / (1000 * 60 * 60 * 24);
        return diff >= 0 && diff <= 1;
      });
      
      if (dayBefore && dayBefore.energy && dayBefore.energy <= 5) {
        lowEnergyWeekendCount++;
      }
    });
    
    if (lowEnergyWeekendCount >= 2 && lowEnergyWeekendCount / weekendRelapses.length >= 0.6) {
      patterns.push({
        condition: 'Weekend + energy below 6',
        outcome: `High correlation with your relapses`
      });
    }
  }
  
  return patterns;
};

// Fallback rule-based pattern discovery
const discoverRuleBasedPatterns = (userData) => {
  const patterns = [];
  const tracking = userData?.benefitTracking || [];
  const relapses = (userData?.streakHistory || []).filter(s => s.reason === 'relapse');
  
  if (relapses.length < 2) return patterns;
  
  // Streak day clustering
  const streakDays = relapses.map(r => r.days).filter(d => d);
  if (streakDays.length >= 3) {
    const ranges = [
      { min: 1, max: 14, label: 'Days 1-14' },
      { min: 15, max: 30, label: 'Days 15-30' },
      { min: 31, max: 60, label: 'Days 31-60' }
    ];
    
    for (const range of ranges) {
      const inRange = streakDays.filter(d => d >= range.min && d <= range.max).length;
      const pct = inRange / streakDays.length;
      
      if (pct >= 0.5 && inRange >= 2) {
        patterns.push({
          condition: `${range.label} in your streak`,
          outcome: `${Math.round(pct * 100)}% of your relapses`
        });
        break;
      }
    }
  }
  
  return patterns;
};

// ============================================================
// PHASE EVOLUTION ANALYSIS
// ============================================================

export const calculatePhaseEvolution = (userData, selectedMetric) => {
  const tracking = userData?.benefitTracking || [];
  const startDate = userData?.startDate ? new Date(userData.startDate) : null;
  const currentStreak = userData?.currentStreak || 0;
  
  if (tracking.length < 14 || !startDate) {
    return null;
  }

  const getPhase = (daysSinceStart) => {
    if (daysSinceStart <= 14) return 'foundation';
    if (daysSinceStart <= 45) return 'purification';
    if (daysSinceStart <= 90) return 'expansion';
    if (daysSinceStart <= 180) return 'integration';
    return 'mastery';
  };

  // Group data by phase
  const phaseData = {};
  
  tracking.forEach(item => {
    if (!item.date) return;
    
    const itemDate = new Date(item.date);
    const daysSinceStart = Math.floor((itemDate - startDate) / (1000 * 60 * 60 * 24));
    
    if (daysSinceStart < 1) return;
    
    const phase = getPhase(daysSinceStart);
    const value = item[selectedMetric];
    
    if (typeof value !== 'number' || value < 1 || value > 10) return;
    
    if (!phaseData[phase]) {
      phaseData[phase] = [];
    }
    phaseData[phase].push(value);
  });

  // Calculate averages
  const phaseAverages = {};
  
  Object.entries(phaseData).forEach(([phase, values]) => {
    if (values.length > 0) {
      const avg = values.reduce((a, b) => a + b, 0) / values.length;
      phaseAverages[phase] = {
        average: Math.round(avg * 10) / 10,
        dataPoints: values.length
      };
    }
  });

  // Generate insight
  let insight = null;
  const phases = Object.keys(phaseAverages);
  
  if (phases.length >= 2) {
    const firstPhase = phases[0];
    const lastPhase = phases[phases.length - 1];
    
    const firstAvg = phaseAverages[firstPhase]?.average;
    const lastAvg = phaseAverages[lastPhase]?.average;
    
    if (firstAvg && lastAvg) {
      const diff = lastAvg - firstAvg;
      if (diff > 0.5) {
        insight = `${selectedMetric.charAt(0).toUpperCase() + selectedMetric.slice(1)} improved ${diff.toFixed(1)} points from ${firstPhase} to ${lastPhase} phase`;
      } else if (diff < -0.5) {
        insight = `${selectedMetric.charAt(0).toUpperCase() + selectedMetric.slice(1)} decreased ${Math.abs(diff).toFixed(1)} points - review your habits`;
      }
    }
  }

  return {
    phaseAverages,
    insight
  };
};

// ============================================================
// HELPERS
// ============================================================

const formatTriggerName = (trigger) => {
  const names = {
    stress: 'Stress',
    boredom: 'Boredom',
    loneliness: 'Loneliness',
    social_media: 'Social Media',
    evening: 'Evening',
    night: 'Night',
    late_night: 'Late Night',
    home_environment: 'Home Environment',
    relationship: 'Relationship',
    lustful_thoughts: 'Lustful Thoughts',
    anxiety: 'Anxiety'
  };
  return names[trigger] || trigger.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
};

export const calculateDaysSinceLastRelapse = (userData) => {
  const relapses = (userData?.streakHistory || []).filter(s => s.reason === 'relapse' && s.end);
  
  if (relapses.length === 0) return null;
  
  const lastRelapse = relapses.sort((a, b) => new Date(b.end) - new Date(a.end))[0];
  const daysSince = Math.floor((new Date() - new Date(lastRelapse.end)) / (1000 * 60 * 60 * 24));
  
  return daysSince;
};