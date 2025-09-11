// components/UrgeToolkit/UrgeToolkit.js - FINAL: Clean pill-shaped phase indicator with seamless circular icon
import React, { useState, useEffect, useRef } from 'react';
import { format, differenceInDays } from 'date-fns';
import toast from 'react-hot-toast';
import './UrgeToolkit.css';

// Icons - Simplified set
import { FaShieldAlt, FaExclamationTriangle, FaBolt, FaBrain, FaHeart, 
  FaPlay, FaPause, FaStop, FaCheckCircle, 
  FaTimes, FaInfoCircle, FaStopwatch, FaLeaf, FaLightbulb, FaTrophy } from 'react-icons/fa';

// Additional icons for enhanced features
import { FaFire, FaWind, FaUsers, FaBatteryEmpty } from 'react-icons/fa';

const UrgeToolkit = ({ userData, isPremium, updateUserData }) => {
  // Core States - Simplified
  const [currentStep, setCurrentStep] = useState('assessment'); // assessment, protocol, tools, summary
  const [urgeIntensity, setUrgeIntensity] = useState(0);
  const [activeProtocol, setActiveProtocol] = useState(null);
  const [selectedTrigger, setSelectedTrigger] = useState('');
  
  // ENHANCED: Experience level detection
  const [experienceLevel, setExperienceLevel] = useState('beginner');
  
  // FIXED: Proper session timing
  const [sessionStartTime, setSessionStartTime] = useState(null);
  const [protocolStartTime, setProtocolStartTime] = useState(null);
  const [totalActiveTime, setTotalActiveTime] = useState(0);
  const [isTimerActive, setIsTimerActive] = useState(false);
  
  // ENHANCED: Advanced breathing protocol states
  const [breathingActive, setBreathingActive] = useState(false);
  const [breathingPhase, setBreathingPhase] = useState('ready'); // ready, inhale, exhale, bhastrika, hold, complete
  const [breathingCount, setBreathingCount] = useState(0);
  const [breathingTimer, setBreathingTimer] = useState(0);
  const [advancedBreathing, setAdvancedBreathing] = useState(false);
  
  // Timer ref
  const breathingIntervalRef = useRef(null);
  
  // FIXED: Use current streak instead of calculated difference
  const currentDay = userData.currentStreak || 0;

  // ENHANCED: Determine experience level based on streak
  useEffect(() => {
    if (currentDay <= 30) {
      setExperienceLevel('beginner');
    } else if (currentDay <= 180) {
      setExperienceLevel('intermediate');
    } else {
      setExperienceLevel('advanced');
    }
  }, [currentDay]);

  // Get current phase info (matching Timeline exactly)
  const getCurrentPhase = () => {
    if (currentDay <= 14) {
      return { name: "Initial Adaptation", icon: FaLeaf, color: "#22c55e" };
    } else if (currentDay <= 45) {
      return { name: "Emotional Purging", icon: FaHeart, color: "#f59e0b" };
    } else if (currentDay <= 90) {
      return { name: "Mental Expansion", icon: FaBrain, color: "#3b82f6" };
    } else if (currentDay <= 180) {
      return { name: "Spiritual Integration", icon: FaLightbulb, color: "#8b5cf6" };
    } else {
      return { name: "Mastery & Service", icon: FaTrophy, color: "#ffdd00" };
    }
  };

  const currentPhase = getCurrentPhase();

  // ENHANCED: Intelligent trigger options based on experience level
  const getTriggerOptions = () => {
    const baseTriggers = [
      { id: 'thoughts', label: 'Lustful Thoughts', icon: FaBrain },
      { id: 'content', label: 'Explicit Content', icon: FaExclamationTriangle },
      { id: 'stress', label: 'Stress/Anxiety', icon: FaStopwatch },
      { id: 'boredom', label: 'Boredom', icon: FaInfoCircle },
      { id: 'loneliness', label: 'Loneliness', icon: FaHeart },
    ];

    // Add experience-specific triggers
    if (experienceLevel === 'intermediate' || experienceLevel === 'advanced') {
      baseTriggers.push(
        { id: 'energy-overflow', label: 'Energy Overflow (Feeling Wired)', icon: FaFire },
        { id: 'flatline', label: 'Flatline Depression', icon: FaBatteryEmpty }
      );
    }

    if (experienceLevel === 'advanced') {
      baseTriggers.push(
        { id: 'social-pressure', label: 'Social Pressure/Undermining', icon: FaUsers }
      );
    }

    baseTriggers.push({ id: 'other', label: 'Other Trigger', icon: FaBolt });
    
    return baseTriggers;
  };

  const triggerOptions = getTriggerOptions();

  // ENHANCED: Smart protocol definitions based on experience level
  const getProtocols = () => {
    const baseProtocols = {
      breathing: {
        name: experienceLevel === 'beginner' ? "Emergency Breathing" : "Breathing Mastery",
        duration: experienceLevel === 'beginner' ? "2-3 minutes" : "3-5 minutes",
        description: experienceLevel === 'beginner' 
          ? "Physiological reset using controlled breathing"
          : "Advanced breathing with energy circulation",
        bestFor: "High intensity urges, anxiety, physical arousal, energy overflow"
      },
      mental: {
        name: experienceLevel === 'advanced' ? "Mental Transmutation" : "Mental Redirection",
        duration: "1-2 minutes", 
        description: experienceLevel === 'advanced'
          ? "Advanced cognitive techniques and energy redirection"
          : "Cognitive techniques to break thought patterns",
        bestFor: "Intrusive thoughts, mental loops, mild urges"
      },
      physical: {
        name: "Physical Reset",
        duration: "2-5 minutes",
        description: "Body-based techniques to redirect energy",
        bestFor: "Restlessness, physical tension, moderate urges"
      }
    };

    // Add advanced protocol for experienced users
    if (experienceLevel === 'intermediate' || experienceLevel === 'advanced') {
      baseProtocols.energy = {
        name: "Energy Circulation",
        duration: "5-10 minutes",
        description: "Microcosmic orbit and energy redirection techniques",
        bestFor: "Energy overflow, flatlines, spiritual development"
      };
    }

    return baseProtocols;
  };

  const protocols = getProtocols();

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (breathingIntervalRef.current) clearInterval(breathingIntervalRef.current);
    };
  }, []);

  // ENHANCED: Handle intensity selection with smart protocol suggestions
  const handleUrgeIntensity = (intensity) => {
    try {
      setUrgeIntensity(intensity);
      
      // FIXED: Start session timing when user actually begins
      if (!sessionStartTime) {
        setSessionStartTime(new Date());
      }
      
      // ENHANCED: Smart protocol suggestions based on intensity and experience
      if (intensity >= 8) {
        setActiveProtocol('breathing');
        setAdvancedBreathing(experienceLevel !== 'beginner');
        toast.success(`Emergency ${experienceLevel !== 'beginner' ? 'advanced ' : ''}breathing recommended`);
      } else if (intensity >= 6) {
        if (experienceLevel !== 'beginner') {
          setActiveProtocol('energy');
          toast.success('Energy circulation recommended for overflow');
        } else {
          setActiveProtocol('physical');
          toast.success('Physical reset recommended');
        }
      } else if (intensity >= 4) {
        setActiveProtocol('physical');
        toast.success('Physical reset should help');
      } else {
        setActiveProtocol('mental');
        toast.success('Mental redirection recommended');
      }
      
      // Auto-progress to protocol selection
      setTimeout(() => setCurrentStep('protocol'), 500);
      
    } catch (error) {
      console.error('Error handling intensity:', error);
      toast.error('Error setting intensity level');
    }
  };

  // FIXED: Start/stop active timing
  const startActiveTimer = () => {
    if (!isTimerActive) {
      setProtocolStartTime(new Date());
      setIsTimerActive(true);
    }
  };

  const stopActiveTimer = () => {
    if (isTimerActive && protocolStartTime) {
      const timeSpent = (new Date() - protocolStartTime) / 1000; // seconds
      setTotalActiveTime(prev => prev + timeSpent);
      setIsTimerActive(false);
      setProtocolStartTime(null);
    }
  };

  // Complete breathing session helper
  const completeBreathingSession = (message) => {
    setBreathingPhase('complete');
    setBreathingActive(false);
    if (breathingIntervalRef.current) {
      clearInterval(breathingIntervalRef.current);
    }
    stopActiveTimer();
    toast.success(message);
    setTimeout(() => setCurrentStep('summary'), 1000);
  };

  // FIXED: Proper breathing protocol with correct transitions
  const startBreathing = () => {
    try {
      setBreathingActive(true);
      setBreathingCount(0);
      startActiveTimer();
      
      if (advancedBreathing && experienceLevel !== 'beginner') {
        // Advanced breathing - start with rapid phase
        setBreathingPhase('bhastrika');
        setBreathingTimer(30);
        toast.success('Starting advanced Bhastrika breathing...');
      } else {
        // Standard breathing
        setBreathingPhase('inhale');
        setBreathingTimer(4);
        toast.success('Starting breathing protocol...');
      }
      
      // Start the timer
      breathingIntervalRef.current = setInterval(() => {
        setBreathingTimer(prev => {
          if (prev <= 1) {
            // Timer is about to hit 0, trigger phase change
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
      
    } catch (error) {
      console.error('Error starting breathing:', error);
      toast.error('Error starting breathing protocol');
    }
  };

  const handleAdvancedBreathing = () => {
    setBreathingPhase(currentPhase => {
      if (currentPhase === 'bhastrika') {
        setBreathingTimer(15); // 15 seconds to hold
        return 'hold';
      } else if (currentPhase === 'hold') {
        setBreathingTimer(15); // 15 seconds to exhale
        return 'exhale';
      } else if (currentPhase === 'exhale') {
        // Complete one cycle
        setBreathingCount(prev => {
          const newCount = prev + 1;
          if (newCount >= 3) {
            completeBreathingSession('Advanced breathing complete! Energy redirected upward.');
            return newCount;
          } else {
            // Start next cycle
            setBreathingTimer(30); // 30 rapid breaths
            return newCount;
          }
        });
        return 'bhastrika';
      }
      return currentPhase;
    });
  };

  const handleStandardBreathing = () => {
    setBreathingPhase(currentPhase => {
      if (currentPhase === 'inhale') {
        setBreathingTimer(4); // 4 seconds to exhale
        return 'exhale';
      } else if (currentPhase === 'exhale') {
        // Complete one cycle
        setBreathingCount(prev => {
          const newCount = prev + 1;
          if (newCount >= 10) {
            completeBreathingSession('Breathing complete! How do you feel?');
            return newCount;
          } else {
            // Start next cycle
            setBreathingTimer(4); // 4 seconds to inhale
            return newCount;
          }
        });
        return 'inhale';
      }
      return currentPhase;
    });
  };

  const stopBreathing = () => {
    try {
      setBreathingActive(false);
      setBreathingPhase('ready');
      if (breathingIntervalRef.current) {
        clearInterval(breathingIntervalRef.current);
      }
      stopActiveTimer();
      setCurrentStep('summary');
    } catch (error) {
      console.error('Error stopping breathing:', error);
    }
  };

  // ENHANCED: Experience-based tools
  const getPhaseTools = () => {
    const tools = [];
    
    if (experienceLevel === 'beginner') {
      if (currentDay <= 14) {
        tools.push(
          { id: 'cold-shower', name: 'Cold Shower Protocol', action: () => toast.success('Take a 2-minute cold shower - this will reset your nervous system') },
          { id: 'exercise', name: 'Physical Exercise', action: () => toast.success('Do 20 push-ups or run for 5 minutes to redirect energy') },
          { id: 'environment', name: 'Change Environment', action: () => toast.success('Leave your current location - go outside or to a public space') }
        );
      } else if (currentDay <= 45) {
        tools.push(
          { id: 'journaling', name: 'Emotional Processing', action: () => toast.success('Write down what you\'re feeling - emotions need to be acknowledged and released') },
          { id: 'meditation', name: 'Mindfulness Practice', action: () => toast.success('Sit quietly for 5 minutes and observe your emotions without judgment') },
          { id: 'support', name: 'Reach Out for Support', action: () => toast.success('Call a friend or mentor - you don\'t have to handle this alone') }
        );
      } else {
        tools.push(
          { id: 'creative', name: 'Creative Expression', action: () => toast.success('Channel this energy into art, music, or writing - transmute desire into creation') },
          { id: 'learning', name: 'Mental Challenge', action: () => toast.success('Engage your mind with a complex problem or new learning material') },
          { id: 'visualization', name: 'Future Self Visualization', action: () => toast.success('Visualize your future self thanking you for staying strong right now') }
        );
      }
    } else if (experienceLevel === 'intermediate') {
      tools.push(
        { id: 'energy-circulation', name: 'Microcosmic Orbit', action: () => toast.success('Circulate energy: up spine to crown, down front to abdomen. 9 complete circles.') },
        { id: 'cold-therapy', name: 'Advanced Cold Therapy', action: () => toast.success('Ice bath or extended cold shower (5+ minutes) to transmute energy') },
        { id: 'service', name: 'Channel Into Service', action: () => toast.success('Use this energy surge to help someone else - transform personal struggle into service') },
        { id: 'creative-project', name: 'Creative Project', action: () => toast.success('Start or continue a meaningful creative project - art, writing, music, building') }
      );
    } else { // advanced
      tools.push(
        { id: 'energy-mastery', name: 'Advanced Energy Work', action: () => toast.success('Practice bandhas and advanced energy circulation. Direct energy to crown chakra.') },
        { id: 'teaching', name: 'Teach Others', action: () => toast.success('Share your wisdom with someone earlier in their journey - transform challenge into teaching') },
        { id: 'spiritual-practice', name: 'Deep Spiritual Practice', action: () => toast.success('Extended meditation, prayer, or spiritual study. Connect with higher purpose.') },
        { id: 'world-service', name: 'Global Service', action: () => toast.success('Work on projects that serve humanity - your energy is meant for higher purposes') }
      );
    }
    
    return tools;
  };

  // Handle trigger logging
  const logTrigger = () => {
    if (selectedTrigger && updateUserData) {
      const urgeLog = {
        date: new Date(),
        intensity: urgeIntensity,
        trigger: selectedTrigger,
        protocol: activeProtocol,
        phase: currentPhase.name,
        day: currentDay,
        experienceLevel: experienceLevel
      };
      
      const updatedUrgeLog = [...(userData.urgeLog || []), urgeLog];
      updateUserData({ urgeLog: updatedUrgeLog });
      
      toast.success('Session logged - this helps identify your patterns');
    }
  };

  // Reset to start new session
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
    if (breathingIntervalRef.current) {
      clearInterval(breathingIntervalRef.current);
    }
  };

  return (
    <div className="urge-toolkit-container">
      {/* UPDATED: Integrated header design with clean pill-shaped phase indicator */}
      <div className="integrated-toolkit-header">
        <div className="toolkit-header-title-section">
          <h2>Emergency Toolkit</h2>
          <p className="toolkit-header-subtitle">Smart coping strategies for urge management</p>
        </div>
        
        <div className="toolkit-header-actions-section">
          <div className="toolkit-header-actions">
            <div className="phase-indicator" style={{ '--phase-color': currentPhase.color }}>
              <div className="phase-indicator-content">
                <div className="phase-indicator-icon">
                  <currentPhase.icon />
                </div>
                <div className="phase-indicator-text">
                  <span className="phase-name">{currentPhase.name}</span>
                  <span className="phase-day">Day {currentDay} • {experienceLevel}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Step 1: Intensity Assessment */}
      {currentStep === 'assessment' && (
        <div className="assessment-section">
          <div className="section-header">
            <h3>How intense is this urge?</h3>
            <p>Rate what you're experiencing right now (1 = mild thoughts, 10 = overwhelming)</p>
          </div>
          
          <div className="intensity-scale">
            {[1,2,3,4,5,6,7,8,9,10].map(level => (
              <button
                key={level}
                className={`intensity-btn ${urgeIntensity === level ? 'active' : ''}`}
                onClick={() => handleUrgeIntensity(level)}
                type="button"
              >
                {level}
              </button>
            ))}
          </div>
          
          <div className="intensity-labels">
            <span>Mild thoughts</span>
            <span>Overwhelming</span>
          </div>
        </div>
      )}

      {/* Step 2: Protocol Selection & Execution */}
      {currentStep === 'protocol' && (
        <div className="protocol-section">
          <div className="section-header">
            <h3>Recommended Protocol</h3>
            <p>Based on intensity level {urgeIntensity}/10 • {experienceLevel} level</p>
          </div>

          {/* Protocol Selection */}
          <div className="protocol-selection">
            {Object.entries(protocols).map(([key, protocol]) => (
              <div 
                key={key}
                className={`protocol-card ${activeProtocol === key ? 'active' : ''}`}
                onClick={() => setActiveProtocol(key)}
              >
                <div className="protocol-name">{protocol.name}</div>
                <div className="protocol-duration">{protocol.duration}</div>
                <div className="protocol-description">{protocol.description}</div>
                <div className="protocol-best-for">Best for: {protocol.bestFor}</div>
              </div>
            ))}
          </div>

          {/* ENHANCED: Advanced breathing interface */}
          {activeProtocol === 'breathing' && (
            <div className="breathing-interface">
              {experienceLevel !== 'beginner' && (
                <div className="breathing-mode-selector">
                  <button 
                    className={`mode-btn ${!advancedBreathing ? 'active' : ''}`}
                    onClick={() => setAdvancedBreathing(false)}
                    type="button"
                  >
                    Standard Breathing
                  </button>
                  <button 
                    className={`mode-btn ${advancedBreathing ? 'active' : ''}`}
                    onClick={() => setAdvancedBreathing(true)}
                    type="button"
                  >
                    <FaWind /> Bhastrika (Advanced)
                  </button>
                </div>
              )}
              
              <div className="breathing-display">
                <div className="breathing-circle">
                  <div className={`breathing-animation ${
                    breathingPhase === 'inhale' ? 'inhale-animation' : 
                    breathingPhase === 'exhale' ? 'exhale-animation' :
                    breathingPhase === 'bhastrika' ? 'rapid-animation' :
                    breathingPhase === 'hold' ? 'hold-animation' : ''
                  }`}>
                  </div>
                </div>
                
                <div className="breathing-status">
                  {breathingPhase === 'ready' && <span>Ready to begin</span>}
                  {breathingPhase === 'inhale' && <span>Breathe IN slowly ({breathingTimer}s remaining)</span>}
                  {breathingPhase === 'exhale' && <span>Breathe OUT slowly ({breathingTimer}s remaining)</span>}
                  {breathingPhase === 'bhastrika' && <span>Rapid Breathing ({breathingTimer} breaths remaining)</span>}
                  {breathingPhase === 'hold' && <span>HOLD breath, feel the energy ({breathingTimer}s remaining)</span>}
                  {breathingPhase === 'complete' && <span>Excellent! Energy redirected.</span>}
                </div>
                
                {breathingActive && (
                  <div className="breathing-progress">
                    {advancedBreathing ? 
                      `Cycle ${breathingCount + 1}/3` : 
                      `Cycle ${breathingCount + 1}/10`
                    }
                  </div>
                )}
              </div>
              
              <div className="breathing-controls">
                {!breathingActive ? (
                  <button className="primary-btn" onClick={startBreathing} type="button">
                    <FaPlay />
                    Start {advancedBreathing ? 'Advanced ' : ''}Breathing
                  </button>
                ) : (
                  <button className="secondary-btn" onClick={stopBreathing} type="button">
                    <FaStop />
                    Complete Session
                  </button>
                )}
              </div>
            </div>
          )}

          {/* ENHANCED: Mental protocol with experience-based instructions */}
          {activeProtocol === 'mental' && (
            <div className="mental-protocol">
              <div className="protocol-steps">
                <h4>{experienceLevel === 'advanced' ? 'Mental Transmutation Steps:' : 'Mental Redirection Steps:'}</h4>
                <ol>
                  <li>Name 5 things you can see around you</li>
                  <li>Name 4 things you can hear</li>
                  <li>Name 3 things you can touch</li>
                  <li>Take 10 deep breaths</li>
                  {experienceLevel === 'advanced' ? 
                    <li>Visualize sexual energy moving up your spine to crown chakra</li> :
                    <li>Recite your reasons for retention</li>
                  }
                </ol>
              </div>
              <button 
                className="primary-btn" 
                onClick={() => {
                  startActiveTimer();
                  setCurrentStep('tools');
                }}
                type="button"
              >
                <FaCheckCircle />
                I've Completed This
              </button>
            </div>
          )}

          {activeProtocol === 'physical' && (
            <div className="physical-protocol">
              <div className="protocol-steps">
                <h4>Physical Reset Steps:</h4>
                <ol>
                  <li>Do 20 jumping jacks or push-ups</li>
                  <li>Splash cold water on your face</li>
                  <li>Change your physical position/location</li>
                  <li>Stand straight, shoulders back</li>
                  <li>Take 5 deep breaths</li>
                </ol>
              </div>
              <button 
                className="primary-btn" 
                onClick={() => {
                  startActiveTimer();
                  setCurrentStep('tools');
                }}
                type="button"
              >
                <FaCheckCircle />
                I've Completed This
              </button>
            </div>
          )}

          {/* NEW: Energy circulation protocol for intermediate/advanced */}
          {activeProtocol === 'energy' && (experienceLevel !== 'beginner') && (
            <div className="energy-protocol">
              <div className="protocol-steps">
                <h4>Energy Circulation Steps:</h4>
                <ol>
                  <li>Sit with spine straight, tongue touching roof of mouth</li>
                  <li>Breathe energy up your spine to crown of head (4 counts)</li>
                  <li>Hold energy at crown chakra (2 counts)</li>
                  <li>Breathe energy down front of body to lower abdomen (4 counts)</li>
                  <li>Rest energy in dan tian below navel (2 counts)</li>
                  <li>Repeat for 9 complete circles minimum</li>
                </ol>
              </div>
              <button 
                className="primary-btn" 
                onClick={() => {
                  startActiveTimer();
                  setCurrentStep('tools');
                }}
                type="button"
              >
                <FaCheckCircle />
                Energy Circulated
              </button>
            </div>
          )}
        </div>
      )}

      {/* Step 3: Experience-Based Tools */}
      {currentStep === 'tools' && (
        <div className="tools-section">
          <div className="section-header">
            <h3>{experienceLevel === 'advanced' ? 'Master Level Tools' : 
                 experienceLevel === 'intermediate' ? 'Intermediate Tools' : 
                 currentPhase.name + ' Tools'}</h3>
            <p>{experienceLevel === 'advanced' ? 'Advanced techniques for energy mastery' :
                experienceLevel === 'intermediate' ? 'Intermediate practices for energy development' :
                'Foundational techniques for your current phase'}</p>
          </div>
          
          <div className="phase-tools">
            {getPhaseTools().map(tool => (
              <div key={tool.id} className="tool-card">
                <div className="tool-name">{tool.name}</div>
                <button 
                  className="tool-btn"
                  onClick={tool.action}
                  type="button"
                >
                  Use This Tool
                </button>
              </div>
            ))}
          </div>

          <div className="tools-actions">
            <button 
              className="primary-btn" 
              onClick={() => {
                stopActiveTimer();
                setCurrentStep('summary');
              }}
              type="button"
            >
              Continue to Summary
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Enhanced Session Summary */}
      {currentStep === 'summary' && (
        <div className="summary-section">
          <div className="section-header">
            <h3>Session Complete</h3>
            <p>Help us understand what triggered this urge</p>
          </div>

          <div className="trigger-selection">
            <h4>What triggered this urge?</h4>
            <div className="trigger-options">
              {triggerOptions.map(trigger => (
                <button
                  key={trigger.id}
                  className={`trigger-option ${selectedTrigger === trigger.id ? 'selected' : ''}`}
                  onClick={() => setSelectedTrigger(trigger.id)}
                  type="button"
                >
                  <trigger.icon />
                  <span>{trigger.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="session-stats">
            <div className="stat-item">
              <span className="stat-label">Experience Level:</span>
              <span className="stat-value">{experienceLevel} (Day {currentDay})</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Intensity Level:</span>
              <span className="stat-value">{urgeIntensity}/10</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Protocol Used:</span>
              <span className="stat-value">{protocols[activeProtocol]?.name}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Session Duration:</span>
              <span className="stat-value">
                {sessionStartTime ? Math.round((new Date() - sessionStartTime) / 60000) : 0} minutes
              </span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Active Protocol Time:</span>
              <span className="stat-value">
                {Math.round(totalActiveTime / 60)} minutes {Math.round(totalActiveTime % 60)} seconds
              </span>
            </div>
          </div>

          <div className="summary-actions">
            <button 
              className="primary-btn" 
              onClick={() => {
                logTrigger();
                resetSession();
              }}
              type="button"
            >
              <FaCheckCircle />
              Complete Session
            </button>
            <button 
              className="secondary-btn" 
              onClick={resetSession}
              type="button"
            >
              Start New Session
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default UrgeToolkit;