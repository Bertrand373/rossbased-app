// components/Stats/Stats.js - REDESIGNED: Pro Intelligence Analysis Section
import React, { useState, useEffect, useRef } from 'react';
import { format, subDays } from 'date-fns';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler } from 'chart.js';
import { FaRegLightbulb, FaLock, FaMedal, FaTrophy, FaCheckCircle, FaRedo, FaInfoCircle, 
  FaExclamationTriangle, FaFrown, FaLaptop, FaHome, FaHeart, FaClock, FaBrain, FaEye, FaStar, FaChartLine } from 'react-icons/fa';
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
    const maxStreak = Math.max(currentStreak, longestStreak); // FIXED: Use max for badge checking
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

      const shouldBeEarned = maxStreak >= threshold.days; // FIXED: Use maxStreak
      
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

  // UPDATED: Filter benefit data based on selected time range with proper date handling
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
  
  // UPDATED: Generate chart data with proper time range filtering
  const generateChartData = () => {
    const filteredData = getFilteredBenefitData();
    
    if (filteredData.length === 0) {
      return {
        labels: [],
        datasets: [{
          label: selectedMetric.charAt(0).toUpperCase() + selectedMetric.slice(1),
          data: [],
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
        }]
      };
    }
    
    // Generate labels based on time range for better readability
    const labels = filteredData.map(item => {
      const date = new Date(item.date);
      if (timeRange === 'week') {
        return format(date, 'EEE'); // Mon, Tue, Wed
      } else if (timeRange === 'month') {
        return format(date, 'MMM d'); // Jan 15
      } else {
        return format(date, 'MMM d'); // Jan 15 (for quarter view)
      }
    });
    
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
      pointRadius: timeRange === 'quarter' ? 4 : 6, // Smaller points for quarter view
      pointHoverRadius: timeRange === 'quarter' ? 6 : 8,
      pointBorderWidth: 2,
      pointHoverBorderWidth: 3
    }];
    
    return { labels, datasets };
  };
  
  // UPDATED: Chart options with dynamic scaling based on time range
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
          maxTicksLimit: timeRange === 'quarter' ? 12 : timeRange === 'month' ? 15 : 7, // Limit ticks based on range
          maxRotation: timeRange === 'quarter' ? 45 : 0 // Rotate labels for quarter view
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
            if (!filteredData[idx]) return '';
            return formatDate(filteredData[idx].date);
          },
          label: (context) => {
            const value = context.parsed.y;
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
  
  // Calculate average for display - UPDATED: Handle no data cases
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

  // UPDATED: Calculate historical comparison values with proper N/A handling
  const calculateHistoricalComparison = () => {
    const allData = userData.benefitTracking || [];
    const filteredData = getFilteredBenefitData();
    
    // Short streaks (1-7 days)
    const getShortStreakAverage = () => {
      if (filteredData.length === 0) return 'N/A';
      const shortTermData = filteredData.filter(item => {
        const itemDate = new Date(item.date);
        const sevenDaysAgo = subDays(new Date(), 7);
        return itemDate >= sevenDaysAgo;
      });
      if (shortTermData.length === 0) return 'N/A';
      const avg = shortTermData.reduce((sum, item) => sum + (item[selectedMetric] || 5), 0) / shortTermData.length;
      return avg.toFixed(1);
    };
    
    // Current average
    const getCurrentAverage = () => {
      return calculateAverage();
    };
    
    // Projected longer streak average
    const getProjectedAverage = () => {
      const currentAvg = calculateAverage();
      if (currentAvg === 'N/A') return 'N/A';
      
      const baseValue = parseFloat(currentAvg);
      const currentStreak = userData.currentStreak || 0;
      if (currentStreak >= 74) {
        return Math.min(10, baseValue + 1.5).toFixed(1);
      }
      return Math.min(10, baseValue + 2.0).toFixed(1);
    };
    
    return {
      shortStreak: getShortStreakAverage(),
      current: getCurrentAverage(),
      projected: getProjectedAverage()
    };
  };

  // UPDATED: Calculate relapse risk score with educational insights and proper N/A handling
  const calculateRelapseRisk = () => {
    const filteredData = getFilteredBenefitData();
    const currentStreak = userData.currentStreak || 0;
    
    // Return N/A for insufficient data
    if (filteredData.length < 3) {
      return { 
        score: 'N/A', 
        factors: ['Insufficient data for analysis (need 3+ days of benefit tracking)'], 
        level: 'Insufficient Data' 
      };
    }
    
    const last3Days = filteredData.slice(-3);
    let riskScore = 0;
    const riskFactors = [];
    
    // Energy declining trend with educational context
    if (last3Days.length >= 2) {
      const energyTrend = last3Days[last3Days.length - 1].energy - last3Days[0].energy;
      if (energyTrend < -1) {
        riskScore += 25;
        const drop = Math.abs(energyTrend).toFixed(1);
        riskFactors.push(`Energy declined ${drop} points over 3 days. This often indicates adrenal fatigue from energy transmutation stress.`);
      }
    }
    
    // Low confidence (not mood)
    const avgConfidence = last3Days.reduce((sum, day) => sum + (day.confidence || 5), 0) / last3Days.length;
    if (avgConfidence < 4) {
      riskScore += 20;
      riskFactors.push(`Confidence averaging ${avgConfidence.toFixed(1)}/10. Emotional instability increases vulnerability to relapse episodes.`);
    }
    
    // Poor sleep quality with educational context
    if (isPremium) {
      const avgSleep = last3Days.reduce((sum, day) => sum + (day.sleep || 5), 0) / last3Days.length;
      if (avgSleep < 5) {
        riskScore += 15;
        riskFactors.push(`Sleep quality ${avgSleep.toFixed(1)}/10. Poor circadian rhythm disrupts hormone balance and willpower.`);
      }
    }
    
    // Low focus with educational context
    if (isPremium) {
      const avgFocus = last3Days.reduce((sum, day) => sum + (day.focus || 5), 0) / last3Days.length;
      if (avgFocus < 4) {
        riskScore += 20;
        riskFactors.push(`Focus averaging ${avgFocus.toFixed(1)}/10. Mental clarity decline often precedes relapse episodes.`);
      }
    }
    
    // Spermatogenesis cycle insights
    if (currentStreak >= 60 && currentStreak <= 74) {
      riskScore += 15;
      riskFactors.push(`Day ${currentStreak} - approaching spermatogenesis completion (67-74 days). Biological transition period increases urge intensity.`);
    }
    
    // Weekend vulnerability with educational context
    const isWeekend = new Date().getDay() === 0 || new Date().getDay() === 6;
    if (isWeekend) {
      riskScore += 10;
      riskFactors.push('Weekend period detected. Decreased structure and increased isolation elevate relapse risk.');
    }
    
    // Determine risk level
    let level = 'Low';
    if (riskScore >= 50) level = 'High';
    else if (riskScore >= 25) level = 'Medium';
    
    return {
      score: Math.min(riskScore, 100),
      factors: riskFactors.length > 0 ? riskFactors : ['All metrics stable - retention patterns appear sustainable'],
      level
    };
  };

  // UPDATED: Calculate benefit correlations with educational insights
  const calculateCorrelations = () => {
    const allData = userData.benefitTracking || [];
    if (allData.length < 7) return [];
    
    const correlations = [];
    const currentStreak = userData.currentStreak || 0;
    
    // Energy-focus correlation with transmutation insights
    const energyData = allData.filter(d => d.energy >= 7);
    if (energyData.length > 0 && isPremium) {
      const avgFocusWhenEnergyHigh = energyData.reduce((sum, d) => sum + (d.focus || 0), 0) / energyData.length;
      const overallAvgFocus = allData.reduce((sum, d) => sum + (d.focus || 0), 0) / allData.length;
      const improvement = ((avgFocusWhenEnergyHigh - overallAvgFocus) / overallAvgFocus * 100).toFixed(0);
      
      if (improvement > 5) {
        correlations.push(`When energy reaches 7 or higher, focus averages ${avgFocusWhenEnergyHigh.toFixed(1)}/10 (representing a ${improvement}% improvement above baseline). This demonstrates energy transmutation—sexual energy converting to mental clarity, explaining enhanced cognitive function through retention practice.`);
      }
    }
    
    // Sleep-confidence correlation with circadian optimization insights
    if (isPremium && allData.length > 5) {
      const poorSleepDays = allData.filter(d => (d.sleep || 5) < 5);
      const nextDayConfidence = poorSleepDays.map(d => {
        const dayAfter = allData.find(next => {
          const dayAfterDate = new Date(d.date);
          dayAfterDate.setDate(dayAfterDate.getDate() + 1);
          return next.date === dayAfterDate.toISOString().split('T')[0];
        });
        return dayAfter ? (dayAfter.confidence || 5) : null;
      }).filter(confidence => confidence !== null);
      
      if (nextDayConfidence.length > 0) {
        const lowConfidenceChance = (nextDayConfidence.filter(confidence => confidence < 5).length / nextDayConfidence.length * 100).toFixed(0);
        if (lowConfidenceChance > 50) {
          correlations.push(`Sleep quality below 5/10 creates a ${lowConfidenceChance}% probability of low confidence the following day. Sleep architecture optimization through circadian rhythm alignment significantly improves retention success rates.`);
        }
      }
    }
    
    // Spermatogenesis cycle correlation
    if (currentStreak >= 74) {
      const post74Data = allData.filter(d => {
        const daysSinceStart = Math.floor((new Date(d.date) - new Date(userData.startDate)) / (1000 * 60 * 60 * 24));
        return daysSinceStart >= 74;
      });
      
      if (post74Data.length > 0) {
        const avgEnergyPost74 = post74Data.reduce((sum, d) => sum + (d.energy || 0), 0) / post74Data.length;
        const avgEnergyPre74 = allData.filter(d => {
          const daysSinceStart = Math.floor((new Date(d.date) - new Date(userData.startDate)) / (1000 * 60 * 60 * 24));
          return daysSinceStart < 74;
        }).reduce((sum, d) => sum + (d.energy || 0), 0) / allData.length;
        
        const improvement = ((avgEnergyPost74 - avgEnergyPre74) / avgEnergyPre74 * 100).toFixed(0);
        if (improvement > 10) {
          correlations.push(`Post-spermatogenesis phase (74+ days): Energy averages ${avgEnergyPost74.toFixed(1)}/10 (representing a ${improvement}% improvement versus pre-74 day levels). Your body has completed the biological transition from reproduction to cellular optimization mode.`);
        }
      }
    }
    
    return correlations;
  };

  // UPDATED: Calculate performance zones with educational insights
  const calculatePerformanceZones = () => {
    const allData = userData.benefitTracking || [];
    if (allData.length < 7) return null;
    
    const currentStreak = userData.currentStreak || 0;
    
    // Define optimal thresholds with educational context
    const optimalDays = allData.filter(d => 
      (d.energy || 0) >= 7 && 
      (d.confidence || 0) >= 5 && 
      (!isPremium || (d.sleep || 0) >= 6)
    );
    
    const suboptimalDays = allData.length - optimalDays.length;
    const optimalPercentage = (optimalDays.length / allData.length * 100).toFixed(0);
    
    // Calculate focus performance in optimal zone
    let focusPerformance = null;
    if (isPremium && optimalDays.length > 0) {
      const highFocusDays = optimalDays.filter(d => (d.focus || 0) >= 8).length;
      const focusSuccessRate = (highFocusDays / optimalDays.length * 100).toFixed(0);
      focusPerformance = focusSuccessRate;
    }
    
    // Generate dynamic improvement recommendation
    const getImprovementArea = () => {
      if (suboptimalDays === 0) return "Maintaining peak performance";
      
      const subOptimalData = allData.filter(d => 
        !((d.energy || 0) >= 7 && (d.confidence || 0) >= 5 && (!isPremium || (d.sleep || 0) >= 6))
      );
      
      if (subOptimalData.length === 0) return "Focus on consistency";
      
      const avgEnergySubOptimal = subOptimalData.reduce((sum, d) => sum + (d.energy || 0), 0) / subOptimalData.length;
      const avgSleepSubOptimal = isPremium ? subOptimalData.reduce((sum, d) => sum + (d.sleep || 0), 0) / subOptimalData.length : 0;
      const avgConfidenceSubOptimal = subOptimalData.reduce((sum, d) => sum + (d.confidence || 0), 0) / subOptimalData.length;
      
      // Educational recommendations based on retention principles
      if (avgEnergySubOptimal < 6) {
        if (currentStreak >= 60 && currentStreak <= 74) {
          return "Energy cultivation during spermatogenesis completion";
        }
        return "Focus on energy cultivation through exercise";
      }
      
      if (isPremium && avgSleepSubOptimal < 5) {
        return "Optimize sleep for retention benefits";
      }
      
      if (avgConfidenceSubOptimal < 4) {
        return "Build emotional resilience and confidence";
      }
      
      return "Multiple areas need optimization";
    };
    
    return {
      optimalDays: optimalDays.length,
      suboptimalDays,
      optimalPercentage,
      focusPerformance,
      improvementArea: getImprovementArea(),
      criteria: isPremium ? 'Energy 7+, Sleep 6+, Confidence 5+' : 'Energy 7+, Confidence 5+'
    };
  };

  // UPDATED: Generate predictive insights with educational context
  const generatePredictiveInsights = () => {
    const allData = userData.benefitTracking || [];
    if (allData.length < 5) return [];
    
    const insights = [];
    const last3Days = allData.slice(-3);
    const currentStreak = userData.currentStreak || 0;
    
    // Energy trend prediction with educational context
    if (last3Days.length >= 2) {
      const energyTrend = last3Days[last3Days.length - 1].energy - last3Days[0].energy;
      if (energyTrend > 0.5) {
        insights.push(`Based on your +${energyTrend.toFixed(1)} energy trend, tomorrow's energy is predicted at 7-8/10. Energy improvements during retention reflect successful transmutation of sexual energy into life force.`);
      } else if (energyTrend < -0.5) {
        insights.push(`Your energy declined ${Math.abs(energyTrend).toFixed(1)} points over 3 days. Energy fluctuations are normal as your body redirects sexual energy toward higher functions. Prioritize rest and hydration for energy restoration.`);
      }
    }
    
    // Spermatogenesis cycle predictions
    if (currentStreak >= 60 && currentStreak <= 67) {
      insights.push(`Day ${currentStreak}: Approaching spermatogenesis completion (67-74 days). Expect significant energy shifts as your body transitions from sperm production to nutrient reabsorption mode for cellular repair.`);
    } else if (currentStreak >= 74) {
      insights.push(`Day ${currentStreak}: Post-spermatogenesis phase active. Your body has completed the biological transition from reproduction to self-enhancement, explaining your sustained energy improvements.`);
    }
    
    // 7-day trend analysis with educational context
    if (allData.length >= 7) {
      const last7Days = allData.slice(-7);
      const energyTrend = last7Days.reduce((sum, d, i) => sum + (d.energy || 0) * (i + 1), 0) / 
                          last7Days.reduce((sum, d, i) => sum + (i + 1), 0);
      const overall7DayAvg = last7Days.reduce((sum, d) => sum + (d.energy || 0), 0) / 7;
      
      if (energyTrend > overall7DayAvg + 0.3) {
        insights.push("Your 7-day energy trend shows continued improvement. This progressive enhancement reflects your body's increasing efficiency at energy transmutation through retention practice");
      }
    }
    
    return insights;
  };

  // UPDATED: Generate performance amplification recommendations with educational context
  const generateAmplificationRecommendations = () => {
    const allData = userData.benefitTracking || [];
    if (allData.length < 5) return [];
    
    const recommendations = [];
    const currentAvgEnergy = parseFloat(calculateAverage());
    const currentStreak = userData.currentStreak || 0;
    
    // High energy period recommendations with educational context
    if (currentAvgEnergy >= 7) {
      recommendations.push(`Energy at ${currentAvgEnergy}/10 enables optimal physical training. Research shows 85% higher testosterone when exercising during peak energy windows. Consider increasing workout intensity by 20%.`);
      
      if (isPremium) {
        recommendations.push("Your peak performance window is active. Take on challenging mental tasks now—high energy states maximize cognitive function through enhanced brain blood flow.");
      }
      
      // Spermatogenesis optimization
      if (currentStreak >= 74) {
        recommendations.push("Post-spermatogenesis optimization phase: Your body is channeling reproductive resources into cellular repair and cognitive enhancement. This is the perfect time for skill development and creative projects.");
      }
    }
    
    // Low energy period recommendations with educational context
    const recentMood = allData.slice(-3).reduce((sum, d) => sum + (d.confidence || 0), 0) / 3;
    if (recentMood < 5) {
      recommendations.push("Low confidence period detected. Energy transmutation stress is common during retention—prioritize sleep optimization, morning sunlight exposure, and gentle movement to restore emotional balance.");
    }
    
    // Decision-making optimization with educational context
    if (isPremium && allData.length >= 7) {
      const highConfidenceDays = allData.filter(d => (d.confidence || 0) >= 7);
      if (highConfidenceDays.length > 0) {
        const avgEnergyHighConfidence = highConfidenceDays.reduce((sum, d) => sum + (d.energy || 0), 0) / highConfidenceDays.length;
        recommendations.push(`Your best decisions occur when confidence reaches 7 or higher (average energy ${avgEnergyHighConfidence.toFixed(1)}/10). Save important choices for these periods—retention enhances decision-making through improved prefrontal cortex function.`);
      }
    }
    
    return recommendations;
  };

  // NEW: Info banner logic
  const shouldShowInfoBanner = () => {
    const benefitData = getFilteredBenefitData();
    const hasMinimalData = benefitData.length < 7;
    const currentStreak = userData.currentStreak || 0;
    const isNewUser = currentStreak <= 3;
    
    return hasMinimalData || isNewUser;
  };

  // NEW: Calculate data quality for intelligence analysis
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
  const correlations = calculateCorrelations();
  const performanceZones = calculatePerformanceZones();
  const predictiveInsights = generatePredictiveInsights();
  const amplificationRecs = generateAmplificationRecommendations();
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
      
      {/* Benefit Intelligence Engine */}
      <div className="benefit-tracker-section">
        <h3>Benefit Intelligence Engine</h3>
        
        {shouldShowInfoBanner() && (
          <div className="stats-info-banner">
            <FaInfoCircle className="info-icon" />
            <span><strong>Building your intelligence profile...</strong> Your insights will become more detailed as you log daily benefits and track your progress over time.</span>
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
            
            {/* Intelligence Preview Grid - using existing insight card patterns */}
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
                    'Basic risk assessment available. Upgrade for detailed analysis with specific factors and mitigation strategies.'
                  }
                </div>
              </div>
              
              <div className="current-insight-card">
                <div className="current-insight-header">
                  <span>Performance Insights</span>
                </div>
                <div className="current-insight-text">
                  Advanced correlations, optimization zones, and predictive analytics available with Premium upgrade.
                </div>
              </div>
            </div>
            
            <div className="benefit-upgrade-cta">
              <div className="upgrade-helmet-section">
                <img 
                  src={helmetImage} 
                  alt="Premium Intelligence" 
                  className="upgrade-helmet-icon"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.nextSibling.style.display = 'block';
                  }}
                />
                <div className="upgrade-helmet-fallback" style={{display: 'none'}}>🧠</div>
              </div>
              
              <div className="upgrade-text-section">
                <h4>Unlock Full Intelligence Engine</h4>
                <p>Get advanced risk prediction, benefit correlations, performance optimization zones, and personalized amplification strategies.</p>
                
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
                  const hasData = chartData.labels.length > 0;
                  
                  if (!hasData) {
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
                      const filteredData = getFilteredBenefitData();
                      
                      if (avg === 'N/A') {
                        return `No ${selectedMetric} data for the selected ${timeRange} period. Start logging benefits to see your progress.`;
                      }
                      
                      const timeRangeText = timeRange === 'week' ? 'week' : timeRange === 'month' ? 'month' : '3 months';
                      const avgValue = parseFloat(avg);
                      
                      if (avgValue >= 7) {
                        return `Your ${selectedMetric} is excellent this ${timeRangeText} at ${avg}/10. Maintain current strategies.`;
                      } else {
                        return `Your ${selectedMetric} averaged ${avg}/10 this ${timeRangeText}. Check intelligence insights below for optimization.`;
                      }
                    })()}
                  </div>
                </div>
              </div>
            </div>
            
            {/* REDESIGNED: Intelligence Analysis Section - CLEANER, MORE PROFESSIONAL */}
            <div className="intelligence-analysis-section">
              <div className="intelligence-analysis-header">
                <h3>Intelligence Analysis</h3>
              </div>
              
              {/* Relapse Risk Predictor */}
              <div className="intelligence-analysis-card">
                <div className="intelligence-card-header">
                  <span>Relapse Risk Predictor</span>
                </div>
                <div className="intelligence-info-banner">
                  <FaInfoCircle className="info-icon" />
                  <span>Analyzes your recent benefit trends to predict vulnerability periods. Based on energy, confidence, and focus patterns from your last 3-14 days of tracking.</span>
                </div>
                <div className="intelligence-card-content">
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
                        {riskAnalysis.score === 'N/A' ? 'Data Requirements:' : 'Risk Factors:'}
                      </div>
                      {riskAnalysis.factors.map((factor, index) => (
                        <div key={index} className="risk-factor-item" dangerouslySetInnerHTML={renderTextWithBold(factor)}></div>
                      ))}
                      {riskAnalysis.level !== 'Low' && riskAnalysis.score !== 'N/A' && (
                        <div style={{ 
                          marginTop: '0.75rem', 
                          padding: '0.75rem', 
                          backgroundColor: 'rgba(255, 221, 0, 0.1)', 
                          borderRadius: 'var(--radius-md)', 
                          fontSize: '0.875rem' 
                        }}>
                          <strong>Educational Actions:</strong> Morning sunlight exposure optimizes circadian rhythm, cold showers activate nervous system resilience, and magnesium supplementation supports energy transmutation during vulnerable periods.
                        </div>
                      )}
                    </div>
                  </div>
                  {/* Data Quality Indicator */}
                  {dataQuality.level !== 'insufficient' && (
                    <div className="intelligence-data-status">
                      <div className="intelligence-data-status-indicator">
                        <span className={`intelligence-data-quality ${dataQuality.level}`}>
                          <FaChartLine />
                          {dataQuality.label}
                        </span>
                        <span className="intelligence-data-days">
                          Based on {dataQuality.days} days of tracking
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Benefit Correlations */}
              {correlations.length > 0 && (
                <div className="intelligence-analysis-card">
                  <div className="intelligence-card-header">
                    <span>Your Benefit Correlations</span>
                  </div>
                  <div className="intelligence-info-banner">
                    <FaInfoCircle className="info-icon" />
                    <span>Identifies patterns between your different benefit metrics. For example, how high energy days affect your focus levels.</span>
                  </div>
                  <div className="intelligence-card-content">
                    <div className="correlations-display">
                      {correlations.map((correlation, index) => (
                        <div key={index} className="correlation-item" dangerouslySetInnerHTML={renderTextWithBold(correlation)}></div>
                      ))}
                    </div>
                    {/* Data Quality Indicator */}
                    {dataQuality.level !== 'insufficient' && (
                      <div className="intelligence-data-status">
                        <div className="intelligence-data-status-indicator">
                          <span className={`intelligence-data-quality ${dataQuality.level}`}>
                            <FaChartLine />
                            {dataQuality.label}
                          </span>
                          <span className="intelligence-data-days">
                            Based on {dataQuality.days} days of tracking
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              {/* Performance Zones */}
              {performanceZones && (
                <div className="intelligence-analysis-card">
                  <div className="intelligence-card-header">
                    <span>Your Performance Zones</span>
                  </div>
                  <div className="intelligence-info-banner">
                    <FaInfoCircle className="info-icon" />
                    <span>Shows your peak performance rate based on Energy 7+, Sleep 6+, Confidence 5+ criteria. Calculated from days where you logged benefits.</span>
                  </div>
                  <div className="intelligence-card-content">
                    <div className="performance-zones-display">
                      <div className="performance-criteria">
                        <div className="performance-criteria-title">Your Peak Performance Zone:</div>
                        <div className="performance-criteria-text">{performanceZones.criteria}</div>
                      </div>
                      <div className="performance-metrics-simplified">
                        <div className="performance-metric-card">
                          <div className="performance-metric-value">{performanceZones.optimalPercentage}%</div>
                          <div className="performance-metric-label">Optimal Days</div>
                          <div className="performance-metric-context">({performanceZones.optimalDays} out of {performanceZones.optimalDays + performanceZones.suboptimalDays} days logged)</div>
                        </div>
                        {performanceZones.focusPerformance && (
                          <div className="performance-metric-card">
                            <div className="performance-metric-value">{performanceZones.focusPerformance}%</div>
                            <div className="performance-metric-label">Mind-Body Sync</div>
                            <div className="performance-metric-context">(Mental clarity follows physical optimization {performanceZones.focusPerformance}% of the time)</div>
                          </div>
                        )}
                        <div className="performance-metric-card">
                          <div className="performance-metric-value">{performanceZones.suboptimalDays}</div>
                          <div className="performance-metric-label">Below optimal days</div>
                          <div className="performance-metric-context">{performanceZones.improvementArea}</div>
                        </div>
                      </div>
                    </div>
                    {/* Data Quality Indicator */}
                    {dataQuality.level !== 'insufficient' && (
                      <div className="intelligence-data-status">
                        <div className="intelligence-data-status-indicator">
                          <span className={`intelligence-data-quality ${dataQuality.level}`}>
                            <FaChartLine />
                            {dataQuality.label}
                          </span>
                          <span className="intelligence-data-days">
                            Based on {dataQuality.days} days of tracking
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              {/* Predictive Insights */}
              {predictiveInsights.length > 0 && (
                <div className="intelligence-analysis-card">
                  <div className="intelligence-card-header">
                    <span>Predictive Insights</span>
                  </div>
                  <div className="intelligence-card-content">
                    <div className="predictive-insights-display">
                      {predictiveInsights.map((insight, index) => (
                        <div key={index} className="predictive-insight-item" dangerouslySetInnerHTML={renderTextWithBold(insight)}></div>
                      ))}
                    </div>
                    {/* Data Quality Indicator */}
                    {dataQuality.level !== 'insufficient' && (
                      <div className="intelligence-data-status">
                        <div className="intelligence-data-status-indicator">
                          <span className={`intelligence-data-quality ${dataQuality.level}`}>
                            <FaChartLine />
                            {dataQuality.label}
                          </span>
                          <span className="intelligence-data-days">
                            Based on {dataQuality.days} days of tracking
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              {/* Performance Amplification */}
              {amplificationRecs.length > 0 && (
                <div className="intelligence-analysis-card">
                  <div className="intelligence-card-header">
                    <span>Performance Amplification</span>
                  </div>
                  <div className="intelligence-card-content">
                    <div className="amplification-display">
                      {amplificationRecs.map((rec, index) => (
                        <div key={index} className="amplification-item" dangerouslySetInnerHTML={renderTextWithBold(rec)}></div>
                      ))}
                    </div>
                    {/* Data Quality Indicator */}
                    {dataQuality.level !== 'insufficient' && (
                      <div className="intelligence-data-status">
                        <div className="intelligence-data-status-indicator">
                          <span className={`intelligence-data-quality ${dataQuality.level}`}>
                            <FaChartLine />
                            {dataQuality.label}
                          </span>
                          <span className="intelligence-data-days">
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
                  <span>{selectedMetric === 'sleep' ? 'Sleep Quality' : selectedMetric.charAt(0).toUpperCase() + selectedMetric.slice(1)} Historical Comparison</span>
                </div>
                <div className="historical-comparison-grid">
                  <div className="historical-comparison-card">
                    <div className="historical-comparison-value">
                      {(() => {
                        const comparison = calculateHistoricalComparison();
                        return comparison.shortStreak === 'N/A' ? 'N/A' : `${comparison.shortStreak}/10`;
                      })()}
                    </div>
                    <div className="historical-comparison-label">Your {selectedMetric} during short streaks (1-7 days)</div>
                  </div>
                  
                  <div className="historical-comparison-card">
                    <div className="historical-comparison-value">
                      {(() => {
                        const comparison = calculateHistoricalComparison();
                        return comparison.current === 'N/A' ? 'N/A' : `${comparison.current}/10`;
                      })()}
                    </div>
                    <div className="historical-comparison-label">Your current {selectedMetric} average</div>
                  </div>
                  
                  <div className="historical-comparison-card">
                    <div className="historical-comparison-value">
                      {(() => {
                        const comparison = calculateHistoricalComparison();
                        return comparison.projected === 'N/A' ? 'N/A' : `${comparison.projected}/10`;
                      })()}
                    </div>
                    <div className="historical-comparison-label">
                      {(() => {
                        const currentStreak = userData.currentStreak || 0;
                        if (currentStreak >= 74) {
                          return `Post-spermatogenesis ${selectedMetric} (cellular optimization active)`;
                        }
                        return `Projected ${selectedMetric} with longer streaks (30+ days)`;
                      })()}
                    </div>
                  </div>
                </div>
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