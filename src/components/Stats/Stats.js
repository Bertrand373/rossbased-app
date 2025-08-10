// components/Stats/Stats.js - UPDATED: All features unlocked for everyone
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
  SmartUrgeManagement, 
  RelapseRiskPredictor, 
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
  generateUrgeManagementGuidance,
  generatePatternRecognition,
  generateOptimizationGuidance,
  calculatePhaseEvolutionAnalysis,
  calculateRelapseRisk,
  generateRelapsePatternAnalysis
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
  
  // ENHANCED: Loading states for insights
  const [loadingStates, setLoadingStates] = useState({
    urgeManagement: false,
    riskPredictor: false,
    patternRecognition: false,
    optimization: false,
    relapsePatterns: false,
    phaseEvolution: false
  });
  
  const insightsStartRef = useRef(null);

  // ENHANCED: Defensive programming - ensure userData structure
  const safeUserData = useMemo(() => validateUserData(userData), [userData]);

  // REMOVED: Premium restrictions on metric selection
  // All users can now access all metrics

  // ENHANCED: Simulate loading for insights calculation
  const simulateInsightLoading = useCallback((insightType, duration = 800) => {
    setLoadingStates(prev => ({ ...prev, [insightType]: true }));
    setTimeout(() => {
      setLoadingStates(prev => ({ ...prev, [insightType]: false }));
    }, duration);
  }, []);

  // ENHANCED: Trigger loading when time range or metric changes
  useEffect(() => {
    // CHANGED: Always load insights since everyone is premium
    simulateInsightLoading('urgeManagement', 600);
    setTimeout(() => simulateInsightLoading('riskPredictor', 700), 200);
    setTimeout(() => simulateInsightLoading('patternRecognition', 800), 400);
    setTimeout(() => simulateInsightLoading('optimization', 600), 600);
    setTimeout(() => simulateInsightLoading('phaseEvolution', 900), 800);
    
    // Only load relapse patterns if user has actual relapse data
    const hasRelapseData = safeUserData.streakHistory?.some(streak => 
      streak && streak.reason === 'relapse' && streak.trigger
    );
    if (hasRelapseData) {
      setTimeout(() => simulateInsightLoading('relapsePatterns', 900), 1000);
    }
  }, [timeRange, selectedMetric, simulateInsightLoading, safeUserData.streakHistory]);

  // Handle metric selection - REMOVED: Premium restrictions
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

  // ENHANCED: Memoized calculations for performance
  const memoizedInsights = useMemo(() => {
    if (!safeUserData) return {};
    
    return {
      riskAnalysis: calculateRelapseRisk(safeUserData, timeRange, true), // Always premium
      urgeManagement: generateUrgeManagementGuidance(safeUserData, timeRange),
      patternInsights: generatePatternRecognition(safeUserData, selectedMetric, true), // Always premium
      optimizationGuidance: generateOptimizationGuidance(safeUserData, selectedMetric, timeRange, true), // Always premium
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
    toast.success('All features are now free! 🎉');
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
      {/* UPDATED: Header with integrated design */}
      <div className="stats-header">
        <div className="stats-header-title-section">
          <h2>Your Stats</h2>
        </div>
        <div className="stats-header-actions-section">
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
          className="stat-card total-wetdreams clickable-stat" 
          onClick={() => handleStatCardClick('wetDreams')}
          onKeyDown={(e) => e.key === 'Enter' && handleStatCardClick('wetDreams')}
          tabIndex={0}
          role="button"
          aria-label="View wet dreams analysis"
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
                Sleep Quality
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
        </div>
        
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
        
        {/* Personalized Insights Section */}
        <div className="personalized-insights-section">
          <div className="personalized-insights-header">
            <h3>Personalized Insights</h3>
          </div>
          
          {/* Smart Urge Management */}
          <SmartUrgeManagement
            isLoading={loadingStates.urgeManagement}
            hasInsufficientData={hasInsufficientData}
            userData={safeUserData}
            urgeManagement={memoizedInsights.urgeManagement}
            dataQuality={memoizedInsights.dataQuality}
          />
          
          {/* Relapse Risk Predictor */}
          <RelapseRiskPredictor
            isLoading={loadingStates.riskPredictor}
            hasInsufficientData={hasInsufficientData}
            userData={safeUserData}
            riskAnalysis={memoizedInsights.riskAnalysis}
            dataQuality={memoizedInsights.dataQuality}
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