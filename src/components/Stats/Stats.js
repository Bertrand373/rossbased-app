// Stats.js - TITANTRACK REFINED
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { format } from 'date-fns';
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
  getTimeRangeDisplayText,
  getCurrentPhase,
  getPhaseGuidance,
  generateChartData,
  calculateAverage,
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

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

const Stats = ({ userData, isPremium, updateUserData }) => {
  const [selectedMetric, setSelectedMetric] = useState('energy');
  const [timeRange, setTimeRange] = useState('week');
  const [showMilestoneModal, setShowMilestoneModal] = useState(false);
  const [selectedMilestone, setSelectedMilestone] = useState(null);
  const [showResetModal, setShowResetModal] = useState(false);
  const [showStatModal, setShowStatModal] = useState(false);
  const [selectedStatCard, setSelectedStatCard] = useState(null);
  
  const [loadingStates, setLoadingStates] = useState({
    progressTrends: true,
    relapsePatterns: true,
    patternRecognition: true,
    optimization: true,
    phaseEvolution: true
  });

  const safeUserData = useMemo(() => validateUserData(userData), [userData]);

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

  const hasInsufficientData = useMemo(() => {
    return (safeUserData.benefitTracking?.length || 0) < 3;
  }, [safeUserData.benefitTracking]);

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

  // Milestones - simple labels
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

  const chartOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: {
        min: 0,
        max: 10,
        ticks: { stepSize: 5, color: 'rgba(255,255,255,0.2)', font: { size: 10 } },
        grid: { color: 'rgba(255,255,255,0.04)', drawBorder: false },
        border: { display: false }
      },
      x: {
        ticks: { color: 'rgba(255,255,255,0.2)', font: { size: 10 }, maxRotation: 0, maxTicksLimit: 7 },
        grid: { display: false },
        border: { display: false }
      }
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: 'rgba(0,0,0,0.9)',
        titleColor: '#fff',
        bodyColor: 'rgba(255,255,255,0.7)',
        borderColor: 'rgba(255,255,255,0.1)',
        borderWidth: 1,
        cornerRadius: 8,
        padding: 12,
        displayColors: false,
        callbacks: { label: (ctx) => ctx.parsed.y === null ? '' : `${ctx.parsed.y}/10` }
      }
    },
    interaction: { mode: 'index', intersect: false }
  }), []);

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

  const getCurrentInsight = useCallback(() => {
    const phase = getCurrentPhase(safeUserData);
    const guidance = getPhaseGuidance(phase, safeUserData.currentStreak || 0);
    return guidance?.actionable || 'Start tracking your benefits daily to unlock personalized insights.';
  }, [safeUserData]);

  return (
    <div className="stats-page">
      {/* Header */}
      <header className="stats-header">
        <h1>Stats</h1>
        <p>Your journey analytics</p>
      </header>

      {/* Stat Cards */}
      <div className="stat-grid">
        <button className="stat-card" onClick={() => handleStatCardClick('currentStreak')}>
          <span className="stat-num">{safeUserData.currentStreak || 0}</span>
          <span className="stat-label">Current</span>
        </button>
        <button className="stat-card" onClick={() => handleStatCardClick('longestStreak')}>
          <span className="stat-num">{safeUserData.longestStreak || 0}</span>
          <span className="stat-label">Longest</span>
        </button>
        <button className="stat-card" onClick={() => handleStatCardClick('wetDreams')}>
          <span className="stat-num">{safeUserData.wetDreamCount || 0}</span>
          <span className="stat-label">Wet Dreams</span>
        </button>
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
        <h2>Benefit Tracker</h2>
        
        <div className="toggle-row">
          {['energy', 'focus', 'confidence', 'aura', 'sleep', 'workout'].map((metric) => (
            <button
              key={metric}
              className={`toggle-btn ${selectedMetric === metric ? 'active' : ''}`}
              onClick={() => setSelectedMetric(metric)}
            >
              {metric.charAt(0).toUpperCase() + metric.slice(1)}
            </button>
          ))}
        </div>

        <div className="toggle-row">
          {[{ key: 'week', label: 'Week' }, { key: 'month', label: 'Month' }, { key: 'quarter', label: '3 Months' }].map((r) => (
            <button
              key={r.key}
              className={`toggle-btn sm ${timeRange === r.key ? 'active' : ''}`}
              onClick={() => setTimeRange(r.key)}
            >
              {r.label}
            </button>
          ))}
        </div>

        <div className="average-block">
          <span className="average-num">{calculateAverage(safeUserData, selectedMetric, timeRange, isPremium)}</span>
          <span className="average-suffix">/10</span>
        </div>
        <p className="average-label">Average {selectedMetric} {getTimeRangeDisplayText(timeRange)}</p>

        <div className="chart-box">
          {(() => {
            const chartData = generateChartData(safeUserData, selectedMetric, timeRange);
            const hasData = chartData.datasets[0].data.some(v => v !== null);
            if (!hasData) return <p className="chart-empty">Start tracking to see your progress</p>;
            return <Line data={chartData} options={chartOptions} height={160} />;
          })()}
        </div>

        {/* Free User */}
        {!isPremium && (
          <div className="free-section">
            <div className="free-card">
              <h3>Phase Guidance</h3>
              <p>{getCurrentInsight()}</p>
            </div>
            <div className="upgrade-card">
              <p>Unlock detailed analytics and personalized optimization</p>
              <button className="btn-primary">Upgrade to Premium</button>
            </div>
          </div>
        )}

        {/* Premium Analytics */}
        {isPremium && (
          <div className="analytics-stack">
            <ProgressTrendsAnalysis
              isLoading={loadingStates.progressTrends}
              hasInsufficientData={hasInsufficientData}
              userData={safeUserData}
              progressTrends={memoizedInsights.progressTrends}
              dataQuality={memoizedInsights.dataQuality}
              selectedMetric={selectedMetric}
            />
            <RelapsePatternAnalytics
              isLoading={loadingStates.relapsePatterns}
              hasInsufficientData={false}
              userData={safeUserData}
              relapsePatterns={memoizedInsights.relapsePatterns}
              daysSinceLastRelapse={memoizedInsights.daysSinceLastRelapse}
            />
            <PatternRecognition
              isLoading={loadingStates.patternRecognition}
              hasInsufficientData={hasInsufficientData}
              userData={safeUserData}
              patternInsights={memoizedInsights.patternInsights}
              dataQuality={memoizedInsights.dataQuality}
            />
            <OptimizationGuidance
              isLoading={loadingStates.optimization}
              hasInsufficientData={hasInsufficientData}
              userData={safeUserData}
              optimizationGuidance={memoizedInsights.optimizationGuidance}
              dataQuality={memoizedInsights.dataQuality}
            />
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

      {/* Reset Link */}
      <button className="reset-link" onClick={() => setShowResetModal(true)}>
        Reset All Stats
      </button>

      {/* Milestone Modal */}
      {showMilestoneModal && selectedMilestone && (
        <div className="overlay" onClick={() => setShowMilestoneModal(false)}>
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

      {/* Reset Modal */}
      {showResetModal && (
        <div className="overlay" onClick={() => setShowResetModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>Reset All Stats?</h2>
            <p className="modal-text">This will permanently delete all progress data. This cannot be undone.</p>
            <div className="modal-buttons">
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