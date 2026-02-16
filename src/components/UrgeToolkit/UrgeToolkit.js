// UrgeToolkit.js - TITANTRACK ELITE
// Complete urge management system with guided interventions
import React, { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import './UrgeToolkit.css';
import MindProgram from './MindProgram';

// Icons
import { FaBrain, FaExclamationTriangle, FaClock, FaMeh, FaHeart, 
  FaFire, FaBatteryEmpty, FaUsers, FaBolt, FaMobile, FaUserFriends,
  FaHome, FaWineGlass, FaBed } from 'react-icons/fa';

// Body scroll lock for modals
import useBodyScrollLock from '../../hooks/useBodyScrollLock';

// UNIFIED TRIGGER SYSTEM
import { getAllTriggers } from '../../constants/triggerConstants';

// Icon mapping for triggers
const TRIGGER_ICONS = {
  FaBrain, FaExclamationTriangle, FaClock, FaMeh, FaHeart,
  FaFire, FaBatteryEmpty, FaUsers, FaBolt, FaMobile, FaUserFriends,
  FaHome, FaWineGlass, FaBed
};

// Intensity level descriptions
const INTENSITY_LABELS = {
  1: 'Barely noticeable',
  2: 'Very mild',
  3: 'Mild',
  4: 'Moderate',
  5: 'Noticeable',
  6: 'Strong',
  7: 'Very strong',
  8: 'Intense',
  9: 'Severe',
  10: 'Overwhelming'
};

// Microcosmic Orbit energy points
const ORBIT_POINTS = [
  { id: 'perineum', name: 'Hui Yin', location: 'Perineum', instruction: 'Feel energy gather at the base' },
  { id: 'tailbone', name: 'Chang Qiang', location: 'Tailbone', instruction: 'Energy rises to the coccyx' },
  { id: 'lowerback', name: 'Ming Men', location: 'Lower Back', instruction: 'Energy warms the kidney area' },
  { id: 'upperback', name: 'Ji Zhong', location: 'Upper Back', instruction: 'Energy flows up the spine' },
  { id: 'skull', name: 'Yu Zhen', location: 'Base of Skull', instruction: 'Energy reaches the jade pillow' },
  { id: 'crown', name: 'Bai Hui', location: 'Crown', instruction: 'Energy arrives at the crown' },
  { id: 'thirdeye', name: 'Yin Tang', location: 'Third Eye', instruction: 'Energy settles at the third eye' },
  { id: 'throat', name: 'Tian Tu', location: 'Throat', instruction: 'Energy descends through the throat' },
  { id: 'heart', name: 'Shan Zhong', location: 'Heart', instruction: 'Energy rests at the heart center' },
  { id: 'dantian', name: 'Qi Hai', location: 'Dan Tian', instruction: 'Energy returns below the navel' }
];

const UrgeToolkit = ({ userData, isPremium, updateUserData }) => {
  // Core States
  const [currentStep, setCurrentStep] = useState('assessment');
  const [urgeIntensity, setUrgeIntensity] = useState(0);
  const [activeProtocol, setActiveProtocol] = useState(null);
  const [recommendedProtocol, setRecommendedProtocol] = useState(null);
  const [selectedTrigger, setSelectedTrigger] = useState('');
  
  // Experience level detection
  const [experienceLevel, setExperienceLevel] = useState('beginner');
  
  // Session timing
  const [sessionStartTime, setSessionStartTime] = useState(null);
  const [protocolStartTime, setProtocolStartTime] = useState(null);
  const [totalActiveTime, setTotalActiveTime] = useState(0);
  const [isTimerActive, setIsTimerActive] = useState(false);
  
  // Breathing modal states
  const [breathingActive, setBreathingActive] = useState(false);
  const [breathingPhase, setBreathingPhase] = useState('ready');
  const [breathingCount, setBreathingCount] = useState(0);
  const [breathingTimer, setBreathingTimer] = useState(0);
  const [advancedBreathing, setAdvancedBreathing] = useState(false);
  const [showBreathingModal, setShowBreathingModal] = useState(false);
  const [breathingDuration, setBreathingDuration] = useState(4);
  
  // Orbit modal states
  const [showOrbitModal, setShowOrbitModal] = useState(false);
  const [orbitActive, setOrbitActive] = useState(false);
  const [orbitPointIndex, setOrbitPointIndex] = useState(0);
  const [orbitCycleCount, setOrbitCycleCount] = useState(0);
  const [orbitTimer, setOrbitTimer] = useState(4);
  const [orbitTargetCycles, setOrbitTargetCycles] = useState(9);
  
  // Grounding modal states
  const [showGroundingModal, setShowGroundingModal] = useState(false);
  const [groundingStep, setGroundingStep] = useState(0);
  const [groundingItems, setGroundingItems] = useState({ see: [], hear: [], touch: [], smell: [], taste: [] });
  
  // Cold timer states
  const [showColdModal, setShowColdModal] = useState(false);
  const [coldActive, setColdActive] = useState(false);
  const [coldTimer, setColdTimer] = useState(0);
  const [coldTarget, setColdTarget] = useState(120); // 2 minutes default
  
  // Refs
  const breathingIntervalRef = useRef(null);
  const orbitIntervalRef = useRef(null);
  const coldIntervalRef = useRef(null);
  
  // Lock body scroll for modals
  useBodyScrollLock(showBreathingModal || showOrbitModal || showGroundingModal || showColdModal);
  
  const currentDay = userData.currentStreak || 0;

  // Determine experience level
  useEffect(() => {
    if (currentDay <= 30) {
      setExperienceLevel('beginner');
    } else if (currentDay <= 180) {
      setExperienceLevel('intermediate');
    } else {
      setExperienceLevel('advanced');
    }
  }, [currentDay]);


  // Get current phase
  const getCurrentPhase = () => {
    if (currentDay <= 14) return { num: "01", name: "Initial Adaptation", color: "#22c55e" };
    if (currentDay <= 45) return { num: "02", name: "Emotional Processing", color: "#f59e0b" };
    if (currentDay <= 90) return { num: "03", name: "Mental Expansion", color: "#3b82f6" };
    if (currentDay <= 180) return { num: "04", name: "Spiritual Integration", color: "#8b5cf6" };
    return { num: "05", name: "Mastery & Service", color: "#ffdd00" };
  };

  const currentPhase = getCurrentPhase();

  // Get trigger options from unified constants
  const getTriggerOptions = () => {
    const triggers = getAllTriggers();
    return triggers.map(trigger => ({
      id: trigger.id,
      label: trigger.label,
      icon: TRIGGER_ICONS[trigger.icon] || FaBolt
    }));
  };

  // Protocol definitions
  const getProtocols = () => {
    const protocols = {
      breathing: {
        name: experienceLevel === 'beginner' ? "Emergency Breathing" : "Breathing Mastery",
        duration: experienceLevel === 'beginner' ? "2-3 min" : "3-5 min",
        description: experienceLevel === 'beginner' 
          ? "Physiological reset using controlled breathing"
          : "Advanced breathing with energy circulation",
        bestFor: "High intensity, anxiety, physical arousal"
      },
      mental: {
        name: experienceLevel === 'advanced' ? "Mental Transmutation" : "Mental Redirection",
        duration: "1-2 min", 
        description: "Cognitive techniques to break thought patterns",
        bestFor: "Intrusive thoughts, mental loops"
      },
      physical: {
        name: "Physical Reset",
        duration: "2-5 min",
        description: "Body-based techniques to redirect energy",
        bestFor: "Restlessness, tension, moderate urges"
      }
    };
    
    if (experienceLevel !== 'beginner') {
      protocols.energy = {
        name: "Energy Circulation",
        duration: "5-10 min",
        description: "Microcosmic orbit and energy redirection",
        bestFor: "Energy overflow, spiritual development"
      };
    }
    
    return protocols;
  };

  const protocols = getProtocols();

  // Cleanup
  useEffect(() => {
    return () => {
      if (breathingIntervalRef.current) clearInterval(breathingIntervalRef.current);
      if (orbitIntervalRef.current) clearInterval(orbitIntervalRef.current);
      if (coldIntervalRef.current) clearInterval(coldIntervalRef.current);
    };
  }, []);

  // ============================================================
  // INTENSITY & PROTOCOL SELECTION
  // ============================================================
  
  const handleUrgeIntensity = (intensity) => {
    setUrgeIntensity(intensity);
    
    if (!sessionStartTime) setSessionStartTime(new Date());
    
    // Smart protocol suggestion based on intensity and level
    let suggested;
    if (intensity >= 8) {
      suggested = 'breathing';
      setAdvancedBreathing(experienceLevel !== 'beginner');
    } else if (intensity >= 6) {
      suggested = experienceLevel !== 'beginner' ? 'energy' : 'physical';
    } else if (intensity >= 4) {
      suggested = 'physical';
    } else {
      suggested = 'mental';
    }
    
    setRecommendedProtocol(suggested);
    setActiveProtocol(suggested);
    
    setTimeout(() => setCurrentStep('protocol'), 500);
  };

  // ============================================================
  // TIMER FUNCTIONS
  // ============================================================
  
  const startActiveTimer = () => {
    if (!isTimerActive) {
      setProtocolStartTime(new Date());
      setIsTimerActive(true);
    }
  };

  const stopActiveTimer = () => {
    if (isTimerActive && protocolStartTime) {
      setTotalActiveTime(prev => prev + (new Date() - protocolStartTime) / 1000);
      setIsTimerActive(false);
      setProtocolStartTime(null);
    }
  };

  // ============================================================
  // BREATHING FUNCTIONS
  // ============================================================
  
  const completeBreathingSession = (message) => {
    setBreathingPhase('complete');
    setBreathingActive(false);
    if (breathingIntervalRef.current) clearInterval(breathingIntervalRef.current);
    stopActiveTimer();
    setShowBreathingModal(false);
    toast.success(message);
    setTimeout(() => setCurrentStep('tools'), 800);
  };

  const startBreathing = () => {
    setBreathingActive(true);
    setBreathingCount(0);
    startActiveTimer();
    
    if (advancedBreathing && experienceLevel !== 'beginner') {
      setBreathingPhase('bhastrika');
      setBreathingTimer(30);
      setBreathingDuration(30);
    } else {
      setBreathingPhase('inhale');
      setBreathingTimer(4);
      setBreathingDuration(4);
    }
    
    breathingIntervalRef.current = setInterval(() => {
      setBreathingTimer(prev => {
        if (prev <= 1) {
          setTimeout(() => {
            if (advancedBreathing && experienceLevel !== 'beginner') {
              handleAdvancedBreathing();
            } else {
              handleStandardBreathing();
            }
          }, 0);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleStandardBreathing = () => {
    setBreathingPhase(prev => {
      if (prev === 'inhale') {
        setBreathingTimer(4);
        setBreathingDuration(4);
        return 'exhale';
      } else {
        setBreathingCount(c => {
          if (c >= 9) {
            completeBreathingSession('Breathing session complete!');
            return c;
          }
          return c + 1;
        });
        setBreathingTimer(4);
        setBreathingDuration(4);
        return 'inhale';
      }
    });
  };

  const handleAdvancedBreathing = () => {
    setBreathingPhase(prev => {
      if (prev === 'bhastrika') {
        setBreathingTimer(15);
        setBreathingDuration(15);
        return 'hold';
      } else if (prev === 'hold') {
        setBreathingTimer(15);
        setBreathingDuration(15);
        return 'exhale';
      } else {
        setBreathingCount(c => {
          if (c >= 2) {
            completeBreathingSession('Advanced breathing complete!');
            return c;
          }
          return c + 1;
        });
        setBreathingTimer(30);
        setBreathingDuration(30);
        return 'bhastrika';
      }
    });
  };

  const stopBreathing = () => {
    setBreathingActive(false);
    if (breathingIntervalRef.current) clearInterval(breathingIntervalRef.current);
    stopActiveTimer();
    setShowBreathingModal(false);
    setCurrentStep('tools');
  };

  // ============================================================
  // MICROCOSMIC ORBIT FUNCTIONS
  // ============================================================
  
  const startOrbit = () => {
    setOrbitActive(true);
    setOrbitPointIndex(0);
    setOrbitCycleCount(0);
    setOrbitTimer(4);
    startActiveTimer();
    
    orbitIntervalRef.current = setInterval(() => {
      setOrbitTimer(prev => {
        if (prev <= 1) {
          setTimeout(() => advanceOrbit(), 0);
          return 4;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const advanceOrbit = () => {
    setOrbitPointIndex(prev => {
      const nextIndex = prev + 1;
      if (nextIndex >= ORBIT_POINTS.length) {
        // Completed one full cycle
        setOrbitCycleCount(cycles => {
          const newCycles = cycles + 1;
          if (newCycles >= orbitTargetCycles) {
            completeOrbit();
            return newCycles;
          }
          return newCycles;
        });
        return 0; // Reset to first point
      }
      return nextIndex;
    });
  };

  const completeOrbit = () => {
    setOrbitActive(false);
    if (orbitIntervalRef.current) clearInterval(orbitIntervalRef.current);
    stopActiveTimer();
    setShowOrbitModal(false);
    toast.success(`${orbitTargetCycles} cycles complete - energy circulated`);
    setCurrentStep('summary');
  };

  const stopOrbit = () => {
    setOrbitActive(false);
    if (orbitIntervalRef.current) clearInterval(orbitIntervalRef.current);
    stopActiveTimer();
    setShowOrbitModal(false);
  };

  // ============================================================
  // GROUNDING (5-4-3-2-1) FUNCTIONS
  // ============================================================
  
  const GROUNDING_STEPS = [
    { sense: 'see', count: 5, label: 'things you can SEE' },
    { sense: 'hear', count: 4, label: 'things you can HEAR' },
    { sense: 'touch', count: 3, label: 'things you can TOUCH' },
    { sense: 'smell', count: 2, label: 'things you can SMELL' },
    { sense: 'taste', count: 1, label: 'thing you can TASTE' }
  ];

  const advanceGrounding = () => {
    if (groundingStep < GROUNDING_STEPS.length - 1) {
      setGroundingStep(prev => prev + 1);
    } else {
      completeGrounding();
    }
  };

  const completeGrounding = () => {
    stopActiveTimer();
    setShowGroundingModal(false);
    toast.success('Grounding complete - you are present');
    setGroundingStep(0);
    setGroundingItems({ see: [], hear: [], touch: [], smell: [], taste: [] });
  };

  // ============================================================
  // COLD TIMER FUNCTIONS
  // ============================================================
  
  const startCold = () => {
    setColdActive(true);
    setColdTimer(0);
    startActiveTimer();
    
    coldIntervalRef.current = setInterval(() => {
      setColdTimer(prev => {
        if (prev >= coldTarget) {
          completeCold();
          return prev;
        }
        return prev + 1;
      });
    }, 1000);
  };

  const completeCold = () => {
    setColdActive(false);
    if (coldIntervalRef.current) clearInterval(coldIntervalRef.current);
    stopActiveTimer();
    setShowColdModal(false);
    toast.success(`${Math.floor(coldTimer / 60)}:${String(coldTimer % 60).padStart(2, '0')} of cold exposure - warrior mindset activated`);
  };

  const stopCold = () => {
    setColdActive(false);
    if (coldIntervalRef.current) clearInterval(coldIntervalRef.current);
    stopActiveTimer();
    if (coldTimer > 10) {
      toast.success(`${coldTimer}s logged - every second counts`);
    }
    setShowColdModal(false);
  };

  // ============================================================
  // TOOLS CONFIGURATION
  // ============================================================
  
  const getInteractiveTools = () => {
    const tools = [];
    
    // Microcosmic Orbit - Intermediate+
    if (experienceLevel !== 'beginner') {
      tools.push({
        id: 'orbit',
        name: 'Microcosmic Orbit',
        desc: 'Guided energy circulation',
        action: () => {
          setOrbitTargetCycles(experienceLevel === 'advanced' ? 18 : 9);
          setShowOrbitModal(true);
          startActiveTimer();
        }
      });
    }
    
    // 5-4-3-2-1 Grounding - All levels
    tools.push({
      id: 'grounding',
      name: '5-4-3-2-1 Grounding',
      desc: 'Sensory awareness technique',
      action: () => {
        setShowGroundingModal(true);
        startActiveTimer();
      }
    });
    
    // Cold Exposure Timer - All levels
    tools.push({
      id: 'cold',
      name: 'Cold Exposure',
      desc: experienceLevel === 'beginner' ? '2 min timer' : '5 min timer',
      action: () => {
        setColdTarget(experienceLevel === 'beginner' ? 120 : 300);
        setShowColdModal(true);
      }
    });
    
    return tools;
  };

  const getQuickActions = () => {
    if (experienceLevel === 'beginner') {
      return [
        'Leave your current environment',
        'Call or text a friend',
        'Do 20 push-ups or jumping jacks',
        'Splash cold water on your face'
      ];
    } else if (experienceLevel === 'intermediate') {
      return [
        'Channel energy into creative work',
        'Practice service to others',
        'Go for a run or intense workout',
        'Journal your thoughts and feelings'
      ];
    } else {
      return [
        'Teach or mentor someone',
        'Work on your mission/purpose',
        'Extended meditation practice',
        'Connect with your community'
      ];
    }
  };

  // ============================================================
  // DATA LOGGING
  // ============================================================
  
  const logTrigger = () => {
    if (selectedTrigger && updateUserData) {
      const urgeLog = {
        date: new Date(),
        intensity: urgeIntensity,
        trigger: selectedTrigger,
        protocol: activeProtocol,
        phase: currentPhase.name,
        day: currentDay,
        experienceLevel,
        sessionDuration: totalActiveTime
      };
      updateUserData({ urgeLog: [...(userData.urgeLog || []), urgeLog] });
      toast.success('Session logged - stay strong');
    }
  };

  // ============================================================
  // RESET
  // ============================================================
  
  const resetSession = () => {
    stopActiveTimer();
    setCurrentStep('assessment');
    setUrgeIntensity(0);
    setActiveProtocol(null);
    setSelectedTrigger('');
    setBreathingActive(false);
    setBreathingPhase('ready');
    setSessionStartTime(null);
    setTotalActiveTime(0);
    setBreathingCount(0);
    setBreathingTimer(0);
    setAdvancedBreathing(false);
    setOrbitActive(false);
    setOrbitPointIndex(0);
    setOrbitCycleCount(0);
    setColdActive(false);
    setColdTimer(0);
    setGroundingStep(0);
    if (breathingIntervalRef.current) clearInterval(breathingIntervalRef.current);
    if (orbitIntervalRef.current) clearInterval(orbitIntervalRef.current);
    if (coldIntervalRef.current) clearInterval(coldIntervalRef.current);
  };

  // ============================================================
  // PROTOCOL STEPS
  // ============================================================
  
  const getProtocolSteps = () => {
    if (activeProtocol === 'mental') {
      return experienceLevel === 'advanced' ? [
        'Name 5 things you can see around you',
        'Name 4 things you can hear',
        'Name 3 things you can touch',
        'Take 10 deep breaths',
        'Visualize energy moving up spine to crown'
      ] : [
        'Name 5 things you can see around you',
        'Name 4 things you can hear',
        'Name 3 things you can touch',
        'Take 10 deep breaths',
        'Recite your reasons for retention'
      ];
    } else if (activeProtocol === 'physical') {
      return [
        'Do 20 jumping jacks or push-ups',
        'Splash cold water on your face',
        'Change your physical position/location',
        'Stand straight, shoulders back',
        'Take 5 deep breaths'
      ];
    } else if (activeProtocol === 'energy') {
      return [
        'Sit with spine straight, tongue on roof of mouth',
        'Breathe energy up spine to crown (4 counts)',
        'Hold energy at crown chakra (2 counts)',
        'Breathe energy down front to abdomen (4 counts)',
        'Rest energy in dan tian below navel (2 counts)',
        'Repeat for 9 complete circles'
      ];
    }
    return [];
  };

  // Navigation
  const steps = [
    { id: 'assessment', label: 'Assess' },
    { id: 'protocol', label: 'Protocol' },
    { id: 'tools', label: 'Tools' },
    { id: 'summary', label: 'Complete' }
  ];

  const stepOrder = ['assessment', 'protocol', 'tools', 'summary'];
  const currentStepIndex = stepOrder.indexOf(currentStep);

  const canNavigateTo = (stepId) => {
    const targetIndex = stepOrder.indexOf(stepId);
    return targetIndex <= currentStepIndex;
  };

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <div className="urge-toolkit">
      {/* Mind Program — Always visible at top */}
      <MindProgram isPremium={isPremium} />

      {/* Peak State Recording — shows most recent during crisis */}
      {userData.peakRecordings && userData.peakRecordings.length > 0 && (() => {
        const latest = userData.peakRecordings[userData.peakRecordings.length - 1];
        return (
          <div className="ut-peak-recording">
            <div className="ut-peak-signal">YOUR TRANSMISSION</div>
            <div className="ut-peak-meta">Day {latest.streakDay} · {new Date(latest.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
            <p className="ut-peak-message">{latest.message}</p>
          </div>
        );
      })()}

      {/* Urge Intervention Section */}
      <div className="ut-intervention-label">URGE INTERVENTION</div>

      {/* Phase Indicator */}
      <div className="ut-phase">
        <span className="ut-phase-num">{currentPhase.num}</span>
        <div className="ut-phase-info">
          <span className="ut-phase-name">{currentPhase.name}</span>
          <span className="ut-phase-detail">Day {currentDay} · {experienceLevel.charAt(0).toUpperCase() + experienceLevel.slice(1)} Tools</span>
        </div>
      </div>

      {/* Step Navigation */}
      <nav className="ut-steps">
        {steps.map((step, index) => (
          <React.Fragment key={step.id}>
            <button
              className={`ut-step ${currentStep === step.id ? 'active' : ''}`}
              onClick={() => canNavigateTo(step.id) && setCurrentStep(step.id)}
              disabled={!canNavigateTo(step.id)}
            >
              {step.label}
            </button>
            {index < steps.length - 1 && <div className="ut-step-divider" />}
          </React.Fragment>
        ))}
      </nav>

      {/* Content */}
      <div className="ut-content">
        
        {/* ================================================================
            ASSESSMENT STEP
            ================================================================ */}
        {currentStep === 'assessment' && (
          <>
            <div className="ut-section-header">
              <h2 className="ut-section-title">How intense is this urge?</h2>
              <p className="ut-section-desc">
                {urgeIntensity > 0 ? INTENSITY_LABELS[urgeIntensity] : 'Select your current level'}
              </p>
            </div>
            
            <div className="ut-intensity">
              <div className="ut-intensity-scale">
                {[1,2,3,4,5,6,7,8,9,10].map(level => (
                  <button
                    key={level}
                    className={`ut-intensity-btn ${urgeIntensity === level ? 'selected' : ''}`}
                    onClick={() => handleUrgeIntensity(level)}
                  >
                    <span className="ut-intensity-num">{level}</span>
                  </button>
                ))}
              </div>
              <div className="ut-intensity-labels">
                <span>Mild</span>
                <span>Severe</span>
              </div>
            </div>
          </>
        )}

        {/* ================================================================
            PROTOCOL STEP
            ================================================================ */}
        {currentStep === 'protocol' && (
          <>
            <div className="ut-section-header">
              <h2 className="ut-section-title">Select Protocol</h2>
              <p className="ut-section-desc">Choose your intervention strategy</p>
            </div>
            
            <div className="ut-protocols">
              {Object.entries(protocols).map(([key, protocol], index, arr) => (
                <React.Fragment key={key}>
                  <button
                    className={`ut-protocol ${activeProtocol === key ? 'active' : ''}`}
                    onClick={() => setActiveProtocol(key)}
                  >
                    <div className="ut-protocol-main">
                      <span className="ut-protocol-name">{protocol.name}</span>
                      <div className="ut-protocol-meta">
                        {recommendedProtocol === key && <span className="ut-protocol-rec">Recommended</span>}
                        <span className="ut-protocol-duration">{protocol.duration}</span>
                      </div>
                    </div>
                    <p className="ut-protocol-desc">{protocol.description}</p>
                  </button>
                  {index < arr.length - 1 && <div className="ut-protocol-divider" />}
                </React.Fragment>
              ))}
            </div>

            {/* Breathing Protocol */}
            {activeProtocol === 'breathing' && (
              <div className="ut-breathing-trigger">
                <div className="ut-breathing-info-card">
                  <span className="ut-breathing-title">
                    {advancedBreathing && experienceLevel !== 'beginner' ? 'Advanced Breathing' : 'Box Breathing'}
                  </span>
                  <span className="ut-breathing-desc">
                    {advancedBreathing && experienceLevel !== 'beginner' 
                      ? 'Bhastrika + retention for energy transmutation' 
                      : '4-4-4-4 pattern for calm and focus'}
                  </span>
                </div>
                
                {experienceLevel !== 'beginner' && (
                  <div className="ut-breathing-modes">
                    <button
                      className={`ut-mode-btn ${!advancedBreathing ? 'active' : ''}`}
                      onClick={() => setAdvancedBreathing(false)}
                    >
                      Standard
                    </button>
                    <span className="ut-mode-divider" />
                    <button
                      className={`ut-mode-btn ${advancedBreathing ? 'active' : ''}`}
                      onClick={() => setAdvancedBreathing(true)}
                    >
                      Advanced
                    </button>
                  </div>
                )}
                
                <button className="ut-btn-primary" onClick={() => setShowBreathingModal(true)}>
                  Begin Session
                </button>
              </div>
            )}

            {/* Other Protocol Steps */}
            {(activeProtocol === 'mental' || activeProtocol === 'physical' || activeProtocol === 'energy') && (
              <>
                <div className="ut-protocol-steps">
                  <div className="ut-steps-header">{protocols[activeProtocol].name}</div>
                  <div className="ut-steps-list">
                    {getProtocolSteps().map((step, index) => (
                      <div key={index} className="ut-step-item">
                        <span className="ut-step-num">{String(index + 1).padStart(2, '0')}</span>
                        <span className="ut-step-text">{step}</span>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="ut-actions">
                  <button 
                    className="ut-btn-primary"
                    onClick={() => {
                      startActiveTimer();
                      setCurrentStep('tools');
                    }}
                  >
                    I've Completed This
                  </button>
                </div>
              </>
            )}
          </>
        )}

        {/* ================================================================
            TOOLS STEP
            ================================================================ */}
        {currentStep === 'tools' && (
          <>
            <div className="ut-section-header">
              <h2 className="ut-section-title">Additional Tools</h2>
              <p className="ut-section-desc">Interactive techniques to reinforce your progress</p>
            </div>
            
            {/* Interactive Tools */}
            <div className="ut-interactive-tools">
              <div className="ut-tools-label">Guided Practices</div>
              {getInteractiveTools().map((tool, index, arr) => (
                <React.Fragment key={tool.id}>
                  <button className="ut-interactive-tool" onClick={tool.action}>
                    <div className="ut-tool-info">
                      <span className="ut-tool-name">{tool.name}</span>
                      <span className="ut-tool-desc">{tool.desc}</span>
                    </div>
                    <span className="ut-tool-arrow">→</span>
                  </button>
                  {index < arr.length - 1 && <div className="ut-tool-divider" />}
                </React.Fragment>
              ))}
            </div>
            
            {/* Quick Actions */}
            <div className="ut-quick-actions">
              <div className="ut-tools-label">Quick Actions</div>
              <div className="ut-quick-list">
                {getQuickActions().map((action, index) => (
                  <div key={index} className="ut-quick-item">
                    <span className="ut-quick-bullet">•</span>
                    <span className="ut-quick-text">{action}</span>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="ut-actions">
              <button 
                className="ut-btn-primary"
                onClick={() => {
                  stopActiveTimer();
                  setCurrentStep('summary');
                }}
              >
                Continue to Summary
              </button>
            </div>
          </>
        )}

        {/* ================================================================
            SUMMARY STEP
            ================================================================ */}
        {currentStep === 'summary' && (
          <>
            <div className="ut-section-header">
              <h2 className="ut-section-title">Session Complete</h2>
              <p className="ut-section-desc">What triggered this urge?</p>
            </div>
            
            <div className="ut-triggers">
              <div className="ut-triggers-label">Select Trigger</div>
              <div className="ut-triggers-list">
                {getTriggerOptions().map((trigger, index, arr) => (
                  <React.Fragment key={trigger.id}>
                    <button
                      className={`ut-trigger ${selectedTrigger === trigger.id ? 'selected' : ''}`}
                      onClick={() => setSelectedTrigger(trigger.id)}
                    >
                      <span>{trigger.label}</span>
                      {selectedTrigger === trigger.id && <span className="ut-trigger-check">✓</span>}
                    </button>
                    {index < arr.length - 1 && <div className="ut-trigger-divider" />}
                  </React.Fragment>
                ))}
              </div>
            </div>
            
            <div className="ut-stats">
              <div className="ut-stat">
                <span className="ut-stat-label">Intensity</span>
                <span className="ut-stat-value">{urgeIntensity}/10</span>
              </div>
              <div className="ut-stat">
                <span className="ut-stat-label">Protocol</span>
                <span className="ut-stat-value">{protocols[activeProtocol]?.name || 'None'}</span>
              </div>
              <div className="ut-stat">
                <span className="ut-stat-label">Active Time</span>
                <span className="ut-stat-value">
                  {Math.floor(totalActiveTime / 60)}m {Math.round(totalActiveTime % 60)}s
                </span>
              </div>
            </div>
            
            <div className="ut-actions">
              <button 
                className="ut-btn-primary"
                onClick={() => {
                  logTrigger();
                  resetSession();
                }}
              >
                Complete Session
              </button>
              <button 
                className="ut-btn-ghost"
                onClick={resetSession}
              >
                Start New Session
              </button>
            </div>
          </>
        )}
      </div>

      {/* ================================================================
          BREATHING MODAL
          ================================================================ */}
      {showBreathingModal && (
        <div className="ut-modal-overlay">
          <div className="ut-modal">
            <div className="ut-modal-header">
              <span className="ut-modal-title">
                {advancedBreathing && experienceLevel !== 'beginner' ? 'Advanced Breathing' : 'Box Breathing'}
              </span>
              <span className="ut-modal-subtitle">
                {advancedBreathing && experienceLevel !== 'beginner' 
                  ? '30s rapid · 15s hold · 15s exhale' 
                  : '4s inhale · 4s exhale'}
              </span>
            </div>

            <div className="ut-modal-body">
              <div className="ut-breathing-circle">
                <div 
                  className={`ut-breathing-orb ${
                    breathingPhase === 'inhale' ? 'inhale' :
                    breathingPhase === 'exhale' ? 'exhale' :
                    breathingPhase === 'hold' ? 'hold' :
                    breathingPhase === 'bhastrika' ? 'rapid' : ''
                  }`}
                  style={{ '--breath-duration': `${breathingDuration}s` }}
                />
              </div>

              <div className="ut-modal-info">
                {breathingActive ? (
                  <>
                    <span className="ut-modal-phase">
                      {breathingPhase === 'bhastrika' ? 'RAPID BREATH' : breathingPhase.toUpperCase()}
                    </span>
                    <span className="ut-modal-cycle">
                      Cycle {breathingCount + 1} of {advancedBreathing ? '3' : '10'}
                    </span>
                    <span className="ut-modal-timer">{breathingTimer}</span>
                  </>
                ) : (
                  <span className="ut-modal-phase">READY</span>
                )}
              </div>
            </div>

            <div className="ut-modal-footer">
              {!breathingActive ? (
                <>
                  <button className="ut-btn-primary" onClick={startBreathing}>
                    Start
                  </button>
                  <button className="ut-btn-ghost" onClick={() => setShowBreathingModal(false)}>
                    Cancel
                  </button>
                </>
              ) : (
                <button className="ut-btn-stop" onClick={stopBreathing}>
                  End Session
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ================================================================
          MICROCOSMIC ORBIT MODAL
          ================================================================ */}
      {showOrbitModal && (
        <div className="ut-modal-overlay">
          <div className="ut-modal ut-orbit-modal">
            <div className="ut-modal-header">
              <span className="ut-modal-title">Microcosmic Orbit</span>
              <span className="ut-modal-subtitle">
                {orbitTargetCycles} cycles · Tongue on roof of mouth
              </span>
            </div>

            <div className="ut-modal-body">
              {/* Abstract Energy Circuit - Premium Design */}
              <div className="ut-orbit-visual">
                <svg className="ut-orbit-figure" viewBox="0 0 320 400">
                  
                  {/* Circuit path - subtle connecting line */}
                  <path
                    className="ut-circuit-path"
                    d="M160 340
                       C160 340 200 330 205 280
                       C210 250 218 230 218 210
                       C218 190 218 170 218 150
                       C218 120 210 100 205 95
                       C195 85 175 50 160 50
                       C145 50 125 85 115 95
                       C110 100 102 120 102 150
                       C102 170 102 190 102 210
                       C102 230 110 250 115 280
                       C120 330 160 340 160 340"
                    fill="none"
                    stroke="rgba(255,255,255,0.08)"
                    strokeWidth="1"
                  />
                  
                  {/* Direction indicators - subtle arrows */}
                  <text x="225" y="195" className="ut-circuit-direction">↑</text>
                  <text x="88" y="195" className="ut-circuit-direction">↓</text>
                  
                  {/* Energy points and labels */}
                  {(() => {
                    const points = [
                      { x: 160, y: 340, label: 'PERINEUM', labelX: 160, labelY: 370, align: 'center' },
                      { x: 205, y: 295, label: 'TAILBONE', labelX: 240, labelY: 300, align: 'left' },
                      { x: 218, y: 235, label: 'LOWER BACK', labelX: 240, labelY: 240, align: 'left' },
                      { x: 218, y: 175, label: 'UPPER BACK', labelX: 240, labelY: 180, align: 'left' },
                      { x: 205, y: 115, label: 'BASE OF SKULL', labelX: 240, labelY: 120, align: 'left' },
                      { x: 160, y: 50, label: 'CROWN', labelX: 160, labelY: 28, align: 'center' },
                      { x: 115, y: 95, label: 'THIRD EYE', labelX: 80, labelY: 100, align: 'right' },
                      { x: 102, y: 150, label: 'THROAT', labelX: 80, labelY: 155, align: 'right' },
                      { x: 102, y: 210, label: 'HEART', labelX: 80, labelY: 215, align: 'right' },
                      { x: 115, y: 280, label: 'DAN TIAN', labelX: 80, labelY: 285, align: 'right' }
                    ];
                    
                    return points.map((point, index) => {
                      const isActive = index === orbitPointIndex && orbitActive;
                      const isPassed = orbitActive && (index < orbitPointIndex || orbitCycleCount > 0);
                      
                      return (
                        <g key={index}>
                          {/* Glow effect for active point */}
                          {isActive && (
                            <>
                              <circle
                                cx={point.x}
                                cy={point.y}
                                r="20"
                                className="ut-circuit-glow-outer"
                              />
                              <circle
                                cx={point.x}
                                cy={point.y}
                                r="12"
                                className="ut-circuit-glow-inner"
                              />
                            </>
                          )}
                          
                          {/* Point marker */}
                          <circle
                            cx={point.x}
                            cy={point.y}
                            r={isActive ? 8 : 4}
                            className={`ut-circuit-point ${isActive ? 'active' : ''} ${isPassed ? 'passed' : ''}`}
                          />
                          
                          {/* Label */}
                          <text
                            x={point.labelX}
                            y={point.labelY}
                            textAnchor={point.align === 'center' ? 'middle' : point.align === 'right' ? 'end' : 'start'}
                            className={`ut-circuit-label ${isActive ? 'active' : ''} ${isPassed ? 'passed' : ''}`}
                          >
                            {point.label}
                          </text>
                        </g>
                      );
                    });
                  })()}
                  
                  {/* Channel labels */}
                  <text x="245" y="55" className="ut-circuit-channel">BACK</text>
                  <text x="245" y="70" className="ut-circuit-channel-sub">(Ascending)</text>
                  <text x="75" y="55" className="ut-circuit-channel" textAnchor="end">FRONT</text>
                  <text x="75" y="70" className="ut-circuit-channel-sub" textAnchor="end">(Descending)</text>
                </svg>
              </div>

              <div className="ut-modal-info">
                {orbitActive ? (
                  <>
                    <span className="ut-modal-phase">{ORBIT_POINTS[orbitPointIndex].location.toUpperCase()}</span>
                    <span className="ut-orbit-instruction">{ORBIT_POINTS[orbitPointIndex].instruction}</span>
                    <span className="ut-modal-cycle">
                      Cycle {orbitCycleCount + 1} of {orbitTargetCycles}
                    </span>
                    <span className="ut-modal-timer">{orbitTimer}</span>
                  </>
                ) : (
                  <>
                    <span className="ut-modal-phase">READY</span>
                    <span className="ut-orbit-instruction">Sit comfortably with spine straight, tongue on roof of mouth</span>
                  </>
                )}
              </div>
            </div>

            <div className="ut-modal-footer">
              {!orbitActive ? (
                <>
                  <button className="ut-btn-primary" onClick={startOrbit}>
                    Begin
                  </button>
                  <button className="ut-btn-ghost" onClick={() => setShowOrbitModal(false)}>
                    Cancel
                  </button>
                </>
              ) : (
                <button className="ut-btn-stop" onClick={stopOrbit}>
                  End Session
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ================================================================
          GROUNDING MODAL
          ================================================================ */}
      {showGroundingModal && (
        <div className="ut-modal-overlay">
          <div className="ut-modal">
            <div className="ut-modal-header">
              <span className="ut-modal-title">5-4-3-2-1 Grounding</span>
              <span className="ut-modal-subtitle">Anchor yourself in the present moment</span>
            </div>

            <div className="ut-modal-body">
              <div className="ut-grounding-progress">
                {GROUNDING_STEPS.map((step, index) => (
                  <div 
                    key={step.sense}
                    className={`ut-grounding-dot ${index < groundingStep ? 'complete' : ''} ${index === groundingStep ? 'active' : ''}`}
                  >
                    {step.count}
                  </div>
                ))}
              </div>

              <div className="ut-modal-info">
                <span className="ut-modal-phase">
                  Name {GROUNDING_STEPS[groundingStep].count}
                </span>
                <span className="ut-grounding-label">
                  {GROUNDING_STEPS[groundingStep].label}
                </span>
              </div>
            </div>

            <div className="ut-modal-footer">
              <button className="ut-btn-primary" onClick={advanceGrounding}>
                {groundingStep < GROUNDING_STEPS.length - 1 ? 'Next' : 'Complete'}
              </button>
              <button className="ut-btn-ghost" onClick={() => {
                setShowGroundingModal(false);
                setGroundingStep(0);
              }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================
          COLD EXPOSURE MODAL
          ================================================================ */}
      {showColdModal && (
        <div className="ut-modal-overlay">
          <div className="ut-modal">
            <div className="ut-modal-header">
              <span className="ut-modal-title">Cold Exposure</span>
              <span className="ut-modal-subtitle">
                Target: {Math.floor(coldTarget / 60)}:{String(coldTarget % 60).padStart(2, '0')}
              </span>
            </div>

            <div className="ut-modal-body">
              <div className="ut-cold-ring">
                <svg className="ut-cold-progress" viewBox="0 0 100 100">
                  <circle 
                    className="ut-cold-track" 
                    cx="50" cy="50" r="45"
                  />
                  <circle 
                    className="ut-cold-fill" 
                    cx="50" cy="50" r="45"
                    style={{ 
                      strokeDashoffset: 283 - (283 * Math.min(coldTimer / coldTarget, 1))
                    }}
                  />
                </svg>
                <div className="ut-cold-time">
                  {Math.floor(coldTimer / 60)}:{String(coldTimer % 60).padStart(2, '0')}
                </div>
              </div>

              <div className="ut-modal-info">
                {coldActive ? (
                  <span className="ut-cold-message">
                    {coldTimer < 30 ? 'Embrace the cold' : 
                     coldTimer < 60 ? 'Stay with it' :
                     coldTimer < 90 ? 'You are in control' :
                     'Warrior mindset'}
                  </span>
                ) : (
                  <span className="ut-cold-message">Start when you're under cold water</span>
                )}
              </div>
            </div>

            <div className="ut-modal-footer">
              {!coldActive ? (
                <>
                  <button className="ut-btn-primary" onClick={startCold}>
                    Start Timer
                  </button>
                  <button className="ut-btn-ghost" onClick={() => setShowColdModal(false)}>
                    Cancel
                  </button>
                </>
              ) : (
                <button className="ut-btn-stop" onClick={stopCold}>
                  End Exposure
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UrgeToolkit;