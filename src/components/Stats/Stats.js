// components/Stats/Stats.js
import React, { useState } from 'react';
import { format, subDays } from 'date-fns';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler } from 'chart.js';
// Import icons at the top
import { FaRegLightbulb, FaLock, FaMedal, FaTrophy, FaCheckCircle, FaRedo } from 'react-icons/fa';
import './Stats.css';
import toast from 'react-hot-toast';

// Register ChartJS components
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

const Stats = ({ userData, isPremium, updateUserData }) => {
  const [selectedMetric, setSelectedMetric] = useState('energy');
  const [timeRange, setTimeRange] = useState('week');
  const [showBadgeModal, setShowBadgeModal] = useState(false);
  const [selectedBadge, setSelectedBadge] = useState(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  
  // Time range options for chart
  const timeRangeOptions = {
    week: 7,
    month: 30,
    quarter: 90
  };
  
  // Format date for displaying
  const formatDate = (date) => format(new Date(date), 'MMM d, yyyy');
  
  // Handle badge click
  const handleBadgeClick = (badge) => {
    setSelectedBadge(badge);
    setShowBadgeModal(true);
  };

  // Handle reset stats
  const handleResetStats = () => {
    setShowResetConfirm(true);
  };

  // Confirm reset stats
  const confirmResetStats = () => {
    // Reset all stats
    const resetUserData = {
      ...userData,
      startDate: new Date(),
      currentStreak: 0,
      longestStreak: 0,
      wetDreamCount: 0,
      relapseCount: 0,
      badges: [
        { id: 1, name: '7-Day Warrior', earned: false, date: null },
        { id: 2, name: '14-Day Monk', earned: false, date: null },
        { id: 3, name: '30-Day Master', earned: false, date: null },
        { id: 4, name: '90-Day King', earned: false, date: null }
      ],
      benefitTracking: [],
      streakHistory: [{
        id: 1,
        start: new Date(),
        end: null,
        days: 0,
        reason: null
      }],
      notes: {}
    };
    
    updateUserData(resetUserData);
    setShowResetConfirm(false);
    toast.success('All stats have been reset');
  };
  
  // Filter benefit data based on selected time range
  const getFilteredBenefitData = () => {
    if (!userData.benefitTracking) return [];
    
    const days = timeRangeOptions[timeRange];
    const cutoffDate = subDays(new Date(), days);
    
    return userData.benefitTracking
      .filter(item => new Date(item.date) >= cutoffDate)
      .sort((a, b) => new Date(a.date) - new Date(b.date));
  };
  
  // Generate chart data
  const generateChartData = () => {
    const filteredData = getFilteredBenefitData();
    
    const labels = filteredData.map(item => 
      format(new Date(item.date), 'MMM d')
    );
    
    const datasets = [{
      label: selectedMetric.charAt(0).toUpperCase() + selectedMetric.slice(1),
      data: filteredData.map(item => item[selectedMetric]),
      borderColor: 'rgb(255, 255, 255)',
      backgroundColor: 'rgba(255, 255, 255, 0.1)',
      tension: 0.3,
      fill: true
    }];
    
    return { labels, datasets };
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
          color: 'rgba(255, 255, 255, 0.7)'
        },
        grid: {
          color: 'rgba(255, 255, 255, 0.1)'
        }
      },
      x: {
        ticks: {
          color: 'rgba(255, 255, 255, 0.7)'
        },
        grid: {
          color: 'rgba(255, 255, 255, 0.1)'
        }
      }
    },
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        callbacks: {
          title: (items) => {
            if (!items.length) return '';
            const idx = items[0].dataIndex;
            const filteredData = getFilteredBenefitData();
            return formatDate(filteredData[idx].date);
          }
        }
      }
    }
  };
  
  // Calculate average for the selected metric
  const calculateAverage = () => {
    const filteredData = getFilteredBenefitData();
    if (filteredData.length === 0) return 0;
    
    const sum = filteredData.reduce((acc, item) => acc + item[selectedMetric], 0);
    return (sum / filteredData.length).toFixed(1);
  };
  
  // Generate streak comparison data (premium feature)
  const generateStreakComparison = () => {
    // In a real app, this would compare benefits across different streak lengths
    // For demo purposes, we'll use mock data
    return {
      confidence: {
        short: 5.2,
        medium: 7.5,
        long: 8.9
      },
      energy: {
        short: 6.1,
        medium: 7.8,
        long: 9.3
      },
      focus: {
        short: 5.8,
        medium: 7.4,
        long: 8.7
      }
    };
  };
  
  const streakComparison = generateStreakComparison();
  
  // Generate insights based on benefit data (premium feature)
  const generateInsights = () => {
    // In a real app, this would analyze patterns in the data
    // For demo purposes, we'll use pre-defined insights
    return [
      {
        id: 1,
        text: "Your energy peaks around Day 10 of your streak.",
        metric: "energy"
      },
      {
        id: 2,
        text: "Focus tends to improve steadily after Day 5.",
        metric: "focus"
      },
      {
        id: 3,
        text: "Confidence shows the biggest improvement during your streaks.",
        metric: "confidence"
      }
    ];
  };
  
  return (
    <div className="stats-container">
      <div className="stats-header">
        <h2>Your Stats</h2>
        <button className="reset-stats-btn" onClick={handleResetStats}>
          <FaRedo /> Reset Stats
        </button>
      </div>
      
      {/* Reset Confirmation Modal */}
      {showResetConfirm && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Reset All Stats?</h3>
            <p>This will reset all your stats, including streaks, badges, and tracking history. This action cannot be undone.</p>
            <div className="form-actions">
              <button className="btn btn-danger" onClick={confirmResetStats}>Reset Everything</button>
              <button className="btn btn-outline" onClick={() => setShowResetConfirm(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
      
      {/* Streak Statistics */}
      <div className="streak-stats">
        <div className="stat-card current-streak">
          <div className="stat-value">{userData.currentStreak || 0}</div>
          <div className="stat-label">Current Streak</div>
        </div>
        
        <div className="stat-card longest-streak">
          <div className="stat-value">{userData.longestStreak || 0}</div>
          <div className="stat-label">Longest Streak</div>
        </div>
        
        <div className="stat-card total-wetdreams">
          <div className="stat-value">{userData.wetDreamCount || 0}</div>
          <div className="stat-label">Wet Dreams</div>
        </div>
        
        <div className="stat-card total-relapses">
          <div className="stat-value">{userData.relapseCount || 0}</div>
          <div className="stat-label">Relapses</div>
        </div>
      </div>
      
      {/* Milestone Badges */}
      <div className="milestone-section">
        <h3>Your Achievements</h3>
        
        <div className="badges-grid">
          {userData.badges && userData.badges.map(badge => (
            <div 
              key={badge.id} 
              className={`badge-card ${badge.earned ? 'earned' : 'locked'}`}
              onClick={() => badge.earned && handleBadgeClick(badge)}
            >
              <div className="badge-icon">
                {badge.earned ? (
                  <FaTrophy className="badge-earned-icon" />
                ) : (
                  <FaLock className="badge-locked-icon" />
                )}
              </div>
              <div className="badge-name">{badge.name}</div>
              {badge.earned && (
                <div className="badge-date">
                  Earned {badge.date ? format(new Date(badge.date), 'MMM d') : ''}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
      
      {/* Benefits Tracking Section */}
      <div className="benefits-section">
        <h3>Benefit Tracker</h3>
        
        {isPremium ? (
          <>
            <div className="benefits-controls">
              <div className="metric-selector">
                <button 
                  className={`metric-btn ${selectedMetric === 'energy' ? 'active' : ''}`}
                  onClick={() => setSelectedMetric('energy')}
                >
                  Energy
                </button>
                <button 
                  className={`metric-btn ${selectedMetric === 'focus' ? 'active' : ''}`}
                  onClick={() => setSelectedMetric('focus')}
                >
                  Focus
                </button>
                <button 
                  className={`metric-btn ${selectedMetric === 'confidence' ? 'active' : ''}`}
                  onClick={() => setSelectedMetric('confidence')}
                >
                  Confidence
                </button>
              </div>
              
              <div className="time-range-selector">
                <button 
                  className={`time-btn ${timeRange === 'week' ? 'active' : ''}`}
                  onClick={() => setTimeRange('week')}
                >
                  Week
                </button>
                <button 
                  className={`time-btn ${timeRange === 'month' ? 'active' : ''}`}
                  onClick={() => setTimeRange('month')}
                >
                  Month
                </button>
                <button 
                  className={`time-btn ${timeRange === 'quarter' ? 'active' : ''}`}
                  onClick={() => setTimeRange('quarter')}
                >
                  3 Months
                </button>
              </div>
            </div>
            
            <div className="chart-container">
              <Line data={generateChartData()} options={chartOptions} height={300} />
            </div>
            
            <div className="benefits-stats">
              <div className="average-stat">
                <div className="stat-label">Average {selectedMetric}</div>
                <div className="stat-value">{calculateAverage()}/10</div>
              </div>
              
              <div className="streak-comparison">
                <h4>Streak Comparison</h4>
                
                <div className="comparison-grid">
                  <div className="comparison-item">
                    <div className="comparison-label">1-7 Days</div>
                    <div className="comparison-value">{streakComparison[selectedMetric].long}</div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="benefits-insights">
              <h4>Personalized Insights</h4>
              
              <div className="insights-list">
      selectedMetric].short}</div>
                  </div>
                  
                  <div className="comparison-item">
                    <div className="comparison-label">8-30 Days</div>
                    <div className="comparison-value">{streakComparison[selectedMetric].medium}</div>
                  </div>
                  
                  <div className="comparison-item">
                    <div className="comparison-label">30+ Days</div>
                    <div className="comparison-value">{streakComparison[