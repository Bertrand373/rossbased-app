// components/UrgeToolkit/UrgeMini.js
import React, { useState, useEffect, useRef } from 'react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import './UrgeMini.css';

// Icons
import { FaStopwatch, FaBolt, FaVolumeUp, FaCheck, FaTimes, FaTimes as FaClose } from 'react-icons/fa';

const UrgeMini = ({ onClose, isPremium, updateUserData, userData }) => {
  const [activeTab, setActiveTab] = useState('timer');
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes
  const [suggestion, setSuggestion] = useState('');
  
  const timerRef = useRef(null);
  
  // Mock redirect suggestions (simplified for mini version)
  const redirectSuggestions = [
    "Do 20 push-ups right now",
    "Take a cold shower for 2 minutes",
    "Go for a 10-minute walk outside",
    "Meditate for 5 minutes with deep breathing",
    "Drink a glass of water and stretch"
  ];

  // Timer functions
  const startTimer = () => {
    setIsTimerRunning(true);
    
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
    
    // Log tool usage
    const toolUsage = {
      date: new Date(),
      tool: 'timer',
      effective: null // Will be set when user provides feedback
    };
    
    updateUserData({
      urgeToolUsage: [...(userData?.urgeToolUsage || []), toolUsage]
    });
  };

  const stopTimer = () => {
    clearInterval(timerRef.current);
    setIsTimerRunning(false);
    setTimeLeft(300);
  };

  // Format time as MM:SS
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Redirect energy function
  const getRandomSuggestion = () => {
    const randomIndex = Math.floor(Math.random() * redirectSuggestions.length);
    setSuggestion(redirectSuggestions[randomIndex]);
    
    // Log tool usage
    const toolUsage = {
      date: new Date(),
      tool: 'redirect',
      effective: null
    };
    
    updateUserData({
      urgeToolUsage: [...(userData?.urgeToolUsage || []), toolUsage]
    });
  };

  // Audio affirmation function (simplified for mini version)
  const playAffirmation = () => {
    toast.success('Playing: "Stay Strong" affirmation');
    
    // Log tool usage
    const toolUsage = {
      date: new Date(),
      tool: 'affirmation',
      effective: null
    };
    
    updateUserData({
      urgeToolUsage: [...(userData?.urgeToolUsage || []), toolUsage]
    });
  };

  // Log effectiveness
  const logEffectiveness = (tool, isEffective) => {
    // This would update the most recent tool usage in a real app
    toast.success('Thanks for your feedback!');
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
    <div className="urge-mini-overlay">
      <div className="urge-mini-container">
        <div className="urge-mini-header">
          <h3>Quick Urge Management</h3>
          <button className="close-btn" onClick={onClose}>
            <FaClose />
          </button>
        </div>
        
        <div className="urge-mini-tabs">
          <button 
            className={`mini-tab-btn ${activeTab === 'timer' ? 'active' : ''}`}
            onClick={() => setActiveTab('timer')}
          >
            <FaStopwatch className="mini-tab-icon" />
            <span>Timer</span>
          </button>
          
          <button 
            className={`mini-tab-btn ${activeTab === 'redirect' ? 'active' : ''}`}
            onClick={() => setActiveTab('redirect')}
          >
            <FaBolt className="mini-tab-icon" />
            <span>Redirect</span>
          </button>
          
          <button 
            className={`mini-tab-btn ${activeTab === 'audio' ? 'active' : ''}`}
            onClick={() => setActiveTab('audio')}
          >
            <FaVolumeUp className="mini-tab-icon" />
            <span>Audio</span>
          </button>
        </div>
        
        <div className="urge-mini-content">
          {/* Timer Tab */}
          {activeTab === 'timer' && (
            <div className="mini-timer-container">
              <div className="mini-timer-display">
                <div className="mini-time-left">{formatTime(timeLeft)}</div>
                <div className="mini-timer-label">
                  {isTimerRunning ? 'Stay strong!' : 'Ready when you are'}
                </div>
              </div>
              
              <div className="mini-timer-controls">
                {!isTimerRunning ? (
                  <button 
                    className="btn btn-primary mini-timer-btn"
                    onClick={startTimer}
                  >
                    Start Timer
                  </button>
                ) : (
                  <button 
                    className="btn btn-danger mini-timer-btn"
                    onClick={stopTimer}
                  >
                    Stop Timer
                  </button>
                )}
              </div>
              
              <p className="mini-timer-tip">
                Take a cold shower or do deep breathing for 5 minutes
              </p>
            </div>
          )}
          
          {/* Redirect Energy Tab */}
          {activeTab === 'redirect' && (
            <div className="mini-redirect-container">
              {suggestion ? (
                <>
                  <div className="mini-suggestion-text">{suggestion}</div>
                  <button 
                    className="btn btn-primary mini-suggestion-btn"
                    onClick={getRandomSuggestion}
                  >
                    Try Another
                  </button>
                </>
              ) : (
                <>
                  <p>Get a quick activity to redirect your energy</p>
                  <button 
                    className="btn btn-primary mini-suggestion-btn"
                    onClick={getRandomSuggestion}
                  >
                    Get Suggestion
                  </button>
                </>
              )}
              
              {suggestion && (
                <div className="mini-effectiveness">
                  <p>Was this helpful?</p>
                  <div className="mini-feedback-buttons">
                    <button 
                      className="mini-feedback-btn yes-btn"
                      onClick={() => logEffectiveness('redirect', true)}
                    >
                      <FaCheck /> Yes
                    </button>
                    <button 
                      className="mini-feedback-btn no-btn"
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
            <div className="mini-audio-container">
              <div className="mini-audio-item">
                <div className="mini-audio-info">
                  <div className="mini-audio-title">Stay Strong</div>
                  <div className="mini-audio-duration">0:30</div>
                </div>
                <button 
                  className="btn btn-primary mini-audio-btn"
                  onClick={playAffirmation}
                >
                  Play
                </button>
              </div>
              
              <p className="mini-audio-tip">
                Listen to a quick affirmation to strengthen your resolve
              </p>
              
              <button 
                className="btn btn-outline mini-more-btn"
                onClick={() => {
                  onClose();
                  // In a real app, this would navigate to the full Urge Toolkit
                }}
              >
                Open Full Toolkit
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UrgeMini;