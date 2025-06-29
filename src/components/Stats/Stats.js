// components/Stats/Stats.js - UPDATED: Smart Reset Dialog with three levels of reset
import React, { useState, useEffect, useRef } from 'react';
import { format, subDays } from 'date-fns';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler } from 'chart.js';
import { FaRegLightbulb, FaLock, FaMedal, FaTrophy, FaCheckCircle, FaRedo, FaInfoCircle, 
  FaExclamationTriangle, FaFrown, FaLaptop, FaHome, FaHeart, FaClock, FaBrain, FaEye, FaStar, FaLeaf, FaLightbulb } from 'react-icons/fa';
import './Stats.css';
import toast from 'react-hot-toast';
import helmetImage from '../../assets/helmet.png';

// Register ChartJS components
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

const Stats = ({ userData, isPremium, updateUserData }) => {
  const [selectedMetric, setSelectedMetric] = useState('energy');
  const [timeRange, setTimeRange] = useState('week');
  const [showBadgeModal, setShowBadgeModal] = useState(false);
  const [selectedBadge, setSelectedBadge] = useState(null);
  const [showResetModal, setShowResetModal] = useState(false);
  
  // NEW: Smart reset states
  const [resetOptions, setResetOptions] = useState({
    currentStreakOnly: false,
    allProgress: false,
    everything: false
  });
  
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

  // NEW: Handle reset option toggle
  const handleResetOptionToggle = (option) => {
    const newOptions = { ...resetOptions };
    
    if (option === 'everything') {
      // Everything toggles all options
      const newValue = !resetOptions.everything;
      newOptions.currentStreakOnly = newValue;
      newOptions.allProgress = newValue;
      newOptions.everything = newValue;
    } else if (option === 'allProgress') {
      // All progress also toggles current streak
      const newValue = !resetOptions.allProgress;
      newOptions.allProgress = newValue;
      newOptions.currentStreakOnly = newValue;
      // If turning on allProgress, turn off everything
      if (newValue && resetOptions.everything) {
        newOptions.everything = false;
      }
    } else if (option === 'currentStreakOnly') {
      // Current streak only
      newOptions.currentStreakOnly = !resetOptions.currentStreakOnly;
      // If turning off current streak, also turn off higher levels
      if (!newOptions.currentStreakOnly) {
        newOptions.allProgress = false;
        newOptions.everything = false;
      }
    }
    
    setResetOptions(newOptions);
  };

  // NEW: Smart reset handler
  const handleSmartReset = () => {
    if (!resetOptions.currentStreakOnly && !resetOptions.allProgress && !resetOptions.everything) {
      toast.error('Please select at least one reset option');
      return;
    }
    
    let resetUserData = { ...userData };
    const today = new Date();
    
    if (resetOptions.everything) {
      // NUCLEAR RESET - Everything goes
      resetUserData = {
        ...userData,
        startDate: today,
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
          start: today,
          end: null,
          days: 0,
          reason: null
        }],
        notes: {}
      };
      toast.success('All data has been completely reset');
    } else if (resetOptions.allProgress) {
      // RESET ALL PROGRESS - Keep only longest streak record
      resetUserData = {
        ...userData,
        startDate: today,
        currentStreak: 0,
        // Keep longest streak as a record
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
          start: today,
          end: null,
          days: 0,
          reason: null
        }],
        notes: {}
      };
      toast.success('Progress reset. Your longest streak record has been preserved');
    } else if (resetOptions.currentStreakOnly) {
      // RESET CURRENT STREAK ONLY - Keep all history and achievements
      resetUserData = {
        ...userData,
        startDate: today,
        currentStreak: 0,
        // Preserve all other data
        streakHistory: [
          ...userData.streakHistory.filter(streak => streak.end), // Keep all ended streaks
          {
            id: userData.streakHistory.length + 1,
            start: today,
            end: null,
            days: 0,
            reason: null
          }
        ]
      };
      toast.success('Current streak reset. All history and achievements preserved');
    }
    
    updateUserData(resetUserData);
    setShowResetModal(false);
    setResetOptions({
      currentStreakOnly: false,
      allProgress: false,
      everything: false
    });
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
  
  // ENHANCED: Generate streak comparison data with expanded benefit categories
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
    
    // Enhanced progression patterns based on the guide's timeline
    const progressionMultipliers = {
      confidence: {
        short: -1.5,  // Foundation phase - some confidence building
        medium: 0.0,  // Adjustment phase - baseline confidence
        long: +2.0    // Momentum+ phases - significant confidence boost
      },
      energy: {
        short: -1.2,  // Initial adjustment period
        medium: 0.0,  // Stabilization period
        long: +2.5    // Major energy transformation
      },
      focus: {
        short: -1.0,  // Some clarity improvements early
        medium: 0.0,  // Baseline during adjustment
        long: +2.3    // Significant mental enhancement
      },
      aura: {
        short: -0.8,  // Subtle presence changes
        medium: 0.0,  // Baseline magnetism
        long: +2.8    // Powerful presence development
      },
      sleep: {
        short: -1.1,  // Sleep pattern adjustment
        medium: 0.0,  // Stabilized sleep
        long: +2.2    // Optimized sleep quality
      },
      workout: {
        short: -0.6,  // Some physical improvements
        medium: 0.0,  // Baseline fitness
        long: +2.0    // Significant physical enhancement
      }
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
  
  // UPDATED: Get metric-specific benefits based on timeline phase - matches Emotional Timeline
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
      focus: {
        initial: {
          practical: "Brief periods of unusual mental sharpness alternating with mind racing. Concentration gradually improving.",
          esoteric: "Mental fog from energy dissipation is clearing. Your mind's natural clarity is beginning to emerge.",
          actionable: "Start with short meditation sessions (15 minutes) and gradually build concentration muscle."
        },
        purging: {
          practical: "Improved memory and faster decision-making. Information absorption and retention significantly enhanced.",
          esoteric: "Brain tissue becomes more densely connected as vital nutrients are redirected from reproduction to cognition.",
          actionable: "Take on learning challenges - new languages, skills, or complex subjects while your brain is optimizing."
        },
        expansion: {
          practical: "Mental clarity reaches new levels. Pattern recognition and strategic thinking abilities expand dramatically.",
          esoteric: "The mind purifies as sexual energy transforms. Fog lifts and thoughts become crystal clear.",
          actionable: "Apply enhanced focus to your most important goals. This is the time for major intellectual achievements."
        },
        integration: {
          practical: "Memory becomes exceptional with photographic tendencies. Ability to master new skills rapidly develops.",
          esoteric: "Mental body (Manomaya Kosha) expands and clarifies. Consciousness operates at higher dimensional levels.",
          actionable: "Share your enhanced mental capabilities through teaching, writing, or innovative problem-solving."
        },
        mastery: {
          practical: "Knowledge synthesis across disciplines becomes natural. Complex concepts understood intuitively.",
          esoteric: "Mind achieves unity consciousness. Individual thinking merges with universal intelligence.",
          actionable: "Use integrated awareness to bridge different fields of knowledge and create innovative solutions."
        }
      },
      confidence: {
        initial: {
          practical: "Growing sense of possibility and self-confidence from taking control of this fundamental area of life.",
          esoteric: "Personal power begins awakening as you reclaim dominion over your most basic drives and impulses.",
          actionable: "Practice saying no to small requests to build boundary-setting strength for bigger challenges ahead."
        },
        purging: {
          practical: "Growing belief in your capabilities. Natural inclination to take charge in group situations emerges.",
          esoteric: "Solar plexus chakra (Manipura) activates as personal power stabilizes. Inner fire begins burning steady.",
          actionable: "Take on leadership opportunities at work or in community to develop and exercise your growing confidence."
        },
        expansion: {
          practical: "Natural confidence without arrogance. Others seeking your opinions and treating you with more respect.",
          esoteric: "Personal power matures into authentic authority. You embody strength without aggression or dominance.",
          actionable: "Use growing influence responsibly. Focus on empowering others rather than seeking personal advantage."
        },
        integration: {
          practical: "Others automatically looking to you for direction. Natural charisma and leadership abilities manifest.",
          esoteric: "Divine masculine energy fully activated. You embody the archetype of the wise king or spiritual warrior.",
          actionable: "Accept leadership responsibilities but remain humble. Power should serve others, not personal ego."
        },
        mastery: {
          practical: "Unshakeable inner confidence independent of external circumstances. Natural authority recognized by others.",
          esoteric: "Self-confidence transcends into cosmic confidence. You know your place in the universal order.",
          actionable: "Mentor others in developing authentic confidence and personal power through your example and teaching."
        }
      },
      aura: {
        initial: {
          practical: "Others beginning to notice something different about you, though they can't quite explain what it is.",
          esoteric: "Your electromagnetic field strengthens as vital energy accumulates. Auric field begins expanding beyond normal limits.",
          actionable: "Pay attention to how others respond to your presence. Practice maintaining positive, powerful energy."
        },
        purging: {
          practical: "Magnetism increasing - people drawn to be near you without knowing why. Quality of interactions improves.",
          esoteric: "Aura expands from normal 3-6 feet to 10-15 feet. Others unconsciously sense your elevated energy signature.",
          actionable: "Use your growing magnetism responsibly. Attract people for mutual benefit, not personal manipulation."
        },
        expansion: {
          practical: "Attracting higher-quality people into your life. Network and relationship quality significantly improves.",
          esoteric: "Auric field becomes powerful enough to influence others' emotional and mental states. Energy signature purifies.",
          actionable: "Consciously radiate positive energy. Your presence should uplift and inspire everyone you encounter."
        },
        integration: {
          practical: "People change behavior in your presence. Natural authority and influence expand significantly.",
          esoteric: "Aura extends 50+ feet from body. Energy field carries information that transforms others at distance.",
          actionable: "Accept responsibility for your energetic impact on others. Your presence should serve their highest good."
        },
        mastery: {
          practical: "Consistent powerful presence that affects positive change in every environment you enter.",
          esoteric: "Auric field stabilizes at master level. Energy signature becomes a beacon of light for others.",
          actionable: "Use your energetic influence to create positive change in communities, organizations, and relationships."
        }
      },
      sleep: {
        initial: {
          practical: "Sleep patterns may be disrupted as body adjusts. You might sleep more or less than usual initially.",
          esoteric: "Body's natural circadian rhythms reset as energy patterns shift from reproduction to regeneration.",
          actionable: "Maintain consistent sleep schedule. Create sacred sleep environment free from electromagnetic interference."
        },
        purging: {
          practical: "Sleep optimization begins - needing less sleep but feeling more rested. Dreams become more vivid.",
          esoteric: "Energy body (Pranamaya Kosha) purifies during sleep. Astral consciousness becomes more active and aware.",
          actionable: "Pay attention to your dreams - they're processing old patterns and revealing guidance for your journey."
        },
        expansion: {
          practical: "Deep, restorative sleep with consistent energy upon waking. Sleep efficiency reaches optimal levels.",
          esoteric: "Sleep becomes a time of spiritual regeneration. Consciousness travels to higher realms during rest.",
          actionable: "Use pre-sleep meditation to program positive dreams and insights. Morning journaling captures wisdom received."
        },
        integration: {
          practical: "Requiring minimal sleep while feeling completely refreshed. Recovery and healing accelerated during rest.",
          esoteric: "Physical sleep merges with spiritual contemplation. Rest becomes active communion with higher consciousness.",
          actionable: "Dedicate first moments upon waking to gratitude and intention-setting for the day ahead."
        },
        mastery: {
          practical: "Perfect sleep efficiency - exactly the right amount of rest for optimal function with natural wake timing.",
          esoteric: "Sleep-wake cycle aligns with cosmic rhythms. Body follows natural law rather than artificial schedules.",
          actionable: "Share sleep optimization knowledge with others struggling with rest and recovery issues."
        }
      },
      workout: {
        initial: {
          practical: "Physical restlessness increases - body needs more movement to circulate accumulating energy.",
          esoteric: "Life force seeks upward movement through physical expression. Body becomes vessel for dynamic energy.",
          actionable: "Establish vigorous daily exercise routine. Use physical movement to transmute sexual energy upward."
        },
        purging: {
          practical: "Noticeable strength gains and physical improvements. Coordination and athleticism naturally enhance.",
          esoteric: "Muscle tissue becomes more efficient as vital nutrients redirect from reproduction to physical development.",
          actionable: "Challenge yourself with progressive physical goals. Your enhanced capabilities can handle increased demands."
        },
        expansion: {
          practical: "Natural muscle gain and fat loss without extra effort. Athletic performance reaches new personal bests.",
          esoteric: "Physical body becomes refined vessel for spiritual energy. Strength serves higher consciousness rather than ego.",
          actionable: "Use physical prowess to inspire and help others. Your body becomes example of what's possible."
        },
        integration: {
          practical: "Movement becomes graceful and powerful. Others notice significant improvements in your physical presence.",
          esoteric: "Body achieves harmony between strength and flexibility, power and grace. Physical form reflects spiritual development.",
          actionable: "Train others in physical development. Share knowledge of how retention enhances athletic performance."
        },
        mastery: {
          practical: "Peak physical condition maintained effortlessly. Body operates at optimal efficiency in all activities.",
          esoteric: "Physical form becomes temple for divine consciousness. Every movement expresses spiritual principle.",
          actionable: "Use physical mastery to demonstrate integration of body, mind, and spirit in all activities."
        }
      }
    };
    
    return metricData[metric][phase];
  };
  
  // UPDATED: Get challenge-specific guidance based on phase - matches Emotional Timeline
  const getChallengeGuidance = (phase, streak) => {
    const challengeData = {
      initial: {
        actionable: "Expect resistance and strong urges. Focus on building unbreakable daily habits. Remove all triggers from environment."
      },
      purging: {
        actionable: "Flatlines and mood swings are normal. Accept emotions without resistance. Maintain practices even when motivation dips."
      },
      expansion: {
        actionable: "Guard against ego inflation. Use increased mental abilities for meaningful goals and helping others."
      },
      integration: {
        actionable: "Handle increased responsibility wisely. Some relationships may change as you transform - this is normal."
      },
      mastery: {
        actionable: "Focus on legacy creation and service to others. Your development now serves humanity's evolution."
      }
    };
    
    return challengeData[phase];
  };
  
  // Determine if user needs challenge-specific guidance
  const shouldShowChallengeGuidance = (streak, dataLength) => {
    // Show during known difficult periods or if user seems to be struggling
    const isInDifficultPeriod = (streak >= 14 && streak <= 45) || (streak >= 60 && streak <= 120);
    const hasLimitedData = dataLength < 7;
    const isNewUser = streak <= 7;
    
    return isInDifficultPeriod || hasLimitedData || isNewUser;
  };
  
  // UPDATED: Get phase-specific challenge insight - matches Emotional Timeline
  const getChallengeInsight = (phase, streak) => {
    const challengeInsights = {
      initial: {
        practical: `Day ${streak}: You're in the Initial Adaptation phase. Strong urges and restlessness are completely normal - your body is learning to retain energy.`,
        esoteric: `Day ${streak}: You're beginning the hero's journey. The resistance you feel is the old self protecting its familiar patterns.`,
        actionable: "Focus on building unbreakable daily habits. Use cold showers and intense exercise to channel excess energy."
      },
      purging: {
        practical: `Day ${streak}: Emotional Purging phase brings mood swings and flatlines. These are signs of your psyche healing itself.`,
        esoteric: `Day ${streak}: You're in the purification stage. Emotional volatility indicates old patterns being purged from your system.`,
        actionable: "Journal extensively and accept emotions without resistance. This emotional turbulence is part of healing."
      },
      expansion: {
        practical: `Day ${streak}: Mental Expansion phase brings enhanced cognitive abilities. Your brain is operating at higher efficiency.`,
        esoteric: `Day ${streak}: You're entering the alchemical refinement stage. Mental faculties expand as consciousness evolves.`,
        actionable: "Apply enhanced focus to important goals. This is the time for major intellectual and creative achievements."
      },
      integration: {
        practical: `Day ${streak}: Spiritual Integration phase brings profound inner transformation. You're gaining abilities that feel almost supernatural.`,
        esoteric: `Day ${streak}: Major consciousness expansion occurring. You're embodying the divine masculine archetype.`,
        actionable: "Accept increased responsibility gracefully. Share your wisdom while remaining humble about your development."
      },
      mastery: {
        practical: `Day ${streak}: Mastery & Service phase brings responsibility for guiding others and contributing to human evolution.`,
        esoteric: `Day ${streak}: Individual development now serves cosmic evolution. Your consciousness affects the collective field.`,
        actionable: "Focus on legacy creation and mentoring others. Your mastery should serve the awakening of all humanity."
      }
    };
    
    return challengeInsights[phase];
  };

  // ENHANCED: Timeline-based insights for all 6 metrics with challenge-specific guidance
  const generateAllInsights = () => {
    const filteredData = getFilteredBenefitData();
    const currentStreak = userData.currentStreak || 0;
    const insights = [];
    
    // Define all 6 enhanced benefit categories
    const allMetrics = ['energy', 'focus', 'confidence', 'aura', 'sleep', 'workout'];
    
    // UPDATED: Timeline-based phase detection - matches Emotional Timeline exactly
    const getPhase = (streak) => {
      if (streak <= 14) return 'initial';
      if (streak <= 45) return 'purging'; 
      if (streak <= 90) return 'expansion';
      if (streak <= 180) return 'integration';
      return 'mastery';
    };
    
    const currentPhase = getPhase(currentStreak);
    
    // Generate insights for ALL 6 metrics based on timeline and phase
    allMetrics.forEach((metric, index) => {
      const avgValue = parseFloat(calculateAverage());
      const isSelectedMetric = metric === selectedMetric;
      
      // Get metric-specific benefits from the guide
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
    
    // Add phase-specific challenge insight if user needs guidance
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

  // UPDATED: Generate pattern insights with Emotional Timeline phases
  const generatePatternInsights = () => {
    const filteredData = getFilteredBenefitData();
    const currentStreak = userData.currentStreak || 0;
    const patterns = [];
    
    // Get current phase for context
    const getPhase = (streak) => {
      if (streak <= 14) return 'initial';
      if (streak <= 45) return 'purging'; 
      if (streak <= 90) return 'expansion';
      if (streak <= 180) return 'integration';
      return 'mastery';
    };
    
    const currentPhase = getPhase(currentStreak);
    
    // UPDATED: Timeline-based challenge patterns matching Emotional Timeline
    const timelinePatterns = {
      initial: {
        practical: "Days 1-14: Initial Adaptation phase. Strong urges and energy fluctuations are completely normal - your body is learning to retain vital force.",
        esoteric: "Days 1-14: You're beginning the hero's journey. The inner conflict represents old patterns dying and new consciousness being born.",
        actionable: wisdomMode ?
          "Embrace this sacred initiation. Every urge resisted builds spiritual strength for the challenges ahead." :
          "Focus on building unbreakable daily habits. Use cold showers and exercise to channel excess energy."
      },
      purging: {
        practical: "Days 15-45: Emotional Purging phase. Mood swings and flatlines indicate your psyche is healing itself - this is the most challenging phase.",
        esoteric: "Days 15-45: Your energy body is adapting to higher frequencies. Emotional volatility shows old patterns being purged.",
        actionable: wisdomMode ?
          "Trust the purification process. Journal extensively and accept emotions without resistance." :
          "This emotional turbulence is temporary but necessary. Maintain practices even when motivation dips."
      },
      expansion: {
        practical: "Days 46-90: Mental Expansion phase. Enhanced cognitive abilities and creativity emerge as emotional turbulence stabilizes.",
        esoteric: "Days 46-90: Sexual energy is transmuting into mental power. You're entering the alchemical refinement stage.",
        actionable: wisdomMode ?
          "Channel growing mental power into service. Apply enhanced abilities to help others and create meaningful work." :
          "Use increased focus for important goals. This is the time for major intellectual and creative achievements."
      },
      integration: {
        practical: "Days 91-180: Spiritual Integration phase. Profound inner transformation as benefits become deeply integrated.",
        esoteric: "Days 91-180: Major consciousness expansion occurring. You're embodying the divine masculine archetype.",
        actionable: wisdomMode ?
          "Accept your growing influence responsibly. You're becoming a beacon of light for others on the path." :
          "Handle increased social attention wisely. Share your wisdom while remaining humble about your development."
      },
      mastery: {
        practical: "180+ Days: Mastery & Service phase. Complete integration - you've transcended the need for external validation.",
        esoteric: "180+ Days: Individual consciousness merges with universal consciousness. You serve the evolution of all humanity.",
        actionable: wisdomMode ?
          "Share your wisdom through teaching and example. Your mastery serves the awakening of collective consciousness." :
          "Focus on legacy creation and mentoring others. Your development should create lasting positive impact."
      }
    };
    
    // Always show timeline-based pattern for current phase
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
    
    // Add specific challenge warnings based on timeline
    const getChallengeWarnings = () => {
      if (currentStreak >= 14 && currentStreak <= 21) {
        return {
          practical: "Week 3 Challenge: Many experience the strongest urges around day 14-21. This is your brain's final attempt to return to old patterns.",
          esoteric: "Week 3 Initiation: You're facing the guardian at the threshold. This test determines if you're ready for deeper transformation.",
          actionable: wisdomMode ?
            "See this challenge as sacred initiation. Every moment you resist builds spiritual strength for the journey ahead." :
            "Increase meditation time and remove yourself from triggering situations. This is the make-or-break moment."
        };
      }
      
      if (currentStreak >= 30 && currentStreak <= 45) {
        return {
          practical: "Flatline Warning: Days 30-45 often bring emotional numbness and low motivation. This is brain integration, not failure.",
          esoteric: "Sacred Void: You're in the dissolution phase where old identity dies before new consciousness is born.",
          actionable: wisdomMode ?
            "Embrace the emptiness as sacred preparation. The void creates space for higher consciousness to enter." :
            "Trust the process and maintain practices even when you feel nothing. This phase passes and leads to breakthroughs."
        };
      }
      
      if (currentStreak >= 60 && currentStreak <= 90) {
        return {
          practical: "Social Pressure Peak: Others may become more hostile or try to sabotage your progress as your energy threatens established hierarchies.",
          esoteric: "Energy Disruption: Your rising consciousness disrupts lower vibrational patterns around you, causing resistance from others.",
          actionable: wisdomMode ?
            "Send love to those who resist your growth. Their hostility reflects their own inner suffering and limitation." :
            "Protect your energy while maintaining compassion. Set firm boundaries with those who try to drain or sabotage you."
        };
      }
      
      return null;
    };
    
    const challengeWarning = getChallengeWarnings();
    if (challengeWarning) {
      patterns.push({
        id: 2,
        practical: challengeWarning.practical,
        esoteric: challengeWarning.esoteric,
        actionable: challengeWarning.actionable,
        isWarning: true
      });
    }
    
    // Add relapse analysis if user has history
    if (userData.longestStreak && userData.longestStreak > currentStreak && currentStreak > 0) {
      patterns.push({
        id: patterns.length + 1,
        practical: `Recovery Pattern: You've previously achieved ${userData.longestStreak} days. Your current ${currentStreak}-day streak shows you're rebuilding that momentum.`,
        esoteric: `Spiral Evolution: Your previous ${userData.longestStreak}-day journey created lasting changes in your consciousness. This current cycle builds upon that foundation.`,
        actionable: wisdomMode ?
          "Each attempt deepens your spiritual capacity. You're not starting over - you're spiraling upward to higher levels." :
          "Each attempt strengthens your resolve. Apply lessons learned from your previous success to go even further this time."
      });
    }
    
    // Add benefit tracking patterns if sufficient data
    if (filteredData.length >= 7) {
      const recentAvg = filteredData.slice(-7).reduce((sum, day) => sum + (day[selectedMetric] || 0), 0) / 7;
      const overallAvg = parseFloat(calculateAverage());
      
      if (recentAvg > overallAvg + 0.5) {
        patterns.push({
          id: patterns.length + 1,
          practical: `Improvement Trend: Your recent ${selectedMetric === 'sleep' ? 'sleep quality' : selectedMetric} levels are trending upward, showing real progress.`,
          esoteric: `Energy Elevation: Your ${selectedMetric === 'sleep' ? 'sleep quality' : selectedMetric} energy is ascending to higher frequencies as your practice deepens.`,
          actionable: wisdomMode ?
            "Continue the practices that create this upward spiral. Your consciousness is expanding through dedicated effort." :
            "Identify what specific factors are driving this improvement and maintain those positive patterns consistently."
        });
      } else if (recentAvg < overallAvg - 0.5) {
        patterns.push({
          id: patterns.length + 1,
          practical: `Attention Needed: Your recent ${selectedMetric === 'sleep' ? 'sleep quality' : selectedMetric} levels have dipped. This often happens before major breakthroughs.`,
          esoteric: `Pre-Breakthrough Dip: Temporary ${selectedMetric === 'sleep' ? 'sleep quality' : selectedMetric} decreases often precede quantum leaps in consciousness.`,
          actionable: wisdomMode ?
            "Trust the process - this dip often indicates deep transformation occurring beneath the surface." :
            "Review your recent habits and stress levels. Make adjustments to support your wellbeing during this phase."
        });
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

      {/* Header exactly like Tracker and Calendar */}
      <div className="stats-header">
        <div className="stats-header-spacer"></div>
        <h2>Your Stats</h2>
        <div className="stats-header-actions">
          <button className="reset-stats-btn" onClick={() => setShowResetModal(true)}>
            <FaRedo />
            <span>Reset Progress</span>
          </button>
        </div>
      </div>
      
      {/* NEW: Smart Reset Modal */}
      {showResetModal && (
        <div className="modal-overlay">
          <div className="modal-content smart-reset-modal">
            <h3>Reset Progress</h3>
            <p className="reset-intro">Choose what you want to reset. Each option will preserve different aspects of your journey.</p>
            
            <div className="reset-options">
              <div 
                className={`reset-option ${resetOptions.currentStreakOnly ? 'selected' : ''}`}
                onClick={() => handleResetOptionToggle('currentStreakOnly')}
              >
                <div className="reset-option-checkbox">
                  {resetOptions.currentStreakOnly && <FaCheckCircle />}
                </div>
                <div className="reset-option-content">
                  <h4>Current streak only</h4>
                  <p>Resets your current streak to 0 and starts fresh from today</p>
                  <div className="reset-preserves">
                    <span className="preserve-label">Preserves:</span>
                    <ul>
                      <li>All streak history</li>
                      <li>Total relapse/wet dream counts</li>
                      <li>All achievements and badges</li>
                      <li>Benefit tracking data</li>
                      <li>Journal entries</li>
                      <li>Longest streak record</li>
                    </ul>
                  </div>
                </div>
              </div>
              
              <div 
                className={`reset-option ${resetOptions.allProgress ? 'selected' : ''}`}
                onClick={() => handleResetOptionToggle('allProgress')}
              >
                <div className="reset-option-checkbox">
                  {resetOptions.allProgress && <FaCheckCircle />}
                </div>
                <div className="reset-option-content">
                  <h4>All progress</h4>
                  <p>Clears all tracking data but keeps your longest streak as a record</p>
                  <div className="reset-preserves">
                    <span className="preserve-label">Preserves:</span>
                    <ul>
                      <li>Longest streak record only</li>
                    </ul>
                  </div>
                  <div className="reset-deletes">
                    <span className="delete-label">Deletes:</span>
                    <ul>
                      <li>Current streak</li>
                      <li>All streak history</li>
                      <li>Total counts</li>
                      <li>All badges</li>
                      <li>Benefit tracking</li>
                      <li>Journal entries</li>
                    </ul>
                  </div>
                </div>
              </div>
              
              <div 
                className={`reset-option ${resetOptions.everything ? 'selected' : ''} nuclear`}
                onClick={() => handleResetOptionToggle('everything')}
              >
                <div className="reset-option-checkbox">
                  {resetOptions.everything && <FaCheckCircle />}
                </div>
                <div className="reset-option-content">
                  <h4>Everything</h4>
                  <p>Complete reset - starts fresh as if using the app for the first time</p>
                  <div className="reset-deletes">
                    <span className="delete-label">Deletes:</span>
                    <ul>
                      <li>All data including longest streak record</li>
                      <li>Complete history and all achievements</li>
                      <li>Returns to Day 0 with no records</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="form-actions">
              <button 
                className="btn btn-danger" 
                onClick={handleSmartReset}
                disabled={!resetOptions.currentStreakOnly && !resetOptions.allProgress && !resetOptions.everything}
              >
                Confirm Reset
              </button>
              <button 
                className="btn btn-outline" 
                onClick={() => {
                  setShowResetModal(false);
                  setResetOptions({
                    currentStreakOnly: false,
                    allProgress: false,
                    everything: false
                  });
                }}
              >
                Cancel
              </button>
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
            
            {/* UPDATED: Benefit Insights Section - Phase indicator positioned underneath header on the right */}
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
            
            {/* Journey Guidance Section - NO ICON */}
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