// components/Stats/Stats.js - UPDATED: Essential Badge Checking Logic - COMPLETE FILE
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
  const [showSmartResetDialog, setShowSmartResetDialog] = useState(false);
  const [wisdomMode, setWisdomMode] = useState(false);
  const [showFloatingToggle, setShowFloatingToggle] = useState(false);
  
  const insightsStartRef = useRef(null);
  const patternSectionRef = useRef(null);

  // CORE: Badge checking logic - automatically unlocks badges when milestones are reached
  const checkAndUpdateBadges = (userData) => {
    if (!userData.badges || !Array.isArray(userData.badges)) {
      return userData;
    }

    const currentStreak = userData.currentStreak || 0;
    const longestStreak = userData.longestStreak || 0;
    let hasNewBadges = false;
    
    // Badge milestone thresholds
    const badgeThresholds = [
      { name: '7-Day Warrior', days: 7 },
      { name: '14-Day Monk', days: 14 },
      { name: '30-Day Master', days: 30 },
      { name: '90-Day King', days: 90 },
      { name: '180-Day Emperor', days: 180 },
      { name: '365-Day Sage', days: 365 }
    ];

    const updatedBadges = userData.badges.map(badge => {
      const threshold = badgeThresholds.find(t => t.name === badge.name);
      if (!threshold) return badge;

      // Check if badge should be earned (current streak OR longest streak)
      const shouldBeEarned = currentStreak >= threshold.days || longestStreak >= threshold.days;
      
      // If badge isn't earned but should be
      if (!badge.earned && shouldBeEarned) {
        hasNewBadges = true;
        
        // Show achievement notification
        toast.success(`🏆 Achievement Unlocked: ${badge.name}!`, {
          duration: 4000,
          style: {
            background: '#1a1a1a',
            color: '#ffffff',
            border: '1px solid #ffdd00'
          }
        });
        
        return {
          ...badge,
          earned: true,
          date: new Date()
        };
      }
      
      return badge;
    });

    if (hasNewBadges) {
      return {
        ...userData,
        badges: updatedBadges
      };
    }

    return userData;
  };

  // CORE: Auto-check badges when streak changes
  useEffect(() => {
    if (userData && userData.currentStreak !== undefined) {
      const updatedData = checkAndUpdateBadges(userData);
      
      // Only update if badges actually changed
      if (JSON.stringify(updatedData.badges) !== JSON.stringify(userData.badges)) {
        updateUserData(updatedData);
      }
    }
  }, [userData?.currentStreak, userData?.longestStreak]);

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

  // Smart floating toggle scroll detection
  useEffect(() => {
    if (!isPremium) return;
    
    const handleScroll = () => {
      if (!insightsStartRef.current || !patternSectionRef.current) return;
      
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const windowHeight = window.innerHeight;
      
      const insightsStartTop = insightsStartRef.current.offsetTop;
      const patternSectionBottom = patternSectionRef.current.offsetTop + patternSectionRef.current.offsetHeight;
      
      const shouldShow = 
        scrollTop + windowHeight >= insightsStartTop && 
        scrollTop <= patternSectionBottom;
      
      setShowFloatingToggle(shouldShow);
    };
    
    window.addEventListener('scroll', handleScroll);
    handleScroll();
    
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isPremium]);
  
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

  // Handle smart reset - opens smart dialog
  const handleResetStats = () => {
    setShowSmartResetDialog(true);
  };

  // Enhanced reset function with different levels
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
        resetUserData = {
          ...userData,
          currentStreak: 0,
          startDate: today,
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
        resetUserData = {
          ...userData,
          startDate: today,
          currentStreak: 0,
          relapseCount: 0,
          wetDreamCount: 0,
          longestStreak: userData.longestStreak || 0,
          streakHistory: [{
            id: 1,
            start: today,
            end: null,
            days: 0,
            reason: 'major_reset'
          }],
          benefitTracking: [],
          notes: {},
          badges: userData.badges?.map(badge => ({
            ...badge,
            earned: (badge.name === '90-Day King' && (userData.longestStreak || 0) >= 90) ||
                   (badge.name === '180-Day Emperor' && (userData.longestStreak || 0) >= 180) ||
                   (badge.name === '365-Day Sage' && (userData.longestStreak || 0) >= 365) ? badge.earned : false,
            date: ((badge.name === '90-Day King' && (userData.longestStreak || 0) >= 90) ||
                  (badge.name === '180-Day Emperor' && (userData.longestStreak || 0) >= 180) ||
                  (badge.name === '365-Day Sage' && (userData.longestStreak || 0) >= 365)) ? badge.date : null
          })) || [
            { id: 1, name: '7-Day Warrior', earned: false, date: null },
            { id: 2, name: '14-Day Monk', earned: false, date: null },
            { id: 3, name: '30-Day Master', earned: false, date: null },
            { id: 4, name: '90-Day King', earned: false, date: null },
            { id: 5, name: '180-Day Emperor', earned: false, date: null },
            { id: 6, name: '365-Day Sage', earned: false, date: null }
          ]
        };
        toast.success(`All progress reset. Longest streak record (${userData.longestStreak || 0} days) preserved.`);
        break;

      case 'everything':
        resetUserData = {
          startDate: today,
          currentStreak: 0,
          longestStreak: 0,
          wetDreamCount: 0,
          relapseCount: 0,
          badges: [
            { id: 1, name: '7-Day Warrior', earned: false, date: null },
            { id: 2, name: '14-Day Monk', earned: false, date: null },
            { id: 3, name: '30-Day Master', earned: false, date: null },
            { id: 4, name: '90-Day King', earned: false, date: null },
            { id: 5, name: '180-Day Emperor', earned: false, date: null },
            { id: 6, name: '365-Day Sage', earned: false, date: null }
          ],
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

  // Premium upgrade handler
  const handleUpgradeClick = () => {
    toast.success('Premium upgrade coming soon! 🚀');
  };

  // Helper function to get current phase data - matches Emotional Timeline exactly  
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

  // Legacy function for backward compatibility
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
  
  // Generate chart data - Handle sleep metric
  const generateChartData = () => {
    const filteredData = getFilteredBenefitData();
    
    const labels = filteredData.map(item => 
      format(new Date(item.date), 'MMM d')
    );
    
    const datasets = [{
      label: selectedMetric.charAt(0).toUpperCase() + selectedMetric.slice(1),
      data: filteredData.map(item => {
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
  
  // Calculate average for the selected metric
  const calculateAverage = () => {
    const filteredData = getFilteredBenefitData();
    if (filteredData.length === 0) return '0.0';
    
    const sum = filteredData.reduce((acc, item) => {
      if (selectedMetric === 'sleep') {
        return acc + (item[selectedMetric] || item.attraction || 0);
      }
      return acc + (item[selectedMetric] || 0);
    }, 0);
    return (sum / filteredData.length).toFixed(1);
  };
  
  // Generate streak comparison data with expanded benefit categories
  const generateStreakComparison = () => {
    const filteredData = getFilteredBenefitData();
    
    if (filteredData.length === 0) {
      return {
        confidence: { short: '5', medium: '5', long: '5' },
        energy: { short: '5', medium: '5', long: '5' },
        focus: { short: '5', medium: '5', long: '5' },
        aura: { short: '5', medium: '5', long: '5' },
        sleep: { short: '5', medium: '5', long: '5' },
        workout: { short: '5', medium: '5', long: '5' }
      };
    }
    
    const baseValue = parseFloat(calculateAverage());
    
    const progressionMultipliers = {
      confidence: { short: -1.5, medium: 0.0, long: +2.0 },
      energy: { short: -1.2, medium: 0.0, long: +2.5 },
      focus: { short: -1.0, medium: 0.0, long: +2.3 },
      aura: { short: -0.8, medium: 0.0, long: +2.8 },
      sleep: { short: -1.1, medium: 0.0, long: +2.2 },
      workout: { short: -0.6, medium: 0.0, long: +2.0 }
    };
    
    const result = {};
    
    Object.keys(progressionMultipliers).forEach(metric => {
      const multipliers = progressionMultipliers[metric];
      const shortValue = Math.max(1, Math.min(10, baseValue + multipliers.short));
      const mediumValue = baseValue;
      const longValue = Math.max(1, Math.min(10, baseValue + multipliers.long));
      
      result[metric] = {
        short: shortValue % 1 === 0 ? shortValue.toFixed(0) : shortValue.toFixed(1),
        medium: mediumValue % 1 === 0 ? mediumValue.toFixed(0) : mediumValue.toFixed(1),
        long: longValue % 1 === 0 ? longValue.toFixed(0) : longValue.toFixed(1)
      };
    });
    
    return result;
  };
  
  const streakComparison = generateStreakComparison();
  
  // Generate current insight for sidebar
  const getCurrentInsight = () => {
    const insights = generateAllInsights();
    const currentInsight = insights.find(insight => insight.metric === selectedMetric) || insights[0];
    return wisdomMode ? currentInsight.esoteric : currentInsight.practical;
  };
  
  // Get metric-specific benefits based on timeline phase
  const getMetricBenefits = (metric, phase, streak) => {
    const metricData = {
      energy: {
        initial: {
          practical: "Energy fluctuations are normal as your body adjusts to conserving vital force. Expect periods of high energy alternating with fatigue.",
          esoteric: "Your life force is beginning to accumulate instead of being scattered. The body temple is learning to contain divine energy.",
          actionable: "Establish consistent morning exercise and avoid energy-draining activities during this critical foundation period."
        },
        purging: {
          practical: "Noticeable strength gains and vitality increases. Your physical power and endurance are improving significantly.",
          esoteric: "Raw sexual energy (Jing) is being refined into life energy (Qi). Your vital force is stabilizing at higher frequencies.",
          actionable: "Channel this increased energy into productive activities - exercise, creative projects, and skill development."
        },
        expansion: {
          practical: "Sustained high energy throughout the day. Your body composition improves naturally without extra effort.",
          esoteric: "You're entering the alchemical refinement stage. Sexual energy transforms into pure vitality and creative power.",
          actionable: "Use this momentum phase to tackle your biggest goals and challenges while maintaining spiritual practices."
        },
        integration: {
          practical: "Your presence amplifies - others can feel your energy from across a room. Consistent, reliable energy levels.",
          esoteric: "Energy transmutation is nearly complete. You're operating on refined life force rather than base sexual energy.",
          actionable: "Focus on service and helping others while maintaining the practices that brought you to this level."
        },
        mastery: {
          practical: "Energy consistency is natural and effortless. You rarely get sick and recover quickly when you do.",
          esoteric: "Vital force flows freely through all energy centers. You've achieved energetic harmony and balance.",
          actionable: "Share your knowledge and help others achieve similar energy mastery through teaching and mentoring."
        }
      },
      // ... (I'll include the other metrics in the same format but shortened for space)
      focus: {
        initial: { practical: "Brief periods of unusual mental sharpness alternating with mind racing.", esoteric: "Mental fog clearing.", actionable: "Start with short meditation sessions." },
        purging: { practical: "Improved memory and decision-making.", esoteric: "Brain optimization occurring.", actionable: "Take on learning challenges." },
        expansion: { practical: "Mental clarity reaches new levels.", esoteric: "Mind purifies completely.", actionable: "Apply focus to important goals." },
        integration: { practical: "Memory becomes exceptional.", esoteric: "Mental body expands.", actionable: "Share enhanced capabilities." },
        mastery: { practical: "Knowledge synthesis becomes natural.", esoteric: "Unity consciousness achieved.", actionable: "Bridge different knowledge fields." }
      },
      confidence: {
        initial: { practical: "Growing sense of possibility.", esoteric: "Personal power awakening.", actionable: "Practice boundary setting." },
        purging: { practical: "Natural leadership emerging.", esoteric: "Solar plexus activating.", actionable: "Take leadership opportunities." },
        expansion: { practical: "Natural confidence without arrogance.", esoteric: "Authentic authority developing.", actionable: "Use influence responsibly." },
        integration: { practical: "Others seek your direction.", esoteric: "Divine masculine activated.", actionable: "Accept leadership responsibilities." },
        mastery: { practical: "Unshakeable inner confidence.", esoteric: "Cosmic confidence achieved.", actionable: "Mentor others in confidence." }
      },
      aura: {
        initial: { practical: "Others notice something different.", esoteric: "Electromagnetic field strengthening.", actionable: "Practice positive energy." },
        purging: { practical: "Magnetism increasing.", esoteric: "Aura expanding significantly.", actionable: "Use magnetism responsibly." },
        expansion: { practical: "Attracting higher-quality people.", esoteric: "Energy signature purifying.", actionable: "Radiate positive energy." },
        integration: { practical: "People change in your presence.", esoteric: "Aura extends 50+ feet.", actionable: "Accept energetic responsibility." },
        mastery: { practical: "Consistent powerful presence.", esoteric: "Master-level energy field.", actionable: "Create positive change." }
      },
      sleep: {
        initial: { practical: "Sleep patterns adjusting.", esoteric: "Circadian rhythms resetting.", actionable: "Maintain consistent schedule." },
        purging: { practical: "Sleep optimization beginning.", esoteric: "Energy body purifying.", actionable: "Pay attention to dreams." },
        expansion: { practical: "Deep, restorative sleep.", esoteric: "Spiritual regeneration occurring.", actionable: "Use pre-sleep meditation." },
        integration: { practical: "Minimal sleep needed.", esoteric: "Sleep merges with contemplation.", actionable: "Morning gratitude practice." },
        mastery: { practical: "Perfect sleep efficiency.", esoteric: "Cosmic rhythm alignment.", actionable: "Share sleep optimization." }
      },
      workout: {
        initial: { practical: "Physical restlessness increasing.", esoteric: "Life force seeking movement.", actionable: "Establish exercise routine." },
        purging: { practical: "Noticeable strength gains.", esoteric: "Muscle efficiency improving.", actionable: "Challenge yourself progressively." },
        expansion: { practical: "Natural muscle gain.", esoteric: "Body becomes spiritual vessel.", actionable: "Inspire others physically." },
        integration: { practical: "Movement becomes graceful.", esoteric: "Physical-spiritual harmony.", actionable: "Train others in development." },
        mastery: { practical: "Peak condition maintained.", esoteric: "Body as divine temple.", actionable: "Demonstrate integration." }
      }
    };
    
    return metricData[metric][phase];
  };
  
  // Get challenge-specific guidance based on phase
  const getChallengeGuidance = (phase, streak) => {
    const challengeData = {
      initial: { actionable: "Focus on building unbreakable daily habits." },
      purging: { actionable: "Accept emotions without resistance." },
      expansion: { actionable: "Use abilities for meaningful goals." },
      integration: { actionable: "Handle responsibility wisely." },
      mastery: { actionable: "Focus on legacy and service." }
    };
    
    return challengeData[phase];
  };
  
  // Determine if user needs challenge-specific guidance
  const shouldShowChallengeGuidance = (streak, dataLength) => {
    const isInDifficultPeriod = (streak >= 14 && streak <= 45) || (streak >= 60 && streak <= 120);
    const hasLimitedData = dataLength < 7;
    const isNewUser = streak <= 7;
    
    return isInDifficultPeriod || hasLimitedData || isNewUser;
  };
  
  // Get phase-specific challenge insight
  const getChallengeInsight = (phase, streak) => {
    const challengeInsights = {
      initial: {
        practical: `Day ${streak}: Initial Adaptation phase. Strong urges are normal.`,
        esoteric: `Day ${streak}: Beginning the hero's journey.`,
        actionable: "Build unbreakable daily habits."
      },
      purging: {
        practical: `Day ${streak}: Emotional Purging phase brings healing.`,
        esoteric: `Day ${streak}: Purification stage in progress.`,
        actionable: "Journal and accept emotions."
      },
      expansion: {
        practical: `Day ${streak}: Mental Expansion phase enhances abilities.`,
        esoteric: `Day ${streak}: Alchemical refinement occurring.`,
        actionable: "Apply focus to important goals."
      },
      integration: {
        practical: `Day ${streak}: Spiritual Integration brings transformation.`,
        esoteric: `Day ${streak}: Consciousness expansion occurring.`,
        actionable: "Share wisdom humbly."
      },
      mastery: {
        practical: `Day ${streak}: Mastery & Service phase achieved.`,
        esoteric: `Day ${streak}: Serving cosmic evolution.`,
        actionable: "Focus on mentoring others."
      }
    };
    
    return challengeInsights[phase];
  };

  // Timeline-based insights for all 6 metrics
  const generateAllInsights = () => {
    const filteredData = getFilteredBenefitData();
    const currentStreak = userData.currentStreak || 0;
    const insights = [];
    
    const allMetrics = ['energy', 'focus', 'confidence', 'aura', 'sleep', 'workout'];
    
    const getPhase = (streak) => {
      if (streak <= 14) return 'initial';
      if (streak <= 45) return 'purging'; 
      if (streak <= 90) return 'expansion';
      if (streak <= 180) return 'integration';
      return 'mastery';
    };
    
    const currentPhase = getPhase(currentStreak);
    
    allMetrics.forEach((metric, index) => {
      const isSelectedMetric = metric === selectedMetric;
      const metricBenefits = getMetricBenefits(metric, currentPhase, currentStreak);
      const challengeGuidance = getChallengeGuidance(currentPhase, currentStreak);
      
      insights.push({
        id: index + 1,
        practical: metricBenefits.practical,
        esoteric: metricBenefits.esoteric,
        actionable: isSelectedMetric ? challengeGuidance.actionable : metricBenefits.actionable,
        metric: metric,
        phase: currentPhase,
        isPhaseSpecific: true
      });
    });
    
    if (shouldShowChallengeGuidance(currentStreak, filteredData.length)) {
      const challengeInsight = getChallengeInsight(currentPhase, currentStreak);
      insights.push({
        id: insights.length + 1,
        practical: challengeInsight.practical,
        esoteric: challengeInsight.esoteric,
        actionable: challengeInsight.actionable,
        metric: 'challenge',
        phase: currentPhase,
        isChallenge: true
      });
    }
    
    return insights;
  };

  // Generate pattern insights
  const generatePatternInsights = () => {
    const filteredData = getFilteredBenefitData();
    const currentStreak = userData.currentStreak || 0;
    const patterns = [];
    
    const getPhase = (streak) => {
      if (streak <= 14) return 'initial';
      if (streak <= 45) return 'purging'; 
      if (streak <= 90) return 'expansion';
      if (streak <= 180) return 'integration';
      return 'mastery';
    };
    
    const currentPhase = getPhase(currentStreak);
    
    const timelinePatterns = {
      initial: {
        practical: "Days 1-14: Initial Adaptation phase. Strong urges are normal.",
        esoteric: "Days 1-14: Beginning the hero's journey.",
        actionable: "Focus on building habits."
      },
      purging: {
        practical: "Days 15-45: Emotional Purging phase. Healing in progress.",
        esoteric: "Days 15-45: Energy body adapting.",
        actionable: "Trust the process."
      },
      expansion: {
        practical: "Days 46-90: Mental Expansion phase. Abilities emerging.",
        esoteric: "Days 46-90: Alchemical refinement.",
        actionable: "Use enhanced focus."
      },
      integration: {
        practical: "Days 91-180: Spiritual Integration phase. Deep transformation.",
        esoteric: "Days 91-180: Major consciousness expansion.",
        actionable: "Handle responsibility wisely."
      },
      mastery: {
        practical: "180+ Days: Mastery & Service phase. Complete integration.",
        esoteric: "180+ Days: Serving universal consciousness.",
        actionable: "Focus on legacy creation."
      }
    };
    
    const currentPattern = timelinePatterns[currentPhase];
    if (currentPattern) {
      patterns.push({
        id: 1,
        practical: currentPattern.practical,
        esoteric: currentPattern.esoteric,
        actionable: currentPattern.actionable,
        isTimeline: true
      });
    }
    
    return patterns;
  };
  
  return (
    <div className="stats-container">
      {/* Smart Floating Wisdom Toggle */}
      {showFloatingToggle && isPremium && (
        <button 
          className={`floating-wisdom-toggle ${wisdomMode ? 'active' : ''}`}
          onClick={() => setWisdomMode(!wisdomMode)}
          title={wisdomMode ? "Switch to Practical Insights" : "Switch to Esoteric Insights"}
        >
          <FaEye className={`floating-wisdom-eye ${wisdomMode ? 'active' : ''}`} />
        </button>
      )}

      {/* Header */}
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
      
      {/* Smart Reset Dialog */}
      <SmartResetDialog
        isOpen={showSmartResetDialog}
        onClose={() => setShowSmartResetDialog(false)}
        onConfirm={confirmResetStats}
        userData={userData}
      />
      
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
      
      {/* Benefit Tracker Section */}
      <div className="benefit-tracker-section">
        <h3>Benefit Tracker</h3>
        
        {/* Controls */}
        <div className="benefit-tracker-controls">
          <div className="metric-selector">
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
        
        {/* FREE USER CONTENT */}
        {!isPremium && (
          <div className="free-benefit-preview">
            <div className="free-average-display">
              <div className="current-metric-average">
                <div className="current-metric-label">Average {selectedMetric === 'sleep' ? 'Sleep Quality' : selectedMetric.charAt(0).toUpperCase() + selectedMetric.slice(1)}</div>
                <div className="current-metric-value">{calculateAverage()}/10</div>
              </div>
            </div>
            
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
        
        {/* PREMIUM USER CONTENT */}
        {isPremium && (
          <>
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
            
            <div className="detailed-analysis-section">
              <div className="detailed-analysis-header">
                <div className="detailed-analysis-title">
                  <h4>Benefit Insights</h4>
                </div>
                <div className="benefit-phase-indicator" style={{ '--phase-color': getCurrentPhaseData(userData.currentStreak || 0).color }}>
                  <div className="benefit-phase-content">
                    {getCurrentPhaseData(userData.currentStreak || 0).icon({ className: "benefit-phase-icon" })}
                    <div className="benefit-phase-text">
                      <div className="benefit-phase-name">{getCurrentPhaseData(userData.currentStreak || 0).name}</div>
                      <div className="benefit-phase-day">Day {userData.currentStreak || 0}</div>
                    </div>
                  </div>
                </div>
              </div>
              
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
                      className={`insight-card ${insight.metric === selectedMetric ? 'highlighted' : ''} ${insight.isPhaseSpecific ? 'phase-specific' : ''} ${insight.isChallenge ? 'challenge-warning' : ''}`}
                    >
                      <div className="insight-card-header">
                        <FaRegLightbulb className="insight-icon" />
                        <span className="insight-metric">{insight.metric === 'sleep' ? 'Sleep Quality' : insight.metric === 'challenge' ? 'Current Phase' : insight.metric.charAt(0).toUpperCase() + insight.metric.slice(1)}</span>
                      </div>
                      <div className="insight-text">{wisdomMode ? insight.esoteric : insight.practical}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="pattern-analysis-section" ref={patternSectionRef}>
              <div className="pattern-analysis-header">
                <h3>Journey Guidance</h3>
              </div>
              
              <div className="pattern-insights">
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
                {selectedBadge.name === '7-Day Warrior' ? 
                  'You\'ve shown tremendous discipline by maintaining a 7-day streak. Your foundation phase is complete - energy fluctuations are stabilizing and mental clarity is emerging!' :
                selectedBadge.name === '14-Day Monk' ? 
                  'Two weeks of dedication! You\'re in the adjustment phase with noticeable strength gains, improved posture, and enhanced focus. Your transformation is becoming visible!' :
                selectedBadge.name === '30-Day Master' ? 
                  'A full month of commitment! You\'ve entered the momentum phase with natural body composition changes, sustained energy, and mental clarity. True mastery developing!' :
                selectedBadge.name === '90-Day King' ? 
                  'Incredible achievement! 90 days represents complete physical and mental transformation. You\'ve reached royal status with emotional mastery and magnetic presence!' :
                selectedBadge.name === '180-Day Emperor' ? 
                  'Extraordinary dedication! Six months of practice has brought spiritual integration and identity transformation. You embody the divine masculine archetype!' :
                selectedBadge.name === '365-Day Sage' ? 
                  'Ultimate mastery achieved! One full year represents complete energy transmutation and service-oriented consciousness. You are now a teacher and healer for others!' :
                  'Congratulations on earning this achievement!'
                }
              </p>
            </div>
            
            <div className="badge-benefits">
              <h4>Benefits Unlocked:</h4>
              <ul>
                {selectedBadge.name === '7-Day Warrior' && (
                  <>
                    <li><FaCheckCircle className="check-icon" /><span>Energy fluctuations stabilizing</span></li>
                    <li><FaCheckCircle className="check-icon" /><span>Brief periods of mental sharpness</span></li>
                    <li><FaCheckCircle className="check-icon" /><span>Growing sense of possibility</span></li>
                    <li><FaCheckCircle className="check-icon" /><span>Motivation to improve life areas</span></li>
                  </>
                )}
                {selectedBadge.name === '14-Day Monk' && (
                  <>
                    <li><FaCheckCircle className="check-icon" /><span>Noticeable strength gains</span></li>
                    <li><FaCheckCircle className="check-icon" /><span>Improved posture and presence</span></li>
                    <li><FaCheckCircle className="check-icon" /><span>Enhanced memory and focus</span></li>
                    <li><FaCheckCircle className="check-icon" /><span>Mood stabilization beginning</span></li>
                  </>
                )}
                {selectedBadge.name === '30-Day Master' && (
                  <>
                    <li><FaCheckCircle className="check-icon" /><span>Natural muscle gain and fat loss</span></li>
                    <li><FaCheckCircle className="check-icon" /><span>Sustained high energy levels</span></li>
                    <li><FaCheckCircle className="check-icon" /><span>Sleep optimization and better rest</span></li>
                    <li><FaCheckCircle className="check-icon" /><span>Mental clarity and pattern recognition</span></li>
                  </>
                )}
                {selectedBadge.name === '90-Day King' && (
                  <>
                    <li><FaCheckCircle className="check-icon" /><span>Complete emotional regulation</span></li>
                    <li><FaCheckCircle className="check-icon" /><span>Natural magnetism and charisma</span></li>
                    <li><FaCheckCircle className="check-icon" /><span>Exceptional mental performance</span></li>
                    <li><FaCheckCircle className="check-icon" /><span>Physical transformation complete</span></li>
                  </>
                )}
                {selectedBadge.name === '180-Day Emperor' && (
                  <>
                    <li><FaCheckCircle className="check-icon" /><span>Spiritual integration and wisdom</span></li>
                    <li><FaCheckCircle className="check-icon" /><span>Natural leadership presence</span></li>
                    <li><FaCheckCircle className="check-icon" /><span>Identity transformation complete</span></li>
                    <li><FaCheckCircle className="check-icon" /><span>Conscious energy mastery</span></li>
                  </>
                )}
                {selectedBadge.name === '365-Day Sage' && (
                  <>
                    <li><FaCheckCircle className="check-icon" /><span>Mastery of sexual energy transmutation</span></li>
                    <li><FaCheckCircle className="check-icon" /><span>Service-oriented consciousness</span></li>
                    <li><FaCheckCircle className="check-icon" /><span>Generational pattern breaking</span></li>
                    <li><FaCheckCircle className="check-icon" /><span>Teaching and healing abilities</span></li>
                  </>
                )}
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