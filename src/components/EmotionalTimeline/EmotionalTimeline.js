// components/EmotionalTimeline/EmotionalTimeline.js - UPDATED: Horizontal mastery levels, modern icons
import React, { useState, useEffect, useRef } from 'react';
import { format, differenceInDays, subDays } from 'date-fns';
import toast from 'react-hot-toast';
import './EmotionalTimeline.css';

// Icons - UPDATED: Removed FaBullseye and FaArrowUp (no longer needed)
import { FaMapSigns, FaLightbulb, FaHeart, FaBrain, FaLeaf, FaTrophy, 
  FaCheckCircle, FaLock, FaPen, FaInfoCircle, FaExclamationTriangle, 
  FaRegLightbulb, FaEye, FaTimes, FaStar, FaChartLine } from 'react-icons/fa';

// Import helmet image to match Tracker design
import helmetImage from '../../assets/helmet.png';

const EmotionalTimeline = ({ userData, isPremium, updateUserData }) => {
  const [showJournalModal, setShowJournalModal] = useState(false);
  const [currentNote, setCurrentNote] = useState('');
  const [wisdomMode, setWisdomMode] = useState(false);
  const [selectedPhase, setSelectedPhase] = useState(null);
  const [showPhaseDetail, setShowPhaseDetail] = useState(false);
  
  // NEW: Floating toggle visibility state
  const [showFloatingToggle, setShowFloatingToggle] = useState(false);
  
  // NEW: Refs for scroll detection - matching Stats exactly
  const timelineStartRef = useRef(null); // Timeline overview section start
  const insightSectionRef = useRef(null); // Phase insight section
  
  // Enhanced emotional tracking states
  const [todayEmotions, setTodayEmotions] = useState({
    anxiety: 5,
    moodStability: 5,
    mentalClarity: 5,
    emotionalProcessing: 5
  });
  const [emotionsLogged, setEmotionsLogged] = useState(false);

  // FIXED: Use current streak instead of calculated day difference
  const currentDay = userData.currentStreak || 0;

  // NEW: Always show floating toggle - no scroll detection needed
  useEffect(() => {
    // Always show the toggle
    setShowFloatingToggle(true);
  }, []);

  // UPDATED: Mastery levels with month/year ranges and cleaner structure
  const masteryLevels = [
    { 
      id: 1, 
      level: "I",
      name: "Master", 
      subtitle: "Foundation of Self-Control",
      timeRange: "Months 6-12", 
      startDay: 181, 
      endDay: 365
    },
    { 
      id: 2, 
      level: "II",
      name: "Sage", 
      subtitle: "Wisdom Through Experience",
      timeRange: "Year 1-2", 
      startDay: 366, 
      endDay: 730
    },
    { 
      id: 3, 
      level: "III",
      name: "Enlightened", 
      subtitle: "Higher Consciousness",
      timeRange: "Year 2-3", 
      startDay: 731, 
      endDay: 1095
    },
    { 
      id: 4, 
      level: "IV",
      name: "Transcendent", 
      subtitle: "Beyond Physical Desires",
      timeRange: "Year 3-4", 
      startDay: 1096, 
      endDay: 1460
    },
    { 
      id: 5, 
      level: "V",
      name: "Ascended Master", 
      subtitle: "Guide for Others",
      timeRange: "Year 4-5", 
      startDay: 1461, 
      endDay: 1825
    },
    { 
      id: 6, 
      level: "VI",
      name: "Divine Avatar", 
      subtitle: "Pure Consciousness",
      timeRange: "Year 5+", 
      startDay: 1826, 
      endDay: 999999
    }
  ];

  // UPDATED: Get current mastery level for advanced practitioners
  const getCurrentMasteryLevel = () => {
    if (currentDay < 181) return null;
    
    for (const level of masteryLevels) {
      if (currentDay >= level.startDay && currentDay <= level.endDay) {
        return level;
      }
    }
    
    // Fallback to highest level for extremely long streaks
    return masteryLevels[masteryLevels.length - 1];
  };

  // FIXED: Enhanced phase definitions with correct icon colors
  const emotionalPhases = [
    {
      id: 1,
      name: "Initial Adaptation",
      dayRange: "1-14",
      startDay: 1,
      endDay: 14,
      icon: FaLeaf,
      color: "#22c55e", // Green
      description: "Your body begins adapting to retention while initial urges peak",
      esotericDescription: "The vital force begins redirecting from lower centers to higher consciousness",
      commonExperiences: [
        "Strong physical urges",
        "Excitement and motivation", 
        "Restlessness",
        "Increased energy"
      ],
      esotericExperiences: [
        "Life force awakening",
        "Spiritual excitement",
        "Energy seeking new pathways",
        "Kundalini stirring"
      ],
      copingStrategies: [
        "Cold showers daily",
        "Intense physical exercise",
        "Stay extremely busy",
        "Use urge management tools"
      ],
      esotericStrategies: [
        "Channel energy through breathwork",
        "Practice energy circulation",
        "Ground excess energy in nature",
        "Invoke protective mantras"
      ],
      insights: {
        practical: "This phase is about building new neural pathways. Your brain is rewiring itself away from instant gratification.",
        esoteric: "You're breaking free from millennia of unconscious patterns. The life force is remembering its divine purpose."
      }
    },
    {
      id: 2,
      name: "Emotional Purging",
      dayRange: "15-45",
      startDay: 15,
      endDay: 45,
      icon: FaHeart,
      color: "#f59e0b", // Orange/Yellow
      description: "Suppressed emotions surface for healing - this is the most challenging phase",
      esotericDescription: "The heart chakra opens, releasing stored emotional trauma for spiritual purification",
      commonExperiences: [
        "Intense mood swings",
        "Anxiety and depression waves",
        "Old memories surfacing",
        "Feeling emotionally raw",
        "Crying episodes",
        "Anger flashes"
      ],
      esotericExperiences: [
        "Karmic memories awakening",
        "Past life emotional releases",
        "Shadow integration process",
        "Heart chakra purification",
        "Emotional body cleansing",
        "Soul fragments returning"
      ],
      copingStrategies: [
        "Journal extensively",
        "Accept emotions without resistance", 
        "Therapy or counseling",
        "Meditation and mindfulness",
        "Gentle exercise",
        "Reach out to support systems"
      ],
      esotericStrategies: [
        "Practice emotional alchemy",
        "Use crystal healing for heart chakra",
        "Perform ritual cleansing",
        "Connect with your higher self",
        "Channel emotions into creative work",
        "Seek guidance from spiritual teachers"
      ],
      insights: {
        practical: "This emotional turbulence is your psyche healing itself. Suppressed feelings are finally being processed and released.",
        esoteric: "You're undergoing a sacred initiation - the dissolution of the ego's emotional armor to reveal your authentic self."
      }
    },
    {
      id: 3,
      name: "Mental Expansion", 
      dayRange: "46-90",
      startDay: 46,
      endDay: 90,
      icon: FaBrain,
      color: "#3b82f6", // Blue
      description: "Cognitive abilities enhance as emotional turbulence stabilizes",
      esotericDescription: "The third eye awakens as mental faculties expand beyond ordinary consciousness",
      commonExperiences: [
        "Improved focus and concentration",
        "Enhanced creativity",
        "Clearer decision making",
        "Better memory",
        "Increased motivation",
        "Emotional stability returning"
      ],
      esotericExperiences: [
        "Third eye activation",
        "Psychic abilities emerging",
        "Intuitive downloads increasing",
        "Connection to universal mind",
        "Prophetic dreams",
        "Telepathic sensitivity"
      ],
      copingStrategies: [
        "Pursue challenging mental tasks",
        "Learn new skills",
        "Set ambitious goals",
        "Practice problem-solving",
        "Engage in creative projects",
        "Read complex material"
      ],
      esotericStrategies: [
        "Practice meditation on third eye",
        "Study sacred geometry",
        "Explore consciousness expansion",
        "Connect with higher dimensions",
        "Channel creative inspiration",
        "Practice lucid dreaming"
      ],
      insights: {
        practical: "Your brain is operating at higher efficiency due to increased neuroplasticity and optimized neurotransmitter balance.",
        esoteric: "The retained life force is now powering higher mental faculties, connecting you to the universal field of consciousness."
      }
    },
    {
      id: 4,
      name: "Spiritual Integration",
      dayRange: "91-180",
      startDay: 91,
      endDay: 180,
      icon: FaLightbulb,
      color: "#8b5cf6", // Purple
      description: "Profound inner transformation as benefits become deeply integrated",
      esotericDescription: "Soul integration as the divine masculine energy fully awakens within",
      commonExperiences: [
        "Deep sense of purpose",
        "Magnetic personal presence",
        "Effortless discipline",
        "Compassionate wisdom",
        "Natural leadership qualities",
        "Inner peace and confidence"
      ],
      esotericExperiences: [
        "Divine masculine embodiment",
        "Christ consciousness activation",
        "Merkaba energy body activation",
        "Cosmic consciousness glimpses",
        "Service to humanity calling",
        "Unity consciousness experiences"
      ],
      copingStrategies: [
        "Share wisdom with others",
        "Take on leadership roles",
        "Pursue meaningful work",
        "Build deep relationships",
        "Practice gratitude daily",
        "Maintain humble confidence"
      ],
      esotericStrategies: [
        "Practice service to others",
        "Teach what you've learned",
        "Connect with spiritual community",
        "Study advanced metaphysics",
        "Practice energy healing",
        "Prepare for ascension"
      ],
      insights: {
        practical: "You've achieved what few people ever do - complete mastery over one of humanity's strongest drives. This discipline transfers to all areas of life.",
        esoteric: "You've successfully transmuted the base life force into spiritual gold. You now carry the refined energy of the awakened masculine."
      }
    },
    {
      id: 5,
      name: "Mastery & Service",
      dayRange: "181+",
      startDay: 181,
      endDay: 999999, // UPDATED: Very high number for mastery system
      icon: FaTrophy,
      color: "#ffdd00", // Gold/Yellow
      description: "Complete integration - you've transcended the need for external validation",
      esotericDescription: "Bodhisattva consciousness - enlightened being choosing to serve others",
      commonExperiences: [
        "Effortless self-control",
        "Natural charisma and influence",
        "Deep emotional intelligence",
        "Visionary thinking",
        "Inspirational presence",
        "Wisdom beyond your years"
      ],
      esotericExperiences: [
        "Avatar consciousness",
        "Direct divine communication",
        "Healing abilities manifesting",
        "Timeline manipulation awareness",
        "Multidimensional perception",
        "Cosmic mission clarity"
      ],
      copingStrategies: [
        "Mentor others on the path",
        "Create lasting positive impact",
        "Build your legacy",
        "Maintain beginner's mind",
        "Practice radical compassion",
        "Stay grounded in humility"
      ],
      esotericStrategies: [
        "Anchor higher frequencies on Earth",
        "Assist in planetary awakening",
        "Bridge heaven and earth",
        "Embody divine will",
        "Transmit light to others",
        "Prepare for cosmic service"
      ],
      insights: {
        practical: "You've become a living example of human potential. Your presence alone inspires others to pursue their highest path.",
        esoteric: "You are now a conscious co-creator with the divine, wielding the full power of transmuted sexual energy for cosmic purposes."
      }
    }
  ];

  // FIXED: Get current phase based on current streak (not calculated days)
  const getCurrentPhase = () => {
    if (currentDay <= 0) return null;
    
    // Find the phase that contains the current day
    for (const phase of emotionalPhases) {
      if (currentDay >= phase.startDay && (phase.endDay === 999999 || currentDay <= phase.endDay)) {
        return phase;
      }
    }
    
    // Fallback to first phase if something goes wrong
    return emotionalPhases[0];
  };

  const currentPhase = getCurrentPhase();

  // NEW: Dynamic insight generation based on emotional tracking data
  const generateDynamicPhaseInsight = () => {
    if (!currentPhase || !isPremium) return null;

    const emotionalData = userData.emotionalTracking || [];
    const recentData = emotionalData.filter(entry => 
      differenceInDays(new Date(), new Date(entry.date)) <= 14
    );

    // Check data sufficiency
    const hasMinimalData = recentData.length >= 3;
    const hasGoodData = recentData.length >= 7;
    const hasRichData = recentData.length >= 14;

    // Base insight if no data
    if (!hasMinimalData) {
      return {
        type: 'encouragement',
        practical: `You're on day ${currentDay} of the ${currentPhase.name} phase. Track your emotions daily to unlock personalized insights about your unique journey through this phase.`,
        esoteric: `Day ${currentDay} brings you deeper into the ${currentPhase.name} initiation. Record your emotional states to receive guidance tailored to your spiritual progression.`,
        dataStatus: 'insufficient'
      };
    }

    // Calculate trends and patterns
    const avgAnxiety = recentData.reduce((sum, entry) => sum + (entry.anxiety || 5), 0) / recentData.length;
    const avgMoodStability = recentData.reduce((sum, entry) => sum + (entry.moodStability || 5), 0) / recentData.length;
    const avgMentalClarity = recentData.reduce((sum, entry) => sum + (entry.mentalClarity || 5), 0) / recentData.length;
    const avgEmotionalProcessing = recentData.reduce((sum, entry) => sum + (entry.emotionalProcessing || 5), 0) / recentData.length;

    // Calculate trends (if we have enough data)
    let anxietyTrend = 'stable';
    let moodTrend = 'stable';
    let clarityTrend = 'stable';
    let processingTrend = 'stable';

    if (hasGoodData) {
      const recent = recentData.slice(-3);
      const earlier = recentData.slice(0, 3);
      
      const recentAvgAnxiety = recent.reduce((sum, entry) => sum + (entry.anxiety || 5), 0) / recent.length;
      const earlierAvgAnxiety = earlier.reduce((sum, entry) => sum + (entry.anxiety || 5), 0) / earlier.length;
      
      const recentAvgMood = recent.reduce((sum, entry) => sum + (entry.moodStability || 5), 0) / recent.length;
      const earlierAvgMood = earlier.reduce((sum, entry) => sum + (entry.moodStability || 5), 0) / earlier.length;
      
      const recentAvgClarity = recent.reduce((sum, entry) => sum + (entry.mentalClarity || 5), 0) / recent.length;
      const earlierAvgClarity = earlier.reduce((sum, entry) => sum + (entry.mentalClarity || 5), 0) / earlier.length;
      
      const recentAvgProcessing = recent.reduce((sum, entry) => sum + (entry.emotionalProcessing || 5), 0) / recent.length;
      const earlierAvgProcessing = earlier.reduce((sum, entry) => sum + (entry.emotionalProcessing || 5), 0) / earlier.length;

      anxietyTrend = recentAvgAnxiety < earlierAvgAnxiety - 0.5 ? 'improving' : 
                     recentAvgAnxiety > earlierAvgAnxiety + 0.5 ? 'challenging' : 'stable';
      moodTrend = recentAvgMood > earlierAvgMood + 0.5 ? 'improving' : 
                  recentAvgMood < earlierAvgMood - 0.5 ? 'challenging' : 'stable';
      clarityTrend = recentAvgClarity > earlierAvgClarity + 0.5 ? 'improving' : 
                     recentAvgClarity < earlierAvgClarity - 0.5 ? 'challenging' : 'stable';
      processingTrend = recentAvgProcessing > earlierAvgProcessing + 0.5 ? 'improving' : 
                        recentAvgProcessing < earlierAvgProcessing - 0.5 ? 'challenging' : 'stable';
    }

    // Phase-specific insights with data analysis
    const phaseInsights = {
      1: { // Initial Adaptation
        practical: () => {
          if (avgAnxiety > 7) {
            return `Day ${currentDay}: Your anxiety levels (${avgAnxiety.toFixed(1)}/10) are higher than typical for this phase. This intense energy needs physical outlets - increase exercise and cold exposure.`;
          } else if (avgAnxiety < 4) {
            return `Day ${currentDay}: Your anxiety levels (${avgAnxiety.toFixed(1)}/10) are surprisingly low for the Initial Adaptation phase. You're handling the transition exceptionally well.`;
          }
          return `Day ${currentDay}: Your emotional data shows typical Initial Adaptation patterns. Anxiety at ${avgAnxiety.toFixed(1)}/10 is normal as your body learns new energy patterns.`;
        },
        esoteric: () => {
          if (avgEmotionalProcessing > 7) {
            return `Day ${currentDay}: Your emotional processing (${avgEmotionalProcessing.toFixed(1)}/10) shows the life force is flowing freely. You're integrating this sacred energy beautifully.`;
          }
          return `Day ${currentDay}: The vital force awakening shows in your emotional data. Processing at ${avgEmotionalProcessing.toFixed(1)}/10 indicates your energy body is adapting to higher frequencies.`;
        }
      },
      2: { // Emotional Purging
        practical: () => {
          if (moodTrend === 'challenging' && avgMoodStability < 4) {
            return `Day ${currentDay}: Your mood stability (${avgMoodStability.toFixed(1)}/10) and recent trends confirm you're in deep purging. This emotional volatility is necessary healing - maintain your practices.`;
          } else if (moodTrend === 'improving') {
            return `Day ${currentDay}: Your mood stability is improving (${avgMoodStability.toFixed(1)}/10 trending up). You're successfully processing and releasing stored emotional content.`;
          }
          return `Day ${currentDay}: Emotional Purging phase data shows mood stability at ${avgMoodStability.toFixed(1)}/10. The turbulence is your psyche healing itself.`;
        },
        esoteric: () => {
          if (avgEmotionalProcessing > 6 && processingTrend === 'improving') {
            return `Day ${currentDay}: Your emotional processing (${avgEmotionalProcessing.toFixed(1)}/10, trending up) shows the heart chakra opening beautifully. Ancient karma is being transmuted.`;
          }
          return `Day ${currentDay}: The sacred purging process shows in your data. Emotional processing at ${avgEmotionalProcessing.toFixed(1)}/10 indicates old patterns dissolving to reveal your authentic self.`;
        }
      },
      3: { // Mental Expansion
        practical: () => {
          if (clarityTrend === 'improving' && avgMentalClarity > 7) {
            return `Day ${currentDay}: Your mental clarity (${avgMentalClarity.toFixed(1)}/10, trending up) confirms you're entering enhanced cognitive function. Channel this into ambitious goals.`;
          } else if (avgMentalClarity < 5) {
            return `Day ${currentDay}: Mental clarity at ${avgMentalClarity.toFixed(1)}/10 suggests you may still be processing emotions. The cognitive benefits will emerge as emotional stability increases.`;
          }
          return `Day ${currentDay}: Mental Expansion phase data shows clarity at ${avgMentalClarity.toFixed(1)}/10. Your brain is optimizing neurotransmitter balance.`;
        },
        esoteric: () => {
          if (avgMentalClarity > 8) {
            return `Day ${currentDay}: Mental clarity at ${avgMentalClarity.toFixed(1)}/10 indicates third eye activation. The retained life force is powering higher mental faculties.`;
          }
          return `Day ${currentDay}: Your consciousness is expanding beyond ordinary perception. Clarity at ${avgMentalClarity.toFixed(1)}/10 shows connection to universal mind strengthening.`;
        }
      },
      4: { // Spiritual Integration
        practical: () => {
          const overallWellbeing = (avgMoodStability + avgMentalClarity + avgEmotionalProcessing - avgAnxiety) / 3;
          if (overallWellbeing > 6) {
            return `Day ${currentDay}: Your emotional data shows deep integration (overall wellbeing: ${overallWellbeing.toFixed(1)}/10). You're embodying the discipline and wisdom of this phase.`;
          }
          return `Day ${currentDay}: Integration continues with overall wellbeing at ${overallWellbeing.toFixed(1)}/10. You're developing mastery over one of humanity's strongest drives.`;
        },
        esoteric: () => {
          const spiritualAlignment = (avgEmotionalProcessing + avgMentalClarity + avgMoodStability) / 3;
          return `Day ${currentDay}: Spiritual alignment at ${spiritualAlignment.toFixed(1)}/10 shows divine masculine energy awakening. You're transmuting base life force into spiritual gold.`;
        }
      },
      5: { // Mastery & Service
        practical: () => {
          const masteryLevel = (avgMoodStability + avgMentalClarity + avgEmotionalProcessing + (10 - avgAnxiety)) / 4;
          return `Day ${currentDay}: Your emotional mastery (${masteryLevel.toFixed(1)}/10) demonstrates complete integration. You've transcended the need for external validation and now inspire others.`;
        },
        esoteric: () => {
          return `Day ${currentDay}: Your consciousness operates at Avatar level. Emotional data shows you've merged individual awareness with universal consciousness, serving the evolution of all.`;
        }
      }
    };

    const insight = phaseInsights[currentPhase.id];
    if (!insight) return null;

    return {
      type: hasRichData ? 'advanced' : hasGoodData ? 'intermediate' : 'basic',
      practical: insight.practical(),
      esoteric: insight.esoteric(),
      dataStatus: hasRichData ? 'rich' : hasGoodData ? 'good' : 'minimal',
      trends: {
        anxiety: anxietyTrend,
        mood: moodTrend,
        clarity: clarityTrend,
        processing: processingTrend
      }
    };
  };

  // UPDATED: Calculate progress percentage with mastery level support
  const getPhaseProgress = (phase) => {
    if (!phase || currentDay <= 0) return 0;
    
    // UPDATED: Special handling for mastery phase (181+)
    if (phase.startDay === 181) {
      const masteryLevel = getCurrentMasteryLevel();
      if (!masteryLevel) return 0;
      
      // Calculate progress within current mastery level
      const daysIntoLevel = currentDay - masteryLevel.startDay;
      const totalDaysInLevel = masteryLevel.endDay === 999999 ? 
        365 : (masteryLevel.endDay - masteryLevel.startDay + 1); // 1 year for most levels
      
      const progress = (daysIntoLevel / totalDaysInLevel) * 100;
      return Math.min(100, Math.max(0, progress));
    }
    
    // CORRECTED: Calculate how far through the current phase
    const daysCompletedInPhase = currentDay - phase.startDay; // How many days completed (0-based from phase start)
    const totalDaysInPhase = phase.endDay - phase.startDay + 1; // Total days this phase spans
    const progress = (daysCompletedInPhase / totalDaysInPhase) * 100;
    
    return Math.min(100, Math.max(0, progress));
  };

  // UPDATED: Get progress text with mastery level support
  const getPhaseProgressText = (phase) => {
    if (!phase || currentDay <= 0) return "";
    
    // UPDATED: Special handling for mastery phase - show level progression
    if (phase.startDay === 181) {
      const masteryLevel = getCurrentMasteryLevel();
      if (!masteryLevel) return "";
      
      const daysIntoLevel = currentDay - masteryLevel.startDay;
      const currentDayInLevel = daysIntoLevel + 1; // 1-based current day in level
      
      if (masteryLevel.endDay === 999999) {
        // Divine Avatar level - eternal
        return `Level ${masteryLevel.level} ${masteryLevel.name} - Day ${currentDayInLevel} (Eternal Journey)`;
      } else {
        const totalDaysInLevel = masteryLevel.endDay - masteryLevel.startDay + 1;
        const daysRemainingInLevel = masteryLevel.endDay - currentDay;
        return `Level ${masteryLevel.level} ${masteryLevel.name} - Day ${currentDayInLevel} of ${totalDaysInLevel} (${daysRemainingInLevel} days to next level)`;
      }
    }
    
    // CORRECTED CALCULATION for regular phases:
    const daysCompletedInPhase = currentDay - phase.startDay; // 0-based completed days
    const currentDayInPhase = daysCompletedInPhase + 1; // 1-based current day in phase
    const totalDaysInPhase = phase.endDay - phase.startDay + 1; // Total phase length
    const daysRemainingInPhase = phase.endDay - currentDay; // Days left after today
    
    return `Day ${currentDayInPhase} of ${totalDaysInPhase} in this phase (${daysRemainingInPhase} remaining)`;
  };

  // Check if emotions are already logged for today
  useEffect(() => {
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const existingEmotions = userData.emotionalTracking?.find(
      emotion => format(new Date(emotion.date), 'yyyy-MM-dd') === todayStr
    );
    
    if (existingEmotions) {
      setTodayEmotions({
        anxiety: existingEmotions.anxiety || 5,
        moodStability: existingEmotions.moodStability || 5,
        mentalClarity: existingEmotions.mentalClarity || 5,
        emotionalProcessing: existingEmotions.emotionalProcessing || 5
      });
      setEmotionsLogged(true);
    }
  }, [userData.emotionalTracking]);

  // Handle emotional tracking
  const handleEmotionChange = (type, value) => {
    if (!isPremium) return; // Prevent changes if not premium
    setTodayEmotions(prev => ({
      ...prev,
      [type]: value
    }));
  };

  const saveEmotions = () => {
    if (!isPremium) {
      handleUpgradeClick();
      return;
    }
    
    const today = new Date();
    const todayStr = format(today, 'yyyy-MM-dd');
    
    // Remove existing entry for today if it exists
    const updatedEmotionalTracking = (userData.emotionalTracking || []).filter(
      emotion => format(new Date(emotion.date), 'yyyy-MM-dd') !== todayStr
    );
    
    // Add new entry
    updatedEmotionalTracking.push({
      date: today,
      day: currentDay,
      phase: currentPhase?.id || 1,
      ...todayEmotions
    });
    
    // Sort by date
    updatedEmotionalTracking.sort((a, b) => new Date(a.date) - new Date(b.date));
    
    updateUserData({ emotionalTracking: updatedEmotionalTracking });
    setEmotionsLogged(true);
    toast.success('Emotional check-in saved!');
  };

  const enableEmotionEditing = () => {
    if (!isPremium) {
      handleUpgradeClick();
      return;
    }
    setEmotionsLogged(false);
  };

  // Handle journal modal
  const handleJournalPrompt = () => {
    if (!isPremium) {
      handleUpgradeClick();
      return;
    }
    
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const existingNote = userData.notes && userData.notes[todayStr];
    
    setCurrentNote(existingNote || '');
    setShowJournalModal(true);
  };

  const saveNote = () => {
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const updatedNotes = { ...userData.notes, [todayStr]: currentNote };
    
    updateUserData({ notes: updatedNotes });
    setShowJournalModal(false);
    toast.success('Journal entry saved!');
  };

  // Get phase-specific journal prompt
  const getPhaseJournalPrompt = () => {
    if (!currentPhase) return "How are you feeling about your journey today?";
    
    const prompts = {
      1: "What urges are you experiencing? How are you channeling this new energy?",
      2: "What emotions or memories are surfacing? Remember, this purging is part of healing.",
      3: "How has your mental clarity improved? What new insights are you gaining?", 
      4: "What deeper purpose is emerging in your life? How do you want to serve others?",
      5: "How are you using your mastery to inspire and help others on their journey?"
    };
    
    return prompts[currentPhase.id] || prompts[1];
  };

  // Handle phase detail modal
  const showPhaseDetails = (phase) => {
    if (!isPremium) {
      handleUpgradeClick();
      return;
    }
    setSelectedPhase(phase);
    setShowPhaseDetail(true);
  };

  // ADDED: Premium upgrade handler
  const handleUpgradeClick = () => {
    toast.success('Premium upgrade coming soon! 🚀');
  };

  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const todayNote = userData.notes && userData.notes[todayStr];

  return (
    <div className="emotional-timeline-container">
      {/* NEW: Smart Floating Wisdom Toggle - Always visible */}
      {showFloatingToggle && (
        <button 
          className={`floating-wisdom-toggle ${wisdomMode ? 'active' : ''}`}
          onClick={() => setWisdomMode(!wisdomMode)}
          title={wisdomMode ? "Switch to Practical View" : "Switch to Esoteric View"}
        >
          <FaEye className={`floating-wisdom-eye ${wisdomMode ? 'active' : ''}`} />
        </button>
      )}

      {/* Header - REMOVED old wisdom toggle */}
      <div className="timeline-header">
        <div className="timeline-header-spacer"></div>
        <h2>Emotional Timeline</h2>
        <div className="timeline-header-actions">
          {/* Empty for now - can be used for future actions */}
        </div>
      </div>

      {/* UPDATED: Timeline Content Container with Hard Premium Cutoff */}
      <div className="timeline-content-container">
        {/* Current Phase Display - ALWAYS VISIBLE */}
        {currentPhase && currentDay > 0 && (
          <div className="current-phase-container">
            <div className="phase-card current">
              <div className="phase-date">Day {currentDay} of your journey</div>
              
              <div className="phase-icon-section">
                <div className="phase-icon" style={{ color: currentPhase.color }}>
                  <currentPhase.icon />
                </div>
                <div className="phase-info">
                  <div className="phase-name">{currentPhase.name}</div>
                  <div className="phase-range">Days {currentPhase.dayRange}</div>
                </div>
              </div>
              
              <div className="phase-description">
                {wisdomMode ? currentPhase.esotericDescription : currentPhase.description}
              </div>

              {/* Progress bar using CSS custom properties */}
              <div className="phase-progress">
                <div 
                  className="progress-bar"
                  style={{
                    '--phase-color': currentPhase.color
                  }}
                >
                  <div 
                    className="progress-fill progress-fill-colored"
                    style={{ 
                      width: `${getPhaseProgress(currentPhase)}%`
                    }}
                  ></div>
                </div>
                <div className="progress-text">
                  {getPhaseProgressText(currentPhase)}
                </div>
              </div>

              <button 
                className="phase-detail-btn"
                onClick={() => showPhaseDetails(currentPhase)}
                disabled={!isPremium}
              >
                <FaInfoCircle />
                {isPremium ? 'View Phase Details' : 'Premium Feature'}
              </button>
            </div>
          </div>
        )}

        {/* PREMIUM CUTOFF: Free users see nothing beyond this point */}
        {!isPremium ? (
          // HARD STOP: Only show the premium upgrade for free users
          <div className="early-premium-teaser">
            <div className="early-teaser-content">
              <img 
                src={helmetImage} 
                alt="Premium" 
                className="early-teaser-helmet"
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.nextElementSibling.style.display = 'block';
                }}
              />
              <FaLock 
                className="early-teaser-helmet-fallback" 
                style={{ display: 'none' }}
              />
              <div className="early-teaser-text">
                <h3>Unlock Full Emotional Timeline</h3>
                <p>Get complete phase insights, emotional tracking, journaling, and esoteric wisdom</p>
                <button className="early-teaser-upgrade-btn" onClick={handleUpgradeClick}>
                  <FaStar />
                  Upgrade to Premium
                </button>
              </div>
            </div>
          </div>
        ) : (
          // PREMIUM FEATURES SECTION - Only visible to premium users
          <div className="premium-features-section">
            {/* Timeline Overview - REF: timelineStartRef for scroll detection */}
            <div className="timeline-overview" ref={timelineStartRef}>
              <h3>Complete Journey Map</h3>
              <div className="phases-timeline">
                {emotionalPhases.map((phase, index) => {
                  const isCompleted = currentDay > phase.endDay && phase.endDay !== 999999;
                  const isCurrent = currentPhase?.id === phase.id;
                  const isUpcoming = currentDay < phase.startDay;
                  
                  return (
                    <div 
                      key={phase.id} 
                      className={`timeline-phase ${isCompleted ? 'completed' : ''} ${isCurrent ? 'current' : ''} ${isUpcoming ? 'upcoming' : ''}`}
                      onClick={() => isPremium && showPhaseDetails(phase)}
                      style={{ 
                        cursor: isPremium ? 'pointer' : 'default'
                      }}
                    >
                      <div className="timeline-phase-icon">
                        <phase.icon style={{ color: phase.color }} />
                      </div>
                      <div className="timeline-phase-info">
                        <div className="timeline-phase-name">{phase.name}</div>
                        <div className="timeline-phase-range">Days {phase.dayRange}</div>
                      </div>
                      {isPremium ? (
                        <>
                          {isCompleted && (
                            <div className="timeline-phase-check">
                              <FaCheckCircle style={{ color: "#22c55e" }} />
                            </div>
                          )}
                          {isCurrent && (
                            <div className="timeline-phase-current">
                              Current
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="timeline-phase-lock">
                          <FaLock />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* UPDATED: Mastery Levels Display - HORIZONTAL LAYOUT like timeline phases */}
              {currentDay >= 181 && (
                <div className="mastery-levels-section">
                  <h3>Mastery Levels (Days 181+)</h3>
                  <div className="mastery-levels-timeline">
                    {masteryLevels.map((level, index) => {
                      const isCompleted = currentDay > level.endDay && level.endDay !== 999999;
                      const isCurrent = getCurrentMasteryLevel()?.id === level.id;
                      const isUpcoming = currentDay < level.startDay;
                      
                      return (
                        <div 
                          key={level.id}
                          className={`mastery-level-card ${isCompleted ? 'completed' : ''} ${isCurrent ? 'current' : ''} ${isUpcoming ? 'upcoming' : ''}`}
                        >
                          {/* UPDATED: Mastery level icon - consistent with timeline phases */}
                          <div className="mastery-level-icon">
                            <FaTrophy />
                          </div>
                          
                          {/* UPDATED: Mastery level info - cleaner time range display */}
                          <div className="mastery-level-info">
                            <div className="mastery-level-name">Level {level.level}: {level.name}</div>
                            <div className="mastery-level-subtitle">{level.subtitle}</div>
                          </div>
                          
                          {/* UPDATED: Simple time range - no icons */}
                          <div className="mastery-level-details">
                            <div className="mastery-level-range">
                              {level.timeRange}
                            </div>
                          </div>
                          
                          {/* UPDATED: Progress bar for current mastery level */}
                          {isPremium && isCurrent && (
                            <div className="mastery-level-progress">
                              <div 
                                className="mastery-progress-fill"
                                style={{ width: `${getPhaseProgress(currentPhase)}%` }}
                              ></div>
                            </div>
                          )}
                          
                          {/* UPDATED: Status indicators - same positioning as timeline phases */}
                          <div className="mastery-level-status">
                            {isPremium ? (
                              <>
                                {isCompleted && (
                                  <div className="mastery-level-check">
                                    <FaCheckCircle />
                                  </div>
                                )}
                                {isCurrent && (
                                  <div className="mastery-level-current-badge">
                                    Current Level
                                  </div>
                                )}
                              </>
                            ) : (
                              <div className="mastery-level-lock">
                                <FaLock />
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Daily Emotional Check-in */}
            <div className="emotional-checkin-section">
              <h3>Daily Emotional Check-in</h3>
              
              <div className="emotion-status-section">
                {emotionsLogged ? (
                  <div className="emotions-logged">
                    <FaCheckCircle className="check-icon" />
                    <span>Emotional check-in completed for today!</span>
                    {isPremium && (
                      <button 
                        className="action-btn edit-emotions-btn"
                        onClick={enableEmotionEditing}
                      >
                        <FaPen />
                        <span>Edit</span>
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="emotions-not-logged">
                    <FaInfoCircle className="info-icon" />
                    <span>Track your emotional state to better understand your phase progression</span>
                  </div>
                )}
              </div>

              {/* Emotion sliders */}
              <div className="emotion-sliders">
                {[
                  { key: 'anxiety', label: 'Anxiety Level', value: todayEmotions.anxiety, lowLabel: 'Calm', highLabel: 'High Anxiety' },
                  { key: 'moodStability', label: 'Mood Stability', value: todayEmotions.moodStability, lowLabel: 'Mood Swings', highLabel: 'Very Stable' },
                  { key: 'mentalClarity', label: 'Mental Clarity', value: todayEmotions.mentalClarity, lowLabel: 'Foggy', highLabel: 'Crystal Clear' },
                  { key: 'emotionalProcessing', label: 'Emotional Processing', value: todayEmotions.emotionalProcessing, lowLabel: 'Suppressed', highLabel: 'Flowing' }
                ].map((emotion) => (
                  <div key={emotion.key} className="emotion-slider-item">
                    <div className="emotion-slider-header">
                      <span className="emotion-label">{emotion.label}</span>
                      <span className="emotion-value">{emotion.value}/10</span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="10"
                      value={emotion.value}
                      onChange={(e) => isPremium && handleEmotionChange(emotion.key, parseInt(e.target.value))}
                      className="emotion-range-slider"
                      disabled={emotionsLogged || !isPremium}
                    />
                    <div className="slider-labels">
                      <span>{emotion.lowLabel}</span>
                      <span>{emotion.highLabel}</span>
                    </div>
                  </div>
                ))}
              </div>

              {!emotionsLogged && (
                <div className="emotion-actions">
                  {isPremium ? (
                    <button 
                      className="action-btn save-emotions-btn"
                      onClick={saveEmotions}
                    >
                      <FaCheckCircle />
                      <span>Save Emotional Check-in</span>
                    </button>
                  ) : (
                    <button 
                      className="action-btn upgrade-emotions-btn"
                      onClick={handleUpgradeClick}
                    >
                      <FaStar />
                      <span>Unlock Emotional Tracking</span>
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Journal Section */}
            <div className="timeline-journal-section">
              <div className="journal-header">
                <div className="journal-header-spacer"></div>
                <h3>Phase-Specific Journal</h3>
                <div className="journal-actions">
                  <button 
                    className="action-btn"
                    onClick={handleJournalPrompt}
                    disabled={!isPremium}
                  >
                    <FaPen />
                    <span>{isPremium ? (todayNote ? 'Edit Entry' : 'Add Entry') : 'Premium Feature'}</span>
                  </button>
                </div>
              </div>

              <div className="journal-prompt">
                <FaRegLightbulb className="prompt-icon" />
                <p>{getPhaseJournalPrompt()}</p>
              </div>

              {isPremium ? (
                <>
                  {todayNote ? (
                    <div className="journal-preview">
                      <p>"{todayNote.length > 150 ? `${todayNote.substring(0, 150)}...` : todayNote}"</p>
                    </div>
                  ) : (
                    <div className="empty-journal">
                      <FaInfoCircle className="info-icon" />
                      <p>No journal entry for today. Recording your emotional journey helps track progress through phases.</p>
                    </div>
                  )}
                </>
              ) : (
                <div className="journal-premium-teaser">
                  <FaLock className="lock-icon" />
                  <p>Unlock phase-specific journal prompts and track your emotional journey through each phase with Premium.</p>
                </div>
              )}
            </div>

            {/* NEW: Dynamic Current Phase Insight - STYLED LIKE STATS JOURNEY GUIDANCE - REF: insightSectionRef for scroll detection */}
            {currentPhase && (
              <div className="phase-insight-section" ref={insightSectionRef}>
                <h3>Understanding Your Current Phase</h3>
                
                {/* NEW: Data Quality Info Banner - MATCHING STATS with I icon */}
                {(() => {
                  const dynamicInsight = generateDynamicPhaseInsight();
                  const emotionalData = userData.emotionalTracking || [];
                  const recentData = emotionalData.filter(entry => 
                    differenceInDays(new Date(), new Date(entry.date)) <= 14
                  );
                  
                  return (
                    <>
                      {recentData.length < 7 && (
                        <div className="insight-data-banner">
                          <div className="insight-data-banner-content">
                            <FaInfoCircle className="insight-data-icon" />
                            <div className="insight-data-text">
                              <strong>Your insights improve with data:</strong> The more you complete your daily emotional check-ins, the more personalized and accurate these insights become. 
                              {recentData.length === 0 && " Start logging your emotions to unlock deeper pattern recognition."}
                              {recentData.length > 0 && recentData.length < 3 && ` You've logged ${recentData.length} day${recentData.length === 1 ? '' : 's'} - keep going to unlock trend analysis.`}
                              {recentData.length >= 3 && recentData.length < 7 && ` You've logged ${recentData.length} days - log 7+ days to unlock advanced pattern recognition.`}
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {isPremium ? (
                        <div className="insight-card dynamic-insight">
                          <div className="insight-header">
                            <span>
                              {dynamicInsight?.type === 'encouragement' && (wisdomMode ? 'Begin Your Insight Journey' : 'Start Tracking for Insights')}
                              {dynamicInsight?.type === 'basic' && (wisdomMode ? 'Early Spiritual Patterns' : 'Initial Data Patterns')}
                              {dynamicInsight?.type === 'intermediate' && (wisdomMode ? 'Emerging Consciousness Trends' : 'Pattern Recognition Active')}
                              {dynamicInsight?.type === 'advanced' && (wisdomMode ? 'Deep Soul Analytics' : 'Advanced Pattern Analysis')}
                            </span>
                          </div>
                          <div className="insight-text">
                            {dynamicInsight ? (wisdomMode ? dynamicInsight.esoteric : dynamicInsight.practical) : 
                             (wisdomMode ? currentPhase.insights.esoteric : currentPhase.insights.practical)}
                          </div>
                          
                          {/* Show data status for intermediate/advanced insights */}
                          {dynamicInsight && dynamicInsight.type !== 'encouragement' && (
                            <div className="insight-data-status">
                              <div className="data-status-indicator">
                                <span className={`data-quality ${dynamicInsight.dataStatus}`}>
                                  {dynamicInsight.dataStatus === 'minimal' && (
                                    <>
                                      <FaChartLine />
                                      Basic Analysis
                                    </>
                                  )}
                                  {dynamicInsight.dataStatus === 'good' && (
                                    <>
                                      <FaChartLine />
                                      Good Data Set
                                    </>
                                  )}
                                  {dynamicInsight.dataStatus === 'rich' && (
                                    <>
                                      <FaChartLine />
                                      Rich Analytics
                                    </>
                                  )}
                                </span>
                                <span className="data-days">
                                  Based on {userData.emotionalTracking?.filter(entry => 
                                    differenceInDays(new Date(), new Date(entry.date)) <= 14
                                  ).length || 0} days of tracking
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="insight-premium-teaser">
                          <FaLock className="lock-icon" />
                          <p>Get deep insights into your current phase with practical and spiritual perspectives.</p>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Phase Detail Modal */}
      {showPhaseDetail && selectedPhase && (
        <div className="modal-overlay" onClick={() => setShowPhaseDetail(false)}>
          <div className="modal-content phase-detail-modal" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowPhaseDetail(false)}>
              <FaTimes />
            </button>

            <div className="phase-modal-header">
              <div className="phase-modal-icon" style={{ color: selectedPhase.color }}>
                <selectedPhase.icon />
              </div>
              <div className="phase-modal-info">
                <h3>{selectedPhase.name}</h3>
                <div className="phase-modal-range">Days {selectedPhase.dayRange}</div>
              </div>
            </div>

            <div className="phase-modal-description">
              <p>{wisdomMode ? selectedPhase.esotericDescription : selectedPhase.description}</p>
            </div>

            <div className="phase-modal-section">
              <h4>Common Experiences</h4>
              <ul>
                {(wisdomMode ? selectedPhase.esotericExperiences : selectedPhase.commonExperiences).map((experience, index) => (
                  <li key={index}>{experience}</li>
                ))}
              </ul>
            </div>

            <div className="phase-modal-section">
              <h4>Coping Strategies</h4>
              <ul>
                {(wisdomMode ? selectedPhase.esotericStrategies : selectedPhase.copingStrategies).map((strategy, index) => (
                  <li key={index}>{strategy}</li>
                ))}
              </ul>
            </div>

            <div className="phase-modal-insight">
              <h4>{wisdomMode ? 'Spiritual Understanding' : 'Scientific Understanding'}</h4>
              <p>{wisdomMode ? selectedPhase.insights.esoteric : selectedPhase.insights.practical}</p>
            </div>
          </div>
        </div>
      )}

      {/* Journal Modal */}
      {showJournalModal && (
        <div className="modal-overlay" onClick={() => setShowJournalModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h2>Journal Entry - Day {currentDay}</h2>
            <div className="journal-modal-prompt">
              <FaRegLightbulb className="prompt-icon" />
              <p>{getPhaseJournalPrompt()}</p>
            </div>
            
            <div className="form-group">
              <textarea
                value={currentNote}
                onChange={(e) => setCurrentNote(e.target.value)}
                rows="6"
                placeholder="Describe your emotional state, any memories surfacing, or insights gained..."
              ></textarea>
            </div>
            
            <div className="form-actions">
              <button onClick={saveNote} className="action-btn primary-action">
                <FaCheckCircle />
                Save Entry
              </button>
              <button onClick={() => setShowJournalModal(false)} className="action-btn">
                <FaTimes />
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmotionalTimeline;