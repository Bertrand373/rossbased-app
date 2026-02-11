// Stats.js - TITANTRACK
// Matches Landing/Tracker minimalist aesthetic
// UPDATED: Your Patterns now shows streak-phase proof instead of day-of-week patterns
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { format } from 'date-fns';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler } from 'chart.js';
import './Stats.css';
import toast from 'react-hot-toast';

// Import extracted components
import { StatCardModal } from './StatsComponents';
import { 
  YourNumbers,
  YourPatterns,
  AIInsights,
  RelapseAnalytics,
  PhaseContext
} from './StatsInsights';

// Import ShareCard component
import ShareCard from '../ShareCard/ShareCard';

// Import utility functions
import {
  getTimeRangeDisplayText,
  generateChartData,
  calculateAverage,
  calculateDataQuality,
  calculateDaysSinceLastRelapse,
  validateUserData
} from './StatsUtils';

// Import analytics functions - UPDATED: Added calculateStreakPhaseAverages
import {
  getPhaseInfo,
  calculateMetricAverages,
  calculateMetricTrends,
  identifyMetricExtremes,
  calculateStreakPhaseAverages,
  calculateMetricCorrelations,
  calculateGrowthRates,
  generateRelapsePatternAnalysis,
  discoverMLPatterns,
  generateMLOptimization
} from './StatsAnalyticsUtils';

// Body scroll lock for modals
import useBodyScrollLock from '../../hooks/useBodyScrollLock';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

const Stats = ({ userData, isPremium, updateUserData }) => {
  const [selectedMetric, setSelectedMetric] = useState('energy');
  const [timeRange, setTimeRange] = useState('week');
  const [showMilestoneModal, setShowMilestoneModal] = useState(false);
  const [selectedMilestone, setSelectedMilestone] = useState(null);
  const [showResetStreakModal, setShowResetStreakModal] = useState(false);
  const [showResetAllModal, setShowResetAllModal] = useState(false);
  const [showStatModal, setShowStatModal] = useState(false);
  const [selectedStatCard, setSelectedStatCard] = useState(null);
  
  // Theme detection for chart colors
  const [isDarkTheme, setIsDarkTheme] = useState(() => {
    return document.documentElement.getAttribute('data-theme') !== 'light';
  });
  
  // ML pattern state
  const [mlPatterns, setMLPatterns] = useState(null);
  const [mlOptimization, setMLOptimization] = useState(null);
  
  const [loadingStates, setLoadingStates] = useState({
    numbers: true,
    patterns: true,
    ai: true,
    relapse: true
  });

  const chartRef = useRef(null);
  const safeUserData = useMemo(() => validateUserData(userData), [userData]);
  
  // Lock body scroll when any modal is open
  useBodyScrollLock(showMilestoneModal || showResetStreakModal || showResetAllModal || showStatModal);
  
  // Detect theme changes for chart colors
  useEffect(() => {
    const checkTheme = () => {
      setIsDarkTheme(document.documentElement.getAttribute('data-theme') !== 'light');
    };
    
    // Check on mount
    checkTheme();
    
    // Watch for theme changes
    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, { 
      attributes: true, 
      attributeFilter: ['data-theme'] 
    });
    
    return () => observer.disconnect();
  }, []);
  
  // Get days tracked for unlock logic
  const daysTracked = useMemo(() => {
    return safeUserData.benefitTracking?.length || 0;
  }, [safeUserData.benefitTracking]);
  
  // Get relapse count for AI unlock logic
  const relapseCount = useMemo(() => {
    return (safeUserData.streakHistory || []).filter(s => s.reason === 'relapse').length;
  }, [safeUserData.streakHistory]);

  useEffect(() => {
    if (isPremium) {
      const timers = [
        setTimeout(() => setLoadingStates(prev => ({ ...prev, numbers: false })), 300),
        setTimeout(() => setLoadingStates(prev => ({ ...prev, patterns: false })), 500),
        setTimeout(() => setLoadingStates(prev => ({ ...prev, ai: false })), 700),
        setTimeout(() => setLoadingStates(prev => ({ ...prev, relapse: false })), 400)
      ];
      return () => timers.forEach(clearTimeout);
    }
  }, [isPremium, selectedMetric]);

  // Load ML patterns when premium user has enough data
  useEffect(() => {
    const loadMLPatterns = async () => {
      if (!isPremium || daysTracked < 20) {
        setMLPatterns(null);
        setMLOptimization(null);
        return;
      }
      
      try {
        const patterns = await discoverMLPatterns(safeUserData);
        setMLPatterns(patterns);
        
        const optimization = await generateMLOptimization(safeUserData);
        setMLOptimization(optimization);
      } catch (error) {
        console.warn('ML patterns loading error:', error);
        setMLPatterns(null);
        setMLOptimization(null);
      }
    };
    
    loadMLPatterns();
  }, [safeUserData, isPremium, daysTracked]);

  // UPDATED: Memoized analytics - now includes streak-phase averages
  const memoizedInsights = useMemo(() => {
    if (!isPremium) return {};
    return {
      // Your Numbers data
      metricAverages: calculateMetricAverages(safeUserData, 7),
      metricTrends: calculateMetricTrends(safeUserData, 7, 7),
      metricExtremes: identifyMetricExtremes(safeUserData, 7),
      
      // Your Progress data (renamed from Patterns)
      streakPhaseAverages: calculateStreakPhaseAverages(safeUserData),
      metricCorrelations: calculateMetricCorrelations(safeUserData),
      growthRates: calculateGrowthRates(safeUserData, 30),
      
      // Relapse data
      relapsePatterns: generateRelapsePatternAnalysis(safeUserData),
      daysSinceLastRelapse: calculateDaysSinceLastRelapse(safeUserData),
      
      // Phase info (aligned with Emotional Timeline)
      phaseInfo: getPhaseInfo(safeUserData.currentStreak || 0)
    };
  }, [safeUserData, selectedMetric, isPremium]);

  // Milestones - with fallback date calculation for legacy accounts
  const milestones = useMemo(() => {
    const maxStreak = Math.max(safeUserData.currentStreak || 0, safeUserData.longestStreak || 0);
    const badges = safeUserData.badges || [];
    const streakHistory = safeUserData.streakHistory || [];
    const startDate = safeUserData.startDate;
    
    // Helper to calculate milestone date if badge entry is missing
    const getMilestoneDate = (badgeName, milestoneDays) => {
      // First, try to get date from badge
      const badge = badges.find(b => b.name === badgeName);
      if (badge?.date) return badge.date;
      
      // If no badge date but milestone was earned, calculate it
      if (maxStreak >= milestoneDays) {
        // Check if current streak reached this milestone
        const currentStreak = safeUserData.currentStreak || 0;
        if (currentStreak >= milestoneDays && startDate) {
          const milestoneDate = new Date(startDate);
          milestoneDate.setDate(milestoneDate.getDate() + milestoneDays);
          return milestoneDate;
        }
        
        // Check streak history for the first streak that reached this milestone
        for (const streak of streakHistory) {
          if (streak.days >= milestoneDays && streak.start) {
            const milestoneDate = new Date(streak.start);
            milestoneDate.setDate(milestoneDate.getDate() + milestoneDays);
            return milestoneDate;
          }
        }
      }
      
      return null;
    };
    
    return [
      { days: 7, label: '1 week', earned: maxStreak >= 7, date: getMilestoneDate('7-Day Warrior', 7) },
      { days: 14, label: '2 weeks', earned: maxStreak >= 14, date: getMilestoneDate('14-Day Monk', 14) },
      { days: 30, label: '1 month', earned: maxStreak >= 30, date: getMilestoneDate('30-Day Master', 30) },
      { days: 90, label: '3 months', earned: maxStreak >= 90, date: getMilestoneDate('90-Day King', 90) },
      { days: 180, label: '6 months', earned: maxStreak >= 180, date: getMilestoneDate('180-Day Emperor', 180) },
      { days: 365, label: '1 year', earned: maxStreak >= 365, date: getMilestoneDate('365-Day Sage', 365) }
    ];
  }, [safeUserData]);

  // Chart configuration - Clean trend line, endpoints only
  // Theme-aware colors for light/dark mode
  const chartOptions = useMemo(() => {
    const tickColor = isDarkTheme ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.25)';
    const gridColor = isDarkTheme ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.06)';
    const tooltipBg = isDarkTheme ? 'rgba(0,0,0,0.9)' : 'rgba(255,255,255,0.95)';
    const tooltipTitleColor = isDarkTheme ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.5)';
    const tooltipBodyColor = isDarkTheme ? '#ffffff' : '#000000';
    const tooltipBorderColor = isDarkTheme ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.1)';
    
    return {
    responsive: true,
    maintainAspectRatio: false,
    layout: {
      padding: { top: 20, right: 8, bottom: 0, left: 0 }
    },
    scales: {
      y: {
        min: 0,
        max: 10.5,
        ticks: { 
          stepSize: 5, 
          color: tickColor, 
          font: { size: 10, weight: '400' },
          padding: 8,
          callback: (value) => value <= 10 ? value : ''
        },
        grid: { 
          color: gridColor, 
          drawBorder: false
        },
        border: { display: false }
      },
      x: {
        ticks: { 
          color: tickColor, 
          font: { size: 9, weight: '400' }, 
          maxRotation: 0, 
          maxTicksLimit: timeRange === 'quarter' ? 5 : (timeRange === 'month' ? 6 : 7),
          padding: 4
        },
        grid: { display: false },
        border: { display: false }
      }
    },
    elements: {
      line: {
        tension: 0.4,
        borderWidth: 2.5,
        borderCapStyle: 'round',
        borderJoinStyle: 'round'
      },
      point: {
        radius: 0,
        hoverRadius: 6,
        hoverBorderWidth: 2,
        hitRadius: 30
      }
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        enabled: true,
        backgroundColor: tooltipBg,
        titleColor: tooltipTitleColor,
        titleFont: { size: 10, weight: '400' },
        bodyColor: tooltipBodyColor,
        bodyFont: { size: 16, weight: '600' },
        borderColor: tooltipBorderColor,
        borderWidth: 1,
        cornerRadius: 8,
        padding: { top: 8, right: 12, bottom: 8, left: 12 },
        displayColors: false,
        caretSize: 0,
        caretPadding: 10,
        callbacks: { 
          title: (items) => items.length ? items[0].label : '',
          label: (ctx) => ctx.parsed.y === null ? '' : `${ctx.parsed.y}`
        }
      }
    },
    interaction: { 
      mode: 'index', 
      intersect: false,
      axis: 'x'
    },
    animation: {
      duration: 400,
      easing: 'easeOutQuart'
    }
  }; }, [timeRange, isDarkTheme]);

  // Generate chart data with gradient fill and endpoint dots
  const getChartData = useCallback(() => {
    const rawData = generateChartData(safeUserData, selectedMetric, timeRange);
    const chart = chartRef.current;
    
    // Theme-aware colors
    const lineColor = isDarkTheme ? '#ffffff' : '#000000';
    const pointBorderColor = isDarkTheme ? '#000000' : '#ffffff';
    
    let gradient = isDarkTheme ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)';
    
    if (chart?.ctx && chart?.chartArea) {
      gradient = chart.ctx.createLinearGradient(0, chart.chartArea.top, 0, chart.chartArea.bottom);
      if (isDarkTheme) {
        gradient.addColorStop(0, 'rgba(255,255,255,0.1)');
        gradient.addColorStop(0.5, 'rgba(255,255,255,0.03)');
        gradient.addColorStop(1, 'rgba(255,255,255,0)');
      } else {
        gradient.addColorStop(0, 'rgba(0,0,0,0.08)');
        gradient.addColorStop(0.5, 'rgba(0,0,0,0.02)');
        gradient.addColorStop(1, 'rgba(0,0,0,0)');
      }
    }
    
    // Find first and last valid data points for endpoint dots
    const data = rawData.datasets[0].data;
    const pointRadii = data.map((value, index) => {
      if (value === null) return 0;
      
      const firstValidIndex = data.findIndex(v => v !== null);
      let lastValidIndex = -1;
      for (let i = data.length - 1; i >= 0; i--) {
        if (data[i] !== null) {
          lastValidIndex = i;
          break;
        }
      }
      
      if (index === firstValidIndex || index === lastValidIndex) {
        return 5;
      }
      return 0;
    });
    
    return {
      ...rawData,
      datasets: [{
        ...rawData.datasets[0],
        borderColor: lineColor,
        borderWidth: 2.5,
        backgroundColor: gradient,
        fill: true,
        pointBackgroundColor: lineColor,
        pointBorderColor: pointBorderColor,
        pointBorderWidth: 2,
        pointRadius: pointRadii,
        pointHoverRadius: 6,
        pointHoverBackgroundColor: lineColor,
        pointHoverBorderColor: pointBorderColor,
      }]
    };
  }, [safeUserData, selectedMetric, timeRange, isDarkTheme]);

  const handleStatCardClick = (statType) => {
    setSelectedStatCard(statType);
    setShowStatModal(true);
  };

  const handleMilestoneClick = (milestone) => {
    if (milestone.earned) {
      setSelectedMilestone(milestone);
      setShowMilestoneModal(true);
    }
  };

  const confirmResetStreak = async () => {
    try {
      await updateUserData({
        currentStreak: 0,
        startDate: new Date()
      });
      setShowResetStreakModal(false);
      toast.success('Streak reset');
    } catch (error) {
      toast.error('Failed to reset streak');
    }
  };

  const confirmResetAll = async () => {
    try {
      await updateUserData({
        currentStreak: 0,
        longestStreak: 0,
        wetDreamCount: 0,
        relapseCount: 0,
        benefitTracking: [],
        relapseHistory: [],
        streakHistory: [],
        badges: safeUserData.badges?.map(b => ({ ...b, earned: false, date: null })) || [],
        startDate: new Date()
      });
      setShowResetAllModal(false);
      toast.success('All data reset');
    } catch (error) {
      toast.error('Failed to reset data');
    }
  };

  // Metric toggle items
  const timeRanges = [
    { key: 'week', label: 'Week' },
    { key: 'month', label: 'Month' },
    { key: 'quarter', label: '90 Days' }
  ];

  return (
    <div className="stats-page">
      {/* Stat Cards - Hero primary stats, subdued secondary stats */}
      <div className="stat-grid">
        <div className="stat-row-primary">
          <button className="stat-card stat-card-primary" onClick={() => handleStatCardClick('currentStreak')}>
            <span className="stat-num">{safeUserData.currentStreak || 0}</span>
            <span className="stat-label">Current</span>
          </button>
          <button className="stat-card stat-card-primary" onClick={() => handleStatCardClick('longestStreak')}>
            <span className="stat-num">{safeUserData.longestStreak || 0}</span>
            <span className="stat-label">Longest</span>
          </button>
        </div>
        <div className="stat-row-secondary">
          <button className="stat-card stat-card-secondary" onClick={() => handleStatCardClick('wetDreams')}>
            <span className="stat-num">{safeUserData.wetDreamCount || 0}</span>
            <span className="stat-label">Wet Dreams</span>
          </button>
          <button className="stat-card stat-card-secondary" onClick={() => handleStatCardClick('relapses')}>
            <span className="stat-num">{safeUserData.relapseCount || 0}</span>
            <span className="stat-label">Relapses</span>
          </button>
        </div>
      </div>

      <StatCardModal
        showModal={showStatModal}
        selectedStatCard={selectedStatCard}
        onClose={() => setShowStatModal(false)}
        userData={safeUserData}
      />

      {/* Milestones */}
      <section className="stats-section">
        <h2>Milestones</h2>
        <div className="milestone-grid">
          {milestones.map((m) => (
            <button
              key={m.days}
              className={`milestone-card ${m.earned ? 'earned' : ''}`}
              onClick={() => handleMilestoneClick(m)}
              disabled={!m.earned}
            >
              <span className="milestone-num">{m.days}</span>
              <span className="milestone-label">{m.label}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Share Progress Card */}
      <ShareCard userData={safeUserData} isVisible={true} />

      {/* Benefit Tracker */}
      <section className="stats-section">
        <h2>Benefits</h2>
        
        {/* Metric toggles - Single row, wraps on mobile */}
        <div className="toggle-row benefits-row">
          {['energy', 'focus', 'confidence', 'aura', 'sleep', 'workout'].map((metric, index) => (
            <React.Fragment key={metric}>
              <button
                className={`toggle-btn ${selectedMetric === metric ? 'active' : ''}`}
                onClick={() => setSelectedMetric(metric)}
              >
                {metric.charAt(0).toUpperCase() + metric.slice(1)}
              </button>
              {index < 5 && <div className="toggle-divider" />}
            </React.Fragment>
          ))}
        </div>

        {/* Time range toggles */}
        <div className="toggle-row time-range">
          {timeRanges.map((r, index) => (
            <React.Fragment key={r.key}>
              <button
                className={`toggle-btn ${timeRange === r.key ? 'active' : ''}`}
                onClick={() => setTimeRange(r.key)}
              >
                {r.label}
              </button>
              {index < timeRanges.length - 1 && <div className="toggle-divider" />}
            </React.Fragment>
          ))}
        </div>

        {/* Average display - Hero number like Tracker */}
        <div className="average-block">
          <span className="average-num">{calculateAverage(safeUserData, selectedMetric, timeRange, isPremium)}</span>
          <span className="average-suffix">/10</span>
        </div>
        <p className="average-label">{selectedMetric} {getTimeRangeDisplayText(timeRange)}</p>

        {/* Chart */}
        <div className="chart-box">
          {(() => {
            const chartData = getChartData();
            const hasData = chartData.datasets[0].data.some(v => v !== null);
            if (!hasData) return <p className="chart-empty">Start tracking to see your progress</p>;
            return <Line ref={chartRef} data={chartData} options={chartOptions} />;
          })()}
        </div>

        {/* Free User */}
        {!isPremium && (
          <div className="free-section">
            <div className="free-card">
              <h3>Phase Context</h3>
              <p>Day {safeUserData.currentStreak || 0} · {memoizedInsights.phaseInfo?.name || 'Initial Adaptation'}</p>
            </div>
            <div className="upgrade-card">
              <p>Unlock detailed analytics and personalized optimization</p>
              <button className="btn-primary">Upgrade to Premium</button>
            </div>
          </div>
        )}

        {/* Premium Analytics - Pure data components */}
        {isPremium && (
          <>
            <div className="analytics-stack">
              {/* Section 1: Your Numbers - Always visible */}
              <YourNumbers
                metricAverages={memoizedInsights.metricAverages}
                metricTrends={memoizedInsights.metricTrends}
                metricExtremes={memoizedInsights.metricExtremes}
                daysTracked={daysTracked}
                isLoading={loadingStates.numbers}
              />
              
              {/* Section 2: Your Progress - Streak-phase proof + correlations */}
              <YourPatterns
                streakPhaseAverages={memoizedInsights.streakPhaseAverages}
                metricCorrelations={memoizedInsights.metricCorrelations}
                growthRates={memoizedInsights.growthRates}
                selectedMetric={selectedMetric}
                daysTracked={daysTracked}
                isLoading={loadingStates.patterns}
              />
              
              {/* Section 3: AI Insights - Unlocks at 20+ days AND 2+ relapses */}
              <AIInsights
                mlPatterns={mlPatterns}
                mlOptimization={mlOptimization}
                daysTracked={daysTracked}
                relapseCount={relapseCount}
                isLoading={loadingStates.ai}
              />
              
              {/* Section 4: Relapse Analytics - Only shows if has relapse data */}
              <RelapseAnalytics
                relapsePatterns={memoizedInsights.relapsePatterns}
                daysSinceLastRelapse={memoizedInsights.daysSinceLastRelapse}
                isLoading={loadingStates.relapse}
              />
            </div>
            
            {/* Section 5: Phase Context - Styled like ET/Urge headers */}
            <PhaseContext
              currentStreak={safeUserData.currentStreak}
              phaseInfo={memoizedInsights.phaseInfo}
            />
          </>
        )}
      </section>

      {/* Reset Menu - Text-only with dividers */}
      <div className="reset-menu">
        <span className="reset-label">Reset:</span>
        <button className="reset-btn" onClick={() => setShowResetStreakModal(true)}>
          Streak
        </button>
        <div className="reset-divider" />
        <button className="reset-btn danger" onClick={() => setShowResetAllModal(true)}>
          All Data
        </button>
      </div>

      {/* Milestone Modal - Transparent floating */}
      {showMilestoneModal && selectedMilestone && (
        <div className="overlay">
          <div className="modal" onClick={e => e.stopPropagation()}>
            <span className="modal-num">{selectedMilestone.days}</span>
            <h2>{selectedMilestone.label}</h2>
            {selectedMilestone.date && (
              <p className="modal-date">Reached {format(new Date(selectedMilestone.date), 'MMMM d, yyyy')}</p>
            )}
            <p className="modal-text">
              {/* Contextual text: different message if earned but currently below milestone */}
              {(safeUserData.currentStreak || 0) >= selectedMilestone.days ? (
                // Currently at or past this milestone - celebratory
                <>
                  {selectedMilestone.days === 7 && "Foundation set. Energy stabilizing, clarity emerging."}
                  {selectedMilestone.days === 14 && "Two weeks in. Focus and physical energy improving."}
                  {selectedMilestone.days === 30 && "One month. Habits formed, transformation underway."}
                  {selectedMilestone.days === 90 && "Ninety days. Neurological rewiring complete."}
                  {selectedMilestone.days === 180 && "Six months. Baseline permanently elevated."}
                  {selectedMilestone.days === 365 && "One year. This is now who you are."}
                </>
              ) : (
                // Earned but relapsed - acknowledgment + challenge
                <>
                  {selectedMilestone.days === 7 && "You've built the foundation before. Build it again."}
                  {selectedMilestone.days === 14 && "Two weeks is in your wheelhouse. Reclaim it."}
                  {selectedMilestone.days === 30 && "You've proven you can do this. Now do it again."}
                  {selectedMilestone.days === 90 && "You've rewired once. The path is familiar."}
                  {selectedMilestone.days === 180 && "Six months was yours. Take it back."}
                  {selectedMilestone.days === 365 && "A year lives in you. Rise again."}
                </>
              )}
            </p>
            <button className="btn-ghost" onClick={() => setShowMilestoneModal(false)}>Close</button>
          </div>
        </div>
      )}

      {/* Reset Streak Modal */}
      {showResetStreakModal && (
        <div className="overlay">
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>Reset Streak?</h2>
            <p className="modal-text">This will reset your current streak to 0. Your history and benefits data will be kept.</p>
            <div className="modal-buttons">
              <button className="btn-danger" onClick={confirmResetStreak}>Reset Streak</button>
              <button className="btn-ghost" onClick={() => setShowResetStreakModal(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Reset All Modal */}
      {showResetAllModal && (
        <div className="overlay">
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>Reset All Data?</h2>
            <p className="modal-text">This will permanently delete all progress data including streaks, benefits, and milestones. This cannot be undone.</p>
            <div className="modal-buttons">
              <button className="btn-danger" onClick={confirmResetAll}>Reset All</button>
              <button className="btn-ghost" onClick={() => setShowResetAllModal(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Stats;