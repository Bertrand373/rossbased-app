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

// NEW: Progress & Trends Analysis - Historical trajectory calculation
export const calculateProgressTrends = (userData, timeRange, selectedMetric = 'energy') => {
  try {
    const safeData = validateUserData(userData);
    const allBenefitData = safeData.benefitTracking || [];
    const streakHistory = safeData.streakHistory || [];
    const metricToUse = selectedMetric || 'energy';
    
    // Need at least 14 days of data for meaningful trends
    if (allBenefitData.length < 14) {
      return null;
    }
    
    const trends = {};
    
    // 1. RELAPSE FREQUENCY TREND
    const relapsesWithDates = streakHistory.filter(s => s.reason === 'relapse' && s.end);
    
    if (relapsesWithDates.length >= 2) {
      // Calculate overall relapse rate (relapses per month)
      const firstRelapse = new Date(relapsesWithDates[0].end);
      const lastRelapse = new Date(relapsesWithDates[relapsesWithDates.length - 1].end);
      const monthsTracking = Math.max(1, (lastRelapse - firstRelapse) / (1000 * 60 * 60 * 24 * 30));
      const overallRate = (relapsesWithDates.length / monthsTracking).toFixed(1);
      
      // Calculate recent relapse rate (last 90 days)
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
      const recentRelapses = relapsesWithDates.filter(r => new Date(r.end) >= ninetyDaysAgo);
      const recentMonths = 3; // 90 days = 3 months
      const recentRate = (recentRelapses.length / recentMonths).toFixed(1);
      
      // Determine trend
      let trend = 'stable';
      let insight = '';
      
      if (parseFloat(recentRate) < parseFloat(overallRate) * 0.7) {
        trend = 'improving';
        insight = `**Excellent Progress**: Your recent relapse rate (${recentRate}/month) is significantly better than your overall average (${overallRate}/month). You're developing stronger self-control and pattern awareness.`;
      } else if (parseFloat(recentRate) > parseFloat(overallRate) * 1.3) {
        trend = 'worsening';
        insight = `**Needs Attention**: Recent relapse frequency (${recentRate}/month) exceeds your baseline (${overallRate}/month). Review your triggers and strengthen your defense strategies.`;
      } else {
        trend = 'stable';
        insight = `**Maintaining Course**: Your relapse frequency (${recentRate}/month) is consistent with your overall pattern (${overallRate}/month). Focus on identifying and eliminating your primary triggers for breakthrough improvement.`;
      }
      
      trends.relapseFrequency = {
        trend,
        recentRate: `${recentRate}/mo`,
        overallRate: `${overallRate}/mo`,
        insight
      };
    }
    
    // 2. BENEFIT PERFORMANCE TREND (for selected metric)
    if (allBenefitData.length >= 14) {
      // Get last 7 days average for selected metric
      const last7Days = allBenefitData.slice(-7);
      const recentAvg = calculateAverage({ benefitTracking: last7Days }, metricToUse, 'week', true);
      
      // Get overall average for selected metric
      const overallAvg = calculateAverage(safeData, metricToUse, 'quarter', true);
      
      if (recentAvg !== 'N/A' && overallAvg !== 'N/A') {
        const recentNum = parseFloat(recentAvg);
        const overallNum = parseFloat(overallAvg);
        
        let trend = 'stable';
        let insight = '';
        
        if (recentNum > overallNum + 0.5) {
          trend = 'improving';
          insight = `**Rising Performance**: Your recent average (${recentAvg}/10) surpasses your all-time average (${overallAvg}/10). The benefits of retention are compounding - your discipline is paying dividends.`;
        } else if (recentNum < overallNum - 0.5) {
          trend = 'declining';
          insight = `**Performance Dip**: Recent scores (${recentAvg}/10) are below your baseline (${overallAvg}/10). Review your habits: sleep quality, exercise consistency, and stress management may need attention.`;
        } else {
          trend = 'stable';
          insight = `**Consistent Performance**: Maintaining ${recentAvg}/10 in line with your ${overallAvg}/10 average. You're in a stable zone - consider introducing new challenges or optimization strategies to level up.`;
        }
        
        trends.benefitPerformance = {
          trend,
          recentAvg: parseFloat(recentAvg).toFixed(1),
          overallAvg: parseFloat(overallAvg).toFixed(1),
          insight
        };
      }
    }
    
    // 3. OVERALL TRAJECTORY
    const currentStreak = safeData.currentStreak || 0;
    const longestStreak = safeData.longestStreak || 0;
    
    let direction = 'neutral';
    let summary = '';
    const milestones = [];
    
    // Determine trajectory based on multiple factors
    const improvingRelapses = trends.relapseFrequency?.trend === 'improving';
    const improvingBenefits = trends.benefitPerformance?.trend === 'improving';
    const decliningBenefits = trends.benefitPerformance?.trend === 'declining';
    const worseningRelapses = trends.relapseFrequency?.trend === 'worsening';
    
    if ((improvingRelapses || improvingBenefits) && !decliningBenefits && !worseningRelapses) {
      direction = 'positive';
      summary = `**Positive Momentum**: Your journey shows clear progress. ${improvingRelapses ? 'Relapse frequency is decreasing.' : ''} ${improvingBenefits ? 'Benefit scores are rising.' : ''} You're building the life you want - stay the course and keep raising the bar.`;
    } else if (worseningRelapses || decliningBenefits) {
      direction = 'needs_focus';
      summary = `**Needs Strategic Focus**: Some metrics show room for improvement. ${worseningRelapses ? 'Relapse patterns need attention.' : ''} ${decliningBenefits ? 'Benefit performance is declining.' : ''} Time to double down on fundamentals: identify triggers, strengthen routines, and recommit to your why.`;
    } else {
      direction = 'neutral';
      summary = `**Maintaining Stability**: You're holding steady. Current streak: ${currentStreak} days. While stability is good, greatness requires growth. Consider setting new challenges or exploring deeper optimization strategies.`;
    }
    
    // Add milestones
    if (currentStreak >= 90) {
      milestones.push(`90+ day streak active - Elite territory`);
    } else if (currentStreak >= 30) {
      milestones.push(`30+ day streak active - Master level`);
    } else if (currentStreak >= 7) {
      milestones.push(`7+ day streak active - Foundation solid`);
    }
    
    if (longestStreak >= 90) {
      milestones.push(`Achieved 90-day mastery milestone`);
    } else if (longestStreak >= 30) {
      milestones.push(`Reached 30-day master status`);
    }
    
    if (allBenefitData.length >= 30) {
      milestones.push(`${allBenefitData.length} days of benefit tracking logged`);
    }
    
    trends.overallTrajectory = {
      direction,
      summary,
      milestones: milestones.length > 0 ? milestones : null
    };
    
    return trends;
  } catch (error) {
    console.error('Progress trends calculation error:', error);
    return null;
  }
};

// ENHANCED: Pattern Recognition - Now actually uses selectedMetric
export const generatePatternRecognition = (userData, selectedMetric, isPremium) => {
  try {
    const safeData = validateUserData(userData);
    const allData = safeData.benefitTracking || [];
    const currentStreak = safeData.currentStreak || 0;
    const metric = selectedMetric || 'energy';
    
    // Helper to get metric value from a data point
    const getMetricValue = (d) => {
      if (!d) return null;
      if (metric === 'sleep') {
        return d.sleep || null;
      }
      return d[metric] || null;
    };
    
    // Helper for metric display name
    const metricDisplayName = metric === 'sleep' ? 'sleep quality' : metric;
    
    // Require substantial data for meaningful patterns
    if (allData.length < 14) {
      return { patterns: [] };
    }
    
    const patterns = [];
    
    // 1. SELECTED METRIC TREND (5-day momentum)
    if (allData.length >= 7) {
      try {
        const last5Days = allData.slice(-5);
        if (last5Days.length >= 3) {
          const firstValue = getMetricValue(last5Days[0]);
          const lastValue = getMetricValue(last5Days[last5Days.length - 1]);
          
          if (typeof firstValue === 'number' && typeof lastValue === 'number' && 
              firstValue >= 1 && firstValue <= 10 && lastValue >= 1 && lastValue <= 10) {
            const trend = lastValue - firstValue;
            if (Math.abs(trend) >= 1) {
              if (trend > 0) {
                patterns.push(`**${metricDisplayName.charAt(0).toUpperCase() + metricDisplayName.slice(1)} Trend**: Rising ${trend.toFixed(1)} points over 5 days. This upward momentum indicates positive adaptation - maintain current practices.`);
              } else {
                patterns.push(`**${metricDisplayName.charAt(0).toUpperCase() + metricDisplayName.slice(1)} Decline**: Dropped ${Math.abs(trend).toFixed(1)} points over 5 days. Fluctuations during retention are normal - focus on rest and recovery.`);
              }
            }
          }
        }
      } catch (trendError) {
        console.warn('Metric trend error:', trendError);
      }
    }
    
    // 2. CORRELATION PATTERNS - How selected metric relates to other metrics
    if (isPremium && allData.length >= 20) {
      try {
        // Find days where selected metric is high (7+)
        const highMetricDays = allData.filter(d => {
          const val = getMetricValue(d);
          return typeof val === 'number' && val >= 7;
        });
        
        if (highMetricDays.length >= 5) {
          // Check correlation with energy (if not already selected)
          if (metric !== 'energy') {
            const energyOnHighDays = highMetricDays
              .map(d => d.energy || 0)
              .filter(val => typeof val === 'number' && val >= 1 && val <= 10);
            
            const allEnergyValues = allData
              .map(d => d.energy || 0)
              .filter(val => typeof val === 'number' && val >= 1 && val <= 10);
            
            if (energyOnHighDays.length >= 3 && allEnergyValues.length >= 10) {
              const avgEnergyWhenMetricHigh = energyOnHighDays.reduce((sum, val) => sum + val, 0) / energyOnHighDays.length;
              const overallAvgEnergy = allEnergyValues.reduce((sum, val) => sum + val, 0) / allEnergyValues.length;
              const correlation = ((avgEnergyWhenMetricHigh - overallAvgEnergy) / overallAvgEnergy * 100).toFixed(0);
              
              if (correlation > 15) {
                patterns.push(`**${metricDisplayName.charAt(0).toUpperCase() + metricDisplayName.slice(1)}-Energy Link**: When ${metricDisplayName} hits 7+, your energy averages ${avgEnergyWhenMetricHigh.toFixed(1)}/10 (${correlation}% above baseline). These metrics reinforce each other.`);
              }
            }
          }
          
          // Check correlation with confidence (if not already selected)
          if (metric !== 'confidence') {
            const confidenceOnHighDays = highMetricDays
              .map(d => d.confidence || 0)
              .filter(val => typeof val === 'number' && val >= 1 && val <= 10);
            
            const allConfidenceValues = allData
              .map(d => d.confidence || 0)
              .filter(val => typeof val === 'number' && val >= 1 && val <= 10);
            
            if (confidenceOnHighDays.length >= 3 && allConfidenceValues.length >= 10) {
              const avgConfidenceWhenMetricHigh = confidenceOnHighDays.reduce((sum, val) => sum + val, 0) / confidenceOnHighDays.length;
              const overallAvgConfidence = allConfidenceValues.reduce((sum, val) => sum + val, 0) / allConfidenceValues.length;
              const correlation = ((avgConfidenceWhenMetricHigh - overallAvgConfidence) / overallAvgConfidence * 100).toFixed(0);
              
              if (correlation > 15) {
                patterns.push(`**${metricDisplayName.charAt(0).toUpperCase() + metricDisplayName.slice(1)}-Confidence Link**: High ${metricDisplayName} (7+) correlates with ${avgConfidenceWhenMetricHigh.toFixed(1)}/10 confidence (${correlation}% above your average). Prioritize ${metricDisplayName} for emotional stability.`);
              }
            }
          }
        }
      } catch (correlationError) {
        console.warn('Correlation pattern error:', correlationError);
      }
    }
    
    // 3. SLEEP IMPACT ON SELECTED METRIC (if not sleep itself)
    if (isPremium && metric !== 'sleep' && allData.length >= 20) {
      try {
        const goodSleepDays = allData.filter(d => {
          const sleepVal = d.sleep || 5;
          return typeof sleepVal === 'number' && sleepVal >= 7;
        });
        
        const poorSleepDays = allData.filter(d => {
          const sleepVal = d.sleep || 5;
          return typeof sleepVal === 'number' && sleepVal < 5;
        });
        
        if (goodSleepDays.length >= 5 && poorSleepDays.length >= 3) {
          // Get next-day metric values after good vs poor sleep
          const getNextDayMetric = (days) => {
            return days.map(d => {
              const dayAfter = allData.find(next => {
                if (!next?.date || !d.date) return false;
                const dayAfterDate = new Date(d.date);
                dayAfterDate.setDate(dayAfterDate.getDate() + 1);
                const nextDate = new Date(next.date);
                return nextDate.toISOString().split('T')[0] === dayAfterDate.toISOString().split('T')[0];
              });
              return dayAfter ? getMetricValue(dayAfter) : null;
            }).filter(val => val !== null && val >= 1 && val <= 10);
          };
          
          const metricAfterGoodSleep = getNextDayMetric(goodSleepDays);
          const metricAfterPoorSleep = getNextDayMetric(poorSleepDays);
          
          if (metricAfterGoodSleep.length >= 3 && metricAfterPoorSleep.length >= 2) {
            const avgAfterGood = metricAfterGoodSleep.reduce((sum, val) => sum + val, 0) / metricAfterGoodSleep.length;
            const avgAfterPoor = metricAfterPoorSleep.reduce((sum, val) => sum + val, 0) / metricAfterPoorSleep.length;
            const difference = avgAfterGood - avgAfterPoor;
            
            if (difference > 0.8) {
              patterns.push(`**Sleep Impact on ${metricDisplayName.charAt(0).toUpperCase() + metricDisplayName.slice(1)}**: After quality sleep (7+), your next-day ${metricDisplayName} averages ${avgAfterGood.toFixed(1)}/10 vs ${avgAfterPoor.toFixed(1)}/10 after poor sleep. Sleep is foundational for ${metricDisplayName}.`);
            }
          }
        }
      } catch (sleepImpactError) {
        console.warn('Sleep impact pattern error:', sleepImpactError);
      }
    }
    
    // 4. SPERMATOGENESIS PHASE IMPACT ON SELECTED METRIC
    if (currentStreak >= 74 && safeData.startDate) {
      try {
        const startDate = new Date(safeData.startDate);
        if (!isNaN(startDate.getTime())) {
          const post74Data = allData.filter(d => {
            if (!d?.date) return false;
            const itemDate = new Date(d.date);
            const daysSinceStart = Math.floor((itemDate - startDate) / (1000 * 60 * 60 * 24));
            return !isNaN(daysSinceStart) && daysSinceStart >= 74;
          });
          
          const pre74Data = allData.filter(d => {
            if (!d?.date) return false;
            const itemDate = new Date(d.date);
            const daysSinceStart = Math.floor((itemDate - startDate) / (1000 * 60 * 60 * 24));
            return !isNaN(daysSinceStart) && daysSinceStart < 74 && daysSinceStart >= 1;
          });
          
          if (post74Data.length >= 7 && pre74Data.length >= 7) {
            const validPost74 = post74Data.map(d => getMetricValue(d)).filter(val => val !== null && val >= 1 && val <= 10);
            const validPre74 = pre74Data.map(d => getMetricValue(d)).filter(val => val !== null && val >= 1 && val <= 10);
            
            if (validPost74.length > 0 && validPre74.length > 0) {
              const avgPost74 = validPost74.reduce((sum, val) => sum + val, 0) / validPost74.length;
              const avgPre74 = validPre74.reduce((sum, val) => sum + val, 0) / validPre74.length;
              const improvement = ((avgPost74 - avgPre74) / avgPre74 * 100).toFixed(0);
              
              if (Math.abs(improvement) > 10) {
                if (improvement > 0) {
                  patterns.push(`**Post-Spermatogenesis ${metricDisplayName.charAt(0).toUpperCase() + metricDisplayName.slice(1)}**: After day 74, your ${metricDisplayName} averages ${avgPost74.toFixed(1)}/10 (${improvement}% higher than pre-74). Biological optimization is enhancing this metric.`);
                } else {
                  patterns.push(`**Post-74 ${metricDisplayName.charAt(0).toUpperCase() + metricDisplayName.slice(1)} Shift**: Your ${metricDisplayName} averaged ${avgPre74.toFixed(1)}/10 pre-day 74 vs ${avgPost74.toFixed(1)}/10 after. This shift may reflect energy redistribution to other areas.`);
                }
              }
            }
          }
        }
      } catch (spermatogenesisError) {
        console.warn('Spermatogenesis pattern error:', spermatogenesisError);
      }
    }
    
    // 5. PHASE-SPECIFIC GUIDANCE (always include)
    if (currentStreak >= 7) {
      const phase = getCurrentPhase(safeData);
      patterns.push(`**${phase} Phase**: ${getPhaseGuidance(phase, currentStreak)}`);
    }
    
    return { patterns: patterns };
  } catch (error) {
    console.error('Pattern recognition error:', error);
    return { patterns: [] };
  }
};

// ENHANCED: Optimization Guidance with Dynamic Performance Analysis
export const generateOptimizationGuidance = (userData, selectedMetric, timeRange, isPremium) => {
  try {
    const safeData = validateUserData(userData);
    const allData = safeData.benefitTracking || [];
    const currentStreak = safeData.currentStreak || 0;
    
    if (allData.length < 10) {
      return {
        optimalRate: 'N/A',
        criteria: 'Need more data for analysis',
        recommendations: ['Track 10+ days of benefits to unlock personalized optimization guidance']
      };
    }
    
    // FIXED: Calculate dynamic performance thresholds based on user's actual data - ALL 6 METRICS
    const calculateDynamicThresholds = (data) => {
      const getValidData = (metric) => {
        if (metric === 'sleep') {
          return data.map(d => d.sleep || 0).filter(val => val >= 1 && val <= 10);
        }
        return data.map(d => d[metric] || 0).filter(val => val >= 1 && val <= 10);
      };
      
      const validEnergyData = getValidData('energy');
      const validFocusData = getValidData('focus');
      const validConfidenceData = getValidData('confidence');
      const validAuraData = getValidData('aura');
      const validSleepData = getValidData('sleep');
      const validWorkoutData = getValidData('workout');
      
      if (validEnergyData.length < 5) {
        return null; // Not enough data for meaningful analysis
      }
      
      // Calculate percentiles for dynamic thresholds
      const getPercentile = (arr, percentile) => {
        if (arr.length === 0) return 7; // Default threshold
        const sorted = [...arr].sort((a, b) => a - b);
        const index = Math.ceil((percentile / 100) * sorted.length) - 1;
        return sorted[Math.max(0, index)];
      };
      
      const getAverage = (arr) => {
        if (arr.length === 0) return 5; // Default average
        return arr.reduce((sum, val) => sum + val, 0) / arr.length;
      };
      
      // Use 75th percentile as "high performance" threshold for each metric
      return {
        energy: Math.max(7, getPercentile(validEnergyData, 75)),
        focus: Math.max(6, getPercentile(validFocusData, 75)),
        confidence: Math.max(6, getPercentile(validConfidenceData, 75)),
        aura: Math.max(6, getPercentile(validAuraData, 75)),
        sleep: validSleepData.length >= 5 ? Math.max(7, getPercentile(validSleepData, 75)) : 7,
        workout: Math.max(6, getPercentile(validWorkoutData, 75)),
        // Averages for baseline comparison
        energyAvg: getAverage(validEnergyData),
        focusAvg: getAverage(validFocusData),
        confidenceAvg: getAverage(validConfidenceData),
        auraAvg: getAverage(validAuraData),
        sleepAvg: getAverage(validSleepData),
        workoutAvg: getAverage(validWorkoutData)
      };
    };
    
    const thresholds = calculateDynamicThresholds(allData);
    
    if (!thresholds) {
      return {
        optimalRate: 'N/A',
        criteria: 'Insufficient metric data',
        recommendations: ['Track more complete daily metrics for personalized optimization analysis']
      };
    }
    
    // FIXED: Calculate high performance days using dynamic thresholds
    const highPerformanceDays = allData.filter(d => {
      try {
        if (!d) return false;
        const energy = d.energy || 0;
        const confidence = d.confidence || 0;
        const sleep = d.sleep || 0;
        
        const energyMeetsThreshold = typeof energy === 'number' && energy >= thresholds.energy;
        const confidenceMeetsThreshold = typeof confidence === 'number' && confidence >= thresholds.confidence;
        const sleepMeetsThreshold = !isPremium || (typeof sleep === 'number' && sleep >= thresholds.sleep);
        
        return energyMeetsThreshold && confidenceMeetsThreshold && sleepMeetsThreshold;
      } catch (filterError) {
        return false;
      }
    });
    
    const highPerformanceRate = allData.length > 0 ? (highPerformanceDays.length / allData.length * 100).toFixed(0) : '0';
    const currentMetricAvg = parseFloat(calculateAverage(safeData, selectedMetric, timeRange, isPremium));
    
    // Helper for metric display name
    const getMetricDisplayName = (metric) => {
      if (metric === 'sleep') return 'sleep quality';
      return metric;
    };
    const metricName = getMetricDisplayName(selectedMetric);
    const metricNameCapitalized = metricName.charAt(0).toUpperCase() + metricName.slice(1);
    
    // FIXED: Generate phase-aware criteria labels
    const getCurrentPhaseFromStreak = (streak) => {
      if (streak <= 14) return 'Foundation';
      if (streak <= 45) return 'Purification';
      if (streak <= 90) return 'Expansion';
      if (streak <= 180) return 'Integration';
      return 'Mastery';
    };
    
    const phase = getCurrentPhaseFromStreak(currentStreak);
    
    // FIXED: Create realistic, personalized criteria description
    let criteriaLabel;
    if (isPremium) {
      criteriaLabel = `Your Top 25%: Energy ${thresholds.energy}+, Confidence ${thresholds.confidence}+, Sleep ${thresholds.sleep}+`;
    } else {
      criteriaLabel = `Your High Performance: Energy ${thresholds.energy}+, Confidence ${thresholds.confidence}+`;
    }
    
    const guidance = {
      optimalRate: `${highPerformanceRate}% high performance days`,
      criteria: criteriaLabel,
      recommendations: [],
      phase: phase,
      thresholds: thresholds
    };
    
    // ENHANCED: Phase-aware performance context - USE SELECTED METRIC'S THRESHOLD
    const metricKey = selectedMetric === 'sleep' ? 'sleep' : selectedMetric;
    const selectedThreshold = thresholds[metricKey] || thresholds.energy;
    const selectedAvg = thresholds[`${metricKey}Avg`] || thresholds.energyAvg;
    
    const isCurrentlyHigh = currentMetricAvg >= selectedThreshold && !isNaN(currentMetricAvg);
    const isAboveBaseline = currentMetricAvg > selectedAvg && !isNaN(currentMetricAvg);
    
    if (isCurrentlyHigh) {
      guidance.recommendations.push(`**${phase} Phase Peak Performance**: Your ${metricName} at ${currentMetricAvg}/10 matches your top 25% of days. This is your optimal window for challenging decisions, intense workouts, and ambitious goals.`);
      
      // Phase-specific peak performance guidance
      if (phase === 'Foundation') {
        guidance.recommendations.push(`**Foundation Phase Excellence**: High ${metricName} this early shows exceptional adaptation. Use this momentum to establish unbreakable daily routines and eliminate environmental triggers.`);
      } else if (phase === 'Expansion') {
        guidance.recommendations.push(`**Expansion Phase Optimization**: Peak ${metricName} is active. This is the ideal time for learning new skills, making important decisions, and tackling complex projects.`);
      } else if (phase === 'Integration' || phase === 'Mastery') {
        guidance.recommendations.push(`**Advanced Phase Mastery**: Your sustained high ${metricName} demonstrates spiritual-physical integration. Channel this energy into mentoring others and creating lasting value.`);
      }
    } else if (isAboveBaseline) {
      guidance.recommendations.push(`**Above Baseline Performance**: ${metricNameCapitalized} at ${currentMetricAvg}/10 exceeds your average (${selectedAvg.toFixed(1)}/10). Good for moderate challenges and steady progress.`);
    } else {
      guidance.recommendations.push(`**Integration Period**: ${metricNameCapitalized} at ${currentMetricAvg}/10 below your peak threshold (${selectedThreshold}/10). Natural recovery cycle - prioritize rest, reflection, and gentle activities.`);
      
      // Phase-specific low energy context
      if (phase === 'Purification') {
        guidance.recommendations.push(`**Purification Phase Normal**: Lower ${metricName} during days 15-45 indicates emotional purging. This temporary dip is therapeutic - maintain basic practices and trust the process.`);
      }
    }
    
    // ENHANCED: Pattern-based insights using dynamic thresholds
    if (isPremium && allData.length >= 20) {
      try {
        // Find correlation between high confidence and other metrics
        const highConfidenceDays = allData.filter(d => {
          const confidence = d?.confidence || 0;
          return typeof confidence === 'number' && confidence >= thresholds.confidence;
        });
        
        if (highConfidenceDays.length >= 5) {
          const avgEnergyDuringHighConfidence = highConfidenceDays
            .map(d => d.energy || 0)
            .filter(val => val >= 1 && val <= 10)
            .reduce((sum, val, _, arr) => sum + val / arr.length, 0);
            
          if (avgEnergyDuringHighConfidence > thresholds.energyAvg + 0.5) {
            guidance.recommendations.push(`**Confidence-Energy Synergy**: When confidence hits ${thresholds.confidence}+, your energy averages ${avgEnergyDuringHighConfidence.toFixed(1)}/10. Build confidence through small wins to unlock higher energy states.`);
          }
        }
        
        // Sleep-performance correlation
        const goodSleepDays = allData.filter(d => {
          const sleep = d?.sleep || 0;
          return typeof sleep === 'number' && sleep >= thresholds.sleep;
        });
        
        if (goodSleepDays.length >= 5) {
          const nextDayEnergy = goodSleepDays.map(d => {
            const dayAfter = allData.find(next => {
              if (!next?.date || !d.date) return false;
              const dayAfterDate = new Date(d.date);
              dayAfterDate.setDate(dayAfterDate.getDate() + 1);
              const nextDate = new Date(next.date);
              return nextDate.toISOString().split('T')[0] === dayAfterDate.toISOString().split('T')[0];
            });
            return dayAfter?.energy || null;
          }).filter(e => e !== null && e >= 1 && e <= 10);
          
          if (nextDayEnergy.length >= 3) {
            const avgNextDayEnergy = nextDayEnergy.reduce((sum, val) => sum + val, 0) / nextDayEnergy.length;
            if (avgNextDayEnergy > thresholds.energyAvg + 0.5) {
              guidance.recommendations.push(`**Sleep-Energy Optimization**: Quality sleep (${thresholds.sleep}+) leads to ${avgNextDayEnergy.toFixed(1)}/10 energy the next day. Prioritize sleep for consistent high performance.`);
            }
          }
        }
      } catch (patternError) {
        console.warn('Optimization pattern analysis error:', patternError);
      }
    }
    
    // ENHANCED: Data quality and improvement suggestions
    if (highPerformanceRate < 20) {
      guidance.recommendations.push(`**Performance Opportunity**: Only ${highPerformanceRate}% of days meet your high performance criteria. Focus on sleep optimization, stress management, and consistent daily practices to increase this rate.`);
    } else if (highPerformanceRate > 40) {
      guidance.recommendations.push(`**Exceptional Consistency**: ${highPerformanceRate}% high performance rate shows mastery of retention principles. Consider raising your standards or helping others achieve similar consistency.`);
    }
    
    return guidance;
  } catch (error) {
    console.error('Optimization guidance error:', error);
    return {
      optimalRate: 'N/A',
      criteria: 'Analysis unavailable',
      recommendations: ['Unable to generate optimization guidance at this time.']
    };
  }
};

// FIXED: Phase Evolution Analysis with CORRECT phase detection and ALL 6 metrics support
export const calculatePhaseEvolutionAnalysis = (userData, selectedMetric) => {
  try {
    const safeData = validateUserData(userData);
    const allData = safeData.benefitTracking || [];
    const currentStreak = safeData.currentStreak || 0;
    
    if (allData.length < 14) {
      return {
        hasData: false,
        message: 'Need 14+ days of benefit tracking for meaningful phase evolution analysis'
      };
    }
    
    // FIXED: Define retention phases based on EXACT logic - MATCHING getCurrentPhaseKey
    const getRetentionPhase = (daysSinceStart) => {
      if (daysSinceStart <= 14) return 'foundation';
      if (daysSinceStart <= 45) return 'purification'; 
      if (daysSinceStart <= 90) return 'expansion';
      if (daysSinceStart <= 180) return 'integration';
      return 'mastery';
    };
    
    const getPhaseDisplayName = (phase) => {
      const names = {
        foundation: 'Foundation',
        purification: 'Purification', 
        expansion: 'Expansion',
        integration: 'Integration',
        mastery: 'Mastery'
      };
      return names[phase] || phase;
    };
    
    const getPhaseRange = (phase) => {
      const ranges = {
        foundation: '1-14 days',
        purification: '15-45 days',
        expansion: '46-90 days', 
        integration: '91-180 days',
        mastery: '180+ days'
      };
      return ranges[phase] || 'Unknown range';
    };
    
    // Calculate phase-based data only if we have start date
    if (!safeData.startDate) {
      return {
        hasData: false,
        message: 'Start date needed for phase evolution tracking'
      };
    }
    
    const startDate = new Date(safeData.startDate);
    if (isNaN(startDate.getTime())) {
      return {
        hasData: false,
        message: 'Invalid start date for phase tracking'
      };
    }
    
    // Group data by phase
    const phaseData = {};
    allData.forEach(item => {
      try {
        if (!item || !item.date) return;
        const itemDate = new Date(item.date);
        const daysSinceStart = Math.floor((itemDate - startDate) / (1000 * 60 * 60 * 24));
        if (isNaN(daysSinceStart) || daysSinceStart < 1) return;
        
        const phase = getRetentionPhase(daysSinceStart);
        
        if (!phaseData[phase]) {
          phaseData[phase] = [];
        }
        
        // FIXED: Support ALL 6 metrics properly
        let value = null;
        if (selectedMetric === 'sleep') {
          // Sleep metric (premium)
          value = item.sleep || null;
        } else if (['energy', 'focus', 'confidence', 'aura', 'workout'].includes(selectedMetric)) {
          // All other 6 metrics: energy, focus, confidence, aura, workout
          value = item[selectedMetric] || null;
        }
        
        if (typeof value === 'number' && value >= 1 && value <= 10) {
          phaseData[phase].push({
            value: value,
            daysSinceStart: daysSinceStart,
            date: itemDate
          });
        }
      } catch (itemError) {
        console.warn('Phase data processing error:', itemError);
      }
    });
    
    if (Object.keys(phaseData).length === 0) {
      return {
        hasData: false,
        message: 'No valid data points found for phase analysis'
      };
    }
    
    // FIXED: Calculate averages with proper decimals (1 decimal place max)
    const phaseAverages = {};
    Object.keys(phaseData).forEach(phase => {
      const values = phaseData[phase];
      if (values.length > 0) {
        const sum = values.reduce((acc, item) => acc + item.value, 0);
        const avg = sum / values.length;
        phaseAverages[phase] = {
          average: Math.round(avg * 10) / 10, // Round to 1 decimal place
          dataPoints: values.length,
          range: getPhaseRange(phase),
          name: getPhaseDisplayName(phase),
          displayName: getPhaseDisplayName(phase)
        };
      }
    });
    
    // FIXED: Current phase analysis using CURRENT STREAK, not data dates
    const currentPhase = getRetentionPhase(currentStreak);
    const currentAvg = calculateAverage(safeData, selectedMetric, 'week', true);
    
    // ENHANCED: Generate wisdom-based evolution insights
    const insights = [];
    const completedPhases = Object.keys(phaseAverages).filter(phase => 
      phase !== currentPhase || currentStreak > (phase === 'foundation' ? 14 : 
                                                  phase === 'purification' ? 45 :
                                                  phase === 'expansion' ? 90 : 180)
    );
    
    if (completedPhases.length === 0) {
      // Current phase insights - metric-appropriate
      const metricLabel = selectedMetric === 'sleep' ? 'sleep quality' : selectedMetric;
      
      const getPhaseInsight = (phase, metric) => {
        const genericInsights = {
          'foundation': `**Foundation Building**: Your ${metricLabel} is stabilizing as your body adapts to retention. Fluctuations are normal during this initial phase.`,
          'purification': `**Emotional Purging Active**: ${metricLabel} patterns during days 15-45 reflect internal healing. Lower scores can be therapeutic - old patterns are being released.`,
          'expansion': `**Expansion Phase**: Your ${metricLabel} is developing as retained energy integrates. This phase brings noticeable improvements.`,
          'integration': `**Spiritual Integration**: ${metricLabel} stability indicates deep adaptation. You're developing sustainable patterns.`,
          'mastery': `**Mastery Phase**: Your ${metricLabel} consistency shows mastery. Sustained high performance is now your baseline.`
        };
        
        // Metric-specific insights for more relevant guidance
        if (metric === 'sleep') {
          return {
            'foundation': `**Foundation Building**: Your sleep quality is adjusting as your body adapts to retention. Sleep patterns often shift during this phase - trust the process.`,
            'purification': `**Emotional Purging Active**: Sleep quality during days 15-45 may fluctuate as your psyche processes suppressed emotions. This is normal healing.`,
            'expansion': `**Sleep Optimization**: Your nervous system is calming during expansion phase. Deeper, more restorative sleep becomes possible.`,
            'integration': `**Sleep Integration**: Sleep quality stability indicates your body has fully adapted. Consistent rest now supports all other metrics.`,
            'mastery': `**Sleep Mastery**: Your sleep quality consistency reflects internal harmony. Restoration happens naturally and efficiently.`
          }[phase] || genericInsights[phase];
        } else if (metric === 'energy') {
          return {
            'foundation': `**Foundation Building**: Your energy is stabilizing as your body learns to conserve vital force. Fluctuations are normal - your system is adapting.`,
            'purification': `**Emotional Purging Active**: Energy during days 15-45 reflects internal healing. Lower levels are therapeutic - old blockages are being cleared.`,
            'expansion': `**Energy Transmutation**: Your energy is converting into focused power. You're entering the stage where raw vitality becomes directed force.`,
            'integration': `**Spiritual Integration**: Energy stability indicates major optimization. You're developing sustainable high-performance patterns.`,
            'mastery': `**Service Orientation**: Your energy consistency shows mastery. Vital force now flows effortlessly and can be directed at will.`
          }[phase] || genericInsights[phase];
        } else if (metric === 'focus') {
          return {
            'foundation': `**Foundation Building**: Your focus is developing as mental fog begins to lift. Clarity comes in waves during this phase.`,
            'purification': `**Mental Clearing**: Focus during days 15-45 may fluctuate as your mind releases old patterns. This is cognitive healing.`,
            'expansion': `**Mental Transmutation**: Your focus is sharpening significantly. Sexual energy is converting to cognitive power and mental clarity.`,
            'integration': `**Cognitive Integration**: Focus stability indicates your mind has become a precision instrument. Deep concentration is now accessible.`,
            'mastery': `**Mental Mastery**: Your focus consistency shows cognitive mastery. Sustained attention is now your natural state.`
          }[phase] || genericInsights[phase];
        }
        
        return genericInsights[phase] || `Still building data in your current phase - evolution patterns will emerge as you progress.`;
      };
      
      insights.push(getPhaseInsight(currentPhase, selectedMetric));
    } else {
      // Find progression patterns
      const phaseOrder = ['foundation', 'purification', 'expansion', 'integration', 'mastery'];
      const completedInOrder = completedPhases.filter(phase => phaseOrder.includes(phase))
                                             .sort((a, b) => phaseOrder.indexOf(a) - phaseOrder.indexOf(b));
      
      // Define metricLabel early so it can be used throughout
      const metricLabel = selectedMetric === 'sleep' ? 'sleep quality' : selectedMetric;
      
      if (completedInOrder.length >= 2) {
        const firstPhase = completedInOrder[0];
        const lastCompleted = completedInOrder[completedInOrder.length - 1];
        const firstAvg = phaseAverages[firstPhase].average;
        const lastAvg = phaseAverages[lastCompleted].average;
        
        const evolution = ((lastAvg - firstAvg) / firstAvg * 100).toFixed(0);
        
        if (Math.abs(evolution) >= 15) {
          if (evolution > 0) {
            insights.push(`**Phase Evolution**: Your ${metricLabel} improved ${evolution}% from ${getPhaseDisplayName(firstPhase)} (${firstAvg}/10) to ${getPhaseDisplayName(lastCompleted)} (${lastAvg}/10). This shows successful energy transmutation through the phases.`);
          } else {
            insights.push(`**Phase Challenge**: ${metricLabel} declined ${Math.abs(evolution)}% from ${getPhaseDisplayName(firstPhase)} to ${getPhaseDisplayName(lastCompleted)}. This suggests phase-specific challenges that need addressing.`);
          }
        }
      }
      
      // ENHANCED: Phase-specific insights - now contextually appropriate for each metric
      const getMetricInsightContext = (metric) => {
        const contexts = {
          energy: {
            expansion: 'This confirms successful transmutation of sexual energy into vitality and drive.',
            integration: 'shows major life force optimization. You\'ve achieved sustainable high energy.',
            mastery: 'Your vital energy now flows effortlessly. This is the reward of consistent practice.'
          },
          focus: {
            expansion: 'This confirms successful transmutation of sexual energy into enhanced cognitive abilities.',
            integration: 'shows major mental clarity gains. Your mind has become a precision instrument.',
            mastery: 'Your mental power now serves higher purposes. Deep focus is your natural state.'
          },
          confidence: {
            expansion: 'This confirms emotional stabilization and growing self-assurance.',
            integration: 'shows you\'ve developed unshakeable inner certainty. You trust yourself deeply.',
            mastery: 'Your confidence now radiates naturally. Others sense your grounded presence.'
          },
          aura: {
            expansion: 'This confirms growing magnetic presence and social influence.',
            integration: 'shows you\'ve developed natural charisma. People are drawn to your energy.',
            mastery: 'Your presence now speaks before you do. This is the mark of retained power.'
          },
          sleep: {
            expansion: 'This confirms your nervous system has adapted to retention. Deep rest comes naturally.',
            integration: 'shows complete sleep optimization. Your body recovers efficiently.',
            mastery: 'Your sleep quality reflects internal harmony. Restoration happens effortlessly.'
          },
          workout: {
            expansion: 'This confirms physical adaptation to retained energy. Your body craves movement.',
            integration: 'shows peak physical performance integration. Training feels natural.',
            mastery: 'Your physical practice now sustains itself. The body has become a willing partner.'
          }
        };
        return contexts[metric] || contexts.energy;
      };
      
      const insightContext = getMetricInsightContext(selectedMetric);
      
      if (phaseAverages.purification && phaseAverages.purification.average < 5.5) {
        insights.push(`**Purification Phase Pattern**: ${metricLabel} averaged ${phaseAverages.purification.average}/10 during emotional purging (days 15-45). Lower metrics during this phase are normal - your psyche was healing suppressed emotions.`);
      }
      
      if (phaseAverages.expansion && phaseAverages.expansion.average > 7) {
        insights.push(`**Expansion Phase Success**: ${metricLabel} peaked at ${phaseAverages.expansion.average}/10 during mental expansion (days 46-90). ${insightContext.expansion}`);
      }
      
      if (phaseAverages.integration && phaseAverages.integration.average > 7.5) {
        insights.push(`**Integration Mastery**: ${metricLabel} at ${phaseAverages.integration.average}/10 during spiritual integration (days 91-180) ${insightContext.integration}`);
      }
      
      if (phaseAverages.mastery && phaseAverages.mastery.average > 8) {
        insights.push(`**Service Excellence**: ${metricLabel} maintains ${phaseAverages.mastery.average}/10 in mastery phase (180+ days). ${insightContext.mastery}`);
      }
      
      // Current phase guidance
      if (currentPhase === 'purification' && currentAvg !== 'N/A' && parseFloat(currentAvg) < 6) {
        insights.push(`**Current Phase Alert**: You're in Purification phase where emotional turbulence naturally lowers benefit scores. This is temporary but necessary healing - maintain practices even when metrics dip.`);
      }
      
      if (currentPhase === 'expansion' && currentAvg !== 'N/A' && parseFloat(currentAvg) >= 7) {
        insights.push(`**Peak Performance Zone**: You're in Expansion phase with ${metricLabel} at ${currentAvg}/10. This is optimal timing for ambitious goals, creative projects, and major life decisions.`);
      }
    }
    
    return {
      hasData: true,
      phaseAverages: phaseAverages,
      insights: insights,
      insight: insights.length > 0 ? insights.join(' ') : null,
      completedPhases: completedPhases.length,
      totalPhases: Object.keys(phaseAverages).length
    };
  } catch (error) {
    console.error('Phase evolution analysis error:', error);
    return {
      hasData: false,
      message: 'Unable to calculate phase evolution at this time'
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
    'home_environment': 'being home alone',
    'home_alone': 'being home alone',
    'explicit_content': 'explicit content',
    'alcohol_substances': 'alcohol/substances',
    'sleep_deprivation': 'sleep deprivation'
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
      totalRelapses: relapses.length,
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