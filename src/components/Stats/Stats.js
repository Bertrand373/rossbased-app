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

  // Milestones
  const milestones = useMemo(() => {
    const maxStreak = Math.max(safeUserData.currentStreak || 0, safeUserData.longestStreak || 0);
    const badges = safeUserData.badges || [];
    
    return [
      { days: 7, label: '1 week', earned: maxStreak >= 7, date: badges.find(b => b.name === '7-Day Warrior')?.date },
      { days: 14, label: '2 weeks', earned: maxStreak >= 14, date: badges.find(b => b.name === '14-Day Monk')?.date },
      { days: 30, label: '1 month', earned: maxStreak >= 30, date: badges.find(b => b.name === '30-Day Master')?.date },
      { days: 90, label: '3 months', earned: maxStreak >= 90, date: badges.find(b => b.name === '90-Day King')?.date },
      { days: 180, label: '6 months', earned: maxStreak >= 180, date: badges.find(b => b.name === '180-Day Emperor')?.date },
      { days: 365, label: '1 year', earned: maxStreak >= 365, date: badges.find(b => b.name === '365-Day Sage')?.date }
    ];
  }, [safeUserData]);

  // Chart configuration - Clean trend line, endpoints only
  const chartOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    layout: {
      padding: { top: 8, right: 8, bottom: 0, left: 0 }
    },
    scales: {
      y: {
        min: 0,
        max: 10,
        ticks: { 
          stepSize: 5, 
          color: 'rgba(255,255,255,0.12)', 
          font: { size: 10, weight: '400' },
          padding: 8
        },
        grid: { 
          color: 'rgba(255,255,255,0.03)', 
          drawBorder: false
        },
        border: { display: false }
      },
      x: {
        ticks: { 
          color: 'rgba(255,255,255,0.12)', 
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
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
        titleColor: 'rgba(255, 255, 255, 0.5)',
        bodyColor: '#ffffff',
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1,
        cornerRadius: 8,
        padding: 12,
        titleFont: { size: 11, weight: '400' },
        bodyFont: { size: 14, weight: '600' },
        displayColors: false,
        callbacks: {
          title: (items) => items[0]?.label || '',
          label: (item) => item.parsed.y !== null ? `${item.parsed.y}/10` : 'No data'
        }
      }
    },
    interaction: {
      mode: 'nearest',
      axis: 'x',
      intersect: false
    }
  }), [timeRange]);

  // Time range options
  const timeRanges = [
    { key: 'week', label: 'Week' },
    { key: 'month', label: 'Month' },
    { key: 'quarter', label: '90 Days' }
  ];

  // Chart data generator
  const getChartData = useCallback(() => {
    return generateChartData(safeUserData, selectedMetric, timeRange);
  }, [safeUserData, selectedMetric, timeRange]);

  // Event handlers
  const handleMilestoneClick = useCallback((milestone) => {
    if (!milestone.earned) return;
    setSelectedMilestone(milestone);
    setShowMilestoneModal(true);
  }, []);

  const handleStatCardClick = useCallback((statType) => {
    setSelectedStatCard(statType);
    setShowStatModal(true);
  }, []);

  const confirmResetStreak = useCallback(async () => {
    if (!updateUserData) return;
    try {
      const newHistory = [...(safeUserData.streakHistory || [])];
      if (safeUserData.currentStreak > 0) {
        newHistory.push({
          start: safeUserData.startDate,
          end: new Date(),
          length: safeUserData.currentStreak,
          reason: 'manual_reset'
        });
      }
      
      await updateUserData({
        currentStreak: 0,
        startDate: new Date(),
        streakHistory: newHistory
      });
      
      setShowResetStreakModal(false);
      toast.success('Streak reset');
    } catch (error) {
      console.error('Reset streak error:', error);
      toast.error('Failed to reset streak');
    }
  }, [safeUserData, updateUserData]);

  const confirmResetAll = useCallback(async () => {
    if (!updateUserData) return;
    try {
      await updateUserData({
        currentStreak: 0,
        longestStreak: 0,
        startDate: new Date(),
        benefitTracking: [],
        streakHistory: [],
        relapseCount: 0,
        wetDreamCount: 0,
        badges: [
          { name: '7-Day Warrior', earned: false, date: null },
          { name: '14-Day Monk', earned: false, date: null },
          { name: '30-Day Master', earned: false, date: null },
          { name: '90-Day King', earned: false, date: null },
          { name: '180-Day Emperor', earned: false, date: null },
          { name: '365-Day Sage', earned: false, date: null }
        ]
      });
      
      setShowResetAllModal(false);
      toast.success('All data reset');
    } catch (error) {
      console.error('Reset all error:', error);
      toast.error('Failed to reset data');
    }
  }, [updateUserData]);

  return (
    <div className="stats-page">
      {/* Stat Cards - Landing page style with dividers */}
      <div className="stat-grid">
        <button className="stat-card" onClick={() => handleStatCardClick('currentStreak')}>
          <span className="stat-num">{safeUserData.currentStreak || 0}</span>
          <span className="stat-label">Current</span>
        </button>
        <div className="stat-divider" />
        <button className="stat-card" onClick={() => handleStatCardClick('longestStreak')}>
          <span className="stat-num">{safeUserData.longestStreak || 0}</span>
          <span className="stat-label">Longest</span>
        </button>
        <div className="stat-divider" />
        <button className="stat-card" onClick={() => handleStatCardClick('wetDreams')}>
          <span className="stat-num">{safeUserData.wetDreamCount || 0}</span>
          <span className="stat-label">Wet Dreams</span>
        </button>
        <div className="stat-divider" />
        <button className="stat-card" onClick={() => handleStatCardClick('relapses')}>
          <span className="stat-num">{safeUserData.relapseCount || 0}</span>
          <span className="stat-label">Relapses</span>
        </button>
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
              {selectedMilestone.days === 7 && "Foundation set. Energy stabilizing, clarity emerging."}
              {selectedMilestone.days === 14 && "Two weeks in. Focus and physical energy improving."}
              {selectedMilestone.days === 30 && "One month. Habits formed, transformation underway."}
              {selectedMilestone.days === 90 && "Ninety days. Neurological rewiring complete."}
              {selectedMilestone.days === 180 && "Six months. Baseline permanently elevated."}
              {selectedMilestone.days === 365 && "One year. This is now who you are."}
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
              <button className="btn-ghost" onClick={() => setShowResetStreakModal(false)}>Cancel</button>
              <button className="btn-danger" onClick={confirmResetStreak}>Reset Streak</button>
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
              <button className="btn-ghost" onClick={() => setShowResetAllModal(false)}>Cancel</button>
              <button className="btn-danger" onClick={confirmResetAll}>Reset All</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Stats;