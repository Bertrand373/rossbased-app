// components/Stats/Stats.js - COMPLETE FILE with 6-Badge System
import React, { useState, useEffect, useRef } from 'react';
import { format, subDays } from 'date-fns';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler } from 'chart.js';
import { FaRegLightbulb, FaLock, FaMedal, FaTrophy, FaCheckCircle, FaRedo, FaInfoCircle, 
  FaExclamationTriangle, FaFrown, FaLaptop, FaHome, FaHeart, FaClock, FaBrain, FaEye, FaStar, FaLeaf, FaLightbulb } from 'react-icons/fa';
import './Stats.css';
import toast from 'react-hot-toast';
import helmetImage from '../../assets/helmet.png';
import SmartResetDialog from './SmartResetDialog';

// Register ChartJS components
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

const Stats = ({ userData, isPremium, updateUserData }) => {
  const [selectedMetric, setSelectedMetric] = useState('energy');
  const [timeRange, setTimeRange] = useState('week');
  const [showBadgeModal, setShowBadgeModal] = useState(false);
  const [selectedBadge, setSelectedBadge] = useState(null);
  
  // UPDATED: Replace old reset modal with smart reset dialog
  const [showSmartResetDialog, setShowSmartResetDialog] = useState(false);
  
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

  // COMPLETE: Badge progress checking - handles all 6 badges
  const checkBadgeProgress = () => {
    if (!userData.badges || !updateUserData) return;
    
    const currentStreak = userData.currentStreak || 0;
    const longestStreak = userData.longestStreak || 0;
    const today = new Date();
    
    // Define all possible badges
    const allBadges = [
      { id: 1, name: '7-Day Warrior', threshold: 7 },
      { id: 2, name: '14-Day Monk', threshold: 14 },
      { id: 3, name: '30-Day Master', threshold: 30 },
      { id: 4, name: '90-Day King', threshold: 90 },
      { id: 5, name: '180-Day Master', threshold: 180 },
      { id: 6, name: '365-Day Sage', threshold: 365 }
    ];
    
    // Check if we need to add any missing badges to the user's badge array
    let updatedBadges = [...userData.badges];
    let badgesChanged = false;
    
    // Ensure all badges exist in user data
    allBadges.forEach(badgeTemplate => {
      const existingBadge = updatedBadges.find(b => b.id === badgeTemplate.id);
      if (!existingBadge) {
        updatedBadges.push({
          id: badgeTemplate.id,
          name: badgeTemplate.name,
          earned: false,
          date: null
        });
        badgesChanged = true;
      }
    });
    
    // Check for newly earned badges
    updatedBadges.forEach((badge, index) => {
      const badgeTemplate = allBadges.find(b => b.id === badge.id);
      if (!badgeTemplate) return;
      
      const shouldBeEarned = currentStreak >= badgeTemplate.threshold || longestStreak >= badgeTemplate.threshold;
      
      if (shouldBeEarned && !badge.earned) {
        updatedBadges[index] = {
          ...badge,
          earned: true,
          date: today
        };
        badgesChanged = true;
        
        // Show toast notification for new badge
        setTimeout(() => {
          toast.success(`🏆 Badge Earned: ${badge.name}!`, {
            duration: 4000,
            style: {
              background: 'linear-gradient(135deg, #ffdd00 0%, #f6cc00 100%)',
              color: '#000',
              fontWeight: '600'
            }
          });
        }, 500);
      }
    });
    
    // Update user data if badges changed
    if (badgesChanged) {
      updateUserData({
        ...userData,
        badges: updatedBadges.sort((a, b) => a.id - b.id) // Keep badges in order
      });
    }
  };

  // Add this useEffect to check badges when component mounts or streak changes
  useEffect(() => {
    checkBadgeProgress();
  }, [userData.currentStreak, userData.longestStreak]);  // Re-run when streaks change
  
  // Format date for displaying
  const formatDate = (date) => format(new Date(date), 'MMM d, yyyy');
  
  // Handle badge click
  const handleBadgeClick = (badge) => {
    setSelectedBadge(badge);
    setShowBadgeModal(true);
  };

  // UPDATED: Handle smart reset - opens smart dialog instead of simple confirmation
  const handleResetStats = () => {
    setShowSmartResetDialog(true);
  };

  // Complete badge reset - all 6 badges
  const getDefaultBadges = () => [
    { id: 1, name: '7-Day Warrior', earned: false, date: null },
    { id: 2, name: '14-Day Monk', earned: false, date: null },
    { id: 3, name: '30-Day Master', earned: false, date: null },
    { id: 4, name: '90-Day King', earned: false, date: null },
    { id: 5, name: '180-Day Master', earned: false, date: null },
    { id: 6, name: '365-Day Sage', earned: false, date: null }
  ];

  // NEW: Enhanced reset function with different levels
  const confirmResetStats = (resetLevel) => {
    if (!updateUserData) {
      console.error('updateUserData function is not available');
      toast.error('Unable to reset data - please refresh the page');
      return;
    }

    let resetUserData = { ...userData };
    const today = new Date();

    switch (resetLevel) {
      case 'currentStreak':
        // Reset only current streak, keep all history
        resetUserData = {
          ...userData,
          currentStreak: 0,
          startDate: today,
          // Add new streak to history
          streakHistory: [
            ...(userData.streakHistory || []),
            {
              id: (userData.streakHistory?.length || 0) + 1,
              start: today,
              end: null,
              days: 0,
              reason: 'manual_reset'
            }
          ]
        };
        toast.success('Current streak reset to 0. All history and achievements preserved.');
        break;

      case 'allProgress':
        // Reset most data but keep longest streak record
        resetUserData = {
          ...userData,
          startDate: today,
          currentStreak: 0,
          relapseCount: 0,
          wetDreamCount: 0,
          // Keep only longest streak record
          longestStreak: userData.longestStreak || 0,
          // Reset everything else
          streakHistory: [{
            id: 1,
            start: today,
            end: null,
            days: 0,
            reason: 'major_reset'
          }],
          benefitTracking: [],
          notes: {},
          // Reset badges but keep longest streak milestone if earned
          badges: userData.badges?.map(badge => {
            const longestStreak = userData.longestStreak || 0;
            // Keep badges earned based on longest streak record
            if (badge.name === '7-Day Warrior' && longestStreak >= 7) return badge;
            if (badge.name === '14-Day Monk' && longestStreak >= 14) return badge;
            if (badge.name === '30-Day Master' && longestStreak >= 30) return badge;
            if (badge.name === '90-Day King' && longestStreak >= 90) return badge;
            if (badge.name === '180-Day Master' && longestStreak >= 180) return badge;
            if (badge.name === '365-Day Sage' && longestStreak >= 365) return badge;
            
            // Reset this badge
            return { ...badge, earned: false, date: null };
          }) || getDefaultBadges()
        };
        toast.success(`All progress reset. Longest streak record (${userData.longestStreak || 0} days) preserved.`);
        break;

      case 'everything':
        // Complete nuclear reset - everything gone
        resetUserData = {
          startDate: today,
          currentStreak: 0,
          longestStreak: 0,
          wetDreamCount: 0,
          relapseCount: 0,
          badges: getDefaultBadges(),
          benefitTracking: [],
          streakHistory: [{
            id: 1,
            start: today,
            end: null,
            days: 0,
            reason: 'complete_reset'
          }],
          notes: {}
        };
        toast.success('Complete reset successful. All data has been cleared.');
        break;

      default:
        toast.error('Invalid reset option selected');
        return;
    }
    
    updateUserData(resetUserData);
    setShowSmartResetDialog(false);
  };

  // ADDED: Premium upgrade handler
  const handleUpgradeClick = () => {
    toast.success('Premium upgrade coming soon! 🚀');
  };

  // UPDATED: Helper function to get current phase data - matches Emotional Timeline exactly  
  const getCurrentPhaseData = (streak) => {
    if (streak <= 14) {
      return { name: "Initial Adaptation", icon: FaLeaf, color: "#22c55e" };
    } else if (streak <= 45) {
      return { name: "Emotional Purging", icon: FaHeart, color: "#f59e0b" };
    } else if (streak <= 90) {
      return { name: "Mental Expansion", icon: FaBrain, color: "#3b82f6" };
    } else if (streak <= 180) {
      return { name: "Spiritual Integration", icon: FaLightbulb, color: "#8b5cf6" };
    } else {
      return { name: "Mastery & Service", icon: FaTrophy, color: "#ffdd00" };
    }
  };

  // LEGACY: Keep old function for backward compatibility
  const getCurrentPhase = (streak) => {
    if (streak <= 7) return 'Foundation Phase';
    if (streak <= 30) return 'Adjustment Phase';
    if (streak <= 90) return 'Momentum Phase';
    if (streak <= 180) return 'Transformation Phase';
    if (streak <= 365) return 'Integration Phase';
    return 'Mastery Phase';
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
        beginAtZero: true,
        max: 10,
        grid: {
          color: 'rgba(255, 255, 255, 0.1)',
        },
        ticks: {
          color: 'rgba(255, 255, 255, 0.7)',
          font: {
            size: 12
          }
        }
      },
      x: {
        grid: {
          color: 'rgba(255, 255, 255, 0.1)',
        },
        ticks: {
          color: 'rgba(255, 255, 255, 0.7)',
          font: {
            size: 12
          }
        }
      }
    },
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: '#fff',
        bodyColor: '#fff',
        borderColor: '#ffdd00',
        borderWidth: 1,
        cornerRadius: 8,
        displayColors: false,
        callbacks: {
          title: function(context) {
            return `${context[0].label}`;
          },
          label: function(context) {
            return `${selectedMetric.charAt(0).toUpperCase() + selectedMetric.slice(1)}: ${context.parsed.y}/10`;
          }
        }
      }
    }
  };

  // Get current phase data for benefit insights
  const currentPhaseData = getCurrentPhaseData(userData.currentStreak || 0);
  
  // Calculate benefit averages
  const calculateBenefitAverages = () => {
    const filteredData = getFilteredBenefitData();
    if (filteredData.length === 0) return { energy: 0, focus: 0, confidence: 0, aura: 0, sleep: 0, workout: 0 };
    
    const totals = filteredData.reduce((acc, item) => {
      acc.energy += item.energy || 0;
      acc.focus += item.focus || 0;
      acc.confidence += item.confidence || 0;
      acc.aura += item.aura || 0;
      acc.sleep += item.sleep || item.attraction || 0; // Handle migration
      acc.workout += item.workout || item.gymPerformance || 0; // Handle migration
      return acc;
    }, { energy: 0, focus: 0, confidence: 0, aura: 0, sleep: 0, workout: 0 });
    
    const count = filteredData.length;
    return {
      energy: Math.round((totals.energy / count) * 10) / 10,
      focus: Math.round((totals.focus / count) * 10) / 10,
      confidence: Math.round((totals.confidence / count) * 10) / 10,
      aura: Math.round((totals.aura / count) * 10) / 10,
      sleep: Math.round((totals.sleep / count) * 10) / 10,
      workout: Math.round((totals.workout / count) * 10) / 10
    };
  };

  // ENHANCED: Generate insights with phase-specific wisdom
  const generateInsights = () => {
    const averages = calculateBenefitAverages();
    const currentStreak = userData.currentStreak || 0;
    const longestStreak = userData.longestStreak || 0;
    const relapseCount = userData.relapseCount || 0;
    const phase = getCurrentPhaseData(currentStreak);
    
    let insights = [];
    
    // Phase-specific insights
    if (currentStreak <= 14) {
      insights.push({
        id: 1,
        type: 'phase',
        practical: `You're in the ${phase.name} phase (Days 1-14). Your body is adjusting to new patterns.`,
        esoteric: `The Sacred Initiation: You walk the threshold between worlds, where old patterns dissolve and new energy begins to flow.`,
        actionable: wisdomMode ? "Meditate on your transformation daily" : "Focus on establishing daily routines",
        isPhaseSpecific: true
      });
    } else if (currentStreak <= 45) {
      insights.push({
        id: 1,
        type: 'phase',
        practical: `You're in the ${phase.name} phase (Days 15-45). Emotional releases and mood swings are normal.`,
        esoteric: `The Great Purification: Ancient traumas and emotional debris rise to the surface to be cleansed by your inner fire.`,
        actionable: wisdomMode ? "Practice emotional alchemy - transmute pain into wisdom" : "Journal your emotions and practice mindfulness",
        isPhaseSpecific: true
      });
    } else if (currentStreak <= 90) {
      insights.push({
        id: 1,
        type: 'phase',
        practical: `You're in the ${phase.name} phase (Days 46-90). Mental clarity and cognitive abilities are heightening.`,
        esoteric: `The Awakening Mind: Your consciousness expands as the sacred energy illuminates new pathways of thought and perception.`,
        actionable: wisdomMode ? "Engage in deep philosophical study and contemplation" : "Channel your mental energy into creative projects",
        isPhaseSpecific: true
      });
    } else if (currentStreak <= 180) {
      insights.push({
        id: 1,
        type: 'phase',
        practical: `You're in the ${phase.name} phase (Days 91-180). Spiritual awareness and intuition are developing.`,
        esoteric: `The Inner Sanctuary: You commune with higher realms as your refined energy attunes to cosmic frequencies.`,
        actionable: wisdomMode ? "Develop your psychic abilities through meditation and energy work" : "Explore spiritual practices and philosophy",
        isPhaseSpecific: true
      });
    } else {
      insights.push({
        id: 1,
        type: 'phase',
        practical: `You're in the ${phase.name} phase (Day 181+). You've achieved mastery and can guide others.`,
        esoteric: `The Illuminated Master: You have transmuted base desire into divine power, becoming a beacon of light for others.`,
        actionable: wisdomMode ? "Share your wisdom and guide others on the path" : "Mentor others and contribute to the community",
        isPhaseSpecific: true
      });
    }
    
    // Performance insights
    if (averages.energy >= 8) {
      insights.push({
        id: 2,
        type: 'performance',
        practical: `Excellent energy levels! Your average energy is ${averages.energy}/10.`,
        esoteric: `Your vital force burns bright like a sacred flame, illuminating your path to greatness.`,
        actionable: wisdomMode ? "Channel this energy into spiritual practices" : "Use this energy for challenging projects"
      });
    } else if (averages.energy <= 4) {
      insights.push({
        id: 2,
        type: 'performance',
        practical: `Energy levels are low (${averages.energy}/10). Consider improving sleep and nutrition.`,
        esoteric: `Your inner fire dims - tend to your physical temple with sacred care and attention.`,
        actionable: wisdomMode ? "Perform energy cultivation exercises" : "Focus on sleep hygiene and nutrition"
      });
    }
    
    // Streak insights
    if (currentStreak > longestStreak * 0.8) {
      insights.push({
        id: 3,
        type: 'streak',
        practical: `You're approaching your longest streak! Current: ${currentStreak}, Record: ${longestStreak}`,
        esoteric: `You walk in the shadow of your greatest achievement - soon you shall eclipse your former self.`,
        actionable: wisdomMode ? "Prepare for a new level of consciousness" : "Stay focused - you're close to a new record!"
      });
    }
    
    // Warning insights
    if (relapseCount > 3) {
      insights.push({
        id: 4,
        type: 'warning',
        practical: `Multiple relapses detected. Consider reviewing your triggers and coping strategies.`,
        esoteric: `The path of transformation is fraught with trials - each fall teaches wisdom for the next ascent.`,
        actionable: wisdomMode ? "Seek deeper understanding of your shadow aspects" : "Review and strengthen your urge management plan",
        isWarning: true
      });
    }
    
    return insights;
  };

  // ADVANCED: Generate pattern analysis from streak history
  const generatePatternInsights = () => {
    if (!userData.streakHistory || userData.streakHistory.length < 2) return [];
    
    const patterns = [];
    const completedStreaks = userData.streakHistory.filter(s => s.end && s.reason === 'relapse');
    
    if (completedStreaks.length >= 2) {
      const avgLength = completedStreaks.reduce((sum, s) => sum + s.days, 0) / completedStreaks.length;
      
      patterns.push({
        id: 1,
        practical: `Your average streak length is ${Math.round(avgLength)} days. Current streak: ${userData.currentStreak || 0} days.`,
        esoteric: `The rhythm of your journey reveals itself - each cycle builds upon the last in the spiral of ascension.`,
        actionable: wisdomMode ? "Seek to understand the deeper patterns in your spiritual journey" : "Analyze what works and what doesn't in your longer streaks",
        isTimeline: true
      });
      
      // Check for improvement trend
      const recentStreaks = completedStreaks.slice(-3);
      const olderStreaks = completedStreaks.slice(0, -3);
      
      if (recentStreaks.length >= 2 && olderStreaks.length >= 2) {
        const recentAvg = recentStreaks.reduce((sum, s) => sum + s.days, 0) / recentStreaks.length;
        const olderAvg = olderStreaks.reduce((sum, s) => sum + s.days, 0) / olderStreaks.length;
        
        if (recentAvg > olderAvg * 1.2) {
          patterns.push({
            id: 2,
            practical: `Improvement detected! Your recent streaks average ${Math.round(recentAvg)} days vs ${Math.round(olderAvg)} days previously.`,
            esoteric: `The spiral ascends! Your soul learns and grows stronger with each revolution of the wheel.`,
            actionable: wisdomMode ? "Acknowledge your spiritual growth and rising consciousness" : "Keep building on this positive momentum",
            isTimeline: true
          });
        }
      }
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

      {/* UPDATED: Header with new Reset Progress button */}
      <div className="stats-header">
        <div className="stats-header-spacer"></div>
        <h2>Your Stats</h2>
        <div className="stats-header-actions">
          <button className="reset-stats-btn" onClick={handleResetStats}>
            <FaRedo />
            <span>Reset Progress</span>
          </button>
        </div>
      </div>
      
      {/* UPDATED: Smart Reset Dialog replaces old confirmation modal */}
      <SmartResetDialog
        isOpen={showSmartResetDialog}
        onClose={() => setShowSmartResetDialog(false)}
        onConfirm={confirmResetStats}
        userData={userData}
      />
      
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
                className={`metric-btn energy ${selectedMetric === 'energy' ? 'active' : ''}`}
                onClick={() => setSelectedMetric('energy')}
              >
                Energy
              </button>
              <button 
                className={`metric-btn focus ${selectedMetric === 'focus' ? 'active' : ''}`}
                onClick={() => setSelectedMetric('focus')}
              >
                Focus
              </button>
              <button 
                className={`metric-btn confidence ${selectedMetric === 'confidence' ? 'active' : ''}`}
                onClick={() => setSelectedMetric('confidence')}
              >
                Confidence
              </button>
              <button 
                className={`metric-btn aura ${selectedMetric === 'aura' ? 'active' : ''}`}
                onClick={() => setSelectedMetric('aura')}
              >
                Aura
              </button>
              <button 
                className={`metric-btn sleep ${selectedMetric === 'sleep' ? 'active' : ''}`}
                onClick={() => setSelectedMetric('sleep')}
              >
                Sleep Quality
              </button>
              <button 
                className={`metric-btn workout ${selectedMetric === 'workout' ? 'active' : ''}`}
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
                7 Days
              </button>
              <button 
                className={`time-btn ${timeRange === 'month' ? 'active' : ''}`}
                onClick={() => setTimeRange('month')}
              >
                30 Days
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
                <div className="current-metric-value">{calculateBenefitAverages()[selectedMetric] || 0}/10</div>
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
                  Track your benefits daily to unlock personalized insights and recommendations.
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
                  <div className="current-metric-value">{calculateBenefitAverages()[selectedMetric] || 0}/10</div>
                </div>
                
                <div className="current-insight-card">
                  <div className="current-insight-header">
                    <FaRegLightbulb className="insight-icon" />
                    <span>Current Insight</span>
                  </div>
                  <div className="current-insight-text">
                    {generateInsights()[0]?.practical || "Keep tracking your benefits to unlock insights!"}
                  </div>
                </div>
              </div>
            </div>

            {/* Full Benefit Averages Grid - PREMIUM ONLY */}
            <div className="benefit-averages">
              <div className="averages-header">
                <h4>Your Averages ({timeRange === 'week' ? '7' : timeRange === 'month' ? '30' : '90'} Days)</h4>
              </div>
              <div className="averages-grid">
                {Object.entries(calculateBenefitAverages()).map(([metric, average]) => (
                  <div key={metric} className={`average-item ${selectedMetric === metric ? 'highlighted' : ''}`}>
                    <div className="average-value">{average}</div>
                    <div className="average-label">{metric.charAt(0).toUpperCase() + metric.slice(1)}</div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      {/* PROGRESSIVE PREMIUM: Benefit Insights Section */}
      {isPremium && (
        <>
          <div className="benefit-insights-section" ref={insightsStartRef}>
            {/* REDESIGNED: Header with phase indicator */}
            <div className="benefit-insights-header">
              <div className="insights-header-main">
                <h3>Journey Guidance</h3>
              </div>
              
              {/* REDESIGNED: Inline phase indicator */}
              <div className="benefit-phase-indicator" style={{'--phase-color': currentPhaseData.color}}>
                <div className="benefit-phase-content">
                  <div className="benefit-phase-icon">
                    <currentPhaseData.icon />
                  </div>
                  <div className="benefit-phase-text">
                    <div className="benefit-phase-name">{currentPhaseData.name}</div>
                    <div className="benefit-phase-day">Day {userData.currentStreak || 0}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Insights Grid */}
            <div className="insights-grid">
              {generateInsights().map(insight => (
                <div 
                  key={insight.id} 
                  className={`insight-card ${insight.isPhaseSpecific ? 'phase-specific highlighted' : ''} ${insight.isWarning ? 'challenge-warning' : ''} ${insight.isTimeline ? 'timeline-based' : ''}`}
                >
                  <div className="insight-card-header">
                    <div className="insight-icon">
                      {insight.isPhaseSpecific ? <currentPhaseData.icon /> : 
                       insight.isWarning ? <FaExclamationTriangle /> : 
                       insight.isTimeline ? <FaClock /> : <FaRegLightbulb />}
                    </div>
                    <div className="insight-type">
                      {insight.isPhaseSpecific ? 'Current Phase' : 
                       insight.isWarning ? 'Challenge Alert' : 
                       insight.isTimeline ? 'Pattern Analysis' : 'Insight'}
                    </div>
                  </div>
                  <div className="insight-text">
                    {wisdomMode ? insight.esoteric : insight.practical}
                  </div>
                  <div className="insight-actionable">
                    <strong>Action:</strong> {insight.actionable}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Streak Comparison */}
          <div className="streak-comparison">
            <h5>Streak Comparison</h5>
            <div className="comparison-grid">
              <div className="comparison-card phase-aware">
                <div className="comparison-value">
                  <span className="metric-highlight">{userData.currentStreak || 0}</span>
                </div>
                <div className="comparison-label">Current Streak</div>
              </div>
              
              <div className="comparison-card phase-aware">
                <div className="comparison-value">
                  <span className="metric-highlight">{userData.longestStreak || 0}</span>
                </div>
                <div className="comparison-label">Personal Best</div>
              </div>
              
              <div className="comparison-card phase-aware">
                <div className="comparison-value">
                  <span className="phase-highlight">{getCurrentPhase(userData.currentStreak || 0)}</span>
                </div>
                <div className="comparison-label">Current Phase</div>
              </div>
            </div>
          </div>

          {/* Pattern Analysis */}
          <div className="pattern-analysis-section" ref={patternSectionRef}>
            <div className="pattern-analysis-header">
              <h5>Pattern Analysis</h5>
            </div>
            <div className="pattern-analysis-content">
              {generatePatternInsights().length > 0 ? (
                generatePatternInsights().map(insight => (
                  <div key={insight.id} className={`pattern-insight-item ${insight.isTimeline ? 'timeline' : ''} ${insight.isWarning ? 'warning' : ''}`}>
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
                  selectedBadge.name === '180-Day Master' ? 
                    'Six months of unwavering dedication! You have transcended ordinary limitations and achieved true mastery over your desires. You are becoming the master of your destiny.' :
                  selectedBadge.name === '365-Day Sage' ? 
                    'One full year of commitment - you have achieved legendary status! Your wisdom and self-control inspire others. You have transformed into a sage who understands the deeper mysteries of self-discipline.' :
                    'Congratulations on earning this achievement!'
                }
              </p>
            </div>
            
            <div className="badge-benefits">
              <h4>Benefits Unlocked:</h4>
              <ul>
                <li>
                  <FaCheckCircle className="check-icon" />
                  <span>
                    {selectedBadge.name === '180-Day Master' ? 'Enhanced spiritual awareness' :
                     selectedBadge.name === '365-Day Sage' ? 'Transcendent mental clarity' : 
                     'Increased mental clarity'}
                  </span>
                </li>
                <li>
                  <FaCheckCircle className="check-icon" />
                  <span>
                    {selectedBadge.name === '180-Day Master' ? 'Mastery over desires' :
                     selectedBadge.name === '365-Day Sage' ? 'Complete emotional mastery' : 
                     'Enhanced self-discipline'}
                  </span>
                </li>
                <li>
                  <FaCheckCircle className="check-icon" />
                  <span>
                    {selectedBadge.name === '180-Day Master' ? 'Deep inner strength' :
                     selectedBadge.name === '365-Day Sage' ? 'Sage-like wisdom' : 
                     'Greater emotional stability'}
                  </span>
                </li>
                <li>
                  <FaCheckCircle className="check-icon" />
                  <span>
                    {selectedBadge.name === '180-Day Master' ? 'Sustained high energy' :
                     selectedBadge.name === '365-Day Sage' ? 'Limitless potential' : 
                     'Improved energy levels'}
                  </span>
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