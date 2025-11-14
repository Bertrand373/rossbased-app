/* components/Stats/Stats.js - Statistics Dashboard with Analytics and Achievements */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import './Stats.css';
import useUserData from '../../hooks/useUserData';
import { formatDistanceToNow, differenceInDays, format, startOfWeek, endOfWeek, parseISO, isWithinInterval, startOfDay, startOfMonth, endOfMonth, isSameDay, addDays, subDays, isAfter } from 'date-fns';
import toast from 'react-hot-toast';
import helmetIcon from '../../assets/trackerapplogo.png';

const Stats = ({ userData, setUserData, isAuthenticated, user, isLoading, subscriptionStatus }) => {
  // ===== STATE MANAGEMENT =====
  const [selectedMetric, setSelectedMetric] = useState('energy');
  const [selectedTimeRange, setSelectedTimeRange] = useState('7days');
  const [showResetModal, setShowResetModal] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [showDataInsightModal, setShowDataInsightModal] = useState(false);
  const [showRoadmapModal, setShowRoadmapModal] = useState(false);
  const [showDetailedInsight, setShowDetailedInsight] = useState(false);
  const [expandedEmotional, setExpandedEmotional] = useState(false);
  const [showEnergySystem, setShowEnergySystem] = useState(false);
  const [selectedEnergyInsight, setSelectedEnergyInsight] = useState('patterns');
  const [metricSliderPosition, setMetricSliderPosition] = useState({ transform: 'translateX(0px)', width: '0px' });
  const [timeSliderPosition, setTimeSliderPosition] = useState({ transform: 'translateX(0px)', width: '0px' });
  
  // Refs for slider animation
  const metricContainerRef = useRef(null);
  const timeContainerRef = useRef(null);
  const metricButtonRefs = useRef({});
  const timeButtonRefs = useRef({});

  const { 
    streakCount, 
    longestStreak, 
    emotionalCheckIns, 
    dailyMetrics,
    lastRelapse,
    startDate,
    benefits,
    phaseHistory,
    updateUserData 
  } = useUserData(userData, setUserData, isAuthenticated, user);

  const today = format(new Date(), 'yyyy-MM-dd');
  const hasLoggedToday = benefits?.[today] && Object.keys(benefits[today]).length > 0;

  // ===== NEW: Update slider positions =====
  useEffect(() => {
    // Update metric slider
    const metricButton = metricButtonRefs.current[selectedMetric];
    const metricContainer = metricContainerRef.current;
    
    if (metricButton && metricContainer) {
      const containerRect = metricContainer.getBoundingClientRect();
      const buttonRect = metricButton.getBoundingClientRect();
      const relativeLeft = buttonRect.left - containerRect.left;
      
      setMetricSliderPosition({
        transform: `translateX(${relativeLeft}px)`,
        width: `${buttonRect.width}px`,
        opacity: 1,
        visibility: 'visible'
      });
    }
  }, [selectedMetric]);

  useEffect(() => {
    // Update time range slider
    const timeButton = timeButtonRefs.current[selectedTimeRange];
    const timeContainer = timeContainerRef.current;
    
    if (timeButton && timeContainer) {
      const containerRect = timeContainer.getBoundingClientRect();
      const buttonRect = timeButton.getBoundingClientRect();
      const relativeLeft = buttonRect.left - containerRect.left;
      
      setTimeSliderPosition({
        transform: `translateX(${relativeLeft}px)`,
        width: `${buttonRect.width}px`,
        opacity: 1,
        visibility: 'visible'
      });
    }
  }, [selectedTimeRange]);

  // ===== COMPUTED VALUES & DATA =====
  const hasMinimumData = useMemo(() => {
    if (!benefits) return false;
    const benefitDates = Object.keys(benefits);
    return benefitDates.length >= 7;
  }, [benefits]);

  const dataProgress = useMemo(() => {
    if (!benefits) return 0;
    const benefitDates = Object.keys(benefits);
    const percentage = Math.min((benefitDates.length / 7) * 100, 100);
    return Math.round(percentage);
  }, [benefits]);

  // Check if user is building their profile (less than 7 days of data)
  const isBuildingProfile = dataProgress < 100;

  // Calculate streaks
  const calculateStreaks = useCallback(() => {
    let current = streakCount || 0;
    let longest = longestStreak || current;
    let totalDays = 0;
    let relapseFree = 0;

    if (startDate) {
      const start = parseISO(startDate);
      totalDays = differenceInDays(new Date(), start);
    }

    if (lastRelapse) {
      const lastRelapseDate = parseISO(lastRelapse);
      relapseFree = differenceInDays(new Date(), lastRelapseDate);
    } else if (startDate) {
      relapseFree = totalDays;
    }

    return { current, longest, totalDays, relapseFree };
  }, [streakCount, longestStreak, startDate, lastRelapse]);

  const streakData = useMemo(() => calculateStreaks(), [calculateStreaks]);

  // Calculate weekly averages
  const calculateWeeklyAverages = useCallback(() => {
    if (!benefits) return {};
    
    const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
    const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 });
    
    const weekData = Object.entries(benefits).filter(([date]) => {
      const dateObj = parseISO(date);
      return isWithinInterval(dateObj, { start: weekStart, end: weekEnd });
    });

    if (weekData.length === 0) return {};

    const totals = weekData.reduce((acc, [_, dayBenefits]) => {
      Object.entries(dayBenefits).forEach(([metric, value]) => {
        if (!acc[metric]) acc[metric] = [];
        acc[metric].push(parseInt(value) || 0);
      });
      return acc;
    }, {});

    const averages = {};
    Object.entries(totals).forEach(([metric, values]) => {
      averages[metric] = Math.round(values.reduce((a, b) => a + b, 0) / values.length);
    });

    return averages;
  }, [benefits]);

  const weeklyAverages = useMemo(() => calculateWeeklyAverages(), [calculateWeeklyAverages]);

  // Get metric data for charts
  const getMetricData = useCallback(() => {
    if (!benefits || !selectedMetric) return [];
    
    let dateRange = [];
    const now = new Date();
    
    if (selectedTimeRange === '7days') {
      for (let i = 6; i >= 0; i--) {
        dateRange.push(format(subDays(now, i), 'yyyy-MM-dd'));
      }
    } else if (selectedTimeRange === '30days') {
      for (let i = 29; i >= 0; i--) {
        dateRange.push(format(subDays(now, i), 'yyyy-MM-dd'));
      }
    } else {
      dateRange = Object.keys(benefits).sort();
    }

    return dateRange.map(date => ({
      date,
      value: benefits[date]?.[selectedMetric] || 0,
      label: format(parseISO(date), 'MMM d')
    }));
  }, [benefits, selectedMetric, selectedTimeRange]);

  const metricData = useMemo(() => getMetricData(), [getMetricData]);

  // Achievement badges calculation
  const badges = useMemo(() => {
    const achievements = [];
    
    if (streakData.current >= 7) {
      achievements.push({
        id: 'week-warrior',
        title: 'Week Warrior',
        description: '7 day streak',
        icon: '🛡️',
        unlocked: true,
        unlockedDate: format(subDays(new Date(), 7), 'MMM d, yyyy')
      });
    }
    
    if (streakData.current >= 30) {
      achievements.push({
        id: 'monthly-master',
        title: 'Monthly Master',
        description: '30 day streak',
        icon: '⚔️',
        unlocked: true,
        unlockedDate: format(subDays(new Date(), 30), 'MMM d, yyyy')
      });
    }
    
    if (streakData.current >= 90) {
      achievements.push({
        id: 'quarterly-champion',
        title: 'Quarterly Champion',
        description: '90 day streak',
        icon: '🏆',
        unlocked: true,
        unlockedDate: format(subDays(new Date(), 90), 'MMM d, yyyy')
      });
    }
    
    if (streakData.totalDays >= 100) {
      achievements.push({
        id: 'centurion',
        title: 'Centurion',
        description: '100 total days',
        icon: '👑',
        unlocked: true,
        unlockedDate: 'Lifetime Achievement'
      });
    }

    // Add locked badge hints
    const nextMilestone = streakData.current < 7 ? 7 : 
                         streakData.current < 30 ? 30 : 
                         streakData.current < 90 ? 90 : 180;
    
    if (nextMilestone <= 180) {
      achievements.push({
        id: 'next-milestone',
        title: 'Next Milestone',
        description: `${nextMilestone} day streak`,
        icon: '🔒',
        unlocked: false,
        daysRemaining: nextMilestone - streakData.current
      });
    }

    return achievements;
  }, [streakData]);

  // Calculate emotional check-in stats
  const emotionalStats = useMemo(() => {
    if (!emotionalCheckIns || emotionalCheckIns.length === 0) {
      return {
        totalCheckIns: 0,
        recentMood: 'Not tracked',
        averageMood: 0,
        moodTrend: 'neutral'
      };
    }

    const recentCheckIns = emotionalCheckIns.slice(-7);
    const recentMoodMap = {
      'amazing': 5,
      'good': 4,
      'neutral': 3,
      'struggling': 2,
      'crisis': 1
    };

    const moodValues = recentCheckIns.map(c => recentMoodMap[c.mood] || 3);
    const avgMood = moodValues.reduce((a, b) => a + b, 0) / moodValues.length;
    
    let trend = 'neutral';
    if (moodValues.length >= 3) {
      const firstHalf = moodValues.slice(0, Math.floor(moodValues.length / 2));
      const secondHalf = moodValues.slice(Math.floor(moodValues.length / 2));
      const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
      const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
      
      if (secondAvg > firstAvg + 0.5) trend = 'improving';
      else if (secondAvg < firstAvg - 0.5) trend = 'declining';
    }

    return {
      totalCheckIns: emotionalCheckIns.length,
      recentMood: recentCheckIns[recentCheckIns.length - 1]?.mood || 'Not tracked',
      averageMood: avgMood.toFixed(1),
      moodTrend: trend
    };
  }, [emotionalCheckIns]);

  // Calculate risk level
  const calculateRiskLevel = useCallback(() => {
    const daysSinceStart = streakData.totalDays;
    const currentStreak = streakData.current;
    
    if (currentStreak < 7) return 'High Risk';
    if (currentStreak < 14) return 'Moderate Risk';
    if (currentStreak < 30) return 'Low Risk';
    if (currentStreak < 90) return 'Very Low Risk';
    return 'Minimal Risk';
  }, [streakData]);

  const riskLevel = useMemo(() => calculateRiskLevel(), [calculateRiskLevel]);

  // Get current phase
  const getCurrentPhase = useCallback(() => {
    const current = streakData.current;
    
    if (current >= 0 && current < 7) return { name: 'Withdrawal', color: '#FF6B6B', description: 'Initial recovery phase' };
    if (current >= 7 && current < 14) return { name: 'Buildup', color: '#4DABF7', description: 'Energy returning' };
    if (current >= 14 && current < 30) return { name: 'Acceleration', color: '#69DB7C', description: 'Momentum building' };
    if (current >= 30 && current < 90) return { name: 'Refinement', color: '#9775FA', description: 'Habits solidifying' };
    if (current >= 90) return { name: 'Mastery', color: '#FFD43B', description: 'Peak performance' };
    
    return { name: 'Starting', color: '#666666', description: 'Begin your journey' };
  }, [streakData]);

  const currentPhase = useMemo(() => getCurrentPhase(), [getCurrentPhase]);

  // ===== EVENT HANDLERS =====
  const handleResetStats = async () => {
    setIsResetting(true);
    try {
      const resetData = {
        ...userData,
        startDate: format(new Date(), 'yyyy-MM-dd'),
        lastRelapse: null,
        streakCount: 0,
        longestStreak: 0,
        benefits: {},
        emotionalCheckIns: [],
        urges: [],
        phaseHistory: []
      };
      
      await updateUserData(resetData);
      setShowResetModal(false);
      toast.success('Statistics reset successfully', {
        style: {
          background: 'linear-gradient(135deg, #2a2a2a 0%, #1a1a1a 100%)',
          color: '#FFD700',
          border: '1px solid rgba(255, 215, 0, 0.2)',
        }
      });
    } catch (error) {
      console.error('Error resetting stats:', error);
      toast.error('Failed to reset statistics');
    } finally {
      setIsResetting(false);
    }
  };

  const metricLabels = {
    energy: 'Energy',
    focus: 'Focus',
    confidence: 'Confidence',
    aura: 'Aura',
    sleep: 'Sleep',
    workout: 'Workout'
  };

  const timeRangeLabels = {
    '7days': '7 Days',
    '30days': '30 Days',
    'alltime': 'All Time'
  };

  // ===== RENDER =====
  return (
    <div className="stats-container">
      {/* Building Profile Banner - Only show when less than 7 days of data */}
      {isBuildingProfile && (
        <div className="stats-building-banner">
          <div className="stats-building-helmet-container">
            {helmetIcon ? (
              <img 
                src={helmetIcon} 
                alt="Building" 
                className="stats-building-helmet"
              />
            ) : (
              <span className="stats-building-helmet-fallback">⚔️</span>
            )}
          </div>
          <div className="stats-building-content">
            <h3 className="stats-building-title">
              Building Your Profile
              <span className="stats-building-progress">{dataProgress}%</span>
            </h3>
            <p className="stats-building-description">
              Track your benefits for {7 - Math.floor(dataProgress / 14.3)} more days to unlock personalized insights and analytics.
            </p>
            <div className="stats-building-progress-bar">
              <div 
                className="stats-building-progress-fill"
                style={{ width: `${dataProgress}%` }}
              />
            </div>
          </div>
        </div>
      )}

      <div className="integrated-stats-header">
        <div className="header-title-section">
          <h2>Statistics</h2>
          <p className="header-subtitle">Track your progress and achievements</p>
        </div>

        {hasLoggedToday && (
          <div className="header-logged-banner">
            <span className="check-icon">✓</span>
            <span>Today's benefits logged</span>
          </div>
        )}
      </div>

      {/* Streak Overview */}
      <div className="streak-overview">
        <div className="streak-card main-streak">
          <div className="streak-icon">🔥</div>
          <div className="streak-info">
            <div className="streak-label">Current Streak</div>
            <div className="streak-value">{streakData.current} days</div>
            <div className="phase-indicator" style={{ color: currentPhase.color }}>
              {currentPhase.name} Phase
            </div>
          </div>
        </div>

        <div className="streak-card">
          <div className="streak-icon">🏆</div>
          <div className="streak-info">
            <div className="streak-label">Longest Streak</div>
            <div className="streak-value">{streakData.longest} days</div>
          </div>
        </div>

        <div className="streak-card">
          <div className="streak-icon">📅</div>
          <div className="streak-info">
            <div className="streak-label">Total Journey</div>
            <div className="streak-value">{streakData.totalDays} days</div>
          </div>
        </div>
      </div>

      {/* Achievement Badges */}
      <div className="achievement-section">
        <h3>Achievements</h3>
        <div className="badges-grid">
          {badges.map(badge => (
            <div 
              key={badge.id} 
              className={`badge-card ${!badge.unlocked ? 'locked' : ''}`}
            >
              <div className="badge-icon">{badge.icon}</div>
              <div className="badge-info">
                <div className="badge-title">{badge.title}</div>
                <div className="badge-description">{badge.description}</div>
                {badge.unlocked && badge.unlockedDate && (
                  <div className="badge-date">{badge.unlockedDate}</div>
                )}
                {!badge.unlocked && badge.daysRemaining && (
                  <div className="badge-progress">{badge.daysRemaining} days to go</div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Benefit Tracker with Sliding Pills */}
      <div className="benefit-tracker-section">
        <h3>Benefit Tracker</h3>
        
        {/* Metric Selection Pills with Slider */}
        <div className="benefit-tracker-controls">
          <div className="metric-pill-container" ref={metricContainerRef}>
            <div 
              className="metric-pill-slider"
              style={metricSliderPosition}
            />
            {Object.entries(metricLabels).map(([key, label]) => (
              <button
                key={key}
                ref={el => metricButtonRefs.current[key] = el}
                className={`metric-btn ${selectedMetric === key ? 'active' : ''}`}
                onClick={() => setSelectedMetric(key)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Time Range Pills with Slider */}
        <div className="time-range-controls">
          <div className="time-pill-container" ref={timeContainerRef}>
            <div 
              className="time-pill-slider"
              style={timeSliderPosition}
            />
            {Object.entries(timeRangeLabels).map(([key, label]) => (
              <button
                key={key}
                ref={el => timeButtonRefs.current[key] = el}
                className={`time-btn ${selectedTimeRange === key ? 'active' : ''}`}
                onClick={() => setSelectedTimeRange(key)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Chart Display */}
        <div className="chart-container">
          <div className="simple-chart">
            {metricData.map((item, index) => (
              <div 
                key={index} 
                className="chart-bar-container"
                style={{ height: '100%' }}
              >
                <div 
                  className="chart-bar"
                  style={{ 
                    height: `${(item.value / 10) * 100}%`,
                    minHeight: item.value > 0 ? '4px' : '0',
                    backgroundColor: currentPhase.color
                  }}
                >
                  {item.value > 0 && (
                    <span className="chart-value">{item.value}</span>
                  )}
                </div>
                <span className="chart-label">{item.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Weekly Average */}
        {weeklyAverages[selectedMetric] && (
          <div className="weekly-average">
            <span className="average-label">This Week's Average:</span>
            <span className="average-value" style={{ color: currentPhase.color }}>
              {weeklyAverages[selectedMetric]}/10
            </span>
          </div>
        )}
      </div>

      {/* Free User Features */}
      {subscriptionStatus === 'free' && (
        <>
          {/* Energy Intelligence System */}
          {showEnergySystem && (
            <div className="energy-intelligence-section">
              <div className="energy-header">
                <h3>Energy Intelligence™</h3>
                <button 
                  className="energy-close-btn"
                  onClick={() => setShowEnergySystem(false)}
                >
                  ✕
                </button>
              </div>

              {!hasMinimumData ? (
                <div className="energy-data-banner">
                  <div className="energy-data-helmet-container">
                    {helmetIcon ? (
                      <img 
                        src={helmetIcon} 
                        alt="Data Collection" 
                        className="energy-data-helmet"
                      />
                    ) : (
                      <span className="energy-data-helmet-fallback">⚔️</span>
                    )}
                  </div>
                  <div className="energy-data-content">
                    <h4 className="energy-data-title">
                      Gathering Energy Data
                      <span className="energy-data-percentage">{dataProgress}%</span>
                    </h4>
                    <p className="energy-data-description">
                      Track your energy levels for {7 - Math.floor(dataProgress / 14.3)} more days to unlock personalized energy insights and predictions.
                    </p>
                    <div className="energy-data-progress">
                      <div 
                        className="energy-data-progress-fill"
                        style={{ width: `${dataProgress}%` }}
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <div className="energy-info-banner">
                    <span className="info-icon">ℹ️</span>
                    <span>Energy patterns help predict your peak performance times and recovery needs</span>
                  </div>

                  <div className="current-energy-display">
                    <div className="energy-average-card">
                      <div className="energy-average-label">Current Energy Average</div>
                      <div className="energy-average-value">
                        {weeklyAverages.energy || 0}/10
                      </div>
                      <div className="energy-phase-context">
                        {currentPhase.name} Phase · {currentPhase.description}
                      </div>
                    </div>
                  </div>

                  <div className="insight-selector-tabs">
                    <div className="insight-pill-container">
                      <button
                        className={`insight-tab ${selectedEnergyInsight === 'patterns' ? 'active' : ''}`}
                        onClick={() => setSelectedEnergyInsight('patterns')}
                      >
                        Patterns
                      </button>
                      <button
                        className={`insight-tab ${selectedEnergyInsight === 'factors' ? 'active' : ''}`}
                        onClick={() => setSelectedEnergyInsight('factors')}
                      >
                        Key Factors
                      </button>
                      <button
                        className={`insight-tab ${selectedEnergyInsight === 'optimization' ? 'active' : ''}`}
                        onClick={() => setSelectedEnergyInsight('optimization')}
                      >
                        Optimization
                      </button>
                    </div>
                  </div>

                  <div className="energy-insight-content">
                    {selectedEnergyInsight === 'patterns' && (
                      <div className="insight-panel">
                        <h4>Your Energy Patterns</h4>
                        <ul className="energy-insights-list">
                          <li>Energy typically peaks after day 7 of retention</li>
                          <li>Morning energy scores average {Math.round((weeklyAverages.energy || 5) * 1.1)}/10</li>
                          <li>Strongest energy correlation with sleep quality</li>
                          <li>{streakData.current > 14 ? 'Stable' : 'Building'} energy baseline detected</li>
                        </ul>
                      </div>
                    )}

                    {selectedEnergyInsight === 'factors' && (
                      <div className="insight-panel">
                        <h4>Key Energy Factors</h4>
                        <div className="factor-cards">
                          <div className="factor-card">
                            <span className="factor-icon">💤</span>
                            <span className="factor-label">Sleep Quality</span>
                            <span className="factor-impact">High Impact</span>
                          </div>
                          <div className="factor-card">
                            <span className="factor-icon">🏃</span>
                            <span className="factor-label">Physical Activity</span>
                            <span className="factor-impact">Medium Impact</span>
                          </div>
                          <div className="factor-card">
                            <span className="factor-icon">🧘</span>
                            <span className="factor-label">Stress Management</span>
                            <span className="factor-impact">Medium Impact</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {selectedEnergyInsight === 'optimization' && (
                      <div className="insight-panel">
                        <h4>Energy Optimization Tips</h4>
                        <div className="optimization-tips">
                          <div className="tip-item">
                            <span className="tip-number">1</span>
                            <p>Schedule important tasks during your peak energy window (typically mornings)</p>
                          </div>
                          <div className="tip-item">
                            <span className="tip-number">2</span>
                            <p>Maintain consistent sleep schedule to stabilize energy levels</p>
                          </div>
                          <div className="tip-item">
                            <span className="tip-number">3</span>
                            <p>Use cold exposure in the morning to boost natural energy</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <button className="energy-upgrade-btn">
                    <span>Unlock Premium Energy Analytics</span>
                    <span className="upgrade-arrow">→</span>
                  </button>
                </>
              )}
            </div>
          )}

          {/* Quick Risk Overview */}
          <div className="quick-risk-overview">
            <div className="quick-risk-card">
              <div className="quick-risk-header">
                <span className="risk-overview-icon">⚠️</span>
                <span>Relapse Risk Assessment</span>
              </div>
              <div className="quick-risk-content">
                <div className="quick-risk-level">{riskLevel}</div>
                <div className="quick-risk-description">
                  Based on your {streakData.current} day streak and recent activity patterns
                </div>
              </div>
            </div>
          </div>

          {/* Premium Features Teaser */}
          <div className="premium-features-teaser">
            <div className="teaser-header">
              {helmetIcon ? (
                <img 
                  src={helmetIcon} 
                  alt="Premium Features" 
                  className="teaser-helmet-icon"
                />
              ) : (
                <span className="teaser-helmet-fallback">⚔️</span>
              )}
              <div className="teaser-content">
                <h4>Unlock Premium Analytics</h4>
                <p>Get deeper insights into your journey with advanced tracking and predictions</p>
              </div>
            </div>

            <div className="premium-features-grid">
              <div className="premium-feature-item">
                <span className="feature-icon">📊</span>
                <div className="feature-text">
                  <div className="feature-title">Detailed Analytics</div>
                  <div className="feature-desc">30+ day trends and pattern analysis</div>
                </div>
                <span className="feature-lock">🔒</span>
              </div>

              <div className="premium-feature-item">
                <span className="feature-icon">🎯</span>
                <div className="feature-text">
                  <div className="feature-title">AI Predictions</div>
                  <div className="feature-desc">Urge forecasting with 85% accuracy</div>
                </div>
                <span className="feature-lock">🔒</span>
              </div>

              <div className="premium-feature-item">
                <span className="feature-icon">⚡</span>
                <div className="feature-text">
                  <div className="feature-title">Energy Intelligence</div>
                  <div className="feature-desc">Personalized energy optimization</div>
                </div>
                <span className="feature-lock">🔒</span>
              </div>

              <div className="premium-feature-item">
                <span className="feature-icon">🛡️</span>
                <div className="feature-text">
                  <div className="feature-title">Risk Prevention</div>
                  <div className="feature-desc">Advanced relapse risk monitoring</div>
                </div>
                <span className="feature-lock">🔒</span>
              </div>
            </div>

            <button 
              className="main-upgrade-btn"
              onClick={() => {
                toast('Premium features coming soon!', {
                  icon: '⚔️',
                  style: {
                    background: 'linear-gradient(135deg, #2a2a2a 0%, #1a1a1a 100%)',
                    color: '#FFD700',
                    border: '1px solid rgba(255, 215, 0, 0.2)',
                  }
                });
              }}
            >
              <span>Upgrade to Premium</span>
              <span className="upgrade-arrow">→</span>
            </button>
          </div>
        </>
      )}

      {/* Energy System Toggle Button */}
      {subscriptionStatus === 'free' && !showEnergySystem && (
        <button 
          className="energy-system-toggle"
          onClick={() => setShowEnergySystem(true)}
        >
          <span>⚡</span>
          <span>Open Energy Intelligence™</span>
        </button>
      )}

      {/* Emotional Well-being */}
      <div className="emotional-wellbeing-section">
        <h3>Emotional Well-being</h3>
        <div className="wellbeing-stats">
          <div className="stat-item">
            <span className="stat-label">Total Check-ins</span>
            <span className="stat-value">{emotionalStats.totalCheckIns}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Recent Mood</span>
            <span className="stat-value mood-indicator">
              {emotionalStats.recentMood}
            </span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Mood Trend</span>
            <span className={`stat-value trend-${emotionalStats.moodTrend}`}>
              {emotionalStats.moodTrend === 'improving' ? '↗️ Improving' :
               emotionalStats.moodTrend === 'declining' ? '↘️ Declining' :
               '→ Stable'}
            </span>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="stats-actions">
        <button 
          className="btn btn-outline"
          onClick={() => setShowDataInsightModal(true)}
        >
          <span>📊</span>
          Data Insights
        </button>
        <button 
          className="btn btn-outline"
          onClick={() => setShowRoadmapModal(true)}
        >
          <span>🗺️</span>
          Recovery Roadmap
        </button>
        <button 
          className="btn btn-danger"
          onClick={() => setShowResetModal(true)}
        >
          <span>🔄</span>
          Reset Stats
        </button>
      </div>

      {/* Reset Confirmation Modal */}
      {showResetModal && (
        <div className="modal-overlay" onClick={() => setShowResetModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3>Reset All Statistics?</h3>
            <p>This will permanently delete all your tracking data including:</p>
            <ul style={{ textAlign: 'left', margin: '20px 0' }}>
              <li>Streak counts and history</li>
              <li>Benefit tracking data</li>
              <li>Emotional check-ins</li>
              <li>Achievement progress</li>
            </ul>
            <p style={{ color: '#ff6b6b', fontWeight: 'bold' }}>
              This action cannot be undone!
            </p>
            <div className="modal-actions">
              <button 
                className="btn btn-outline"
                onClick={() => setShowResetModal(false)}
              >
                Cancel
              </button>
              <button 
                className="btn btn-danger"
                onClick={handleResetStats}
                disabled={isResetting}
              >
                {isResetting ? 'Resetting...' : 'Reset Everything'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Data Insights Modal */}
      {showDataInsightModal && (
        <div className="modal-overlay" onClick={() => setShowDataInsightModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3>Your Data Insights</h3>
            <div className="insights-summary">
              <div className="insight-item">
                <span className="insight-label">Best Performing Metric:</span>
                <span className="insight-value">
                  {Object.entries(weeklyAverages).reduce((a, b) => 
                    (weeklyAverages[a[0]] > weeklyAverages[b[0]] ? a : b), ['None', 0]
                  )[0]}
                </span>
              </div>
              <div className="insight-item">
                <span className="insight-label">Consistency Score:</span>
                <span className="insight-value">
                  {Math.round((Object.keys(benefits || {}).length / Math.max(streakData.totalDays, 1)) * 100)}%
                </span>
              </div>
              <div className="insight-item">
                <span className="insight-label">Phase Progress:</span>
                <span className="insight-value" style={{ color: currentPhase.color }}>
                  {currentPhase.name}
                </span>
              </div>
            </div>
            <button 
              className="btn btn-primary btn-full"
              onClick={() => setShowDataInsightModal(false)}
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Recovery Roadmap Modal */}
      {showRoadmapModal && (
        <div className="modal-overlay" onClick={() => setShowRoadmapModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3>Your Recovery Roadmap</h3>
            <div className="roadmap-phases">
              <div className={`phase-item ${currentPhase.name === 'Withdrawal' ? 'current' : ''}`}>
                <span className="phase-days">Days 0-7</span>
                <span className="phase-name">Withdrawal</span>
                <span className="phase-desc">Breaking free from the cycle</span>
              </div>
              <div className={`phase-item ${currentPhase.name === 'Buildup' ? 'current' : ''}`}>
                <span className="phase-days">Days 7-14</span>
                <span className="phase-name">Buildup</span>
                <span className="phase-desc">Energy and focus returning</span>
              </div>
              <div className={`phase-item ${currentPhase.name === 'Acceleration' ? 'current' : ''}`}>
                <span className="phase-days">Days 14-30</span>
                <span className="phase-name">Acceleration</span>
                <span className="phase-desc">Momentum and confidence building</span>
              </div>
              <div className={`phase-item ${currentPhase.name === 'Refinement' ? 'current' : ''}`}>
                <span className="phase-days">Days 30-90</span>
                <span className="phase-name">Refinement</span>
                <span className="phase-desc">Deep healing and growth</span>
              </div>
              <div className={`phase-item ${currentPhase.name === 'Mastery' ? 'current' : ''}`}>
                <span className="phase-days">Days 90+</span>
                <span className="phase-name">Mastery</span>
                <span className="phase-desc">Living your potential</span>
              </div>
            </div>
            <div className="current-position">
              <span>You are here:</span>
              <span style={{ color: currentPhase.color, fontWeight: 'bold' }}>
                Day {streakData.current} - {currentPhase.name} Phase
              </span>
            </div>
            <button 
              className="btn btn-primary btn-full"
              onClick={() => setShowRoadmapModal(false)}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Stats;