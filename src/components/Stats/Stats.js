// components/Stats/Stats.js - COMPLETE FILE - Progressive premium lock matching Timeline pattern
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
    { id: 'home_alone', label: 'Being Home Alone', icon: FaHome },
    { id: 'explicit_content', label: 'Explicit Content', icon: FaTheaterMasks }
  ];
  
  // NEW: Smart scroll detection for floating toggle - ONLY for premium users
  useEffect(() => {
    const handleScroll = () => {
      // Only show toggle if premium (since free users don't see premium insights)
      if (!isPremium) {
        setShowFloatingToggle(false);
        return;
      }
      
      const insightsStart = insightsStartRef.current;
      const patternSection = patternSectionRef.current;
      
      if (!insightsStart || !patternSection) return;
      
      // Get scroll position and element positions
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const windowHeight = window.innerHeight;
      
      // Get positions relative to document
      const insightsStartTop = insightsStart.getBoundingClientRect().top + scrollTop;
      const patternSectionBottom = patternSection.getBoundingClientRect().bottom + scrollTop;
      
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
          metric: "energy"
        },
        {
          id: 2,
          practical: "Focus patterns become clearer with more data - mental clarity typically improves after day 7.",
          esoteric: "Focus patterns become clearer with more data - mental clarity follows the natural rhythms of retention.",
          metric: "focus"
        },
        {
          id: 3,
          practical: "Confidence trends emerge as you build tracking history - self-control builds self-trust over time.",
          esoteric: "Confidence trends emerge as you build tracking history - inner strength manifests through discipline.",
          metric: "confidence"
        },
        {
          id: 4,
          practical: "Aura improvements are best analyzed over extended periods - social presence often increases with longer streaks.",
          esoteric: "Aura improvements are best analyzed over extended periods - your energetic presence grows with practice.",
          metric: "aura"
        },
        {
          id: 5,
          practical: "Sleep quality patterns show correlation with retention - testosterone optimization often improves rest.",
          esoteric: "Sleep quality patterns show the connection between retention and dream states over time.",
          metric: "sleep"
        },
        {
          id: 6,
          practical: "Workout performance correlations become visible with more tracking - energy conservation can boost physical performance.",
          esoteric: "Workout performance correlations become visible with more tracking - retained energy enhances physical power.",
          metric: "workout"
        }
      ];
    }
    
    const insights = [];
    const recentData = filteredData.slice(-7);
    
    // Helper function to calculate recent average for any metric
    const calculateRecentAverage = (metric) => {
      if (recentData.length === 0) return 5;
      const sum = recentData.reduce((acc, item) => {
        // MIGRATION: Handle old attraction data -> sleep data
        if (metric === 'sleep') {
          return acc + (item[metric] || item.attraction || 5);
        }
        return acc + (item[metric] || 5);
      }, 0);
      return sum / recentData.length;
    };
    
    // UPDATED: Energy insights with both practical and esoteric versions
    const energyTrend = recentData.length > 1 ? 
      (recentData[recentData.length - 1].energy || 5) - (recentData[0].energy || 5) : 0;
    const energyAvg = parseFloat(calculateAverage());
    
    if (energyTrend > 1.5) {
      insights.push({
        id: 1,
        practical: "Your energy levels are rising consistently - this upward trend suggests your body is adapting well to retention.",
        esoteric: "Your vital force is ascending - the retained life essence is strengthening your energetic field significantly.",
        metric: "energy"
      });
    } else if (energyTrend < -1.5) {
      insights.push({
        id: 1,
        practical: "Energy levels are declining - consider factors like sleep quality, stress levels, or diet that might be affecting you.",
        esoteric: "Consider what's depleting your life force - stress, poor sleep, or scattered attention can drain vital energy.",
        metric: "energy"
      });
    } else if (energyAvg > 7.5) {
      insights.push({
        id: 1,
        practical: "Your energy levels are consistently high - you've likely reached the optimal adaptation phase of retention.",
        esoteric: "Your energy centers are aligned - you've entered the realm where physical vitality meets spiritual power.",
        metric: "energy"
      });
    } else {
      insights.push({
        id: 1,
        practical: "Energy typically peaks around day 10-14 as testosterone levels stabilize and the body completes adaptation.",
        esoteric: "Ancient wisdom teaches that energy peaks around day 10-14 as the body completes its first transmutation cycle.",
        metric: "energy"
      });
    }
    
    // Focus insights with practical vs mental alchemy concepts
    const focusAvg = calculateRecentAverage('focus');
    if (focusAvg > 7.5) {
      insights.push({
        id: 2,
        practical: "Your focus is excellent - retention has likely optimized your dopamine sensitivity and attention span.",
        esoteric: "Your mind has achieved the clarity spoken of in hermetic traditions - focused attention becomes a magical tool.",
        metric: "focus"
      });
    } else if (focusAvg > 6) {
      insights.push({
        id: 2,
        practical: "Focus is improving - reduced dopamine seeking behavior from retention often enhances concentration.",
        esoteric: "Mental alchemy is occurring - the fog of desire is lifting, revealing the crystal clarity beneath.",
        metric: "focus"
      });
    } else {
      insights.push({
        id: 2,
        practical: "Focus typically improves after 2-3 weeks as your brain's reward system rebalances from reduced stimulation.",
        esoteric: "The ancients knew that mental clarity follows the withdrawal of vital essence from lower chakras to higher ones.",
        metric: "focus"
      });
    }
    
    // Confidence insights with practical vs inner authority concepts
    const confidenceAvg = calculateRecentAverage('confidence');
    if (confidenceAvg > 7.5) {
      insights.push({
        id: 3,
        practical: "Your confidence is strong - successfully maintaining discipline in this area builds genuine self-trust.",
        esoteric: "You're developing true inner authority - confidence born from self-mastery, not ego or external validation.",
        metric: "confidence"
      });
    } else if (confidenceAvg > 6) {
      insights.push({
        id: 3,
        practical: "Confidence is building steadily - each day of self-control reinforces your belief in your own willpower.",
        esoteric: "Each day of retention builds the foundation of unshakeable self-trust - the cornerstone of personal power.",
        metric: "confidence"
      });
    } else {
      insights.push({
        id: 3,
        practical: "Confidence often emerges after 2-3 weeks as you prove to yourself you can control strong impulses.",
        esoteric: "Real confidence emerges after 2-3 weeks as you prove to yourself that you can master your strongest impulses.",
        metric: "confidence"
      });
    }
    
    // Aura insights with practical vs energetic presence concepts
    const auraAvg = calculateRecentAverage('aura');
    if (auraAvg > 7.5) {
      insights.push({
        id: 4,
        practical: "Your social presence is strong - others often respond positively to the confidence retention builds.",
        esoteric: "Your energetic field is becoming magnetic - others unconsciously sense the power you're cultivating within.",
        metric: "aura"
      });
    } else if (auraAvg > 6) {
      insights.push({
        id: 4,
        practical: "Your presence is improving - retention often enhances charisma and social confidence over time.",
        esoteric: "The retained life force is beginning to radiate outward, creating the luminous presence mystics speak of.",
        metric: "aura"
      });
    } else {
      insights.push({
        id: 4,
        practical: "Social presence typically improves after 30 days as increased confidence becomes noticeable to others.",
        esoteric: "Esoteric teachings say that after 30 days, the subtle body begins to glow with accumulated spiritual energy.",
        metric: "aura"
      });
    }
    
    // Sleep insights with practical vs dream consciousness
    const sleepAvg = calculateRecentAverage('sleep');
    if (sleepAvg > 7.5) {
      insights.push({
        id: 5,
        practical: "Your sleep quality is excellent - retention often improves sleep through better hormone regulation.",
        esoteric: "Deep, restorative sleep indicates your nervous system is harmonizing - the body's natural wisdom is healing.",
        metric: "sleep"
      });
    } else if (sleepAvg > 6) {
      insights.push({
        id: 5,
        practical: "Sleep quality is improving - retention can enhance deep sleep phases and recovery cycles.",
        esoteric: "Quality sleep improves with retention as sexual energy transforms into higher spiritual forces during rest.",
        metric: "sleep"
      });
    } else {
      insights.push({
        id: 5,
        practical: "Poor sleep may indicate stress or adjustment - consider meditation or relaxation before bed.",
        esoteric: "Poor sleep often indicates energy is still chaotic - consider meditation before bed to calm the vital currents.",
        metric: "sleep"
      });
    }
    
    // Workout insights with practical vs physical transmutation
    const workoutAvg = calculateRecentAverage('workout');
    if (workoutAvg > 7.5) {
      insights.push({
        id: 6,
        practical: "Your workout performance is excellent - retention often increases energy available for physical training.",
        esoteric: "Your physical vessel is becoming a temple - retained life force is amplifying your strength and endurance.",
        metric: "workout"
      });
    } else if (workoutAvg > 6) {
      insights.push({
        id: 6,
        practical: "Physical performance is improving - conserved energy can translate into better gym sessions.",
        esoteric: "The body becomes more resilient as sexual energy transmutes into raw physical power and stamina.",
        metric: "workout"
      });
    } else {
      insights.push({
        id: 6,
        practical: "Physical performance often improves with retention - conserved energy can boost workout intensity.",
        esoteric: "Ancient warriors knew that conserved sexual energy provides extraordinary physical capabilities when channeled properly.",
        metric: "workout"
      });
    }
    
    return insights;
  };

  // Get current insight for selected metric
  const getCurrentInsight = () => {
    const allInsights = generateAllInsights();
    const insight = allInsights.find(insight => insight.metric === selectedMetric) || allInsights[0];
    return wisdomMode ? insight.esoteric : insight.practical;
  };

  // UPDATED: Enhanced pattern analysis with both practical and esoteric versions
  const generatePatternInsights = () => {
    if (!userData.streakHistory || userData.streakHistory.length < 2) {
      return [{
        id: 1,
        practical: "Your journey is just beginning - patterns will emerge as you track more cycles and relapses.",
        esoteric: "Your journey is just beginning - patterns will emerge as you accumulate more experience.",
        actionable: wisdomMode ? 
          "The path of self-mastery reveals its secrets only to those who persist through multiple cycles." :
          "Continue tracking to identify trends in your behavior and triggers over time."
      }];
    }

    const insights = [];
    const relapsedStreaks = userData.streakHistory.filter(streak => 
      streak.reason === 'relapse' && streak.trigger
    );

    if (relapsedStreaks.length === 0) {
      return [{
        id: 1,
        practical: "You're maintaining strong discipline - continue tracking to identify potential weak points before they become issues.",
        esoteric: "You're maintaining strong discipline - the forces of temptation have not yet revealed their patterns.",
        actionable: wisdomMode ?
          "Continue tracking to identify subtle energy fluctuations that may precede challenging moments." :
          "Keep monitoring your mood, stress levels, and environmental factors that might affect your discipline."
      }];
    }

    // Analyze most common trigger with practical vs esoteric interpretation
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
      
      // DUAL INSIGHTS: Practical and Esoteric
      let practicalInsight = "";
      let esotericInsight = "";
      let practicalAction = "";
      let esotericAction = "";
      
      switch(mostCommonTrigger) {
        case 'lustful_thoughts':
          practicalInsight = "Lustful thoughts are your main trigger - this indicates you may need better mental discipline techniques.";
          esotericInsight = "The mind is your battleground - these thoughts are the ego's last defense against transcendence.";
          practicalAction = "Practice thought-stopping techniques, meditation, or redirect attention immediately when these thoughts arise.";
          esotericAction = "Develop specific rituals to transmute this energy: breathing exercises, cold exposure, or physical movement when lustful thoughts arise.";
          break;
        case 'stress':
          practicalInsight = "Stress is your main trigger - high cortisol may be weakening your willpower and decision-making.";
          esotericInsight = "Stress scatters your life force - when the nervous system is agitated, lower impulses resurface.";
          practicalAction = "Develop healthy stress management: exercise, deep breathing, or talking to someone when stressed.";
          esotericAction = "Develop specific rituals to transmute this energy: breathing exercises, cold exposure, or physical movement when stress arises.";
          break;
        case 'boredom':
          practicalInsight = "Boredom is your main trigger - idle time may be leading to seeking stimulation through familiar patterns.";
          esotericInsight = "Boredom signals unused creative energy - this force seeks expression and will find destructive outlets if ignored.";
          practicalAction = "Plan productive activities for idle time: hobbies, exercise, learning, or social activities.";
          esotericAction = "Develop specific rituals to transmute this energy: breathing exercises, cold exposure, or physical movement when boredom arises.";
          break;
        case 'social_media':
          practicalInsight = "Social media is your main trigger - digital dopamine hits may be weakening your impulse control.";
          esotericInsight = "Digital stimulation fragments your attention - scattered focus weakens your energetic boundaries.";
          practicalAction = "Limit social media use, use app timers, or avoid platforms that contain triggering content.";
          esotericAction = "Develop specific rituals to transmute this energy: breathing exercises, cold exposure, or physical movement when social media urges arise.";
          break;
        case 'loneliness':
          practicalInsight = "Loneliness is your main trigger - isolation may be leading to seeking connection through familiar patterns.";
          esotericInsight = "Loneliness is the soul seeking connection - but true fulfillment comes from inner unity, not external validation.";
          practicalAction = "Build social connections, join groups, call friends, or engage in community activities when feeling lonely.";
          esotericAction = "Develop specific rituals to transmute this energy: breathing exercises, cold exposure, or physical movement when loneliness arises.";
          break;
        case 'explicit_content':
          practicalInsight = "Explicit content is your main trigger - visual stimulation is directly activating old neural pathways.";
          esotericInsight = "Visual triggers activate ancient programming - the eyes are gateways that can either elevate or deplete your essence.";
          practicalAction = "Use content blockers, avoid triggering websites, or change your digital environment to reduce exposure.";
          esotericAction = "Develop specific rituals to transmute this energy: breathing exercises, cold exposure, or physical movement when explicit content appears.";
          break;
        default:
          practicalInsight = "This trigger appears multiple times in your pattern - it represents a consistent weak point in your discipline.";
          esotericInsight = "This trigger represents unresolved energy seeking expression through familiar patterns.";
          practicalAction = "Develop specific strategies to handle this trigger when it arises.";
          esotericAction = "Develop specific rituals to transmute this energy when this trigger arises.";
      }
      
      insights.push({
        id: insights.length + 1,
        practical: `"${triggerLabel}" appears ${triggerCounts[mostCommonTrigger]} times in your pattern. ${practicalInsight}`,
        esoteric: `"${triggerLabel}" appears ${triggerCounts[mostCommonTrigger]} times in your pattern. ${esotericInsight}`,
        actionable: wisdomMode ? esotericAction : practicalAction
      });
    }

    // Analyze streak length patterns with practical vs esoteric cycle understanding
    const streakLengths = relapsedStreaks.map(streak => streak.days).filter(days => days > 0);
    if (streakLengths.length > 1) {
      const avgLength = Math.round(streakLengths.reduce((sum, len) => sum + len, 0) / streakLengths.length);
      
      if (avgLength < 7) {
        insights.push({
          id: insights.length + 1,
          practical: `Your ${avgLength}-day cycles suggest you've mastered initial urges but struggle with medium-term discipline.`,
          esoteric: `Your ${avgLength}-day cycles suggest you're transcending the physical but not yet stabilized in the emotional realm.`,
          actionable: wisdomMode ?
            "Days 7-14 test emotional equilibrium. Practice emotional alchemy: transform frustration into determination." :
            "Days 7-14 are often challenging due to increased energy. Channel this into productive activities and maintain routines."
        });
      } else if (avgLength < 21) {
        insights.push({
          id: insights.length + 1,
          practical: `Your ${avgLength}-day cycles suggest you handle initial challenges but struggle with deeper habit patterns.`,
          esoteric: `Your ${avgLength}-day cycles suggest you're mastering the emotional realm but haven't yet stabilized in the mental plane.`,
          actionable: wisdomMode ?
            "Days 14-30 test mental fortitude. Practice mental alchemy: transform doubt into unwavering resolve." :
            "Days 14-30 require mental discipline. Focus on long-term goals and avoid situations that weaken resolve."
        });
      } else {
        insights.push({
          id: insights.length + 1,
          practical: `Your ${avgLength}-day cycles show strong discipline - focus on identifying what causes eventual breakdown.`,
          esoteric: `Your ${avgLength}-day cycles show mastery over lower impulses - examine what causes spiritual regression.`,
          actionable: wisdomMode ?
            "After 30+ days, examine subtle pride or spiritual bypassing that may be creating energetic imbalances." :
            "After 30+ days, examine overconfidence or external stressors that may be weakening your foundation."
        });
      }
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
      <div className="benefit-tracker-section">
        <h3>Benefit Tracker</h3>
        
        {isPremium ? (
          <>
            {/* REDESIGNED: 2-row pill layout */}
            <div className="benefit-tracker-controls">
              {/* ROW 1: All 6 benefit metrics */}
              <div className="benefit-metrics-container">
                <div className="benefit-metrics-pills">
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
                    className={`metric-pill ${selectedMetric === 'confidence' ? 'active' : ''}`}
                    onClick={() => setSelectedMetric('confidence')}
                  >
                    Confidence
                  </button>
                  <button 
                    className={`metric-pill ${selectedMetric === 'aura' ? 'active' : ''}`}
                    onClick={() => setSelectedMetric('aura')}
                  >
                    Aura
                  </button>
                  <button 
                    className={`metric-pill ${selectedMetric === 'sleep' ? 'active' : ''}`}
                    onClick={() => setSelectedMetric('sleep')}
                  >
                    Sleep
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
              
              <div className="personalized-analysis">
                <h5>Personalized Insights</h5>
                
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
                      <div className="insight-text">
                        {wisdomMode ? insight.esoteric : insight.practical}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            {/* REVERTED: Pattern Analysis Section */}
            <div className="pattern-analysis-section" ref={patternSectionRef}>
              <h3>Pattern Analysis</h3>
              
              <div className="pattern-insights">
                {generatePatternInsights().map(pattern => (
                  <div key={pattern.id} className="pattern-insight-item">
                    <div className="pattern-text">
                      {wisdomMode ? pattern.esoteric : pattern.practical}
                    </div>
                    <div className="pattern-actionable">
                      {pattern.actionable}
                    </div>
                  </div>
                ))}
                
                {generatePatternInsights().length === 0 && (
                  <div className="no-patterns">
                    <FaInfoCircle />
                    <span>Continue tracking to identify patterns in your journey</span>
                  </div>
                )}
              </div>
            </div>
            
            {/* NEW: Floating Wisdom Toggle - Only visible when scrolled to insights */}
            {showFloatingToggle && (
              <div 
                className={`floating-wisdom-toggle ${wisdomMode ? 'active' : ''}`}
                onClick={() => setWisdomMode(!wisdomMode)}
                title={wisdomMode ? "Switch to Practical View" : "Switch to Esoteric View"}
              >
                <FaEye className={`floating-wisdom-eye ${wisdomMode ? 'active' : ''}`} />
              </div>
            )}
          </>
        ) : (
          /* FREE USER: Progressive premium lock with early teaser */
          <div className="free-benefit-preview">
            {/* FREE: Benefit metrics selector (same as premium) */}
            <div className="benefit-tracker-controls">
              <div className="benefit-metrics-container">
                <div className="benefit-metrics-pills">
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
                    className={`metric-pill ${selectedMetric === 'confidence' ? 'active' : ''}`}
                    onClick={() => setSelectedMetric('confidence')}
                  >
                    Confidence
                  </button>
                  <button 
                    className={`metric-pill ${selectedMetric === 'aura' ? 'active' : ''}`}
                    onClick={() => setSelectedMetric('aura')}
                  >
                    Aura
                  </button>
                  <button 
                    className={`metric-pill ${selectedMetric === 'sleep' ? 'active' : ''}`}
                    onClick={() => setSelectedMetric('sleep')}
                  >
                    Sleep
                  </button>
                  <button 
                    className={`metric-pill ${selectedMetric === 'workout' ? 'active' : ''}`}
                    onClick={() => setSelectedMetric('workout')}
                  >
                    Workout
                  </button>
                </div>
              </div>
            </div>
            
            {/* FREE: Average display */}
            <div className="free-average-display">
              <div className="current-metric-average">
                <div className="current-metric-label">Average <span className="metric-highlight">{selectedMetric}</span></div>
                <div className="current-metric-value">{calculateAverage()}/10</div>
              </div>
            </div>
            
            {/* FREE: Single insight preview */}
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
            
            {/* NEW: Benefit Upgrade CTA - Matching Timeline design */}
            <div className="benefit-upgrade-cta">
              <img 
                src={helmetImage} 
                alt="Upgrade" 
                className="upgrade-helmet-icon"
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.nextElementSibling.style.display = 'flex';
                }}
              />
              <div className="upgrade-helmet-fallback" style={{ display: 'none' }}>
                ⚔️
              </div>
              
              <div className="upgrade-text-section">
                <h4>Unlock Full Benefit Analytics</h4>
                <p>Get detailed charts, streak comparisons, personalized insights, and pattern analysis to optimize your journey.</p>
                <button className="benefit-upgrade-btn" onClick={handleUpgradeClick}>
                  <FaStar />
                  Upgrade Now
                </button>
              </div>
            </div>
          </div>
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

      {/* Reset Confirmation Modal */}
      {showResetConfirm && (
        <div className="modal-overlay" onClick={() => setShowResetConfirm(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3>Reset All Stats</h3>
            <p>Are you sure you want to reset all your statistics?</p>
            <p><strong>This action cannot be undone.</strong> All data including:</p>
            <ul>
              <li>Current and longest streaks</li>
              <li>Wet dream and relapse counts</li>
              <li>All earned badges</li>
              <li>Benefit tracking data</li>
              <li>Streak history</li>
            </ul>
            <p>will be permanently deleted.</p>
            
            <div className="modal-actions">
              <button className="btn btn-danger" onClick={confirmResetStats}>
                <FaRedo />
                Yes, Reset Everything
              </button>
              <button className="btn btn-outline" onClick={() => setShowResetConfirm(false)}>
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