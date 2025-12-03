// src/components/Stats/Stats.js
// CONSOLIDATED: ML-enhanced insights, removed fluff
// Removed: Wisdom Mode, Journey Guidance, Streak Comparison, Personalized Analysis cards

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { format } from 'date-fns';
import { Line } from 'react-chartjs-2';
import { 
  Chart as ChartJS, 
  CategoryScale, 
  LinearScale, 
  PointElement, 
  LineElement, 
  Tooltip, 
  Filler 
} from 'chart.js';
import { FaRedo } from 'react-icons/fa';
import './Stats.css';
import './StatsInsights.css';
import toast from 'react-hot-toast';

// Import consolidated insight components
import { 
  YourNumbers,
  YourTrends,
  RelapsePatterns,
  DiscoveredPatterns,
  PhaseEvolution
} from './StatsInsights';

// Import ML-enhanced analytics
import {
  calculateYourNumbers,
  calculateYourTrends,
  calculateRelapsePatterns,
  discoverMLPatterns,
  calculatePhaseEvolution,
  calculateDaysSinceLastRelapse
} from './StatsAnalytics';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Filler);

const Stats = ({ userData, isPremium, updateUserData }) => {
  const [selectedMetric, setSelectedMetric] = useState('energy');
  const [timeRange, setTimeRange] = useState('week');
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const chartRef = useRef(null);

  // Analytics state
  const [isLoadingAnalytics, setIsLoadingAnalytics] = useState(true);
  const [mlPatterns, setMlPatterns] = useState([]);

  // Load ML patterns on mount
  useEffect(() => {
    const loadAnalytics = async () => {
      setIsLoadingAnalytics(true);
      try {
        const patterns = await discoverMLPatterns(userData);
        setMlPatterns(patterns);
      } catch (error) {
        console.error('Analytics loading error:', error);
      }
      setIsLoadingAnalytics(false);
    };

    if (isPremium && userData?.benefitTracking?.length >= 20) {
      loadAnalytics();
    } else {
      setIsLoadingAnalytics(false);
    }
  }, [userData, isPremium]);

  // Safe user data
  const safeUserData = useMemo(() => ({
    ...userData,
    benefitTracking: userData?.benefitTracking || [],
    streakHistory: userData?.streakHistory || [],
    currentStreak: userData?.currentStreak || 0,
    longestStreak: userData?.longestStreak || 0,
    relapseCount: userData?.relapseCount || 0,
    wetDreamCount: userData?.wetDreamCount || 0
  }), [userData]);

  // Calculated values
  const daysTracked = safeUserData.benefitTracking.length;
  const relapseCount = safeUserData.streakHistory.filter(s => s.reason === 'relapse').length;
  const hasInsufficientData = daysTracked < 7;

  // Calculate analytics
  const yourNumbers = useMemo(() => calculateYourNumbers(safeUserData), [safeUserData]);
  const yourTrends = useMemo(() => calculateYourTrends(safeUserData, selectedMetric), [safeUserData, selectedMetric]);
  const relapsePatterns = useMemo(() => calculateRelapsePatterns(safeUserData), [safeUserData]);
  const phaseEvolution = useMemo(() => calculatePhaseEvolution(safeUserData, selectedMetric), [safeUserData, selectedMetric]);
  const daysSinceLastRelapse = useMemo(() => calculateDaysSinceLastRelapse(safeUserData), [safeUserData]);

  // Time range config
  const timeRanges = [
    { key: 'week', label: '7d', days: 7 },
    { key: 'month', label: '30d', days: 30 },
    { key: 'quarter', label: '90d', days: 90 }
  ];

  // Filter benefit data by time range
  const getFilteredData = () => {
    const days = timeRanges.find(r => r.key === timeRange)?.days || 7;
    return safeUserData.benefitTracking.slice(-days);
  };

  // Calculate average for selected metric
  const calculateAverage = () => {
    const data = getFilteredData();
    if (data.length === 0) return '—';
    
    const values = data
      .map(d => d[selectedMetric])
      .filter(v => typeof v === 'number' && v >= 1 && v <= 10);
    
    if (values.length === 0) return '—';
    return (values.reduce((a, b) => a + b, 0) / values.length).toFixed(1);
  };

  // Chart data
  const getChartData = () => {
    const data = getFilteredData();
    
    return {
      labels: data.map(d => format(new Date(d.date), 'MMM d')),
      datasets: [{
        data: data.map(d => d[selectedMetric] || null),
        borderColor: 'rgba(255, 255, 255, 0.6)',
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderWidth: 2,
        fill: true,
        tension: 0.4,
        pointRadius: 0,
        pointHoverRadius: 6,
        pointHoverBackgroundColor: '#ffffff',
        pointHoverBorderColor: '#ffffff',
        pointHoverBorderWidth: 2
      }]
    };
  };

  // Chart options
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: {
        min: 0,
        max: 10,
        ticks: {
          stepSize: 2,
          color: 'rgba(255, 255, 255, 0.3)',
          font: { size: 10 }
        },
        grid: {
          color: 'rgba(255, 255, 255, 0.06)',
          drawBorder: false
        }
      },
      x: {
        ticks: {
          color: 'rgba(255, 255, 255, 0.3)',
          font: { size: 10 },
          maxRotation: 0
        },
        grid: {
          display: false
        }
      }
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: 'rgba(30, 30, 30, 0.95)',
        titleColor: '#ffffff',
        bodyColor: '#ffffff',
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1,
        cornerRadius: 8,
        displayColors: false,
        padding: 12
      }
    },
    interaction: {
      mode: 'index',
      intersect: false
    }
  };

  // Reset stats handler
  const handleResetStats = () => {
    setShowResetConfirm(true);
  };

  const confirmResetStats = () => {
    const resetUserData = {
      ...userData,
      startDate: new Date(),
      currentStreak: 0,
      longestStreak: 0,
      wetDreamCount: 0,
      relapseCount: 0,
      badges: (userData.badges || []).map(b => ({ ...b, earned: false, date: null })),
      benefitTracking: [],
      streakHistory: [{
        id: 1,
        start: new Date(),
        end: null,
        days: 0,
        reason: null
      }],
      emotionalTracking: [],
      notes: {}
    };
    
    updateUserData(resetUserData);
    setShowResetConfirm(false);
    toast.success('All stats have been reset');
  };

  return (
    <div className="stats-container">
      {/* Header */}
      <div className="stats-header">
        <div className="stats-header-spacer"></div>
        <h2>Your Stats</h2>
        <div className="stats-header-actions">
          <button className="reset-stats-btn" onClick={handleResetStats}>
            <FaRedo />
            <span>Reset</span>
          </button>
        </div>
      </div>

      {/* Reset Modal */}
      {showResetConfirm && (
        <div className="overlay">
          <div className="modal">
            <h2>Reset All Stats?</h2>
            <p>This will permanently delete all your progress data. This cannot be undone.</p>
            <div className="modal-actions">
              <button className="btn-ghost" onClick={() => setShowResetConfirm(false)}>
                Cancel
              </button>
              <button className="btn-danger" onClick={confirmResetStats}>
                Reset Everything
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Stats */}
      <div className="streak-stats">
        <div className="stat-card">
          <div className="stat-value">{safeUserData.currentStreak}</div>
          <div className="stat-label">Current</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{safeUserData.longestStreak}</div>
          <div className="stat-label">Longest</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{safeUserData.wetDreamCount}</div>
          <div className="stat-label">Wet Dreams</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{safeUserData.relapseCount}</div>
          <div className="stat-label">Relapses</div>
        </div>
      </div>

      {/* Metric Selection */}
      <div className="metric-section">
        <div className="toggle-row">
          {['energy', 'focus', 'confidence'].map((metric, idx) => (
            <React.Fragment key={metric}>
              <button
                className={`toggle-btn ${selectedMetric === metric ? 'active' : ''}`}
                onClick={() => setSelectedMetric(metric)}
              >
                {metric.charAt(0).toUpperCase() + metric.slice(1)}
              </button>
              {idx < 2 && <div className="toggle-divider" />}
            </React.Fragment>
          ))}
        </div>
        <div className="toggle-row">
          {['aura', 'sleep', 'workout'].map((metric, idx) => (
            <React.Fragment key={metric}>
              <button
                className={`toggle-btn ${selectedMetric === metric ? 'active' : ''}`}
                onClick={() => setSelectedMetric(metric)}
              >
                {metric.charAt(0).toUpperCase() + metric.slice(1)}
              </button>
              {idx < 2 && <div className="toggle-divider" />}
            </React.Fragment>
          ))}
        </div>

        {/* Time Range */}
        <div className="toggle-row time-range">
          {timeRanges.map((r, idx) => (
            <React.Fragment key={r.key}>
              <button
                className={`toggle-btn sm ${timeRange === r.key ? 'active' : ''}`}
                onClick={() => setTimeRange(r.key)}
              >
                {r.label}
              </button>
              {idx < timeRanges.length - 1 && <div className="toggle-divider" />}
            </React.Fragment>
          ))}
        </div>

        {/* Average Display */}
        <div className="average-block">
          <span className="average-num">{calculateAverage()}</span>
          <span className="average-suffix">/10</span>
        </div>
        <p className="average-label">
          {selectedMetric} · {timeRanges.find(r => r.key === timeRange)?.label}
        </p>

        {/* Chart */}
        <div className="chart-box">
          {daysTracked === 0 ? (
            <p className="chart-empty">Start tracking to see your progress</p>
          ) : (
            <Line ref={chartRef} data={getChartData()} options={chartOptions} />
          )}
        </div>
      </div>

      {/* Free User CTA */}
      {!isPremium && (
        <div className="free-section">
          <div className="free-card">
            <h3>Phase Guidance</h3>
            <p>
              {safeUserData.currentStreak <= 14 
                ? "Foundation phase - your body is adjusting. Focus on building daily habits."
                : safeUserData.currentStreak <= 45
                ? "Purification phase - emotional fluctuations are normal. Stay the course."
                : safeUserData.currentStreak <= 90
                ? "Expansion phase - benefits are compounding. Push your boundaries."
                : "Integration phase - you're building lasting change. Mentor others."
              }
            </p>
          </div>
          <div className="upgrade-card">
            <p>Unlock detailed analytics and ML-powered pattern discovery</p>
            <button className="btn-primary" onClick={() => toast.success('Premium coming soon!')}>
              Upgrade to Premium
            </button>
          </div>
        </div>
      )}

      {/* Premium Analytics */}
      {isPremium && (
        <div className="analytics-stack">
          {/* Your Numbers */}
          <YourNumbers
            weeklyAverages={yourNumbers.weeklyAverages}
            deltas={yourNumbers.deltas}
            isLoading={false}
          />

          {/* Your Trends */}
          <YourTrends
            isLoading={false}
            hasInsufficientData={daysTracked < 14}
            daysTracked={daysTracked}
            trends={yourTrends}
            selectedMetric={selectedMetric}
          />

          {/* Relapse Patterns */}
          <RelapsePatterns
            isLoading={false}
            relapsePatterns={relapsePatterns}
            daysSinceLastRelapse={daysSinceLastRelapse}
          />

          {/* ML-Discovered Patterns */}
          <DiscoveredPatterns
            isLoading={isLoadingAnalytics}
            hasInsufficientData={daysTracked < 20}
            daysTracked={daysTracked}
            relapseCount={relapseCount}
            mlPatterns={mlPatterns}
          />

          {/* Phase Evolution */}
          <PhaseEvolution
            isLoading={false}
            hasInsufficientData={daysTracked < 14}
            daysTracked={daysTracked}
            phaseData={phaseEvolution}
            selectedMetric={selectedMetric}
            currentStreak={safeUserData.currentStreak}
          />
        </div>
      )}
    </div>
  );
};

export default Stats;