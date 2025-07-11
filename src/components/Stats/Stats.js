// components/Stats/Stats.js - REFINED: Practitioner-Focused Analysis Section
import React, { useState, useEffect, useRef } from 'react';
import { format, subDays, addDays, startOfDay, differenceInDays } from 'date-fns';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler } from 'chart.js';
import { FaRegLightbulb, FaLock, FaMedal, FaTrophy, FaCheckCircle, FaRedo, FaInfoCircle, 
  FaExclamationTriangle, FaFrown, FaLaptop, FaHome, FaHeart, FaClock, FaBrain, FaEye, FaStar, FaChartLine, FaShieldAlt, FaFire } from 'react-icons/fa';
import './Stats.css';
import toast from 'react-hot-toast';
import helmetImage from '../../assets/helmet.png';
import SmartResetDialog from './SmartResetDialog';

// Register ChartJS components
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

const Stats = ({ userData, isPremium, updateUserData }) => {
  const [selectedMetric, setSelectedMetric] = useState('energy');
  const [timeRange, setTimeRange] = useState('week');
  const [showBadgeModal, setShowBadgeModal] = useState(false);
  const [selectedBadge, setSelectedBadge] = useState(null);
  const [showSmartResetDialog, setShowSmartResetDialog] = useState(false);
  
  const insightsStartRef = useRef(null);

  // Force free users to energy metric on mount and when premium status changes
  useEffect(() => {
    if (!isPremium && selectedMetric !== 'energy') {
      setSelectedMetric('energy');
    }
  }, [isPremium, selectedMetric]);

  // Handle metric selection with access control
  const handleMetricClick = (metric) => {
    if (!isPremium && metric !== 'energy') {
      toast.error('Upgrade to Premium to unlock all benefit metrics', {
        duration: 3000,
        style: {
          background: 'var(--card-background)',
          color: 'var(--text-primary)',
          border: '1px solid var(--border)'
        }
      });
      return;
    }
    setSelectedMetric(metric);
  };

  // Helper function to convert markdown-style **text** to HTML bold
  const renderTextWithBold = (text) => {
    if (!text) return { __html: text };
    const htmlText = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    return { __html: htmlText };
  };

  // Helper function to get time range display text
  const getTimeRangeDisplayText = () => {
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
  const checkAndUpdateBadges = (userData) => {
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

  // Auto-check badges when streak changes
  useEffect(() => {
    if (userData && userData.currentStreak !== undefined) {
      const updatedData = checkAndUpdateBadges(userData);
      
      if (JSON.stringify(updatedData.badges) !== JSON.stringify(userData.badges)) {
        updateUserData(updatedData);
      }
    }
  }, [userData?.currentStreak, userData?.longestStreak]);

  // Time range options for chart
  const timeRangeOptions = {
    week: 7,
    month: 30,
    quarter: 90
  };
  
  const formatDate = (date) => format(new Date(date), 'MMM d, yyyy');
  
  const handleBadgeClick = (badge) => {
    setSelectedBadge(badge);
    setShowBadgeModal(true);
  };

  const handleResetStats = () => {
    setShowSmartResetDialog(true);
  };

  // Enhanced reset function with different levels
  const confirmResetStats = (resetLevel) => {
    if (!updateUserData) {
      console.error('updateUserData function is not available');
      toast.error('Unable to reset data - please refresh the page');
      return;
    }

    let resetUserData = { ...userData };
    const today = new Date();

    switch (resetLevel) {
      case 'currentStreak':
        resetUserData = {
          ...userData,
          currentStreak: 0,
          startDate: today,
          streakHistory: [
            ...(userData.streakHistory || []),
            {
              id: (userData.streakHistory?.length || 0) + 1,
              start: today,
              end: null,
              days: 0,
              reason: 'manual_reset'
            }
          ]
        };
        toast.success('Current streak reset to 0. All history and achievements preserved.');
        break;

      case 'allProgress':
        resetUserData = {
          ...userData,
          startDate: today,
          currentStreak: 0,
          relapseCount: 0,
          wetDreamCount: 0,
          longestStreak: userData.longestStreak || 0,
          streakHistory: [{
            id: 1,
            start: today,
            end: null,
            days: 0,
            reason: 'major_reset'
          }],
          benefitTracking: [],
          notes: {},
          badges: userData.badges?.map(badge => ({
            ...badge,
            earned: (badge.name === '90-Day King' && (userData.longestStreak || 0) >= 90) ||
                   (badge.name === '180-Day Emperor' && (userData.longestStreak || 0) >= 180) ||
                   (badge.name === '365-Day Sage' && (userData.longestStreak || 0) >= 365) ? badge.earned : false,
            date: ((badge.name === '90-Day King' && (userData.longestStreak || 0) >= 90) ||
                  (badge.name === '180-Day Emperor' && (userData.longestStreak || 0) >= 180) ||
                  (badge.name === '365-Day Sage' && (userData.longestStreak || 0) >= 365)) ? badge.date : null
          })) || [
            { id: 1, name: '7-Day Warrior', earned: false, date: null },
            { id: 2, name: '14-Day Monk', earned: false, date: null },
            { id: 3, name: '30-Day Master', earned: false, date: null },
            { id: 4, name: '90-Day King', earned: false, date: null },
            { id: 5, name: '180-Day Emperor', earned: false, date: null },
            { id: 6, name: '365-Day Sage', earned: false, date: null }
          ]
        };
        toast.success(`All progress reset. Longest streak record (${userData.longestStreak || 0} days) preserved.`);
        break;

      case 'everything':
        resetUserData = {
          startDate: today,
          currentStreak: 0,
          longestStreak: 0,
          wetDreamCount: 0,
          relapseCount: 0,
          badges: [
            { id: 1, name: '7-Day Warrior', earned: false, date: null },
            { id: 2, name: '14-Day Monk', earned: false, date: null },
            { id: 3, name: '30-Day Master', earned: false, date: null },
            { id: 4, name: '90-Day King', earned: false, date: null },
            { id: 5, name: '180-Day Emperor', earned: false, date: null },
            { id: 6, name: '365-Day Sage', earned: false, date: null }
          ],
          benefitTracking: [],
          streakHistory: [{
            id: 1,
            start: today,
            end: null,
            days: 0,
            reason: 'complete_reset'
          }],
          notes: {}
        };
        toast.success('Complete reset successful. All data has been cleared.');
        break;

      default:
        toast.error('Invalid reset option selected');
        return;
    }
    
    updateUserData(resetUserData);
    setShowSmartResetDialog(false);
  };

  const handleUpgradeClick = () => {
    toast.success('Premium upgrade coming soon! 🚀');
  };

  // Filter benefit data based on selected time range
  const getFilteredBenefitData = () => {
    if (!userData.benefitTracking) return [];
    
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
  const generateChartData = () => {
    const allUserData = userData.benefitTracking || [];
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
  
  // Chart options with dynamic scaling
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: {
        min: 0,
        max: 10,
        ticks: {
          stepSize: 2,
          color: '#aaaaaa',
          font: { size: 12 }
        },
        grid: {
          color: 'rgba(255, 255, 255, 0.1)',
          drawBorder: false
        }
      },
      x: {
        ticks: {
          color: '#aaaaaa',
          font: { size: 12 },
          maxTicksLimit: timeRange === 'quarter' ? 12 : timeRange === 'month' ? 15 : 7,
          maxRotation: timeRange === 'quarter' ? 45 : 0
        },
        grid: {
          color: 'rgba(255, 255, 255, 0.1)',
          drawBorder: false
        }
      }
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        filter: (tooltipItem) => {
          return tooltipItem.parsed.y !== null;
        },
        callbacks: {
          title: (items) => {
            if (!items.length) return '';
            const idx = items[0].dataIndex;
            const chartData = generateChartData();
            if (!chartData.timeRangeArray[idx]) return '';
            return formatDate(chartData.timeRangeArray[idx].date);
          },
          label: (context) => {
            const value = context.parsed.y;
            if (value === null) return '';
            const metricName = selectedMetric === 'sleep' ? 'Sleep Quality' : 
                             selectedMetric.charAt(0).toUpperCase() + selectedMetric.slice(1);
            return `${metricName}: ${value}/10`;
          }
        },
        backgroundColor: 'rgba(44, 44, 44, 0.95)',
        titleColor: '#ffffff',
        bodyColor: '#ffffff',
        borderColor: '#ffdd00',
        borderWidth: 1,
        cornerRadius: 8,
        displayColors: false,
        padding: 12,
        titleFont: { size: 14, weight: 'bold' },
        bodyFont: { size: 13 }
      }
    },
    interaction: {
      mode: 'index',
      intersect: false,
    },
    onHover: (event, activeElements) => {
      event.native.target.style.cursor = activeElements.length > 0 ? 'pointer' : 'default';
    }
  };
  
  // Calculate average for display
  const calculateAverage = () => {
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
    
    const filteredData = getFilteredBenefitData();
    if (filteredData.length === 0) return 'N/A';
    
    const sum = filteredData.reduce((acc, item) => {
      if (selectedMetric === 'sleep') {
        return acc + (item[selectedMetric] || item.attraction || 0);
      }
      return acc + (item[selectedMetric] || 0);
    }, 0);
    return (sum / filteredData.length).toFixed(1);
  };

  // Get current phase based on streak
  const getCurrentPhase = () => {
    const currentStreak = userData.currentStreak || 0;
    if (currentStreak <= 14) return 'Foundation';
    if (currentStreak <= 45) return 'Purification';
    if (currentStreak <= 90) return 'Expansion';
    if (currentStreak <= 180) return 'Integration';
    return 'Mastery';
  };

  // REFINED: Smart Urge Management with timing and streak-specific guidance
  const generateUrgeManagementGuidance = () => {
    const currentStreak = userData.currentStreak || 0;
    const currentHour = new Date().getHours();
    const currentDay = new Date().getDay();
    const isWeekend = currentDay === 0 || currentDay === 6;
    const isEvening = currentHour >= 20 && currentHour <= 23;
    const filteredData = getFilteredBenefitData();
    
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
    const phase = getCurrentPhase();
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
  const generatePatternRecognition = () => {
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
      const phase = getCurrentPhase();
      patterns.push(`**${phase} Phase**: ${getPhaseGuidance(phase, currentStreak)}`);
    }
    
    return patterns;
  };
  
  // Helper function for phase guidance
  const getPhaseGuidance = (phase, streak) => {
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
  };

  // REFINED: Optimization Guidance based on actual data patterns only
  const generateOptimizationGuidance = () => {
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
    const currentAvgEnergy = parseFloat(calculateAverage());
    
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
  const calculateHistoricalComparison = () => {
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
    const currentAvg = calculateAverage();
    
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
  const calculateRelapseRisk = () => {
    const filteredData = getFilteredBenefitData();
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
  const shouldShowInfoBanner = () => {
    const benefitData = getFilteredBenefitData();
    const hasMinimalData = benefitData.length < 7;
    const currentStreak = userData.currentStreak || 0;
    const isNewUser = currentStreak <= 3;
    
    return hasMinimalData || isNewUser;
  };

  // Calculate data quality for analysis
  const calculateDataQuality = () => {
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

  const riskAnalysis = calculateRelapseRisk();
  const urgeManagement = generateUrgeManagementGuidance();
  const patternInsights = generatePatternRecognition();
  const optimizationGuidance = generateOptimizationGuidance();
  const dataQuality = calculateDataQuality();
  
  return (
    <div className="stats-container">
      {/* Header */}
      <div className="stats-header">
        <div className="stats-header-spacer"></div>
        <h2>Your Stats</h2>
        <div className="stats-header-actions">
          <button className="reset-stats-btn" onClick={handleResetStats}>
            <FaRedo />
            <span>Reset Progress</span>
          </button>
        </div>
      </div>
      
      {/* Smart Reset Dialog */}
      <SmartResetDialog
        isOpen={showSmartResetDialog}
        onClose={() => setShowSmartResetDialog(false)}
        onConfirm={confirmResetStats}
        userData={userData}
      />
      
      {/* Streak Statistics */}
      <div className="streak-stats">
        <div className="stat-card current-streak">
          <div className="stat-value">{userData.currentStreak || 0}</div>
          <div className="stat-label">Current Streak</div>
        </div>
        
        <div className="stat-card longest-streak">
          <div className="stat-value">{userData.longestStreak || 0}</div>
          <div className="stat-label">Longest Streak</div>
        </div>
        
        <div className="stat-card total-wetdreams">
          <div className="stat-value">{userData.wetDreamCount || 0}</div>
          <div className="stat-label">Wet Dreams</div>
        </div>
        
        <div className="stat-card total-relapses">
          <div className="stat-value">{userData.relapseCount || 0}</div>
          <div className="stat-label">Relapses</div>
        </div>
      </div>
      
      {/* Milestone Badges */}
      <div className="milestone-section">
        <h3>Your Achievements</h3>
        
        <div className="badges-grid">
          {userData.badges && userData.badges.map(badge => (
            <div 
              key={badge.id} 
              className={`badge-card ${badge.earned ? 'earned' : 'locked'}`}
              onClick={() => badge.earned && handleBadgeClick(badge)}
            >
              <div className="badge-icon">
                {badge.earned ? (
                  <FaTrophy className="badge-earned-icon" />
                ) : (
                  <FaLock className="badge-locked-icon" />
                )}
              </div>
              <div className="badge-name">{badge.name}</div>
              {badge.earned && (
                <div className="badge-date">
                  Earned {badge.date ? format(new Date(badge.date), 'MMM d') : ''}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
      
      {/* Benefit Tracker */}
      <div className="benefit-tracker-section">
        <h3>Benefit Tracker</h3>
        
        {shouldShowInfoBanner() && (
          <div className="stats-info-banner">
            <FaInfoCircle className="info-icon" />
            <span><strong>Building your profile...</strong> Your insights become more detailed as you log daily benefits and track progress over time.</span>
          </div>
        )}
        
        {/* Controls */}
        <div className="benefit-tracker-controls">
          <div className="metric-selector">
            <div className="metric-pill-container">
              <button 
                className={`metric-btn energy ${selectedMetric === 'energy' ? 'active' : ''}`}
                onClick={() => handleMetricClick('energy')}
              >
                Energy
              </button>
              <button 
                className={`metric-btn focus ${selectedMetric === 'focus' ? 'active' : ''} ${!isPremium ? 'locked' : ''}`}
                onClick={() => handleMetricClick('focus')}
                disabled={!isPremium}
              >
                Focus {!isPremium && <FaLock className="metric-lock-icon" />}
              </button>
              <button 
                className={`metric-btn confidence ${selectedMetric === 'confidence' ? 'active' : ''} ${!isPremium ? 'locked' : ''}`}
                onClick={() => handleMetricClick('confidence')}
                disabled={!isPremium}
              >
                Confidence {!isPremium && <FaLock className="metric-lock-icon" />}
              </button>
              <button 
                className={`metric-btn aura ${selectedMetric === 'aura' ? 'active' : ''} ${!isPremium ? 'locked' : ''}`}
                onClick={() => handleMetricClick('aura')}
                disabled={!isPremium}
              >
                Aura {!isPremium && <FaLock className="metric-lock-icon" />}
              </button>
              <button 
                className={`metric-btn sleep ${selectedMetric === 'sleep' ? 'active' : ''} ${!isPremium ? 'locked' : ''}`}
                onClick={() => handleMetricClick('sleep')}
                disabled={!isPremium}
              >
                Sleep Quality {!isPremium && <FaLock className="metric-lock-icon" />}
              </button>
              <button 
                className={`metric-btn workout ${selectedMetric === 'workout' ? 'active' : ''} ${!isPremium ? 'locked' : ''}`}
                onClick={() => handleMetricClick('workout')}
                disabled={!isPremium}
              >
                Workout {!isPremium && <FaLock className="metric-lock-icon" />}
              </button>
            </div>
          </div>
          
          {isPremium && (
            <div className="time-range-selector-container">
              <div className="time-range-selector">
                <button 
                  className={`time-btn ${timeRange === 'week' ? 'active' : ''}`}
                  onClick={() => setTimeRange('week')}
                >
                  Week
                </button>
                <button 
                  className={`time-btn ${timeRange === 'month' ? 'active' : ''}`}
                  onClick={() => setTimeRange('month')}
                >
                  Month
                </button>
                <button 
                  className={`time-btn ${timeRange === 'quarter' ? 'active' : ''}`}
                  onClick={() => setTimeRange('quarter')}
                >
                  3 Months
                </button>
              </div>
            </div>
          )}
        </div>
        
        {/* FREE USER CONTENT */}
        {!isPremium && (
          <div className="free-benefit-preview">
            <div className="free-average-display">
              <div className="current-metric-average">
                <div className="current-metric-label">Your Energy Level (last 7 days)</div>
                <div className="current-metric-value">{calculateAverage()}/10</div>
              </div>
            </div>
            
            <div className="intelligence-preview-grid">
              <div className="current-insight-card">
                <div className="current-insight-header">
                  <span>Relapse Risk Analysis</span>
                </div>
                <div className="current-insight-text">
                  <div className="comparison-value" style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>
                    {riskAnalysis.score === 'N/A' ? 'N/A' : `${riskAnalysis.level} Risk`}
                  </div>
                  {riskAnalysis.score === 'N/A' ? 
                    'Basic risk assessment available. Track benefits for 3+ days to unlock detailed analysis.' :
                    'Basic risk assessment available. Upgrade for detailed analysis with specific factors and strategies.'
                  }
                </div>
              </div>
              
              <div className="current-insight-card">
                <div className="current-insight-header">
                  <span>Personalized Insights</span>
                </div>
                <div className="current-insight-text">
                  Advanced pattern recognition, optimization guidance, and smart urge management available with Premium upgrade.
                </div>
              </div>
            </div>
            
            <div className="benefit-upgrade-cta">
              <div className="upgrade-helmet-section">
                <img 
                  src={helmetImage} 
                  alt="Premium Insights" 
                  className="upgrade-helmet-icon"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.nextSibling.style.display = 'block';
                  }}
                />
                <div className="upgrade-helmet-fallback" style={{display: 'none'}}>🧠</div>
              </div>
              
              <div className="upgrade-text-section">
                <h4>Unlock Complete Analysis</h4>
                <p>Get smart urge management, pattern recognition, optimization guidance, and personalized strategies based on your phase and data.</p>
                
                <button className="benefit-upgrade-btn" onClick={handleUpgradeClick}>
                  <FaStar />
                  Upgrade to Premium
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* PREMIUM USER CONTENT */}
        {isPremium && (
          <>
            <div className="chart-and-insight-container" ref={insightsStartRef}>
              <div className="chart-container">
                {(() => {
                  const chartData = generateChartData();
                  const hasAnyData = chartData.datasets[0].data.some(val => val !== null);
                  
                  if (!hasAnyData) {
                    return (
                      <div className="no-chart-data">
                        <div className="no-data-icon">
                          <FaChartLine />
                        </div>
                        <div className="no-data-text">
                          <h4>No Data for {timeRange === 'week' ? 'Last 7 Days' : timeRange === 'month' ? 'Last 30 Days' : 'Last 90 Days'}</h4>
                          <p>Start logging your {selectedMetric} benefits to see your progress chart.</p>
                        </div>
                      </div>
                    );
                  }
                  
                  return <Line data={chartData} options={chartOptions} height={300} />;
                })()}
              </div>
              
              <div className="current-insight-sidebar">
                <div className="current-metric-average">
                  <div className="current-metric-label">
                    Your {selectedMetric === 'sleep' ? 'Sleep Quality' : selectedMetric.charAt(0).toUpperCase() + selectedMetric.slice(1)} {getTimeRangeDisplayText()}
                  </div>
                  <div className="current-metric-value">
                    {calculateAverage() === 'N/A' ? 'N/A' : `${calculateAverage()}/10`}
                  </div>
                </div>
                
                <div className="current-insight-card">
                  <div className="current-insight-header">
                    <span>Current Status</span>
                  </div>
                  <div className="current-insight-text">
                    {(() => {
                      const avg = calculateAverage();
                      const phase = getCurrentPhase();
                      
                      if (avg === 'N/A') {
                        return `No ${selectedMetric} data for the selected ${timeRange} period. Start logging benefits to see your progress.`;
                      }
                      
                      const avgValue = parseFloat(avg);
                      
                      if (avgValue >= 7) {
                        return `Your ${selectedMetric} is excellent at ${avg}/10. You're in the ${phase} phase - maintain current strategies and channel this energy into growth.`;
                      } else {
                        return `Your ${selectedMetric} averaged ${avg}/10 during ${phase} phase. Check personalized insights below for optimization strategies.`;
                      }
                    })()}
                  </div>
                </div>
              </div>
            </div>
            
            {/* REFINED: Personalized Insights Section */}
            <div className="personalized-insights-section">
              <div className="personalized-insights-header">
                <h3>Personalized Insights</h3>
              </div>
              
              {/* Smart Urge Management */}
              <div className="insight-card">
                <div className="insight-card-header">
                  <span>Smart Urge Management</span>
                </div>
                <div className="insight-info-banner">
                  <FaInfoCircle className="info-icon" />
                  <span>Real-time vulnerability assessment based on your current streak phase, time of day, and recent benefit patterns.</span>
                </div>
                <div className="insight-card-content">
                  <div className="urge-management-display">
                    {urgeManagement.riskLevel === 'N/A' ? (
                      <div className="risk-level-indicator insufficient">
                        <div>
                          <div className="risk-score insufficient">N/A</div>
                          <div className="risk-level-text">Insufficient Data</div>
                        </div>
                      </div>
                    ) : (
                      <div className={`risk-level-indicator ${urgeManagement.riskLevel.toLowerCase()}`}>
                        <div>
                          <div className={`risk-score ${urgeManagement.riskLevel.toLowerCase()}`}>
                            {urgeManagement.riskLevel}
                          </div>
                          <div className="risk-level-text">Current Risk Level</div>
                        </div>
                      </div>
                    )}
                    <div className="guidance-list">
                      <div className="guidance-title">
                        {urgeManagement.riskLevel === 'N/A' ? 'Data Requirements:' : 'Current Guidance:'}
                      </div>
                      {urgeManagement.guidance.map((guide, index) => (
                        <div key={index} className="guidance-item" dangerouslySetInnerHTML={renderTextWithBold(guide)}></div>
                      ))}
                    </div>
                  </div>
                  {dataQuality.level !== 'insufficient' && (
                    <div className="insight-data-status">
                      <div className="insight-data-status-indicator">
                        <span className={`insight-data-quality ${dataQuality.level}`}>
                          <FaChartLine />
                          {dataQuality.label}
                        </span>
                        <span className="insight-data-days">
                          Based on {dataQuality.days} days of tracking
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Relapse Risk Predictor */}
              <div className="insight-card">
                <div className="insight-card-header">
                  <span>Relapse Risk Predictor</span>
                </div>
                <div className="insight-info-banner">
                  <FaInfoCircle className="info-icon" />
                  <span>Analyzes your recent benefit trends to predict vulnerability periods and provide specific mitigation strategies.</span>
                </div>
                <div className="insight-card-content">
                  <div className="risk-predictor-display">
                    {riskAnalysis.score === 'N/A' ? (
                      <div className="risk-level-indicator insufficient">
                        <div>
                          <div className="risk-score insufficient">N/A</div>
                          <div className="risk-level-text">Insufficient Data</div>
                        </div>
                      </div>
                    ) : (
                      <div className={`risk-level-indicator ${riskAnalysis.level.toLowerCase()}`}>
                        <div>
                          <div className={`risk-score ${riskAnalysis.level.toLowerCase()}`}>
                            {riskAnalysis.score}%
                          </div>
                          <div className="risk-level-text">{riskAnalysis.level} Risk Level</div>
                        </div>
                      </div>
                    )}
                    <div className="risk-factors-list">
                      <div className="risk-factors-title">
                        {riskAnalysis.score === 'N/A' ? 'Data Requirements:' : 'Risk Factors & Actions:'}
                      </div>
                      {riskAnalysis.factors.map((factor, index) => (
                        <div key={index} className="risk-factor-item" dangerouslySetInnerHTML={renderTextWithBold(factor)}></div>
                      ))}
                    </div>
                  </div>
                  {dataQuality.level !== 'insufficient' && (
                    <div className="insight-data-status">
                      <div className="insight-data-status-indicator">
                        <span className={`insight-data-quality ${dataQuality.level}`}>
                          <FaChartLine />
                          {dataQuality.label}
                        </span>
                        <span className="insight-data-days">
                          Based on {dataQuality.days} days of tracking
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Pattern Recognition */}
              {patternInsights.length > 0 && (
                <div className="insight-card">
                  <div className="insight-card-header">
                    <span>Pattern Recognition</span>
                  </div>
                  <div className="insight-info-banner">
                    <FaInfoCircle className="info-icon" />
                    <span>Identifies correlations between your metrics and predicts trends based on your unique retention journey patterns.</span>
                  </div>
                  <div className="insight-card-content">
                    {patternInsights.length === 1 && patternInsights[0].includes('Need 14+') ? (
                      <div className="insufficient-data-message">
                        <div className="insufficient-data-text">
                          Continue tracking daily benefits to unlock pattern analysis. The more data you provide, the more detailed your insights become.
                        </div>
                      </div>
                    ) : (
                      <div className="patterns-display">
                        {patternInsights.map((pattern, index) => (
                          <div key={index} className="pattern-item" dangerouslySetInnerHTML={renderTextWithBold(pattern)}></div>
                        ))}
                      </div>
                    )}
                    {dataQuality.level !== 'insufficient' && (
                      <div className="insight-data-status">
                        <div className="insight-data-status-indicator">
                          <span className={`insight-data-quality ${dataQuality.level}`}>
                            <FaChartLine />
                            {dataQuality.label}
                          </span>
                          <span className="insight-data-days">
                            Based on {dataQuality.days} days of tracking
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              {/* Optimization Guidance */}
              {optimizationGuidance && (
                <div className="insight-card">
                  <div className="insight-card-header">
                    <span>Optimization Guidance</span>
                  </div>
                  <div className="insight-info-banner">
                    <FaInfoCircle className="info-icon" />
                    <span>Shows your peak performance rate and provides timing-based recommendations for maximizing your retention benefits.</span>
                  </div>
                  <div className="insight-card-content">
                    <div className="optimization-display">
                      <div className="optimization-criteria">
                        <div className="optimization-criteria-title">Your Peak Performance Zone:</div>
                        <div className="optimization-criteria-text">{optimizationGuidance.criteria}</div>
                      </div>
                      <div className="optimization-metrics">
                        <div className="optimization-metric-card">
                          <div className="optimization-metric-value">{optimizationGuidance.optimalRate}</div>
                          <div className="optimization-metric-label">Operating in optimal zone</div>
                        </div>
                      </div>
                      <div className="optimization-recommendations">
                        <div className="optimization-title">Current Recommendations:</div>
                        {optimizationGuidance.recommendations.map((rec, index) => (
                          <div key={index} className="optimization-item" dangerouslySetInnerHTML={renderTextWithBold(rec)}></div>
                        ))}
                      </div>
                    </div>
                    {dataQuality.level !== 'insufficient' && (
                      <div className="insight-data-status">
                        <div className="insight-data-status-indicator">
                          <span className={`insight-data-quality ${dataQuality.level}`}>
                            <FaChartLine />
                            {dataQuality.label}
                          </span>
                          <span className="insight-data-days">
                            Based on {dataQuality.days} days of tracking
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              {/* Historical Comparison */}
              <div className="historical-comparison-section">
                <div className="historical-comparison-header">
                  <span>{selectedMetric === 'sleep' ? 'Sleep Quality' : selectedMetric.charAt(0).toUpperCase() + selectedMetric.slice(1)} Journey Analysis</span>
                </div>
                {(() => {
                  const comparison = calculateHistoricalComparison();
                  
                  if (!comparison.hasData) {
                    return (
                      <div className="historical-comparison-card" style={{ gridColumn: '1 / -1', textAlign: 'center' }}>
                        <div className="historical-comparison-value">N/A</div>
                        <div className="historical-comparison-label">{comparison.message}</div>
                      </div>
                    );
                  }
                  
                  return (
                    <>
                      <div className="historical-comparison-grid">
                        <div className="historical-comparison-card">
                          <div className="historical-comparison-value">
                            {comparison.current === 'N/A' ? 'N/A' : `${comparison.current}/10`}
                          </div>
                          <div className="historical-comparison-label">Current Average</div>
                        </div>
                        
                        <div className="historical-comparison-card">
                          <div className="historical-comparison-value">
                            {comparison.bestPhase.data.average}/10
                          </div>
                          <div className="historical-comparison-label">
                            Your peak during {comparison.bestPhase.name} phase ({comparison.bestPhase.range})
                          </div>
                        </div>
                        
                        <div className="historical-comparison-card">
                          <div className="historical-comparison-value">
                            {comparison.allPhases.length}
                          </div>
                          <div className="historical-comparison-label">
                            Phases with data for analysis
                          </div>
                        </div>
                      </div>
                      
                      <div className="historical-insight">
                        {comparison.insight === 'current_best' ? (
                          <div className="insight-positive">
                            🔥 You're currently performing at or above your historical peak! Your {selectedMetric} development is accelerating.
                          </div>
                        ) : (
                          <div className="insight-improvement">
                            📈 Your peak {selectedMetric} was {comparison.bestPhase.data.average}/10 during {comparison.bestPhase.name} phase. You have proven potential to reach this level again.
                          </div>
                        )}
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>
          </>
        )}
      </div>
      
      {/* Badge Modal */}
      {showBadgeModal && selectedBadge && (
        <div className="modal-overlay" onClick={() => setShowBadgeModal(false)}>
          <div className="modal-content badge-modal" onClick={e => e.stopPropagation()}>
            <div className="badge-trophy">
              <FaMedal className="badge-trophy-icon" />
            </div>
            
            <h3>{selectedBadge.name}</h3>
            
            <div className="badge-earned-date">
              Earned on {selectedBadge.date ? format(new Date(selectedBadge.date), 'MMMM d, yyyy') : 'Unknown'}
            </div>
            
            <div className="badge-description">
              <p>
                {selectedBadge.name === '7-Day Warrior' ? 
                  'You\'ve shown tremendous discipline by maintaining a 7-day streak. Your foundation phase is complete - energy fluctuations are stabilizing and mental clarity is emerging!' :
                selectedBadge.name === '14-Day Monk' ? 
                  'Two weeks of dedication! You\'re in the adjustment phase with noticeable strength gains, improved posture, and enhanced focus. Your transformation is becoming visible!' :
                selectedBadge.name === '30-Day Master' ? 
                  'A full month of commitment! You\'ve entered the momentum phase with natural body composition changes, sustained energy, and mental clarity. True mastery developing!' :
                selectedBadge.name === '90-Day King' ? 
                  'Incredible achievement! 90 days represents complete physical and mental transformation. You\'ve reached royal status with emotional mastery and magnetic presence!' :
                selectedBadge.name === '180-Day Emperor' ? 
                  'Extraordinary dedication! Six months of practice has brought spiritual integration and identity transformation. You embody the divine masculine archetype!' :
                selectedBadge.name === '365-Day Sage' ? 
                  'Ultimate mastery achieved! One full year represents complete energy transmutation and service-oriented consciousness. You are now a teacher and healer for others!' :
                  'Congratulations on earning this achievement!'
                }
              </p>
            </div>
            
            <div className="badge-benefits">
              <h4>Benefits Unlocked:</h4>
              <ul>
                {selectedBadge.name === '7-Day Warrior' && (
                  <>
                    <li><FaCheckCircle className="check-icon" /><span>Energy fluctuations stabilizing</span></li>
                    <li><FaCheckCircle className="check-icon" /><span>Brief periods of mental sharpness</span></li>
                    <li><FaCheckCircle className="check-icon" /><span>Growing sense of possibility</span></li>
                    <li><FaCheckCircle className="check-icon" /><span>Motivation to improve life areas</span></li>
                  </>
                )}
                {selectedBadge.name === '14-Day Monk' && (
                  <>
                    <li><FaCheckCircle className="check-icon" /><span>Noticeable strength gains</span></li>
                    <li><FaCheckCircle className="check-icon" /><span>Improved posture and presence</span></li>
                    <li><FaCheckCircle className="check-icon" /><span>Enhanced memory and focus</span></li>
                    <li><FaCheckCircle className="check-icon" /><span>Mood stabilization beginning</span></li>
                  </>
                )}
                {selectedBadge.name === '30-Day Master' && (
                  <>
                    <li><FaCheckCircle className="check-icon" /><span>Natural muscle gain and fat loss</span></li>
                    <li><FaCheckCircle className="check-icon" /><span>Sustained high energy levels</span></li>
                    <li><FaCheckCircle className="check-icon" /><span>Sleep optimization and better rest</span></li>
                    <li><FaCheckCircle className="check-icon" /><span>Mental clarity and pattern recognition</span></li>
                  </>
                )}
                {selectedBadge.name === '90-Day King' && (
                  <>
                    <li><FaCheckCircle className="check-icon" /><span>Complete emotional regulation</span></li>
                    <li><FaCheckCircle className="check-icon" /><span>Natural magnetism and charisma</span></li>
                    <li><FaCheckCircle className="check-icon" /><span>Exceptional mental performance</span></li>
                    <li><FaCheckCircle className="check-icon" /><span>Physical transformation complete</span></li>
                  </>
                )}
                {selectedBadge.name === '180-Day Emperor' && (
                  <>
                    <li><FaCheckCircle className="check-icon" /><span>Spiritual integration and wisdom</span></li>
                    <li><FaCheckCircle className="check-icon" /><span>Natural leadership presence</span></li>
                    <li><FaCheckCircle className="check-icon" /><span>Identity transformation complete</span></li>
                    <li><FaCheckCircle className="check-icon" /><span>Conscious energy mastery</span></li>
                  </>
                )}
                {selectedBadge.name === '365-Day Sage' && (
                  <>
                    <li><FaCheckCircle className="check-icon" /><span>Mastery of sexual energy transmutation</span></li>
                    <li><FaCheckCircle className="check-icon" /><span>Service-oriented consciousness</span></li>
                    <li><FaCheckCircle className="check-icon" /><span>Generational pattern breaking</span></li>
                    <li><FaCheckCircle className="check-icon" /><span>Teaching and healing abilities</span></li>
                  </>
                )}
              </ul>
            </div>
            
            <div className="modal-actions">
              <button className="btn btn-primary" onClick={() => setShowBadgeModal(false)}>
                Continue Journey
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Stats;