// components/EmotionalTimeline/EmotionalTimelineUtils.js - Utility Functions and Data
import { differenceInDays } from 'date-fns';
import { FaMapSigns, FaLightbulb, FaHeart, FaBrain, FaLeaf, FaTrophy } from 'react-icons/fa';

// WORLD-CLASS: Enhanced phase definitions with scientific backing from the guide
export const emotionalPhases = [
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
export const masteryLevels = [
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

// Get current phase based on day
export const getCurrentPhase = (currentDay, phases = emotionalPhases) => {
  if (currentDay <= 0) return null;
  
  for (const phase of phases) {
    if (currentDay >= phase.startDay && (phase.endDay === 999999 || currentDay <= phase.endDay)) {
      return phase;
    }
  }
  
  return phases[0];
};

// Get current mastery level
export const getCurrentMasteryLevel = (currentDay, levels = masteryLevels) => {
  if (currentDay < 181) return null;
  
  for (const level of levels) {
    if (currentDay >= level.startDay && currentDay <= level.endDay) {
      return level;
    }
  }
  
  return levels[levels.length - 1];
};

// Calculate progress percentage with mastery level support
export const getPhaseProgress = (phase, currentDay, masteryLevel = null) => {
  if (!phase || currentDay <= 0) return 0;
  
  if (phase.startDay === 181) {
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
export const getPhaseProgressText = (phase, currentDay, masteryLevel = null) => {
  if (!phase || currentDay <= 0) return "";
  
  if (phase.startDay === 181) {
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

// Get phase-specific journal prompt from the guide
export const getPhaseJournalPrompt = (currentPhase) => {
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

// WORLD-CLASS: Advanced phase analysis system matching Stats complexity
export const generateComprehensivePhaseAnalysis = (currentPhase, currentDay, userData, wisdomMode, isPremium) => {
  if (!currentPhase || !isPremium) return null;

  const emotionalData = userData.emotionalTracking || [];
  const recentData = emotionalData.filter(entry => 
    differenceInDays(new Date(), new Date(entry.date)) <= 14
  );

  // Data quality assessment
  const dataQuality = getDataQuality(recentData.length);
  
  // Multi-layered analysis
  const analysis = {
    phaseEducation: generatePhaseEducationInsight(currentPhase, currentDay, wisdomMode),
    dataAnalysis: generateDataPatternAnalysis(recentData),
    challengeIdentification: generateChallengeAnalysis(currentPhase, recentData),
    predictiveGuidance: generatePredictiveGuidance(currentPhase, currentDay),
    scientificExplanation: generateScientificExplanation(currentPhase, wisdomMode),
    actionableStrategies: generateActionableStrategies(currentPhase, recentData)
  };

  return {
    ...analysis,
    dataQuality,
    comprehensivenessScore: calculateComprehensiveness(analysis, recentData.length)
  };
};

// WORLD-CLASS: Phase-specific education based on guide knowledge
const generatePhaseEducationInsight = (currentPhase, currentDay, wisdomMode) => {
  if (!currentPhase) return null;

  const dayInPhase = currentDay - currentPhase.startDay + 1;
  const phaseProgress = ((currentDay - currentPhase.startDay) / (currentPhase.endDay - currentPhase.startDay + 1)) * 100;

  // Phase-specific educational content from the guide
  const educationalContent = {
    1: { // Initial Adaptation
      earlyPhase: `Days 1-7: Foundation Phase - Your hypothalamic-pituitary axis is beginning hormonal rebalancing. Testosterone stabilization causes energy fluctuations.`,
      midPhase: `Days 8-14: Adjustment Phase - Seminal vesicles reducing overproduction. First strength gains and posture improvements emerge naturally.`,
      keyLearning: "Understanding urge waves: Sexual thoughts trigger dopamine release expecting ejaculatory reward. Each resistance strengthens prefrontal cortex control.",
      whatToExpect: `Expect strong urges and restlessness as your body adapts. This is completely normal brain rewiring.`
    },
    2: { // Emotional Purging  
      earlyPhase: `Days 15-30: Emotional Flooding Begins - Without ejaculation's endorphin numbing, suppressed emotions MUST surface. This is healing, not pathology.`,
      midPhase: `Days 31-45: Deep Purging Intensifies - Past relationship trauma and betrayals surface for processing. Your psyche is courageously healing itself.`,
      keyLearning: "Trauma-energy connection: Sexual activity was unconsciously medicating emotional pain. Retention forces proper emotional processing.",
      whatToExpect: `Expect intense mood swings and emotional rawness. Decades of suppressed content is releasing.`
    },
    3: { // Mental Expansion
      earlyPhase: `Days 46-60: Cognitive Emergence - Retained nutrients (lecithin, zinc, B12) rebuild nerve sheaths. Mental fog lifts permanently.`,
      midPhase: `Days 61-90: Intellectual Peak - Brain tissue becomes more densely connected. Pattern recognition and strategic thinking expand dramatically.`,
      keyLearning: "Neuroplasticity advantage: Higher zinc and B-vitamin availability optimizes neurotransmitter synthesis for peak mental performance.",
      whatToExpect: `Expect enhanced focus and problem-solving abilities. Your brain is operating at higher efficiency.`
    },
    4: { // Spiritual Integration
      earlyPhase: `Days 91-120: Integration Deepens - Complete endocrine rebalancing. Nervous system optimizes for retention, not ejaculation.`,
      midPhase: `Days 121-180: Mastery Emergence - Natural charisma and leadership qualities develop. Others unconsciously sense your increased presence.`,
      keyLearning: "Electromagnetic field changes: Retained practitioners show brighter, more extensive energy fields detectable by sensitive individuals.",
      whatToExpect: `Expect natural leadership abilities and magnetic presence. You're embodying refined energy.`
    },
    5: { // Mastery & Service
      earlyPhase: `Day ${currentDay}: Avatar Consciousness - Sexual energy permanently redirected upward. 'Ojas' accumulation creates sustained expanded awareness.`,
      midPhase: `Advanced Mastery: You demonstrate peak human potential through disciplined energy management. Others seek your wisdom naturally.`,
      keyLearning: "Permanent neuroplastic changes: Brain imaging would show enhanced connectivity between self-control and higher cognition regions.",
      whatToExpect: `You now inspire others through your living example of human potential. Your presence teaches.`
    }
  };

  const content = educationalContent[currentPhase.id];
  if (!content) return null;

  return {
    phaseOverview: dayInPhase <= 7 ? content.earlyPhase : content.midPhase,
    keyLearning: content.keyLearning,
    expectation: content.whatToExpect,
    mechanismExplanation: currentPhase.scientificMechanism,
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
  // This would need access to current phase - simplified for now
  const generalExpected = {
    expectedAnxiety: [3, 7],
    expectedMood: [4, 8],
    expectedClarity: [4, 8],
    expectedProcessing: [4, 8]
  };

  const isWithinRange = (value, range) => value >= range[0] && value <= range[1];

  const alignment = {
    anxiety: isWithinRange(anxiety, generalExpected.expectedAnxiety),
    mood: isWithinRange(mood, generalExpected.expectedMood),
    clarity: isWithinRange(clarity, generalExpected.expectedClarity),
    processing: isWithinRange(processing, generalExpected.expectedProcessing)
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
const generateChallengeAnalysis = (currentPhase, recentData) => {
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
        severity: getSeverity(avgData, key)
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
const generatePredictiveGuidance = (currentPhase, currentDay) => {
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
const generateScientificExplanation = (currentPhase, wisdomMode) => {
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
const generateActionableStrategies = (currentPhase, recentData) => {
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