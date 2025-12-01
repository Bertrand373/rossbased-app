// Stats.js - TITANTRACK MINIMAL (Full Featured)
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { format, subDays } from 'date-fns';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler } from 'chart.js';
import './Stats.css';
import toast from 'react-hot-toast';

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

// Register ChartJS components
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

const Stats = ({ userData, isPremium, updateUserData }) => {
  // Core state
  const [selectedMetric, setSelectedMetric] = useState('energy');
  const [timeRange, setTimeRange] = useState('week');
  const [showBadgeModal, setShowBadgeModal] = useState(false);
  const [selectedBadge, setSelectedBadge] = useState(null);
  const [showResetModal, setShowResetModal] = useState(false);
  
  // Stat card modal states
  const [showStatModal, setShowStatModal] = useState(false);
  const [selectedStatCard, setSelectedStatCard] = useState(null);
  
  // Loading states for insights
  const [loadingStates, setLoadingStates] = useState({
    progressTrends: true,
    relapsePatterns: true,
    patternRecognition: true,
    optimization: true,
    phaseEvolution: true
  });

  // Safe user data
  const safeUserData = useMemo(() => validateUserData(userData), [userData]);

  // Simulate loading for premium insights
  useEffect(() => {
    if (isPremium) {
      const timers = [
        setTimeout(() => setLoadingStates(prev => ({ ...prev, progressTrends: false })), 400),
        setTimeout(() => setLoadingStates(prev => ({ ...prev, relapsePatterns: false })), 600),
        setTimeout(() => setLoadingStates(prev => ({ ...prev, patternRecognition: false })), 800),
        setTimeout(() => setLoadingStates(prev => ({ ...prev, optimization: false })), 1000),
        setTimeout(() => setLoadingStates(prev => ({ ...prev, phaseEvolution: false })), 1200)
      ];
      return () => timers.forEach(clearTimeout);
    }
  }, [isPremium, selectedMetric, timeRange]);

  // Check for insufficient data
  const hasInsufficientData = useMemo(() => {
    return (safeUserData.benefitTracking?.length || 0) < 3;
  }, [safeUserData.benefitTracking]);

  // Memoized insights calculations
  const memoizedInsights = useMemo(() => {
    if (!isPremium) return {};
    
    return {
      dataQuality: calculateDataQuality(safeUserData),
      patternInsights: generatePatternRecognition(safeUserData, selectedMetric),
      optimizationGuidance: generateOptimizationGuidance(safeUserData, selectedMetric),
      phaseEvolution: calculatePhaseEvolutionAnalysis(safeUserData, selectedMetric),
      relapsePatterns: generateRelapsePatternAnalysis(safeUserData),
      progressTrends: calculateProgressTrends(safeUserData, selectedMetric),
      daysSinceLastRelapse: calculateDaysSinceLastRelapse(safeUserData)
    };
  }, [safeUserData, selectedMetric, isPremium]);

  // Milestones data (replaces badges visual)
  const milestones = useMemo(() => {
    const maxStreak = Math.max(safeUserData.currentStreak || 0, safeUserData.longestStreak || 0);
    const badges = safeUserData.badges || [];
    
    return [
      { days: 7, name: 'First Week', earned: maxStreak >= 7, date: badges.find(b => b.name === '7-Day Warrior')?.date },
      { days: 14, name: 'Two Weeks', earned: maxStreak >= 14, date: badges.find(b => b.name === '14-Day Monk')?.date },
      { days: 30, name: 'One Month', earned: maxStreak >= 30, date: badges.find(b => b.name === '30-Day Master')?.date },
      { days: 90, name: 'Quarter', earned: maxStreak >= 90, date: badges.find(b => b.name === '90-Day King')?.date },
      { days: 180, name: 'Half Year', earned: maxStreak >= 180, date: badges.find(b => b.name === '180-Day Emperor')?.date },
      { days: 365, name: 'One Year', earned: maxStreak >= 365, date: badges.find(b => b.name === '365-Day Sage')?.date }
    ];
  }, [safeUserData]);

  // Chart options - minimal styling
  const chartOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: {
        min: 0,
        max: 10,
        ticks: {
          stepSize: 5,
          color: 'rgba(255, 255, 255, 0.3)',
          font: { size: 11 }
        },
        grid: {
          color: 'rgba(255, 255, 255, 0.06)',
          drawBorder: false
        },
        border: { display: false }
      },
      x: {
        ticks: {
          color: 'rgba(255, 255, 255, 0.3)',
          font: { size: 10 },
          maxRotation: 0,
          maxTicksLimit: timeRange === 'quarter' ? 8 : 7
        },
        grid: { display: false },
        border: { display: false }
      }
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: 'rgba(20, 20, 20, 0.95)',
        titleColor: '#ffffff',
        bodyColor: 'rgba(255, 255, 255, 0.7)',
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1,
        cornerRadius: 8,
        padding: 12,
        displayColors: false,
        callbacks: {
          label: (context) => context.parsed.y === null ? '' : `${context.parsed.y}/10`
        }
      }
    },
    interaction: { mode: 'index', intersect: false }
  }), [timeRange]);

  // Handlers
  const handleStatCardClick = (statType) => {
    setSelectedStatCard(statType);
    setShowStatModal(true);
  };

  const handleMilestoneClick = (milestone) => {
    if (milestone.earned) {
      const badgeMap = {
        7: '7-Day Warrior',
        14: '14-Day Monk',
        30: '30-Day Master',
        90: '90-Day King',
        180: '180-Day Emperor',
        365: '365-Day Sage'
      };
      setSelectedBadge({
        name: badgeMap[milestone.days],
        date: milestone.date,
        days: milestone.days
      });
      setShowBadgeModal(true);
    }
  };

  const handleResetStats = () => setShowResetModal(true);

  const confirmResetStats = async () => {
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
      setShowResetModal(false);
      toast.success('Stats reset successfully');
    } catch (error) {
      toast.error('Failed to reset stats');
    }
  };

  // Get current insight for free users
  const getCurrentInsight = useCallback(() => {
    const phase = getCurrentPhase(safeUserData);
    const guidance = getPhaseGuidance(phase, safeUserData.currentStreak || 0);
    return guidance?.actionable || 'Start tracking your benefits daily to unlock personalized insights.';
  }, [safeUserData]);

  return (
    <div className="stats-container">
      {/* Header */}
      <div className="stats-header">
        <h2>Stats</h2>
        <p className="stats-subtitle">Your journey analytics</p>
      </div>

      {/* Stat Cards */}
      <div className="stat-cards">
        <div className="stat-card" onClick={() => handleStatCardClick('currentStreak')}>
          <div className="stat-value">{safeUserData.currentStreak || 0}</div>
          <div className="stat-label">Current</div>
        </div>
        
        <div className="stat-card" onClick={() => handleStatCardClick('longestStreak')}>
          <div className="stat-value">{safeUserData.longestStreak || 0}</div>
          <div className="stat-label">Longest</div>
        </div>
        
        <div className="stat-card" onClick={() => handleStatCardClick('wetDreams')}>
          <div className="stat-value">{safeUserData.wetDreamCount || 0}</div>
          <div className="stat-label">Wet Dreams</div>
        </div>
        
        <div className="stat-card" onClick={() => handleStatCardClick('relapses')}>
          <div className="stat-value">{safeUserData.relapseCount || 0}</div>
          <div className="stat-label">Relapses</div>
        </div>
      </div>

      {/* Stat Card Modal */}
      <StatCardModal
        showModal={showStatModal}
        selectedStatCard={selectedStatCard}
        onClose={() => setShowStatModal(false)}
        userData={safeUserData}
      />

      {/* Milestones */}
      <section className="stats-section">
        <h3 className="section-title">Milestones</h3>
        <div className="milestones-grid">
          {milestones.map((m) => (
            <div
              key={m.days}
              className={`milestone-card ${m.earned ? 'earned' : 'locked'}`}
              onClick={() => handleMilestoneClick(m)}
            >
              <div className="milestone-days">{m.days}</div>
              <div className="milestone-name">{m.name}</div>
              {m.earned && <div className="milestone-check">✓</div>}
            </div>
          ))}
        </div>
      </section>

      {/* Benefit Tracker */}
      <section className="stats-section">
        <h3 className="section-title">Benefit Tracker</h3>
        
        {/* Metric Toggle */}
        <div className="toggle-container">
          <div className="toggle-group">
            {['energy', 'focus', 'confidence', 'aura', 'sleep', 'workout'].map((metric) => (
              <button
                key={metric}
                className={`toggle-btn ${selectedMetric === metric ? 'active' : ''}`}
                onClick={() => setSelectedMetric(metric)}
              >
                {metric === 'sleep' ? 'Sleep' : metric.charAt(0).toUpperCase() + metric.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Time Range Toggle */}
        <div className="toggle-container">
          <div className="toggle-group small">
            {[
              { key: 'week', label: 'Week' },
              { key: 'month', label: 'Month' },
              { key: 'quarter', label: '3 Months' }
            ].map((range) => (
              <button
                key={range.key}
                className={`toggle-btn ${timeRange === range.key ? 'active' : ''}`}
                onClick={() => setTimeRange(range.key)}
              >
                {range.label}
              </button>
            ))}
          </div>
        </div>

        {/* Average Display */}
        <div className="average-display">
          <span className="average-value">
            {calculateAverage(safeUserData, selectedMetric, timeRange, isPremium)}
          </span>
          <span className="average-max">/10</span>
        </div>
        <p className="average-label">
          Average {selectedMetric === 'sleep' ? 'Sleep Quality' : selectedMetric} {getTimeRangeDisplayText(timeRange)}
        </p>

        {/* Chart */}
        <div className="chart-container">
          {(() => {
            const chartData = generateChartData(safeUserData, selectedMetric, timeRange);
            const hasData = chartData.datasets[0].data.some(val => val !== null);
            
            if (!hasData) {
              return (
                <div className="chart-empty">
                  <p>Start tracking to see your progress</p>
                </div>
              );
            }
            
            return <Line data={chartData} options={chartOptions} height={180} />;
          })()}
        </div>

        {/* Free User: Single Insight */}
        {!isPremium && (
          <div className="insight-preview">
            <div className="insight-card">
              <div className="insight-header">Current Phase Guidance</div>
              <p className="insight-text">{getCurrentInsight()}</p>
            </div>
            
            <div className="upgrade-prompt">
              <p>Unlock detailed analytics, pattern recognition, and personalized optimization</p>
              <button className="upgrade-btn">Upgrade to Premium</button>
            </div>
          </div>
        )}

        {/* Premium User: Full Analytics */}
        {isPremium && (
          <div className="premium-insights">
            {/* Progress Trends */}
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
              hasInsufficientData={false}
              userData={safeUserData}
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

            {/* Phase Evolution */}
            <PhaseEvolutionAnalysis
              isLoading={loadingStates.phaseEvolution}
              hasInsufficientData={hasInsufficientData}
              userData={safeUserData}
              phaseEvolution={memoizedInsights.phaseEvolution}
              selectedMetric={selectedMetric}
              dataQuality={memoizedInsights.dataQuality}
              currentStreak={safeUserData.currentStreak}
            />
          </div>
        )}
      </section>

      {/* Reset Button */}
      <button className="reset-btn" onClick={handleResetStats}>
        Reset All Stats
      </button>

      {/* Milestone/Badge Modal */}
      {showBadgeModal && selectedBadge && (
        <div className="stats-overlay" onClick={() => setShowBadgeModal(false)}>
          <div className="stats-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-number">{selectedBadge.days}</div>
            <h3 className="modal-title">{selectedBadge.name}</h3>
            {selectedBadge.date && (
              <p className="modal-date">
                Reached {format(new Date(selectedBadge.date), 'MMMM d, yyyy')}
              </p>
            )}
            <p className="modal-description">
              {selectedBadge.days === 7 && "Your foundation phase is complete. Energy fluctuations are stabilizing and mental clarity is emerging."}
              {selectedBadge.days === 14 && "Two weeks of dedication. Noticeable improvements in focus, confidence, and physical energy."}
              {selectedBadge.days === 30 && "A full month of commitment. You've built lasting habits and experienced real transformation."}
              {selectedBadge.days === 90 && "The 90-day mark represents complete neurological rewiring. You've achieved mastery."}
              {selectedBadge.days === 180 && "Half a year of discipline. Your baseline has permanently elevated."}
              {selectedBadge.days === 365 && "A full year. You've transcended the practice - it's now who you are."}
            </p>
            <div className="modal-actions">
              <button className="btn-ghost" onClick={() => setShowBadgeModal(false)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Confirmation Modal */}
      {showResetModal && (
        <div className="stats-overlay" onClick={() => setShowResetModal(false)}>
          <div className="stats-modal reset-modal" onClick={e => e.stopPropagation()}>
            <h3 className="modal-title">Reset All Stats?</h3>
            <p className="modal-description">
              This will permanently delete all your progress data including streaks, benefits, and milestones. This cannot be undone.
            </p>
            <div className="modal-actions row">
              <button className="btn-danger" onClick={confirmResetStats}>Reset</button>
              <button className="btn-ghost" onClick={() => setShowResetModal(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Stats;