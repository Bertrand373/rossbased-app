// components/Stats/StatsUtils.js - Helper functions for Stats component
import { format, subDays, addDays, startOfDay, differenceInDays } from 'date-fns';
import toast from 'react-hot-toast';

// Helper function to convert markdown-style **text** to HTML bold
export const renderTextWithBold = (text) => {
  if (!text) return { __html: text };
  const htmlText = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  return { __html: htmlText };
};

// Helper function to get time range display text
export const getTimeRangeDisplayText = (timeRange) => {
  switch (timeRange) {
    case 'week':
      return '(Last 7 Days)';
    case 'month':
      return '(Last 30 Days)';
    case 'quarter':
      return '(Last 90 Days)';
    default:
      return '';
  }
};

// CORE: Badge checking logic - automatically unlocks badges when milestones are reached
export const checkAndUpdateBadges = (userData) => {
  if (!userData.badges || !Array.isArray(userData.badges)) {
    return userData;
  }

  const currentStreak = userData.currentStreak || 0;
  const longestStreak = userData.longestStreak || 0;
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

  const updatedBadges = userData.badges.map(badge => {
    const threshold = badgeThresholds.find(t => t.name === badge.name);
    if (!threshold) return badge;

    const shouldBeEarned = maxStreak >= threshold.days;
    
    if (!badge.earned && shouldBeEarned) {
      hasNewBadges = true;
      
      toast.success(`🏆 Achievement Unlocked: ${badge.name}!`, {
        duration: 4000,
        style: {
          background: '#1a1a1a',
          color: '#ffffff',
          border: '1px solid #ffdd00'
        }
      });
      
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
      ...userData,
      badges: updatedBadges
    };
  }

  return userData;
};

// Get current phase based on streak
export const getCurrentPhase = (userData) => {
  const currentStreak = userData.currentStreak || 0;
  if (currentStreak <= 14) return 'Foundation';
  if (currentStreak <= 45) return 'Purification';
  if (currentStreak <= 90) return 'Expansion';
  if (currentStreak <= 180) return 'Integration';
  return 'Mastery';
};

// Helper function for phase guidance
export const getPhaseGuidance = (phase, streak) => {
  switch (phase) {
    case 'Foundation':
      return `Day ${streak}: Building new neural pathways. Every urge resisted strengthens your willpower circuitry.`;
    case 'Purification':
      return `Day ${streak}: Emotional purging active. Mood swings indicate deep healing - maintain practices even when motivation dips.`;
    case 'Expansion':
      return `Day ${streak}: Mental clarity emerging. Channel rising energy into creative projects and learning.`;
    case 'Integration':
      return `Day ${streak}: Spiritual integration beginning. You're developing natural magnetism and leadership presence.`;
    case 'Mastery':
      return `Day ${streak}: Mastery phase - your energy serves higher purposes. Focus on mentoring and service.`;
    default:
      return `Continue building momentum with consistent daily practices.`;
  }
};

// Filter benefit data based on selected time range
export const getFilteredBenefitData = (userData, timeRange) => {
  if (!userData.benefitTracking) return [];
  
  const timeRangeOptions = {
    week: 7,
    month: 30,
    quarter: 90
  };
  
  const days = timeRangeOptions[timeRange];
  const cutoffDate = subDays(new Date(), days);
  
  return userData.benefitTracking
    .filter(item => {
      const itemDate = new Date(item.date);
      return itemDate >= cutoffDate;
    })
    .sort((a, b) => new Date(a.date) - new Date(b.date));
};

// Generate bird's eye view chart data
export const generateChartData = (userData, selectedMetric, timeRange) => {
  const allUserData = userData.benefitTracking || [];
  const timeRangeOptions = {
    week: 7,
    month: 30,
    quarter: 90
  };
  const days = timeRangeOptions[timeRange];
  const today = new Date();
  
  // Create complete time range array
  const timeRangeArray = [];
  const dataMap = new Map();
  
  // Build data map from user's actual data
  allUserData.forEach(item => {
    const itemDate = startOfDay(new Date(item.date));
    const value = selectedMetric === 'sleep' ? 
      (item[selectedMetric] || item.attraction || null) : 
      (item[selectedMetric] || null);
    dataMap.set(itemDate.getTime(), value);
  });
  
  // Generate time range labels and data
  for (let i = days - 1; i >= 0; i--) {
    const date = startOfDay(subDays(today, i));
    timeRangeArray.push({
      date,
      value: dataMap.get(date.getTime()) || null
    });
  }
  
  // Format labels based on time range
  const labels = timeRangeArray.map(item => {
    if (timeRange === 'week') {
      return format(item.date, 'EEE');
    } else if (timeRange === 'month') {
      return format(item.date, 'MMM d');
    } else {
      return format(item.date, 'MMM d');
    }
  });
  
  const data = timeRangeArray.map(item => item.value);
  
  const datasets = [{
    label: selectedMetric.charAt(0).toUpperCase() + selectedMetric.slice(1),
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
      return context.parsed.y !== null ? (timeRange === 'quarter' ? 4 : 6) : 0;
    },
    pointHoverRadius: (context) => {
      return context.parsed.y !== null ? (timeRange === 'quarter' ? 6 : 8) : 0;
    },
    pointBorderWidth: 2,
    pointHoverBorderWidth: 3,
    spanGaps: false
  }];
  
  return { labels, datasets, timeRangeArray };
};

// Calculate average for display
export const calculateAverage = (userData, selectedMetric, timeRange, isPremium) => {
  if (!isPremium) {
    const allData = userData.benefitTracking || [];
    const last7DaysData = allData
      .filter(item => {
        const itemDate = new Date(item.date);
        const cutoffDate = subDays(new Date(), 7);
        return itemDate >= cutoffDate;
      })
      .sort((a, b) => new Date(a.date) - new Date(b.date));
    
    if (last7DaysData.length === 0) return 'N/A';
    
    const sum = last7DaysData.reduce((acc, item) => {
      return acc + (item.energy || 0);
    }, 0);
    return (sum / last7DaysData.length).toFixed(1);
  }
  
  const filteredData = getFilteredBenefitData(userData, timeRange);
  if (filteredData.length === 0) return 'N/A';
  
  const sum = filteredData.reduce((acc, item) => {
    if (selectedMetric === 'sleep') {
      return acc + (item[selectedMetric] || item.attraction || 0);
    }
    return acc + (item[selectedMetric] || 0);
  }, 0);
  return (sum / filteredData.length).toFixed(1);
};

// REFINED: Smart Urge Management with timing and streak-specific guidance
export const generateUrgeManagementGuidance = (userData, timeRange) => {
  const currentStreak = userData.currentStreak || 0;
  const currentHour = new Date().getHours();
  const currentDay = new Date().getDay();
  const isWeekend = currentDay === 0 || currentDay === 6;
  const isEvening = currentHour >= 20 && currentHour <= 23;
  const filteredData = getFilteredBenefitData(userData, timeRange);
  
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
    const avgEnergy = last3Days.reduce((sum, day) => sum + (day.energy || 5), 0) / last3Days.length;
    
    if (avgEnergy < 5) {
      riskLevel = riskLevel === 'Low' ? 'Medium' : 'High';
      guidance.push(`**Low Energy Detected**: Energy averaging ${avgEnergy.toFixed(1)}/10. Low vitality increases relapse risk. Take a cold shower, do 20 push-ups, or call a friend immediately.`);
    }
  }
  
  // Phase-specific guidance
  const phase = getCurrentPhase(userData);
  switch (phase) {
    case 'Foundation':
      guidance.push("**Foundation Phase (Days 1-14)**: Building new neural pathways. Every urge resisted literally rewires your brain for self-mastery. You're becoming stronger each moment.");
      break;
    case 'Purification':
      guidance.push("**Purification Phase (Days 15-45)**: Emotional purging active. If feeling anxious or depressed, this is normal - your psyche is healing. Urges may spike during emotional lows.");
      break;
    case 'Expansion':
      guidance.push("**Expansion Phase (Days 46-90)**: Mental clarity emerging. Channel rising energy into creative projects, learning, or physical challenges. Your mind is becoming your superpower.");
      break;
    case 'Integration':
      guidance.push("**Integration Phase (Days 91-180)**: Spiritual integration beginning. You're developing natural magnetism. Others may test you - stay centered and lead by example.");
      break;
    case 'Mastery':
      guidance.push("**Mastery Phase (180+ days)**: You've transcended basic urges. Any current challenge is about service and using your power responsibly. You're now a teacher and healer.");
      break;
  }
  
  return { guidance, riskLevel };
};

// REFINED: Pattern Recognition with proper data requirements
export const generatePatternRecognition = (userData, selectedMetric, isPremium) => {
  const allData = userData.benefitTracking || [];
  const currentStreak = userData.currentStreak || 0;
  
  // Require substantial data for meaningful patterns
  if (allData.length < 14) {
    return ['Need 14+ days of benefit tracking to identify meaningful patterns in your data'];
  }
  
  const patterns = [];
  
  // Energy-focus relationship (require significant data)
  if (isPremium && allData.length >= 20) {
    const energyData = allData.filter(d => d.energy >= 7);
    if (energyData.length >= 5) { // Need at least 5 high energy days
      const avgFocusWhenEnergyHigh = energyData.reduce((sum, d) => sum + (d.focus || 0), 0) / energyData.length;
      const overallAvgFocus = allData.reduce((sum, d) => sum + (d.focus || 0), 0) / allData.length;
      const improvement = ((avgFocusWhenEnergyHigh - overallAvgFocus) / overallAvgFocus * 100).toFixed(0);
      
      if (improvement > 20) { // Only show if significant improvement
        patterns.push(`**Energy-Focus Pattern**: When your energy hits 7+, focus averages ${avgFocusWhenEnergyHigh.toFixed(1)}/10 (${improvement}% above baseline). Schedule important work during high-energy periods.`);
      }
    }
  }
  
  // Sleep-confidence pattern (require significant data)
  if (isPremium && allData.length >= 20) {
    const poorSleepDays = allData.filter(d => (d.sleep || 5) < 5);
    if (poorSleepDays.length >= 5) { // Need at least 5 poor sleep days
      const nextDayConfidence = poorSleepDays.map(d => {
        const dayAfter = allData.find(next => {
          const dayAfterDate = new Date(d.date);
          dayAfterDate.setDate(dayAfterDate.getDate() + 1);
          return next.date === dayAfterDate.toISOString().split('T')[0];
        });
        return dayAfter ? (dayAfter.confidence || 5) : null;
      }).filter(confidence => confidence !== null);
      
      if (nextDayConfidence.length >= 3) { // Need at least 3 data points
        const lowConfidenceRate = (nextDayConfidence.filter(c => c < 5).length / nextDayConfidence.length * 100).toFixed(0);
        if (lowConfidenceRate >= 60) { // Only show if strong pattern
          patterns.push(`**Sleep-Confidence Pattern**: Poor sleep leads to low confidence the next day ${lowConfidenceRate}% of the time (${nextDayConfidence.length} instances tracked). Sleep optimization is critical for emotional stability.`);
        }
      }
    }
  }
  
  // Spermatogenesis phase insights
  if (currentStreak >= 74) {
    const post74Data = allData.filter(d => {
      const daysSinceStart = Math.floor((new Date(d.date) - new Date(userData.startDate)) / (1000 * 60 * 60 * 24));
      return daysSinceStart >= 74;
    });
    
    if (post74Data.length > 7) {
      const avgEnergyPost74 = post74Data.reduce((sum, d) => sum + (d.energy || 0), 0) / post74Data.length;
      const pre74Data = allData.filter(d => {
        const daysSinceStart = Math.floor((new Date(d.date) - new Date(userData.startDate)) / (1000 * 60 * 60 * 24));
        return daysSinceStart < 74;
      });
      const avgEnergyPre74 = pre74Data.reduce((sum, d) => sum + (d.energy || 0), 0) / pre74Data.length;
      
      const improvement = ((avgEnergyPost74 - avgEnergyPre74) / avgEnergyPre74 * 100).toFixed(0);
      if (improvement > 10) {
        patterns.push(`**Post-Spermatogenesis Pattern**: Energy after day 74 averages ${avgEnergyPost74.toFixed(1)}/10 (${improvement}% higher than pre-74). Your body completed the biological transition from reproduction to cellular optimization.`);
      }
    }
  }
  
  // Energy trend prediction (require sufficient recent data)
  if (allData.length >= 7) {
    const last5Days = allData.slice(-5);
    if (last5Days.length >= 3) { // Need at least 3 recent days
      const energyTrend = last5Days[last5Days.length - 1].energy - last5Days[0].energy;
      if (Math.abs(energyTrend) >= 1) { // Only show significant trends
        if (energyTrend > 0) {
          patterns.push(`**Energy Trend**: Rising ${energyTrend.toFixed(1)} points over 5 days. This upward momentum suggests successful energy transmutation - maintain current practices.`);
        } else {
          patterns.push(`**Energy Decline**: Dropped ${Math.abs(energyTrend).toFixed(1)} points over 5 days. Energy fluctuations during retention are normal - focus on rest and gentle movement.`);
        }
      }
    }
  }
  
  // Only add phase insights if user has been in current phase for meaningful time
  if (currentStreak >= 7) {
    const phase = getCurrentPhase(userData);
    patterns.push(`**${phase} Phase**: ${getPhaseGuidance(phase, currentStreak)}`);
  }
  
  return patterns;
};

// REFINED: Optimization Guidance based on actual data patterns only
export const generateOptimizationGuidance = (userData, selectedMetric, timeRange, isPremium) => {
  const allData = userData.benefitTracking || [];
  const currentStreak = userData.currentStreak || 0;
  
  if (allData.length < 10) {
    return {
      optimalRate: 'N/A',
      criteria: isPremium ? 'Energy 7+, Sleep 6+, Confidence 5+' : 'Energy 7+, Confidence 5+',
      recommendations: ['Need 10+ days of benefit tracking for optimization analysis']
    };
  }
  
  // Calculate optimal performance zone based on actual data
  const optimalDays = allData.filter(d => 
    (d.energy || 0) >= 7 && 
    (d.confidence || 0) >= 5 && 
    (!isPremium || (d.sleep || 0) >= 6)
  );
  
  const optimalPercentage = (optimalDays.length / allData.length * 100).toFixed(0);
  const currentAvgEnergy = parseFloat(calculateAverage(userData, selectedMetric, timeRange, isPremium));
  
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
    const highConfidenceDays = allData.filter(d => (d.confidence || 0) >= 7);
    if (highConfidenceDays.length >= 5) {
      const avgEnergyHighConfidence = highConfidenceDays.reduce((sum, d) => sum + (d.energy || 0), 0) / highConfidenceDays.length;
      guidance.recommendations.push(`**Decision-Making Pattern**: Your energy averages ${avgEnergyHighConfidence.toFixed(1)}/10 when confidence is high. This is your optimal window for important choices.`);
    }
  }
  
  return guidance;
};

// IMPROVED: Historical comparison with meaningful insights
export const calculateHistoricalComparison = (userData, selectedMetric) => {
  const allData = userData.benefitTracking || [];
  const currentStreak = userData.currentStreak || 0;
  
  if (allData.length < 14) {
    return {
      hasData: false,
      message: 'Need 14+ days of benefit tracking for meaningful historical analysis'
    };
  }
  
  // Phase-based analysis instead of arbitrary time periods
  const getPhaseData = (phaseName, dayRange) => {
    const phaseData = allData.filter(item => {
      const daysSinceStart = Math.floor((new Date(item.date) - new Date(userData.startDate)) / (1000 * 60 * 60 * 24));
      return daysSinceStart >= dayRange.start && daysSinceStart <= dayRange.end;
    });
    
    if (phaseData.length === 0) return null;
    
    const avg = phaseData.reduce((sum, item) => {
      const value = selectedMetric === 'sleep' ? 
        (item[selectedMetric] || item.attraction || 0) : 
        (item[selectedMetric] || 0);
      return sum + value;
    }, 0) / phaseData.length;
    
    return { average: avg.toFixed(1), days: phaseData.length };
  };
  
  // Define meaningful phases
  const foundationPhase = getPhaseData('Foundation', { start: 1, end: 14 });
  const purificationPhase = getPhaseData('Purification', { start: 15, end: 45 });
  const expansionPhase = getPhaseData('Expansion', { start: 46, end: 90 });
  
  // Current phase average
  const currentAvg = calculateAverage(userData, selectedMetric, 'week', true);
  
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
};

// REFINED: Relapse risk assessment with practical insights
export const calculateRelapseRisk = (userData, timeRange, isPremium) => {
  const filteredData = getFilteredBenefitData(userData, timeRange);
  const currentStreak = userData.currentStreak || 0;
  
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
    const energyTrend = last3Days[last3Days.length - 1].energy - last3Days[0].energy;
    if (energyTrend < -1) {
      riskScore += 25;
      riskFactors.push(`**Energy declining**: Dropped ${Math.abs(energyTrend).toFixed(1)} points in 3 days. Low vitality increases vulnerability - take cold shower or exercise immediately.`);
    }
  }
  
  // Low confidence
  const avgConfidence = last3Days.reduce((sum, day) => sum + (day.confidence || 5), 0) / last3Days.length;
  if (avgConfidence < 4) {
    riskScore += 20;
    riskFactors.push(`**Confidence low**: Averaging ${avgConfidence.toFixed(1)}/10. Emotional instability precedes most relapses - practice self-compassion and avoid isolation.`);
  }
  
  // Poor sleep quality
  if (isPremium) {
    const avgSleep = last3Days.reduce((sum, day) => sum + (day.sleep || 5), 0) / last3Days.length;
    if (avgSleep < 5) {
      riskScore += 15;
      riskFactors.push(`**Sleep disrupted**: Quality at ${avgSleep.toFixed(1)}/10. Poor sleep weakens willpower - optimize evening routine and avoid screens after 9pm.`);
    }
  }
  
  // Low focus
  if (isPremium) {
    const avgFocus = last3Days.reduce((sum, day) => sum + (day.focus || 5), 0) / last3Days.length;
    if (avgFocus < 4) {
      riskScore += 20;
      riskFactors.push(`**Focus scattered**: Averaging ${avgFocus.toFixed(1)}/10. Mental fog often signals approaching flatline - maintain practices and trust the process.`);
    }
  }
  
  // Critical spermatogenesis phase
  if (currentStreak >= 60 && currentStreak <= 74) {
    riskScore += 15;
    riskFactors.push(`**Critical phase**: Day ${currentStreak} approaching spermatogenesis completion. Biological transition increases urge intensity - extra vigilance needed.`);
  }
  
  // Time-based risks
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
};

// Info banner logic
export const shouldShowInfoBanner = (userData, timeRange) => {
  const benefitData = getFilteredBenefitData(userData, timeRange);
  const hasMinimalData = benefitData.length < 7;
  const currentStreak = userData.currentStreak || 0;
  const isNewUser = currentStreak <= 3;
  
  return hasMinimalData || isNewUser;
};

// Calculate data quality for analysis
export const calculateDataQuality = (userData) => {
  const allData = userData.benefitTracking || [];
  const recentData = allData.filter(item => {
    const itemDate = new Date(item.date);
    const cutoffDate = subDays(new Date(), 14);
    return itemDate >= cutoffDate;
  });

  if (recentData.length >= 14) {
    return { level: 'rich', label: 'Rich Analytics', days: recentData.length };
  } else if (recentData.length >= 7) {
    return { level: 'good', label: 'Good Data Set', days: recentData.length };
  } else if (recentData.length >= 3) {
    return { level: 'minimal', label: 'Basic Analysis', days: recentData.length };
  } else {
    return { level: 'insufficient', label: 'Insufficient Data', days: recentData.length };
  }
};