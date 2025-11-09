// components/Stats/Stats.js - UPDATED: Removed redundant AI sections, added Progress & Trends
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { format, subDays, addDays, startOfDay, differenceInDays } from 'date-fns';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler } from 'chart.js';
import { FaRegLightbulb, FaLock, FaMedal, FaTrophy, FaCheckCircle, FaRedo, FaInfoCircle, 
  FaExclamationTriangle, FaFrown, FaLaptop, FaHome, FaHeart, FaClock, FaBrain, FaEye, FaStar, FaChartLine, FaShieldAlt, FaFire, FaTimes, FaMoon, FaRocket } from 'react-icons/fa';
import './Stats.css';
import toast from 'react-hot-toast';
import helmetImage from '../../assets/helmet.png';
import SmartResetDialog from './SmartResetDialog';

// Import extracted components
import { StatCardModal } from './StatsComponents';
import { 
  ProgressTrendsAnalysis,
  RelapsePatternAnalytics, 
  PatternRecognition, 
  OptimizationGuidance,
  PhaseEvolutionAnalysis
} from './StatsInsights';

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
  shouldShowInfoBanner,
  calculateDataQuality,
  calculateDaysSinceLastRelapse,
  validateUserData
} from './StatsUtils';

// Import analytics functions
import {
  generatePatternRecognition,
  generateOptimizationGuidance,
  calculatePhaseEvolutionAnalysis,
  generateRelapsePatternAnalysis,
  calculateProgressTrends
} from './StatsAnalyticsUtils';

// NEW: Import Energy Intelligence System
import EnergyIntelligenceSection from './EnergyIntelligenceSection';

// Register ChartJS components
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

const Stats = ({ userData, isPremium, updateUserData }) => {
  const [selectedMetric, setSelectedMetric] = useState('energy');
  const [timeRange, setTimeRange] = useState('week');
  const [showBadgeModal, setShowBadgeModal] = useState(false);
  const [selectedBadge, setSelectedBadge] = useState(null);
  const [showSmartResetDialog, setShowSmartResetDialog] = useState(false);
  
  // NEW: Stat card modal states
  const [showStatModal, setShowStatModal] = useState(false);
  const [selectedStatCard, setSelectedStatCard] = useState(null);
  
  // UPDATED: Loading states - removed redundant AI sections
  const [loadingStates, setLoadingStates] = useState({
    progressTrends: false,
    patternRecognition: false,
    optimization: false,
    relapsePatterns: false,
    phaseEvolution: false
  });
  
  const insightsStartRef = useRef(null);

  // ENHANCED: Defensive programming - ensure userData structure
  const safeUserData = useMemo(() => validateUserData(userData), [userData]);

  // ENHANCED: Simulate loading for insights calculation
  const simulateInsightLoading = useCallback((insightType, duration = 800) => {
    setLoadingStates(prev => ({ ...prev, [insightType]: true }));
    setTimeout(() => {
      setLoadingStates(prev => ({ ...prev, [insightType]: false }));
    }, duration);
  }, []);

  // UPDATED: Trigger loading when time range or metric changes - removed redundant sections
  useEffect(() => {
    simulateInsightLoading('progressTrends', 600);
    setTimeout(() => simulateInsightLoading('patternRecognition', 800), 200);
    setTimeout(() => simulateInsightLoading('optimization', 600), 400);
    setTimeout(() => simulateInsightLoading('phaseEvolution', 900), 600);
    
    // Only load relapse patterns if user has actual relapse data
    const hasRelapseData = safeUserData.streakHistory?.some(streak => 
      streak && streak.reason === 'relapse' && streak.trigger
    );
    if (hasRelapseData) {
      setTimeout(() => simulateInsightLoading('relapsePatterns', 900), 800);
    }
  }, [timeRange, selectedMetric, simulateInsightLoading, safeUserData.streakHistory]);

  // Handle metric selection
  const handleMetricClick = useCallback((metric) => {
    setSelectedMetric(metric);
  }, []);

  // NEW: Handle stat card click
  const handleStatCardClick = useCallback((statType) => {
    // Only show modals for the clickable cards (not current streak)
    if (statType === 'currentStreak') return;
    
    setSelectedStatCard(statType);
    setShowStatModal(true);
  }, []);

  // UPDATED: Memoized calculations - removed redundant AI calculations, added Progress Trends
  const memoizedInsights = useMemo(() => {
    if (!safeUserData) return {};
    
    return {
      progressTrends: calculateProgressTrends(safeUserData, timeRange),
      patternInsights: generatePatternRecognition(safeUserData, selectedMetric, true),
      optimizationGuidance: generateOptimizationGuidance(safeUserData, selectedMetric, timeRange, true),
      dataQuality: calculateDataQuality(safeUserData),
      phaseEvolution: calculatePhaseEvolutionAnalysis(safeUserData, selectedMetric),
      relapsePatterns: generateRelapsePatternAnalysis(safeUserData),
      daysSinceLastRelapse: calculateDaysSinceLastRelapse(safeUserData)
    };
  }, [safeUserData, timeRange, selectedMetric]);

  // Auto-check badges when streak changes
  useEffect(() => {
    if (safeUserData && safeUserData.currentStreak !== undefined) {
      const updatedData = checkAndUpdateBadges(safeUserData);
      
      if (JSON.stringify(updatedData.badges) !== JSON.stringify(safeUserData.badges)) {
        updateUserData?.(updatedData);
      }
    }
  }, [safeUserData?.currentStreak, safeUserData?.longestStreak, updateUserData, safeUserData]);

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
            reason: 'manual_reset'
          }],
          badges: safeUserData.badges?.map(badge => ({
            ...badge,
            earned: false,
            date: null
          })) || []
        };
        toast.success('All progress reset. History preserved.');
        break;

      case 'everything':
        resetUserData = {
          ...safeUserData,
          startDate: today,
          currentStreak: 0,
          longestStreak: 0,
          wetDreamCount: 0,
          relapseCount: 0,
          badges: safeUserData.badges?.map(badge => ({
            ...badge,
            earned: false,
            date: null
          })) || [],
          benefitTracking: [],
          streakHistory: [{
            id: 1,
            start: today,
            end: null,
            days: 0,
            reason: 'manual_reset'
          }],
          notes: {}
        };
        toast.success('Complete reset performed. Fresh start!');
        break;

      default:
        toast.error('Invalid reset option');
        return;
    }
    
    updateUserData(resetUserData);
    setShowSmartResetDialog(false);
  }, [safeUserData, updateUserData]);

  // ADDED: Premium upgrade handler
  const handleUpgradeClick = () => {
    toast.success('Premium upgrade coming soon!');
  };
  
  // Get current insight for preview
  const getCurrentInsight = () => {
    const insights = memoizedInsights.patternInsights;
    if (!insights || insights.length === 0) {
      return `Track your ${selectedMetric} daily to unlock personalized insights and pattern analysis.`;
    }
    return insights[0];
  };
  
  // Calculate if user has insufficient data for insights
  const hasInsufficientData = useMemo(() => {
    const trackedDays = safeUserData.benefitTracking?.length || 0;
    return trackedDays < 7;
  }, [safeUserData.benefitTracking]);
  
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        enabled: true,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: '#fff',
        bodyColor: '#fff',
        borderColor: 'var(--primary)',
        borderWidth: 1,
        padding: 12,
        displayColors: false,
        callbacks: {
          title: (context) => {
            return format(new Date(context[0].label), 'MMM d, yyyy');
          },
          label: (context) => {
            return `${selectedMetric === 'sleep' ? 'Sleep Quality' : selectedMetric.charAt(0).toUpperCase() + selectedMetric.slice(1)}: ${context.parsed.y}/10`;
          }
        }
      }
    },
    scales: {
      x: {
        grid: {
          color: 'rgba(255, 255, 255, 0.05)',
          borderColor: 'rgba(255, 255, 255, 0.1)'
        },
        ticks: {
          color: 'var(--text-secondary)',
          maxRotation: 45,
          minRotation: 45,
          font: {
            size: 11
          }
        }
      },
      y: {
        min: 0,
        max: 10,
        grid: {
          color: 'rgba(255, 255, 255, 0.05)',
          borderColor: 'rgba(255, 255, 255, 0.1)'
        },
        ticks: {
          color: 'var(--text-secondary)',
          stepSize: 2,
          font: {
            size: 11
          }
        }
      }
    }
  };

  return (
    <div className="stats-container">
      {/* Header */}
      <div className="stats-header-section">
        <div className="stats-header-content">
          <h2>Performance Analytics</h2>
          <p className="stats-subtitle">
            Track your journey and optimize your results
          </p>
        </div>
      </div>

      {/* Quick Stats Grid */}
      <div className="quick-stats-grid">
        <div className="stat-card current-streak">
          <div className="stat-value">{safeUserData.currentStreak || 0}</div>
          <div className="stat-label">Current Streak</div>
        </div>
        
        <div 
          className="stat-card longest-streak clickable-stat" 
          onClick={() => handleStatCardClick('longestStreak')}
          onKeyDown={(e) => e.key === 'Enter' && handleStatCardClick('longestStreak')}
          tabIndex={0}
          role="button"
          aria-label="View longest streak details"
        >
          <div className="stat-value">{safeUserData.longestStreak || 0}</div>
          <div className="stat-label">Longest Streak</div>
        </div>
        
        <div 
          className="stat-card wet-dreams clickable-stat" 
          onClick={() => handleStatCardClick('wetDreams')}
          onKeyDown={(e) => e.key === 'Enter' && handleStatCardClick('wetDreams')}
          tabIndex={0}
          role="button"
          aria-label="View wet dream analysis"
        >
          <div className="stat-value">{safeUserData.wetDreamCount || 0}</div>
          <div className="stat-label">Wet Dreams</div>
        </div>
        
        <div 
          className="stat-card total-relapses clickable-stat" 
          onClick={() => handleStatCardClick('relapses')}
          onKeyDown={(e) => e.key === 'Enter' && handleStatCardClick('relapses')}
          tabIndex={0}
          role="button"
          aria-label="View relapse analysis"
        >
          <div className="stat-value">{safeUserData.relapseCount || 0}</div>
          <div className="stat-label">Relapses</div>
        </div>
      </div>
      
      {/* Stat Card Details Modal */}
      <StatCardModal
        showModal={showStatModal}
        selectedStatCard={selectedStatCard}
        onClose={() => setShowStatModal(false)}
        userData={safeUserData}
      />
      
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
                className={`metric-btn focus ${selectedMetric === 'focus' ? 'active' : ''}`}
                onClick={() => handleMetricClick('focus')}
                onKeyDown={(e) => e.key === 'Enter' && handleMetricClick('focus')}
                tabIndex={0}
                aria-pressed={selectedMetric === 'focus'}
              >
                Focus
              </button>
              <button 
                className={`metric-btn confidence ${selectedMetric === 'confidence' ? 'active' : ''}`}
                onClick={() => handleMetricClick('confidence')}
                onKeyDown={(e) => e.key === 'Enter' && handleMetricClick('confidence')}
                tabIndex={0}
                aria-pressed={selectedMetric === 'confidence'}
              >
                Confidence
              </button>
              <button 
                className={`metric-btn aura ${selectedMetric === 'aura' ? 'active' : ''}`}
                onClick={() => handleMetricClick('aura')}
                onKeyDown={(e) => e.key === 'Enter' && handleMetricClick('aura')}
                tabIndex={0}
                aria-pressed={selectedMetric === 'aura'}
              >
                Aura
              </button>
              <button 
                className={`metric-btn sleep ${selectedMetric === 'sleep' ? 'active' : ''}`}
                onClick={() => handleMetricClick('sleep')}
                onKeyDown={(e) => e.key === 'Enter' && handleMetricClick('sleep')}
                tabIndex={0}
                aria-pressed={selectedMetric === 'sleep'}
              >
                Sleep
              </button>
              <button 
                className={`metric-btn workout ${selectedMetric === 'workout' ? 'active' : ''}`}
                onClick={() => handleMetricClick('workout')}
                onKeyDown={(e) => e.key === 'Enter' && handleMetricClick('workout')}
                tabIndex={0}
                aria-pressed={selectedMetric === 'workout'}
              >
                Workout
              </button>
            </div>
          </div>
          
          <div className="time-range-selector">
            <button 
              className={`time-range-btn ${timeRange === 'week' ? 'active' : ''}`}
              onClick={() => setTimeRange('week')}
            >
              7 Days
            </button>
            <button 
              className={`time-range-btn ${timeRange === 'month' ? 'active' : ''}`}
              onClick={() => setTimeRange('month')}
            >
              30 Days
            </button>
            <button 
              className={`time-range-btn ${timeRange === 'quarter' ? 'active' : ''}`}
              onClick={() => setTimeRange('quarter')}
            >
              3 Months
            </button>
          </div>
        </div>
        
        {/* FREE USER CONTENT: Average + One Insight */}
        {!isPremium && (
          <div className="free-benefit-preview">
            {/* Average Display */}
            <div className="free-average-display">
              <div className="current-metric-average">
                <div className="current-metric-label">Average {selectedMetric === 'sleep' ? 'Sleep Quality' : selectedMetric.charAt(0).toUpperCase() + selectedMetric.slice(1)}</div>
                <div className="current-metric-value">{calculateAverage(safeUserData, selectedMetric, timeRange, true)}/10</div>
              </div>
            </div>
            
            {/* Single Insight Preview */}
            <div className="free-insight-preview">
              <div className="current-insight-card">
                <div className="current-insight-header">
                  <FaRegLightbulb className="insight-icon" />
                  <span>Sample Insight</span>
                </div>
                <div className="current-insight-text">
                  {getCurrentInsight()}
                </div>
              </div>
            </div>
            
            {/* PREMIUM UPGRADE CTA */}
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
        
        {/* PREMIUM USER CONTENT: Full Analysis */}
        {isPremium && (
          <>
            {/* Chart and Current Insight Container - REF MARKER for scroll detection */}
            <div className="chart-and-insight-container" ref={insightsStartRef}>
              <div className="chart-container">
                <Line data={generateChartData(safeUserData, selectedMetric, timeRange)} options={chartOptions} height={300} />
              </div>
              
              <div className="current-insight-sidebar">
                <div className="current-metric-average">
                  <div className="current-metric-label">Average {selectedMetric === 'sleep' ? 'Sleep Quality' : selectedMetric.charAt(0).toUpperCase() + selectedMetric.slice(1)} {getTimeRangeDisplayText(timeRange)}</div>
                  <div className="current-metric-value">
                    {calculateAverage(safeUserData, selectedMetric, timeRange, true) === 'N/A' ? 'N/A' : `${calculateAverage(safeUserData, selectedMetric, timeRange, true)}/10`}
                  </div>
                </div>
                
                <div className="current-insight-card">
                  <div className="current-insight-header">
                    <span>Current Status</span>
                  </div>
                  <div className="current-insight-text">
                    {(() => {
                      const avg = calculateAverage(safeUserData, selectedMetric, timeRange, true);
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
            
            {/* UPDATED: Personalized Insights Section - Removed redundant AI sections */}
            <div className="personalized-insights-section">
              <div className="personalized-insights-header">
                <h3>Personalized Insights</h3>
              </div>
              
              {/* NEW: Progress & Trends Analysis - Historical trajectory */}
              <ProgressTrendsAnalysis
                isLoading={loadingStates.progressTrends}
                hasInsufficientData={hasInsufficientData}
                userData={safeUserData}
                progressTrends={memoizedInsights.progressTrends}
                dataQuality={memoizedInsights.dataQuality}
                selectedMetric={selectedMetric}
              />
              
              {/* Relapse Pattern Analytics */}
              <RelapsePatternAnalytics
                isLoading={loadingStates.relapsePatterns}
                relapsePatterns={memoizedInsights.relapsePatterns}
                daysSinceLastRelapse={memoizedInsights.daysSinceLastRelapse}
              />
              
              {/* Pattern Recognition */}
              <PatternRecognition
                isLoading={loadingStates.patternRecognition}
                hasInsufficientData={hasInsufficientData}
                userData={safeUserData}
                patternInsights={memoizedInsights.patternInsights}
                dataQuality={memoizedInsights.dataQuality}
              />
              
              {/* Optimization Guidance */}
              <OptimizationGuidance
                isLoading={loadingStates.optimization}
                hasInsufficientData={hasInsufficientData}
                userData={safeUserData}
                optimizationGuidance={memoizedInsights.optimizationGuidance}
                dataQuality={memoizedInsights.dataQuality}
              />
              
              {/* Phase Evolution Analysis */}
              <PhaseEvolutionAnalysis
                isLoading={loadingStates.phaseEvolution}
                phaseEvolution={memoizedInsights.phaseEvolution}
                selectedMetric={selectedMetric}
                dataQuality={memoizedInsights.dataQuality}
                currentStreak={safeUserData.currentStreak}
              />
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
                  'You completed your first week! This is where the journey truly begins. Keep the momentum strong.' :
                selectedBadge.name === '14-Day Monk' ?
                  'Two full weeks of discipline! You\'re building unshakable willpower. The benefits are compounding.' :
                selectedBadge.name === '30-Day Master' ?
                  'A full month conquered! You\'ve proven your commitment to growth. The path ahead is yours to shape.' :
                selectedBadge.name === '90-Day King' ?
                  'Ninety days of transformation! You\'ve reached elite status. Your dedication is an inspiration to all who follow.' :
                  'Milestone achieved through dedication and perseverance.'}
              </p>
            </div>
            
            <button className="badge-modal-close-btn" onClick={() => setShowBadgeModal(false)}>
              <FaTimes />
              Close
            </button>
          </div>
        </div>
      )}
      
      {/* Smart Reset Dialog */}
      <SmartResetDialog
        isOpen={showSmartResetDialog}
        onClose={() => setShowSmartResetDialog(false)}
        onConfirm={confirmResetStats}
        userData={safeUserData}
      />
    </div>
  );
};

export default Stats;