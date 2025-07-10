// components/Stats/Stats.js - REDESIGNED: Professional Intelligence Analysis Section
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

// FIXED: Helper function to convert markdown-style bold text to HTML
const formatTextWithBold = (text) => {
  if (!text || typeof text !== 'string') return text;
  
  // Replace **text** with <strong>text</strong>
  return text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
};

// FIXED: Component to render formatted text with bold
const FormattedText = ({ children }) => {
  if (!children || typeof children !== 'string') {
    return <span>{children}</span>;
  }
  
  const formattedText = formatTextWithBold(children);
  return <span dangerouslySetInnerHTML={{ __html: formattedText }} />;
};

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
        break;
      case 'allStats':
        resetUserData = {
          ...userData,
          currentStreak: 0,
          longestStreak: 0,
          startDate: today,
          streakHistory: [{
            id: 1,
            start: today,
            end: null,
            days: 0,
            reason: 'manual_reset'
          }],
          badges: userData.badges ? userData.badges.map(badge => ({
            ...badge,
            earned: false,
            date: null
          })) : []
        };
        break;
      case 'complete':
        resetUserData = {
          ...userData,
          currentStreak: 0,
          longestStreak: 0,
          startDate: today,
          streakHistory: [{
            id: 1,
            start: today,
            end: null,
            days: 0,
            reason: 'manual_reset'
          }],
          badges: userData.badges ? userData.badges.map(badge => ({
            ...badge,
            earned: false,
            date: null
          })) : [],
          benefitTracking: [],
          emotionalTracking: [],
          urgeEvents: [],
          notes: {}
        };
        break;
      default:
        console.error('Invalid reset level');
        return;
    }

    updateUserData(resetUserData);
    setShowSmartResetDialog(false);
    
    const messages = {
      currentStreak: 'Current streak reset successfully',
      allStats: 'All stats and badges reset successfully',
      complete: 'Complete data reset successfully'
    };
    
    toast.success(messages[resetLevel], {
      duration: 3000,
      style: {
        background: 'var(--card-background)',
        color: 'var(--text-primary)',
        border: '1px solid var(--border)'
      }
    });
  };

  // Generate chart data for selected metric
  const generateChartData = () => {
    if (!userData.benefitTracking || !Array.isArray(userData.benefitTracking)) {
      return {
        labels: [],
        datasets: []
      };
    }

    const days = timeRangeOptions[timeRange];
    const endDate = new Date();
    const startDate = subDays(endDate, days - 1);
    
    // Generate date labels
    const dateLabels = [];
    for (let i = 0; i < days; i++) {
      const date = subDays(endDate, days - 1 - i);
      dateLabels.push(format(date, 'MMM d'));
    }

    // Get data for selected metric
    const metricData = dateLabels.map(label => {
      const date = new Date(label + ', ' + new Date().getFullYear());
      const dayData = userData.benefitTracking.find(entry => 
        format(new Date(entry.date), 'MMM d') === label
      );
      return dayData ? dayData[selectedMetric] || 0 : 0;
    });

    return {
      labels: dateLabels,
      datasets: [
        {
          label: selectedMetric.charAt(0).toUpperCase() + selectedMetric.slice(1),
          data: metricData,
          borderColor: 'var(--primary)',
          backgroundColor: 'rgba(255, 221, 0, 0.1)',
          fill: true,
          tension: 0.4,
          pointBackgroundColor: 'var(--primary)',
          pointBorderColor: 'var(--primary)',
          pointRadius: 4,
          pointHoverRadius: 6,
        }
      ]
    };
  };

  // Chart options
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        backgroundColor: 'var(--card-background)',
        titleColor: 'var(--text)',
        bodyColor: 'var(--text)',
        borderColor: 'var(--border)',
        borderWidth: 1,
        cornerRadius: 8
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 10,
        ticks: {
          color: 'var(--text-secondary)',
          stepSize: 2
        },
        grid: {
          color: 'rgba(255, 255, 255, 0.1)'
        }
      },
      x: {
        ticks: {
          color: 'var(--text-secondary)',
          maxRotation: 45
        },
        grid: {
          color: 'rgba(255, 255, 255, 0.1)'
        }
      }
    }
  };

  // Generate current insight based on recent data
  const generateCurrentInsight = () => {
    if (!userData.benefitTracking || userData.benefitTracking.length === 0) {
      return {
        text: "Start tracking your benefits to unlock personalized insights about your recovery journey.",
        icon: FaInfoCircle
      };
    }

    const recentData = userData.benefitTracking.slice(-7);
    const avgValue = recentData.reduce((sum, entry) => sum + (entry[selectedMetric] || 0), 0) / recentData.length;
    
    if (avgValue >= 8) {
      return {
        text: `Your ${selectedMetric} levels are excellent! You're experiencing significant improvements in this area.`,
        icon: FaStar
      };
    } else if (avgValue >= 6) {
      return {
        text: `Your ${selectedMetric} is showing good progress. Keep up the consistent effort!`,
        icon: FaChartLine
      };
    } else if (avgValue >= 4) {
      return {
        text: `Your ${selectedMetric} is gradually improving. Focus on maintaining your current habits.`,
        icon: FaRegLightbulb
      };
    } else {
      return {
        text: `Your ${selectedMetric} has room for improvement. Consider adjusting your daily routine.`,
        icon: FaExclamationTriangle
      };
    }
  };

  // Calculate current metric average
  const calculateCurrentAverage = () => {
    if (!userData.benefitTracking || userData.benefitTracking.length === 0) {
      return 0;
    }

    const recentData = userData.benefitTracking.slice(-7);
    const avgValue = recentData.reduce((sum, entry) => sum + (entry[selectedMetric] || 0), 0) / recentData.length;
    return avgValue.toFixed(1);
  };

  // Generate intelligence insights
  const generateIntelligenceInsights = () => {
    const insights = {
      riskPredictor: {
        level: 'insufficient',
        score: 'N/A',
        factors: ['Insufficient data for risk assessment']
      },
      benefitCorrelations: [
        'Need more data to identify benefit correlations'
      ],
      performanceZones: {
        criteria: 'Requires 14+ days of consistent tracking',
        metrics: []
      },
      predictiveInsights: [
        'Predictive analysis will be available after 30+ days of tracking'
      ],
      amplificationRecommendations: [
        'Complete your daily benefit tracking to unlock personalized recommendations'
      ]
    };

    if (userData.benefitTracking && userData.benefitTracking.length >= 14) {
      const recentData = userData.benefitTracking.slice(-14);
      const avgEnergy = recentData.reduce((sum, entry) => sum + (entry.energy || 0), 0) / recentData.length;
      const avgMood = recentData.reduce((sum, entry) => sum + (entry.mood || 0), 0) / recentData.length;
      const avgSleep = recentData.reduce((sum, entry) => sum + (entry.sleep || 0), 0) / recentData.length;

      // Risk assessment
      const riskScore = Math.max(0, 10 - ((avgEnergy + avgMood + avgSleep) / 3));
      insights.riskPredictor = {
        level: riskScore < 3 ? 'low' : riskScore < 6 ? 'medium' : 'high',
        score: riskScore.toFixed(1),
        factors: riskScore < 3 ? 
          ['Strong energy levels', 'Stable mood patterns', 'Good sleep quality'] :
          riskScore < 6 ?
          ['Moderate energy fluctuations', 'Occasional mood dips', 'Sleep inconsistency'] :
          ['Low energy levels', 'Mood instability', 'Poor sleep quality']
      };

      // Performance zones
      insights.performanceZones = {
        criteria: 'Based on your 14-day tracking pattern',
        metrics: [
          { label: 'Energy Peak', value: Math.max(...recentData.map(d => d.energy || 0)), context: 'Best recorded' },
          { label: 'Mood Stability', value: (10 - (Math.max(...recentData.map(d => d.mood || 0)) - Math.min(...recentData.map(d => d.mood || 0)))).toFixed(1), context: 'Consistency score' },
          { label: 'Sleep Average', value: avgSleep.toFixed(1), context: 'Past 14 days' }
        ]
      };

      // Correlations
      insights.benefitCorrelations = [
        avgEnergy > 7 && avgMood > 7 ? 'Strong positive correlation between energy and mood levels' :
        avgSleep > 7 && avgEnergy > 6 ? 'Good sleep quality is boosting your energy levels' :
        'Energy and mood levels show moderate correlation patterns'
      ];

      // Predictive insights
      insights.predictiveInsights = [
        avgEnergy > 7 ? 'Your energy trend suggests continued improvement over the next week' :
        avgEnergy < 5 ? 'Energy levels may need attention - consider reviewing your routine' :
        'Energy levels are stable but have room for optimization'
      ];

      // Amplification recommendations
      insights.amplificationRecommendations = [
        avgSleep < 6 ? 'Prioritize sleep quality to amplify other benefits' :
        avgEnergy < avgMood ? 'Focus on energy-boosting activities to match your positive mood' :
        'Maintain current habits while gradually increasing physical activity'
      ];
    }

    return insights;
  };

  // Get data quality assessment
  const getDataQuality = () => {
    const trackingDays = userData.benefitTracking ? userData.benefitTracking.length : 0;
    
    if (trackingDays === 0) {
      return { level: 'insufficient', days: 0 };
    } else if (trackingDays < 7) {
      return { level: 'minimal', days: trackingDays };
    } else if (trackingDays < 30) {
      return { level: 'good', days: trackingDays };
    } else {
      return { level: 'rich', days: trackingDays };
    }
  };

  const currentInsight = generateCurrentInsight();
  const currentAverage = calculateCurrentAverage();
  const intelligenceInsights = generateIntelligenceInsights();
  const dataQuality = getDataQuality();

  return (
    <div className="stats-container">
      {/* REDESIGNED: Header exactly matching Tracker and Calendar */}
      <div className="stats-header">
        <div className="stats-header-spacer"></div>
        <h2>Statistics</h2>
        <div className="stats-header-actions">
          <button className="reset-stats-btn" onClick={handleResetStats}>
            <FaRedo />
            Reset Stats
          </button>
        </div>
      </div>

      {/* UPDATED: Stats Info Banner */}
      <div className="stats-info-banner">
        <FaInfoCircle className="info-icon" />
        <span>Track your recovery benefits daily to unlock detailed insights and personalized recommendations.</span>
      </div>

      {/* Streak Statistics */}
      <div className="streak-stats">
        <div className="stat-card">
          <div className="stat-value">{userData.currentStreak || 0}</div>
          <div className="stat-label">Current Streak</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{userData.longestStreak || 0}</div>
          <div className="stat-label">Longest Streak</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{userData.badges?.filter(b => b.earned).length || 0}</div>
          <div className="stat-label">Badges Earned</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{userData.benefitTracking?.length || 0}</div>
          <div className="stat-label">Days Tracked</div>
        </div>
      </div>

      {/* Achievement Badges */}
      <div className="milestone-section">
        <h3>Achievement Badges</h3>
        <div className="badges-grid">
          {userData.badges?.map((badge, index) => (
            <div 
              key={index} 
              className={`badge-card ${badge.earned ? 'earned' : 'locked'}`}
              onClick={() => handleBadgeClick(badge)}
            >
              <div className="badge-icon">
                {badge.earned ? (
                  <FaTrophy className="badge-earned-icon" />
                ) : (
                  <FaLock className="badge-locked-icon" />
                )}
              </div>
              <div className="badge-name">{badge.name}</div>
              <div className="badge-date">
                {badge.earned ? formatDate(badge.date) : ''}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Benefit Tracker Section */}
      <div className="benefit-tracker-section">
        <h3>Benefit Tracker</h3>
        
        <div className="benefit-tracker-controls">
          <div className="metric-selector">
            <div className="metric-pill-container">
              {[
                { key: 'energy', label: 'Energy', icon: FaRegLightbulb },
                { key: 'mood', label: 'Mood', icon: FaHeart },
                { key: 'sleep', label: 'Sleep', icon: FaClock },
                { key: 'focus', label: 'Focus', icon: FaBrain },
                { key: 'social', label: 'Social', icon: FaHome },
                { key: 'confidence', label: 'Confidence', icon: FaStar }
              ].map(metric => (
                <button
                  key={metric.key}
                  className={`metric-btn ${selectedMetric === metric.key ? 'active' : ''} ${!isPremium && metric.key !== 'energy' ? 'locked' : ''}`}
                  onClick={() => handleMetricClick(metric.key)}
                  disabled={!isPremium && metric.key !== 'energy'}
                >
                  <metric.icon />
                  {metric.label}
                  {!isPremium && metric.key !== 'energy' && <FaLock className="metric-lock-icon" />}
                </button>
              ))}
            </div>
          </div>

          <div className="time-range-selector-container">
            <div className="time-range-selector">
              {Object.keys(timeRangeOptions).map(range => (
                <button
                  key={range}
                  className={`time-btn ${timeRange === range ? 'active' : ''}`}
                  onClick={() => setTimeRange(range)}
                >
                  {range.charAt(0).toUpperCase() + range.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Chart and Insights */}
        {isPremium ? (
          <div className="chart-and-insight-container">
            <div className="chart-container">
              <Line data={generateChartData()} options={chartOptions} />
            </div>
            <div className="current-insight-sidebar">
              <div className="current-metric-average">
                <div className="current-metric-label">Average {selectedMetric.charAt(0).toUpperCase() + selectedMetric.slice(1)}</div>
                <div className="current-metric-value">{currentAverage}</div>
              </div>
              <div className="current-insight-card">
                <div className="current-insight-header">
                  <currentInsight.icon className="insight-icon" />
                  Current Insight
                </div>
                <div className="current-insight-text">
                  <FormattedText>{currentInsight.text}</FormattedText>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="free-benefit-preview">
            <div className="free-average-display">
              <div className="current-metric-average">
                <div className="current-metric-label">Average Energy</div>
                <div className="current-metric-value">{currentAverage}</div>
              </div>
            </div>
            <div className="free-insight-preview">
              <div className="current-insight-card">
                <div className="current-insight-header">
                  <currentInsight.icon className="insight-icon" />
                  Current Insight
                </div>
                <div className="current-insight-text">
                  <FormattedText>{currentInsight.text}</FormattedText>
                </div>
              </div>
            </div>
            <div className="benefit-upgrade-cta">
              <div className="upgrade-helmet-section">
                <img src={helmetImage} alt="Upgrade to Premium" className="upgrade-helmet-icon" />
              </div>
              <div className="upgrade-text-section">
                <h4>Unlock Full Benefit Tracking</h4>
                <p>Track all 6 benefit metrics, view detailed charts, and get advanced insights about your recovery journey.</p>
                <button className="benefit-upgrade-btn">
                  <FaStar />
                  Upgrade Now
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Intelligence Analysis Section */}
      {isPremium && (
        <div className="intelligence-analysis-section">
          <div className="intelligence-analysis-header">
            <h3>Intelligence Analysis</h3>
          </div>

          {/* Intelligence info banner */}
          <div className="intelligence-info-banner">
            <FaInfoCircle className="info-icon" />
            <span>
              <FormattedText>
                **Advanced insights improve with data:** The more you track your benefits, the more accurate and personalized these intelligence insights become.
              </FormattedText>
            </span>
          </div>

          <div className="intelligence-preview-grid">
            {/* Risk Predictor */}
            <div className="intelligence-analysis-card">
              <div className="intelligence-card-header">
                <FaExclamationTriangle className="intelligence-card-icon" />
                Risk Predictor
              </div>
              <div className="intelligence-card-content">
                <div className="risk-predictor-display">
                  <div className={`risk-level-indicator ${intelligenceInsights.riskPredictor.level}`}>
                    <div>
                      <div className={`risk-score ${intelligenceInsights.riskPredictor.level}`}>
                        {intelligenceInsights.riskPredictor.score}
                      </div>
                      <div className="risk-level-text">
                        {intelligenceInsights.riskPredictor.level.charAt(0).toUpperCase() + intelligenceInsights.riskPredictor.level.slice(1)} Risk
                      </div>
                    </div>
                  </div>
                  <div className="risk-factors-list">
                    <div className="risk-factors-title">Key Factors:</div>
                    {intelligenceInsights.riskPredictor.factors.map((factor, index) => (
                      <div key={index} className="risk-factor-item">
                        <FormattedText>{factor}</FormattedText>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="intelligence-data-status">
                  <div className="intelligence-data-status-indicator">
                    <div className={`intelligence-data-quality ${dataQuality.level}`}>
                      <FaInfoCircle />
                      {dataQuality.level}
                    </div>
                    <div className="intelligence-data-days">
                      {dataQuality.days} days tracked
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Benefit Correlations */}
            <div className="intelligence-analysis-card">
              <div className="intelligence-card-header">
                <FaChartLine className="intelligence-card-icon" />
                Benefit Correlations
              </div>
              <div className="intelligence-card-content">
                <div className="correlations-display">
                  {intelligenceInsights.benefitCorrelations.map((correlation, index) => (
                    <div key={index} className="correlation-item">
                      <FormattedText>{correlation}</FormattedText>
                    </div>
                  ))}
                </div>
                <div className="intelligence-data-status">
                  <div className="intelligence-data-status-indicator">
                    <div className={`intelligence-data-quality ${dataQuality.level}`}>
                      <FaInfoCircle />
                      {dataQuality.level}
                    </div>
                    <div className="intelligence-data-days">
                      {dataQuality.days} days tracked
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Performance Zones */}
            <div className="intelligence-analysis-card">
              <div className="intelligence-card-header">
                <FaStar className="intelligence-card-icon" />
                Performance Zones
              </div>
              <div className="intelligence-card-content">
                <div className="performance-zones-display">
                  <div className="performance-criteria">
                    <div className="performance-criteria-title">Analysis Criteria</div>
                    <div className="performance-criteria-text">
                      <FormattedText>{intelligenceInsights.performanceZones.criteria}</FormattedText>
                    </div>
                  </div>
                  {intelligenceInsights.performanceZones.metrics.length > 0 ? (
                    <div className="performance-metrics-simplified">
                      {intelligenceInsights.performanceZones.metrics.map((metric, index) => (
                        <div key={index} className="performance-metric-card">
                          <div className="performance-metric-value">{metric.value}</div>
                          <div className="performance-metric-label">{metric.label}</div>
                          <div className="performance-metric-context">{metric.context}</div>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
                <div className="intelligence-data-status">
                  <div className="intelligence-data-status-indicator">
                    <div className={`intelligence-data-quality ${dataQuality.level}`}>
                      <FaInfoCircle />
                      {dataQuality.level}
                    </div>
                    <div className="intelligence-data-days">
                      {dataQuality.days} days tracked
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Predictive Insights */}
            <div className="intelligence-analysis-card">
              <div className="intelligence-card-header">
                <FaEye className="intelligence-card-icon" />
                Predictive Insights
              </div>
              <div className="intelligence-card-content">
                <div className="predictive-insights-display">
                  {intelligenceInsights.predictiveInsights.map((insight, index) => (
                    <div key={index} className="predictive-insight-item">
                      <FormattedText>{insight}</FormattedText>
                    </div>
                  ))}
                </div>
                <div className="intelligence-data-status">
                  <div className="intelligence-data-status-indicator">
                    <div className={`intelligence-data-quality ${dataQuality.level}`}>
                      <FaInfoCircle />
                      {dataQuality.level}
                    </div>
                    <div className="intelligence-data-days">
                      {dataQuality.days} days tracked
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Amplification Recommendations */}
            <div className="intelligence-analysis-card">
              <div className="intelligence-card-header">
                <FaBrain className="intelligence-card-icon" />
                Amplification Recommendations
              </div>
              <div className="intelligence-card-content">
                <div className="amplification-display">
                  {intelligenceInsights.amplificationRecommendations.map((recommendation, index) => (
                    <div key={index} className="amplification-item">
                      <FormattedText>{recommendation}</FormattedText>
                    </div>
                  ))}
                </div>
                <div className="intelligence-data-status">
                  <div className="intelligence-data-status-indicator">
                    <div className={`intelligence-data-quality ${dataQuality.level}`}>
                      <FaInfoCircle />
                      {dataQuality.level}
                    </div>
                    <div className="intelligence-data-days">
                      {dataQuality.days} days tracked
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Historical Comparison */}
            <div className="historical-comparison-section">
              <div className="historical-comparison-header">
                <FaChartLine className="intelligence-card-icon" />
                Historical Comparison
              </div>
              <div className="historical-comparison-grid">
                <div className="historical-comparison-card">
                  <div className="historical-comparison-value">
                    {userData.benefitTracking?.length >= 30 ? 
                      (userData.benefitTracking.slice(-30).reduce((sum, entry) => sum + (entry[selectedMetric] || 0), 0) / 30).toFixed(1) : 
                      'N/A'
                    }
                  </div>
                  <div className="historical-comparison-label">30-Day Average</div>
                </div>
                <div className="historical-comparison-card">
                  <div className="historical-comparison-value">
                    {userData.benefitTracking?.length >= 7 ? 
                      (userData.benefitTracking.slice(-7).reduce((sum, entry) => sum + (entry[selectedMetric] || 0), 0) / 7).toFixed(1) : 
                      'N/A'
                    }
                  </div>
                  <div className="historical-comparison-label">7-Day Average</div>
                </div>
                <div className="historical-comparison-card">
                  <div className="historical-comparison-value">
                    {userData.benefitTracking?.length > 0 ? 
                      Math.max(...userData.benefitTracking.map(entry => entry[selectedMetric] || 0)).toFixed(1) : 
                      'N/A'
                    }
                  </div>
                  <div className="historical-comparison-label">Personal Best</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Badge Modal */}
      {showBadgeModal && selectedBadge && (
        <div className="modal-overlay" onClick={() => setShowBadgeModal(false)}>
          <div className="modal-content badge-modal" onClick={(e) => e.stopPropagation()}>
            <div className="badge-trophy">
              <FaTrophy className="badge-trophy-icon" />
            </div>
            <h3>{selectedBadge.name}</h3>
            {selectedBadge.earned && (
              <div className="badge-earned-date">
                Earned on {formatDate(selectedBadge.date)}
              </div>
            )}
            <div className="badge-description">
              <p>{selectedBadge.description || `Achievement for maintaining a ${selectedBadge.name.split('-')[0]}-day streak.`}</p>
            </div>
            <div className="badge-benefits">
              <h4>Benefits:</h4>
              <ul>
                <li>
                  <FaCheckCircle className="check-icon" />
                  <span>Demonstrates commitment to recovery</span>
                </li>
                <li>
                  <FaCheckCircle className="check-icon" />
                  <span>Builds momentum for longer streaks</span>
                </li>
                <li>
                  <FaCheckCircle className="check-icon" />
                  <span>Unlocks advanced tracking features</span>
                </li>
              </ul>
            </div>
            <div className="modal-actions">
              <button className="btn btn-primary" onClick={() => setShowBadgeModal(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Smart Reset Dialog */}
      {showSmartResetDialog && (
        <SmartResetDialog
          onClose={() => setShowSmartResetDialog(false)}
          onConfirm={confirmResetStats}
          userData={userData}
        />
      )}
    </div>
  );
};

export default Stats;