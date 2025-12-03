// components/Stats/StatsAnalyticsUtils.js - Pure Data Analytics Functions
// REFACTORED: Removed all static educational content, now pure data calculations
import { subDays, format, differenceInDays } from 'date-fns';
import { validateUserData, getFilteredBenefitData, calculateAverage } from './StatsCalculationUtils';

// ============================================================
// THRESHOLD CONSTANTS
// ============================================================
const BASIC_PATTERNS_THRESHOLD = 14;  // Days required for pattern insights
const AI_PATTERNS_THRESHOLD = 20;     // Days required for AI patterns
const MIN_RELAPSES_FOR_PATTERNS = 2;  // Minimum relapses to learn patterns

// ============================================================
// PHASE UTILITIES - Aligned with Emotional Timeline
// ============================================================
export const getPhaseInfo = (streak) => {
  const safeStreak = Number.isInteger(streak) ? streak : 0;
  
  if (safeStreak <= 14) {
    return { key: 'initial', name: 'Initial Adaptation', range: '1-14' };
  }
  if (safeStreak <= 45) {
    return { key: 'emotional', name: 'Emotional Processing', range: '15-45' };
  }
  if (safeStreak <= 90) {
    return { key: 'mental', name: 'Mental Expansion', range: '46-90' };
  }
  if (safeStreak <= 180) {
    return { key: 'integration', name: 'Integration & Growth', range: '91-180' };
  }
  return { key: 'mastery', name: 'Mastery & Purpose', range: '181+' };
};

// ============================================================
// YOUR NUMBERS - 7-Day Metric Averages with Trends
// ============================================================
export const calculateMetricAverages = (userData, days = 7) => {
  try {
    const safeData = validateUserData(userData);
    const allData = safeData.benefitTracking || [];
    
    if (allData.length === 0) {
      return null;
    }
    
    const metrics = ['energy', 'focus', 'confidence', 'aura', 'sleep', 'workout'];
    const cutoffDate = subDays(new Date(), days);
    
    // Filter to recent data
    const recentData = allData.filter(item => {
      if (!item?.date) return false;
      const itemDate = new Date(item.date);
      return !isNaN(itemDate.getTime()) && itemDate >= cutoffDate;
    });
    
    if (recentData.length === 0) {
      return null;
    }
    
    const averages = {};
    
    metrics.forEach(metric => {
      const values = recentData
        .map(d => d[metric] || null)
        .filter(v => typeof v === 'number' && v >= 1 && v <= 10);
      
      if (values.length > 0) {
        const avg = values.reduce((sum, val) => sum + val, 0) / values.length;
        averages[metric] = {
          value: parseFloat(avg.toFixed(1)),
          dataPoints: values.length
        };
      } else {
        averages[metric] = { value: null, dataPoints: 0 };
      }
    });
    
    return {
      averages,
      daysAnalyzed: days,
      dataPointsInRange: recentData.length
    };
  } catch (error) {
    console.error('Metric averages calculation error:', error);
    return null;
  }
};

// ============================================================
// METRIC TRENDS - Compare current period to previous period
// ============================================================
export const calculateMetricTrends = (userData, currentPeriod = 7, comparePeriod = 7) => {
  try {
    const safeData = validateUserData(userData);
    const allData = safeData.benefitTracking || [];
    
    // Need at least enough data for comparison
    if (allData.length < currentPeriod + comparePeriod) {
      return null;
    }
    
    const metrics = ['energy', 'focus', 'confidence', 'aura', 'sleep', 'workout'];
    const today = new Date();
    
    // Current period: last N days
    const currentCutoff = subDays(today, currentPeriod);
    const previousCutoff = subDays(today, currentPeriod + comparePeriod);
    
    const currentData = allData.filter(item => {
      if (!item?.date) return false;
      const itemDate = new Date(item.date);
      return !isNaN(itemDate.getTime()) && itemDate >= currentCutoff;
    });
    
    const previousData = allData.filter(item => {
      if (!item?.date) return false;
      const itemDate = new Date(item.date);
      return !isNaN(itemDate.getTime()) && itemDate >= previousCutoff && itemDate < currentCutoff;
    });
    
    if (currentData.length < 3 || previousData.length < 3) {
      return null;
    }
    
    const trends = {};
    
    metrics.forEach(metric => {
      const currentValues = currentData
        .map(d => d[metric] || null)
        .filter(v => typeof v === 'number' && v >= 1 && v <= 10);
        
      const previousValues = previousData
        .map(d => d[metric] || null)
        .filter(v => typeof v === 'number' && v >= 1 && v <= 10);
      
      if (currentValues.length >= 2 && previousValues.length >= 2) {
        const currentAvg = currentValues.reduce((sum, val) => sum + val, 0) / currentValues.length;
        const previousAvg = previousValues.reduce((sum, val) => sum + val, 0) / previousValues.length;
        const delta = currentAvg - previousAvg;
        
        let direction = 'stable';
        if (delta >= 0.3) direction = 'up';
        else if (delta <= -0.3) direction = 'down';
        
        trends[metric] = {
          current: parseFloat(currentAvg.toFixed(1)),
          previous: parseFloat(previousAvg.toFixed(1)),
          delta: parseFloat(delta.toFixed(1)),
          direction
        };
      }
    });
    
    return Object.keys(trends).length > 0 ? trends : null;
  } catch (error) {
    console.error('Metric trends calculation error:', error);
    return null;
  }
};

// ============================================================
// IDENTIFY STRONGEST & WEAKEST METRICS
// ============================================================
export const identifyMetricExtremes = (userData, days = 7) => {
  try {
    const averages = calculateMetricAverages(userData, days);
    
    if (!averages?.averages) {
      return null;
    }
    
    const validMetrics = Object.entries(averages.averages)
      .filter(([_, data]) => data.value !== null && data.dataPoints >= 2)
      .map(([metric, data]) => ({ metric, value: data.value }));
    
    if (validMetrics.length < 2) {
      return null;
    }
    
    // Sort by value
    validMetrics.sort((a, b) => b.value - a.value);
    
    const strongest = validMetrics[0];
    const weakest = validMetrics[validMetrics.length - 1];
    
    // Only report if there's meaningful difference
    if (strongest.value - weakest.value < 0.5) {
      return {
        strongest: null,
        growthArea: null,
        message: 'Metrics balanced'
      };
    }
    
    return {
      strongest: {
        metric: strongest.metric,
        value: strongest.value
      },
      growthArea: {
        metric: weakest.metric,
        value: weakest.value
      }
    };
  } catch (error) {
    console.error('Metric extremes calculation error:', error);
    return null;
  }
};

// ============================================================
// DAY-OF-WEEK PATTERNS
// ============================================================
export const calculateDayOfWeekPatterns = (userData, metric = 'energy') => {
  try {
    const safeData = validateUserData(userData);
    const allData = safeData.benefitTracking || [];
    
    if (allData.length < BASIC_PATTERNS_THRESHOLD) {
      return null;
    }
    
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const dayData = [[], [], [], [], [], [], []]; // 0=Sun through 6=Sat
    
    allData.forEach(item => {
      if (!item?.date) return;
      const value = item[metric];
      if (typeof value !== 'number' || value < 1 || value > 10) return;
      
      const itemDate = new Date(item.date);
      if (isNaN(itemDate.getTime())) return;
      
      const dayOfWeek = itemDate.getDay();
      dayData[dayOfWeek].push(value);
    });
    
    // Calculate averages per day
    const dayAverages = dayData.map((values, idx) => {
      if (values.length < 2) return null;
      const avg = values.reduce((sum, v) => sum + v, 0) / values.length;
      return {
        day: dayNames[idx],
        dayIndex: idx,
        average: parseFloat(avg.toFixed(1)),
        dataPoints: values.length
      };
    }).filter(d => d !== null);
    
    if (dayAverages.length < 3) {
      return null;
    }
    
    // Find peak and low days
    const sorted = [...dayAverages].sort((a, b) => b.average - a.average);
    const peakDay = sorted[0];
    const lowDay = sorted[sorted.length - 1];
    
    // Find if there's a weekday vs weekend pattern
    const weekdayAvgs = dayAverages.filter(d => d.dayIndex >= 1 && d.dayIndex <= 5);
    const weekendAvgs = dayAverages.filter(d => d.dayIndex === 0 || d.dayIndex === 6);
    
    let weekdayAvg = null;
    let weekendAvg = null;
    
    if (weekdayAvgs.length >= 3) {
      weekdayAvg = weekdayAvgs.reduce((sum, d) => sum + d.average, 0) / weekdayAvgs.length;
    }
    if (weekendAvgs.length >= 1) {
      weekendAvg = weekendAvgs.reduce((sum, d) => sum + d.average, 0) / weekendAvgs.length;
    }
    
    return {
      metric,
      peakDay,
      lowDay,
      weekdayAvg: weekdayAvg ? parseFloat(weekdayAvg.toFixed(1)) : null,
      weekendAvg: weekendAvg ? parseFloat(weekendAvg.toFixed(1)) : null,
      dayAverages
    };
  } catch (error) {
    console.error('Day of week patterns error:', error);
    return null;
  }
};

// ============================================================
// METRIC-TO-METRIC CORRELATIONS
// ============================================================
export const calculateMetricCorrelations = (userData) => {
  try {
    const safeData = validateUserData(userData);
    const allData = safeData.benefitTracking || [];
    
    if (allData.length < BASIC_PATTERNS_THRESHOLD) {
      return null;
    }
    
    const correlations = [];
    
    // Sleep → Next day energy correlation
    const sleepEnergyCorr = calculateSleepNextDayCorrelation(allData, 'energy');
    if (sleepEnergyCorr) {
      correlations.push(sleepEnergyCorr);
    }
    
    // Sleep → Next day focus correlation
    const sleepFocusCorr = calculateSleepNextDayCorrelation(allData, 'focus');
    if (sleepFocusCorr) {
      correlations.push(sleepFocusCorr);
    }
    
    // Workout → Energy same day correlation
    const workoutEnergyCorr = calculateSameDayCorrelation(allData, 'workout', 'energy');
    if (workoutEnergyCorr) {
      correlations.push(workoutEnergyCorr);
    }
    
    // Energy → Confidence same day correlation
    const energyConfidenceCorr = calculateSameDayCorrelation(allData, 'energy', 'confidence');
    if (energyConfidenceCorr) {
      correlations.push(energyConfidenceCorr);
    }
    
    return correlations.length > 0 ? correlations : null;
  } catch (error) {
    console.error('Metric correlations error:', error);
    return null;
  }
};

// Helper: Calculate sleep → next day metric correlation
const calculateSleepNextDayCorrelation = (allData, targetMetric) => {
  try {
    const pairs = [];
    
    // Sort by date
    const sorted = [...allData].sort((a, b) => new Date(a.date) - new Date(b.date));
    
    for (let i = 0; i < sorted.length - 1; i++) {
      const today = sorted[i];
      const tomorrow = sorted[i + 1];
      
      if (!today?.date || !tomorrow?.date) continue;
      
      const todayDate = new Date(today.date);
      const tomorrowDate = new Date(tomorrow.date);
      
      // Check if consecutive days
      const diffDays = differenceInDays(tomorrowDate, todayDate);
      if (diffDays !== 1) continue;
      
      const sleepValue = today.sleep;
      const targetValue = tomorrow[targetMetric];
      
      if (typeof sleepValue === 'number' && typeof targetValue === 'number' &&
          sleepValue >= 1 && sleepValue <= 10 && targetValue >= 1 && targetValue <= 10) {
        pairs.push({ sleep: sleepValue, target: targetValue });
      }
    }
    
    if (pairs.length < 5) return null;
    
    // Calculate averages for high sleep (7+) vs low sleep (<6)
    const highSleep = pairs.filter(p => p.sleep >= 7);
    const lowSleep = pairs.filter(p => p.sleep < 6);
    
    if (highSleep.length < 3 || lowSleep.length < 2) return null;
    
    const highAvg = highSleep.reduce((sum, p) => sum + p.target, 0) / highSleep.length;
    const lowAvg = lowSleep.reduce((sum, p) => sum + p.target, 0) / lowSleep.length;
    const diff = highAvg - lowAvg;
    
    if (Math.abs(diff) < 0.5) return null;
    
    return {
      type: 'sleep_next_day',
      source: 'sleep',
      target: targetMetric,
      highSleepAvg: parseFloat(highAvg.toFixed(1)),
      lowSleepAvg: parseFloat(lowAvg.toFixed(1)),
      difference: parseFloat(diff.toFixed(1)),
      dataPoints: pairs.length
    };
  } catch (error) {
    return null;
  }
};

// Helper: Calculate same-day metric correlation
const calculateSameDayCorrelation = (allData, sourceMetric, targetMetric) => {
  try {
    const validPairs = allData.filter(d => {
      const source = d[sourceMetric];
      const target = d[targetMetric];
      return typeof source === 'number' && typeof target === 'number' &&
             source >= 1 && source <= 10 && target >= 1 && target <= 10;
    });
    
    if (validPairs.length < 10) return null;
    
    // High source (7+) vs low source (<5)
    const highSource = validPairs.filter(d => d[sourceMetric] >= 7);
    const lowSource = validPairs.filter(d => d[sourceMetric] < 5);
    
    if (highSource.length < 3 || lowSource.length < 3) return null;
    
    const highAvg = highSource.reduce((sum, d) => sum + d[targetMetric], 0) / highSource.length;
    const lowAvg = lowSource.reduce((sum, d) => sum + d[targetMetric], 0) / lowSource.length;
    const diff = highAvg - lowAvg;
    
    if (Math.abs(diff) < 0.5) return null;
    
    return {
      type: 'same_day',
      source: sourceMetric,
      target: targetMetric,
      highSourceAvg: parseFloat(highAvg.toFixed(1)),
      lowSourceAvg: parseFloat(lowAvg.toFixed(1)),
      difference: parseFloat(diff.toFixed(1)),
      dataPoints: validPairs.length
    };
  } catch (error) {
    return null;
  }
};

// ============================================================
// GROWTH RATES - % improvement over time
// ============================================================
export const calculateGrowthRates = (userData, days = 30) => {
  try {
    const safeData = validateUserData(userData);
    const allData = safeData.benefitTracking || [];
    
    if (allData.length < days) {
      return null;
    }
    
    const metrics = ['energy', 'focus', 'confidence', 'aura', 'sleep', 'workout'];
    const today = new Date();
    const cutoffDate = subDays(today, days);
    
    // Get first week and last week within the period
    const periodData = allData.filter(item => {
      if (!item?.date) return false;
      const itemDate = new Date(item.date);
      return !isNaN(itemDate.getTime()) && itemDate >= cutoffDate;
    }).sort((a, b) => new Date(a.date) - new Date(b.date));
    
    if (periodData.length < 10) return null;
    
    const firstWeek = periodData.slice(0, Math.min(7, Math.floor(periodData.length / 2)));
    const lastWeek = periodData.slice(-Math.min(7, Math.floor(periodData.length / 2)));
    
    const growthRates = {};
    
    metrics.forEach(metric => {
      const firstValues = firstWeek
        .map(d => d[metric])
        .filter(v => typeof v === 'number' && v >= 1 && v <= 10);
        
      const lastValues = lastWeek
        .map(d => d[metric])
        .filter(v => typeof v === 'number' && v >= 1 && v <= 10);
      
      if (firstValues.length >= 2 && lastValues.length >= 2) {
        const firstAvg = firstValues.reduce((sum, v) => sum + v, 0) / firstValues.length;
        const lastAvg = lastValues.reduce((sum, v) => sum + v, 0) / lastValues.length;
        
        if (firstAvg > 0) {
          const percentChange = ((lastAvg - firstAvg) / firstAvg) * 100;
          growthRates[metric] = {
            firstAvg: parseFloat(firstAvg.toFixed(1)),
            lastAvg: parseFloat(lastAvg.toFixed(1)),
            percentChange: parseFloat(percentChange.toFixed(0)),
            direction: percentChange >= 5 ? 'up' : percentChange <= -5 ? 'down' : 'stable'
          };
        }
      }
    });
    
    return Object.keys(growthRates).length > 0 ? { rates: growthRates, days } : null;
  } catch (error) {
    console.error('Growth rates calculation error:', error);
    return null;
  }
};

// ============================================================
// RELAPSE PATTERN ANALYSIS - Keep but simplify
// ============================================================
export const generateRelapsePatternAnalysis = (userData) => {
  try {
    const safeData = validateUserData(userData);
    const streakHistory = safeData.streakHistory || [];
    const relapseHistory = safeData.relapseHistory || [];
    
    // Get all relapses from streak history
    const relapses = streakHistory.filter(s => s.reason === 'relapse');
    
    if (relapses.length === 0) {
      return { hasData: false, totalRelapses: 0 };
    }
    
    // Analyze streak lengths at relapse
    const streakLengths = relapses
      .map(r => r.days || 0)
      .filter(d => d > 0);
    
    let avgStreakAtRelapse = null;
    let dangerZone = null;
    
    if (streakLengths.length >= 2) {
      avgStreakAtRelapse = Math.round(
        streakLengths.reduce((sum, d) => sum + d, 0) / streakLengths.length
      );
      
      // Find danger zone (most common relapse range)
      const ranges = { '1-7': 0, '8-14': 0, '15-30': 0, '31-60': 0, '60+': 0 };
      streakLengths.forEach(d => {
        if (d <= 7) ranges['1-7']++;
        else if (d <= 14) ranges['8-14']++;
        else if (d <= 30) ranges['15-30']++;
        else if (d <= 60) ranges['31-60']++;
        else ranges['60+']++;
      });
      
      const maxRange = Object.entries(ranges).reduce((max, [range, count]) => 
        count > max.count ? { range, count } : max, { range: '', count: 0 }
      );
      
      if (maxRange.count >= 2) {
        dangerZone = maxRange.range;
      }
    }
    
    // Analyze triggers if available
    let primaryTrigger = null;
    if (relapseHistory.length >= 2) {
      const triggers = {};
      relapseHistory.forEach(r => {
        if (r.trigger && typeof r.trigger === 'string') {
          triggers[r.trigger] = (triggers[r.trigger] || 0) + 1;
        }
      });
      
      const topTrigger = Object.entries(triggers).reduce((max, [trigger, count]) =>
        count > max.count ? { trigger, count } : max, { trigger: '', count: 0 }
      );
      
      if (topTrigger.count >= 2) {
        primaryTrigger = topTrigger.trigger;
      }
    }
    
    return {
      hasData: true,
      totalRelapses: relapses.length,
      avgStreakAtRelapse,
      dangerZone,
      primaryTrigger
    };
  } catch (error) {
    console.error('Relapse pattern analysis error:', error);
    return { hasData: false, totalRelapses: 0 };
  }
};

// ============================================================
// ML PATTERN DISCOVERY - Keep existing AI integration
// ============================================================
export const discoverMLPatterns = async (userData) => {
  try {
    const { default: patternLearningService } = await import('../../services/PatternLearningService');
    
    const safeData = validateUserData(userData);
    const daysTracked = safeData.benefitTracking?.length || 0;
    const relapseCount = (safeData.streakHistory || []).filter(s => s.reason === 'relapse').length;
    
    // Check thresholds
    if (daysTracked < AI_PATTERNS_THRESHOLD) {
      return { 
        hasMLPatterns: false, 
        patterns: [], 
        reason: 'insufficient_days',
        daysTracked,
        daysRequired: AI_PATTERNS_THRESHOLD
      };
    }
    
    if (relapseCount < MIN_RELAPSES_FOR_PATTERNS) {
      return { 
        hasMLPatterns: false, 
        patterns: [], 
        reason: 'insufficient_relapses',
        relapseCount,
        relapsesRequired: MIN_RELAPSES_FOR_PATTERNS
      };
    }
    
    // Check if model is trained
    const status = patternLearningService.getTrainingStatus();
    if (!status.isTrained) {
      return { 
        hasMLPatterns: false, 
        patterns: [], 
        reason: 'model_not_trained',
        message: 'AI is learning your patterns'
      };
    }
    
    // Get model insights
    const insights = patternLearningService.getModelInsights();
    if (!insights) {
      return { 
        hasMLPatterns: false, 
        patterns: [], 
        reason: 'no_insights' 
      };
    }
    
    const patterns = [];
    
    // Convert AI insights to display patterns
    if (insights.topRiskFactors && insights.topRiskFactors.length > 0) {
      insights.topRiskFactors.slice(0, 3).forEach((factor) => {
        const factorName = formatAIFactorName(factor.factor);
        const importance = Math.round(factor.importance * 100);
        if (importance >= 10) {
          patterns.push({
            type: 'risk_factor',
            condition: factorName,
            outcome: `${importance}% influence on your risk`,
            confidence: factor.importance
          });
        }
      });
    }
    
    // Add temporal patterns if available
    if (insights.temporalPatterns) {
      if (insights.temporalPatterns.riskyHours?.length > 0) {
        const hours = insights.temporalPatterns.riskyHours.slice(0, 3).map(h => formatHour(h)).join(', ');
        patterns.push({
          type: 'temporal',
          condition: `Higher risk: ${hours}`,
          outcome: 'Based on your historical patterns',
          confidence: 0.7
        });
      }
      
      if (insights.temporalPatterns.riskyDays?.length > 0) {
        const days = insights.temporalPatterns.riskyDays.slice(0, 2).map(d => formatDay(d)).join(', ');
        patterns.push({
          type: 'temporal',
          condition: `${days} show elevated risk`,
          outcome: 'Plan extra support on these days',
          confidence: 0.7
        });
      }
    }
    
    // Add streak-based patterns
    if (insights.streakVulnerability?.dangerZone) {
      const vuln = insights.streakVulnerability;
      patterns.push({
        type: 'streak',
        condition: `Days ${vuln.dangerZone.start}-${vuln.dangerZone.end} critical`,
        outcome: `${vuln.dangerZone.percentage}% of your relapses occur here`,
        confidence: 0.85
      });
    }
    
    return {
      hasMLPatterns: patterns.length > 0,
      patterns,
      modelAccuracy: status.lastAccuracy,
      trainingDataPoints: status.totalDataPoints,
      daysTracked,
      relapseCount
    };
    
  } catch (error) {
    console.error('[AI Patterns] Error:', error);
    return { 
      hasMLPatterns: false, 
      patterns: [], 
      reason: 'error',
      error: error.message 
    };
  }
};

// Generate AI-informed optimization suggestions
export const generateMLOptimization = async (userData) => {
  try {
    const { default: patternLearningService } = await import('../../services/PatternLearningService');
    
    const safeData = validateUserData(userData);
    const daysTracked = safeData.benefitTracking?.length || 0;
    
    if (daysTracked < AI_PATTERNS_THRESHOLD) {
      return { hasMLSuggestions: false, suggestions: [], reason: 'insufficient_data' };
    }
    
    const status = patternLearningService.getTrainingStatus();
    if (!status.isTrained) {
      return { hasMLSuggestions: false, suggestions: [], reason: 'model_not_trained' };
    }
    
    const insights = patternLearningService.getModelInsights();
    if (!insights) {
      return { hasMLSuggestions: false, suggestions: [], reason: 'no_insights' };
    }
    
    const suggestions = [];
    
    // Generate suggestions based on top risk factors
    if (insights.topRiskFactors?.length > 0) {
      const topFactor = insights.topRiskFactors[0];
      const factorName = formatAIFactorName(topFactor.factor);
      suggestions.push({
        type: 'risk',
        text: `${factorName} is your primary risk factor`
      });
    }
    
    // Temporal-based suggestions
    if (insights.temporalPatterns?.riskyHours?.length > 0) {
      const riskyHour = insights.temporalPatterns.riskyHours[0];
      const hourStr = formatHour(riskyHour);
      suggestions.push({
        type: 'time',
        text: `Elevated risk around ${hourStr}`
      });
    }
    
    if (insights.temporalPatterns?.riskyDays?.length > 0) {
      const riskyDay = formatDay(insights.temporalPatterns.riskyDays[0]);
      suggestions.push({
        type: 'day',
        text: `${riskyDay} shows higher vulnerability`
      });
    }
    
    // Streak-based suggestions
    if (insights.streakVulnerability?.dangerZone) {
      const { start, end } = insights.streakVulnerability.dangerZone;
      suggestions.push({
        type: 'streak',
        text: `Days ${start}-${end} are your danger zone`
      });
    }
    
    return {
      hasMLSuggestions: suggestions.length > 0,
      suggestions,
      modelAccuracy: status.lastAccuracy
    };
    
  } catch (error) {
    console.error('[AI Optimization] Error:', error);
    return { hasMLSuggestions: false, suggestions: [], reason: 'error' };
  }
};

// ============================================================
// HELPER FUNCTIONS
// ============================================================
const formatAIFactorName = (factor) => {
  const factorMap = {
    'hour': 'Time of day',
    'dayOfWeek': 'Day of week',
    'streakDay': 'Streak length',
    'energy': 'Energy levels',
    'focus': 'Focus levels',
    'confidence': 'Confidence levels',
    'sleep': 'Sleep quality',
    'aura': 'Aura/presence',
    'workout': 'Workout intensity',
    'recentRelapseCount': 'Recent relapse frequency',
    'avgBenefitScore': 'Overall benefit score',
    'daysSinceLastRelapse': 'Recovery momentum'
  };
  return factorMap[factor] || factor.replace(/([A-Z])/g, ' $1').trim();
};

const formatHour = (hour) => {
  if (hour === 0) return '12 AM';
  if (hour < 12) return `${hour} AM`;
  if (hour === 12) return '12 PM';
  return `${hour - 12} PM`;
};

const formatDay = (dayIndex) => {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[dayIndex] || `Day ${dayIndex}`;
};

// Export threshold constants for use in components
export const THRESHOLDS = {
  BASIC_PATTERNS: BASIC_PATTERNS_THRESHOLD,
  AI_PATTERNS: AI_PATTERNS_THRESHOLD,
  MIN_RELAPSES: MIN_RELAPSES_FOR_PATTERNS
};