// components/Stats/Stats.js - FIXED: Complete file with syntax error corrected
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
  
  // UPDATED: Enhanced trigger options with theater masks and brain icons to match Calendar
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
      // Better mobile interaction
      pointRadius: 6,
      pointHoverRadius: 8,
      pointBorderWidth: 2,
      pointHoverBorderWidth: 3
    }];
    
    return { labels, datasets };
  };
  
  // Chart options with better mobile interaction and custom tooltip styling
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: {
        min: 0,
        max: 10,
        ticks: {
          stepSize: 2,
          color: '#aaaaaa',
          font: {
            size: 12
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
          font: {
            size: 12
          }
        },
        grid: {
          color: 'rgba(255, 255, 255, 0.1)',
          drawBorder: false
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
        },
        backgroundColor: 'rgba(44, 44, 44, 0.95)',
        titleColor: '#ffffff',
        bodyColor: '#ffffff',
        borderColor: '#ffdd00',
        borderWidth: 1,
        cornerRadius: 8,
        displayColors: false,
        padding: 12,
        titleFont: {
          size: 14,
          weight: 'bold'
        },
        bodyFont: {
          size: 13
        }
      }
    },
    interaction: {
      mode: 'index',
      intersect: false,
    },
    // Better mobile touch interaction
    onHover: (event, activeElements) => {
      event.native.target.style.cursor = activeElements.length > 0 ? 'pointer' : 'default';
    }
  };
  
  // Calculate average for the selected metric
  const calculateAverage = () => {
    const filteredData = getFilteredBenefitData();
    if (filteredData.length === 0) return 0;
    
    const sum = filteredData.reduce((acc, item) => acc + (item[selectedMetric] || 0), 0);
    return (sum / filteredData.length).toFixed(1);
  };
  
  // Generate streak comparison data (premium feature)
  const generateStreakComparison = () => {
    // In a real app, this would compare benefits across different streak lengths
    const filteredData = getFilteredBenefitData();
    
    if (filteredData.length === 0) {
      return {
        confidence: { short: 5.0, medium: 5.0, long: 5.0 },
        energy: { short: 5.0, medium: 5.0, long: 5.0 },
        focus: { short: 5.0, medium: 5.0, long: 5.0 },
        aura: { short: 5.0, medium: 5.0, long: 5.0 },
        attraction: { short: 5.0, medium: 5.0, long: 5.0 },
        workout: { short: 5.0, medium: 5.0, long: 5.0 }
      };
    }
    
    // Use actual data with some mock progression
    const baseValue = calculateAverage();
    const base = parseFloat(baseValue);
    
    return {
      confidence: {
        short: Math.max(1, base - 1.5).toFixed(1),
        medium: base.toFixed(1),
        long: Math.min(10, base + 1.2).toFixed(1)
      },
      energy: {
        short: Math.max(1, base - 1.2).toFixed(1),
        medium: base.toFixed(1),
        long: Math.min(10, base + 1.5).toFixed(1)
      },
      focus: {
        short: Math.max(1, base - 1.0).toFixed(1),
        medium: base.toFixed(1),
        long: Math.min(10, base + 1.3).toFixed(1)
      },
      aura: {
        short: Math.max(1, base - 1.3).toFixed(1),
        medium: base.toFixed(1),
        long: Math.min(10, base + 1.1).toFixed(1)
      },
      attraction: {
        short: Math.max(1, base - 1.4).toFixed(1),
        medium: base.toFixed(1),
        long: Math.min(10, base + 1.4).toFixed(1)
      },
      workout: {
        short: Math.max(1, base - 0.8).toFixed(1),
        medium: base.toFixed(1),
        long: Math.min(10, base + 1.0).toFixed(1)
      }
    };
  };
  
  const streakComparison = generateStreakComparison();
  
  // Generate insights based on benefit data (premium feature)
  const generateInsights = () => {
    const filteredData = getFilteredBenefitData();
    
    if (filteredData.length < 3) {
      return [
        {
          id: 1,
          text: "Track more days to see personalized insights about your progress.",
          metric: "general"
        }
      ];
    }
    
    const insights = [];
    const recentData = filteredData.slice(-7); // Last 7 days
    
    // Energy trend analysis
    const energyTrend = recentData.length > 1 ? 
      (recentData[recentData.length - 1].energy || 5) - (recentData[0].energy || 5) : 0;
    
    if (energyTrend > 1) {
      insights.push({
        id: insights.length + 1,
        text: "Your energy levels have been trending upward this week.",
        metric: "energy"
      });
    } else if (energyTrend < -1) {
      insights.push({
        id: insights.length + 1,
        text: "Consider what might be affecting your energy levels recently.",
        metric: "energy"
      });
    }
    
    // Focus analysis
    const focusAvg = recentData.reduce((sum, item) => sum + (item.focus || 5), 0) / recentData.length;
    if (focusAvg > 7) {
      insights.push({
        id: insights.length + 1,
        text: "Your focus levels have been consistently high this week.",
        metric: "focus"
      });
    }
    
    // Confidence analysis  
    const confidenceAvg = recentData.reduce((sum, item) => sum + (item.confidence || 5), 0) / recentData.length;
    if (confidenceAvg > 7) {
      insights.push({
        id: insights.length + 1,
        text: "Confidence shows strong improvement during your current streak.",
        metric: "confidence"
      });
    }
    
    // Default insights if no specific patterns found
    if (insights.length === 0) {
      insights.push({
        id: 1,
        text: "Your benefit tracking shows steady progress on your journey.",
        metric: selectedMetric
      });
    }
    
    return insights;
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
      
      {/* Benefits Tracking Section */}
      <div className="benefits-section">
        {isPremium ? (
          <>
            <div className="benefits-controls">
              <h3 className="benefits-controls-header">Benefit Visualizer</h3>
              <div className="metric-selector">
                <div className="metric-pill-container">
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
            
            <div className="chart-container-connected">
              <Line data={generateChartData()} options={chartOptions} height={300} />
            </div>
            
            <div className="benefits-insights-section">
              <h4>Pattern Insights</h4>
              
              <div className="average-stat-integrated">
                <div className="stat-label">Average {selectedMetric}</div>
                <div className="stat-value">{calculateAverage()}/10</div>
              </div>
              
              <div className="streak-comparison">
                <h5>Benefit Levels by Streak Length</h5>
                
                <div className="comparison-grid">
                  <div className="comparison-card">
                    <div className="comparison-value">{streakComparison[selectedMetric].short}</div>
                    <div className="comparison-label">1-7 Days</div>
                  </div>
                  
                  <div className="comparison-card">
                    <div className="comparison-value">{streakComparison[selectedMetric].medium}</div>
                    <div className="comparison-label">8-30 Days</div>
                  </div>
                  
                  <div className="comparison-card">
                    <div className="comparison-value">{streakComparison[selectedMetric].long}</div>
                    <div className="comparison-label">30+ Days</div>
                  </div>
                </div>
              </div>
              
              <div className="analysis-insights">
                <h5>Personalized Analysis</h5>
                
                <div className="insights-list">
                  {generateInsights().map(insight => (
                    <div 
                      key={insight.id} 
                      className={`insight-item ${insight.metric === selectedMetric ? 'highlighted' : ''}`}
                    >
                      <FaRegLightbulb className="insight-icon" />
                      <span>{insight.text}</span>
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
        )}
      </div>
      
      {/* Pattern Analysis Section */}
      <div className="pattern-analysis-section">
        <h3>Pattern Insights</h3>
        
        <div className="pattern-insights">
          {generatePatternInsights().length > 0 ? (
            generatePatternInsights().map(insight => (
              <div key={insight.id} className="pattern-insight-item">
                <div className="pattern-text">{insight.pattern}</div>
                <div className="pattern-actionable">{insight.actionable}</div>
              </div>
            ))
          ) : (
            <div className="no-patterns">
              <FaInfoCircle className="no-patterns-icon" />
              <span>Track more streaks to discover your personal patterns and triggers.</span>
            </div>
          )}
        </div>
      </div>
      
      {/* Badge Modal */}
      {showBadgeModal && selectedBadge && (
        <div className="modal-overlay" onClick={() => setShowBadgeModal(false)}>
          <div className="modal-content badge-modal" onClick={e => e.stopPropagation()}>
            <div className="badge-trophy">
              <FaMedal className="badge-trophy-icon" />
            </div>
            
            <h3>{selectedBadge.name}</h3>
            
            <div className="badge-earned-date">
              Earned on {selectedBadge.date ? format(new Date(selectedBadge.date), 'MMMM d, yyyy') : 'Unknown'}
            </div>
            
            <div className="badge-description">
              <p>
                {
                  selectedBadge.name === '7-Day Warrior' ? 
                    'You\'ve shown tremendous discipline by maintaining a 7-day streak. Your journey to mastery has begun!' :
                  selectedBadge.name === '14-Day Monk' ? 
                    'Two weeks of focus and control! You\'re developing the mindset of a monk, with greater clarity and purpose.' :
                  selectedBadge.name === '30-Day Master' ? 
                    'A full month of retention! Your willpower is exceptional, and the benefits are becoming more pronounced.' :
                  selectedBadge.name === '90-Day King' ? 
                    'The ultimate achievement! 90 days of complete discipline. You\'ve mastered your impulses and transformed your life.' :
                    'Congratulations on earning this achievement badge!'
                }
              </p>
            </div>
            
            <div className="badge-benefits">
              <h4>Unlock Benefits:</h4>
              <ul>
                <li>
                  <FaCheckCircle className="check-icon" />
                  <span>New affirmations in the Urge Toolkit</span>
                </li>
                {selectedBadge.name !== '7-Day Warrior' && (
                  <li>
                    <FaCheckCircle className="check-icon" />
                    <span>Exclusive challenges in the Community tab</span>
                  </li>
                )}
                {(selectedBadge.name === '30-Day Master' || selectedBadge.name === '90-Day King') && (
                  <li>
                    <FaCheckCircle className="check-icon" />
                    <span>Special Discord role and recognition</span>
                  </li>
                )}
              </ul>
            </div>
            
            <div className="modal-actions">
              {isPremium ? (
                <button className="btn btn-primary" onClick={() => setShowBadgeModal(false)}>
                  Share Achievement
                </button>
              ) : (
                <button className="btn btn-primary">
                  Upgrade to Share
                </button>
              )}
              <button className="btn btn-outline" onClick={() => setShowBadgeModal(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Stats;