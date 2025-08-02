// components/EmotionalTimeline/EmotionalTimeline.js - WORLD-CLASS: Complete rebuild with comprehensive guide integration
import React, { useState, useEffect, useRef } from 'react';
import { format, differenceInDays, subDays } from 'date-fns';
import toast from 'react-hot-toast';
import './EmotionalTimeline.css';

// Icons
import { FaMapSigns, FaLightbulb, FaHeart, FaBrain, FaLeaf, FaTrophy, 
  FaCheckCircle, FaLock, FaPen, FaInfoCircle, FaExclamationTriangle, 
  FaRegLightbulb, FaEye, FaTimes, FaStar, FaChartLine, FaFire, FaSearch,
  FaShieldAlt, FaBolt, FaUserGraduate, FaFlask, FaAtom, FaStethoscope } from 'react-icons/fa';

// Import helmet image
import helmetImage from '../../assets/helmet.png';

const EmotionalTimeline = ({ userData, isPremium, updateUserData }) => {
  const [showJournalModal, setShowJournalModal] = useState(false);
  const [currentNote, setCurrentNote] = useState('');
  const [wisdomMode, setWisdomMode] = useState(false);
  const [selectedPhase, setSelectedPhase] = useState(null);
  const [showPhaseDetail, setShowPhaseDetail] = useState(false);
  const [showFloatingToggle, setShowFloatingToggle] = useState(false);
  
  // Enhanced emotional tracking states
  const [todayEmotions, setTodayEmotions] = useState({
    anxiety: 5,
    moodStability: 5,
    mentalClarity: 5,
    emotionalProcessing: 5
  });
  const [emotionsLogged, setEmotionsLogged] = useState(false);

  // Refs for scroll detection
  const timelineStartRef = useRef(null);
  const insightSectionRef = useRef(null);
  
  const currentDay = userData.currentStreak || 0;

  // Always show floating toggle
  useEffect(() => {
    setShowFloatingToggle(true);
  }, []);

  // WORLD-CLASS: Enhanced phase definitions with scientific backing from the guide
  const emotionalPhases = [
    {
      id: 1,
      name: "Initial Adaptation",
      dayRange: "1-14",
      startDay: 1,
      endDay: 14,
      icon: FaLeaf,
      color: "#22c55e",
      description: "Your body begins adapting to retention while initial urges peak",
      esotericDescription: "The vital force begins redirecting from lower centers to higher consciousness",
      scientificMechanism: "Cessation of regular ejaculation triggers hypothalamic-pituitary adjustments. Testosterone begins stabilizing while dopamine receptors start rebalancing from overstimulation.",
      expectedSymptoms: [
        "Strong physical urges and restlessness",
        "Energy fluctuations between high and fatigue", 
        "Sleep disruption as body adjusts",
        "Excitement and motivation bursts",
        "Appetite changes and food cravings shifts",
        "Mild anxiety about maintaining practice"
      ],
      warningSigns: [
        "Extreme mood swings beyond normal adaptation",
        "Complete inability to sleep for multiple nights", 
        "Severe anxiety or panic attacks",
        "Thoughts of self-harm or extreme despair"
      ],
      specificTechniques: [
        "Cold showers daily (2-5 minutes) to reset nervous system",
        "Intense physical exercise to channel excess energy",
        "Establish non-negotiable morning routine",
        "Remove all triggers from environment",
        "Practice 4-7-8 breathing during urges"
      ],
      insights: {
        practical: "This phase builds new neural pathways. Your brain is rewiring dopamine pathways away from instant gratification patterns established by regular ejaculation.",
        esoteric: "You're beginning the hero's journey of consciousness evolution. The resistance represents old patterns fighting for survival as new awareness emerges.",
        scientific: "Neuroplasticity is highest during initial behavior change. The prefrontal cortex strengthens its control over limbic impulses through repeated conscious choice."
      }
    },
    {
      id: 2,
      name: "Emotional Purging",
      dayRange: "15-45",
      startDay: 15,
      endDay: 45,
      icon: FaHeart,
      color: "#f59e0b",
      description: "Suppressed emotions surface for healing - this is the most challenging phase",
      esotericDescription: "The heart chakra opens, releasing stored emotional trauma for spiritual purification",
      scientificMechanism: "Without ejaculation's endorphin/prolactin release numbing emotional pain, stored trauma surfaces. Retained sexual energy amplifies all emotions as the psyche heals itself.",
      expectedSymptoms: [
        "Intense mood swings and emotional volatility",
        "Waves of anxiety, depression, and unexplained sadness",
        "Old memories and relationships surfacing vividly",
        "Crying episodes without clear triggers",
        "Anger flashes and irritability",
        "Feeling emotionally raw and vulnerable",
        "Sleep disturbances and vivid dreams"
      ],
      warningSigns: [
        "Suicidal thoughts or self-harm ideation",
        "Complete emotional numbness lasting weeks",
        "Violent impulses toward others",
        "Inability to function in daily life",
        "Substance abuse to cope with emotions"
      ],
      specificTechniques: [
        "Journal extensively - write without censoring",
        "Accept emotions without resistance or judgment",
        "Cold water face splash during overwhelming moments",
        "Vigorous exercise during anger outbursts",
        "Breathing exercises: breathe into emotional sensations",
        "Seek therapy for processing severe trauma"
      ],
      traumaReleasePattern: {
        weeks1to4: "Recent frustrations and current life stressors clear first",
        months2to3: "Past relationship pain, betrayals, and heartbreak surface",
        months4to6: "Childhood programming and family dysfunction emerge",
        sixMonthsPlus: "Ancestral patterns and generational trauma release"
      },
      insights: {
        practical: "This emotional turbulence is your psyche's natural healing process. Sexual activity was unconsciously numbing emotional pain that must now be processed.",
        esoteric: "You're undergoing sacred initiation - the dissolution of ego's protective armor to reveal your authentic self. Ancient karma is being transmuted.",
        scientific: "Without prolactin and endorphin flooding from ejaculation, the brain can no longer suppress stored emotional content. This purging is necessary for psychological integration."
      }
    },
    {
      id: 3,
      name: "Mental Expansion", 
      dayRange: "46-90",
      startDay: 46,
      endDay: 90,
      icon: FaBrain,
      color: "#3b82f6",
      description: "Cognitive abilities enhance as emotional turbulence stabilizes",
      esotericDescription: "The third eye awakens as mental faculties expand beyond ordinary consciousness",
      scientificMechanism: "Retained seminal nutrients (lecithin, zinc, B12) rebuild nerve sheaths. Brain tissue becomes more densely connected as resources redirect from reproduction to cognition.",
      expectedSymptoms: [
        "Dramatically improved focus and concentration",
        "Enhanced creativity and problem-solving abilities",
        "Clearer, faster decision-making capacity",
        "Better memory formation and recall",
        "Increased motivation for learning and growth",
        "Interest in philosophy and deeper subjects",
        "Pattern recognition abilities expand"
      ],
      warningSigns: [
        "Intellectual arrogance or superiority complex",
        "Overthinking leading to analysis paralysis",
        "Using mental abilities to manipulate others",
        "Neglecting emotional and physical needs"
      ],
      specificTechniques: [
        "Take on challenging mental projects",
        "Learn new skills while neuroplasticity peaks",
        "Practice strategic thinking and planning",
        "Read complex philosophical or scientific material",
        "Engage in creative problem-solving activities"
      ],
      insights: {
        practical: "Your brain operates at higher efficiency due to optimized neurotransmitter balance and increased blood flow. This is the ideal time for intellectual achievement.",
        esoteric: "The retained life force powers higher mental faculties, connecting you to universal intelligence beyond personal consciousness.",
        scientific: "Increased zinc and B-vitamin availability enhances neurotransmitter synthesis. Reduced prolactin levels improve dopamine function and cognitive performance."
      }
    },
    {
      id: 4,
      name: "Spiritual Integration",
      dayRange: "91-180",
      startDay: 91,
      endDay: 180,
      icon: FaLightbulb,
      color: "#8b5cf6",
      description: "Profound inner transformation as benefits become deeply integrated",
      esotericDescription: "Soul integration as the divine masculine energy fully awakens within",
      scientificMechanism: "Complete endocrine rebalancing occurs. The entire nervous system optimizes for retention rather than ejaculation, creating stable high-performance states.",
      expectedSymptoms: [
        "Deep sense of life purpose and direction",
        "Natural charisma and magnetic presence",
        "Effortless self-discipline in all areas",
        "Compassionate wisdom beyond your years",
        "Natural leadership qualities emerge",
        "Inner peace despite external circumstances",
        "Intuitive abilities strengthen significantly"
      ],
      warningSigns: [
        "Spiritual bypassing of practical responsibilities",
        "Messiah complex or grandiose thinking",
        "Isolation from human connection",
        "Judging others as 'unawakened' or inferior"
      ],
      specificTechniques: [
        "Take on leadership roles in your field",
        "Mentor others beginning their journey",
        "Pursue meaningful work aligned with purpose",
        "Build deeper, authentic relationships",
        "Practice daily gratitude and service"
      ],
      insights: {
        practical: "You've developed mastery over one of humanity's strongest drives. This discipline transfers to exceptional performance in all life areas.",
        esoteric: "You've successfully transmuted base sexual energy into spiritual gold, embodying the refined energy of awakened consciousness.",
        scientific: "Neuroplastic changes become permanent. The prefrontal cortex maintains dominance over limbic impulses, creating stable self-regulation abilities."
      }
    },
    {
      id: 5,
      name: "Mastery & Service",
      dayRange: "181+",
      startDay: 181,
      endDay: 999999,
      icon: FaTrophy,
      color: "#ffdd00",
      description: "Complete integration - you've transcended the need for external validation",
      esotericDescription: "Bodhisattva consciousness - enlightened being choosing to serve others",
      scientificMechanism: "Sexual energy permanently redirected upward. 'Ojas' (vital essence) accumulates in brain tissue, creating sustained states of expanded awareness.",
      expectedSymptoms: [
        "Effortless self-control without conscious effort",
        "Natural influence and inspiring presence",
        "Deep emotional intelligence and empathy",
        "Visionary thinking and long-term perspective",
        "Ability to remain calm in any situation",
        "Others seeking your wisdom and guidance",
        "Mysterious synchronicities and 'luck'"
      ],
      warningSigns: [
        "Using abilities for purely selfish gain",
        "Losing touch with ordinary human experience",
        "Developing contempt for 'lower' behaviors",
        "Becoming isolated from meaningful relationships"
      ],
      specificTechniques: [
        "Focus on legacy creation and impact",
        "Teach and guide others on the path",
        "Apply abilities to serve humanity's evolution",
        "Maintain humility despite extraordinary abilities",
        "Stay connected to beginners' struggles"
      ],
      insights: {
        practical: "You embody peak human potential. Your presence alone inspires others to pursue their highest path. You demonstrate what's possible through disciplined energy management.",
        esoteric: "You've become a conscious co-creator with divine intelligence, wielding transmuted sexual energy for cosmic purposes and human evolution.",
        scientific: "Permanent neuroplastic changes create self-sustaining high-performance states. Brain imaging would show enhanced connectivity between regions associated with self-control and higher cognition."
      }
    }
  ];

  // WORLD-CLASS: Advanced mastery levels for 181+ day practitioners
  const masteryLevels = [
    { 
      id: 1, 
      level: "I",
      name: "Foundation Master", 
      subtitle: "Establishing Unshakeable Self-Control",
      timeRange: "Months 6-12", 
      startDay: 181, 
      endDay: 365,
      description: "Building the foundation of permanent energy mastery"
    },
    { 
      id: 2, 
      level: "II",
      name: "Wisdom Keeper", 
      subtitle: "Deep Understanding Through Experience",
      timeRange: "Year 1-2", 
      startDay: 366, 
      endDay: 730,
      description: "Integrating wisdom gained from sustained practice"
    },
    { 
      id: 3, 
      level: "III",
      name: "Consciousness Pioneer", 
      subtitle: "Exploring Higher States",
      timeRange: "Year 2-3", 
      startDay: 731, 
      endDay: 1095,
      description: "Accessing expanded states of awareness"
    },
    { 
      id: 4, 
      level: "IV",
      name: "Energy Adept", 
      subtitle: "Mastery Over Physical Desires",
      timeRange: "Year 3-4", 
      startDay: 1096, 
      endDay: 1460,
      description: "Complete transcendence of lower impulses"
    },
    { 
      id: 5, 
      level: "V",
      name: "Guide & Teacher", 
      subtitle: "Serving Others' Awakening",
      timeRange: "Year 4-5", 
      startDay: 1461, 
      endDay: 1825,
      description: "Using mastery to elevate others"
    },
    { 
      id: 6, 
      level: "VI",
      name: "Embodied Avatar", 
      subtitle: "Living Divine Consciousness",
      timeRange: "Year 5+", 
      startDay: 1826, 
      endDay: 999999,
      description: "Pure consciousness operating through human form"
    }
  ];

  const getCurrentPhase = () => {
    if (currentDay <= 0) return null;
    
    for (const phase of emotionalPhases) {
      if (currentDay >= phase.startDay && (phase.endDay === 999999 || currentDay <= phase.endDay)) {
        return phase;
      }
    }
    
    return emotionalPhases[0];
  };

  const getCurrentMasteryLevel = () => {
    if (currentDay < 181) return null;
    
    for (const level of masteryLevels) {
      if (currentDay >= level.startDay && currentDay <= level.endDay) {
        return level;
      }
    }
    
    return masteryLevels[masteryLevels.length - 1];
  };

  const currentPhase = getCurrentPhase();

  // WORLD-CLASS: Advanced phase analysis system matching Stats complexity
  const generateComprehensivePhaseAnalysis = () => {
    if (!currentPhase || !isPremium) return null;

    const emotionalData = userData.emotionalTracking || [];
    const recentData = emotionalData.filter(entry => 
      differenceInDays(new Date(), new Date(entry.date)) <= 14
    );

    // Data quality assessment
    const dataQuality = getDataQuality(recentData.length);
    
    // Multi-layered analysis
    const analysis = {
      phaseEducation: generatePhaseEducationInsight(),
      dataAnalysis: generateDataPatternAnalysis(recentData),
      challengeIdentification: generateChallengeAnalysis(recentData),
      predictiveGuidance: generatePredictiveGuidance(),
      scientificExplanation: generateScientificExplanation(),
      actionableStrategies: generateActionableStrategies(recentData)
    };

    return {
      ...analysis,
      dataQuality,
      comprehensivenessScore: calculateComprehensiveness(analysis, recentData.length)
    };
  };

  // WORLD-CLASS: Phase-specific education based on guide knowledge
  const generatePhaseEducationInsight = () => {
    if (!currentPhase) return null;

    const dayInPhase = currentDay - currentPhase.startDay + 1;
    const phaseProgress = ((currentDay - currentPhase.startDay) / (currentPhase.endDay - currentPhase.startDay + 1)) * 100;

    // Phase-specific educational content from the guide
    const educationalContent = {
      1: { // Initial Adaptation
        earlyPhase: `Days 1-7: Foundation Phase - Your hypothalamic-pituitary axis is beginning hormonal rebalancing. Testosterone stabilization causes energy fluctuations.`,
        midPhase: `Days 8-14: Adjustment Phase - Seminal vesicles reducing overproduction. First strength gains and posture improvements emerge naturally.`,
        keyLearning: "Understanding urge waves: Sexual thoughts trigger dopamine release expecting ejaculatory reward. Each resistance strengthens prefrontal cortex control.",
        whatToExpect: `Expect ${wisdomMode ? 'ego resistance as old patterns fight change' : 'strong urges and restlessness as your body adapts'}. This is completely normal brain rewiring.`
      },
      2: { // Emotional Purging  
        earlyPhase: `Days 15-30: Emotional Flooding Begins - Without ejaculation's endorphin numbing, suppressed emotions MUST surface. This is healing, not pathology.`,
        midPhase: `Days 31-45: Deep Purging Intensifies - Past relationship trauma and betrayals surface for processing. Your psyche is courageously healing itself.`,
        keyLearning: "Trauma-energy connection: Sexual activity was unconsciously medicating emotional pain. Retention forces proper emotional processing.",
        whatToExpected: `Expect ${wisdomMode ? 'karmic memories and shadow integration' : 'intense mood swings and emotional rawness'}. Decades of suppressed content is releasing.`
      },
      3: { // Mental Expansion
        earlyPhase: `Days 46-60: Cognitive Emergence - Retained nutrients (lecithin, zinc, B12) rebuild nerve sheaths. Mental fog lifts permanently.`,
        midPhase: `Days 61-90: Intellectual Peak - Brain tissue becomes more densely connected. Pattern recognition and strategic thinking expand dramatically.`,
        keyLearning: "Neuroplasticity advantage: Higher zinc and B-vitamin availability optimizes neurotransmitter synthesis for peak mental performance.",
        whatToExpect: `Expect ${wisdomMode ? 'third eye activation and intuitive downloads' : 'enhanced focus and problem-solving abilities'}. Your brain is operating at higher efficiency.`
      },
      4: { // Spiritual Integration
        earlyPhase: `Days 91-120: Integration Deepens - Complete endocrine rebalancing. Nervous system optimizes for retention, not ejaculation.`,
        midPhase: `Days 121-180: Mastery Emergence - Natural charisma and leadership qualities develop. Others unconsciously sense your increased presence.`,
        keyLearning: "Electromagnetic field changes: Retained practitioners show brighter, more extensive energy fields detectable by sensitive individuals.",
        whatToExpect: `Expect ${wisdomMode ? 'divine masculine energy awakening and soul integration' : 'natural leadership abilities and magnetic presence'}. You're embodying refined energy.`
      },
      5: { // Mastery & Service
        earlyPhase: `Day ${currentDay}: Avatar Consciousness - Sexual energy permanently redirected upward. 'Ojas' accumulation creates sustained expanded awareness.`,
        midPhase: `Advanced Mastery: You demonstrate peak human potential through disciplined energy management. Others seek your wisdom naturally.`,
        keyLearning: "Permanent neuroplastic changes: Brain imaging would show enhanced connectivity between self-control and higher cognition regions.",
        whatToExpect: `You now ${wisdomMode ? 'channel cosmic intelligence for humanity\'s evolution' : 'inspire others through your living example of human potential'}. Your presence teaches.`
      }
    };

    const content = educationalContent[currentPhase.id];
    if (!content) return null;

    return {
      phaseOverview: dayInPhase <= 7 ? content.earlyPhase : content.midPhase,
      keyLearning: content.keyLearning,
      expectation: content.whatToExpect,
      mechanismExplanation: wisdomMode ? currentPhase.esotericDescription : currentPhase.scientificMechanism,
      dayInPhase,
      phaseProgress: Math.min(100, Math.max(0, phaseProgress))
    };
  };

  // WORLD-CLASS: Data pattern analysis with challenge identification
  const generateDataPatternAnalysis = (recentData) => {
    if (recentData.length < 3) {
      return {
        type: 'insufficient',
        message: `Track emotions for ${3 - recentData.length} more days to unlock pattern analysis`,
        dataPoints: recentData.length
      };
    }

    // Calculate averages and trends
    const avgAnxiety = recentData.reduce((sum, entry) => sum + (entry.anxiety || 5), 0) / recentData.length;
    const avgMoodStability = recentData.reduce((sum, entry) => sum + (entry.moodStability || 5), 0) / recentData.length;
    const avgMentalClarity = recentData.reduce((sum, entry) => sum + (entry.mentalClarity || 5), 0) / recentData.length;
    const avgEmotionalProcessing = recentData.reduce((sum, entry) => sum + (entry.emotionalProcessing || 5), 0) / recentData.length;

    // Calculate wellbeing score
    const wellbeingScore = (avgMoodStability + avgMentalClarity + avgEmotionalProcessing + (10 - avgAnxiety)) / 4;

    // Trend analysis (if enough data)
    let trends = null;
    if (recentData.length >= 7) {
      const recent = recentData.slice(-3);
      const earlier = recentData.slice(0, 3);
      
      trends = {
        anxiety: getTrend(recent, earlier, 'anxiety'),
        mood: getTrend(recent, earlier, 'moodStability'), 
        clarity: getTrend(recent, earlier, 'mentalClarity'),
        processing: getTrend(recent, earlier, 'emotionalProcessing')
      };
    }

    // Phase-specific pattern evaluation
    const phaseAlignment = evaluatePhaseAlignment(avgAnxiety, avgMoodStability, avgMentalClarity, avgEmotionalProcessing);

    return {
      type: 'comprehensive',
      averages: { avgAnxiety, avgMoodStability, avgMentalClarity, avgEmotionalProcessing },
      wellbeingScore,
      trends,
      phaseAlignment,
      dataPoints: recentData.length,
      analysisQuality: recentData.length >= 14 ? 'rich' : recentData.length >= 7 ? 'good' : 'basic'
    };
  };

  // Helper function for trend calculation
  const getTrend = (recent, earlier, metric) => {
    const recentAvg = recent.reduce((sum, entry) => sum + (entry[metric] || 5), 0) / recent.length;
    const earlierAvg = earlier.reduce((sum, entry) => sum + (entry[metric] || 5), 0) / earlier.length;
    
    if (metric === 'anxiety') {
      return recentAvg < earlierAvg - 0.5 ? 'improving' : 
             recentAvg > earlierAvg + 0.5 ? 'concerning' : 'stable';
    } else {
      return recentAvg > earlierAvg + 0.5 ? 'improving' : 
             recentAvg < earlierAvg - 0.5 ? 'concerning' : 'stable';
    }
  };

  // WORLD-CLASS: Phase alignment evaluation
  const evaluatePhaseAlignment = (anxiety, mood, clarity, processing) => {
    const currentPhaseId = currentPhase?.id;
    
    const phaseExpectations = {
      1: { // Initial Adaptation
        expectedAnxiety: [4, 8], // Higher anxiety expected
        expectedMood: [3, 7], // Variable mood
        expectedClarity: [4, 7], // Building clarity
        expectedProcessing: [3, 6] // Limited processing
      },
      2: { // Emotional Purging
        expectedAnxiety: [5, 9], // High anxiety normal
        expectedMood: [2, 5], // Low mood expected
        expectedClarity: [3, 6], // Reduced clarity
        expectedProcessing: [2, 8] // Highly variable processing
      },
      3: { // Mental Expansion
        expectedAnxiety: [2, 6], // Lower anxiety
        expectedMood: [5, 8], // Improving mood
        expectedClarity: [6, 9], // High clarity
        expectedProcessing: [5, 8] // Good processing
      },
      4: { // Spiritual Integration
        expectedAnxiety: [1, 4], // Low anxiety
        expectedMood: [7, 9], // High mood stability
        expectedClarity: [7, 10], // Excellent clarity
        expectedProcessing: [7, 9] // Excellent processing
      },
      5: { // Mastery
        expectedAnxiety: [1, 3], // Minimal anxiety
        expectedMood: [8, 10], // Exceptional stability
        expectedClarity: [8, 10], // Peak clarity
        expectedProcessing: [8, 10] // Masterful processing
      }
    };

    const expected = phaseExpectations[currentPhaseId];
    if (!expected) return null;

    const isWithinRange = (value, range) => value >= range[0] && value <= range[1];

    const alignment = {
      anxiety: isWithinRange(anxiety, expected.expectedAnxiety),
      mood: isWithinRange(mood, expected.expectedMood),
      clarity: isWithinRange(clarity, expected.expectedClarity),
      processing: isWithinRange(processing, expected.expectedProcessing)
    };

    const alignmentScore = Object.values(alignment).filter(Boolean).length / 4;

    return {
      alignment,
      score: alignmentScore,
      interpretation: alignmentScore >= 0.75 ? 'excellent' : 
                     alignmentScore >= 0.5 ? 'good' : 
                     alignmentScore >= 0.25 ? 'concerning' : 'misaligned'
    };
  };

  // WORLD-CLASS: Challenge identification from guide knowledge
  const generateChallengeAnalysis = (recentData) => {
    if (!currentPhase || recentData.length < 3) return null;

    const avgData = {
      anxiety: recentData.reduce((sum, entry) => sum + (entry.anxiety || 5), 0) / recentData.length,
      mood: recentData.reduce((sum, entry) => sum + (entry.moodStability || 5), 0) / recentData.length,
      clarity: recentData.reduce((sum, entry) => sum + (entry.mentalClarity || 5), 0) / recentData.length,
      processing: recentData.reduce((sum, entry) => sum + (entry.emotionalProcessing || 5), 0) / recentData.length
    };

    // Phase-specific challenge identification from the guide
    const challengePatterns = {
      1: { // Initial Adaptation
        highAnxiety: {
          condition: avgData.anxiety > 7,
          challenge: "Intense urge management difficulty",
          explanation: "High anxiety indicates strong dopamine-seeking from established ejaculation patterns",
          solution: "Increase cold exposure and physical exercise. Remove all triggers from environment immediately."
        },
        lowEnergy: {
          condition: avgData.mood < 4 && avgData.clarity < 5,
          challenge: "Energy fluctuation adaptation",
          explanation: "Body adjusting hormone production from reproductive to retention mode",
          solution: "Maintain consistent sleep schedule. This energy instability resolves by day 21."
        }
      },
      2: { // Emotional Purging
        emotionalVolatility: {
          condition: avgData.mood < 4 || avgData.processing < 4,
          challenge: "Intense emotional purging phase",
          explanation: "Suppressed emotions surfacing as sexual numbing mechanism removed",
          solution: "Journal extensively. Accept emotions without resistance. This is healing, not pathology."
        },
        overwhelm: {
          condition: avgData.anxiety > 7 && avgData.processing < 3,
          challenge: "Trauma flooding beyond capacity",
          explanation: "Decades of suppressed content releasing faster than processing ability",
          solution: "Consider professional therapy. Use cold water for emotional regulation."
        }
      },
      3: { // Mental Expansion
        clarity_plateau: {
          condition: avgData.clarity < 6,
          challenge: "Mental benefits not emerging",
          explanation: "May still be processing emotions or need more time for neuroplastic changes",
          solution: "Continue consistent practices. Mental expansion follows emotional stability."
        },
        ego_inflation: {
          condition: avgData.clarity > 8 && avgData.processing < 6,
          challenge: "Intellectual arrogance developing", 
          explanation: "Enhanced cognitive abilities creating superiority complex",
          solution: "Practice humility. Use enhanced abilities to serve others, not dominate."
        }
      },
      4: { // Spiritual Integration
        integration_resistance: {
          condition: avgData.mood < 6 || avgData.processing < 6,
          challenge: "Spiritual integration difficulties",
          explanation: "Ego resisting identity transformation and expanded responsibilities",
          solution: "Accept changing relationships. Your evolution naturally shifts social dynamics."
        }
      },
      5: { // Mastery
        service_avoidance: {
          condition: avgData.processing < 7,
          challenge: "Avoiding service responsibilities",
          explanation: "Using mastery for purely personal gain rather than collective elevation",
          solution: "Remember your responsibility to guide others. Mastery comes with service obligations."
        }
      }
    };

    const phasePatterns = challengePatterns[currentPhase.id];
    if (!phasePatterns) return null;

    const identifiedChallenges = [];
    
    Object.entries(phasePatterns).forEach(([key, pattern]) => {
      if (pattern.condition) {
        identifiedChallenges.push({
          type: key,
          challenge: pattern.challenge,
          explanation: pattern.explanation,
          solution: pattern.solution,
          severity: getSeverity(avgData, pattern.type)
        });
      }
    });

    return {
      challenges: identifiedChallenges,
      riskLevel: identifiedChallenges.length === 0 ? 'low' : 
                identifiedChallenges.some(c => c.severity === 'high') ? 'high' :
                identifiedChallenges.length > 2 ? 'moderate' : 'low',
      phaseAlignment: evaluatePhaseAlignment(avgData.anxiety, avgData.mood, avgData.clarity, avgData.processing)
    };
  };

  // Helper function for challenge severity assessment
  const getSeverity = (avgData, challengeType) => {
    const severityThresholds = {
      highAnxiety: avgData.anxiety > 8.5 ? 'high' : 'moderate',
      emotionalVolatility: avgData.mood < 3 ? 'high' : 'moderate',
      overwhelm: (avgData.anxiety > 8 && avgData.processing < 2) ? 'high' : 'moderate',
      clarity_plateau: avgData.clarity < 4 ? 'high' : 'moderate'
    };
    
    return severityThresholds[challengeType] || 'moderate';
  };

  // WORLD-CLASS: Predictive guidance based on guide's timeline knowledge
  const generatePredictiveGuidance = () => {
    if (!currentPhase) return null;

    const daysRemaining = currentPhase.endDay === 999999 ? null : currentPhase.endDay - currentDay;
    const dayInPhase = currentDay - currentPhase.startDay + 1;

    // Predictive insights based on the guide's detailed timelines
    const predictiveInsights = {
      1: { // Initial Adaptation
        currentFocus: dayInPhase <= 7 ? 
          "Focus on establishing unbreakable morning routine and removing all triggers" :
          "Build urge management skills - this phase tests your foundational commitment",
        upcomingChallenge: "Days 15-45 bring emotional purging. Prepare for mood swings and old memories surfacing.",
        preparation: "Start journaling now. Emotional turbulence ahead requires processing tools.",
        timeline: `${daysRemaining} days until Emotional Purging phase begins`
      },
      2: { // Emotional Purging
        currentFocus: dayInPhase <= 15 ?
          "Accept emotional flooding as healing, not pathology. Journal extensively." :
          "Deep trauma processing intensifies. Maintain practices even when motivation dips.",
        upcomingChallenge: "Days 46-90 bring mental expansion if emotional processing succeeds.",
        preparation: "Consider therapy for severe trauma. Build support systems now.",
        timeline: `${daysRemaining} days until Mental Expansion phase begins`
      },
      3: { // Mental Expansion
        currentFocus: dayInPhase <= 22 ?
          "Apply enhanced focus to important goals. Channel mental energy productively." :
          "Guard against intellectual arrogance. Use abilities to serve, not dominate.",
        upcomingChallenge: "Days 91-180 bring spiritual integration and identity transformation.",
        preparation: "Prepare for changing relationships as you transform.",
        timeline: `${daysRemaining} days until Spiritual Integration phase begins`
      },
      4: { // Spiritual Integration
        currentFocus: dayInPhase <= 45 ?
          "Accept increased responsibility gracefully. Others will seek your guidance." :
          "Prepare for mastery phase. Consider how you'll serve others with your abilities.",
        upcomingChallenge: "Day 181+ begins mastery phase with service obligations.",
        preparation: "Develop teaching and mentoring skills. Your wisdom will be needed.",
        timeline: `${daysRemaining} days until Mastery phase begins`
      },
      5: { // Mastery
        currentFocus: "Focus on legacy creation and serving humanity's evolution.",
        upcomingChallenge: "Maintaining humility while wielding extraordinary abilities.",
        preparation: "Connect with other masters. Share wisdom while staying grounded.",
        timeline: "Eternal journey of service and consciousness expansion"
      }
    };

    return predictiveInsights[currentPhase.id];
  };

  // WORLD-CLASS: Scientific explanation system
  const generateScientificExplanation = () => {
    if (!currentPhase) return null;

    const explanations = {
      1: {
        neurochemical: "Dopamine receptors begin rebalancing from overstimulation. Testosterone stabilizes as reproductive focus shifts to retention mode.",
        physiological: "Hypothalamic-pituitary axis adjusts hormone production. Seminal vesicles reduce overproduction as body adapts to retention.",
        behavioral: "Prefrontal cortex strengthens control over limbic impulses through repeated conscious choice during urges."
      },
      2: {
        neurochemical: "Without ejaculation's endorphin/prolactin release, stored emotional content can no longer be suppressed and must surface for processing.",
        physiological: "Retained sexual energy amplifies all emotions while removing the neurochemical numbing mechanism of regular ejaculation.",
        behavioral: "Brain reorganizes emotional processing patterns, requiring conscious integration of previously avoided psychological content."
      },
      3: {
        neurochemical: "Increased zinc, lecithin, and B-vitamin availability optimizes neurotransmitter synthesis for enhanced cognitive performance.",
        physiological: "Retained seminal nutrients rebuild nerve sheaths and increase brain tissue connectivity, improving information processing speed.",
        behavioral: "Neuroplasticity peaks during behavior change, allowing rapid acquisition of new cognitive abilities and thinking patterns."
      },
      4: {
        neurochemical: "Complete endocrine rebalancing creates sustained high-performance neurotransmitter states without external stimulation requirements.",
        physiological: "Nervous system optimizes for retention rather than ejaculation, establishing stable electromagnetic field patterns others unconsciously detect.",
        behavioral: "Permanent neuroplastic changes establish automatic self-regulation, freeing cognitive resources for higher-order thinking and creativity."
      },
      5: {
        neurochemical: "'Ojas' (refined sexual energy) accumulates in brain tissue, creating sustained expanded awareness and enhanced intuitive capabilities.",
        physiological: "Sexual energy permanently redirected upward through spinal channels, maintaining constant high-coherence brainwave states.",
        behavioral: "Complete integration allows effortless expression of peak human potential while maintaining connection to universal intelligence."
      }
    };

    return explanations[currentPhase.id];
  };

  // WORLD-CLASS: Actionable strategies from the guide
  const generateActionableStrategies = (recentData) => {
    if (!currentPhase) return null;

    const avgData = recentData.length > 0 ? {
      anxiety: recentData.reduce((sum, entry) => sum + (entry.anxiety || 5), 0) / recentData.length,
      mood: recentData.reduce((sum, entry) => sum + (entry.moodStability || 5), 0) / recentData.length,
      clarity: recentData.reduce((sum, entry) => sum + (entry.mentalClarity || 5), 0) / recentData.length,
      processing: recentData.reduce((sum, entry) => sum + (entry.emotionalProcessing || 5), 0) / recentData.length
    } : null;

    // Phase-specific strategies from the guide
    const strategies = {
      1: {
        urgent: avgData?.anxiety > 7 ? ["Immediate cold shower protocol: 2-5 minutes daily", "Remove ALL triggers from environment NOW"] : [],
        daily: ["Establish non-negotiable morning routine", "Practice 4-7-8 breathing during urges", "Intense physical exercise to channel energy"],
        weekly: ["Track urge patterns and triggers", "Build support system connections", "Study retention science and benefits"],
        longTerm: ["Commit to 90-day minimum trial", "Prepare for emotional purging phase", "Develop urge management toolkit"]
      },
      2: {
        urgent: avgData?.mood < 3 ? ["Seek professional therapy consultation", "Emergency emotional regulation: cold water on face"] : [],
        daily: ["Journal extensively without censoring", "Accept emotions without resistance", "Cold exposure for nervous system reset"],
        weekly: ["Process memories with support", "Practice emotional alchemy techniques", "Connect with understanding community"],
        longTerm: ["Understand this is healing, not pathology", "Prepare for mental expansion phase", "Build emotional intelligence skills"]
      },
      3: {
        urgent: avgData?.clarity < 4 ? ["Reduce mental stimulation", "Increase meditation time for brain optimization"] : [],
        daily: ["Take on challenging mental projects", "Learn new skills while neuroplasticity peaks", "Practice strategic thinking"],
        weekly: ["Read complex philosophical material", "Engage in creative problem-solving", "Avoid intellectual arrogance traps"],
        longTerm: ["Apply abilities to meaningful goals", "Prepare for spiritual integration", "Develop teaching capabilities"]
      },
      4: {
        urgent: avgData?.processing < 6 ? ["Address integration resistance", "Accept changing relationships as natural"] : [],
        daily: ["Practice compassionate leadership", "Mentor others beginning journey", "Maintain humble confidence"],
        weekly: ["Take on meaningful service projects", "Build authentic relationships", "Practice daily gratitude"],
        longTerm: ["Prepare for mastery phase responsibilities", "Develop legacy vision", "Connect with other advanced practitioners"]
      },
      5: {
        urgent: ["Avoid using abilities for purely selfish gain", "Stay connected to beginners' struggles"],
        daily: ["Focus on legacy creation", "Serve humanity's evolution", "Maintain beginner's mind"],
        weekly: ["Teach and guide others", "Practice radical humility", "Connect with other masters"],
        longTerm: ["Establish lasting positive impact", "Prepare successors", "Transcend personal achievement for universal service"]
      }
    };

    return strategies[currentPhase.id];
  };

  // Data quality assessment
  const getDataQuality = (dataPoints) => {
    if (dataPoints >= 14) return { level: 'rich', description: 'Comprehensive Analysis Available' };
    if (dataPoints >= 7) return { level: 'good', description: 'Pattern Recognition Active' };
    if (dataPoints >= 3) return { level: 'basic', description: 'Initial Patterns Detected' };
    return { level: 'insufficient', description: 'More Data Needed' };
  };

  // Comprehensiveness score calculation
  const calculateComprehensiveness = (analysis, dataPoints) => {
    let score = 0;
    if (analysis.phaseEducation) score += 20;
    if (analysis.dataAnalysis?.type === 'comprehensive') score += 25;
    if (analysis.challengeIdentification?.challenges?.length > 0) score += 20;
    if (analysis.predictiveGuidance) score += 15;
    if (analysis.scientificExplanation) score += 10;
    if (analysis.actionableStrategies) score += 10;
    
    // Bonus for data richness
    if (dataPoints >= 14) score += 10;
    else if (dataPoints >= 7) score += 5;
    
    return Math.min(100, score);
  };

  // Calculate progress percentage with mastery level support
  const getPhaseProgress = (phase) => {
    if (!phase || currentDay <= 0) return 0;
    
    if (phase.startDay === 181) {
      const masteryLevel = getCurrentMasteryLevel();
      if (!masteryLevel) return 0;
      
      const daysIntoLevel = currentDay - masteryLevel.startDay;
      const totalDaysInLevel = masteryLevel.endDay === 999999 ? 
        365 : (masteryLevel.endDay - masteryLevel.startDay + 1);
      
      const progress = (daysIntoLevel / totalDaysInLevel) * 100;
      return Math.min(100, Math.max(0, progress));
    }
    
    const daysCompletedInPhase = currentDay - phase.startDay;
    const totalDaysInPhase = phase.endDay - phase.startDay + 1;
    const progress = (daysCompletedInPhase / totalDaysInPhase) * 100;
    
    return Math.min(100, Math.max(0, progress));
  };

  // Get progress text with mastery level support
  const getPhaseProgressText = (phase) => {
    if (!phase || currentDay <= 0) return "";
    
    if (phase.startDay === 181) {
      const masteryLevel = getCurrentMasteryLevel();
      if (!masteryLevel) return "";
      
      const daysIntoLevel = currentDay - masteryLevel.startDay;
      const currentDayInLevel = daysIntoLevel + 1;
      
      if (masteryLevel.endDay === 999999) {
        return `Level ${masteryLevel.level} ${masteryLevel.name} - Day ${currentDayInLevel} (Eternal Journey)`;
      } else {
        const totalDaysInLevel = masteryLevel.endDay - masteryLevel.startDay + 1;
        const daysRemainingInLevel = masteryLevel.endDay - currentDay;
        return `Level ${masteryLevel.level} ${masteryLevel.name} - Day ${currentDayInLevel} of ${totalDaysInLevel} (${daysRemainingInLevel} days to next level)`;
      }
    }
    
    const daysCompletedInPhase = currentDay - phase.startDay;
    const currentDayInPhase = daysCompletedInPhase + 1;
    const totalDaysInPhase = phase.endDay - phase.startDay + 1;
    const daysRemainingInPhase = phase.endDay - currentDay;
    
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
    if (!isPremium) return;
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
    
    const updatedEmotionalTracking = (userData.emotionalTracking || []).filter(
      emotion => format(new Date(emotion.date), 'yyyy-MM-dd') !== todayStr
    );
    
    updatedEmotionalTracking.push({
      date: today,
      day: currentDay,
      phase: currentPhase?.id || 1,
      ...todayEmotions
    });
    
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

  // Get phase-specific journal prompt from the guide
  const getPhaseJournalPrompt = () => {
    if (!currentPhase) return "How are you feeling about your journey today?";
    
    const prompts = {
      1: "What urges are you experiencing? How are you channeling this new energy? What triggers have you identified?",
      2: "What emotions or memories are surfacing? Remember, this emotional purging is healing. How are you processing these feelings?",
      3: "How has your mental clarity improved? What new insights or creative ideas are emerging? How are you applying enhanced focus?", 
      4: "What deeper purpose is emerging in your life? How do you want to serve others? What leadership opportunities are appearing?",
      5: "How are you using your mastery to inspire and help others? What legacy are you creating? How do you stay humble while wielding these abilities?"
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

  // Premium upgrade handler
  const handleUpgradeClick = () => {
    toast.success('Premium upgrade coming soon! 🚀');
  };

  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const todayNote = userData.notes && userData.notes[todayStr];

  return (
    <div className="emotional-timeline-container">
      {/* Smart Floating Wisdom Toggle */}
      {showFloatingToggle && (
        <button 
          className={`floating-wisdom-toggle ${wisdomMode ? 'active' : ''}`}
          onClick={() => setWisdomMode(!wisdomMode)}
          title={wisdomMode ? "Switch to Scientific View" : "Switch to Esoteric View"}
        >
          <FaEye className={`floating-wisdom-eye ${wisdomMode ? 'active' : ''}`} />
        </button>
      )}

      {/* Header */}
      <div className="timeline-header">
        <div className="timeline-header-spacer"></div>
        <h2>Emotional Timeline</h2>
        <div className="timeline-header-actions"></div>
      </div>

      {/* Timeline Content Container */}
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

              {/* Progress bar */}
              <div className="phase-progress">
                <div 
                  className="progress-bar"
                  style={{ '--phase-color': currentPhase.color }}
                >
                  <div 
                    className="progress-fill progress-fill-colored"
                    style={{ width: `${getPhaseProgress(currentPhase)}%` }}
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

        {/* PREMIUM CUTOFF */}
        {!isPremium ? (
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
                <h3>Unlock World-Class Phase Analysis</h3>
                <p>Get comprehensive phase insights, scientific explanations, emotional tracking, and personalized guidance based on the ultimate retention guide</p>
                <button className="early-teaser-upgrade-btn" onClick={handleUpgradeClick}>
                  <FaStar />
                  Upgrade to Premium
                </button>
              </div>
            </div>
          </div>
        ) : (
          // PREMIUM FEATURES SECTION
          <div className="premium-features-section">
            {/* Timeline Overview */}
            <div className="timeline-overview" ref={timelineStartRef}>
              <h3>Complete Journey Map</h3>
              <div className="phases-timeline">
                {emotionalPhases.map((phase) => {
                  const isCompleted = currentDay > phase.endDay && phase.endDay !== 999999;
                  const isCurrent = currentPhase?.id === phase.id;
                  const isUpcoming = currentDay < phase.startDay;
                  
                  return (
                    <div 
                      key={phase.id} 
                      className={`timeline-phase ${isCompleted ? 'completed' : ''} ${isCurrent ? 'current' : ''} ${isUpcoming ? 'upcoming' : ''}`}
                      onClick={() => showPhaseDetails(phase)}
                      style={{ cursor: 'pointer' }}
                    >
                      <div className="timeline-phase-icon">
                        <phase.icon style={{ color: phase.color }} />
                      </div>
                      <div className="timeline-phase-info">
                        <div className="timeline-phase-name">{phase.name}</div>
                        <div className="timeline-phase-range">Days {phase.dayRange}</div>
                      </div>
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
                    </div>
                  );
                })}
              </div>

              {/* Mastery Levels Display */}
              {currentDay >= 181 && (
                <div className="mastery-levels-section">
                  <h3>Mastery Levels (Days 181+)</h3>
                  <div className="mastery-levels-timeline">
                    {masteryLevels.map((level) => {
                      const isCompleted = currentDay > level.endDay && level.endDay !== 999999;
                      const isCurrent = getCurrentMasteryLevel()?.id === level.id;
                      const isUpcoming = currentDay < level.startDay;
                      
                      return (
                        <div 
                          key={level.id}
                          className={`mastery-level-card ${isCompleted ? 'completed' : ''} ${isCurrent ? 'current' : ''} ${isUpcoming ? 'upcoming' : ''}`}
                        >
                          <div className="mastery-level-icon">
                            <FaTrophy />
                          </div>
                          
                          <div className="mastery-level-info">
                            <div className="mastery-level-name">Level {level.level}: {level.name}</div>
                            <div className="mastery-level-subtitle">{level.subtitle}</div>
                          </div>
                          
                          <div className="mastery-level-details">
                            <div className="mastery-level-range">
                              {level.timeRange}
                            </div>
                          </div>
                          
                          {isCurrent && (
                            <div className="mastery-level-progress">
                              <div 
                                className="mastery-progress-fill"
                                style={{ width: `${getPhaseProgress(currentPhase)}%` }}
                              ></div>
                            </div>
                          )}
                          
                          <div className="mastery-level-status">
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
                    <button 
                      className="action-btn edit-emotions-btn"
                      onClick={enableEmotionEditing}
                    >
                      <FaPen />
                      <span>Edit</span>
                    </button>
                  </div>
                ) : (
                  <div className="emotions-not-logged">
                    <FaInfoCircle className="info-icon" />
                    <span>Track your emotional state to unlock personalized phase analysis and pattern recognition</span>
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
                      onChange={(e) => handleEmotionChange(emotion.key, parseInt(e.target.value))}
                      className="emotion-range-slider"
                      disabled={emotionsLogged}
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
                  <button 
                    className="action-btn save-emotions-btn"
                    onClick={saveEmotions}
                  >
                    <FaCheckCircle />
                    <span>Save Emotional Check-in</span>
                  </button>
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
                  >
                    <FaPen />
                    <span>{todayNote ? 'Edit Entry' : 'Add Entry'}</span>
                  </button>
                </div>
              </div>

              <div className="journal-prompt">
                <FaRegLightbulb className="prompt-icon" />
                <p>{getPhaseJournalPrompt()}</p>
              </div>

              {todayNote ? (
                <div className="journal-preview">
                  <p>"{todayNote.length > 150 ? `${todayNote.substring(0, 150)}...` : todayNote}"</p>
                </div>
              ) : (
                <div className="empty-journal">
                  <FaInfoCircle className="info-icon" />
                  <p>No journal entry for today. Recording your journey helps track progress through phases.</p>
                </div>
              )}
            </div>

            {/* WORLD-CLASS: Comprehensive Phase Analysis Section */}
            {currentPhase && (
              <div className="phase-insight-section" ref={insightSectionRef}>
                <h3>Comprehensive Phase Analysis</h3>
                
                {(() => {
                  const analysis = generateComprehensivePhaseAnalysis();
                  const emotionalData = userData.emotionalTracking || [];
                  const recentData = emotionalData.filter(entry => 
                    differenceInDays(new Date(), new Date(entry.date)) <= 14
                  );
                  
                  return (
                    <>
                      {/* Data Quality Banner */}
                      {recentData.length < 7 && (
                        <div className="insight-data-banner">
                          <div className="insight-data-banner-content">
                            <FaInfoCircle className="insight-data-icon" />
                            <div className="insight-data-text">
                              <strong>Analysis improves with data:</strong> The more you track emotions, the more personalized and accurate this analysis becomes.
                              {recentData.length >= 3 && recentData.length < 7 && ` You've logged ${recentData.length} days - track 7+ days to unlock advanced pattern recognition.`}
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {/* Multiple Analysis Cards */}
                      <div className="analysis-cards-grid">
                        
                        {/* Phase Education Card */}
                        {analysis?.phaseEducation && (
                          <div className="insight-card phase-education-card">
                            <div className="insight-header">
                              <FaUserGraduate className="insight-icon-education" />
                              <span>Phase Education</span>
                            </div>
                            <div className="insight-content">
                              <div className="phase-overview">
                                <strong>Current Focus:</strong> {analysis.phaseEducation.phaseOverview}
                              </div>
                              <div className="key-learning">
                                <strong>Key Learning:</strong> {analysis.phaseEducation.keyLearning}
                              </div>
                              <div className="expectation">
                                <strong>What to Expect:</strong> {analysis.phaseEducation.expectation}
                              </div>
                              <div className="phase-progress-detail">
                                <strong>Progress:</strong> Day {analysis.phaseEducation.dayInPhase} of phase ({Math.round(analysis.phaseEducation.phaseProgress)}% complete)
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Scientific Explanation Card */}
                        {analysis?.scientificExplanation && (
                          <div className="insight-card scientific-card">
                            <div className="insight-header">
                              <FaFlask className="insight-icon-science" />
                              <span>{wisdomMode ? 'Energetic Understanding' : 'Scientific Mechanisms'}</span>
                            </div>
                            <div className="insight-content">
                              <div className="mechanism-explanation">
                                <strong>{wisdomMode ? 'Energetic:' : 'Neurochemical:'}</strong> {analysis.scientificExplanation.neurochemical}
                              </div>
                              <div className="physiological-explanation">
                                <strong>Physiological:</strong> {analysis.scientificExplanation.physiological}
                              </div>
                              <div className="behavioral-explanation">
                                <strong>{wisdomMode ? 'Consciousness:' : 'Behavioral:'}</strong> {analysis.scientificExplanation.behavioral}
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Data Analysis Card */}
                        {analysis?.dataAnalysis?.type === 'comprehensive' && (
                          <div className="insight-card data-analysis-card">
                            <div className="insight-header">
                              <FaChartLine className="insight-icon-data" />
                              <span>Personal Data Analysis</span>
                            </div>
                            <div className="insight-content">
                              <div className="wellbeing-score">
                                <strong>Wellbeing Score:</strong> {analysis.dataAnalysis.wellbeingScore.toFixed(1)}/10
                                <span className={`score-indicator ${
                                  analysis.dataAnalysis.wellbeingScore >= 7 ? 'excellent' : 
                                  analysis.dataAnalysis.wellbeingScore >= 5 ? 'good' : 'needs-attention'
                                }`}>
                                  {analysis.dataAnalysis.wellbeingScore >= 7 ? 'Excellent' : 
                                   analysis.dataAnalysis.wellbeingScore >= 5 ? 'Good' : 'Needs Attention'}
                                </span>
                              </div>
                              <div className="metric-breakdown">
                                <div className="metric-item">
                                  <span>Anxiety: {analysis.dataAnalysis.averages.avgAnxiety.toFixed(1)}/10</span>
                                  {analysis.dataAnalysis.trends?.anxiety && (
                                    <span className={`trend ${analysis.dataAnalysis.trends.anxiety}`}>
                                      {analysis.dataAnalysis.trends.anxiety === 'improving' ? '↓' : 
                                       analysis.dataAnalysis.trends.anxiety === 'concerning' ? '↑' : '→'}
                                    </span>
                                  )}
                                </div>
                                <div className="metric-item">
                                  <span>Mood: {analysis.dataAnalysis.averages.avgMoodStability.toFixed(1)}/10</span>
                                  {analysis.dataAnalysis.trends?.mood && (
                                    <span className={`trend ${analysis.dataAnalysis.trends.mood}`}>
                                      {analysis.dataAnalysis.trends.mood === 'improving' ? '↑' : 
                                       analysis.dataAnalysis.trends.mood === 'concerning' ? '↓' : '→'}
                                    </span>
                                  )}
                                </div>
                                <div className="metric-item">
                                  <span>Clarity: {analysis.dataAnalysis.averages.avgMentalClarity.toFixed(1)}/10</span>
                                  {analysis.dataAnalysis.trends?.clarity && (
                                    <span className={`trend ${analysis.dataAnalysis.trends.clarity}`}>
                                      {analysis.dataAnalysis.trends.clarity === 'improving' ? '↑' : 
                                       analysis.dataAnalysis.trends.clarity === 'concerning' ? '↓' : '→'}
                                    </span>
                                  )}
                                </div>
                                <div className="metric-item">
                                  <span>Processing: {analysis.dataAnalysis.averages.avgEmotionalProcessing.toFixed(1)}/10</span>
                                  {analysis.dataAnalysis.trends?.processing && (
                                    <span className={`trend ${analysis.dataAnalysis.trends.processing}`}>
                                      {analysis.dataAnalysis.trends.processing === 'improving' ? '↑' : 
                                       analysis.dataAnalysis.trends.processing === 'concerning' ? '↓' : '→'}
                                    </span>
                                  )}
                                </div>
                              </div>
                              {analysis.dataAnalysis.phaseAlignment && (
                                <div className="phase-alignment">
                                  <strong>Phase Alignment:</strong> 
                                  <span className={`alignment-score ${analysis.dataAnalysis.phaseAlignment.interpretation}`}>
                                    {analysis.dataAnalysis.phaseAlignment.interpretation} ({Math.round(analysis.dataAnalysis.phaseAlignment.score * 100)}%)
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Challenge Identification Card */}
                        {analysis?.challengeIdentification?.challenges?.length > 0 && (
                          <div className="insight-card challenge-card">
                            <div className="insight-header">
                              <FaShieldAlt className="insight-icon-challenge" />
                              <span>Challenge Analysis</span>
                              <span className={`risk-level ${analysis.challengeIdentification.riskLevel}`}>
                                {analysis.challengeIdentification.riskLevel.toUpperCase()} RISK
                              </span>
                            </div>
                            <div className="insight-content">
                              {analysis.challengeIdentification.challenges.map((challenge, index) => (
                                <div key={index} className={`challenge-item ${challenge.severity}`}>
                                  <div className="challenge-title">
                                    <strong>{challenge.challenge}</strong>
                                    <span className={`severity-badge ${challenge.severity}`}>{challenge.severity}</span>
                                  </div>
                                  <div className="challenge-explanation">{challenge.explanation}</div>
                                  <div className="challenge-solution">
                                    <strong>Solution:</strong> {challenge.solution}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Predictive Guidance Card */}
                        {analysis?.predictiveGuidance && (
                          <div className="insight-card predictive-card">
                            <div className="insight-header">
                              <FaSearch className="insight-icon-predictive" />
                              <span>Predictive Guidance</span>
                            </div>
                            <div className="insight-content">
                              <div className="current-focus">
                                <strong>Current Focus:</strong> {analysis.predictiveGuidance.currentFocus}
                              </div>
                              <div className="upcoming-challenge">
                                <strong>Upcoming Challenge:</strong> {analysis.predictiveGuidance.upcomingChallenge}
                              </div>
                              <div className="preparation">
                                <strong>Preparation:</strong> {analysis.predictiveGuidance.preparation}
                              </div>
                              <div className="timeline">
                                <strong>Timeline:</strong> {analysis.predictiveGuidance.timeline}
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Actionable Strategies Card */}
                        {analysis?.actionableStrategies && (
                          <div className="insight-card strategies-card">
                            <div className="insight-header">
                              <FaBolt className="insight-icon-strategies" />
                              <span>Actionable Strategies</span>
                            </div>
                            <div className="insight-content">
                              {analysis.actionableStrategies.urgent.length > 0 && (
                                <div className="strategy-section urgent">
                                  <strong>🚨 Urgent Actions:</strong>
                                  <ul>
                                    {analysis.actionableStrategies.urgent.map((action, index) => (
                                      <li key={index}>{action}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                              <div className="strategy-section daily">
                                <strong>📅 Daily Practices:</strong>
                                <ul>
                                  {analysis.actionableStrategies.daily.map((action, index) => (
                                    <li key={index}>{action}</li>
                                  ))}
                                </ul>
                              </div>
                              <div className="strategy-section weekly">
                                <strong>📊 Weekly Focus:</strong>
                                <ul>
                                  {analysis.actionableStrategies.weekly.map((action, index) => (
                                    <li key={index}>{action}</li>
                                  ))}
                                </ul>
                              </div>
                              <div className="strategy-section long-term">
                                <strong>🎯 Long-term Development:</strong>
                                <ul>
                                  {analysis.actionableStrategies.longTerm.map((action, index) => (
                                    <li key={index}>{action}</li>
                                  ))}
                                </ul>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Insufficient Data Card */}
                        {analysis?.dataAnalysis?.type === 'insufficient' && (
                          <div className="insight-card insufficient-data-card">
                            <div className="insight-header">
                              <FaStethoscope className="insight-icon-data" />
                              <span>Getting Started</span>
                            </div>
                            <div className="insight-content">
                              <div className="encouragement">
                                <strong>Begin Your Analysis Journey:</strong> You're on day {currentDay} of the {currentPhase.name} phase. 
                                Start tracking your emotions daily to unlock personalized insights about your unique journey.
                              </div>
                              <div className="data-benefits">
                                <strong>What You'll Unlock:</strong>
                                <ul>
                                  <li>• Pattern recognition across emotional metrics</li>
                                  <li>• Phase-specific challenge identification</li>
                                  <li>• Predictive guidance for upcoming phases</li>
                                  <li>• Personalized strategy recommendations</li>
                                  <li>• Scientific explanations for your experiences</li>
                                </ul>
                              </div>
                            </div>
                          </div>
                        )}

                      </div>

                      {/* Analysis Quality Footer */}
                      {analysis && (
                        <div className="analysis-footer">
                          <div className="comprehensiveness-score">
                            <strong>Analysis Comprehensiveness: {analysis.comprehensivenessScore}%</strong>
                            <div className="progress-indicator">
                              <div 
                                className="progress-fill" 
                                style={{ width: `${analysis.comprehensivenessScore}%` }}
                              ></div>
                            </div>
                          </div>
                          <div className="data-quality-indicator">
                            <span className={`quality-badge ${analysis.dataQuality.level}`}>
                              {analysis.dataQuality.description}
                            </span>
                            <span className="data-points">Based on {recentData.length} days of tracking</span>
                          </div>
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

            {/* Scientific Mechanism */}
            <div className="phase-modal-section">
              <h4>{wisdomMode ? 'Energetic Mechanism' : 'Scientific Mechanism'}</h4>
              <p>{selectedPhase.scientificMechanism}</p>
            </div>

            {/* Expected Symptoms */}
            <div className="phase-modal-section">
              <h4>Expected Symptoms</h4>
              <ul>
                {selectedPhase.expectedSymptoms.map((symptom, index) => (
                  <li key={index}>{symptom}</li>
                ))}
              </ul>
            </div>

            {/* Warning Signs */}
            <div className="phase-modal-section warning-section">
              <h4>⚠️ Warning Signs (Seek Support)</h4>
              <ul>
                {selectedPhase.warningSigns.map((sign, index) => (
                  <li key={index} className="warning-item">{sign}</li>
                ))}
              </ul>
            </div>

            {/* Specific Techniques */}
            <div className="phase-modal-section">
              <h4>Specific Techniques</h4>
              <ul>
                {selectedPhase.specificTechniques.map((technique, index) => (
                  <li key={index}>{technique}</li>
                ))}
              </ul>
            </div>

            {/* Trauma Release Pattern (for Emotional Purging phase) */}
            {selectedPhase.traumaReleasePattern && (
              <div className="phase-modal-section">
                <h4>Emotional Release Timeline</h4>
                <div className="trauma-timeline">
                  <div className="trauma-stage">
                    <strong>Weeks 1-4:</strong> {selectedPhase.traumaReleasePattern.weeks1to4}
                  </div>
                  <div className="trauma-stage">
                    <strong>Months 2-3:</strong> {selectedPhase.traumaReleasePattern.months2to3}
                  </div>
                  <div className="trauma-stage">
                    <strong>Months 4-6:</strong> {selectedPhase.traumaReleasePattern.months4to6}
                  </div>
                  <div className="trauma-stage">
                    <strong>6+ Months:</strong> {selectedPhase.traumaReleasePattern.sixMonthsPlus}
                  </div>
                </div>
              </div>
            )}

            <div className="phase-modal-insight">
              <h4>{wisdomMode ? 'Spiritual Understanding' : 'Scientific Understanding'}</h4>
              <p>{wisdomMode ? selectedPhase.insights.esoteric : selectedPhase.insights.scientific}</p>
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
                placeholder="Describe your emotional state, any memories surfacing, insights gained, or experiences you're having..."
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

export default;