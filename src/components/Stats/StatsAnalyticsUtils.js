// components/Stats/StatsAnalyticsUtils.js - Analytics and Pattern Recognition Functions
import { subDays } from 'date-fns';
import { validateUserData, getFilteredBenefitData, calculateAverage } from './StatsCalculationUtils';
import { getCurrentPhase, getPhaseGuidance } from './StatsUtils';

// ENHANCED: Smart Urge Management with caching and error handling
export const generateUrgeManagementGuidance = (userData, timeRange) => {
  try {
    const safeData = validateUserData(userData);
    const currentStreak = safeData.currentStreak || 0;
    const currentHour = new Date().getHours();
    const currentDay = new Date().getDay();
    const isWeekend = currentDay === 0 || currentDay === 6;
    const isEvening = currentHour >= 20 && currentHour <= 23;
    const filteredData = getFilteredBenefitData(safeData, timeRange);
    
    // Return N/A if insufficient data for meaningful analysis
    if (filteredData.length < 3 && currentStreak < 7) {
      return {
        guidance: ['Need 7+ days of streak data or 3+ days of benefit tracking for urge management assessment'],
        riskLevel: 'N/A'
      };
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
    
    return { guidance, riskLevel };
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
    const safeData = validateUserData(userData);
    const allData = safeData.benefitTracking || [];
    const currentStreak = safeData.currentStreak || 0;
    
    // Require substantial data for meaningful patterns
    if (allData.length < 14) {
      return ['Need 14+ days of benefit tracking to identify meaningful patterns in your data'];
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
    
    return patterns;
  } catch (error) {
    console.error('Pattern recognition error:', error);
    return ['Unable to analyze patterns at this time. Please try again later.'];
  }
};

// ENHANCED: Optimization Guidance with better error handling
export const generateOptimizationGuidance = (userData, selectedMetric, timeRange, isPremium) => {
  try {
    const safeData = validateUserData(userData);
    const allData = safeData.benefitTracking || [];
    const currentStreak = safeData.currentStreak || 0;
    
    if (allData.length < 10) {
      return {
        optimalRate: 'N/A',
        criteria: isPremium ? 'Energy 7+, Sleep 6+, Confidence 5+' : 'Energy 7+, Confidence 5+',
        recommendations: ['Need 10+ days of benefit tracking for optimization analysis']
      };
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
    const safeData = validateUserData(userData);
    const allData = safeData.benefitTracking || [];
    const currentStreak = safeData.currentStreak || 0;
    
    if (allData.length < 14) {
      return {
        hasData: false,
        message: 'Need 14+ days of benefit tracking for meaningful historical analysis'
      };
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
      return {
        hasData: false,
        message: 'Tracking multiple phases needed for comparison'
      };
    }
    
    const bestPhase = phases.reduce((best, current) => 
      parseFloat(current.data.average) > parseFloat(best.data.average) ? current : best
    );
    
    return {
      hasData: true,
      current: currentAvg,
      bestPhase: bestPhase,
      allPhases: phases,
      insight: currentAvg !== 'N/A' && parseFloat(currentAvg) >= parseFloat(bestPhase.data.average) ? 
        'current_best' : 'room_for_improvement'
    };
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
    const safeData = validateUserData(userData);
    const filteredData = getFilteredBenefitData(safeData, timeRange);
    const currentStreak = safeData.currentStreak || 0;
    
    if (filteredData.length < 3) {
      return { 
        score: 'N/A', 
        factors: ['Need 3+ days of benefit tracking for risk assessment'], 
        level: 'Insufficient Data' 
      };
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
    
    return {
      score: Math.min(riskScore, 100),
      factors: riskFactors,
      level
    };
  } catch (error) {
    console.error('Risk calculation error:', error);
    return {
      score: 'N/A',
      factors: ['Unable to calculate risk at this time'],
      level: 'Low'
    };
  }
};

// Helper function to format trigger names for display
const formatTriggerName = (trigger) => {
  if (!trigger || typeof trigger !== 'string') return 'unknown trigger';
  
  const triggerMap = {
    'stress': 'stress',
    'boredom': 'boredom', 
    'loneliness': 'loneliness',
    'lustful_thoughts': 'lustful thoughts',
    'social_media': 'social media',
    'relationship': 'relationship issues',
    'home_environment': 'being home alone'
  };
  
  return triggerMap[trigger] || trigger.replace(/_/g, ' ');
};

// NEW: Relapse Pattern Analytics - Brutally Honest Trigger Analysis
export const generateRelapsePatternAnalysis = (userData) => {
  try {
    const safeData = validateUserData(userData);
    const streakHistory = safeData.streakHistory || [];
    const currentStreak = safeData.currentStreak || 0;
    
    // Filter for actual relapses (not wet dreams or other reasons)
    const relapses = streakHistory.filter(streak => 
      streak && streak.reason === 'relapse' && streak.trigger && streak.end
    );
    
    if (relapses.length === 0) {
      return {
        hasData: false,
        message: 'No relapse data available for pattern analysis',
        insights: ['Track your relapses with triggers to identify dangerous patterns and build targeted defenses.']
      };
    }

    if (relapses.length < 2) {
      const formattedSingleTrigger = formatTriggerName(relapses[0].trigger);
      return {
        hasData: false,
        message: 'Need 2+ relapses for meaningful pattern analysis',
        insights: [`Your single relapse trigger was **${formattedSingleTrigger}**. This is your known vulnerability - build specific countermeasures now.`]
      };
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
    const formattedPrimaryTrigger = formatTriggerName(primaryTrigger[0]);
    
    if (primaryTriggerRate >= 40) {
      insights.push(`**Primary Vulnerability**: ${primaryTriggerRate}% of your relapses stem from **${formattedPrimaryTrigger}**. This is your Achilles heel - you cannot achieve mastery without addressing this specific trigger.`);
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
        const formattedPhaseTrigger = formatTriggerName(mainPhaseTrigger[0]);
        
        insights.push(`**Critical Phase Vulnerability**: ${dangerousPhaseRate}% of relapses occur during **${dangerousPhase}** - specifically from **${formattedPhaseTrigger}**. This phase-trigger combination is your greatest threat.`);
      }
    }

    // 3. CURRENT STREAK VULNERABILITY ASSESSMENT
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
      const formattedDangerousTrigger = formatTriggerName(mostDangerousTrigger[0]);
      
      insights.push(`**Current Phase Alert**: You're in ${currentPhase} phase where **${formattedDangerousTrigger}** has caused ${mostDangerousTrigger[1]} previous relapse(s). Extra vigilance required against this specific trigger.`);
    }

    // 4. STREAK LENGTH vs TRIGGER ANALYSIS
    const avgStreakLength = relapses.reduce((sum, relapse) => sum + (relapse.days || 0), 0) / relapses.length;
    
    if (avgStreakLength < 7) {
      insights.push(`**Foundation Phase Trap**: Average streak length ${avgStreakLength.toFixed(1)} days indicates you're stuck in Foundation phase. Focus on basic habits before advanced retention techniques.`);
    } else if (avgStreakLength > 30) {
      insights.push(`**Advanced Practitioner Warning**: ${avgStreakLength.toFixed(1)}-day average streaks show advanced practice, but recurring relapses indicate subtle vulnerabilities that require deeper self-awareness.`);
    }

    return {
      hasData: true,
      relapseCount: relapses.length,
      primaryTrigger: formatTriggerName(primaryTrigger[0]),
      insights: insights,
      triggerBreakdown: sortedTriggers.map(([trigger, count]) => [formatTriggerName(trigger), count])
    };
  } catch (error) {
    console.error('Relapse pattern analysis error:', error);
    return {
      hasData: false,
      message: 'Unable to analyze relapse patterns at this time',
      insights: ['Pattern analysis temporarily unavailable. Continue tracking relapses with triggers for future insights.']
    };
  }
};