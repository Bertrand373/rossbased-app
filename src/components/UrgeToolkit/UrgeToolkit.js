// Updated UrgeToolkit.js with COMPLETE premium lock - no free access

// components/UrgeToolkit/UrgeToolkit.js - COMPLETE premium lock matching Timeline
import React, { useState, useEffect, useRef } from 'react';
import { format, differenceInDays } from 'date-fns';
import toast from 'react-hot-toast';
import './UrgeToolkit.css';

// Icons - Simplified set
import { FaShieldAlt, FaExclamationTriangle, FaBolt, FaBrain, FaHeart, 
  FaPlay, FaPause, FaStop, FaCheckCircle, 
  FaTimes, FaInfoCircle, FaStopwatch, FaLeaf, FaLightbulb, FaTrophy } from 'react-icons/fa';

const UrgeToolkit = ({ userData, isPremium, updateUserData }) => {
  // Core States for premium users only
  const [currentStep, setCurrentStep] = useState('assessment'); // assessment, protocol, tools, summary
  const [urgeIntensity, setUrgeIntensity] = useState(0);
  const [activeProtocol, setActiveProtocol] = useState(null);
  const [selectedTrigger, setSelectedTrigger] = useState('');
  
  // Session timing states
  const [sessionStartTime, setSessionStartTime] = useState(null);
  const [protocolStartTime, setProtocolStartTime] = useState(null);
  const [totalActiveTime, setTotalActiveTime] = useState(0);
  const [isTimerActive, setIsTimerActive] = useState(false);
  
  // Breathing Protocol States
  const [breathingActive, setBreathingActive] = useState(false);
  const [breathingPhase, setBreathingPhase] = useState('ready'); // ready, inhale, exhale, complete
  const [breathingCount, setBreathingCount] = useState(0);
  const [breathingTimer, setBreathingTimer] = useState(0);
  
  // Timer ref
  const breathingIntervalRef = useRef(null);
  
  // Get current streak and phase info
  const currentDay = userData.currentStreak || 1;
  const getPhaseInfo = (day) => {
    if (day <= 7) return { name: 'Detox', icon: FaShieldAlt, color: '#ef4444' };
    if (day <= 30) return { name: 'Withdrawal', icon: FaExclamationTriangle, color: '#f59e0b' };
    if (day <= 90) return { name: 'Recovery', icon: FaBolt, color: '#10b981' };
    if (day <= 365) return { name: 'Growth', icon: FaBrain, color: '#3b82f6' };
    return { name: 'Mastery', icon: FaTrophy, color: '#8b5cf6' };
  };
  
  const currentPhase = getPhaseInfo(currentDay);

  // Premium upgrade handler
  const handleUpgradeClick = () => {
    toast.success('Premium upgrade coming soon! 🚀');
  };

  // PREMIUM ONLY: Full protocol system
  const protocols = {
    mental: {
      name: 'Mental Redirection',
      description: 'Cognitive techniques to redirect thoughts',
      duration: '5-10 minutes',
      icon: FaBrain,
      color: '#3b82f6',
      steps: [
        'Acknowledge the urge without judgment',
        'Practice the 5-4-3-2-1 grounding technique',
        'Engage in complex mental math or puzzles',
        'Visualize your future self thanking you',
        'Write down 3 reasons for your commitment'
      ]
    },
    physical: {
      name: 'Physical Release',
      description: 'Channel energy through movement',
      duration: '10-15 minutes',
      icon: FaBolt,
      color: '#10b981',
      steps: [
        'Do 20 push-ups or jumping jacks',
        'Take a cold shower for 2-3 minutes',
        'Go for a brisk 10-minute walk',
        'Practice deep breathing exercises',
        'Stretch or do yoga poses'
      ]
    },
    emergency: {
      name: 'Emergency Protocol',
      description: 'For intense urges requiring immediate action',
      duration: '15-20 minutes',
      icon: FaExclamationTriangle,
      color: '#ef4444',
      steps: [
        'Remove yourself from triggering environment',
        'Call a trusted friend or mentor',
        'Practice intense breathing: 4-7-8 technique',
        'Do physical exercise until exhausted',
        'Write about your feelings and goals'
      ]
    }
  };

  // PREMIUM ONLY: Get protocol based on intensity
  const getRecommendedProtocol = () => {
    if (urgeIntensity <= 3) return 'mental';
    if (urgeIntensity <= 7) return 'physical';
    return 'emergency';
  };

  // PREMIUM ONLY: Handle intensity selection
  const handleUrgeIntensity = (level) => {
    setUrgeIntensity(level);
    setCurrentStep('protocol');
    setSessionStartTime(new Date());
    
    const protocol = getRecommendedProtocol();
    setActiveProtocol(protocol);
  };

  // PREMIUM ONLY: Advanced tools based on recovery phase
  const getPhaseTools = () => {
    let tools = [];
    
    if (currentDay <= 7) {
      tools.push(
        { id: 'cold_shower', name: 'Cold Shower', action: () => toast.success('Take a 2-3 minute cold shower to reset your system') },
        { id: 'pushups', name: 'Push-ups', action: () => toast.success('Do 20-30 push-ups to redirect physical energy') },
        { id: 'call_friend', name: 'Call Support', action: () => toast.success('Call someone in your support network right now') }
      );
    } else if (currentDay <= 30) {
      tools.push(
        { id: 'breathing', name: 'Box Breathing', action: () => setBreathingActive(true) },
        { id: 'walk', name: 'Emergency Walk', action: () => toast.success('Take a 10-minute walk outside immediately') },
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

  // PREMIUM ONLY: Trigger options
  const triggerOptions = [
    { id: 'boredom', label: 'Boredom', icon: FaInfoCircle },
    { id: 'stress', label: 'Stress', icon: FaExclamationTriangle },
    { id: 'loneliness', label: 'Loneliness', icon: FaHeart },
    { id: 'social_media', label: 'Social Media', icon: FaBolt },
    { id: 'late_night', label: 'Late Night', icon: FaInfoCircle },
    { id: 'home_alone', label: 'Being Home Alone', icon: FaShieldAlt },
    { id: 'explicit_content', label: 'Explicit Content', icon: FaExclamationTriangle }
  ];

  // PREMIUM ONLY: Handle trigger logging
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

  // PREMIUM ONLY: Reset session
  const resetSession = () => {
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

  // If not premium, show only the locked content
  if (!isPremium) {
    return (
      <div className="urge-toolkit-container">
        {/* Header with phase indicator */}
        <div className="toolkit-header">
          <div className="toolkit-header-spacer"></div>
          <h2>Emergency Toolkit</h2>
          <div className="toolkit-header-actions">
            <div className="phase-indicator" style={{ '--phase-color': currentPhase.color }}>
              <div className="phase-indicator-content">
                <currentPhase.icon className="phase-indicator-icon" />
                <div className="phase-indicator-text">
                  <span className="phase-name">{currentPhase.name}</span>
                  <span className="phase-day">Day {currentDay}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* PREMIUM LOCKED CONTENT - Complete Emergency Toolkit */}
        <div className="premium-toolkit-container">
          <div className="premium-toolkit-section toolkit-locked-features">
            {/* Intensity Assessment Preview */}
            <div className="locked-assessment-section">
              <div className="section-header">
                <h3>Urge Intensity Assessment</h3>
                <p>Smart assessment system that adapts protocols to your specific situation</p>
              </div>
              
              <div className="locked-intensity-preview">
                <div className="intensity-scale-locked">
                  {[1,2,3,4,5,6,7,8,9,10].map(level => (
                    <div key={level} className="intensity-btn-locked">
                      {level}
                    </div>
                  ))}
                </div>
                <div className="intensity-labels-locked">
                  <span>Mild thoughts</span>
                  <span>Overwhelming</span>
                </div>
              </div>
            </div>

            {/* Advanced Protocols Preview */}
            <div className="locked-protocol-section">
              <div className="section-header">
                <h3>Phase-Specific Emergency Protocols</h3>
                <p>Scientifically-backed techniques customized for your recovery phase</p>
              </div>
              
              <div className="locked-protocol-grid">
                <div className="locked-protocol-card">
                  <FaBrain className="locked-protocol-icon" />
                  <h4>Mental Redirection</h4>
                  <p>Cognitive techniques and grounding exercises for thought management</p>
                  <span className="protocol-duration">5-10 minutes</span>
                </div>
                <div className="locked-protocol-card">
                  <FaBolt className="locked-protocol-icon" />
                  <h4>Physical Release</h4>
                  <p>Movement-based strategies to channel energy productively</p>
                  <span className="protocol-duration">10-15 minutes</span>
                </div>
                <div className="locked-protocol-card">
                  <FaExclamationTriangle className="locked-protocol-icon" />
                  <h4>Emergency Protocol</h4>
                  <p>Intensive interventions for high-intensity urges</p>
                  <span className="protocol-duration">15-20 minutes</span>
                </div>
              </div>
            </div>

            {/* Emergency Tools Preview */}
            <div className="locked-tools-section">
              <div className="section-header">
                <h3>Emergency Intervention Tools</h3>
                <p>20+ specialized techniques that adapt to your recovery phase</p>
              </div>
              
              <div className="locked-tools-grid">
                <div className="locked-tool-card">
                  <FaStopwatch />
                  <span>Guided Breathing Timer</span>
                </div>
                <div className="locked-tool-card">
                  <FaHeart />
                  <span>4-7-8 Breathing</span>
                </div>
                <div className="locked-tool-card">
                  <FaLeaf />
                  <span>Mindfulness Scripts</span>
                </div>
                <div className="locked-tool-card">
                  <FaBolt />
                  <span>Energy Redirection</span>
                </div>
                <div className="locked-tool-card">
                  <FaBrain />
                  <span>Cognitive Reframing</span>
                </div>
                <div className="locked-tool-card">
                  <FaShieldAlt />
                  <span>Emergency Contacts</span>
                </div>
                <div className="locked-tool-card">
                  <FaLightbulb />
                  <span>Visualization Guides</span>
                </div>
                <div className="locked-tool-card">
                  <FaTrophy />
                  <span>Motivation Boosters</span>
                </div>
              </div>
            </div>

            {/* Trigger Analysis Preview */}
            <div className="locked-analysis-section">
              <div className="section-header">
                <h3>Trigger Pattern Analysis</h3>
                <p>Track and analyze your urge patterns to build stronger defenses</p>
              </div>
              
              <div className="locked-trigger-preview">
                <div className="trigger-options-locked">
                  {triggerOptions.slice(0, 6).map(trigger => (
                    <div key={trigger.id} className="trigger-option-locked">
                      <trigger.icon />
                      <span>{trigger.label}</span>
                    </div>
                  ))}
                </div>
                <div className="analysis-features">
                  <div className="analysis-feature">
                    <FaLightbulb />
                    <span>Pattern Recognition</span>
                  </div>
                  <div className="analysis-feature">
                    <FaBrain />
                    <span>Personalized Insights</span>
                  </div>
                  <div className="analysis-feature">
                    <FaTrophy />
                    <span>Success Tracking</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Main Helmet Overlay - EXACT copy from Timeline */}
            <div className="main-helmet-overlay">
              <div className="main-helmet-content">
                <div className="main-helmet-icon">
                  <svg width="120" height="120" viewBox="0 0 120 120" className="main-helmet-svg">
                    <defs>
                      <linearGradient id="helmetGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.9"/>
                        <stop offset="100%" stopColor="var(--primary)" stopOpacity="0.7"/>
                      </linearGradient>
                      <filter id="glow">
                        <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                        <feMerge> 
                          <feMergeNode in="coloredBlur"/>
                          <feMergeNode in="SourceGraphic"/>
                        </feMerge>
                      </filter>
                    </defs>
                    <circle cx="60" cy="45" r="35" fill="url(#helmetGradient)" filter="url(#glow)"/>
                    <rect x="45" y="65" width="30" height="20" rx="3" fill="url(#helmetGradient)" filter="url(#glow)"/>
                    <circle cx="50" cy="40" r="3" fill="var(--card-background)" opacity="0.9"/>
                    <circle cx="70" cy="40" r="3" fill="var(--card-background)" opacity="0.9"/>
                    <path d="M52 50 Q60 55 68 50" stroke="var(--card-background)" strokeWidth="2" fill="none" opacity="0.9"/>
                  </svg>
                  <div className="main-helmet-fallback">🛡️</div>
                </div>
                <div className="main-helmet-text">Emergency Toolkit Premium</div>
                <div className="main-helmet-subtitle">
                  Complete emergency intervention system with personalized protocols
                </div>
                <button 
                  className="main-helmet-upgrade-btn"
                  onClick={handleUpgradeClick}
                >
                  <FaTrophy />
                  Upgrade Now
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // PREMIUM USERS: Full Emergency Toolkit functionality
  return (
    <div className="urge-toolkit-container">
      {/* Header with phase indicator */}
      <div className="toolkit-header">
        <div className="toolkit-header-spacer"></div>
        <h2>Emergency Toolkit</h2>
        <div className="toolkit-header-actions">
          <div className="phase-indicator" style={{ '--phase-color': currentPhase.color }}>
            <div className="phase-indicator-content">
              <currentPhase.icon className="phase-indicator-icon" />
              <div className="phase-indicator-text">
                <span className="phase-name">{currentPhase.name}</span>
                <span className="phase-day">Day {currentDay}</span>
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
                <protocol.icon 
                  className="protocol-icon" 
                  style={{ color: protocol.color }}
                />
                <div className="protocol-info">
                  <h4>{protocol.name}</h4>
                  <p>{protocol.description}</p>
                  <span className="protocol-duration">Duration: {protocol.duration}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Active Protocol Steps */}
          {activeProtocol && (
            <div className="active-protocol">
              <div className="protocol-steps">
                <h4>Protocol Steps:</h4>
                <ol>
                  {protocols[activeProtocol].steps.map((step, index) => (
                    <li key={index}>{step}</li>
                  ))}
                </ol>
              </div>
              
              <div className="protocol-actions">
                <button 
                  className="primary-btn"
                  onClick={() => setCurrentStep('tools')}
                >
                  <FaCheckCircle />
                  Continue to Tools
                </button>
                <button 
                  className="secondary-btn"
                  onClick={resetSession}
                >
                  <FaTimes />
                  Start Over
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Step 3: Emergency Tools */}
      {currentStep === 'tools' && (
        <div className="tools-section">
          <div className="section-header">
            <h3>Emergency Tools</h3>
            <p>Additional techniques for your {currentPhase.name} phase (Day {currentDay})</p>
          </div>

          <div className="phase-tools">
            {getPhaseTools().map(tool => (
              <div key={tool.id} className="tool-card">
                <div className="tool-name">{tool.name}</div>
                <button 
                  className="tool-btn"
                  onClick={tool.action}
                >
                  Use Tool
                </button>
              </div>
            ))}
          </div>

          {/* Trigger Selection */}
          <div className="trigger-selection">
            <h4>What triggered this urge?</h4>
            <div className="trigger-options">
              {triggerOptions.map(trigger => (
                <div 
                  key={trigger.id}
                  className={`trigger-option ${selectedTrigger === trigger.id ? 'selected' : ''}`}
                  onClick={() => setSelectedTrigger(trigger.id)}
                >
                  <trigger.icon />
                  <span>{trigger.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="tools-actions">
            <button 
              className="primary-btn"
              onClick={() => {
                logTrigger();
                setCurrentStep('summary');
              }}
            >
              <FaCheckCircle />
              Complete Session
            </button>
            <button 
              className="secondary-btn"
              onClick={resetSession}
            >
              <FaTimes />
              Start Over
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Session Summary */}
      {currentStep === 'summary' && (
        <div className="summary-section">
          <div className="section-header">
            <h3>Session Complete</h3>
            <p>Great job working through this urge!</p>
          </div>

          <div className="session-stats">
            <div className="stat-item">
              <span className="stat-label">Intensity Level</span>
              <span className="stat-value">{urgeIntensity}/10</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Protocol Used</span>
              <span className="stat-value">{protocols[activeProtocol]?.name}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Trigger</span>
              <span className="stat-value">
                {triggerOptions.find(t => t.id === selectedTrigger)?.label || 'Not specified'}
              </span>
            </div>
          </div>

          <div className="summary-actions">
            <button 
              className="primary-btn"
              onClick={resetSession}
            >
              <FaCheckCircle />
              New Session
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default UrgeToolkit;