// Stats.js - TITANTRACK MINIMAL
import React, { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { Line } from 'react-chartjs-2';
import { 
  Chart as ChartJS, 
  CategoryScale, 
  LinearScale, 
  PointElement, 
  LineElement, 
  Title, 
  Tooltip, 
  Legend, 
  Filler 
} from 'chart.js';
import './Stats.css';

// Register ChartJS
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

const Stats = ({ userData, isPremium, updateUserData }) => {
  // State
  const [selectedMetric, setSelectedMetric] = useState('energy');
  const [timeRange, setTimeRange] = useState('week');
  const [showMilestoneModal, setShowMilestoneModal] = useState(false);
  const [selectedMilestone, setSelectedMilestone] = useState(null);
  const [showStatModal, setShowStatModal] = useState(false);
  const [selectedStat, setSelectedStat] = useState(null);
  const [showResetModal, setShowResetModal] = useState(false);

  // Safe user data
  const safeUserData = useMemo(() => ({
    currentStreak: userData?.currentStreak || 0,
    longestStreak: userData?.longestStreak || 0,
    wetDreamCount: userData?.wetDreamCount || 0,
    relapseCount: userData?.relapseCount || 0,
    benefitTracking: userData?.benefitTracking || [],
    badges: userData?.badges || [],
    startDate: userData?.startDate || new Date(),
    ...userData
  }), [userData]);

  // Milestones data
  const milestones = useMemo(() => {
    const maxStreak = Math.max(safeUserData.currentStreak, safeUserData.longestStreak);
    const badges = safeUserData.badges || [];
    
    return [
      { 
        days: 7, 
        name: 'First Week', 
        earned: maxStreak >= 7,
        date: badges.find(b => b.name === '7-Day Warrior')?.date,
        description: 'You\'ve completed your first week. Energy fluctuations are stabilizing and mental clarity is emerging.'
      },
      { 
        days: 14, 
        name: 'Two Weeks', 
        earned: maxStreak >= 14,
        date: badges.find(b => b.name === '14-Day Monk')?.date,
        description: 'Two weeks of dedication. Noticeable improvements in focus, confidence, and physical energy.'
      },
      { 
        days: 30, 
        name: 'One Month', 
        earned: maxStreak >= 30,
        date: badges.find(b => b.name === '30-Day Master')?.date,
        description: 'A full month of commitment. You\'ve built lasting habits and experienced real transformation.'
      },
      { 
        days: 90, 
        name: 'Three Months', 
        earned: maxStreak >= 90,
        date: badges.find(b => b.name === '90-Day King')?.date,
        description: 'The 90-day mark represents complete neurological rewiring. You\'ve achieved mastery.'
      },
      { 
        days: 180, 
        name: 'Six Months', 
        earned: maxStreak >= 180,
        date: badges.find(b => b.name === '180-Day Emperor')?.date,
        description: 'Half a year of discipline. Your baseline has permanently elevated.'
      },
      { 
        days: 365, 
        name: 'One Year', 
        earned: maxStreak >= 365,
        date: badges.find(b => b.name === '365-Day Sage')?.date,
        description: 'A full year. You\'ve transcended the practice - it\'s now simply who you are.'
      }
    ];
  }, [safeUserData]);

  // Stat card info
  const statInfo = {
    currentStreak: {
      label: 'Current Streak',
      description: 'Your active streak of consecutive days. This resets if you log a relapse.'
    },
    longestStreak: {
      label: 'Longest Streak',
      description: 'Your personal best - the longest streak you\'ve achieved. A record to beat.'
    },
    wetDreams: {
      label: 'Wet Dreams',
      description: 'Natural nocturnal emissions. These don\'t count as relapses - they\'re part of the body\'s normal regulation.'
    },
    relapses: {
      label: 'Relapses',
      description: 'Total relapse count. Each one is a lesson. What matters is you\'re still here, still trying.'
    }
  };

  // Get filtered benefit data
  const getFilteredBenefitData = useMemo(() => {
    const data = safeUserData.benefitTracking || [];
    const now = new Date();
    const days = timeRange === 'week' ? 7 : timeRange === 'month' ? 30 : 90;
    const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    
    return data.filter(entry => new Date(entry.date) >= cutoff);
  }, [safeUserData.benefitTracking, timeRange]);

  // Calculate average
  const average = useMemo(() => {
    if (getFilteredBenefitData.length === 0) return 'N/A';
    
    const sum = getFilteredBenefitData.reduce((acc, item) => {
      const value = selectedMetric === 'sleep' 
        ? (item.sleep || item.attraction || 0)
        : (item[selectedMetric] || 0);
      return acc + value;
    }, 0);
    
    return (sum / getFilteredBenefitData.length).toFixed(1);
  }, [getFilteredBenefitData, selectedMetric]);

  // Generate chart data
  const chartData = useMemo(() => {
    const data = getFilteredBenefitData;
    
    if (data.length === 0) {
      return {
        labels: [],
        datasets: [{
          data: [],
          borderColor: '#ffffff',
          backgroundColor: 'rgba(255, 255, 255, 0.05)',
          fill: true,
          tension: 0.4,
          pointRadius: 0,
          pointHoverRadius: 6,
          pointHoverBackgroundColor: '#ffffff',
        }]
      };
    }

    const sortedData = [...data].sort((a, b) => new Date(a.date) - new Date(b.date));
    
    return {
      labels: sortedData.map(item => format(new Date(item.date), 'MMM d')),
      datasets: [{
        data: sortedData.map(item => {
          if (selectedMetric === 'sleep') {
            return item.sleep || item.attraction || null;
          }
          return item[selectedMetric] || null;
        }),
        borderColor: '#ffffff',
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        fill: true,
        tension: 0.4,
        pointRadius: 0,
        pointHoverRadius: 6,
        pointHoverBackgroundColor: '#ffffff',
        spanGaps: true,
      }]
    };
  }, [getFilteredBenefitData, selectedMetric]);

  // Chart options
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
          maxRotation: 0
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
          label: (context) => {
            if (context.parsed.y === null) return '';
            return `${context.parsed.y}/10`;
          }
        }
      }
    },
    interaction: {
      mode: 'index',
      intersect: false,
    }
  }), []);

  // Generate insight based on data
  const insight = useMemo(() => {
    const data = getFilteredBenefitData;
    if (data.length < 3) {
      return {
        text: 'Track more days to unlock personalized insights about your progress patterns.',
        action: null
      };
    }

    const avg = parseFloat(average);
    const metricName = selectedMetric === 'sleep' ? 'sleep quality' : selectedMetric;
    
    if (avg >= 7) {
      return {
        text: `Your ${metricName} is consistently strong. You're in a good rhythm.`,
        action: 'Maintain your current habits and routines.'
      };
    } else if (avg >= 5) {
      return {
        text: `Your ${metricName} is moderate with room to grow.`,
        action: 'Focus on consistency and identify what helps you feel your best.'
      };
    } else {
      return {
        text: `Your ${metricName} has been lower recently. This is common during adjustment phases.`,
        action: 'Be patient with yourself. Consider adjusting sleep, exercise, or stress levels.'
      };
    }
  }, [getFilteredBenefitData, average, selectedMetric]);

  // Handlers
  const handleMilestoneClick = (milestone) => {
    if (milestone.earned) {
      setSelectedMilestone(milestone);
      setShowMilestoneModal(true);
    }
  };

  const handleStatClick = (statKey, value) => {
    setSelectedStat({ key: statKey, value, ...statInfo[statKey] });
    setShowStatModal(true);
  };

  const handleReset = async () => {
    try {
      await updateUserData({
        currentStreak: 0,
        longestStreak: 0,
        wetDreamCount: 0,
        relapseCount: 0,
        benefitTracking: [],
        relapseHistory: [],
        badges: safeUserData.badges?.map(b => ({ ...b, earned: false, date: null })) || [],
        startDate: new Date()
      });
      setShowResetModal(false);
    } catch (error) {
      console.error('Reset error:', error);
    }
  };

  return (
    <div className="stats-container">
      {/* Header */}
      <div className="stats-header">
        <h2>Stats</h2>
        <p className="stats-header-subtitle">Your journey at a glance</p>
      </div>

      {/* Stat Cards */}
      <div className="stat-cards">
        <div 
          className="stat-card current-streak"
          onClick={() => handleStatClick('currentStreak', safeUserData.currentStreak)}
        >
          <div className="stat-value">{safeUserData.currentStreak}</div>
          <div className="stat-label">Current</div>
        </div>
        
        <div 
          className="stat-card"
          onClick={() => handleStatClick('longestStreak', safeUserData.longestStreak)}
        >
          <div className="stat-value">{safeUserData.longestStreak}</div>
          <div className="stat-label">Longest</div>
        </div>
        
        <div 
          className="stat-card"
          onClick={() => handleStatClick('wetDreams', safeUserData.wetDreamCount)}
        >
          <div className="stat-value">{safeUserData.wetDreamCount}</div>
          <div className="stat-label">Wet Dreams</div>
        </div>
        
        <div 
          className="stat-card"
          onClick={() => handleStatClick('relapses', safeUserData.relapseCount)}
        >
          <div className="stat-value">{safeUserData.relapseCount}</div>
          <div className="stat-label">Relapses</div>
        </div>
      </div>

      {/* Milestones */}
      <div className="milestones-section">
        <h3>Milestones</h3>
        <div className="milestones-grid">
          {milestones.map((milestone) => (
            <div
              key={milestone.days}
              className={`milestone-card ${milestone.earned ? 'earned' : 'locked'}`}
              onClick={() => handleMilestoneClick(milestone)}
            >
              <div className="milestone-days">{milestone.days}</div>
              <div className="milestone-name">{milestone.name}</div>
              {milestone.earned && <div className="milestone-check">✓</div>}
            </div>
          ))}
        </div>
      </div>

      {/* Benefit Tracker */}
      <div className="benefit-section">
        <h3>Benefits</h3>
        
        {/* Metric Toggle */}
        <div className="metric-toggle">
          {['energy', 'focus', 'confidence', 'aura', 'sleep', 'workout'].map((metric) => (
            <button
              key={metric}
              className={selectedMetric === metric ? 'active' : ''}
              onClick={() => setSelectedMetric(metric)}
            >
              {metric === 'sleep' ? 'Sleep' : metric.charAt(0).toUpperCase() + metric.slice(1)}
            </button>
          ))}
        </div>

        {/* Time Toggle */}
        <div className="time-toggle">
          {[
            { key: 'week', label: 'Week' },
            { key: 'month', label: 'Month' },
            { key: 'quarter', label: '3 Months' }
          ].map((range) => (
            <button
              key={range.key}
              className={timeRange === range.key ? 'active' : ''}
              onClick={() => setTimeRange(range.key)}
            >
              {range.label}
            </button>
          ))}
        </div>

        {/* Average Display */}
        <div className="average-display">
          <span className="average-value">{average}</span>
          <span className="average-max">/10</span>
        </div>
        <p className="average-label">
          Average {selectedMetric === 'sleep' ? 'Sleep Quality' : selectedMetric}
        </p>

        {/* Chart */}
        <div className="chart-container">
          {getFilteredBenefitData.length > 0 ? (
            <Line data={chartData} options={chartOptions} height={180} />
          ) : (
            <div className="no-chart-data">
              <p>Start tracking benefits to see your progress</p>
            </div>
          )}
        </div>

        {/* Insight */}
        {isPremium && getFilteredBenefitData.length >= 3 && (
          <div className="insights-section">
            <h3>Insight</h3>
            <div className="insight-card">
              <p className="insight-text">{insight.text}</p>
              {insight.action && (
                <p className="insight-action">{insight.action}</p>
              )}
            </div>
          </div>
        )}

        {/* Premium Lock */}
        {!isPremium && getFilteredBenefitData.length >= 7 && (
          <div className="insight-card premium-section">
            <div className="premium-lock-overlay">
              <p className="premium-lock-text">Unlock detailed insights and pattern analysis</p>
              <button className="premium-unlock-btn">Upgrade</button>
            </div>
            <p className="insight-text" style={{ filter: 'blur(4px)' }}>
              Your energy patterns show a strong correlation with...
            </p>
          </div>
        )}
      </div>

      {/* Reset Button */}
      <button className="reset-btn" onClick={() => setShowResetModal(true)}>
        Reset All Stats
      </button>

      {/* Milestone Modal */}
      {showMilestoneModal && selectedMilestone && (
        <div className="stats-overlay" onClick={() => setShowMilestoneModal(false)}>
          <div className="stats-modal" onClick={e => e.stopPropagation()}>
            <div className="milestone-modal-number">{selectedMilestone.days}</div>
            <div className="milestone-modal-name">{selectedMilestone.name}</div>
            {selectedMilestone.date && (
              <div className="milestone-modal-date">
                Reached {format(new Date(selectedMilestone.date), 'MMMM d, yyyy')}
              </div>
            )}
            <p className="milestone-modal-description">{selectedMilestone.description}</p>
            
            <div className="stats-modal-actions">
              <button className="btn-ghost" onClick={() => setShowMilestoneModal(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stat Detail Modal */}
      {showStatModal && selectedStat && (
        <div className="stats-overlay" onClick={() => setShowStatModal(false)}>
          <div className="stats-modal" onClick={e => e.stopPropagation()}>
            <div className="stat-modal-value">{selectedStat.value}</div>
            <div className="stat-modal-label">{selectedStat.label}</div>
            <p className="stat-modal-info">{selectedStat.description}</p>
            
            <div className="stats-modal-actions">
              <button className="btn-ghost" onClick={() => setShowStatModal(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Modal */}
      {showResetModal && (
        <div className="stats-overlay" onClick={() => setShowResetModal(false)}>
          <div className="reset-modal" onClick={e => e.stopPropagation()}>
            <h2>Reset All Stats?</h2>
            <p>This will permanently delete all your progress data including streaks, benefits, and milestones. This cannot be undone.</p>
            
            <div className="reset-modal-actions">
              <button className="btn-danger" onClick={handleReset}>
                Reset
              </button>
              <button className="btn-ghost" onClick={() => setShowResetModal(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Stats;