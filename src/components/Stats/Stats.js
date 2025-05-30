// components/Stats/Stats.js - FIXED: Extended Y-axis to prevent dot clipping
import React, { useState } from 'react';
import { format, subDays } from 'date-fns';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler } from 'chart.js';
// Import icons at the top
import { FaRegLightbulb, FaLock, FaMedal, FaTrophy, FaCheckCircle, FaRedo, FaInfoCircle, 
  FaExclamationTriangle, FaFrown, FaLaptop, FaHome, FaHeart, FaClock, FaBrain, FaTheaterMasks } from 'react-icons/fa';
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
  
  // Enhanced trigger options matching Calendar
  const triggerOptions = [
    { id: 'lustful_thoughts', label: 'Lustful Thoughts', icon: FaBrain },
    { id: 'stress', label: 'Stress', icon: FaExclamationTriangle },
    { id: 'boredom', label: 'Boredom', icon: FaClock },
    { id: 'social_media', label: 'Social Media', icon: FaLaptop },
    { id: 'loneliness', label: 'Loneliness', icon: FaFrown },
    { id: 'relationship', label: 'Relationship Issues', icon: FaHeart },
    { id: 'home_alone', label: 'Being Home Alone', icon: FaHome },
    { id: 'explicit_content', label: 'Explicit Content', icon: FaTheaterMasks }
  ];
  
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
      data: filteredData.map(item => item[selectedMetric] || 5),
      borderColor: '#ffdd00',
      backgroundColor: 'rgba(255, 221, 0, 0.1)',
      tension: 0.3,
      fill: true,
      pointBackgroundColor: '#ffdd00',
      pointBorderColor: '#ffdd00',
      pointHoverBackgroundColor: '#f6cc00',
      pointHoverBorderColor: '#f6cc00',
      pointRadius: 6,
      pointHoverRadius: 8,
      pointBorderWidth: 2,
      pointHoverBorderWidth: 3
    }];
    
    return { labels, datasets };
  };
  
  // FIXED: Chart options with extended Y-axis to prevent dot clipping
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: {
        min: 0,
        max: 11, // CHANGED: Extended from 10 to 11 to give dots breathing room
        ticks: {
          stepSize: 2,
          color: '#aaaaaa',
          font: { size: 12 },
          // ADDED: Custom callback to only show ticks 0, 2, 4, 6, 8, 10 (hide 11)
          callback: function(value) {
            return value <= 10 ? value : '';
          }
        },
        grid: {
          color: 'rgba(255, 255, 255, 0.1)',
          drawBorder: false
        }
      },
      x: {
        ticks: {
          color: '#aaaaaa',
          font: { size: 12 }
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
        callbacks: {
          title: (items) => {
            if (!items.length) return '';
            const idx = items[0].dataIndex;
            const filteredData = getFilteredBenefitData();
            return formatDate(filteredData[idx].date);
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
  };
  
  // Calculate average for the selected metric
  const calculateAverage = () => {
    const filteredData = getFilteredBenefitData();
    if (filteredData.length === 0) return '0.0';
    
    const sum = filteredData.reduce((acc, item) => acc + (item[selectedMetric] || 0), 0);
    return (sum / filteredData.length).toFixed(1);
  };
  
  // Generate streak comparison data
  const generateStreakComparison = () => {
    const filteredData = getFilteredBenefitData();
    
    if (filteredData.length === 0) {
      return {
        confidence: { short: '5.0', medium: '5.0', long: '5.0' },
        energy: { short: '5.0', medium: '5.0', long: '5.0' },
        focus: { short: '5.0', medium: '5.0', long: '5.0' },
        aura: { short: '5.0', medium: '5.0', long: '5.0' },
        attraction: { short: '5.0', medium: '5.0', long: '5.0' },
        workout: { short: '5.0', medium: '5.0', long: '5.0' }
      };
    }
    
    const baseValue = parseFloat(calculateAverage());
    
    return {
      confidence: {
        short: Math.max(1, baseValue - 1.5).toFixed(1),
        medium: baseValue.toFixed(1),
        long: Math.min(10, baseValue + 1.2).toFixed(1)
      },
      energy: {
        short: Math.max(1, baseValue - 1.2).toFixed(1),
        medium: baseValue.toFixed(1),
        long: Math.min(10, baseValue + 1.5).toFixed(1)
      },
      focus: {
        short: Math.max(1, baseValue - 1.0).toFixed(1),
        medium: baseValue.toFixed(1),
        long: Math.min(10, baseValue + 1.3).toFixed(1)
      },
      aura: {
        short: Math.max(1, baseValue - 1.3).toFixed(1),
        medium: baseValue.toFixed(1),
        long: Math.min(10, baseValue + 1.1).toFixed(1)
      },
      attraction: {
        short: Math.max(1, baseValue - 1.4).toFixed(1),
        medium: baseValue.toFixed(1),
        long: Math.min(10, baseValue + 1.4).toFixed(1)
      },
      workout: {
        short: Math.max(1, baseValue - 0.8).toFixed(1),
        medium: baseValue.toFixed(1),
        long: Math.min(10, baseValue + 1.0).toFixed(1)
      }
    };
  };
  
  const streakComparison = generateStreakComparison();
  
  // Generate all insights for the 6 metrics
  const generateAllInsights = () => {
    const filteredData = getFilteredBenefitData();
    
    if (filteredData.length < 3) {
      return [
        {
          id: 1,
          text: "Track more days to see personalized energy insights about your progress.",
          metric: "energy"
        },
        {
          id: 2,
          text: "Focus patterns become clearer with more data points tracked.",
          metric: "focus"
        },
        {
          id: 3,
          text: "Confidence trends emerge as you build a longer tracking history.",
          metric: "confidence"
        },
        {
          id: 4,
          text: "Aura improvements are best analyzed over extended tracking periods.",
          metric: "aura"
        },
        {
          id: 5,
          text: "Attraction benefits show patterns with consistent daily logging.",
          metric: "attraction"
        },
        {
          id: 6,
          text: "Workout performance correlations become visible with more tracking.",
          metric: "workout"
        }
      ];
    }
    
    const insights = [];
    const recentData = filteredData.slice(-7);
    
    // Helper function to calculate recent average for any metric
    const calculateRecentAverage = (metric) => {
      if (recentData.length === 0) return 5;
      const sum = recentData.reduce((acc, item) => acc + (item[metric] || 5), 0);
      return sum / recentData.length;
    };
    
    // Generate insights for all 6 metrics
    const energyTrend = recentData.length > 1 ? 
      (recentData[recentData.length - 1].energy || 5) - (recentData[0].energy || 5) : 0;
    const energyAvg = parseFloat(calculateAverage());
    
    if (energyTrend > 1.5) {
      insights.push({
        id: 1,
        text: "Your energy levels have been trending strongly upward this week.",
        metric: "energy"
      });
    } else if (energyTrend < -1.5) {
      insights.push({
        id: 1,
        text: "Consider what might be affecting your energy levels recently.",
        metric: "energy"
      });
    } else if (energyAvg > 7.5) {
      insights.push({
        id: 1,
        text: "Your energy levels are consistently high - excellent progress!",
        metric: "energy"
      });
    } else {
      insights.push({
        id: 1,
        text: "Energy typically peaks around day 10-14 of retention cycles.",
        metric: "energy"
      });
    }
    
    // Focus insights
    const focusAvg = calculateRecentAverage('focus');
    if (focusAvg > 7.5) {
      insights.push({
        id: 2,
        text: "Your focus levels have been consistently high this week.",
        metric: "focus"
      });
    } else if (focusAvg > 6) {
      insights.push({
        id: 2,
        text: "Focus tends to improve steadily after day 5 of retention.",
        metric: "focus"
      });
    } else {
      insights.push({
        id: 2,
        text: "Mental clarity often increases with longer retention periods.",
        metric: "focus"
      });
    }
    
    // Confidence insights
    const confidenceAvg = calculateRecentAverage('confidence');
    if (confidenceAvg > 7.5) {
      insights.push({
        id: 3,
        text: "Confidence shows strong improvement during your current streak.",
        metric: "confidence"
      });
    } else if (confidenceAvg > 6) {
      insights.push({
        id: 3,
        text: "Self-confidence typically builds gradually with retention practice.",
        metric: "confidence"
      });
    } else {
      insights.push({
        id: 3,
        text: "Confidence benefits often become noticeable after 2-3 weeks.",
        metric: "confidence"
      });
    }
    
    // Aura insights
    const auraAvg = calculateRecentAverage('aura');
    if (auraAvg > 7.5) {
      insights.push({
        id: 4,
        text: "Your aura and presence have been particularly strong lately.",
        metric: "aura"
      });
    } else if (auraAvg > 6) {
      insights.push({
        id: 4,
        text: "Aura improvements often correlate with longer retention periods.",
        metric: "aura"
      });
    } else {
      insights.push({
        id: 4,
        text: "Many report enhanced presence and magnetism with consistent practice.",
        metric: "aura"
      });
    }
    
    // Attraction insights
    const attractionAvg = calculateRecentAverage('attraction');
    if (attractionAvg > 7.5) {
      insights.push({
        id: 5,
        text: "Your attraction and magnetism levels are notably high this period.",
        metric: "attraction"
      });
    } else if (attractionAvg > 6) {
      insights.push({
        id: 5,
        text: "Attraction benefits often intensify after the first few weeks.",
        metric: "attraction"
      });
    } else {
      insights.push({
        id: 5,
        text: "Enhanced attraction is commonly reported with longer streaks.",
        metric: "attraction"
      });
    }
    
    // Workout insights
    const workoutAvg = calculateRecentAverage('workout');
    if (workoutAvg > 7.5) {
      insights.push({
        id: 6,
        text: "Your workout performance has been exceptionally strong lately.",
        metric: "workout"
      });
    } else if (workoutAvg > 6) {
      insights.push({
        id: 6,
        text: "Physical performance often improves with retained energy.",
        metric: "workout"
      });
    } else {
      insights.push({
        id: 6,
        text: "Many experience enhanced strength and endurance with retention.",
        metric: "workout"
      });
    }
    
    return insights;
  };

  // Get current insight for selected metric
  const getCurrentInsight = () => {
    const allInsights = generateAllInsights();
    return allInsights.find(insight => insight.metric === selectedMetric) || allInsights[0];
  };

  // Generate pattern analysis for triggers and relapses
  const generatePatternInsights = () => {
    if (!userData.streakHistory || userData.streakHistory.length < 2) {
      return [];
    }

    const insights = [];
    const relapsedStreaks = userData.streakHistory.filter(streak => 
      streak.reason === 'relapse' && streak.trigger
    );

    if (relapsedStreaks.length === 0) {
      return [{
        id: 1,
        pattern: "No relapse patterns identified yet.",
        actionable: "Continue tracking to identify potential triggers over time."
      }];
    }

    // Analyze most common trigger
    const triggerCounts = {};
    relapsedStreaks.forEach(streak => {
      if (streak.trigger) {
        triggerCounts[streak.trigger] = (triggerCounts[streak.trigger] || 0) + 1;
      }
    });

    const mostCommonTrigger = Object.keys(triggerCounts).reduce((a, b) => 
      triggerCounts[a] > triggerCounts[b] ? a : b
    );

    if (triggerCounts[mostCommonTrigger] > 1) {
      const triggerLabel = triggerOptions.find(t => t.id === mostCommonTrigger)?.label || mostCommonTrigger;
      insights.push({
        id: insights.length + 1,
        pattern: `"${triggerLabel}" appears to be your most common trigger (${triggerCounts[mostCommonTrigger]} times).`,
        actionable: `Consider developing specific strategies to handle ${triggerLabel.toLowerCase()} situations.`
      });
    }

    // Analyze streak length patterns
    const streakLengths = relapsedStreaks.map(streak => streak.days).filter(days => days > 0);
    if (streakLengths.length > 1) {
      const avgLength = Math.round(streakLengths.reduce((sum, len) => sum + len, 0) / streakLengths.length);
      if (avgLength < 14) {
        insights.push({
          id: insights.length + 1,
          pattern: `Your streaks typically end around day ${avgLength}.`,
          actionable: "Focus extra attention on days 10-15 when urges may be strongest."
        });
      }
    }

    return insights.length > 0 ? insights : [{
      id: 1,
      pattern: "Building your pattern database with each tracked experience.",
      actionable: "Continue logging triggers to identify personalized insights."
    }];
  };
  
  return (
    <div className="stats-container">
      {/* REDESIGNED: Header exactly like Tracker and Calendar */}
      <div className="stats-header">
        <div className="stats-header-spacer"></div>
        <h2>Your Stats</h2>
        <div className="stats-header-actions">
          <button className="reset-stats-btn" onClick={handleResetStats}>
            <FaRedo />
            <span>Reset Stats</span>
          </button>
        </div>
      </div>
      
      {/* Reset Confirmation Modal */}
      {showResetConfirm && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Reset All Stats?</h3>
            <p>This will permanently delete all your progress data including streaks, benefits, journal entries, and badges. This action cannot be undone.</p>
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
      
      {/* REDESIGNED: Benefit Tracker Section */}
      <div className="benefit-tracker-section">
        {isPremium ? (
          <>
            <h3>Benefit Tracker</h3>
            
            {/* Controls with 3-row pill layout */}
            <div className="benefit-tracker-controls">
              <div className="metric-selector">
                {/* ROW 1: Energy, Focus, Confidence */}
                <div className="metric-pill-container-row1">
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
                
                {/* ROW 2: Aura, Attraction, Workout */}
                <div className="metric-pill-container-row2">
                  <button 
                    className={`metric-btn ${selectedMetric === 'aura' ? 'active' : ''}`}
                    onClick={() => setSelectedMetric('aura')}
                  >
                    Aura
                  </button>
                  <button 
                    className={`metric-btn ${selectedMetric === 'attraction' ? 'active' : ''}`}
                    onClick={() => setSelectedMetric('attraction')}
                  >
                    Attraction
                  </button>
                  <button 
                    className={`metric-btn ${selectedMetric === 'workout' ? 'active' : ''}`}
                    onClick={() => setSelectedMetric('workout')}
                  >
                    Workout
                  </button>
                </div>
              </div>
              
              {/* ROW 3: Time range selector */}
              <div className="time-range-selector-container">
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
            </div>
            
            {/* REDESIGNED: Chart with Sidebar Layout (Desktop) / Stacked (Mobile) */}
            <div className="chart-and-insight-container">
              <div className="chart-container">
                <Line data={generateChartData()} options={chartOptions} height={300} />
              </div>
              
              {/* Current Insight Sidebar (Desktop) / Card (Mobile) */}
              <div className="current-insight-sidebar">
                <div className="current-metric-average">
                  <div className="current-metric-label">Average {selectedMetric}</div>
                  <div className="current-metric-value">{calculateAverage()}/10</div>
                </div>
                
                <div className="current-insight-card">
                  <div className="current-insight-header">
                    <FaRegLightbulb className="insight-icon" />
                    <span>Current Insight</span>
                  </div>
                  <div className="current-insight-text">
                    {getCurrentInsight().text}
                  </div>
                </div>
              </div>
            </div>
            
            {/* REDESIGNED: Detailed Analysis Section */}
            <div className="detailed-analysis-section">
              <h4>Detailed Analysis</h4>
              
              <div className="streak-comparison">
                <h5><span className="metric-highlight">{selectedMetric.charAt(0).toUpperCase() + selectedMetric.slice(1)}</span> Levels by Streak Length</h5>
                
                <div className="comparison-grid">
                  <div className="comparison-card">
                    <div className="comparison-value">{streakComparison[selectedMetric].short}/10</div>
                    <div className="comparison-label">1-7 Day Streak</div>
                  </div>
                  
                  <div className="comparison-card">
                    <div className="comparison-value">{streakComparison[selectedMetric].medium}/10</div>
                    <div className="comparison-label">8-30 Day Streak</div>
                  </div>
                  
                  <div className="comparison-card">
                    <div className="comparison-value">{streakComparison[selectedMetric].long}/10</div>
                    <div className="comparison-label">30+ Day Streak</div>
                  </div>
                </div>
              </div>
              
              <div className="personalized-analysis">
                <h5>Personalized Analysis</h5>
                
                <div className="insights-grid">
                  {generateAllInsights().map(insight => (
                    <div 
                      key={insight.id} 
                      className={`insight-card ${insight.metric === selectedMetric ? 'highlighted' : ''}`}
                    >
                      <div className="insight-card-header">
                        <FaRegLightbulb className="insight-icon" />
                        <span className="insight-metric">{insight.metric.charAt(0).toUpperCase() + insight.metric.slice(1)}</span>
                      </div>
                      <div className="insight-text">{insight.text}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="premium-lock">
            <div className="free-benefit-tracker">
              <h4>Track Your Energy Levels</h4>
              
              <div className="benefit-rating">
                <span>How's your energy today?</span>
                
                <div className="rating-slider">
                  <input 
                    type="range" 
                    min="1" 
                    max="10" 
                    defaultValue="7" 
                    className="range-slider"
                  />
                  <div className="rating-labels">
                    <span>Low</span>
                    <span>High</span>
                  </div>
                </div>
                
                <button className="btn btn-primary">Save Rating</button>
              </div>
              
              <div className="limited-stats">
                <p>Last 7 days average: <strong>7.5/10</strong></p>
              </div>
            </div>
            
            <div className="premium-overlay">
              <FaLock className="lock-icon" />
              <div className="premium-message">
                <h3>Unlock Full Benefit Tracking</h3>
                <p>Premium members can track multiple benefits, view detailed graphs, and get personalized insights.</p>
                <button className="btn btn-primary">Upgrade to Premium</button>
              </div>
            </div>
          </div>