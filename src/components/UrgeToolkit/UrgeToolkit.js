// components/UrgeToolkit/UrgeToolkit.js - ADDED: Header structure for consistent spacing
import React, { useState, useEffect, useRef } from 'react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import './UrgeToolkit.css';

// Icons
import { FaStopwatch, FaBolt, FaVolumeUp, FaCheck, FaTimes, FaLock } from 'react-icons/fa';

const UrgeToolkit = ({ userData, isPremium, updateUserData }) => {
  const [activeTab, setActiveTab] = useState('timer');
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes in seconds
  const [suggestion, setSuggestion] = useState('');
  const [usedTools, setUsedTools] = useState({
    timer: false,
    redirect: false,
    affirmation: false
  });

  const timerRef = useRef(null);
  const audioRef = useRef(null);

  // Free user limitations
  const [dailyUsageCount, setDailyUsageCount] = useState(0);
  const freeUsageLimit = 1;

  // Mock audio affirmations
  const audioAffirmations = [
    {
      id: 1,
      title: "Stay Strong",
      duration: "0:30",
      free: true
    },
    {
      id: 2,
      title: "Your Discipline Defines You",
      duration: "0:45",
      free: false
    },
    {
      id: 3,
      title: "Transmute Your Energy",
      duration: "1:00",
      free: false
    }
  ];

  // Mock redirect suggestions
  const redirectSuggestions = [
    "Do 20 push-ups right now",
    "Take a cold shower for 2 minutes",
    "Go for a 10-minute walk outside",
    "Write down 3 goals you want to achieve",
    "Meditate for 5 minutes with deep breathing",
    "Call a friend or family member",
    "Drink a glass of water and stretch",
    "Read 10 pages of a book",
    "Clean or organize your space",
    "Work on a hobby or project"
  ];

  // Effect to check daily usage on load
  useEffect(() => {
    // In a real app, this would check the user's usage for the current day
    const savedUsage = localStorage.getItem('srTrackerToolUsage');
    if (savedUsage) {
      const { date, count } = JSON.parse(savedUsage);
      if (date === format(new Date(), 'yyyy-MM-dd')) {
        setDailyUsageCount(count);
      } else {
        // Reset if it's a new day
        setDailyUsageCount(0);
      }
    }
  }, []);

  // Timer functions
  const startTimer = () => {
    if (!isPremium && dailyUsageCount >= freeUsageLimit) {
      toast.error('Free users can only use one tool per day. Upgrade to premium for unlimited access!');
      return;
    }

    setIsTimerRunning(true);
    setUsedTools(prev => ({ ...prev, timer: true }));
    incrementUsage();
    
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          setIsTimerRunning(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const stopTimer = () => {
    clearInterval(timerRef.current);
    setIsTimerRunning(false);
    setTimeLeft(300);
  };

  const resetTimer = () => {
    stopTimer();
    setTimeLeft(300);
  };

  // Format time as MM:SS
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Redirect energy functions
  const getRandomSuggestion = () => {
    if (!isPremium && dailyUsageCount >= freeUsageLimit) {
      toast.error('Free users can only use one tool per day. Upgrade to premium for unlimited access!');
      return;
    }

    const randomIndex = Math.floor(Math.random() * redirectSuggestions.length);
    setSuggestion(redirectSuggestions[randomIndex]);
    setUsedTools(prev => ({ ...prev, redirect: true }));
    incrementUsage();
    
    // Log tool usage
    const toolUsage = {
      date: new Date(),
      tool: 'redirect',
      effective: null // Will be set when user provides feedback
    };
    
    if (userData.urgeToolUsage) {
      updateUserData({
        urgeToolUsage: [...userData.urgeToolUsage, toolUsage]
      });
    }
  };

  // Audio affirmation functions
  const playAffirmation = (affirmation) => {
    if (!isPremium && affirmation.free === false) {
      toast.error('This affirmation is for premium users only');
      return;
    }

    if (!isPremium && dailyUsageCount >= freeUsageLimit && !usedTools.affirmation) {
      toast.error('Free users can only use one tool per day. Upgrade to premium for unlimited access!');
      return;
    }

    // In a real app, this would play the audio file
    toast.success(`Playing: ${affirmation.title}`);
    setUsedTools(prev => ({ ...prev, affirmation: true }));
    
    if (!usedTools.affirmation) {
      incrementUsage();
    }
    
    // Log tool usage
    const toolUsage = {
      date: new Date(),
      tool: 'affirmation',
      effective: null
    };
    
    if (userData.urgeToolUsage) {
      updateUserData({
        urgeToolUsage: [...userData.urgeToolUsage, toolUsage]
      });
    }
  };

  // Track usage
  const incrementUsage = () => {
    const newCount = dailyUsageCount + 1;
    setDailyUsageCount(newCount);
    
    // Save to localStorage for persistence
    localStorage.setItem('srTrackerToolUsage', JSON.stringify({
      date: format(new Date(), 'yyyy-MM-dd'),
      count: newCount
    }));
  };

  // Track effectiveness
  const logEffectiveness = (tool, isEffective) => {
    // Update the most recent tool usage of this type
    if (userData.urgeToolUsage) {
      const updatedToolUsage = [...userData.urgeToolUsage];
      
      // Find the most recent usage of this tool type
      const index = updatedToolUsage
        .map((item, i) => ({ ...item, index: i }))
        .filter(item => item.tool === tool)
        .sort((a, b) => new Date(b.date) - new Date(a.date))[0]?.index;
      
      if (index !== undefined) {
        updatedToolUsage[index] = {
          ...updatedToolUsage[index],
          effective: isEffective
        };
        
        updateUserData({ urgeToolUsage: updatedToolUsage });
        
        toast.success('Thanks for your feedback!');
      }
    }
  };

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  return (
    <div className="urge-toolkit-container">
      {/* ADDED: Header section for consistent spacing */}
      <div className="toolkit-header">
        <div className="toolkit-header-spacer"></div>
        <h2>Urge Management Toolkit</h2>
        <div className="toolkit-header-spacer"></div>
      </div>
      
      <p className="toolkit-description">
        Use these tools when you feel urges to help you stay on track with your goals.
      </p>
      
      <div className="toolkit-tabs">
        <button 
          className={`tab-btn ${activeTab === 'timer' ? 'active' : ''}`}
          onClick={() => setActiveTab('timer')}
        >
          <FaStopwatch className="tab-icon" />
          <span>Timer</span>
        </button>
        
        <button 
          className={`tab-btn ${activeTab === 'redirect' ? 'active' : ''}`}
          onClick={() => setActiveTab('redirect')}
        >
          <FaBolt className="tab-icon" />
          <span>Redirect Energy</span>
        </button>
        
        <button 
          className={`tab-btn ${activeTab === 'audio' ? 'active' : ''}`}
          onClick={() => setActiveTab('audio')}
        >
          <FaVolumeUp className="tab-icon" />
          <span>Audio Affirmations</span>
        </button>
      </div>
      
      <div className="toolkit-content">
        {/* Timer Tab */}
        {activeTab === 'timer' && (
          <div className="timer-container">
            <div className="timer-display">
              <div className="time-left">{formatTime(timeLeft)}</div>
              <div className="timer-label">
                {isTimerRunning ? 'Stay strong!' : 'Ready when you are'}
              </div>
            </div>
            
            <div className="timer-instructions">
              <p>Use this 5-minute timer for:</p>
              <ul>
                <li>Taking a cold shower</li>
                <li>Deep breathing exercises</li>
                <li>Quick meditation</li>
              </ul>
              <p className="timer-motivation">
                Most urges fade within 5 minutes if you redirect your focus!
              </p>
            </div>
            
            <div className="timer-controls">
              {!isTimerRunning ? (
                <button 
                  className="btn btn-primary timer-btn"
                  onClick={startTimer}
                  disabled={!isPremium && dailyUsageCount >= freeUsageLimit && !usedTools.timer}
                >
                  Start Timer
                </button>
              ) : (
                <>
                  <button 
                    className="btn btn-danger timer-btn"
                    onClick={stopTimer}
                  >
                    Stop
                  </button>
                  <button 
                    className="btn btn-outline timer-btn"
                    onClick={resetTimer}
                  >
                    Reset
                  </button>
                </>
              )}
            </div>
            
            {usedTools.timer && (
              <div className="effectiveness-feedback">
                <p>Was this timer effective?</p>
                <div className="feedback-buttons">
                  <button 
                    className="feedback-btn yes-btn"
                    onClick={() => logEffectiveness('timer', true)}
                  >
                    <FaCheck /> Yes
                  </button>
                  <button 
                    className="feedback-btn no-btn"
                    onClick={() => logEffectiveness('timer', false)}
                  >
                    <FaTimes /> No
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
        
        {/* Redirect Energy Tab */}
        {activeTab === 'redirect' && (
          <div className="redirect-container">
            <div className="suggestion-display">
              {suggestion ? (
                <>
                  <div className="suggestion-text">{suggestion}</div>
                  <button 
                    className="btn btn-primary suggestion-btn"
                    onClick={getRandomSuggestion}
                    disabled={!isPremium && dailyUsageCount >= freeUsageLimit && !usedTools.redirect}
                  >
                    Try Another
                  </button>
                </>
              ) : (
                <>
                  <div className="empty-suggestion">
                    <p>Click the button to get a suggestion on how to redirect your energy</p>
                  </div>
                  <button 
                    className="btn btn-primary suggestion-btn"
                    onClick={getRandomSuggestion}
                    disabled={!isPremium && dailyUsageCount >= freeUsageLimit}
                  >
                    Get Suggestion
                  </button>
                </>
              )}
            </div>
            
            <div className="redirect-info">
              <p>Redirecting your energy helps transform urges into productive actions</p>
              {isPremium && (
                <div className="premium-feature">
                  <p>Premium users receive personalized suggestions based on their preferences and past effective activities</p>
                </div>
              )}
            </div>
            
            {suggestion && (
              <div className="effectiveness-feedback">
                <p>Was this suggestion helpful?</p>
                <div className="feedback-buttons">
                  <button 
                    className="feedback-btn yes-btn"
                    onClick={() => logEffectiveness('redirect', true)}
                  >
                    <FaCheck /> Yes
                  </button>
                  <button 
                    className="feedback-btn no-btn"
                    onClick={() => logEffectiveness('redirect', false)}
                  >
                    <FaTimes /> No
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
        
        {/* Audio Affirmations Tab */}
        {activeTab === 'audio' && (
          <div className="audio-container">
            <div className="audio-list">
              {audioAffirmations.map(affirmation => (
                <div 
                  key={affirmation.id} 
                  className={`audio-item ${!isPremium && !affirmation.free ? 'premium-locked' : ''}`}
                >
                  <div className="audio-info">
                    <div className="audio-title">
                      {affirmation.title}
                      {!isPremium && !affirmation.free && <FaLock className="lock-icon-small" />}
                    </div>
                    <div className="audio-duration">{affirmation.duration}</div>
                  </div>
                  <button 
                    className="btn btn-outline audio-play-btn"
                    onClick={() => playAffirmation(affirmation)}
                    disabled={!isPremium && !affirmation.free}
                  >
                    Play
                  </button>
                </div>
              ))}
            </div>
            
            <audio ref={audioRef} className="hidden-audio"></audio>
            
            <div className="audio-info-section">
              <p>Audio affirmations help reinforce your commitment and provide motivation</p>
              {!isPremium && (
                <div className="premium-upgrade">
                  <p>Upgrade to premium to unlock all affirmations</p>
                  <button className="btn btn-primary">
                    Upgrade Now
                  </button>
                </div>
              )}
            </div>
            
            {usedTools.affirmation && (
              <div className="effectiveness-feedback">
                <p>Were the affirmations helpful?</p>
                <div className="feedback-buttons">
                  <button 
                    className="feedback-btn yes-btn"
                    onClick={() => logEffectiveness('affirmation', true)}
                  >
                    <FaCheck /> Yes
                  </button>
                  <button 
                    className="feedback-btn no-btn"
                    onClick={() => logEffectiveness('affirmation', false)}
                  >
                    <FaTimes /> No
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      
      {!isPremium && (
        <div className="usage-counter">
          <p>
            {dailyUsageCount < freeUsageLimit
              ? `You have used ${dailyUsageCount}/${freeUsageLimit} free tools today`
              : 'You have reached your daily limit for free tools'
            }
          </p>
          <button className="btn btn-primary">Upgrade for Unlimited Access</button>
        </div>
      )}
    </div>
  );
};

export default UrgeToolkit;