// components/Stats/Stats.js - UPDATED: Redundancy removal + Benefit pattern detection
import React, { useState, useEffect, useRef } from 'react';
import { format, subDays } from 'date-fns';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler } from 'chart.js';
import { FaRegLightbulb, FaLock, FaMedal, FaTrophy, FaCheckCircle, FaRedo, FaInfoCircle, 
  FaExclamationTriangle, FaFrown, FaLaptop, FaHome, FaHeart, FaClock, FaBrain, FaEye, FaStar, FaLeaf, FaLightbulb } from 'react-icons/fa';
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
  const [wisdomMode, setWisdomMode] = useState(false);
  const [showFloatingToggle, setShowFloatingToggle] = useState(false);
  
  const insightsStartRef = useRef(null);
  const benefitSectionRef = useRef(null);

  // NEW: Force free users to energy metric on mount and when premium status changes
  useEffect(() => {
    if (!isPremium && selectedMetric !== 'energy') {
      setSelectedMetric('energy');
    }
  }, [isPremium, selectedMetric]);

  // NEW: Handle metric selection with access control
  const handleMetricClick = (metric) => {
    // Free users can only access 'energy' metric
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

  // IMPROVED: Function to determine if user should see info banner
  const shouldShowInfoBanner = () => {
    const benefitData = getFilteredBenefitData();
    
    // Show banner if user has very little logged data (regardless of streak)
    const hasMinimalData = benefitData.length < 7; // Less than a week of data
    
    // Also show for new users (first 3 days) even if they have some data
    const currentStreak = userData.currentStreak || 0;
    const isNewUser = currentStreak <= 3;
    
    return hasMinimalData || isNewUser;
  };

  // CORE: Badge checking logic - automatically unlocks badges when milestones are reached
  const checkAndUpdateBadges = (userData) => {
    if (!userData.badges || !Array.isArray(userData.badges)) {
      return userData;
    }

    const currentStreak = userData.currentStreak || 0;
    const longestStreak = userData.longestStreak || 0;
    let hasNewBadges = false;
    
    // Badge milestone thresholds
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

      // Check if badge should be earned (current streak OR longest streak)
      const shouldBeEarned = currentStreak >= threshold.days || longestStreak >= threshold.days;
      
      // If badge isn't earned but should be
      if (!badge.earned && shouldBeEarned) {
        hasNewBadges = true;
        
        // Show achievement notification
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

  // CORE: Auto-check badges when streak changes
  useEffect(() => {
    if (userData && userData.currentStreak !== undefined) {
      const updatedData = checkAndUpdateBadges(userData);
      
      // Only update if badges actually changed
      if (JSON.stringify(updatedData.badges) !== JSON.stringify(userData.badges)) {
        updateUserData(updatedData);
      }
    }
  }, [userData?.currentStreak, userData?.longestStreak]);

  // Smart floating toggle scroll detection
  useEffect(() => {
    if (!isPremium) return;
    
    const handleScroll = () => {
      if (!insightsStartRef.current || !benefitSectionRef.current) return;
      
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const windowHeight = window.innerHeight;
      
      const insightsStartTop = insightsStartRef.current.offsetTop;
      const benefitSectionBottom = benefitSectionRef.current.offsetTop + benefitSectionRef.current.offsetHeight;
      
      const shouldShow = 
        scrollTop + windowHeight >= insightsStartTop && 
        scrollTop <= benefitSectionBottom;
      
      setShowFloatingToggle(shouldShow);
    };
    
    window.addEventListener('scroll', handleScroll);
    handleScroll();
    
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isPremium]);
  
  // Time range options for chart
  const timeRangeOptions = {
    week: 7,
    month: 30,
    quarter: 90
  };
  
  // Format date for displaying
  const formatDate = (date) => format(new Date(date), 'MMM d, yyyy');
  
  // Handle badge click
  const handleBadgeClick = (badge) => {
    setSelectedBadge(badge);
    setShowBadgeModal(true);
  };

  // Handle smart reset - opens smart dialog
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

  // Premium upgrade handler
  const handleUpgradeClick = () => {
    toast.success('Premium upgrade coming soon! 🚀');
  };

  // Filter benefit data based on selected time range
  const getFilteredBenefitData = () => {
    if (!userData.benefitTracking) return [];
    
    const days = timeRangeOptions[timeRange];
    const cutoffDate = subDays(new Date(), days);
    
    return userData.benefitTracking
      .filter(item => new Date(item.date) >= cutoffDate)
      .sort((a, b) => new Date(a.date) - new Date(b.date));
  };
  
  // Generate chart data - Handle sleep metric
  const generateChartData = () => {
    const filteredData = getFilteredBenefitData();
    
    const labels = filteredData.map(item => 
      format(new Date(item.date), 'MMM d')
    );
    
    const datasets = [{
      label: selectedMetric.charAt(0).toUpperCase() + selectedMetric.slice(1),
      data: filteredData.map(item => {
        if (selectedMetric === 'sleep') {
          return item[selectedMetric] || item.attraction || 5;
        }
        return item[selectedMetric] || 5;
      }),
      borderColor: '#ffdd00',
      backgroundColor: 'rgba(255, 221, 0, 0.1)',
      tension: 0.3,
      fill: true,
      pointBackgroundColor: '#ffdd00',
      pointBorderColor: '#ffdd00',
      pointHoverBackgroundColor: '#f6cc00',
      pointHoverBorderColor: '#f6cc00',
      pointRadius: 6,
      pointHoverRadius: 8,
      pointBorderWidth: 2,
      pointHoverBorderWidth: 3
    }];
    
    return { labels, datasets };
  };
  
  // Chart options
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
          font: { size: 12 }
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
        callbacks: {
          title: (items) => {
            if (!items.length) return '';
            const idx = items[0].dataIndex;
            const filteredData = getFilteredBenefitData();
            return formatDate(filteredData[idx].date);
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
  
  // NEW: Calculate average for last 7 days (for free users) 
  const calculateAverage = () => {
    if (!isPremium) {
      // For free users: last 7 days average
      const allData = userData.benefitTracking || [];
      const last7DaysData = allData
        .filter(item => {
          const itemDate = new Date(item.date);
          const cutoffDate = subDays(new Date(), 7);
          return itemDate >= cutoffDate;
        })
        .sort((a, b) => new Date(a.date) - new Date(b.date));
      
      if (last7DaysData.length === 0) return '0.0';
      
      const sum = last7DaysData.reduce((acc, item) => {
        return acc + (item.energy || 0);
      }, 0);
      return (sum / last7DaysData.length).toFixed(1);
    }
    
    // For premium users: use existing filtered data logic
    const filteredData = getFilteredBenefitData();
    if (filteredData.length === 0) return '0.0';
    
    const sum = filteredData.reduce((acc, item) => {
      if (selectedMetric === 'sleep') {
        return acc + (item[selectedMetric] || item.attraction || 0);
      }
      return acc + (item[selectedMetric] || 0);
    }, 0);
    return (sum / filteredData.length).toFixed(1);
  };
  
  // Generate streak comparison data with expanded benefit categories
  const generateStreakComparison = () => {
    const filteredData = getFilteredBenefitData();
    
    if (filteredData.length === 0) {
      return {
        confidence: { short: '5', medium: '5', long: '5' },
        energy: { short: '5', medium: '5', long: '5' },
        focus: { short: '5', medium: '5', long: '5' },
        aura: { short: '5', medium: '5', long: '5' },
        sleep: { short: '5', medium: '5', long: '5' },
        workout: { short: '5', medium: '5', long: '5' }
      };
    }
    
    const baseValue = parseFloat(calculateAverage());
    
    const progressionMultipliers = {
      confidence: { short: -1.5, medium: 0.0, long: +2.0 },
      energy: { short: -1.2, medium: 0.0, long: +2.5 },
      focus: { short: -1.0, medium: 0.0, long: +2.3 },
      aura: { short: -0.8, medium: 0.0, long: +2.8 },
      sleep: { short: -1.1, medium: 0.0, long: +2.2 },
      workout: { short: -0.6, medium: 0.0, long: +2.0 }
    };
    
    const result = {};
    
    Object.keys(progressionMultipliers).forEach(metric => {
      const multipliers = progressionMultipliers[metric];
      const shortValue = Math.max(1, Math.min(10, baseValue + multipliers.short));
      const mediumValue = baseValue;
      const longValue = Math.max(1, Math.min(10, baseValue + multipliers.long));
      
      result[metric] = {
        short: shortValue % 1 === 0 ? shortValue.toFixed(0) : shortValue.toFixed(1),
        medium: mediumValue % 1 === 0 ? mediumValue.toFixed(0) : mediumValue.toFixed(1),
        long: longValue % 1 === 0 ? longValue.toFixed(0) : longValue.toFixed(1)
      };
    });
    
    return result;
  };
  
  const streakComparison = generateStreakComparison();

  // NEW: BENEFIT PATTERN DETECTION FUNCTIONS
  
  // Analyze correlations between different benefit metrics
  const generateBenefitCorrelations = () => {
    const allData = userData.benefitTracking || [];
    if (allData.length < 7) return [];
    
    const correlations = [];
    const metrics = ['energy', 'focus', 'confidence', 'aura', 'sleep', 'workout'];
    
    // Calculate correlations between metrics
    for (let i = 0; i < metrics.length; i++) {
      for (let j = i + 1; j < metrics.length; j++) {
        const metric1 = metrics[i];
        const metric2 = metrics[j];
        
        const validData = allData.filter(item => 
          item[metric1] !== undefined && item[metric2] !== undefined
        );
        
        if (validData.length >= 5) {
          const correlation = calculateCorrelation(
            validData.map(item => item[metric1]),
            validData.map(item => item[metric2])
          );
          
          if (Math.abs(correlation) > 0.3) {
            const strength = Math.abs(correlation) > 0.7 ? 'strong' : 'moderate';
            const direction = correlation > 0 ? 'positive' : 'negative';
            
            correlations.push({
              metric1: metric1,
              metric2: metric2,
              correlation: correlation,
              strength: strength,
              direction: direction,
              insight: `${metric1.charAt(0).toUpperCase() + metric1.slice(1)} and ${metric2} show a ${strength} ${direction} relationship (${(correlation * 100).toFixed(0)}% correlation)`
            });
          }
        }
      }
    }
    
    return correlations.slice(0, 3); // Top 3 correlations
  };

  // Calculate correlation coefficient between two arrays
  const calculateCorrelation = (x, y) => {
    const n = x.length;
    if (n !== y.length || n === 0) return 0;
    
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((acc, val, i) => acc + val * y[i], 0);
    const sumXX = x.reduce((acc, val) => acc + val * val, 0);
    const sumYY = y.reduce((acc, val) => acc + val * val, 0);
    
    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumXX - sumX * sumX) * (n * sumYY - sumY * sumY));
    
    return denominator === 0 ? 0 : numerator / denominator;
  };

  // Analyze relapse predictor patterns
  const analyzeRelapsePredicators = () => {
    const streakHistory = userData.streakHistory || [];
    const benefitData = userData.benefitTracking || [];
    
    if (streakHistory.length < 2 || benefitData.length < 14) return [];
    
    const relapsePatterns = [];
    
    // Find completed streaks (with end dates)
    const completedStreaks = streakHistory.filter(streak => streak.end);
    
    completedStreaks.forEach(streak => {
      const endDate = new Date(streak.end);
      
      // Look at benefit data 3-7 days before relapse
      const preRelapseData = benefitData.filter(item => {
        const itemDate = new Date(item.date);
        const daysBefore = Math.floor((endDate - itemDate) / (1000 * 60 * 60 * 24));
        return daysBefore >= 1 && daysBefore <= 7;
      });
      
      if (preRelapseData.length >= 3) {
        const metrics = ['energy', 'focus', 'confidence', 'aura', 'sleep', 'workout'];
        
        metrics.forEach(metric => {
          const values = preRelapseData
            .map(item => item[metric])
            .filter(val => val !== undefined);
          
          if (values.length >= 3) {
            const avgValue = values.reduce((a, b) => a + b, 0) / values.length;
            const trend = analyzeTrend(values);
            
            if (avgValue < 4 || trend === 'declining') {
              relapsePatterns.push({
                metric: metric,
                pattern: avgValue < 4 ? 'low_values' : 'declining_trend',
                avgValue: avgValue.toFixed(1),
                insight: avgValue < 4 
                  ? `${metric} dropped to ${avgValue.toFixed(1)}/10 before relapse`
                  : `${metric} showed declining trend before relapse`
              });
            }
          }
        });
      }
    });
    
    // Group similar patterns
    const groupedPatterns = {};
    relapsePatterns.forEach(pattern => {
      const key = `${pattern.metric}_${pattern.pattern}`;
      if (!groupedPatterns[key]) {
        groupedPatterns[key] = { ...pattern, count: 1 };
      } else {
        groupedPatterns[key].count++;
      }
    });
    
    return Object.values(groupedPatterns)
      .filter(pattern => pattern.count >= 1)
      .slice(0, 3);
  };

  // Analyze trend in array of values
  const analyzeTrend = (values) => {
    if (values.length < 3) return 'insufficient_data';
    
    let increasing = 0;
    let decreasing = 0;
    
    for (let i = 1; i < values.length; i++) {
      if (values[i] > values[i - 1]) increasing++;
      if (values[i] < values[i - 1]) decreasing++;
    }
    
    if (decreasing > increasing) return 'declining';
    if (increasing > decreasing) return 'improving';
    return 'stable';
  };

  // Analyze benefit recovery patterns after relapses
  const analyzeBenefitRecovery = () => {
    const streakHistory = userData.streakHistory || [];
    const benefitData = userData.benefitTracking || [];
    
    if (streakHistory.length < 2 || benefitData.length < 14) return [];
    
    const recoveryPatterns = [];
    
    // Find streak starts (recovery periods)
    const recoveryPeriods = streakHistory.slice(1); // Skip first streak
    
    recoveryPeriods.forEach(streak => {
      const startDate = new Date(streak.start);
      
      // Look at benefit data 0-14 days after streak start
      const postRecoveryData = benefitData.filter(item => {
        const itemDate = new Date(item.date);
        const daysAfter = Math.floor((itemDate - startDate) / (1000 * 60 * 60 * 24));
        return daysAfter >= 0 && daysAfter <= 14;
      }).sort((a, b) => new Date(a.date) - new Date(b.date));
      
      if (postRecoveryData.length >= 5) {
        const metrics = ['energy', 'focus', 'confidence', 'aura', 'sleep', 'workout'];
        
        metrics.forEach(metric => {
          const values = postRecoveryData
            .map(item => item[metric])
            .filter(val => val !== undefined);
          
          if (values.length >= 5) {
            const initialValue = values[0];
            const finalValue = values[values.length - 1];
            const daysToRecover = findRecoveryDay(values, initialValue);
            
            if (finalValue > initialValue + 1) {
              recoveryPatterns.push({
                metric: metric,
                recoveryDays: daysToRecover,
                improvement: (finalValue - initialValue).toFixed(1),
                insight: `${metric} typically recovers to normal levels within ${daysToRecover} days`
              });
            }
          }
        });
      }
    });
    
    // Average recovery patterns
    const avgRecovery = {};
    recoveryPatterns.forEach(pattern => {
      if (!avgRecovery[pattern.metric]) {
        avgRecovery[pattern.metric] = { days: [], improvements: [] };
      }
      avgRecovery[pattern.metric].days.push(pattern.recoveryDays);
      avgRecovery[pattern.metric].improvements.push(parseFloat(pattern.improvement));
    });
    
    return Object.keys(avgRecovery).map(metric => {
      const data = avgRecovery[metric];
      const avgDays = Math.round(data.days.reduce((a, b) => a + b, 0) / data.days.length);
      const avgImprovement = (data.improvements.reduce((a, b) => a + b, 0) / data.improvements.length).toFixed(1);
      
      return {
        metric: metric,
        avgRecoveryDays: avgDays,
        avgImprovement: avgImprovement,
        insight: `${metric} typically normalizes within ${avgDays} days after starting fresh`
      };
    }).slice(0, 3);
  };

  // Find day when metric recovers to acceptable level
  const findRecoveryDay = (values, initialValue) => {
    const targetValue = initialValue + 2; // Recovery threshold
    
    for (let i = 0; i < values.length; i++) {
      if (values[i] >= targetValue) {
        return i + 1; // Return day number (1-indexed)
      }
    }
    
    return values.length; // If never fully recovered in timeframe
  };

  // Identify optimal benefit ranges for streak maintenance
  const analyzeOptimalRanges = () => {
    const benefitData = userData.benefitTracking || [];
    const streakHistory = userData.streakHistory || [];
    
    if (benefitData.length < 14 || streakHistory.length < 2) return [];
    
    const optimalRanges = [];
    const metrics = ['energy', 'focus', 'confidence', 'aura', 'sleep', 'workout'];
    
    // Find periods of successful streak maintenance (7+ days)
    const successfulPeriods = [];
    
    streakHistory.forEach(streak => {
      const startDate = new Date(streak.start);
      const endDate = streak.end ? new Date(streak.end) : new Date();
      const streakLength = Math.floor((endDate - startDate) / (1000 * 60 * 60 * 24));
      
      if (streakLength >= 7) {
        const periodData = benefitData.filter(item => {
          const itemDate = new Date(item.date);
          return itemDate >= startDate && itemDate <= endDate;
        });
        
        if (periodData.length >= 5) {
          successfulPeriods.push({
            data: periodData,
            length: streakLength
          });
        }
      }
    });
    
    if (successfulPeriods.length === 0) return [];
    
    metrics.forEach(metric => {
      const successfulValues = [];
      
      successfulPeriods.forEach(period => {
        const values = period.data
          .map(item => item[metric])
          .filter(val => val !== undefined);
        
        successfulValues.push(...values);
      });
      
      if (successfulValues.length >= 10) {
        const sortedValues = successfulValues.sort((a, b) => a - b);
        const q1 = sortedValues[Math.floor(sortedValues.length * 0.25)];
        const q3 = sortedValues[Math.floor(sortedValues.length * 0.75)];
        const median = sortedValues[Math.floor(sortedValues.length * 0.5)];
        
        optimalRanges.push({
          metric: metric,
          optimalMin: q1.toFixed(1),
          optimalMax: q3.toFixed(1),
          optimalMedian: median.toFixed(1),
          insight: `Maintain ${metric} between ${q1.toFixed(1)}-${q3.toFixed(1)} for optimal streak success`
        });
      }
    });
    
    return optimalRanges.slice(0, 3);
  };

  // Main benefit pattern analysis function
  const analyzeBenefitPatterns = () => {
    const correlations = generateBenefitCorrelations();
    const relapsePatterns = analyzeRelapsePredicators();
    const recoveryPatterns = analyzeBenefitRecovery();
    const optimalRanges = analyzeOptimalRanges();
    
    return {
      correlations,
      relapsePatterns,
      recoveryPatterns,
      optimalRanges
    };
  };

  // Generate benefit-focused insights (replacing phase-based insights)
  const generateBenefitInsights = () => {
    const filteredData = getFilteredBenefitData();
    const insights = [];
    
    if (filteredData.length < 3) {
      return [{
        id: 1,
        practical: "Start tracking your daily benefits to unlock personalized pattern recognition and optimization insights.",
        esoteric: "The universe reveals its patterns to those who observe with consistency and intention.",
        actionable: "Log your energy, focus, and other metrics daily for at least a week to see meaningful patterns."
      }];
    }
    
    const currentAvg = parseFloat(calculateAverage());
    const trend = analyzeTrend(filteredData.map(item => item[selectedMetric] || 5).slice(-7));
    
    // Current metric insight
    if (currentAvg >= 7) {
      insights.push({
        id: 1,
        practical: `Your ${selectedMetric} levels are excellent (${currentAvg}/10). This puts you in the top performance range.`,
        esoteric: `Your ${selectedMetric} energy resonates at a high frequency, attracting abundance and clarity.`,
        actionable: `Maintain current practices that support your ${selectedMetric}. Document what's working well.`
      });
    } else if (currentAvg >= 5) {
      insights.push({
        id: 1,
        practical: `Your ${selectedMetric} is in a healthy range (${currentAvg}/10) with room for optimization.`,
        esoteric: `Your ${selectedMetric} energy is stabilizing. Focus on consistency to reach higher states.`,
        actionable: `Identify specific activities that boost your ${selectedMetric} and do them more frequently.`
      });
    } else {
      insights.push({
        id: 1,
        practical: `Your ${selectedMetric} needs attention (${currentAvg}/10). This is a key area for improvement.`,
        esoteric: `Your ${selectedMetric} energy is calling for nurturing and conscious cultivation.`,
        actionable: `Prioritize practices that restore your ${selectedMetric}. Consider what might be draining it.`
      });
    }
    
    // Trend insight
    if (trend === 'improving') {
      insights.push({
        id: 2,
        practical: `Your ${selectedMetric} is trending upward - your efforts are paying off!`,
        esoteric: `The ascending energy of your ${selectedMetric} reflects your spiritual alignment and growth.`,
        actionable: `Continue your current approach and consider intensifying the practices that are working.`
      });
    } else if (trend === 'declining') {
      insights.push({
        id: 2,
        practical: `Your ${selectedMetric} has been declining recently. Time to reassess your approach.`,
        esoteric: `Declining ${selectedMetric} signals a need to realign with your higher purpose and practices.`,
        actionable: `Review recent changes in your routine and identify what might be impacting your ${selectedMetric}.`
      });
    }
    
    return insights;
  };
  
  // Generate current insight for sidebar
  const getCurrentInsight = () => {
    const insights = generateBenefitInsights();
    const currentInsight = insights[0] || {
      practical: "Track your benefits daily to unlock personalized insights.",
      esoteric: "Consistent observation reveals the deeper patterns of your journey."
    };
    return wisdomMode ? currentInsight.esoteric : currentInsight.practical;
  };
  
  return (
    <div className="stats-container">
      {/* Smart Floating Wisdom Toggle */}
      {showFloatingToggle && isPremium && (
        <button 
          className={`floating-wisdom-toggle ${wisdomMode ? 'active' : ''}`}
          onClick={() => setWisdomMode(!wisdomMode)}
          title={wisdomMode ? "Switch to Practical Insights" : "Switch to Esoteric Insights"}
        >
          <FaEye className={`floating-wisdom-eye ${wisdomMode ? 'active' : ''}`} />
        </button>
      )}

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
      
      {/* Benefit Tracker Section */}
      <div className="benefit-tracker-section">
        <h3>Benefit Tracker</h3>
        
        {/* Info Banner */}
        {shouldShowInfoBanner() && (
          <div className="stats-info-banner">
            <FaInfoCircle className="info-icon" />
            <span><strong>Just getting started?</strong> Your insights will become more detailed as you log daily benefits and track your progress over time.</span>
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
          
          {/* Time range selector for premium users only */}
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
                <div className="current-metric-label">Energy Level (last 7 days)</div>
                <div className="current-metric-value">{calculateAverage()}/10</div>
              </div>
            </div>
            
            <div className="free-insight-preview">
              <div className="current-insight-card">
                <div className="current-insight-header">
                  <FaRegLightbulb className="insight-icon" />
                  <span>Energy Insights</span>
                </div>
                <div className="current-insight-text">
                  {getCurrentInsight()}
                </div>
              </div>
            </div>
            
            <div className="benefit-upgrade-cta">
              <div className="upgrade-helmet-section">
                <img 
                  src={helmetImage} 
                  alt="Premium Benefits" 
                  className="upgrade-helmet-icon"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.nextSibling.style.display = 'block';
                  }}
                />
                <div className="upgrade-helmet-fallback" style={{display: 'none'}}>⚡</div>
              </div>
              
              <div className="upgrade-text-section">
                <h4>Unlock Full Benefit Analysis</h4>
                <p>Get detailed charts, advanced insights, pattern analysis, and personalized recommendations to optimize your journey.</p>
                
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
                <Line data={generateChartData()} options={chartOptions} height={300} />
              </div>
              
              <div className="current-insight-sidebar">
                <div className="current-metric-average">
                  <div className="current-metric-label">Average {selectedMetric === 'sleep' ? 'Sleep Quality' : selectedMetric.charAt(0).toUpperCase() + selectedMetric.slice(1)}</div>
                  <div className="current-metric-value">{calculateAverage()}/10</div>
                </div>
                
                <div className="current-insight-card">
                  <div className="current-insight-header">
                    <FaRegLightbulb className="insight-icon" />
                    <span>Current Insights</span>
                  </div>
                  <div className="current-insight-text">
                    {getCurrentInsight()}
                  </div>
                </div>
              </div>
            </div>
            
            <div className="detailed-analysis-section">
              <div className="detailed-analysis-header">
                <div className="detailed-analysis-title">
                  <h4>Benefit Analysis</h4>
                </div>
              </div>
              
              <div className="streak-comparison">
                <h5><span className="metric-highlight">{selectedMetric === 'sleep' ? 'Sleep Quality' : selectedMetric.charAt(0).toUpperCase() + selectedMetric.slice(1)}</span> Levels by Streak Length</h5>
                
                <div className="comparison-grid">
                  <div className="comparison-card">
                    <div className="comparison-value">{streakComparison[selectedMetric].short}/10</div>
                    <div className="comparison-label">{selectedMetric === 'sleep' ? 'Sleep Quality' : selectedMetric.charAt(0).toUpperCase() + selectedMetric.slice(1)} during 1-7 day streaks</div>
                  </div>
                  
                  <div className="comparison-card">
                    <div className="comparison-value">{streakComparison[selectedMetric].medium}/10</div>
                    <div className="comparison-label">{selectedMetric === 'sleep' ? 'Sleep Quality' : selectedMetric.charAt(0).toUpperCase() + selectedMetric.slice(1)} during 8-30 day streaks</div>
                  </div>
                  
                  <div className="comparison-card">
                    <div className="comparison-value">{streakComparison[selectedMetric].long}/10</div>
                    <div className="comparison-label">{selectedMetric === 'sleep' ? 'Sleep Quality' : selectedMetric.charAt(0).toUpperCase() + selectedMetric.slice(1)} during 30+ day streaks</div>
                  </div>
                </div>
              </div>
              
              <div className="personalized-analysis">
                <h5>Personalized Analysis</h5>
                
                <div className="insights-grid">
                  {generateBenefitInsights().map(insight => (
                    <div 
                      key={insight.id} 
                      className="insight-card benefit-focused"
                    >
                      <div className="insight-card-header">
                        <FaRegLightbulb className="insight-icon" />
                        <span className="insight-metric">Benefit Intelligence</span>
                      </div>
                      <div className="insight-text">{wisdomMode ? insight.esoteric : insight.practical}</div>
                      {insight.actionable && (
                        <div className="insight-actionable">{insight.actionable}</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            {/* NEW: Benefit Intelligence Section (replaces pattern analysis) */}
            <div className="benefit-intelligence-section" ref={benefitSectionRef}>
              <div className="benefit-intelligence-header">
                <h3>Benefit Intelligence</h3>
              </div>
              
              <div className="benefit-patterns">
                {(() => {
                  const patterns = analyzeBenefitPatterns();
                  const hasAnyPatterns = patterns.correlations.length > 0 || 
                                       patterns.relapsePatterns.length > 0 || 
                                       patterns.recoveryPatterns.length > 0 || 
                                       patterns.optimalRanges.length > 0;
                  
                  if (!hasAnyPatterns) {
                    return (
                      <div className="no-patterns">
                        <FaInfoCircle className="no-patterns-icon" />
                        <span>
                          {wisdomMode ? 
                            "Track more benefit cycles to discover the deeper correlations and optimization patterns governing your transformation." :
                            "Track more benefit data to unlock pattern recognition, correlation analysis, and personalized optimization insights."
                          }
                        </span>
                      </div>
                    );
                  }
                  
                  return (
                    <>
                      {/* Benefit Correlations */}
                      {patterns.correlations.length > 0 && (
                        <div className="pattern-group">
                          <h4>Benefit Correlations</h4>
                          {patterns.correlations.map((correlation, index) => (
                            <div key={index} className="pattern-insight-item correlation">
                              <div className="pattern-text">
                                {wisdomMode ? 
                                  `The energies of ${correlation.metric1} and ${correlation.metric2} flow in ${correlation.direction === 'positive' ? 'harmony' : 'opposition'}, revealing deeper synchronicities in your development.` :
                                  correlation.insight
                                }
                              </div>
                              <div className="pattern-actionable">
                                {correlation.direction === 'positive' ? 
                                  `When working on ${correlation.metric1}, also focus on ${correlation.metric2} for amplified results.` :
                                  `Balance is key - when ${correlation.metric1} is high, give extra attention to ${correlation.metric2}.`
                                }
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      
                      {/* Relapse Predictors */}
                      {patterns.relapsePatterns.length > 0 && (
                        <div className="pattern-group">
                          <h4>Relapse Predictor Patterns</h4>
                          {patterns.relapsePatterns.map((pattern, index) => (
                            <div key={index} className="pattern-insight-item warning">
                              <div className="pattern-text">
                                {wisdomMode ? 
                                  `When your ${pattern.metric} energy falls below harmony, disruption in your path may follow.` :
                                  pattern.insight
                                }
                              </div>
                              <div className="pattern-actionable">
                                Monitor your {pattern.metric} levels closely and take action when they start declining.
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      
                      {/* Recovery Patterns */}
                      {patterns.recoveryPatterns.length > 0 && (
                        <div className="pattern-group">
                          <h4>Benefit Recovery Patterns</h4>
                          {patterns.recoveryPatterns.map((pattern, index) => (
                            <div key={index} className="pattern-insight-item recovery">
                              <div className="pattern-text">
                                {wisdomMode ? 
                                  `Your ${pattern.metric} energy typically realigns with cosmic flow within ${pattern.avgRecoveryDays} cycles of renewal.` :
                                  pattern.insight
                                }
                              </div>
                              <div className="pattern-actionable">
                                Be patient during recovery - your {pattern.metric} will stabilize within {pattern.avgRecoveryDays} days.
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      
                      {/* Optimal Ranges */}
                      {patterns.optimalRanges.length > 0 && (
                        <div className="pattern-group">
                          <h4>Optimal Benefit Ranges</h4>
                          {patterns.optimalRanges.map((range, index) => (
                            <div key={index} className="pattern-insight-item optimal">
                              <div className="pattern-text">
                                {wisdomMode ? 
                                  `Your ${range.metric} energy achieves optimal resonance between ${range.optimalMin}-${range.optimalMax}, creating conditions for sustained transformation.` :
                                  range.insight
                                }
                              </div>
                              <div className="pattern-actionable">
                                Target {range.metric} levels of {range.optimalMedian}/10 for best streak maintenance.
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
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