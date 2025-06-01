// components/UrgeToolkit/UrgeToolkit.js - FIXED: Day counter and breathing timer
import React, { useState, useEffect, useRef } from 'react';
import { format, differenceInDays } from 'date-fns';
import toast from 'react-hot-toast';
import './UrgeToolkit.css';

// Icons - Simplified set
import { FaShieldAlt, FaExclamationTriangle, FaBolt, FaBrain, FaHeart, 
  FaCompress, FaExpand, FaPlay, FaPause, FaStop, FaCheckCircle, 
  FaTimes, FaInfoCircle, FaStopwatch, FaLeaf, FaLightbulb, FaTrophy } from 'react-icons/fa';

const UrgeToolkit = ({ userData, isPremium, updateUserData }) => {
  // Core States - Simplified
  const [currentStep, setCurrentStep] = useState('assessment'); // assessment, protocol, tools, summary
  const [urgeIntensity, setUrgeIntensity] = useState(0);
  const [activeProtocol, setActiveProtocol] = useState(null);
  const [selectedTrigger, setSelectedTrigger] = useState('');
  
  // FIXED: Proper session timing
  const [sessionStartTime, setSessionStartTime] = useState(null);
  const [protocolStartTime, setProtocolStartTime] = useState(null);
  const [totalActiveTime, setTotalActiveTime] = useState(0);
  const [isTimerActive, setIsTimerActive] = useState(false);
  
  // FIXED: Breathing Protocol States
  const [breathingActive, setBreathingActive] = useState(false);
  const [breathingPhase, setBreathingPhase] = useState('ready'); // ready, inhale, exhale, complete
  const [breathingCount, setBreathingCount] = useState(0);
  const [breathingTimer, setBreathingTimer] = useState(0);
  
  // Timer ref
  const breathingIntervalRef = useRef(null);
  
  // FIXED: Use current streak instead of calculated difference
  const currentDay = userData.currentStreak || 0;

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

  // Simplified trigger options
  const triggerOptions = [
    { id: 'thoughts', label: 'Lustful Thoughts', icon: FaBrain },
    { id: 'content', label: 'Explicit Content', icon: FaExclamationTriangle },
    { id: 'stress', label: 'Stress/Anxiety', icon: FaStopwatch },
    { id: 'boredom', label: 'Boredom', icon: FaCompress },
    { id: 'loneliness', label: 'Loneliness', icon: FaHeart },
    { id: 'other', label: 'Other Trigger', icon: FaBolt }
  ];

  // Clean protocol definitions
  const protocols = {
    breathing: {
      name: "Emergency Breathing",
      duration: "2-3 minutes",
      description: "Physiological reset using controlled breathing",
      bestFor: "High intensity urges, anxiety, physical arousal"
    },
    mental: {
      name: "Mental Redirection",
      duration: "1-2 minutes", 
      description: "Cognitive techniques to break thought patterns",
      bestFor: "Intrusive thoughts, mental loops, mild urges"
    },
    physical: {
      name: "Physical Reset",
      duration: "2-5 minutes",
      description: "Body-based techniques to redirect energy",
      bestFor: "Restlessness, physical tension, moderate urges"
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (breathingIntervalRef.current) clearInterval(breathingIntervalRef.current);
    };
  }, []);

  // Handle intensity selection with automatic progression
  const handleUrgeIntensity = (intensity) => {
    try {
      setUrgeIntensity(intensity);
      
      // FIXED: Start session timing when user actually begins
      if (!sessionStartTime) {
        setSessionStartTime(new Date());
      }
      
      // Auto-suggest protocol based on intensity
      if (intensity >= 7) {
        setActiveProtocol('breathing');
        toast.success('High intensity detected - Emergency breathing recommended');
      } else if (intensity >= 4) {
        setActiveProtocol('physical');
        toast.success('Moderate intensity - Physical reset recommended');
      } else {
        setActiveProtocol('mental');
        toast.success('Low intensity - Mental redirection should help');
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

  // FIXED: Breathing protocol implementation with proper phase transitions
  const startBreathing = () => {
    try {
      setBreathingActive(true);
      setBreathingPhase('inhale');
      setBreathingCount(0);
      setBreathingTimer(0);
      
      // FIXED: Start active timer when protocol actually begins
      startActiveTimer();
      
      toast.success('Starting breathing protocol...');
      
      breathingIntervalRef.current = setInterval(() => {
        setBreathingTimer(prev => {
          const newTime = prev + 1;
          
          // FIXED: Proper phase transitions with global state updates
          if (newTime >= 4) {
            setBreathingTimer(0); // Reset timer for next phase
            
            if (breathingPhase === 'inhale') {
              setBreathingPhase('exhale');
            } else if (breathingPhase === 'exhale') {
              setBreathingCount(prevCount => {
                const newCount = prevCount + 1;
                if (newCount >= 10) {
                  // Complete the breathing exercise
                  setBreathingPhase('complete');
                  setBreathingActive(false);
                  if (breathingIntervalRef.current) {
                    clearInterval(breathingIntervalRef.current);
                  }
                  stopActiveTimer();
                  toast.success('Breathing complete! How do you feel?');
                  setTimeout(() => setCurrentStep('summary'), 1000);
                  return newCount;
                } else {
                  // Start next cycle
                  setBreathingPhase('inhale');
                  return newCount;
                }
              });
            }
            return 0; // Reset timer
          }
          
          return newTime;
        });
      }, 1000);
    } catch (error) {
      console.error('Error starting breathing:', error);
      toast.error('Error starting breathing protocol');
    }
  };

  const stopBreathing = () => {
    try {
      setBreathingActive(false);
      setBreathingPhase('ready');
      if (breathingIntervalRef.current) {
        clearInterval(breathingIntervalRef.current);
      }
      stopActiveTimer(); // FIXED: Stop timer when user stops early
      setCurrentStep('summary');
    } catch (error) {
      console.error('Error stopping breathing:', error);
    }
  };

  // Get phase-appropriate tools
  const getPhaseTools = () => {
    const tools = [];
    
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
    } else if (currentDay <= 90) {
      tools.push(
        { id: 'creative', name: 'Creative Expression', action: () => toast.success('Channel this energy into art, music, or writing - transmute desire into creation') },
        { id: 'learning', name: 'Mental Challenge', action: () => toast.success('Engage your mind with a complex problem or new learning material') },
        { id: 'visualization', name: 'Future Self Visualization', action: () => toast.success('Visualize your future self thanking you for staying strong right now') }
      );
    } else {
      tools.push(
        { id: 'service', name: 'Help Someone Else', action: () => toast.success('Use this moment to help someone else - transform personal struggle into service') },
        { id: 'teaching', name: 'Share Your Wisdom', action: () => toast.success('Write a post or message to help someone earlier in their journey') },
        { id: 'gratitude', name: 'Gratitude Practice', action: () => toast.success('List 10 things you\'re grateful for - shift focus from lack to abundance') }
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
        day: currentDay
      };
      
      const updatedUrgeLog = [...(userData.urgeLog || []), urgeLog];
      updateUserData({ urgeLog: updatedUrgeLog });
      
      toast.success('Session logged - this helps identify your patterns');
    }
  };

  // Reset to start new session
  const resetSession = () => {
    // FIXED: Reset all timing states
    stopActiveTimer(); // Stop any active timer
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
    if (breathingIntervalRef.current) {
      clearInterval(breathingIntervalRef.current);
    }
  };

  return (
    <div className="urge-toolkit-container">
      {/* Clean Header */}
      <div className="toolkit-header">
        <div className="toolkit-header-spacer"></div>
        <h2>Emergency Toolkit</h2>
        <div className="toolkit-header-actions">
          <div className="phase-indicator" style={{ '--phase-color': currentPhase.color }}>
            <span className="phase-name">{currentPhase.name}</span>
            <span className="phase-day">Day {currentDay}</span>
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
            <p>Based on intensity level {urgeIntensity}/10</p>
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

          {/* FIXED: Active Protocol Interface with proper breathing states */}
          {activeProtocol === 'breathing' && (
            <div className="breathing-interface">
              <div className="breathing-display">
                <div className="breathing-circle">
                  <div className={`breathing-animation ${breathingPhase === 'inhale' ? 'inhale-animation' : breathingPhase === 'exhale' ? 'exhale-animation' : ''}`}>
                    <div className={`breathing-indicator ${breathingPhase}`}>
                      {breathingPhase === 'ready' && <FaPlay />}
                      {breathingPhase === 'inhale' && <FaExpand />}
                      {breathingPhase === 'exhale' && <FaCompress />}
                      {breathingPhase === 'complete' && <FaCheckCircle />}
                    </div>
                  </div>
                </div>
                
                <div className="breathing-status">
                  {breathingPhase === 'ready' && <span>Ready to begin</span>}
                  {breathingPhase === 'inhale' && <span>Breathe IN slowly ({4 - breathingTimer}s remaining)</span>}
                  {breathingPhase === 'exhale' && <span>Breathe OUT slowly ({4 - breathingTimer}s remaining)</span>}
                  {breathingPhase === 'complete' && <span>Well done!</span>}
                </div>
                
                {breathingActive && (
                  <div className="breathing-progress">
                    Cycle {breathingCount + 1}/10
                  </div>
                )}
              </div>
              
              <div className="breathing-controls">
                {!breathingActive ? (
                  <button className="primary-btn" onClick={startBreathing} type="button">
                    <FaPlay />
                    Start Breathing Protocol
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

          {activeProtocol === 'mental' && (
            <div className="mental-protocol">
              <div className="protocol-steps">
                <h4>Mental Redirection Steps:</h4>
                <ol>
                  <li>Name 5 things you can see around you</li>
                  <li>Name 4 things you can hear</li>
                  <li>Name 3 things you can touch</li>
                  <li>Take 10 deep breaths</li>
                  <li>Recite your reasons for retention</li>
                </ol>
              </div>
              <button 
                className="primary-btn" 
                onClick={() => {
                  startActiveTimer(); // Start timing when user begins manual protocol
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
                  startActiveTimer(); // Start timing when user begins manual protocol  
                  setCurrentStep('tools');
                }}
                type="button"
              >
                <FaCheckCircle />
                I've Completed This
              </button>
            </div>
          )}
        </div>
      )}

      {/* Step 3: Phase-Specific Tools */}
      {currentStep === 'tools' && (
        <div className="tools-section">
          <div className="section-header">
            <h3>{currentPhase.name} Tools</h3>
            <p>Additional techniques for your current phase</p>
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
                stopActiveTimer(); // Stop timing when moving to summary
                setCurrentStep('summary');
              }}
              type="button"
            >
              Continue to Summary
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Session Summary */}
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