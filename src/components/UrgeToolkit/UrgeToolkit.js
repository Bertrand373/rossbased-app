// components/UrgeToolkit/UrgeToolkit.js - COMPLETE REBUILD: Emergency Crisis Management System
import React, { useState, useEffect, useRef } from 'react';
import { format, differenceInDays } from 'date-fns';
import toast from 'react-hot-toast';
import './UrgeToolkit.css';

// Icons
import { FaShieldAlt, FaExclamationTriangle, FaThermometerHalf, FaBolt, 
  FaBrain, FaHeart, FaEye, FaCompress, FaExpand, FaPlay, FaPause, 
  FaStop, FaRedo, FaCheckCircle, FaTimes, FaInfoCircle } from 'react-icons/fa';

const UrgeToolkit = ({ userData, isPremium, updateUserData }) => {
  // Emergency States
  const [urgeIntensity, setUrgeIntensity] = useState(0);
  const [activeProtocol, setActiveProtocol] = useState(null);
  const [isInCrisis, setIsInCrisis] = useState(false);
  const [selectedTrigger, setSelectedTrigger] = useState('');
  const [showTriggerSelection, setShowTriggerSelection] = useState(false);
  
  // Physiological Reset States
  const [breathingActive, setBreathingActive] = useState(false);
  const [breathingPhase, setBreathingPhase] = useState('ready'); // ready, inhale, hold, exhale
  const [breathingCount, setBreathingCount] = useState(0);
  const [breathingCycle, setBreathingCycle] = useState(1);
  const [breathingTimer, setBreathingTimer] = useState(0);
  
  // Energy Circulation States
  const [energyActive, setEnergyActive] = useState(false);
  const [energyPosition, setEnergyPosition] = useState('base'); // base, sacral, solar, heart, throat, third-eye, crown
  const [energyDirection, setEnergyDirection] = useState('up'); // up, down
  
  // Timer refs
  const breathingIntervalRef = useRef(null);
  const energyIntervalRef = useRef(null);
  
  // Calculate current streak day for phase-specific tools
  const currentDay = userData.startDate ? 
    differenceInDays(new Date(), new Date(userData.startDate)) + 1 : 0;

  // Enhanced trigger options
  const triggerOptions = [
    { id: 'lustful_thoughts', label: 'Lustful Thoughts', icon: FaBrain, intensity: 'high' },
    { id: 'explicit_content', label: 'Explicit Content', icon: FaEye, intensity: 'extreme' },
    { id: 'stress', label: 'Stress/Anxiety', icon: FaExclamationTriangle, intensity: 'medium' },
    { id: 'boredom', label: 'Boredom/Idle Time', icon: FaCompress, intensity: 'medium' },
    { id: 'loneliness', label: 'Loneliness', icon: FaHeart, intensity: 'high' },
    { id: 'social_media', label: 'Social Media', icon: FaBolt, intensity: 'medium' },
    { id: 'physical_arousal', label: 'Physical Arousal', icon: FaThermometerHalf, intensity: 'extreme' }
  ];

  // Get phase-specific protocol based on streak day
  const getPhaseProtocol = () => {
    if (currentDay <= 14) {
      return {
        name: "Foundation Phase",
        focus: "Breaking habits, physical control",
        tools: ['breathing', 'cold', 'physical', 'mental']
      };
    } else if (currentDay <= 45) {
      return {
        name: "Emotional Phase", 
        focus: "Managing emotional volatility",
        tools: ['breathing', 'energy', 'emotional', 'grounding']
      };
    } else if (currentDay <= 90) {
      return {
        name: "Mental Expansion",
        focus: "Transmuting energy to creativity",
        tools: ['energy', 'transmutation', 'creativity', 'advanced']
      };
    } else {
      return {
        name: "Mastery Phase",
        focus: "Advanced energy management", 
        tools: ['advanced', 'transmutation', 'spiritual', 'mastery']
      };
    }
  };

  const currentPhase = getPhaseProtocol();

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (breathingIntervalRef.current) clearInterval(breathingIntervalRef.current);
      if (energyIntervalRef.current) clearInterval(energyIntervalRef.current);
    };
  }, []);

  // EMERGENCY PHYSIOLOGICAL RESET - Wim Hof Protocol
  const startWimHofBreathing = () => {
    setBreathingActive(true);
    setBreathingPhase('inhale');
    setBreathingCount(0);
    setBreathingCycle(1);
    setBreathingTimer(0);
    
    breathingIntervalRef.current = setInterval(() => {
      setBreathingTimer(prev => {
        const newTime = prev + 1;
        
        // Phase transitions for Wim Hof method
        if (breathingPhase === 'inhale' && newTime >= 2) {
          setBreathingPhase('exhale');
          setBreathingCount(prev => prev + 1);
          return 0;
        } else if (breathingPhase === 'exhale' && newTime >= 1) {
          if (breathingCount >= 30) {
            setBreathingPhase('hold');
            return 0;
          } else {
            setBreathingPhase('inhale');
            return 0;
          }
        } else if (breathingPhase === 'hold' && newTime >= 90) {
          setBreathingPhase('complete');
          setBreathingCycle(prev => prev + 1);
          toast.success('Breathing cycle complete! Urge should be significantly reduced.');
          return 0;
        }
        
        return newTime;
      });
    }, 1000);
  };

  const stopBreathing = () => {
    setBreathingActive(false);
    setBreathingPhase('ready');
    if (breathingIntervalRef.current) {
      clearInterval(breathingIntervalRef.current);
    }
  };

  // ENERGY CIRCULATION - Microcosmic Orbit
  const startEnergyCirculation = () => {
    setEnergyActive(true);
    setEnergyPosition('base');
    setEnergyDirection('up');
    
    const positions = ['base', 'sacral', 'solar', 'heart', 'throat', 'third-eye', 'crown'];
    let currentIndex = 0;
    
    energyIntervalRef.current = setInterval(() => {
      if (energyDirection === 'up') {
        currentIndex++;
        if (currentIndex >= positions.length) {
          setEnergyDirection('down');
          currentIndex = positions.length - 2;
        }
      } else {
        currentIndex--;
        if (currentIndex < 0) {
          setEnergyDirection('up');
          currentIndex = 1;
          toast.success('Energy circulation complete! One full orbit.');
        }
      }
      setEnergyPosition(positions[currentIndex]);
    }, 3000); // 3 seconds per position
  };

  const stopEnergyCirculation = () => {
    setEnergyActive(false);
    setEnergyPosition('base');
    if (energyIntervalRef.current) {
      clearInterval(energyIntervalRef.current);
    }
  };

  // URGE INTENSITY ASSESSMENT
  const handleUrgeIntensity = (intensity) => {
    setUrgeIntensity(intensity);
    
    if (intensity >= 8) {
      setIsInCrisis(true);
      toast.error('CRISIS MODE ACTIVATED - Using emergency protocols');
    } else if (intensity >= 5) {
      toast.warning('High intensity detected - Escalating intervention');
    }
    
    // Auto-select appropriate protocol based on intensity
    if (intensity >= 8) {
      setActiveProtocol('crisis');
    } else if (intensity >= 5) {
      setActiveProtocol('breathing');
    } else {
      setActiveProtocol('mental');
    }
  };

  // CRISIS MODE PROTOCOLS
  const emergencyProtocols = {
    breathing: {
      name: "Emergency Breathing Reset",
      duration: "2-3 minutes",
      description: "Wim Hof method to break arousal state",
      steps: [
        "30 rapid deep breaths",
        "Hold breath for 90 seconds", 
        "Feel the reset in your body",
        "Repeat if necessary"
      ]
    },
    cold: {
      name: "Cold Shock Simulation",
      duration: "60 seconds",
      description: "Breathing technique that mimics cold exposure",
      steps: [
        "Inhale sharply through nose",
        "Hold breath and visualize ice water",
        "Exhale slowly, feel the cold",
        "Contract all muscles briefly"
      ]
    },
    energy: {
      name: "Energy Redirection Circuit",
      duration: "5 minutes", 
      description: "Microcosmic orbit to move energy upward",
      steps: [
        "Energy starts at base of spine",
        "Breathe it up through each chakra",
        "Crown chakra, then down the front",
        "Complete the circuit back to base"
      ]
    },
    physical: {
      name: "Physical Circuit Breaker",
      duration: "2 minutes",
      description: "Body positions and movements to break arousal",
      steps: [
        "50 rapid squats or jumping jacks",
        "Cold water on face and wrists", 
        "Pressure point: press firmly between thumb and index finger",
        "Stand straight, shoulders back"
      ]
    }
  };

  // Handle trigger selection and logging
  const handleTriggerSelection = () => {
    if (selectedTrigger) {
      // Log the urge with trigger for analytics
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
      
      toast.success('Urge logged - this helps identify patterns');
    }
    setShowTriggerSelection(false);
  };

  // Get streak-phase specific tools
  const getPhaseSpecificTools = () => {
    const tools = [];
    
    if (currentDay <= 14) {
      tools.push(
        { id: 'habit-breaker', name: 'Habit Circuit Breaker', icon: FaBolt },
        { id: 'cold-protocol', name: 'Emergency Cold Protocol', icon: FaThermometerHalf },
        { id: 'physical-reset', name: 'Physical Position Reset', icon: FaCompress }
      );
    } else if (currentDay <= 45) {
      tools.push(
        { id: 'emotional-stabilizer', name: 'Emotional Stabilizer', icon: FaHeart },
        { id: 'energy-transmute', name: 'Energy Transmutation', icon: FaBolt },
        { id: 'grounding', name: 'Grounding Technique', icon: FaCompress }
      );
    } else if (currentDay <= 90) {
      tools.push(
        { id: 'creative-redirect', name: 'Creative Redirection', icon: FaBrain },
        { id: 'advanced-circulation', name: 'Advanced Energy Work', icon: FaBolt },
        { id: 'transmutation-master', name: 'Transmutation Mastery', icon: FaEye }
      );
    } else {
      tools.push(
        { id: 'master-level', name: 'Master Level Techniques', icon: FaShieldAlt },
        { id: 'energy-mastery', name: 'Energy Mastery', icon: FaBolt },
        { id: 'spiritual-tools', name: 'Spiritual Tools', icon: FaEye }
      );
    }
    
    return tools;
  };

  return (
    <div className="urge-toolkit-container">
      {/* Header matching other tabs */}
      <div className="toolkit-header">
        <div className="toolkit-header-spacer"></div>
        <h2>Emergency Toolkit</h2>
        <div className="toolkit-header-actions">
          <div className="phase-indicator">
            <span className="phase-name">{currentPhase.name}</span>
            <span className="phase-day">Day {currentDay}</span>
          </div>
        </div>
      </div>

      {/* Crisis Mode Alert */}
      {isInCrisis && (
        <div className="crisis-alert">
          <div className="crisis-icon">
            <FaExclamationTriangle />
          </div>
          <div className="crisis-content">
            <h3>CRISIS MODE ACTIVE</h3>
            <p>High intensity urge detected. Using emergency protocols.</p>
          </div>
        </div>
      )}

      {/* Urge Intensity Assessment */}
      <div className="intensity-assessment-section">
        <h3>Current Urge Intensity</h3>
        <p className="assessment-description">Rate the intensity of what you're experiencing right now</p>
        
        <div className="intensity-scale">
          {[1,2,3,4,5,6,7,8,9,10].map(level => (
            <button
              key={level}
              className={`intensity-btn ${urgeIntensity === level ? 'active' : ''} ${level >= 8 ? 'crisis-level' : level >= 5 ? 'high-level' : 'normal-level'}`}
              onClick={() => handleUrgeIntensity(level)}
            >
              {level}
            </button>
          ))}
        </div>
        
        <div className="intensity-labels">
          <span>Mild thoughts</span>
          <span className="crisis-label">CRISIS</span>
        </div>
        
        {urgeIntensity > 0 && (
          <div className="intensity-feedback">
            <FaInfoCircle className="feedback-icon" />
            <span>
              {urgeIntensity <= 3 && "Normal fluctuation - basic tools will help"}
              {urgeIntensity > 3 && urgeIntensity <= 6 && "Significant urge - escalating intervention"}
              {urgeIntensity > 6 && urgeIntensity < 8 && "High intensity - immediate action needed"}
              {urgeIntensity >= 8 && "CRISIS LEVEL - Emergency protocols activated"}
            </span>
          </div>
        )}
      </div>

      {/* Emergency Protocol Selection */}
      {urgeIntensity > 0 && (
        <div className="emergency-protocols-section">
          <h3>Emergency Protocols</h3>
          <p className="protocols-description">Choose the most appropriate immediate intervention</p>
          
          <div className="protocols-grid">
            {Object.entries(emergencyProtocols).map(([key, protocol]) => (
              <div 
                key={key}
                className={`protocol-card ${activeProtocol === key ? 'active' : ''} ${key === 'breathing' && isInCrisis ? 'recommended' : ''}`}
                onClick={() => setActiveProtocol(key)}
              >
                <div className="protocol-header">
                  <div className="protocol-name">{protocol.name}</div>
                  <div className="protocol-duration">{protocol.duration}</div>
                  {key === 'breathing' && isInCrisis && (
                    <div className="recommended-badge">RECOMMENDED</div>
                  )}
                </div>
                <div className="protocol-description">{protocol.description}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Active Protocol Interface */}
      {activeProtocol && (
        <div className="active-protocol-section">
          <h3>Active Protocol: {emergencyProtocols[activeProtocol].name}</h3>
          
          {activeProtocol === 'breathing' && (
            <div className="breathing-interface">
              <div className="breathing-display">
                <div className="breathing-circle">
                  <div className={`breathing-indicator ${breathingPhase}`}>
                    {breathingPhase === 'ready' && <FaPlay />}
                    {breathingPhase === 'inhale' && <FaExpand />}
                    {breathingPhase === 'exhale' && <FaCompress />}
                    {breathingPhase === 'hold' && <FaPause />}
                    {breathingPhase === 'complete' && <FaCheckCircle />}
                  </div>
                </div>
                
                <div className="breathing-status">
                  {breathingPhase === 'ready' && <span>Ready to begin</span>}
                  {breathingPhase === 'inhale' && <span>INHALE deeply ({breathingTimer}s)</span>}
                  {breathingPhase === 'exhale' && <span>EXHALE fully ({breathingTimer}s)</span>}
                  {breathingPhase === 'hold' && <span>HOLD breath ({breathingTimer}s)</span>}
                  {breathingPhase === 'complete' && <span>Cycle complete!</span>}
                </div>
                
                <div className="breathing-progress">
                  <span>Breath {breathingCount}/30 | Cycle {breathingCycle}</span>
                </div>
              </div>
              
              <div className="breathing-controls">
                {!breathingActive ? (
                  <button className="btn btn-primary breathing-btn" onClick={startWimHofBreathing}>
                    <FaPlay />
                    Start Emergency Breathing
                  </button>
                ) : (
                  <button className="btn btn-danger breathing-btn" onClick={stopBreathing}>
                    <FaStop />
                    Stop Protocol
                  </button>
                )}
              </div>
            </div>
          )}

          {activeProtocol === 'energy' && (
            <div className="energy-interface">
              <div className="energy-display">
                <div className="chakra-visualization">
                  {['crown', 'third-eye', 'throat', 'heart', 'solar', 'sacral', 'base'].map(chakra => (
                    <div 
                      key={chakra}
                      className={`chakra-point ${energyPosition === chakra ? 'active' : ''}`}
                    >
                      <div className="chakra-dot"></div>
                      <span className="chakra-label">{chakra}</span>
                    </div>
                  ))}
                </div>
                
                <div className="energy-status">
                  <span>Energy at: {energyPosition.toUpperCase()}</span>
                  <span>Direction: {energyDirection === 'up' ? '↑ ASCENDING' : '↓ DESCENDING'}</span>
                </div>
              </div>
              
              <div className="energy-controls">
                {!energyActive ? (
                  <button className="btn btn-primary energy-btn" onClick={startEnergyCirculation}>
                    <FaBolt />
                    Start Energy Circulation
                  </button>
                ) : (
                  <button className="btn btn-danger energy-btn" onClick={stopEnergyCirculation}>
                    <FaStop />
                    Stop Circulation
                  </button>
                )}
              </div>
            </div>
          )}

          {(activeProtocol === 'cold' || activeProtocol === 'physical') && (
            <div className="manual-protocol-interface">
              <div className="protocol-steps">
                <h4>Follow these steps:</h4>
                <ol>
                  {emergencyProtocols[activeProtocol].steps.map((step, index) => (
                    <li key={index}>{step}</li>
                  ))}
                </ol>
              </div>
              
              <div className="protocol-timer">
                <div className="timer-display">
                  <FaStopwatch className="timer-icon" />
                  <span>Protocol Duration: {emergencyProtocols[activeProtocol].duration}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Phase-Specific Tools */}
      <div className="phase-tools-section">
        <h3>{currentPhase.name} Tools</h3>
        <p className="phase-description">{currentPhase.focus}</p>
        
        <div className="phase-tools-grid">
          {getPhaseSpecificTools().map(tool => (
            <div key={tool.id} className="phase-tool-card">
              <div className="tool-icon">
                <tool.icon />
              </div>
              <div className="tool-name">{tool.name}</div>
              <button className="tool-activate-btn">
                Activate
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Trigger Analysis */}
      {urgeIntensity > 0 && (
        <div className="trigger-analysis-section">
          <h3>Trigger Identification</h3>
          <p>What triggered this urge? This helps identify patterns.</p>
          
          <div className="trigger-options">
            {triggerOptions.map(trigger => (
              <button
                key={trigger.id}
                className={`trigger-option ${selectedTrigger === trigger.id ? 'selected' : ''} ${trigger.intensity}`}
                onClick={() => setSelectedTrigger(trigger.id)}
              >
                <trigger.icon className="trigger-icon" />
                <span>{trigger.label}</span>
              </button>
            ))}
          </div>
          
          {selectedTrigger && (
            <div className="trigger-actions">
              <button 
                className="btn btn-primary"
                onClick={handleTriggerSelection}
              >
                <FaCheckCircle />
                Log This Trigger
              </button>
            </div>
          )}
        </div>
      )}

      {/* Crisis Survival Kit */}
      <div className="survival-kit-section">
        <h3>Crisis Survival Kit</h3>
        <p>Emergency tools for the most intense moments</p>
        
        <div className="survival-tools">
          <div className="survival-tool">
            <div className="tool-header">
              <FaThermometerHalf className="tool-icon" />
              <span>Testicular Cooling</span>
            </div>
            <p>Apply cold water to genitals for 2-3 minutes. This immediately reduces arousal.</p>
          </div>
          
          <div className="survival-tool">
            <div className="tool-header">
              <FaCompress className="tool-icon" />
              <span>PC Muscle Reset</span>
            </div>
            <p>Contract pelvic floor muscles 50 times rapidly. This redirects energy upward.</p>
          </div>
          
          <div className="survival-tool">
            <div className="tool-header">
              <FaBrain className="tool-icon" />
              <span>Mental Circuit Breaker</span>
            </div>
            <p>Count backwards from 100 by 7s while doing physical exercise.</p>
          </div>
        </div>
      </div>

      {/* Session Summary */}
      {urgeIntensity > 0 && activeProtocol && (
        <div className="session-summary">
          <h3>Session Summary</h3>
          <div className="summary-stats">
            <div className="stat-item">
              <span className="stat-label">Initial Intensity:</span>
              <span className="stat-value">{urgeIntensity}/10</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Protocol Used:</span>
              <span className="stat-value">{emergencyProtocols[activeProtocol].name}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Trigger:</span>
              <span className="stat-value">{selectedTrigger ? triggerOptions.find(t => t.id === selectedTrigger)?.label : 'Not identified'}</span>
            </div>
          </div>
          
          <div className="session-feedback">
            <p>How effective was this session?</p>
            <div className="effectiveness-buttons">
              <button className="effectiveness-btn high">
                <FaCheckCircle />
                Very Effective
              </button>
              <button className="effectiveness-btn medium">
                <FaInfoCircle />
                Somewhat Effective
              </button>
              <button className="effectiveness-btn low">
                <FaTimes />
                Not Effective
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UrgeToolkit;