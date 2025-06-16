// components/Stats/Stats.js - UPDATED: Progressive premium lock matching Timeline pattern
import React, { useState, useEffect, useRef } from 'react';
import { format, subDays } from 'date-fns';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler } from 'chart.js';
// Import icons at the top
import { FaRegLightbulb, FaLock, FaMedal, FaTrophy, FaCheckCircle, FaRedo, FaInfoCircle, 
  FaExclamationTriangle, FaFrown, FaLaptop, FaHome, FaHeart, FaClock, FaBrain, FaTheaterMasks, FaEye, FaStar } from 'react-icons/fa';
import './Stats.css';
import toast from 'react-hot-toast';

// Import helmet image to match Timeline design
import helmetImage from '../../assets/helmet.png';

// Register ChartJS components
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

const Stats = ({ userData, isPremium, updateUserData }) => {
  const [selectedMetric, setSelectedMetric] = useState('energy');
  const [timeRange, setTimeRange] = useState('week');
  const [showBadgeModal, setShowBadgeModal] = useState(false);
  const [selectedBadge, setSelectedBadge] = useState(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  
  // NEW: Wisdom toggle states
  const [wisdomMode, setWisdomMode] = useState(false); // false = practical, true = esoteric
  
  // NEW: Smart floating toggle visibility
  const [showFloatingToggle, setShowFloatingToggle] = useState(false);
  
  // NEW: Refs for scroll detection
  const insightsStartRef = useRef(null); // Current insight section start
  const patternSectionRef = useRef(null); // Pattern analysis section
  
  // Enhanced trigger options matching Calendar
  const triggerOptions = [
    { id: 'lustful_thoughts', label: 'Lustful Thoughts', icon: FaBrain },
    { id: 'stress', label: 'Stress', icon: FaExclamationTriangle },
    { id: 'boredom', label: 'Boredom', icon: FaClock },
    { id: 'social_media', label: 'Social Media', icon: FaLaptop },
    { id: 'loneliness', label: 'Loneliness', icon: FaFrown },
    { id: 'relationship', label: 'Relationship Issues', icon: FaHeart },
    { id: 'home_environment', label: 'Home Environment', icon: FaHome }
  ];

  // NEW: Smart floating toggle scroll detection
  useEffect(() => {
    if (!isPremium) return; // Only show for premium users
    
    const handleScroll = () => {
      if (!insightsStartRef.current || !patternSectionRef.current) return;
      
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const windowHeight = window.innerHeight;
      
      const insightsStartTop = insightsStartRef.current.offsetTop;
      const patternSectionBottom = patternSectionRef.current.offsetTop + patternSectionRef.current.offsetHeight;
      
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
    toast.success('Premium upgrade coming soon! 🚀');
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
  
  // Generate chart data - UPDATED: Handle sleep metric
  const generateChartData = () => {
    const filteredData = getFilteredBenefitData();
    
    const labels = filteredData.map(item => 
      format(new Date(item.date), 'MMM d')
    );
    
    const datasets = [{
      label: selectedMetric.charAt(0).toUpperCase() + selectedMetric.slice(1),
      data: filteredData.map(item => {
        // MIGRATION: Handle old attraction data -> sleep data
        if (selectedMetric === 'sleep') {
          return item[selectedMetric] || item.attraction || 5;
        }
        return item[selectedMetric] || 5;
      }),
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
  
  // Chart options - reverted to original clean version
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
          font: { size: 12 }
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
  
  // Calculate average for the selected metric - UPDATED: Handle sleep
  const calculateAverage = () => {
    const filteredData = getFilteredBenefitData();
    if (filteredData.length === 0) return '0.0';
    
    const sum = filteredData.reduce((acc, item) => {
      // MIGRATION: Handle old attraction data -> sleep data
      if (selectedMetric === 'sleep') {
        return acc + (item[selectedMetric] || item.attraction || 0);
      }
      return acc + (item[selectedMetric] || 0);
    }, 0);
    return (sum / filteredData.length).toFixed(1);
  };
  
  // Generate streak comparison data - UPDATED: Include sleep
  const generateStreakComparison = () => {
    const filteredData = getFilteredBenefitData();
    
    if (filteredData.length === 0) {
      return {
        confidence: { short: '5.0', medium: '5.0', long: '5.0' },
        energy: { short: '5.0', medium: '5.0', long: '5.0' },
        focus: { short: '5.0', medium: '5.0', long: '5.0' },
        aura: { short: '5.0', medium: '5.0', long: '5.0' },
        sleep: { short: '5.0', medium: '5.0', long: '5.0' },
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
      sleep: {
        short: Math.max(1, baseValue - 1.1).toFixed(1),
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
  
  // UPDATED: Generate dual insights - both practical and esoteric for all 6 metrics
  const generateAllInsights = () => {
    const filteredData = getFilteredBenefitData();
    
    if (filteredData.length < 3) {
      return [
        {
          id: 1,
          practical: "Track more days to see personalized energy patterns and improvement trends in your data.",
          esoteric: "Track more days to see personalized energy insights about your progress and vital force patterns.",
          actionable: wisdomMode ? 
            "Continue tracking to unlock the deeper rhythms of your energetic transformation." :
            "Continue tracking to identify what factors most influence your energy levels.",
          metric: 'energy'
        },
        {
          id: 2,
          practical: "More data points will reveal focus patterns and concentration trends over time.",
          esoteric: "More data points will reveal your mind's clarity cycles and mental purification patterns.",
          actionable: wisdomMode ?
            "Focus tracking reveals the clarity of your consciousness as it purifies through practice." :
            "Focus tracking helps identify the best times and conditions for concentration.",
          metric: 'focus'
        }
      ];
    }
    
    const insights = [];
    const currentStreak = userData.currentStreak || 0;
    
    // Metric-specific insights based on current data
    const avgValue = parseFloat(calculateAverage());
    
    if (avgValue >= 7) {
      insights.push({
        id: 1,
        practical: `Your ${selectedMetric === 'sleep' ? 'sleep quality' : selectedMetric} levels are excellent! You're maintaining high performance.`,
        esoteric: `Your ${selectedMetric === 'sleep' ? 'sleep quality' : selectedMetric} energy resonates at a high frequency - you're aligning with your highest potential.`,
        actionable: wisdomMode ?
          "Maintain this elevated state through continued spiritual discipline and conscious awareness." :
          "Keep doing what you're doing - identify the key factors that maintain these levels.",
        metric: selectedMetric
      });
    } else if (avgValue >= 5) {
      insights.push({
        id: 1,
        practical: `Your ${selectedMetric === 'sleep' ? 'sleep quality' : selectedMetric} is steady but has room for improvement with longer streaks.`,
        esoteric: `Your ${selectedMetric === 'sleep' ? 'sleep quality' : selectedMetric} shows growing inner stability - the foundation for greater transformation is being built.`,
        actionable: wisdomMode ?
          "This stability in your practice opens doorways to deeper levels of consciousness and energy mastery." :
          "Focus on consistency and gradual improvement rather than dramatic changes.",
        metric: selectedMetric
      });
    } else {
      insights.push({
        id: 1,
        practical: `Your ${selectedMetric === 'sleep' ? 'sleep quality' : selectedMetric} could benefit from focusing on streak consistency and healthy habits.`,
        esoteric: `Your ${selectedMetric === 'sleep' ? 'sleep quality' : selectedMetric} reflects an opportunity for inner growth - every challenge contains the seed of transformation.`,
        actionable: wisdomMode ?
          "See this phase as purification - you're clearing old patterns to make space for higher energies." :
          "Start with small, consistent daily practices that support your overall wellbeing.",
        metric: selectedMetric
      });
    }
    
    // Streak-based insights
    if (currentStreak >= 30) {
      insights.push({
        id: 2,
        practical: "You've developed strong self-control habits. Consider setting more advanced personal goals.",
        esoteric: "You've transcended basic impulses and entered the realm of spiritual mastery - your energy is now purified enough for higher work.",
        actionable: wisdomMode ?
          "Your challenge now is maintaining this state while serving others and expressing your highest creative potential." :
          "Your challenge now is maintaining consistency while helping others and pursuing your highest goals.",
        metric: selectedMetric
      });
    } else if (currentStreak >= 14) {
      insights.push({
        id: 2,
        practical: "You're building strong momentum. Two weeks of progress shows real commitment to change.",
        esoteric: "You've completed a full energy cycle - your vital force is stabilizing at a higher frequency.",
        actionable: wisdomMode ?
          "The next phase requires deeper surrender and trust in the transformative process unfolding within you." :
          "The next phase is about maintaining consistency through challenging moments and stress.",
        metric: selectedMetric
      });
    } else if (currentStreak >= 7) {
      insights.push({
        id: 2,
        practical: "One week of consistency is an excellent foundation. Your habits are starting to solidify.",
        esoteric: "You've completed one full cycle of transformation - your energy patterns are shifting toward higher vibrations.",
        actionable: wisdomMode ?
          "Each seven-day cycle represents one complete spiritual revolution - you're ascending through levels of consciousness." :
          "Each week of progress builds stronger neural pathways that support your long-term success.",
        metric: selectedMetric
      });
    }
    
    // Add cosmic cycle insights for advanced users
    if (currentStreak > 0 && currentStreak % 7 === 0) {
      insights.push({
        id: insights.length + 1,
        practical: `You've completed ${currentStreak / 7} full weekly cycles - weekly patterns help maintain consistent progress.`,
        esoteric: `You've completed ${currentStreak / 7} full weekly cycles - each 7-day period represents one complete energy transformation.`,
        actionable: wisdomMode ?
          "Weekly cycles mirror the cosmic rhythm. Use Sundays for reflection and intention-setting for the next cycle." :
          "Use weekly milestones for reflection and goal-setting to maintain motivation and track progress.",
        metric: selectedMetric
      });
    }
    
    if (currentStreak >= 28) {
      insights.push({
        id: insights.length + 1,
        practical: "You've completed a full monthly cycle of retention - you're in the advanced consistency phase.",
        esoteric: "You've completed a full lunar cycle of retention - your energy now follows celestial rhythms rather than earthly impulses.",
        actionable: wisdomMode ?
          "Track your energy with moon phases. New moons are ideal for setting intentions, full moons for releasing lower desires." :
          "Maintain your proven strategies while exploring how this energy can fuel your biggest life goals.",
        metric: selectedMetric
      });
    }
    
    return insights.length > 0 ? insights : [{
      id: 1,
      practical: "Continue tracking to discover patterns in your behavior and decision-making processes.",
      esoteric: "The universe is revealing your unique energetic patterns through each experience.",
      actionable: wisdomMode ?
        "Continue the sacred work of self-observation - every cycle teaches you something new about your inner nature." :
        "Keep detailed notes about your mood, environment, and circumstances to identify helpful patterns.",
      metric: selectedMetric
    }];
  };

  // Generate current insight for sidebar
  const getCurrentInsight = () => {
    const insights = generateAllInsights();
    const currentInsight = insights.find(insight => insight.metric === selectedMetric) || insights[0];
    return wisdomMode ? currentInsight.esoteric : currentInsight.practical;
  };

  // Generate pattern insights - focused on behavioral patterns
  const generatePatternInsights = () => {
    const filteredData = getFilteredBenefitData();
    
    if (filteredData.length < 5) {
      return [];
    }
    
    const patterns = [];
    const currentStreak = userData.currentStreak || 0;
    
    // Weekly pattern analysis
    if (currentStreak >= 14) {
      patterns.push({
        id: 1,
        practical: "Your consistency over two weeks shows strong pattern formation in your daily routine.",
        esoteric: "Your consistent practice is creating new energetic pathways that align with higher consciousness.",
        actionable: wisdomMode ?
          "Continue this rhythm to establish permanent positive changes in your energy field." :
          "Maintain these positive patterns by tracking what specific daily habits support your success."
      });
    }
    
    // Streak momentum patterns
    if (userData.longestStreak && userData.longestStreak > currentStreak && currentStreak > 0) {
      patterns.push({
        id: 2,
        practical: `You've previously achieved ${userData.longestStreak} days. Your current ${currentStreak}-day streak shows you're rebuilding that momentum.`,
        esoteric: `Your previous ${userData.longestStreak}-day journey created lasting changes in your consciousness. This current cycle builds upon that foundation.`,
        actionable: wisdomMode ?
          "Each attempt deepens your spiritual capacity. You're not starting over - you're spiraling upward." :
          "Each attempt strengthens your resolve. Apply lessons learned from your previous success."
      });
    }
    
    return patterns;
  };
  
  return (
    <div className="stats-container">
      {/* Smart Floating Wisdom Toggle - Only shows for premium users when insights are visible */}
      {showFloatingToggle && isPremium && (
        <button 
          className={`floating-wisdom-toggle ${wisdomMode ? 'active' : ''}`}
          onClick={() => setWisdomMode(!wisdomMode)}
          title={wisdomMode ? "Switch to Practical Insights" : "Switch to Esoteric Insights"}
        >
          <FaEye className={`floating-wisdom-eye ${wisdomMode ? 'active' : ''}`} />
        </button>
      )}

      {/* Header exactly like Tracker and Calendar */}
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
      
      {/* Reset Confirmation Modal - AVAILABLE TO ALL USERS */}
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
      
      {/* Streak Statistics - ALWAYS VISIBLE */}
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
      
      {/* Milestone Badges - ALWAYS VISIBLE */}
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
      
      {/* PROGRESSIVE PREMIUM: Benefit Tracker Section */}
      <div className="benefit-tracker-section">
        <h3>Benefit Tracker</h3>
        
        {/* Controls - ALWAYS VISIBLE (so users can see different averages) */}
        <div className="benefit-tracker-controls">
          <div className="metric-selector">
            {/* SINGLE ROW: All 6 benefit items in one container */}
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
                className={`metric-btn ${selectedMetric === 'sleep' ? 'active' : ''}`}
                onClick={() => setSelectedMetric('sleep')}
              >
                Sleep Quality
              </button>
              <button 
                className={`metric-btn ${selectedMetric === 'workout' ? 'active' : ''}`}
                onClick={() => setSelectedMetric('workout')}
              >
                Workout
              </button>
            </div>
          </div>
          
          {/* Time range selector - UNCHANGED */}
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
        
        {/* FREE USER CONTENT: Average + One Insight */}
        {!isPremium && (
          <div className="free-benefit-preview">
            {/* Average Display */}
            <div className="free-average-display">
              <div className="current-metric-average">
                <div className="current-metric-label">Average {selectedMetric === 'sleep' ? 'Sleep Quality' : selectedMetric.charAt(0).toUpperCase() + selectedMetric.slice(1)}</div>
                <div className="current-metric-value">{calculateAverage()}/10</div>
              </div>
            </div>
            
            {/* Single Insight Preview */}
            <div className="free-insight-preview">
              <div className="current-insight-card">
                <div className="current-insight-header">
                  <FaRegLightbulb className="insight-icon" />
                  <span>Sample Insight</span>
                </div>
                <div className="current-insight-text">
                  {getCurrentInsight()}
                </div>
              </div>
            </div>
            
            {/* PREMIUM UPGRADE CTA */}
            <div className="benefit-upgrade-cta">
              <div className="upgrade-helmet-section">
                <img 
                  src={helmetImage} 
                  alt="Premium Benefits" 
                  className="upgrade-helmet-icon"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.nextSibling.style.display = 'block';
                  }}
                />
                <div className="upgrade-helmet-fallback" style={{display: 'none'}}>⚡</div>
              </div>
              
              <div className="upgrade-text-section">
                <h4>Unlock Full Benefit Analysis</h4>
                <p>Get detailed charts, advanced insights, pattern analysis, and personalized recommendations to optimize your journey.</p>
                
                <button className="benefit-upgrade-btn" onClick={handleUpgradeClick}>
                  <FaStar />
                  Upgrade to Premium
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* PREMIUM USER CONTENT: Full Analysis */}
        {isPremium && (
          <>
            {/* Chart and Current Insight Container - REF MARKER for scroll detection */}
            <div className="chart-and-insight-container" ref={insightsStartRef}>
              <div className="chart-container">
                <Line data={generateChartData()} options={chartOptions} height={300} />
              </div>
              
              <div className="current-insight-sidebar">
                <div className="current-metric-average">
                  <div className="current-metric-label">Average {selectedMetric === 'sleep' ? 'Sleep Quality' : selectedMetric.charAt(0).toUpperCase() + selectedMetric.slice(1)}</div>
                  <div className="current-metric-value">{calculateAverage()}/10</div>
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
            
            {/* Detailed Analysis Section */}
            <div className="detailed-analysis-section">
              <h4>Detailed Analysis</h4>
              
              <div className="streak-comparison">
                <h5><span className="metric-highlight">{selectedMetric === 'sleep' ? 'Sleep Quality' : selectedMetric.charAt(0).toUpperCase() + selectedMetric.slice(1)}</span> Levels by Streak Length</h5>
                
                <div className="comparison-grid">
                  <div className="comparison-card">
                    <div className="comparison-value">{streakComparison[selectedMetric].short}/10</div>
                    <div className="comparison-label">{selectedMetric === 'sleep' ? 'Sleep Quality' : selectedMetric.charAt(0).toUpperCase() + selectedMetric.slice(1)} during 1-7 day streaks</div>
                  </div>
                  
                  <div className="comparison-card">
                    <div className="comparison-value">{streakComparison[selectedMetric].medium}/10</div>
                    <div className="comparison-label">{selectedMetric === 'sleep' ? 'Sleep Quality' : selectedMetric.charAt(0).toUpperCase() + selectedMetric.slice(1)} during 8-30 day streaks</div>
                  </div>
                  
                  <div className="comparison-card">
                    <div className="comparison-value">{streakComparison[selectedMetric].long}/10</div>
                    <div className="comparison-label">{selectedMetric === 'sleep' ? 'Sleep Quality' : selectedMetric.charAt(0).toUpperCase() + selectedMetric.slice(1)} during 30+ day streaks</div>
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
                        <span className="insight-metric">{insight.metric === 'sleep' ? 'Sleep Quality' : insight.metric.charAt(0).toUpperCase() + insight.metric.slice(1)}</span>
                      </div>
                      <div className="insight-text">{wisdomMode ? insight.esoteric : insight.practical}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            {/* Pattern Analysis Section - REF MARKER for scroll detection */}
            <div className="pattern-analysis-section" ref={patternSectionRef}>
              <h3>Pattern Insights</h3>
              
              <div className="pattern-insights">
                {generatePatternInsights().length > 0 ? (
                  generatePatternInsights().map(insight => (
                    <div key={insight.id} className="pattern-insight-item">
                      <div className="pattern-text">{wisdomMode ? insight.esoteric : insight.practical}</div>
                      <div className="pattern-actionable">{insight.actionable}</div>
                    </div>
                  ))
                ) : (
                  <div className="no-patterns">
                    <FaInfoCircle className="no-patterns-icon" />
                    <span>{wisdomMode ? 
                      "Track more cycles to discover the deeper rhythms and cosmic patterns governing your journey." :
                      "Track more cycles to identify behavioral patterns and optimize your approach."
                    }</span>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
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
                    'A full month of commitment! You\'ve achieved true mastery over impulse and developed lasting self-control.' :
                  selectedBadge.name === '90-Day King' ? 
                    'Incredible achievement! 90 days represents complete transformation. You\'ve reached the pinnacle of self-mastery.' :
                    'Congratulations on earning this achievement!'
                }
              </p>
            </div>
            
            <div className="badge-benefits">
              <h4>Benefits Unlocked:</h4>
              <ul>
                <li>
                  <FaCheckCircle className="check-icon" />
                  <span>Increased mental clarity</span>
                </li>
                <li>
                  <FaCheckCircle className="check-icon" />
                  <span>Enhanced self-discipline</span>
                </li>
                <li>
                  <FaCheckCircle className="check-icon" />
                  <span>Greater emotional stability</span>
                </li>
                <li>
                  <FaCheckCircle className="check-icon" />
                  <span>Improved energy levels</span>
                </li>
              </ul>
            </div>
            
            <div className="modal-actions">
              <button className="btn btn-primary" onClick={() => setShowBadgeModal(false)}>
                Continue Journey
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Stats;