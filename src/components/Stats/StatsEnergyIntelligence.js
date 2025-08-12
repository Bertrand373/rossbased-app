// components/Stats/StatsEnergyIntelligence.js - Enhanced Free User Energy Analysis System
import { subDays, format, getDay, getHours } from 'date-fns';
import { validateUserData, getFilteredBenefitData } from './StatsCalculationUtils';
import { getCurrentPhase } from './StatsUtils';

// CORE: Generate comprehensive energy intelligence for free users
export const generateFreeUserEnergyAnalysis = (userData, timeRange = 'week') => {
  try {
    const safeData = validateUserData(userData);
    const energyData = getFilteredBenefitData(safeData, timeRange);
    const currentStreak = safeData.currentStreak || 0;
    const currentPhase = getCurrentPhase(safeData);
    const relapseHistory = safeData.streakHistory?.filter(s => s && s.reason === 'relapse') || [];
    
    return {
      personalPatterns: analyzePersonalEnergyPatterns(energyData),
      phaseIntelligence: generatePhaseEnergyIntelligence(currentPhase, currentStreak, energyData),
      riskPrediction: generateEnhancedRiskPrediction(energyData, relapseHistory, currentStreak),
      optimizationInsights: generateEnergyOptimization(energyData, safeData.streakHistory),
      upgradePreview: generateUpgradePreview(energyData, currentPhase),
      dataQuality: assessEnergyDataQuality(energyData)
    };
  } catch (error) {
    console.error('Energy intelligence generation error:', error);
    return getEmptyAnalysis();
  }
};

// 1. PERSONAL ENERGY PATTERN RECOGNITION
const analyzePersonalEnergyPatterns = (energyData) => {
  if (energyData.length < 7) {
    return {
      pattern: 'building',
      insight: 'Continue tracking for 7+ days to unlock your personal energy patterns',
      details: null
    };
  }

  try {
    // Analyze day-of-week patterns
    const dayPatterns = {};
    const timePatterns = {};
    
    energyData.forEach(entry => {
      if (!entry.date || typeof entry.energy !== 'number') return;
      
      const date = new Date(entry.date);
      const dayOfWeek = getDay(date); // 0 = Sunday, 6 = Saturday
      const dayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dayOfWeek];
      
      if (!dayPatterns[dayName]) dayPatterns[dayName] = [];
      dayPatterns[dayName].push(entry.energy);
    });

    // Find strongest day pattern
    let bestDay = null;
    let bestAverage = 0;
    let worstDay = null;
    let worstAverage = 10;

    Object.entries(dayPatterns).forEach(([day, energies]) => {
      if (energies.length >= 2) {
        const avg = energies.reduce((sum, e) => sum + e, 0) / energies.length;
        if (avg > bestAverage) {
          bestAverage = avg;
          bestDay = day;
        }
        if (avg < worstAverage) {
          worstAverage = avg;
          worstDay = day;
        }
      }
    });

    // Analyze weekly trends
    const weeklyTrend = calculateEnergyTrend(energyData);
    
    // Generate insight
    let pattern = 'stable';
    let insight = '';
    
    if (bestDay && worstDay && Math.abs(bestAverage - worstAverage) >= 1.5) {
      pattern = 'weekly-cycle';
      insight = `**Weekly Energy Cycle**: Your energy peaks on ${bestDay}s (${bestAverage.toFixed(1)}/10) and dips on ${worstDay}s (${worstAverage.toFixed(1)}/10). Plan challenging tasks for ${bestDay}s and recovery activities for ${worstDay}s.`;
    } else if (weeklyTrend.direction === 'rising' && weeklyTrend.strength >= 1) {
      pattern = 'ascending';
      insight = `**Ascending Energy Pattern**: Your energy is trending upward (+${weeklyTrend.strength.toFixed(1)} points this week). This momentum indicates successful energy transmutation - maintain current practices.`;
    } else if (weeklyTrend.direction === 'falling' && weeklyTrend.strength >= 1) {
      pattern = 'declining';
      insight = `**Energy Decline Detected**: Energy dropped ${weeklyTrend.strength.toFixed(1)} points recently. This could signal approaching flatline or need for lifestyle adjustments.`;
    } else {
      pattern = 'stable';
      insight = `**Stable Energy Baseline**: Your energy maintains consistent levels around ${calculateEnergyAverage(energyData).toFixed(1)}/10. Look for subtle patterns as you continue tracking.`;
    }

    return {
      pattern,
      insight,
      details: {
        bestDay,
        worstDay,
        bestAverage: bestAverage.toFixed(1),
        worstAverage: worstAverage.toFixed(1),
        weeklyTrend
      }
    };
  } catch (error) {
    console.warn('Pattern analysis error:', error);
    return {
      pattern: 'unknown',
      insight: 'Continue tracking to reveal your unique energy patterns',
      details: null
    };
  }
};

// 2. PHASE-SPECIFIC ENERGY INTELLIGENCE
const generatePhaseEnergyIntelligence = (currentPhase, currentStreak, energyData) => {
  const currentAvg = energyData.length > 0 ? calculateEnergyAverage(energyData) : null;
  
  const phaseGuidance = {
    'Foundation': {
      expectedRange: '4-7',
      description: 'Energy Foundation Building',
      guidance: `**Foundation Phase (Day ${currentStreak})**: Your nervous system is adapting to higher frequencies. Energy fluctuations between 4-7/10 are completely normal as your body learns to conserve vital force instead of depleting it.`,
      optimization: 'Focus on consistency over intensity. Small daily habits build unshakeable foundations.'
    },
    'Purification': {
      expectedRange: '3-6',
      description: 'Emotional Purging Active',
      guidance: `**Purification Phase (Day ${currentStreak})**: Energy naturally dips during days 15-45 as suppressed emotions surface for healing. Current fluctuations are therapeutic - your psyche is purging old patterns.`,
      optimization: 'Embrace energy lows as healing. Maintain basic practices even when motivation dips.'
    },
    'Expansion': {
      expectedRange: '6-9',
      description: 'Mental Transmutation Peak',
      guidance: `**Expansion Phase (Day ${currentStreak})**: Sexual energy is converting to cognitive power. Energy levels of 6-9/10 indicate successful alchemical transformation from raw desire to mental clarity.`,
      optimization: 'Channel rising energy into learning, creating, and ambitious goals. This is your peak performance window.'
    },
    'Integration': {
      expectedRange: '7-9',
      description: 'Spiritual Integration',
      guidance: `**Integration Phase (Day ${currentStreak})**: Sustained high energy (7-9/10) shows major consciousness expansion. You're embodying the divine masculine archetype and developing natural magnetism.`,
      optimization: 'Use stable high energy for leadership, service, and mentoring others on their journey.'
    },
    'Mastery': {
      expectedRange: '8-10',
      description: 'Service-Oriented Consciousness',
      guidance: `**Mastery Phase (Day ${currentStreak})**: Consistent 8-10/10 energy indicates complete energy mastery. Your individual development now serves universal consciousness evolution.`,
      optimization: 'You are a teacher and healer. Channel energy into service and breaking generational patterns.'
    }
  };

  const phase = phaseGuidance[currentPhase] || phaseGuidance['Foundation'];
  
  // Add current energy context
  let currentContext = '';
  if (currentAvg !== null) {
    const [min, max] = phase.expectedRange.split('-').map(Number);
    if (currentAvg >= min && currentAvg <= max) {
      currentContext = ` Your current ${currentAvg.toFixed(1)}/10 average is perfectly aligned with ${currentPhase} phase expectations.`;
    } else if (currentAvg > max) {
      currentContext = ` Your ${currentAvg.toFixed(1)}/10 average exceeds typical ${currentPhase} phase levels - exceptional progress!`;
    } else {
      currentContext = ` Your ${currentAvg.toFixed(1)}/10 average is below ${currentPhase} phase expectations. This is temporary - maintain practices and trust the process.`;
    }
  }

  return {
    phase: currentPhase,
    expectedRange: phase.expectedRange,
    description: phase.description,
    guidance: phase.guidance + currentContext,
    optimization: phase.optimization,
    currentAverage: currentAvg?.toFixed(1) || 'N/A'
  };
};

// 3. ENHANCED RISK PREDICTION (Energy + Personal Relapse History)
const generateEnhancedRiskPrediction = (energyData, relapseHistory, currentStreak) => {
  let riskScore = 0;
  const riskFactors = [];
  
  if (energyData.length < 3) {
    return {
      level: 'Unknown',
      score: 'N/A',
      factors: ['Track energy for 3+ days to unlock personalized risk prediction'],
      personalTriggers: []
    };
  }

  // Energy-based risk factors
  const recentEnergy = energyData.slice(-3);
  const avgRecentEnergy = calculateEnergyAverage(recentEnergy);
  
  if (avgRecentEnergy < 4) {
    riskScore += 30;
    riskFactors.push(`**Low Energy Alert**: Averaging ${avgRecentEnergy.toFixed(1)}/10 in last 3 days. Low vitality significantly increases relapse vulnerability.`);
  }

  // Energy decline trend
  if (recentEnergy.length >= 2) {
    const energyTrend = recentEnergy[recentEnergy.length - 1].energy - recentEnergy[0].energy;
    if (energyTrend <= -2) {
      riskScore += 25;
      riskFactors.push(`**Energy Crash Detected**: Energy dropped ${Math.abs(energyTrend)} points. Sudden drops often precede relapses - take immediate action.`);
    }
  }

  // Time-based vulnerability
  const currentHour = new Date().getHours();
  const isWeekend = [0, 6].includes(new Date().getDay());
  const isEvening = currentHour >= 20 && currentHour <= 23;

  if (isWeekend) {
    riskScore += 15;
    riskFactors.push('**Weekend Vulnerability**: Reduced structure increases risk. Plan specific activities.');
  }

  if (isEvening) {
    riskScore += 10;
    riskFactors.push('**Evening Hours**: Natural dopamine peaks increase urge intensity.');
  }

  // Personal relapse pattern analysis
  const personalTriggers = analyzePersonalRelapsePatterns(relapseHistory, currentStreak);
  
  if (personalTriggers.criticalPhase) {
    riskScore += 20;
    riskFactors.push(personalTriggers.criticalPhase);
  }

  if (personalTriggers.primaryTrigger) {
    riskScore += 15;
    riskFactors.push(personalTriggers.primaryTrigger);
  }

  // Determine risk level
  let level = 'Low';
  if (riskScore >= 50) level = 'High';
  else if (riskScore >= 25) level = 'Medium';

  return {
    level,
    score: Math.min(riskScore, 100),
    factors: riskFactors.length > 0 ? riskFactors : ['All indicators stable - good retention momentum'],
    personalTriggers: personalTriggers.triggers || []
  };
};

// 4. ENERGY OPTIMIZATION BASED ON SUCCESSFUL STREAKS
const generateEnergyOptimization = (energyData, streakHistory) => {
  if (energyData.length < 10) {
    return {
      status: 'insufficient',
      message: 'Track 10+ days to unlock energy optimization insights',
      recommendations: []
    };
  }

  try {
    // Find successful patterns from past streaks
    const successfulStreaks = (streakHistory || []).filter(s => s && s.days >= 7);
    
    // Analyze high-energy days (7+ energy)
    const highEnergyDays = energyData.filter(d => d.energy >= 7);
    const lowEnergyDays = energyData.filter(d => d.energy <= 4);
    
    const recommendations = [];
    
    if (highEnergyDays.length >= 3) {
      const highEnergyRate = (highEnergyDays.length / energyData.length * 100).toFixed(0);
      recommendations.push(`**High Performance Rate**: ${highEnergyRate}% of days achieve 7+ energy. Your success pattern shows this is achievable - identify what creates these peak days.`);
      
      // Analyze high energy day patterns
      const highEnergyDayPatterns = analyzeHighEnergyPatterns(highEnergyDays);
      if (highEnergyDayPatterns) {
        recommendations.push(highEnergyDayPatterns);
      }
    }

    if (lowEnergyDays.length >= 3) {
      const lowEnergyRate = (lowEnergyDays.length / energyData.length * 100).toFixed(0);
      recommendations.push(`**Vulnerability Window**: ${lowEnergyRate}% of days fall below 5/10 energy. These are your high-risk periods requiring extra vigilance and support strategies.`);
    }

    // Success streak analysis
    if (successfulStreaks.length > 0) {
      const avgSuccessfulStreak = successfulStreaks.reduce((sum, s) => sum + s.days, 0) / successfulStreaks.length;
      recommendations.push(`**Success Blueprint**: Your successful streaks average ${avgSuccessfulStreak.toFixed(0)} days. You have proven capability - consistency is key to exceeding this pattern.`);
    }

    // Current streak context
    const currentStreak = streakHistory?.[streakHistory.length - 1]?.days || 0;
    if (currentStreak > 0 && successfulStreaks.length > 0) {
      const longestSuccess = Math.max(...successfulStreaks.map(s => s.days));
      if (currentStreak >= longestSuccess * 0.8) {
        recommendations.push(`**Personal Record Zone**: Day ${currentStreak} puts you near your best performance (${longestSuccess} days). This is uncharted territory - extra focus required.`);
      }
    }

    return {
      status: 'active',
      message: 'Energy optimization insights based on your patterns',
      recommendations
    };
  } catch (error) {
    console.warn('Optimization analysis error:', error);
    return {
      status: 'error',
      message: 'Unable to generate optimization insights',
      recommendations: []
    };
  }
};

// 5. COMPELLING UPGRADE PREVIEW
const generateUpgradePreview = (energyData, currentPhase) => {
  const correlations = [];
  
  // Simulated multi-metric correlations that would be available with premium
  correlations.push({
    title: 'Energy-Confidence Synergy',
    description: 'When your energy hits 7+, confidence typically increases by 40%. Premium users can optimize this relationship.',
    locked: true
  });

  correlations.push({
    title: 'Sleep-Energy Optimization',
    description: `${currentPhase} phase sleep patterns directly impact next-day energy levels. Premium users get sleep optimization guidance.`,
    locked: true
  });

  correlations.push({
    title: 'Focus-Energy Correlation',
    description: 'Premium analytics reveal your focus levels peak 2 hours after high energy ratings. Unlock timing insights.',
    locked: true
  });

  correlations.push({
    title: 'Phase-Specific Multi-Metric Evolution',
    description: `Track how all 6 metrics evolve through ${currentPhase} phase. Premium shows complete transformation patterns.`,
    locked: true
  });

  return {
    available: correlations.length,
    correlations,
    upgradeMessage: 'Unlock complete energy analysis with 6-metric correlations, optimization timing, and phase-specific strategies.'
  };
};

// HELPER FUNCTIONS

const calculateEnergyAverage = (energyData) => {
  if (!energyData.length) return 0;
  const validEnergies = energyData.filter(d => typeof d.energy === 'number').map(d => d.energy);
  return validEnergies.length > 0 ? validEnergies.reduce((sum, e) => sum + e, 0) / validEnergies.length : 0;
};

const calculateEnergyTrend = (energyData) => {
  if (energyData.length < 2) return { direction: 'stable', strength: 0 };
  
  const validData = energyData.filter(d => typeof d.energy === 'number');
  if (validData.length < 2) return { direction: 'stable', strength: 0 };
  
  const firstEnergy = validData[0].energy;
  const lastEnergy = validData[validData.length - 1].energy;
  const difference = lastEnergy - firstEnergy;
  
  return {
    direction: difference > 0.5 ? 'rising' : difference < -0.5 ? 'falling' : 'stable',
    strength: Math.abs(difference)
  };
};

const analyzeHighEnergyPatterns = (highEnergyDays) => {
  if (highEnergyDays.length < 3) return null;
  
  try {
    // Analyze day of week for high energy
    const dayCount = {};
    highEnergyDays.forEach(day => {
      const dayName = format(new Date(day.date), 'EEEE');
      dayCount[dayName] = (dayCount[dayName] || 0) + 1;
    });
    
    const mostCommonDay = Object.entries(dayCount).reduce((a, b) => a[1] > b[1] ? a : b);
    
    if (mostCommonDay[1] >= 2) {
      return `**Peak Energy Pattern**: ${mostCommonDay[1]} of your highest energy days occur on ${mostCommonDay[0]}s. Schedule important tasks for ${mostCommonDay[0]}s.`;
    }
    
    return null;
  } catch (error) {
    return null;
  }
};

const analyzePersonalRelapsePatterns = (relapseHistory, currentStreak) => {
  if (!relapseHistory.length) return { triggers: [] };
  
  try {
    const triggers = [];
    
    // Primary trigger analysis
    const triggerCounts = {};
    relapseHistory.forEach(relapse => {
      if (relapse.trigger) {
        triggerCounts[relapse.trigger] = (triggerCounts[relapse.trigger] || 0) + 1;
      }
    });
    
    const sortedTriggers = Object.entries(triggerCounts).sort(([,a], [,b]) => b - a);
    
    let primaryTrigger = null;
    if (sortedTriggers.length > 0) {
      const [trigger, count] = sortedTriggers[0];
      const rate = (count / relapseHistory.length * 100).toFixed(0);
      if (rate >= 40) {
        const formattedTrigger = formatTriggerName(trigger);
        primaryTrigger = `**Personal Vulnerability**: ${rate}% of your relapses stem from ${formattedTrigger}. This is your primary weakness requiring targeted defenses.`;
        triggers.push(formattedTrigger);
      }
    }
    
    // Critical phase analysis
    let criticalPhase = null;
    const phaseCounts = {};
    relapseHistory.forEach(relapse => {
      const days = relapse.days || 0;
      const phase = getPhaseFromDays(days);
      phaseCounts[phase] = (phaseCounts[phase] || 0) + 1;
    });
    
    const dangerousPhase = Object.entries(phaseCounts).reduce((a, b) => a[1] > b[1] ? a : b);
    if (dangerousPhase && dangerousPhase[1] >= 2) {
      const currentPhase = getPhaseFromDays(currentStreak);
      if (currentPhase === dangerousPhase[0]) {
        criticalPhase = `**Critical Phase Alert**: You're in ${currentPhase} phase where ${dangerousPhase[1]} previous relapses occurred. Extra vigilance required.`;
      }
    }
    
    return {
      primaryTrigger,
      criticalPhase,
      triggers
    };
  } catch (error) {
    return { triggers: [] };
  }
};

const getPhaseFromDays = (days) => {
  if (days <= 14) return 'Foundation';
  if (days <= 45) return 'Purification';
  if (days <= 90) return 'Expansion';
  if (days <= 180) return 'Integration';
  return 'Mastery';
};

const formatTriggerName = (trigger) => {
  const triggerMap = {
    'stress': 'stress',
    'boredom': 'boredom',
    'loneliness': 'loneliness',
    'lustful_thoughts': 'lustful thoughts',
    'social_media': 'social media',
    'relationship': 'relationship issues',
    'home_environment': 'being home alone',
    'home_alone': 'being home alone',
    'explicit_content': 'explicit content',
    'alcohol_substances': 'alcohol/substances',
    'sleep_deprivation': 'sleep deprivation'
  };
  return triggerMap[trigger] || trigger.replace(/_/g, ' ');
};

const assessEnergyDataQuality = (energyData) => {
  const days = energyData.length;
  if (days >= 21) return { level: 'rich', label: 'Rich Energy Intelligence', days };
  if (days >= 14) return { level: 'good', label: 'Good Energy Analysis', days };
  if (days >= 7) return { level: 'basic', label: 'Basic Energy Insights', days };
  return { level: 'insufficient', label: 'Building Energy Profile', days };
};

const getEmptyAnalysis = () => ({
  personalPatterns: {
    pattern: 'insufficient',
    insight: 'Continue tracking energy daily to unlock personal insights',
    details: null
  },
  phaseIntelligence: {
    phase: 'Foundation',
    expectedRange: '4-7',
    description: 'Energy Foundation Building',
    guidance: 'Track energy daily to understand your phase-specific patterns',
    optimization: 'Consistency is key in early stages',
    currentAverage: 'N/A'
  },
  riskPrediction: {
    level: 'Unknown',
    score: 'N/A',
    factors: ['Start tracking energy to unlock risk prediction'],
    personalTriggers: []
  },
  optimizationInsights: {
    status: 'insufficient',
    message: 'Track 10+ days to unlock optimization insights',
    recommendations: []
  },
  upgradePreview: {
    available: 4,
    correlations: [],
    upgradeMessage: 'Upgrade to unlock complete multi-metric analysis'
  },
  dataQuality: { level: 'insufficient', label: 'Building Energy Profile', days: 0 }
});