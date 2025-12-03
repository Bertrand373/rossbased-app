// UrgeToolkit.js - TITANTRACK MINIMAL
// Matches Landing/Stats/Calendar aesthetic
import React, { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import './UrgeToolkit.css';

// Minimal icons for triggers
import { FaBrain, FaExclamationTriangle, FaClock, FaMeh, FaHeart, 
  FaFire, FaBatteryEmpty, FaUsers, FaBolt,
  FaPlay, FaPause, FaStop } from 'react-icons/fa';

const UrgeToolkit = ({ userData, isPremium, updateUserData }) => {
  // Core States
  const [currentStep, setCurrentStep] = useState('assessment');
  const [urgeIntensity, setUrgeIntensity] = useState(0);
  const [activeProtocol, setActiveProtocol] = useState(null);
  const [selectedTrigger, setSelectedTrigger] = useState('');
  
  // Experience level detection
  const [experienceLevel, setExperienceLevel] = useState('beginner');
  
  // Session timing
  const [sessionStartTime, setSessionStartTime] = useState(null);
  const [protocolStartTime, setProtocolStartTime] = useState(null);
  const [totalActiveTime, setTotalActiveTime] = useState(0);
  const [isTimerActive, setIsTimerActive] = useState(false);
  
  // Breathing states
  const [breathingActive, setBreathingActive] = useState(false);
  const [breathingPhase, setBreathingPhase] = useState('ready');
  const [breathingCount, setBreathingCount] = useState(0);
  const [breathingTimer, setBreathingTimer] = useState(0);
  const [advancedBreathing, setAdvancedBreathing] = useState(false);
  const [showBreathingModal, setShowBreathingModal] = useState(false);
  const [breathingDuration, setBreathingDuration] = useState(4);
  
  const breathingIntervalRef = useRef(null);
  
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

  // Trigger options based on experience
  const getTriggerOptions = () => {
    const base = [
      { id: 'thoughts', label: 'Lustful Thoughts', icon: FaBrain },
      { id: 'content', label: 'Explicit Content', icon: FaExclamationTriangle },
      { id: 'stress', label: 'Stress/Anxiety', icon: FaClock },
      { id: 'boredom', label: 'Boredom', icon: FaMeh },
      { id: 'loneliness', label: 'Loneliness', icon: FaHeart },
    ];
    
    if (experienceLevel !== 'beginner') {
      base.push(
        { id: 'energy-overflow', label: 'Energy Overflow', icon: FaFire },
        { id: 'flatline', label: 'Flatline', icon: FaBatteryEmpty }
      );
    }
    
    if (experienceLevel === 'advanced') {
      base.push({ id: 'social-pressure', label: 'Social Pressure', icon: FaUsers });
    }
    
    base.push({ id: 'other', label: 'Other', icon: FaBolt });
    return base;
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
    };
  }, []);

  // Handle intensity selection
  const handleUrgeIntensity = (intensity) => {
    setUrgeIntensity(intensity);
    
    if (!sessionStartTime) setSessionStartTime(new Date());
    
    // Smart protocol suggestion
    if (intensity >= 8) {
      setActiveProtocol('breathing');
      setAdvancedBreathing(experienceLevel !== 'beginner');
    } else if (intensity >= 6) {
      setActiveProtocol(experienceLevel !== 'beginner' ? 'energy' : 'physical');
    } else if (intensity >= 4) {
      setActiveProtocol('physical');
    } else {
      setActiveProtocol('mental');
    }
    
    setTimeout(() => setCurrentStep('protocol'), 400);
  };

  // Timer functions
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

  // Breathing functions
  const completeBreathingSession = (message) => {
    setBreathingPhase('complete');
    setBreathingActive(false);
    if (breathingIntervalRef.current) clearInterval(breathingIntervalRef.current);
    stopActiveTimer();
    setShowBreathingModal(false);
    toast.success(message);
    setTimeout(() => setCurrentStep('summary'), 1000);
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

  const handleAdvancedBreathing = () => {
    setBreathingPhase(phase => {
      if (phase === 'bhastrika') {
        setBreathingTimer(15);
        setBreathingDuration(15);
        return 'hold';
      } else if (phase === 'hold') {
        setBreathingTimer(15);
        setBreathingDuration(15);
        return 'exhale';
      } else if (phase === 'exhale') {
        setBreathingCount(prev => {
          if (prev + 1 >= 3) {
            completeBreathingSession('Advanced breathing complete!');
            return prev + 1;
          }
          setBreathingTimer(30);
          setBreathingDuration(30);
          return prev + 1;
        });
        return 'bhastrika';
      }
      return phase;
    });
  };

  const handleStandardBreathing = () => {
    setBreathingPhase(phase => {
      if (phase === 'inhale') {
        setBreathingTimer(4);
        setBreathingDuration(4);
        return 'exhale';
      } else if (phase === 'exhale') {
        setBreathingCount(prev => {
          if (prev + 1 >= 10) {
            completeBreathingSession('Breathing complete!');
            return prev + 1;
          }
          setBreathingTimer(4);
          setBreathingDuration(4);
          return prev + 1;
        });
        return 'inhale';
      }
      return phase;
    });
  };

  const stopBreathing = () => {
    setBreathingActive(false);
    setBreathingPhase('ready');
    if (breathingIntervalRef.current) clearInterval(breathingIntervalRef.current);
    stopActiveTimer();
    setShowBreathingModal(false);
    setCurrentStep('summary');
  };

  // Get phase-specific tools
  const getPhaseTools = () => {
    if (experienceLevel === 'beginner') {
      if (currentDay <= 14) {
        return [
          { id: 'cold-shower', name: 'Cold Shower', action: () => toast.success('2-minute cold shower to reset nervous system') },
          { id: 'exercise', name: 'Physical Exercise', action: () => toast.success('20 push-ups or 5-minute run') },
          { id: 'environment', name: 'Change Environment', action: () => toast.success('Go outside or to a public space') }
        ];
      } else if (currentDay <= 45) {
        return [
          { id: 'journaling', name: 'Emotional Processing', action: () => toast.success('Write down what you\'re feeling') },
          { id: 'meditation', name: 'Mindfulness Practice', action: () => toast.success('5 minutes of quiet observation') },
          { id: 'support', name: 'Reach Out', action: () => toast.success('Call a friend or mentor') }
        ];
      } else {
        return [
          { id: 'creative', name: 'Creative Expression', action: () => toast.success('Channel energy into art or writing') },
          { id: 'learning', name: 'Mental Challenge', action: () => toast.success('Engage with complex material') },
          { id: 'visualization', name: 'Future Self', action: () => toast.success('Visualize your future self thanking you') }
        ];
      }
    } else if (experienceLevel === 'intermediate') {
      return [
        { id: 'energy-circulation', name: 'Microcosmic Orbit', action: () => toast.success('9 complete energy circles') },
        { id: 'cold-therapy', name: 'Extended Cold Therapy', action: () => toast.success('5+ minute cold exposure') },
        { id: 'service', name: 'Channel Into Service', action: () => toast.success('Help someone else') },
        { id: 'creative-project', name: 'Creative Project', action: () => toast.success('Continue a meaningful project') }
      ];
    } else {
      return [
        { id: 'energy-mastery', name: 'Advanced Energy Work', action: () => toast.success('Bandhas and crown chakra focus') },
        { id: 'teaching', name: 'Teach Others', action: () => toast.success('Share wisdom with someone newer') },
        { id: 'spiritual', name: 'Spiritual Practice', action: () => toast.success('Deep meditation or prayer') },
        { id: 'world-service', name: 'Global Service', action: () => toast.success('Work on humanity-serving projects') }
      ];
    }
  };

  // Log trigger
  const logTrigger = () => {
    if (selectedTrigger && updateUserData) {
      const urgeLog = {
        date: new Date(),
        intensity: urgeIntensity,
        trigger: selectedTrigger,
        protocol: activeProtocol,
        phase: currentPhase.name,
        day: currentDay,
        experienceLevel
      };
      updateUserData({ urgeLog: [...(userData.urgeLog || []), urgeLog] });
      toast.success('Session logged');
    }
  };

  // Reset session
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
    if (breathingIntervalRef.current) clearInterval(breathingIntervalRef.current);
  };

  // Steps navigation
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

  // Protocol step content
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

  return (
    <div className="urge-toolkit">
      {/* Phase Indicator */}
      <div className="ut-phase">
        <span className="ut-phase-num">{currentPhase.num}</span>
        <div className="ut-phase-info">
          <span className="ut-phase-name">{currentPhase.name}</span>
          <span className="ut-phase-detail">Day {currentDay} · {experienceLevel}</span>
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
        
        {/* Assessment Step */}
        {currentStep === 'assessment' && (
          <>
            <div className="ut-section-header">
              <h2 className="ut-section-title">How intense is this urge?</h2>
              <p className="ut-section-desc">Rate what you're experiencing right now</p>
            </div>
            
            <div className="ut-intensity">
              <div className="ut-intensity-grid">
                {[1,2,3,4,5,6,7,8,9,10].map(level => (
                  <button
                    key={level}
                    className={`ut-intensity-btn ${urgeIntensity === level ? 'active' : ''}`}
                    onClick={() => handleUrgeIntensity(level)}
                  >
                    {level}
                  </button>
                ))}
              </div>
              <div className="ut-intensity-labels">
                <span>Mild</span>
                <span>Overwhelming</span>
              </div>
            </div>
          </>
        )}

        {/* Protocol Step */}
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
                      <span className="ut-protocol-meta">
                        {activeProtocol === key && <span className="ut-protocol-rec">Recommended</span>}
                        <span className="ut-protocol-duration">{protocol.duration}</span>
                      </span>
                    </div>
                    <p className="ut-protocol-desc">{protocol.description}</p>
                  </button>
                  {index < arr.length - 1 && <div className="ut-protocol-divider" />}
                </React.Fragment>
              ))}
            </div>

            {/* Breathing Interface - Opens Modal */}
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

        {/* Tools Step */}
        {currentStep === 'tools' && (
          <>
            <div className="ut-section-header">
              <h2 className="ut-section-title">
                {experienceLevel === 'advanced' ? 'Master Tools' : 
                 experienceLevel === 'intermediate' ? 'Intermediate Tools' : 
                 'Phase Tools'}
              </h2>
              <p className="ut-section-desc">Additional techniques for your level</p>
            </div>
            
            <div className="ut-tools">
              {getPhaseTools().map((tool, index, arr) => (
                <React.Fragment key={tool.id}>
                  <div className="ut-tool">
                    <span className="ut-tool-name">{tool.name}</span>
                    <button className="ut-tool-btn" onClick={tool.action}>
                      Use
                    </button>
                  </div>
                  {index < arr.length - 1 && <div className="ut-tool-divider" />}
                </React.Fragment>
              ))}
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

        {/* Summary Step */}
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
                <span className="ut-stat-value">{protocols[activeProtocol]?.name}</span>
              </div>
              <div className="ut-stat">
                <span className="ut-stat-label">Session Time</span>
                <span className="ut-stat-value">
                  {sessionStartTime ? Math.round((new Date() - sessionStartTime) / 60000) : 0} min
                </span>
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
                className="ut-btn-ghost"
                onClick={resetSession}
              >
                Start New Session
              </button>
              <button 
                className="ut-btn-primary"
                onClick={() => {
                  logTrigger();
                  resetSession();
                }}
              >
                Complete Session
              </button>
            </div>
          </>
        )}
      </div>

      {/* BREATHING MODAL */}
      {showBreathingModal && (
        <div className="ut-breathing-overlay">
          <div className="ut-breathing-modal">
            <div className="ut-breathing-modal-header">
              <span className="ut-breathing-modal-title">
                {advancedBreathing && experienceLevel !== 'beginner' ? 'Advanced Breathing' : 'Box Breathing'}
              </span>
              <span className="ut-breathing-modal-subtitle">
                {advancedBreathing && experienceLevel !== 'beginner' ? '30s rapid · 15s hold · 15s exhale' : '4s inhale · 4s exhale'}
              </span>
            </div>

            <div className="ut-breathing-modal-body">
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

              <div className="ut-breathing-modal-info">
                {breathingActive ? (
                  <>
                    <span className="ut-breathing-phase-text">
                      {breathingPhase === 'bhastrika' ? 'RAPID BREATH' : breathingPhase.toUpperCase()}
                    </span>
                    <span className="ut-breathing-cycle-text">
                      Cycle {breathingCount + 1} of {advancedBreathing ? '3' : '10'}
                    </span>
                    <span className="ut-breathing-timer-text">{breathingTimer}</span>
                  </>
                ) : (
                  <span className="ut-breathing-phase-text">READY</span>
                )}
              </div>
            </div>

            <div className="ut-breathing-modal-footer">
              {!breathingActive ? (
                <>
                  <button className="ut-btn-ghost" onClick={() => setShowBreathingModal(false)}>
                    Cancel
                  </button>
                  <button className="ut-btn-primary" onClick={startBreathing}>
                    Start
                  </button>
                </>
              ) : (
                <button className="ut-btn-stop" onClick={stopBreathing}>
                  Stop Session
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