// components/Stats/Stats.js - BENEFIT INTELLIGENCE ENGINE: Pure data-driven performance optimization
import React, { useState, useEffect, useRef } from 'react';
import { format, subDays } from 'date-fns';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler } from 'chart.js';
import { FaRegLightbulb, FaLock, FaMedal, FaTrophy, FaCheckCircle, FaRedo, FaInfoCircle, 
  FaExclamationTriangle, FaFrown, FaLaptop, FaHome, FaHeart, FaClock, FaBrain, FaEye, FaStar, FaShieldAlt, FaChartLine, FaBolt, FaBullseye } from 'react-icons/fa';
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

  // CORE: Badge checking logic - automatically unlocks badges when milestones are reached
  const checkAndUpdateBadges = (userData) => {
    if (!userData.badges || !Array.isArray(userData.badges)) {
      return userData;
    }

    const currentStreak = userData.currentStreak || 0;
    const longestStreak = userData.longestStreak || 0;
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

      const shouldBeEarned = currentStreak >= threshold.days || longestStreak >= threshold.days;
      
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
      .filter(item => new Date(item.date) >= cutoffDate)
      .sort((a, b) => new Date(a.date) - new Date(b.date));
  };
  
  // Generate chart data
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
      
      if (last7DaysData.length === 0) return '0.0';
      
      const sum = last7DaysData.reduce((acc, item) => {
        return acc + (item.energy || 0);
      }, 0);
      return (sum / last7DaysData.length).toFixed(1);
    }
    
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

  // NEW: Calculate relapse risk score (0-100%)
  const calculateRelapseRisk = () => {
    const filteredData = getFilteredBenefitData();
    if (filteredData.length < 3) return { score: 15, factors: ['Insufficient data'], level: 'Low' };
    
    const last3Days = filteredData.slice(-3);
    let riskScore = 0;
    const riskFactors = [];
    
    // Energy declining trend
    if (last3Days.length >= 2) {
      const energyTrend = last3Days[last3Days.length - 1].energy - last3Days[0].energy;
      if (energyTrend < -1) {
        riskScore += 25;
        riskFactors.push('Your energy declining for 3 days');
      }
    }
    
    // Low mood/confidence
    const avgMood = last3Days.reduce((sum, day) => sum + (day.confidence || 5), 0) / last3Days.length;
    if (avgMood < 4) {
      riskScore += 20;
      riskFactors.push('Your mood below 4/10');
    }
    
    // Poor sleep quality
    if (isPremium) {
      const avgSleep = last3Days.reduce((sum, day) => sum + (day.sleep || 5), 0) / last3Days.length;
      if (avgSleep < 5) {
        riskScore += 15;
        riskFactors.push('Your sleep quality poor');
      }
    }
    
    // Low focus/productivity
    if (isPremium) {
      const avgFocus = last3Days.reduce((sum, day) => sum + (day.focus || 5), 0) / last3Days.length;
      if (avgFocus < 4) {
        riskScore += 20;
        riskFactors.push('Your focus below 4/10');
      }
    }
    
    // Weekend risk factor
    const isWeekend = new Date().getDay() === 0 || new Date().getDay() === 6;
    if (isWeekend) {
      riskScore += 10;
      riskFactors.push('Weekend vulnerability period');
    }
    
    // Determine risk level
    let level = 'Low';
    if (riskScore >= 50) level = 'High';
    else if (riskScore >= 25) level = 'Medium';
    
    return {
      score: Math.min(riskScore, 100),
      factors: riskFactors.length > 0 ? riskFactors : ['All metrics stable'],
      level
    };
  };

  // NEW: Calculate benefit correlations
  const calculateCorrelations = () => {
    const allData = userData.benefitTracking || [];
    if (allData.length < 7) return [];
    
    const correlations = [];
    const metrics = ['energy', 'focus', 'confidence', 'aura', 'sleep', 'workout'];
    
    // Energy correlation analysis
    const energyData = allData.filter(d => d.energy >= 7);
    if (energyData.length > 0 && isPremium) {
      const avgFocusWhenEnergyHigh = energyData.reduce((sum, d) => sum + (d.focus || 0), 0) / energyData.length;
      const overallAvgFocus = allData.reduce((sum, d) => sum + (d.focus || 0), 0) / allData.length;
      const improvement = ((avgFocusWhenEnergyHigh - overallAvgFocus) / overallAvgFocus * 100).toFixed(0);
      
      if (improvement > 5) {
        correlations.push(`When your energy = 7+, your focus averages ${avgFocusWhenEnergyHigh.toFixed(1)} (+${improvement}% above baseline)`);
      }
    }
    
    // Sleep correlation
    if (isPremium && allData.length > 5) {
      const poorSleepDays = allData.filter(d => (d.sleep || 5) < 5);
      const nextDayMood = poorSleepDays.map(d => {
        const dayAfter = allData.find(next => {
          const dayAfterDate = new Date(d.date);
          dayAfterDate.setDate(dayAfterDate.getDate() + 1);
          return next.date === dayAfterDate.toISOString().split('T')[0];
        });
        return dayAfter ? (dayAfter.confidence || 5) : null;
      }).filter(mood => mood !== null);
      
      if (nextDayMood.length > 0) {
        const lowMoodChance = (nextDayMood.filter(mood => mood < 5).length / nextDayMood.length * 100).toFixed(0);
        if (lowMoodChance > 50) {
          correlations.push(`Poor sleep quality = ${lowMoodChance}% chance of low mood next day`);
        }
      }
    }
    
    return correlations;
  };

  // NEW: Calculate performance zones
  const calculatePerformanceZones = () => {
    const allData = userData.benefitTracking || [];
    if (allData.length < 7) return null;
    
    // Define optimal thresholds
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
    
    return {
      optimalDays: optimalDays.length,
      suboptimalDays,
      optimalPercentage,
      focusPerformance,
      criteria: isPremium ? 'Energy 7+, Sleep 6+, Mood 5+' : 'Energy 7+, Mood 5+'
    };
  };

  // NEW: Generate predictive insights
  const generatePredictiveInsights = () => {
    const allData = userData.benefitTracking || [];
    if (allData.length < 5) return [];
    
    const insights = [];
    const last3Days = allData.slice(-3);
    
    // Energy trend prediction
    if (last3Days.length >= 2) {
      const energyTrend = last3Days[last3Days.length - 1].energy - last3Days[0].energy;
      if (energyTrend > 0.5) {
        insights.push("Based on your current patterns, tomorrow's energy will likely be 7-8 (improving trend)");
      } else if (energyTrend < -0.5) {
        insights.push("Your energy trend suggests tomorrow may be challenging - prioritize rest tonight");
      }
    }
    
    // 7-day trend analysis
    if (allData.length >= 7) {
      const last7Days = allData.slice(-7);
      const energyTrend = last7Days.reduce((sum, d, i) => sum + (d.energy || 0) * (i + 1), 0) / 
                          last7Days.reduce((sum, d, i) => sum + (i + 1), 0);
      const overall7DayAvg = last7Days.reduce((sum, d) => sum + (d.energy || 0), 0) / 7;
      
      if (energyTrend > overall7DayAvg + 0.3) {
        insights.push("Your 7-day trend suggests energy will continue improving this week");
      }
    }
    
    return insights;
  };

  // NEW: Generate performance amplification recommendations
  const generateAmplificationRecommendations = () => {
    const allData = userData.benefitTracking || [];
    if (allData.length < 5) return [];
    
    const recommendations = [];
    const currentAvgEnergy = parseFloat(calculateAverage());
    
    // High energy day recommendations
    if (currentAvgEnergy >= 7) {
      recommendations.push("High energy detected: Perfect time to increase workout intensity +20%");
      if (isPremium) {
        recommendations.push("Your peak performance window: Take on challenging mental tasks now");
      }
    }
    
    // Low mood period recommendations
    const recentMood = allData.slice(-3).reduce((sum, d) => sum + (d.confidence || 0), 0) / 3;
    if (recentMood < 5) {
      recommendations.push("Low mood period detected: Prioritize sleep optimization and gentle exercise");
    }
    
    // Decision-making optimal times
    if (isPremium && allData.length >= 7) {
      const highConfidenceDays = allData.filter(d => (d.confidence || 0) >= 7);
      if (highConfidenceDays.length > 0) {
        recommendations.push("Your best decisions happen when confidence = 7+ - save important choices for these periods");
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

  const riskAnalysis = calculateRelapseRisk();
  const correlations = calculateCorrelations();
  const performanceZones = calculatePerformanceZones();
  const predictiveInsights = generatePredictiveInsights();
  const amplificationRecs = generateAmplificationRecommendations();
  
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
            
            <div className="intelligence-preview-grid">
              <div className="intelligence-preview-card">
                <div className="intelligence-preview-header">
                  <FaShieldAlt className="intelligence-icon" />
                  <span>Relapse Risk Analysis</span>
                </div>
                <div className="intelligence-preview-content">
                  <div className="risk-score-preview">{riskAnalysis.level} Risk</div>
                  <div className="intelligence-preview-text">
                    Basic risk assessment available. Upgrade for detailed analysis with specific factors and mitigation strategies.
                  </div>
                </div>
              </div>
              
              <div className="intelligence-preview-card">
                <div className="intelligence-preview-header">
                  <FaBolt className="intelligence-icon" />
                  <span>Performance Insights</span>
                </div>
                <div className="intelligence-preview-content">
                  <div className="intelligence-preview-text">
                    Advanced correlations, optimization zones, and predictive analytics available with Premium upgrade.
                  </div>
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
                  Upgrade to Premium Intelligence
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
                  <div className="current-metric-label">Your {selectedMetric === 'sleep' ? 'Sleep Quality' : selectedMetric.charAt(0).toUpperCase() + selectedMetric.slice(1)}</div>
                  <div className="current-metric-value">{calculateAverage()}/10</div>
                </div>
                
                <div className="current-insight-card">
                  <div className="current-insight-header">
                    <FaBullseye className="insight-icon" />
                    <span>Current Status</span>
                  </div>
                  <div className="current-insight-text">
                    Your {selectedMetric} is tracking at {calculateAverage()}/10. 
                    {parseFloat(calculateAverage()) >= 7 ? 
                      " Excellent performance - maintain current strategies." : 
                      " Room for optimization - check intelligence insights below."}
                  </div>
                </div>
              </div>
            </div>
            
            {/* Intelligence Analysis Section */}
            <div className="detailed-analysis-section">
              <div className="detailed-analysis-header">
                <h4>Intelligence Analysis</h4>
              </div>
              
              {/* Relapse Risk Predictor */}
              <div className="intelligence-section">
                <h5>
                  <FaShieldAlt className="section-icon" />
                  Relapse Risk Predictor
                </h5>
                <div className="risk-analysis-card">
                  <div className="risk-score-display">
                    <div className={`risk-score ${riskAnalysis.level.toLowerCase()}`}>
                      {riskAnalysis.score}%
                    </div>
                    <div className="risk-level">{riskAnalysis.level} Risk</div>
                  </div>
                  <div className="risk-factors">
                    <div className="risk-factors-label">Risk Factors:</div>
                    <ul className="risk-factors-list">
                      {riskAnalysis.factors.map((factor, index) => (
                        <li key={index}>{factor}</li>
                      ))}
                    </ul>
                  </div>
                  {riskAnalysis.level !== 'Low' && (
                    <div className="risk-mitigation">
                      <strong>Immediate Actions:</strong> Increase exercise, improve sleep schedule, limit social media, reach out to support network.
                    </div>
                  )}
                </div>
              </div>
              
              {/* Benefit Correlation Matrix */}
              {correlations.length > 0 && (
                <div className="intelligence-section">
                  <h5>
                    <FaChartLine className="section-icon" />
                    Your Benefit Correlations
                  </h5>
                  <div className="correlation-cards">
                    {correlations.map((correlation, index) => (
                      <div key={index} className="correlation-card">
                        <FaBolt className="correlation-icon" />
                        <div className="correlation-text">{correlation}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Performance Zones */}
              {performanceZones && (
                <div className="intelligence-section">
                  <h5>
                    <FaBullseye className="section-icon" />
                    Your Performance Zones
                  </h5>
                  <div className="performance-zones-card">
                    <div className="zone-definition">
                      <strong>Your Peak Performance Zone:</strong> {performanceZones.criteria}
                    </div>
                    <div className="zone-stats">
                      <div className="zone-stat">
                        <div className="zone-stat-value">{performanceZones.optimalPercentage}%</div>
                        <div className="zone-stat-label">Days in optimal zone</div>
                      </div>
                      {performanceZones.focusPerformance && (
                        <div className="zone-stat">
                          <div className="zone-stat-value">{performanceZones.focusPerformance}%</div>
                          <div className="zone-stat-label">High focus achievement rate in this zone</div>
                        </div>
                      )}
                    </div>
                    <div className="zone-breakdown">
                      <div className="zone-breakdown-item optimal">
                        <div className="zone-breakdown-count">{performanceZones.optimalDays}</div>
                        <div className="zone-breakdown-label">Optimal Days</div>
                      </div>
                      <div className="zone-breakdown-item suboptimal">
                        <div className="zone-breakdown-count">{performanceZones.suboptimalDays}</div>
                        <div className="zone-breakdown-label">Suboptimal Days</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Predictive Insights */}
              {predictiveInsights.length > 0 && (
                <div className="intelligence-section">
                  <h5>
                    <FaRegLightbulb className="section-icon" />
                    Predictive Insights
                  </h5>
                  <div className="predictive-cards">
                    {predictiveInsights.map((insight, index) => (
                      <div key={index} className="predictive-card">
                        <FaEye className="predictive-icon" />
                        <div className="predictive-text">{insight}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Performance Amplification */}
              {amplificationRecs.length > 0 && (
                <div className="intelligence-section">
                  <h5>
                    <FaBolt className="section-icon" />
                    Performance Amplification
                  </h5>
                  <div className="amplification-cards">
                    {amplificationRecs.map((rec, index) => (
                      <div key={index} className="amplification-card">
                        <FaTrophy className="amplification-icon" />
                        <div className="amplification-text">{rec}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Historical Comparison */}
              <div className="intelligence-section">
                <h5>
                  <FaChartLine className="section-icon" />
                  Historical Comparison
                </h5>
                <div className="comparison-grid">
                  <div className="comparison-card">
                    <div className="comparison-value">
                      {(() => {
                        const filteredData = getFilteredBenefitData();
                        if (filteredData.length === 0) return '5.0';
                        const shortTermData = filteredData.filter(item => {
                          const itemDate = new Date(item.date);
                          const sevenDaysAgo = subDays(new Date(), 7);
                          return itemDate >= sevenDaysAgo;
                        });
                        if (shortTermData.length === 0) return '5.0';
                        const avg = shortTermData.reduce((sum, item) => sum + (item[selectedMetric] || 5), 0) / shortTermData.length;
                        return avg.toFixed(1);
                      })()}/10
                    </div>
                    <div className="comparison-label">Your {selectedMetric} during short streaks (1-7 days)</div>
                  </div>
                  
                  <div className="comparison-card">
                    <div className="comparison-value">{calculateAverage()}/10</div>
                    <div className="comparison-label">Your current {selectedMetric} average</div>
                  </div>
                  
                  <div className="comparison-card">
                    <div className="comparison-value">
                      {(() => {
                        const baseValue = parseFloat(calculateAverage());
                        const longTermProjection = Math.min(10, baseValue + 2.0);
                        return longTermProjection.toFixed(1);
                      })()}/10
                    </div>
                    <div className="comparison-label">Projected {selectedMetric} with longer streaks (30+ days)</div>
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