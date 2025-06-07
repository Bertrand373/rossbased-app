// components/Stats/Stats.js - Updated with proper mobile layout
import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'react-hot-toast';
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
  Legend
} from 'chart.js';

// Icons
import { 
  FaTrophy, 
  FaFire, 
  FaMedal, 
  FaCrown, 
  FaLock, 
  FaRegLightbulb,
  FaRedo,
  FaEye,
  FaTimes
} from 'react-icons/fa';

import './Stats.css';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const Stats = ({ userData, updateUserData, isPremium = false }) => {
  const [selectedBadge, setSelectedBadge] = useState(null);
  const [showBadgeModal, setShowBadgeModal] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [selectedMetric, setSelectedMetric] = useState('confidence');
  const [timeRange, setTimeRange] = useState('month');
  const [wisdomMode, setWisdomMode] = useState(false);
  const [showFloatingToggle, setShowFloatingToggle] = useState(false);
  
  // Refs for scroll tracking
  const insightsStartRef = useRef(null);
  const patternSectionRef = useRef(null);
  
  // Chart options
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: '#ffffff',
        bodyColor: '#ffffff',
        borderColor: '#ffdd00',
        borderWidth: 1
      }
    },
    scales: {
      x: {
        grid: {
          color: 'rgba(255, 255, 255, 0.1)'
        },
        ticks: {
          color: '#888888'
        }
      },
      y: {
        min: 0,
        max: 10,
        grid: {
          color: 'rgba(255, 255, 255, 0.1)'
        },
        ticks: {
          color: '#888888'
        }
      }
    },
    elements: {
      line: {
        borderColor: '#ffdd00',
        borderWidth: 2,
        tension: 0.4
      },
      point: {
        backgroundColor: '#ffdd00',
        borderColor: '#ffffff',
        borderWidth: 2,
        radius: 4,
        hoverRadius: 6
      }
    }
  };
  
  // Generate benefit tracking data for chart
  const generateChartData = () => {
    const benefitData = userData.benefitTracking || [];
    const filteredData = getFilteredBenefitData();
    
    const labels = filteredData.map(item => format(new Date(item.date), 'MMM d'));
    const data = filteredData.map(item => item[selectedMetric] || 0);
    
    return {
      labels,
      datasets: [
        {
          label: selectedMetric.charAt(0).toUpperCase() + selectedMetric.slice(1),
          data,
          borderColor: '#ffdd00',
          backgroundColor: 'rgba(255, 221, 0, 0.1)',
          tension: 0.4
        }
      ]
    };
  };
  
  // Filter benefit data based on time range
  const getFilteredBenefitData = () => {
    const benefitData = userData.benefitTracking || [];
    const now = new Date();
    const daysBack = timeRangeOptions[timeRange];
    const cutoffDate = new Date(now.getTime() - (daysBack * 24 * 60 * 60 * 1000));
    
    return benefitData.filter(item => new Date(item.date) >= cutoffDate);
  };
  
  // Get current insight for the selected metric
  const getCurrentInsight = () => {
    const filteredData = getFilteredBenefitData();
    if (filteredData.length < 3) return "Track more data to get personalized insights.";
    
    const recent = filteredData.slice(-7);
    const average = recent.reduce((sum, item) => sum + item[selectedMetric], 0) / recent.length;
    
    if (wisdomMode) {
      if (average >= 8) return "Your energy aligns with higher frequencies. Maintain this sacred rhythm.";
      if (average >= 6) return "Progress flows through you. Trust the process of inner transformation.";
      return "Every step builds your foundation. Patience cultivates wisdom.";
    }
    
    if (average >= 8) return `Your ${selectedMetric} is excellent! You're in a great flow state.`;
    if (average >= 6) return `Your ${selectedMetric} is improving steadily. Keep up the momentum!`;
    return `Focus on building your ${selectedMetric} foundation with consistent practice.`;
  };
  
  // Floating wisdom toggle visibility logic
  useEffect(() => {
    if (!isPremium) return;
    
    const handleScroll = () => {
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const windowHeight = window.innerHeight;
      
      // Get positions
      const insightsStartTop = insightsStartRef.current?.offsetTop || 0;
      const patternSectionTop = patternSectionRef.current?.offsetTop || 0;
      const patternSectionHeight = patternSectionRef.current?.offsetHeight || 0;
      const patternSectionBottom = patternSectionTop + patternSectionHeight;
      
      // Show toggle when:
      // 1. User has scrolled to the insights section start
      // 2. User hasn't scrolled completely past the pattern analysis section
      const shouldShow = 
        scrollTop + windowHeight >= insightsStartTop && // Reached insights area
        scrollTop <= patternSectionBottom; // Haven't scrolled completely past pattern section
      
      setShowFloatingToggle(shouldShow);
    };
    
    // Add scroll listener
    window.addEventListener('scroll', handleScroll);
    
    // Check initial position
    handleScroll();
    
    // Cleanup
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isPremium]); // Re-run when premium status changes
  
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

  // Handle reset stats - AVAILABLE TO ALL USERS
  const handleResetStats = () => {
    setShowResetConfirm(true);
  };

  // Confirm reset stats - AVAILABLE TO ALL USERS
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

  // ADDED: Premium upgrade handler
  const handleUpgradeClick = () => {
    toast.success('Premium upgrade coming soon!');
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
      },
      motivation: {
        short: 5.5,
        medium: 7.2,
        long: 8.8
      },
      social: {
        short: 6.0,
        medium: 7.6,
        long: 8.5
      },
      workout: {
        short: 5.9,
        medium: 7.3,
        long: 8.6
      }
    };
  };
  
  const streakComparison = generateStreakComparison();
  
  // Generate pattern insights based on user data and wisdom mode
  const generatePatternInsights = () => {
    const insights = [];
    const currentStreak = userData.currentStreak || 0;
    const relapseCount = userData.relapseCount || 0;
    const wetDreamCount = userData.wetDreamCount || 0;
    
    // Insight based on current streak
    if (currentStreak >= 7) {
      insights.push({
        id: 1,
        practical: "You've built strong momentum. Focus on maintaining your current habits and routines.",
        esoteric: "Your energy is ascending. Channel this power mindfully to avoid spiritual pride.",
        actionable: wisdomMode ? 
          "Practice humility and gratitude daily. True strength comes from service to others." :
          "Identify your key success factors and double down on them. Consider sharing your progress with others."
      });
    }
    
    if (relapseCount >= 3) {
      insights.push({
        id: 2,
        practical: "Multiple relapses suggest you need to identify and address your trigger patterns.",
        esoteric: "The universe presents lessons until they are learned. Each fall teaches resilience.",
        actionable: wisdomMode ? 
          "Meditate on the deeper meaning behind your challenges. What is your soul trying to teach you?" :
          "Keep a detailed trigger journal. Note time, location, emotional state, and what led to each relapse."
      });
    }
    
    if (wetDreamCount > 0 && currentStreak > 14) {
      insights.push({
        id: 3,
        practical: "Wet dreams during longer streaks are normal. Focus on what you can control.",
        esoteric: "The body releases what it cannot transform. This is natural purification.",
        actionable: wisdomMode ? 
          "Accept this as part of your body's wisdom. Maintain your spiritual practices without judgment." :
          "Don't let wet dreams discourage you. They don't reset your benefits or progress."
      });
    }
    
    // Advanced insights for longer streaks
    if (currentStreak >= 30) {
      insights.push({
        id: 4,
        practical: "After 30+ days, examine overconfidence or external stressors that may be weakening your foundation.",
        esoteric: "After 30+ days, examine subtle pride or spiritual bypassing that may be creating energetic imbalances.",
        actionable: wisdomMode ?
          "Stay grounded through service and connection with nature. Avoid spiritual ego." :
          "After 30+ days, examine overconfidence or external stressors that may be weakening your foundation."
      });
    }

    return insights.length > 0 ? insights : [{
      id: 1,
      practical: "Continue tracking to identify patterns in your journey.",
      esoteric: "Continue tracking to identify patterns in your spiritual development.",
      actionable: wisdomMode ?
        "The path reveals itself to those who persist with awareness and dedication." :
        "Keep recording your experiences to understand your personal triggers and cycles."
    }];
  };

  return (
    <div className="stats-container">
      {/* UPDATED: Header matching Tracker and Calendar with Reset button */}
      <div className="stats-header">
        <div className="stats-header-spacer"></div>
        <h2>Your Stats</h2>
        <div className="stats-header-actions">
          <button 
            className="reset-stats-btn"
            onClick={handleResetStats}
            title="Reset All Stats"
          >
            <FaRedo />
            <span>Reset Stats</span>
          </button>
        </div>
      </div>
      
      {/* Streak Statistics - FIXED: Mobile layout shows 2x2 grid */}
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
      
      {/* Milestone Badges - FIXED: Mobile layout shows 2x2 grid */}
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
                  badge.id === 1 ? <FaTrophy /> :
                  badge.id === 2 ? <FaFire /> :
                  badge.id === 3 ? <FaMedal /> :
                  <FaCrown />
                ) : <FaLock />}
              </div>
              <div className="badge-name">{badge.name}</div>
              {badge.earned && badge.date && (
                <div className="badge-date">{formatDate(badge.date)}</div>
              )}
            </div>
          ))}
        </div>
      </div>
      
      {/* Premium Benefits Section */}
      {isPremium ? (
        <div className="benefits-section">
          <div className="benefits-header">
            <h3>Benefit Tracking</h3>
          </div>
          
          {/* ROW 1: Benefit metric selector */}
          <div className="benefits-controls">
            <div className="metric-selector-container">
              <div className="benefit-metrics-pills">
                <button 
                  className={`metric-pill ${selectedMetric === 'confidence' ? 'active' : ''}`}
                  onClick={() => setSelectedMetric('confidence')}
                >
                  Confidence
                </button>
                <button 
                  className={`metric-pill ${selectedMetric === 'energy' ? 'active' : ''}`}
                  onClick={() => setSelectedMetric('energy')}
                >
                  Energy
                </button>
                <button 
                  className={`metric-pill ${selectedMetric === 'focus' ? 'active' : ''}`}
                  onClick={() => setSelectedMetric('focus')}
                >
                  Focus
                </button>
                <button 
                  className={`metric-pill ${selectedMetric === 'motivation' ? 'active' : ''}`}
                  onClick={() => setSelectedMetric('motivation')}
                >
                  Motivation
                </button>
                <button 
                  className={`metric-pill ${selectedMetric === 'social' ? 'active' : ''}`}
                  onClick={() => setSelectedMetric('social')}
                >
                  Social
                </button>
                <button 
                  className={`metric-pill ${selectedMetric === 'workout' ? 'active' : ''}`}
                  onClick={() => setSelectedMetric('workout')}
                >
                  Workout
                </button>
              </div>
            </div>
            
            {/* ROW 2: Time range selector */}
            <div className="time-range-container">
              <div className="time-range-pills">
                <button 
                  className={`time-pill ${timeRange === 'week' ? 'active' : ''}`}
                  onClick={() => setTimeRange('week')}
                >
                  Week
                </button>
                <button 
                  className={`time-pill ${timeRange === 'month' ? 'active' : ''}`}
                  onClick={() => setTimeRange('month')}
                >
                  Month
                </button>
                <button 
                  className={`time-pill ${timeRange === 'quarter' ? 'active' : ''}`}
                  onClick={() => setTimeRange('quarter')}
                >
                  3 Months
                </button>
              </div>
            </div>
          </div>
          
          {/* REDESIGNED: Chart and Current Insight */}
          <div className="chart-and-insight-container" ref={insightsStartRef}>
            <div className="chart-container">
              <Line data={generateChartData()} options={chartOptions} height={300} />
            </div>
            
            {/* Current Insight Sidebar */}
            <div className="current-insight-sidebar">
              <div className="current-metric-average">
                <div className="current-metric-label">Average <span className="metric-highlight">{selectedMetric}</span></div>
                <div className="current-metric-value">{((getFilteredBenefitData().reduce((sum, item) => sum + item[selectedMetric], 0) / Math.max(getFilteredBenefitData().length, 1)) || 0).toFixed(1)}/10</div>
              </div>
              
              <div className="current-insight-card">
                <div className="current-insight-header">
                  <FaRegLightbulb className="insight-icon" />
                  <span>Current Insight</span>
                </div>
                <div className="current-insight-text">
                  {getCurrentInsight()}
                </div>
              </div>
            </div>
          </div>
          
          {/* REVERTED: Detailed Analysis Section */}
          <div className="detailed-analysis-section">
            <h4>Detailed Analysis</h4>
            
            <div className="streak-comparison">
              <h5>Streak Length Comparison for <span className="metric-highlight">{selectedMetric}</span></h5>
              
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
          </div>
          
          {/* Pattern Analysis Section */}
          <div className="pattern-analysis-section" ref={patternSectionRef}>
            <h4>Pattern Analysis</h4>
            
            <div className="pattern-insights-grid">
              {generatePatternInsights().map(insight => (
                <div key={insight.id} className="pattern-insight-item">
                  <div className="pattern-text">
                    {wisdomMode ? insight.esoteric : insight.practical}
                  </div>
                  <div className="pattern-actionable">
                    {insight.actionable}
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {/* Floating Wisdom Toggle */}
          {showFloatingToggle && (
            <div 
              className={`floating-wisdom-toggle ${wisdomMode ? 'active' : ''}`}
              onClick={() => setWisdomMode(!wisdomMode)}
              title={`Switch to ${wisdomMode ? 'Practical' : 'Esoteric'} Mode`}
            >
              <FaEye className={`floating-wisdom-eye ${wisdomMode ? 'active' : ''}`} />
            </div>
          )}
        </div>
      ) : (
        /* Non-Premium Benefits Upgrade CTA */
        <div className="benefit-upgrade-section">
          <div className="benefit-upgrade-cta">
            <div className="upgrade-text-section">
              <h4>Track Your Progress</h4>
              <p>Unlock detailed benefit tracking, pattern analysis, and personalized insights to optimize your journey.</p>
            </div>
            <div className="upgrade-visual-section">
              <div className="upgrade-helmet-icon">🏛️</div>
            </div>
          </div>
          
          <button className="benefit-upgrade-btn" onClick={handleUpgradeClick}>
            Upgrade to Premium
          </button>
        </div>
      )}
      
      {/* Badge Detail Modal */}
      {showBadgeModal && selectedBadge && (
        <div className="modal-overlay" onClick={() => setShowBadgeModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{selectedBadge.name}</h3>
              <button 
                className="modal-close"
                onClick={() => setShowBadgeModal(false)}
              >
                <FaTimes />
              </button>
            </div>
            <div className="modal-body">
              <div className="badge-detail-icon">
                {selectedBadge.id === 1 ? <FaTrophy /> :
                 selectedBadge.id === 2 ? <FaFire /> :
                 selectedBadge.id === 3 ? <FaMedal /> :
                 <FaCrown />}
              </div>
              <p>Earned on {formatDate(selectedBadge.date)}</p>
              <p>You've reached an important milestone in your journey!</p>
            </div>
          </div>
        </div>
      )}
      
      {/* Reset Confirmation Modal */}
      {showResetConfirm && (
        <div className="modal-overlay" onClick={() => setShowResetConfirm(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Reset All Stats</h3>
              <button 
                className="modal-close"
                onClick={() => setShowResetConfirm(false)}
              >
                <FaTimes />
              </button>
            </div>
            <div className="modal-body">
              <p>Are you sure you want to reset all your statistics? This will:</p>
              <ul>
                <li>Reset your current and longest streak to 0</li>
                <li>Reset wet dream and relapse counters</li>
                <li>Remove all earned badges</li>
                <li>Clear all benefit tracking data</li>
              </ul>
              <p><strong>This action cannot be undone.</strong></p>
              
              <div className="modal-actions">
                <button 
                  className="btn btn-danger"
                  onClick={confirmResetStats}
                >
                  Reset All Stats
                </button>
                <button 
                  className="btn btn-outline"
                  onClick={() => setShowResetConfirm(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Stats;