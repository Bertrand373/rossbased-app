// components/Stats/Stats.js - ENHANCED: Professional UX Polish with Loading States and Relapse Pattern Analytics
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { format, subDays, addDays, startOfDay, differenceInDays } from 'date-fns';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler } from 'chart.js';
import { FaRegLightbulb, FaLock, FaMedal, FaTrophy, FaCheckCircle, FaRedo, FaInfoCircle, 
  FaExclamationTriangle, FaFrown, FaLaptop, FaHome, FaHeart, FaClock, FaBrain, FaEye, FaStar, FaChartLine, FaShieldAlt, FaFire } from 'react-icons/fa';
import './Stats.css';
import toast from 'react-hot-toast';
import helmetImage from '../../assets/helmet.png';
import SmartResetDialog from './SmartResetDialog';

// Import utility functions
import {
  renderTextWithBold,
  getTimeRangeDisplayText,
  checkAndUpdateBadges,
  getCurrentPhase,
  getPhaseGuidance,
  getFilteredBenefitData,
  generateChartData,
  calculateAverage,
  generateUrgeManagementGuidance,
  generatePatternRecognition,
  generateOptimizationGuidance,
  calculateHistoricalComparison,
  calculateRelapseRisk,
  shouldShowInfoBanner,
  calculateDataQuality,
  generateRelapsePatternAnalysis
} from './StatsUtils';

// Register ChartJS components
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

// ENHANCED: Loading states component with helmet animation
const InsightLoadingState = ({ insight, isVisible }) => {
  if (!isVisible) return null;
  
  return (
    <div className="insight-loading-state">
      <div className="insight-loading-content">
        <img 
          src={helmetImage} 
          alt="Analyzing" 
          className="insight-loading-helmet"
          onError={(e) => {
            e.target.style.display = 'none';
            e.target.nextSibling.style.display = 'block';
          }}
        />
        <div className="insight-loading-helmet-fallback" style={{display: 'none'}}>🧠</div>
        <div className="insight-loading-text">
          <div className="insight-loading-title">Calculating {insight}...</div>
          <div className="insight-loading-dots">
            <span></span>
            <span></span>
            <span></span>
          </div>
        </div>
      </div>
    </div>
  );
};

// ENHANCED: Progress indicator component with mobile optimizations
const DataProgressIndicator = ({ userData, targetDays = 14 }) => {
  const trackedDays = userData.benefitTracking?.length || 0;
  const progressPercentage = Math.min((trackedDays / targetDays) * 100, 100);
  const isComplete = trackedDays >= targetDays;
  
  return (
    <div className="data-progress-indicator">
      <div className="data-progress-header">
        <div className="data-progress-title">
          {isComplete ? 'Analytics Ready' : 'Building Your Profile'}
        </div>
        <div className="data-progress-count">
          {trackedDays}/{targetDays} days
        </div>
      </div>
      <div className="data-progress-bar">
        <div 
          className="data-progress-fill"
          style={{ width: `${progressPercentage}%` }}
        />
      </div>
      {!isComplete && (
        <div className="data-progress-message">
          Track {targetDays - trackedDays} more days for detailed insights
        </div>
      )}
    </div>
  );
};

// ENHANCED: Empty state component with encouragement
const InsightEmptyState = ({ insight, userData }) => {
  const suggestions = {
    'Smart Urge Management': 'Track your daily benefits to receive personalized vulnerability assessments and timing-based guidance.',
    'Relapse Risk Predictor': 'Build a benefit tracking history to unlock predictive analytics and risk mitigation strategies.',
    'Pattern Recognition': 'Continue logging daily benefits to identify correlations and trends in your retention journey.',
    'Optimization Guidance': 'Track benefits consistently to discover your peak performance zones and optimization opportunities.',
    'Relapse Pattern Analytics': 'Track relapses with triggers in the Calendar to identify dangerous patterns and build targeted defenses.'
  };

  return (
    <div className="insight-empty-state">
      <div className="insight-empty-icon">
        <FaChartLine />
      </div>
      <div className="insight-empty-content">
        <div className="insight-empty-title">Building Your {insight}</div>
        <div className="insight-empty-description">
          {suggestions[insight] || 'Continue tracking to unlock personalized insights.'}
        </div>
        <DataProgressIndicator userData={userData} />
      </div>
    </div>
  );
};

const Stats = ({ userData, isPremium, updateUserData }) => {
  const [selectedMetric, setSelectedMetric] = useState('energy');
  const [timeRange, setTimeRange] = useState('week');
  const [showBadgeModal, setShowBadgeModal] = useState(false);
  const [selectedBadge, setSelectedBadge] = useState(null);
  const [showSmartResetDialog, setShowSmartResetDialog] = useState(false);
  
  // ENHANCED: Loading states for insights
  const [loadingStates, setLoadingStates] = useState({
    urgeManagement: false,
    riskPredictor: false,
    patternRecognition: false,
    optimization: false,
    relapsePatterns: false
  });
  
  const insightsStartRef = useRef(null);

  // ENHANCED: Defensive programming - ensure userData structure
  const safeUserData = useMemo(() => ({
    currentStreak: 0,
    longestStreak: 0,
    wetDreamCount: 0,
    relapseCount: 0,
    startDate: new Date(),
    benefitTracking: [],
    streakHistory: [],
    badges: [
      { id: 1, name: '7-Day Warrior', earned: false, date: null },
      { id: 2, name: '14-Day Monk', earned: false, date: null },
      { id: 3, name: '30-Day Master', earned: false, date: null },
      { id: 4, name: '90-Day King', earned: false, date: null },
      { id: 5, name: '180-Day Emperor', earned: false, date: null },
      { id: 6, name: '365-Day Sage', earned: false, date: null }
    ],
    ...userData
  }), [userData]);

  // Force free users to energy metric on mount and when premium status changes
  useEffect(() => {
    if (!isPremium && selectedMetric !== 'energy') {
      setSelectedMetric('energy');
    }
  }, [isPremium, selectedMetric]);

  // ENHANCED: Simulate loading for insights calculation
  const simulateInsightLoading = useCallback((insightType, duration = 800) => {
    setLoadingStates(prev => ({ ...prev, [insightType]: true }));
    setTimeout(() => {
      setLoadingStates(prev => ({ ...prev, [insightType]: false }));
    }, duration);
  }, []);

  // ENHANCED: Trigger loading when time range or metric changes
  useEffect(() => {
    if (isPremium) {
      simulateInsightLoading('urgeManagement', 600);
      setTimeout(() => simulateInsightLoading('riskPredictor', 700), 200);
      setTimeout(() => simulateInsightLoading('patternRecognition', 800), 400);
      setTimeout(() => simulateInsightLoading('optimization', 600), 600);
      setTimeout(() => simulateInsightLoading('relapsePatterns', 900), 800);
    }
  }, [timeRange, selectedMetric, isPremium, simulateInsightLoading]);

  // Handle metric selection with access control
  const handleMetricClick = useCallback((metric) => {
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
  }, [isPremium]);

  // ENHANCED: Memoized calculations for performance
  const memoizedInsights = useMemo(() => {
    if (!safeUserData) return {};
    
    return {
      riskAnalysis: calculateRelapseRisk(safeUserData, timeRange, isPremium),
      urgeManagement: generateUrgeManagementGuidance(safeUserData, timeRange),
      patternInsights: generatePatternRecognition(safeUserData, selectedMetric, isPremium),
      optimizationGuidance: generateOptimizationGuidance(safeUserData, selectedMetric, timeRange, isPremium),
      dataQuality: calculateDataQuality(safeUserData),
      historicalComparison: calculateHistoricalComparison(safeUserData, selectedMetric),
      relapsePatterns: generateRelapsePatternAnalysis(safeUserData)
    };
  }, [safeUserData, timeRange, selectedMetric, isPremium]);

  // Auto-check badges when streak changes
  useEffect(() => {
    if (safeUserData && safeUserData.currentStreak !== undefined) {
      const updatedData = checkAndUpdateBadges(safeUserData);
      
      if (JSON.stringify(updatedData.badges) !== JSON.stringify(safeUserData.badges)) {
        updateUserData?.(updatedData);
      }
    }
  }, [safeUserData?.currentStreak, safeUserData?.longestStreak, updateUserData, safeUserData]);

  // Time range options for chart
  const timeRangeOptions = {
    week: 7,
    month: 30,
    quarter: 90
  };
  
  const formatDate = (date) => format(new Date(date), 'MMM d, yyyy');
  
  const handleBadgeClick = useCallback((badge) => {
    setSelectedBadge(badge);
    setShowBadgeModal(true);
  }, []);

  const handleResetStats = useCallback(() => {
    setShowSmartResetDialog(true);
  }, []);

  // Enhanced reset function with different levels
  const confirmResetStats = useCallback((resetLevel) => {
    if (!updateUserData) {
      console.error('updateUserData function is not available');
      toast.error('Unable to reset data - please refresh the page');
      return;
    }

    let resetUserData = { ...safeUserData };
    const today = new Date();

    switch (resetLevel) {
      case 'currentStreak':
        resetUserData = {
          ...safeUserData,
          currentStreak: 0,
          startDate: today,
          streakHistory: [
            ...(safeUserData.streakHistory || []),
            {
              id: (safeUserData.streakHistory?.length || 0) + 1,
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
          ...safeUserData,
          startDate: today,
          currentStreak: 0,
          relapseCount: 0,
          wetDreamCount: 0,
          longestStreak: safeUserData.longestStreak || 0,
          streakHistory: [{
            id: 1,
            start: today,
            end: null,
            days: 0,
            reason: 'major_reset'
          }],
          benefitTracking: [],
          notes: {},
          badges: safeUserData.badges?.map(badge => ({
            ...badge,
            earned: (badge.name === '90-Day King' && (safeUserData.longestStreak || 0) >= 90) ||
                   (badge.name === '180-Day Emperor' && (safeUserData.longestStreak || 0) >= 180) ||
                   (badge.name === '365-Day Sage' && (safeUserData.longestStreak || 0) >= 365) ? badge.earned : false,
            date: ((badge.name === '90-Day King' && (safeUserData.longestStreak || 0) >= 90) ||
                  (badge.name === '180-Day Emperor' && (safeUserData.longestStreak || 0) >= 180) ||
                  (badge.name === '365-Day Sage' && (safeUserData.longestStreak || 0) >= 365)) ? badge.date : null
          })) || []
        };
        toast.success(`All progress reset. Longest streak record (${safeUserData.longestStreak || 0} days) preserved.`);
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
  }, [safeUserData, updateUserData]);

  const handleUpgradeClick = useCallback(() => {
    toast.success('Premium upgrade coming soon! 🚀');
  }, []);

  // ENHANCED: Memoized chart options
  const chartOptions = useMemo(() => ({
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
            const chartData = generateChartData(safeUserData, selectedMetric, timeRange);
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
  }), [timeRange, safeUserData, selectedMetric]);

  // ENHANCED: Check if user has sufficient data for insights
  const hasInsufficientData = useMemo(() => {
    return (safeUserData.benefitTracking?.length || 0) < 3;
  }, [safeUserData.benefitTracking]);
  
  return (
    <div className="stats-container">
      {/* Header */}
      <div className="stats-header">
        <div className="stats-header-spacer"></div>
        <h2>Your Stats</h2>
        <div className="stats-header-actions">
          <button 
            className="reset-stats-btn" 
            onClick={handleResetStats}
            onKeyDown={(e) => e.key === 'Enter' && handleResetStats()}
            tabIndex={0}
          >
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
        userData={safeUserData}
      />
      
      {/* Streak Statistics */}
      <div className="streak-stats">
        <div className="stat-card current-streak">
          <div className="stat-value">{safeUserData.currentStreak || 0}</div>
          <div className="stat-label">Current Streak</div>
        </div>
        
        <div className="stat-card longest-streak">
          <div className="stat-value">{safeUserData.longestStreak || 0}</div>
          <div className="stat-label">Longest Streak</div>
        </div>
        
        <div className="stat-card total-wetdreams">
          <div className="stat-value">{safeUserData.wetDreamCount || 0}</div>
          <div className="stat-label">Wet Dreams</div>
        </div>
        
        <div className="stat-card total-relapses">
          <div className="stat-value">{safeUserData.relapseCount || 0}</div>
          <div className="stat-label">Relapses</div>
        </div>
      </div>
      
      {/* Milestone Badges */}
      <div className="milestone-section">
        <h3>Your Achievements</h3>
        
        <div className="badges-grid">
          {safeUserData.badges && safeUserData.badges.map(badge => (
            <div 
              key={badge.id} 
              className={`badge-card ${badge.earned ? 'earned' : 'locked'}`}
              onClick={() => badge.earned && handleBadgeClick(badge)}
              onKeyDown={(e) => e.key === 'Enter' && badge.earned && handleBadgeClick(badge)}
              tabIndex={badge.earned ? 0 : -1}
              role={badge.earned ? "button" : "presentation"}
              aria-label={badge.earned ? `View ${badge.name} achievement details` : `${badge.name} - Not earned yet`}
            >
              <div className="badge-icon">
                {badge.earned ? (
                  <FaTrophy className="badge-earned-icon" />
                ) : (
                  <FaLock className="badge-locked-icon" />
                )}
              </div>
              <div className="badge-name">{badge.name}</div>
              {badge.earned && badge.date && (
                <div className="badge-date">
                  Earned {format(new Date(badge.date), 'MMM d')}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
      
      {/* Benefit Tracker */}
      <div className="benefit-tracker-section">
        <h3>Benefit Tracker</h3>
        
        {shouldShowInfoBanner(safeUserData, timeRange) && (
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
                onKeyDown={(e) => e.key === 'Enter' && handleMetricClick('energy')}
                tabIndex={0}
                aria-pressed={selectedMetric === 'energy'}
              >
                Energy
              </button>
              <button 
                className={`metric-btn focus ${selectedMetric === 'focus' ? 'active' : ''} ${!isPremium ? 'locked' : ''}`}
                onClick={() => handleMetricClick('focus')}
                onKeyDown={(e) => e.key === 'Enter' && handleMetricClick('focus')}
                disabled={!isPremium}
                tabIndex={isPremium ? 0 : -1}
                aria-pressed={selectedMetric === 'focus'}
                aria-label={!isPremium ? "Focus metric - Premium feature" : "Focus metric"}
              >
                Focus {!isPremium && <FaLock className="metric-lock-icon" />}
              </button>
              <button 
                className={`metric-btn confidence ${selectedMetric === 'confidence' ? 'active' : ''} ${!isPremium ? 'locked' : ''}`}
                onClick={() => handleMetricClick('confidence')}
                onKeyDown={(e) => e.key === 'Enter' && handleMetricClick('confidence')}
                disabled={!isPremium}
                tabIndex={isPremium ? 0 : -1}
                aria-pressed={selectedMetric === 'confidence'}
                aria-label={!isPremium ? "Confidence metric - Premium feature" : "Confidence metric"}
              >
                Confidence {!isPremium && <FaLock className="metric-lock-icon" />}
              </button>
              <button 
                className={`metric-btn aura ${selectedMetric === 'aura' ? 'active' : ''} ${!isPremium ? 'locked' : ''}`}
                onClick={() => handleMetricClick('aura')}
                onKeyDown={(e) => e.key === 'Enter' && handleMetricClick('aura')}
                disabled={!isPremium}
                tabIndex={isPremium ? 0 : -1}
                aria-pressed={selectedMetric === 'aura'}
                aria-label={!isPremium ? "Aura metric - Premium feature" : "Aura metric"}
              >
                Aura {!isPremium && <FaLock className="metric-lock-icon" />}
              </button>
              <button 
                className={`metric-btn sleep ${selectedMetric === 'sleep' ? 'active' : ''} ${!isPremium ? 'locked' : ''}`}
                onClick={() => handleMetricClick('sleep')}
                onKeyDown={(e) => e.key === 'Enter' && handleMetricClick('sleep')}
                disabled={!isPremium}
                tabIndex={isPremium ? 0 : -1}
                aria-pressed={selectedMetric === 'sleep'}
                aria-label={!isPremium ? "Sleep Quality metric - Premium feature" : "Sleep Quality metric"}
              >
                Sleep Quality {!isPremium && <FaLock className="metric-lock-icon" />}
              </button>
              <button 
                className={`metric-btn workout ${selectedMetric === 'workout' ? 'active' : ''} ${!isPremium ? 'locked' : ''}`}
                onClick={() => handleMetricClick('workout')}
                onKeyDown={(e) => e.key === 'Enter' && handleMetricClick('workout')}
                disabled={!isPremium}
                tabIndex={isPremium ? 0 : -1}
                aria-pressed={selectedMetric === 'workout'}
                aria-label={!isPremium ? "Workout metric - Premium feature" : "Workout metric"}
              >
                Workout {!isPremium && <FaLock className="metric-lock-icon" />}
              </button>
            </div>
          </div>
          
          {isPremium && (
            <div className="time-range-selector-container">
              <div className="time-range-selector" role="radiogroup" aria-label="Time range selection">
                <button 
                  className={`time-btn ${timeRange === 'week' ? 'active' : ''}`}
                  onClick={() => setTimeRange('week')}
                  onKeyDown={(e) => e.key === 'Enter' && setTimeRange('week')}
                  tabIndex={0}
                  role="radio"
                  aria-checked={timeRange === 'week'}
                >
                  Week
                </button>
                <button 
                  className={`time-btn ${timeRange === 'month' ? 'active' : ''}`}
                  onClick={() => setTimeRange('month')}
                  onKeyDown={(e) => e.key === 'Enter' && setTimeRange('month')}
                  tabIndex={0}
                  role="radio"
                  aria-checked={timeRange === 'month'}
                >
                  Month
                </button>
                <button 
                  className={`time-btn ${timeRange === 'quarter' ? 'active' : ''}`}
                  onClick={() => setTimeRange('quarter')}
                  onKeyDown={(e) => e.key === 'Enter' && setTimeRange('quarter')}
                  tabIndex={0}
                  role="radio"
                  aria-checked={timeRange === 'quarter'}
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
                <div className="current-metric-value">{calculateAverage(safeUserData, selectedMetric, timeRange, isPremium)}/10</div>
              </div>
            </div>
            
            <div className="intelligence-preview-grid">
              <div className="current-insight-card">
                <div className="current-insight-header">
                  <span>Relapse Risk Analysis</span>
                </div>
                <div className="current-insight-text">
                  <div className="comparison-value" style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>
                    {memoizedInsights.riskAnalysis?.score === 'N/A' ? 'N/A' : `${memoizedInsights.riskAnalysis?.level || 'Low'} Risk`}
                  </div>
                  {memoizedInsights.riskAnalysis?.score === 'N/A' ? 
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
                
                <button 
                  className="benefit-upgrade-btn" 
                  onClick={handleUpgradeClick}
                  onKeyDown={(e) => e.key === 'Enter' && handleUpgradeClick()}
                  tabIndex={0}
                >
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
                  const chartData = generateChartData(safeUserData, selectedMetric, timeRange);
                  const hasAnyData = chartData.datasets[0].data.some(val => val !== null);
                  
                  if (!hasAnyData) {
                    return (
                      <div className="no-chart-data">
                        <div className="no-data-icon">
                          <FaChartLine />
                        </div>
                        <div className="no-data-text">
                          <h4>No Chart Data Available</h4>
                          <p>Start logging your {selectedMetric} benefits to see your progress visualization.</p>
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
                    Your {selectedMetric === 'sleep' ? 'Sleep Quality' : selectedMetric.charAt(0).toUpperCase() + selectedMetric.slice(1)} {getTimeRangeDisplayText(timeRange)}
                  </div>
                  <div className="current-metric-value">
                    {calculateAverage(safeUserData, selectedMetric, timeRange, isPremium) === 'N/A' ? 'N/A' : `${calculateAverage(safeUserData, selectedMetric, timeRange, isPremium)}/10`}
                  </div>
                </div>
                
                <div className="current-insight-card">
                  <div className="current-insight-header">
                    <span>Current Status</span>
                  </div>
                  <div className="current-insight-text">
                    {(() => {
                      const avg = calculateAverage(safeUserData, selectedMetric, timeRange, isPremium);
                      const phase = getCurrentPhase(safeUserData);
                      
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
            
            {/* ENHANCED: Personalized Insights Section with Loading States + NEW Relapse Pattern Analytics */}
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
                  {loadingStates.urgeManagement ? (
                    <InsightLoadingState insight="Smart Urge Management" isVisible={true} />
                  ) : hasInsufficientData ? (
                    <InsightEmptyState insight="Smart Urge Management" userData={safeUserData} />
                  ) : (
                    <div className="urge-management-display">
                      {memoizedInsights.urgeManagement?.riskLevel === 'N/A' ? (
                        <div className="risk-level-indicator insufficient">
                          <div>
                            <div className="risk-score insufficient">N/A</div>
                            <div className="risk-level-text">Insufficient Data</div>
                          </div>
                        </div>
                      ) : (
                        <div className={`risk-level-indicator ${memoizedInsights.urgeManagement?.riskLevel?.toLowerCase() || 'low'}`}>
                          <div>
                            <div className={`risk-score ${memoizedInsights.urgeManagement?.riskLevel?.toLowerCase() || 'low'}`}>
                              {memoizedInsights.urgeManagement?.riskLevel || 'Low'}
                            </div>
                            <div className="risk-level-text">Current Risk Level</div>
                          </div>
                        </div>
                      )}
                      <div className="guidance-list">
                        <div className="guidance-title">
                          {memoizedInsights.urgeManagement?.riskLevel === 'N/A' ? 'Data Requirements:' : 'Current Guidance:'}
                        </div>
                        {(memoizedInsights.urgeManagement?.guidance || []).map((guide, index) => (
                          <div key={index} className="guidance-item" dangerouslySetInnerHTML={renderTextWithBold(guide)}></div>
                        ))}
                      </div>
                    </div>
                  )}
                  {memoizedInsights.dataQuality?.level !== 'insufficient' && !hasInsufficientData && (
                    <div className="insight-data-status">
                      <div className="insight-data-status-indicator">
                        <span className={`insight-data-quality ${memoizedInsights.dataQuality?.level || 'minimal'}`}>
                          <FaChartLine />
                          {memoizedInsights.dataQuality?.label || 'Basic Analysis'}
                        </span>
                        <span className="insight-data-days">
                          Based on {memoizedInsights.dataQuality?.days || 0} days of tracking
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
                  {loadingStates.riskPredictor ? (
                    <InsightLoadingState insight="Risk Analysis" isVisible={true} />
                  ) : hasInsufficientData ? (
                    <InsightEmptyState insight="Relapse Risk Predictor" userData={safeUserData} />
                  ) : (
                    <div className="risk-predictor-display">
                      {memoizedInsights.riskAnalysis?.score === 'N/A' ? (
                        <div className="risk-level-indicator insufficient">
                          <div>
                            <div className="risk-score insufficient">N/A</div>
                            <div className="risk-level-text">Insufficient Data</div>
                          </div>
                        </div>
                      ) : (
                        <div className={`risk-level-indicator ${memoizedInsights.riskAnalysis?.level?.toLowerCase() || 'low'}`}>
                          <div>
                            <div className={`risk-score ${memoizedInsights.riskAnalysis?.level?.toLowerCase() || 'low'}`}>
                              {memoizedInsights.riskAnalysis?.score || 0}%
                            </div>
                            <div className="risk-level-text">{memoizedInsights.riskAnalysis?.level || 'Low'} Risk Level</div>
                          </div>
                        </div>
                      )}
                      <div className="risk-factors-list">
                        <div className="risk-factors-title">
                          {memoizedInsights.riskAnalysis?.score === 'N/A' ? 'Data Requirements:' : 'Risk Factors & Actions:'}
                        </div>
                        {(memoizedInsights.riskAnalysis?.factors || []).map((factor, index) => (
                          <div key={index} className="risk-factor-item" dangerouslySetInnerHTML={renderTextWithBold(factor)}></div>
                        ))}
                      </div>
                    </div>
                  )}
                  {memoizedInsights.dataQuality?.level !== 'insufficient' && !hasInsufficientData && (
                    <div className="insight-data-status">
                      <div className="insight-data-status-indicator">
                        <span className={`insight-data-quality ${memoizedInsights.dataQuality?.level || 'minimal'}`}>
                          <FaChartLine />
                          {memoizedInsights.dataQuality?.label || 'Basic Analysis'}
                        </span>
                        <span className="insight-data-days">
                          Based on {memoizedInsights.dataQuality?.days || 0} days of tracking
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              {/* NEW: Relapse Pattern Analytics */}
              <div className="insight-card">
                <div className="insight-card-header">
                  <span>Relapse Pattern Analytics</span>
                </div>
                <div className="insight-info-banner">
                  <FaInfoCircle className="info-icon" />
                  <span>Analyzes your relapse history to identify trigger patterns, phase vulnerabilities, and provides brutally honest countermeasures based on retention wisdom.</span>
                </div>
                <div className="insight-card-content">
                  {loadingStates.relapsePatterns ? (
                    <InsightLoadingState insight="Pattern Analysis" isVisible={true} />
                  ) : !memoizedInsights.relapsePatterns?.hasData ? (
                    <InsightEmptyState insight="Relapse Pattern Analytics" userData={safeUserData} />
                  ) : (
                    <div className="relapse-patterns-display">
                      {memoizedInsights.relapsePatterns.relapseCount && (
                        <div className="relapse-summary-stats">
                          <div className="relapse-stat-card">
                            <div className="relapse-stat-value">{memoizedInsights.relapsePatterns.relapseCount}</div>
                            <div className="relapse-stat-label">Total Relapses Analyzed</div>
                          </div>
                          {memoizedInsights.relapsePatterns.primaryTrigger && (
                            <div className="relapse-stat-card primary-trigger">
                              <div className="relapse-stat-value">{memoizedInsights.relapsePatterns.primaryTrigger}</div>
                              <div className="relapse-stat-label">Primary Vulnerability</div>
                            </div>
                          )}
                        </div>
                      )}
                      
                      <div className="relapse-insights-list">
                        <div className="relapse-insights-title">Pattern Analysis:</div>
                        {(memoizedInsights.relapsePatterns?.insights || []).map((insight, index) => (
                          <div key={index} className="relapse-insight-item" dangerouslySetInnerHTML={renderTextWithBold(insight)}></div>
                        ))}
                      </div>
                    </div>
                  )}
                  {memoizedInsights.relapsePatterns?.hasData && (
                    <div className="insight-data-status">
                      <div className="insight-data-status-indicator">
                        <span className="insight-data-quality rich">
                          <FaShieldAlt />
                          Relapse Intelligence
                        </span>
                        <span className="insight-data-days">
                          Based on {memoizedInsights.relapsePatterns.relapseCount || 0} relapse records
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Pattern Recognition */}
              <div className="insight-card">
                <div className="insight-card-header">
                  <span>Pattern Recognition</span>
                </div>
                <div className="insight-info-banner">
                  <FaInfoCircle className="info-icon" />
                  <span>Identifies correlations between your metrics and predicts trends based on your unique retention journey patterns.</span>
                </div>
                <div className="insight-card-content">
                  {loadingStates.patternRecognition ? (
                    <InsightLoadingState insight="Pattern Analysis" isVisible={true} />
                  ) : hasInsufficientData ? (
                    <InsightEmptyState insight="Pattern Recognition" userData={safeUserData} />
                  ) : (
                    <>
                      {(!memoizedInsights.patternInsights || memoizedInsights.patternInsights.length === 0 || 
                        (memoizedInsights.patternInsights.length === 1 && memoizedInsights.patternInsights[0].includes('Need 14+'))) ? (
                        <div className="insufficient-data-message">
                          <div className="insufficient-data-text">
                            Continue tracking daily benefits to unlock pattern analysis. The more data you provide, the more detailed your insights become.
                          </div>
                        </div>
                      ) : (
                        <div className="patterns-display">
                          {memoizedInsights.patternInsights.map((pattern, index) => (
                            <div key={index} className="pattern-item" dangerouslySetInnerHTML={renderTextWithBold(pattern)}></div>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                  {memoizedInsights.dataQuality?.level !== 'insufficient' && !hasInsufficientData && (
                    <div className="insight-data-status">
                      <div className="insight-data-status-indicator">
                        <span className={`insight-data-quality ${memoizedInsights.dataQuality?.level || 'minimal'}`}>
                          <FaChartLine />
                          {memoizedInsights.dataQuality?.label || 'Basic Analysis'}
                        </span>
                        <span className="insight-data-days">
                          Based on {memoizedInsights.dataQuality?.days || 0} days of tracking
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Optimization Guidance */}
              <div className="insight-card">
                <div className="insight-card-header">
                  <span>Optimization Guidance</span>
                </div>
                <div className="insight-info-banner">
                  <FaInfoCircle className="info-icon" />
                  <span>Shows your peak performance rate and provides timing-based recommendations for maximizing your retention benefits.</span>
                </div>
                <div className="insight-card-content">
                  {loadingStates.optimization ? (
                    <InsightLoadingState insight="Optimization Analysis" isVisible={true} />
                  ) : hasInsufficientData ? (
                    <InsightEmptyState insight="Optimization Guidance" userData={safeUserData} />
                  ) : (
                    <div className="optimization-display">
                      <div className="optimization-criteria">
                        <div className="optimization-criteria-title">Your Peak Performance Zone:</div>
                        <div className="optimization-criteria-text">{memoizedInsights.optimizationGuidance?.criteria || 'Energy 7+, Confidence 5+'}</div>
                      </div>
                      <div className="optimization-metrics">
                        <div className="optimization-metric-card">
                          <div className="optimization-metric-value">{memoizedInsights.optimizationGuidance?.optimalRate || 'N/A'}</div>
                          <div className="optimization-metric-label">Operating in optimal zone</div>
                        </div>
                      </div>
                      <div className="optimization-recommendations">
                        <div className="optimization-title">Current Recommendations:</div>
                        {(memoizedInsights.optimizationGuidance?.recommendations || []).map((rec, index) => (
                          <div key={index} className="optimization-item" dangerouslySetInnerHTML={renderTextWithBold(rec)}></div>
                        ))}
                      </div>
                    </div>
                  )}
                  {memoizedInsights.dataQuality?.level !== 'insufficient' && !hasInsufficientData && (
                    <div className="insight-data-status">
                      <div className="insight-data-status-indicator">
                        <span className={`insight-data-quality ${memoizedInsights.dataQuality?.level || 'minimal'}`}>
                          <FaChartLine />
                          {memoizedInsights.dataQuality?.label || 'Basic Analysis'}
                        </span>
                        <span className="insight-data-days">
                          Based on {memoizedInsights.dataQuality?.days || 0} days of tracking
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Historical Comparison */}
              <div className="historical-comparison-section">
                <div className="historical-comparison-header">
                  <span>{selectedMetric === 'sleep' ? 'Sleep Quality' : selectedMetric.charAt(0).toUpperCase() + selectedMetric.slice(1)} Journey Analysis</span>
                </div>
                {(() => {
                  const comparison = memoizedInsights.historicalComparison;
                  
                  if (!comparison?.hasData) {
                    return (
                      <div className="historical-comparison-card" style={{ gridColumn: '1 / -1', textAlign: 'center' }}>
                        <div className="historical-comparison-value">N/A</div>
                        <div className="historical-comparison-label">{comparison?.message || 'Insufficient data for analysis'}</div>
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
                            {comparison.bestPhase?.data?.average || 'N/A'}/10
                          </div>
                          <div className="historical-comparison-label">
                            Your peak during {comparison.bestPhase?.name || 'Unknown'} phase ({comparison.bestPhase?.range || 'N/A'})
                          </div>
                        </div>
                        
                        <div className="historical-comparison-card">
                          <div className="historical-comparison-value">
                            {comparison.allPhases?.length || 0}
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
                            📈 Your peak {selectedMetric} was {comparison.bestPhase?.data?.average || 'N/A'}/10 during {comparison.bestPhase?.name || 'Unknown'} phase. You have proven potential to reach this level again.
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
        <div className="modal-overlay" onClick={() => setShowBadgeModal(false)} role="dialog" aria-modal="true" aria-labelledby="badge-modal-title">
          <div className="modal-content badge-modal" onClick={e => e.stopPropagation()}>
            <div className="badge-trophy">
              <FaMedal className="badge-trophy-icon" />
            </div>
            
            <h3 id="badge-modal-title">{selectedBadge.name}</h3>
            
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
              <button 
                className="btn btn-primary" 
                onClick={() => setShowBadgeModal(false)}
                onKeyDown={(e) => e.key === 'Enter' && setShowBadgeModal(false)}
                autoFocus
              >
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