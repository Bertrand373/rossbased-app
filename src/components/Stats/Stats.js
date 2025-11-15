// components/Stats/Stats.js - UPDATED: Added sliding pill menu for benefit tracker
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
  
  // ENHANCED: Loading states for insights
  const [loadingStates, setLoadingStates] = useState({
    progressTrends: false,
    patternRecognition: false,
    optimization: false,
    relapsePatterns: false,
    phaseEvolution: false
  });
  
  // NEW: States for sliding pill animations
  const [metricIndicatorStyle, setMetricIndicatorStyle] = useState({});
  const [timeIndicatorStyle, setTimeIndicatorStyle] = useState({});
  const metricButtonRefs = useRef({});
  const timeButtonRefs = useRef({});
  
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

  // ENHANCED: Trigger loading when time range or metric changes
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

  // NEW: Update indicator position for metric pills
  const updateMetricIndicator = useCallback((metric) => {
    const button = metricButtonRefs.current[metric];
    if (button) {
      const { offsetLeft, offsetWidth } = button;
      setMetricIndicatorStyle({
        width: `${offsetWidth}px`,
        transform: `translateX(${offsetLeft}px)`
      });
    }
  }, []);

  // NEW: Update indicator position for time range pills
  const updateTimeIndicator = useCallback((range) => {
    const button = timeButtonRefs.current[range];
    if (button) {
      const { offsetLeft, offsetWidth } = button;
      setTimeIndicatorStyle({
        width: `${offsetWidth}px`,
        transform: `translateX(${offsetLeft}px)`
      });
    }
  }, []);

  // NEW: Initialize indicators on mount and when selections change
  useEffect(() => {
    updateMetricIndicator(selectedMetric);
  }, [selectedMetric, updateMetricIndicator]);

  useEffect(() => {
    updateTimeIndicator(timeRange);
  }, [timeRange, updateTimeIndicator]);

  // NEW: Handle window resize to update indicator positions
  useEffect(() => {
    const handleResize = () => {
      updateMetricIndicator(selectedMetric);
      updateTimeIndicator(timeRange);
    };

    window.addEventListener('resize', handleResize);
    // Initial position setting after a brief delay to ensure DOM is ready
    setTimeout(() => {
      updateMetricIndicator(selectedMetric);
      updateTimeIndicator(timeRange);
    }, 100);

    return () => window.removeEventListener('resize', handleResize);
  }, [selectedMetric, timeRange, updateMetricIndicator, updateTimeIndicator]);

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

  // ENHANCED: Memoized calculations for performance
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
        toast.success('Current streak reset to Day 0');
        break;
      
      case 'benefitData':
        resetUserData = {
          ...safeUserData,
          benefitTracking: []
        };
        toast.success('Benefit tracking data cleared');
        break;
        
      case 'wetDreams':
        resetUserData = {
          ...safeUserData,
          wetDreamCount: 0,
          wetDreamDates: []
        };
        toast.success('Wet dream count reset');
        break;
        
      case 'badges':
        resetUserData = {
          ...safeUserData,
          badges: []
        };
        toast.success('All badges reset');
        break;
        
      case 'all':
      default:
        resetUserData = {
          ...safeUserData,
          currentStreak: 0,
          longestStreak: 0,
          wetDreamCount: 0,
          relapseCount: 0,
          benefitTracking: [],
          streakHistory: [],
          badges: [],
          startDate: today,
          wetDreamDates: []
        };
        toast.success('All stats have been reset');
        break;
    }

    updateUserData(resetUserData);
    setShowSmartResetDialog(false);
  }, [safeUserData, updateUserData]);

  // ENHANCED: Calculate graph data with safe defaults
  const filteredData = useMemo(() => 
    getFilteredBenefitData(safeUserData, selectedMetric, timeRange),
    [safeUserData, selectedMetric, timeRange]
  );

  const avgValue = useMemo(() => 
    calculateAverage(filteredData),
    [filteredData]
  );

  const data = useMemo(() => 
    generateChartData(filteredData, selectedMetric),
    [filteredData, selectedMetric]
  );

  const options = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 750,
      easing: 'easeInOutQuart'
    },
    plugins: {
      legend: { display: false },
      title: { display: false },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: '#fff',
        bodyColor: '#fff',
        borderColor: '#ffdd00',
        borderWidth: 1,
        cornerRadius: 8,
        padding: 12,
        displayColors: false,
        callbacks: {
          label: function(context) {
            return `${selectedMetric.charAt(0).toUpperCase() + selectedMetric.slice(1)}: ${context.parsed.y}/10`;
          }
        }
      }
    },
    scales: {
      y: { 
        beginAtZero: true, 
        max: 10,
        ticks: { 
          color: '#999',
          font: { size: 12 }
        },
        grid: {
          color: 'rgba(255, 255, 255, 0.05)',
          drawBorder: false
        }
      },
      x: {
        ticks: { 
          color: '#999',
          font: { size: 11 }
        },
        grid: { 
          display: false,
          drawBorder: false
        }
      }
    },
    interaction: {
      intersect: false,
      mode: 'index'
    },
    hover: {
      mode: 'nearest',
      animationDuration: 200
    }
  }), [selectedMetric]);

  const hasInsufficientData = useMemo(() => 
    shouldShowInfoBanner(safeUserData),
    [safeUserData]
  );

  const currentPhase = getCurrentPhase(safeUserData.currentStreak);
  const phaseColor = {
    Foundation: '#666666',
    Adjustment: '#888888',
    Momentum: '#aaaaaa',
    Transformation: '#cccccc',
    Enlightenment: '#dddddd',
    Transcendence: '#ffdd00'
  }[currentPhase] || '#666666';

  const phaseGuidance = getPhaseGuidance(currentPhase);

  return (
    <div className="stats-container">
      {/* Header */}
      <div className="integrated-stats-header">
        <div className="stats-header-title-section">
          <h2>Analytics & Insights</h2>
          <div className="stats-header-subtitle">
            Track your journey • Understand patterns • Optimize growth
          </div>
        </div>
        <div className="stats-header-actions-section">
          <div className="stats-header-actions">
            <button 
              className="action-btn"
              onClick={handleResetStats}
              onKeyDown={(e) => e.key === 'Enter' && handleResetStats()}
              tabIndex={0}
              aria-label="Reset statistics"
            >
              <FaRedo />
              Reset Data
            </button>
          </div>
        </div>
      </div>

      <SmartResetDialog
        isOpen={showSmartResetDialog}
        onClose={() => setShowSmartResetDialog(false)}
        onConfirm={confirmResetStats}
      />

      {/* Statistics Cards */}
      <div className="stats-cards">
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
              className="badge-card earned"
              onClick={() => handleBadgeClick(badge)}
              onKeyDown={(e) => e.key === 'Enter' && handleBadgeClick(badge)}
              tabIndex={0}
              role="button"
              aria-label={`View ${badge.name} badge details`}
            >
              <div className="badge-icon">
                <FaMedal />
              </div>
              <div className="badge-name">{badge.name}</div>
              <div className="badge-date">
                {badge.date ? formatDate(badge.date) : 'Earned'}
              </div>
            </div>
          ))}
          
          {/* Empty badges */}
          {Array.from({ length: Math.max(0, 4 - (safeUserData.badges?.length || 0)) }).map((_, index) => (
            <div key={`empty-${index}`} className="badge-card">
              <div className="badge-icon locked">
                <FaLock />
              </div>
              <div className="badge-name">Locked</div>
              <div className="badge-date">—</div>
            </div>
          ))}
        </div>
      </div>

      {/* NEW: Energy Intelligence Section */}
      <EnergyIntelligenceSection userData={safeUserData} />

      {/* Benefit Tracker */}
      <div className="benefit-tracker-section">
        <h3 ref={insightsStartRef}>Benefit Tracker</h3>
        
        <div className="tracker-controls">
          <div className="metric-selector">
            {/* UPDATED: Sliding pill container for metrics */}
            <div className="metric-pill-container">
              <div 
                className="sliding-pill-indicator"
                style={metricIndicatorStyle}
              />
              <button 
                ref={el => metricButtonRefs.current['energy'] = el}
                className={`metric-btn energy ${selectedMetric === 'energy' ? 'active' : ''}`}
                onClick={() => handleMetricClick('energy')}
                onKeyDown={(e) => e.key === 'Enter' && handleMetricClick('energy')}
                tabIndex={0}
                aria-pressed={selectedMetric === 'energy'}
              >
                Energy
              </button>
              <button 
                ref={el => metricButtonRefs.current['focus'] = el}
                className={`metric-btn focus ${selectedMetric === 'focus' ? 'active' : ''}`}
                onClick={() => handleMetricClick('focus')}
                onKeyDown={(e) => e.key === 'Enter' && handleMetricClick('focus')}
                tabIndex={0}
                aria-pressed={selectedMetric === 'focus'}
              >
                Focus
              </button>
              <button 
                ref={el => metricButtonRefs.current['confidence'] = el}
                className={`metric-btn confidence ${selectedMetric === 'confidence' ? 'active' : ''}`}
                onClick={() => handleMetricClick('confidence')}
                onKeyDown={(e) => e.key === 'Enter' && handleMetricClick('confidence')}
                tabIndex={0}
                aria-pressed={selectedMetric === 'confidence'}
              >
                Confidence
              </button>
              <button 
                ref={el => metricButtonRefs.current['aura'] = el}
                className={`metric-btn aura ${selectedMetric === 'aura' ? 'active' : ''}`}
                onClick={() => handleMetricClick('aura')}
                onKeyDown={(e) => e.key === 'Enter' && handleMetricClick('aura')}
                tabIndex={0}
                aria-pressed={selectedMetric === 'aura'}
              >
                Aura
              </button>
              <button 
                ref={el => metricButtonRefs.current['sleep'] = el}
                className={`metric-btn sleep ${selectedMetric === 'sleep' ? 'active' : ''}`}
                onClick={() => handleMetricClick('sleep')}
                onKeyDown={(e) => e.key === 'Enter' && handleMetricClick('sleep')}
                tabIndex={0}
                aria-pressed={selectedMetric === 'sleep'}
              >
                Sleep Quality
              </button>
              <button 
                ref={el => metricButtonRefs.current['workout'] = el}
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
          
          {/* UPDATED: Sliding pill container for time range */}
          <div className="time-range-selector-container">
            <div className="time-range-selector" role="radiogroup" aria-label="Time range selection">
              <div 
                className="sliding-pill-indicator"
                style={timeIndicatorStyle}
              />
              <button 
                ref={el => timeButtonRefs.current['week'] = el}
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
                ref={el => timeButtonRefs.current['month'] = el}
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
                ref={el => timeButtonRefs.current['quarter'] = el}
                className={`time-btn ${timeRange === 'quarter' ? 'active' : ''}`}
                onClick={() => setTimeRange('quarter')}
                onKeyDown={(e) => e.key === 'Enter' && setTimeRange('quarter')}
                tabIndex={0}
                role="radio"
                aria-checked={timeRange === 'quarter'}
              >
                3 Months
              </button>
              <button 
                ref={el => timeButtonRefs.current['all'] = el}
                className={`time-btn ${timeRange === 'all' ? 'active' : ''}`}
                onClick={() => setTimeRange('all')}
                onKeyDown={(e) => e.key === 'Enter' && setTimeRange('all')}
                tabIndex={0}
                role="radio"
                aria-checked={timeRange === 'all'}
              >
                All Time
              </button>
            </div>
          </div>
        </div>

        {/* Chart and Current Insight Section */}
        <div className="chart-and-insight-container">
          {/* Chart */}
          <div className="chart-container">
            {filteredData.length > 0 ? (
              <Line data={data} options={options} />
            ) : (
              <div className="no-chart-data">
                <div className="no-data-icon">
                  <FaChartLine />
                </div>
                <div className="no-data-text">
                  <h4>No Data Available</h4>
                  <p>Track your daily benefits to see your progress here</p>
                </div>
              </div>
            )}
          </div>

          {/* Current Insight Sidebar */}
          <div className="current-insight-sidebar">
            <div 
              className="current-metric-average"
              style={{ '--phase-color': phaseColor }}
            >
              <div className="current-metric-label">
                {getTimeRangeDisplayText(timeRange)} Average
              </div>
              <div className="current-metric-value">
                {avgValue || 'N/A'}
              </div>
            </div>
            
            <div className="current-insight-card">
              <div className="current-insight-header">
                <FaShieldAlt className="insight-icon" />
                Current Phase
              </div>
              <div className="current-insight-text">
                <strong>{currentPhase} Phase</strong> - {phaseGuidance}
              </div>
            </div>
            
            <div className="current-insight-card">
              <div className="current-insight-header">
                <FaRegLightbulb className="insight-icon" />
                Quick Insight
              </div>
              <div className="current-insight-text">
                {(() => {
                  const avg = avgValue || 'N/A';
                  const phase = currentPhase.toLowerCase();
                  
                  if (avg === 'N/A') {
                    return 'Start tracking your benefits to receive personalized insights about your journey.';
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
          
          {/* Progress & Trends Analysis */}
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
      </div>
      
      {/* Badge Modal */}
      {showBadgeModal && selectedBadge && (
        <div className="modal-overlay" onClick={() => setShowBadgeModal(false)} role="dialog" aria-modal="true" aria-labelledby="badge-modal-title">
          <div className="modal-content badge-modal" onClick={e => e.stopPropagation()}>
            <button 
              className="badge-modal-close"
              onClick={() => setShowBadgeModal(false)}
              aria-label="Close modal"
            >
              <FaTimes />
            </button>
            
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
                className="modal-got-it-btn" 
                onClick={() => setShowBadgeModal(false)}
                onKeyDown={(e) => e.key === 'Enter' && setShowBadgeModal(false)}
              >
                <FaCheckCircle />
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