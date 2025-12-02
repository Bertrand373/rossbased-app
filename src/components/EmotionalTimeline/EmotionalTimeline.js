// EmotionalTimeline.js - TITANTRACK REFINED
// Matches Landing/Tracker aesthetic with numbered phases
import React, { useState, useEffect } from 'react';
import { format, differenceInDays } from 'date-fns';
import toast from 'react-hot-toast';

// Single CSS import - unified file
import './EmotionalTimeline.css';

// Icons
import { 
  FaCheckCircle, FaTimes, FaMapSigns, FaBrain, FaEdit,
  FaExclamationTriangle, FaChartLine, FaLock
} from 'react-icons/fa';

// Import utility functions and data
import {
  emotionalPhases,
  getCurrentPhase,
  getPhaseProgress,
  getPhaseProgressText,
  generateComprehensivePhaseAnalysis
} from './EmotionalTimelineUtils';

const EmotionalTimeline = ({ userData, updateUserData }) => {
  const [selectedPhase, setSelectedPhase] = useState(null);
  const [showPhaseModal, setShowPhaseModal] = useState(false);
  const [activeSection, setActiveSection] = useState('journey');
  
  // Emotional tracking states
  const [todayEmotions, setTodayEmotions] = useState({
    anxiety: 5,
    moodStability: 5,
    mentalClarity: 5,
    emotionalProcessing: 5
  });
  const [emotionsLogged, setEmotionsLogged] = useState(false);

  const currentDay = userData.currentStreak || 0;
  const currentPhase = getCurrentPhase(currentDay, emotionalPhases);
  // NOTE: Functions expect (phase, currentDay) parameter order
  const phaseProgress = currentPhase ? getPhaseProgress(currentPhase, currentDay) : 0;
  const progressText = currentPhase ? getPhaseProgressText(currentPhase, currentDay) : '';

  // Check if already logged today
  useEffect(() => {
    const emotionalData = userData.emotionalTracking || [];
    const today = format(new Date(), 'yyyy-MM-dd');
    const todayEntry = emotionalData.find(entry => 
      format(new Date(entry.date), 'yyyy-MM-dd') === today
    );
    
    if (todayEntry) {
      setEmotionsLogged(true);
      setTodayEmotions({
        anxiety: todayEntry.anxiety || 5,
        moodStability: todayEntry.moodStability || 5,
        mentalClarity: todayEntry.mentalClarity || 5,
        emotionalProcessing: todayEntry.emotionalProcessing || 5
      });
    }
  }, [userData.emotionalTracking]);

  // Get data analysis state
  const getDataState = () => {
    const emotionalData = userData.emotionalTracking || [];
    const totalDataPoints = emotionalData.length;
    const recentData = emotionalData.filter(entry => 
      differenceInDays(new Date(), new Date(entry.date)) <= 14
    );
    
    return {
      totalDataPoints,
      recentDataPoints: recentData.length,
      hasGoodData: totalDataPoints >= 7,
      hasSufficientRecentData: recentData.length >= 3
    };
  };

  // Handle phase click
  const handlePhaseClick = (phase) => {
    setSelectedPhase(phase);
    setShowPhaseModal(true);
  };

  // Handle emotion slider change
  const handleSliderChange = (metric, value) => {
    setTodayEmotions(prev => ({
      ...prev,
      [metric]: parseInt(value)
    }));
  };

  // Save emotions
  const handleSaveEmotions = () => {
    const emotionalData = userData.emotionalTracking || [];
    const today = format(new Date(), 'yyyy-MM-dd');
    
    // Remove existing entry for today if any
    const filteredData = emotionalData.filter(entry => 
      format(new Date(entry.date), 'yyyy-MM-dd') !== today
    );
    
    // Add new entry
    const newEntry = {
      date: new Date().toISOString(),
      ...todayEmotions,
      phase: currentPhase?.name || 'Unknown',
      day: currentDay
    };
    
    updateUserData({
      ...userData,
      emotionalTracking: [...filteredData, newEntry]
    });
    
    setEmotionsLogged(true);
    toast.success('Check-in saved');
  };

  // Get phase status
  const getPhaseStatus = (phase, index) => {
    const phaseIndex = emotionalPhases.findIndex(p => p.id === currentPhase?.id);
    if (index < phaseIndex) return 'completed';
    if (index === phaseIndex) return 'current';
    return 'upcoming';
  };

  // Format phase number
  const formatPhaseNumber = (index) => {
    return String(index + 1).padStart(2, '0');
  };

  const dataState = getDataState();
  const analysis = dataState.hasGoodData ? 
    generateComprehensivePhaseAnalysis(currentPhase, userData, currentDay) : null;

  return (
    <div className="emotional-timeline-container">
      {/* Header */}
      <div className="timeline-header">
        <h1>Timeline</h1>
        <p>Track your emotional journey</p>
      </div>

      {/* Navigation */}
      <div className="timeline-nav">
        <button 
          className={`timeline-nav-btn ${activeSection === 'journey' ? 'active' : ''}`}
          onClick={() => setActiveSection('journey')}
        >
          <FaMapSigns />
          <span>Journey</span>
        </button>
        <button 
          className={`timeline-nav-btn ${activeSection === 'checkin' ? 'active' : ''}`}
          onClick={() => setActiveSection('checkin')}
        >
          <FaEdit />
          <span>Check-in</span>
        </button>
        <button 
          className={`timeline-nav-btn ${activeSection === 'analysis' ? 'active' : ''}`}
          onClick={() => setActiveSection('analysis')}
        >
          <FaBrain />
          <span>Analysis</span>
        </button>
      </div>

      {/* Journey Map Section */}
      {activeSection === 'journey' && (
        <>
          {/* Current Phase Hero */}
          {currentPhase && (
            <div className="phase-hero">
              <div className="phase-hero-icon" style={{ color: currentPhase.color }}>
                <currentPhase.icon />
              </div>
              <h2 className="phase-hero-name">{currentPhase.name}</h2>
              <p className="phase-hero-range">Days {currentPhase.dayRange}</p>
              
              <div className="phase-hero-progress">
                <div className="phase-progress-bar">
                  <div 
                    className="phase-progress-fill" 
                    style={{ width: `${phaseProgress}%` }}
                  />
                </div>
                <p className="phase-progress-text">{progressText}</p>
              </div>
              
              <button 
                className="phase-details-btn"
                onClick={() => handlePhaseClick(currentPhase)}
              >
                View Details
              </button>
            </div>
          )}

          {/* Phase Timeline */}
          <div className="phase-timeline">
            {emotionalPhases.map((phase, index) => {
              const status = getPhaseStatus(phase, index);
              return (
                <div 
                  key={phase.id}
                  className={`phase-item ${status}`}
                  onClick={() => handlePhaseClick(phase)}
                >
                  <div className="phase-number">{formatPhaseNumber(index)}</div>
                  <div className="phase-content">
                    <h3 className="phase-name">{phase.name}</h3>
                    <p className="phase-days">Days {phase.dayRange}</p>
                  </div>
                  <div className="phase-status">
                    {status === 'completed' && <FaCheckCircle />}
                    {status === 'current' && <FaChartLine />}
                    {status === 'upcoming' && <FaLock />}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Check-in Section */}
      {activeSection === 'checkin' && (
        <div className="checkin-section">
          <div className="checkin-card">
            <h3>Daily Emotional Check-in</h3>
            
            <div className="checkin-sliders">
              <div className="checkin-slider-row">
                <div className="checkin-slider-label">
                  <span className="checkin-slider-name">Anxiety Level</span>
                  <span className="checkin-slider-value">{todayEmotions.anxiety}/10</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={todayEmotions.anxiety}
                  onChange={(e) => handleSliderChange('anxiety', e.target.value)}
                  className="checkin-slider"
                  disabled={emotionsLogged}
                />
              </div>
              
              <div className="checkin-slider-row">
                <div className="checkin-slider-label">
                  <span className="checkin-slider-name">Mood Stability</span>
                  <span className="checkin-slider-value">{todayEmotions.moodStability}/10</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={todayEmotions.moodStability}
                  onChange={(e) => handleSliderChange('moodStability', e.target.value)}
                  className="checkin-slider"
                  disabled={emotionsLogged}
                />
              </div>
              
              <div className="checkin-slider-row">
                <div className="checkin-slider-label">
                  <span className="checkin-slider-name">Mental Clarity</span>
                  <span className="checkin-slider-value">{todayEmotions.mentalClarity}/10</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={todayEmotions.mentalClarity}
                  onChange={(e) => handleSliderChange('mentalClarity', e.target.value)}
                  className="checkin-slider"
                  disabled={emotionsLogged}
                />
              </div>
              
              <div className="checkin-slider-row">
                <div className="checkin-slider-label">
                  <span className="checkin-slider-name">Emotional Processing</span>
                  <span className="checkin-slider-value">{todayEmotions.emotionalProcessing}/10</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={todayEmotions.emotionalProcessing}
                  onChange={(e) => handleSliderChange('emotionalProcessing', e.target.value)}
                  className="checkin-slider"
                  disabled={emotionsLogged}
                />
              </div>
            </div>
          </div>
          
          <button 
            className={`checkin-save-btn ${emotionsLogged ? 'logged' : ''}`}
            onClick={handleSaveEmotions}
            disabled={emotionsLogged}
          >
            {emotionsLogged ? 'Already Logged Today' : 'Save Check-in'}
          </button>
        </div>
      )}

      {/* Analysis Section */}
      {activeSection === 'analysis' && (
        <div className="analysis-section">
          {/* Banner */}
          <div className="analysis-banner">
            <h3 className="analysis-banner-title">
              {dataState.hasGoodData ? 'Analysis Active' : 'Building Your Analysis'}
            </h3>
            <p className="analysis-banner-text">
              {dataState.hasGoodData 
                ? `Based on ${dataState.totalDataPoints} data points. Continue tracking for deeper insights.`
                : `Track ${7 - dataState.totalDataPoints} more days to unlock pattern recognition and personalized insights.`
              }
            </p>
          </div>

          {!dataState.hasGoodData ? (
            <div className="analysis-empty">
              <div className="analysis-empty-icon">
                <FaBrain />
              </div>
              <h3 className="analysis-empty-title">Not Enough Data Yet</h3>
              <p className="analysis-empty-text">
                Complete daily check-ins to unlock comprehensive analysis of your emotional patterns and personalized guidance.
              </p>
            </div>
          ) : (
            <div className="analysis-cards">
              {/* Wellbeing Overview */}
              {analysis?.dataAnalysis && (
                <div className="analysis-card">
                  <div className="analysis-card-header">
                    <span>Wellbeing Overview</span>
                  </div>
                  <div className="analysis-card-content">
                    <div className="analysis-metrics">
                      <div className="analysis-metric">
                        <div className="analysis-metric-value">
                          {analysis.dataAnalysis.wellbeingScore?.toFixed(1) || '—'}
                        </div>
                        <div className="analysis-metric-label">Overall</div>
                      </div>
                      <div className="analysis-metric">
                        <div className="analysis-metric-value">{dataState.totalDataPoints}</div>
                        <div className="analysis-metric-label">Data Points</div>
                      </div>
                      <div className="analysis-metric">
                        <div className="analysis-metric-value">{dataState.recentDataPoints}/14</div>
                        <div className="analysis-metric-label">Recent</div>
                      </div>
                    </div>
                    
                    {analysis.dataAnalysis.trends && (
                      <div className="analysis-trends">
                        <div className="analysis-trend">
                          <span className="analysis-trend-label">Anxiety</span>
                          <span className={`analysis-trend-value ${analysis.dataAnalysis.trends.anxiety}`}>
                            {analysis.dataAnalysis.trends.anxiety === 'improving' ? '↓ Improving' : 
                             analysis.dataAnalysis.trends.anxiety === 'concerning' ? '↑ Concerning' : '→ Stable'}
                          </span>
                        </div>
                        <div className="analysis-trend">
                          <span className="analysis-trend-label">Mood</span>
                          <span className={`analysis-trend-value ${analysis.dataAnalysis.trends.mood}`}>
                            {analysis.dataAnalysis.trends.mood === 'improving' ? '↑ Improving' : 
                             analysis.dataAnalysis.trends.mood === 'concerning' ? '↓ Concerning' : '→ Stable'}
                          </span>
                        </div>
                        <div className="analysis-trend">
                          <span className="analysis-trend-label">Clarity</span>
                          <span className={`analysis-trend-value ${analysis.dataAnalysis.trends.clarity}`}>
                            {analysis.dataAnalysis.trends.clarity === 'improving' ? '↑ Improving' : 
                             analysis.dataAnalysis.trends.clarity === 'concerning' ? '↓ Concerning' : '→ Stable'}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Challenges */}
              {analysis?.challengeIdentification?.challenges?.length > 0 && (
                <div className="analysis-card">
                  <div className="analysis-card-header">
                    <span>Active Challenges</span>
                  </div>
                  <div className="analysis-card-content">
                    <div className="analysis-challenges">
                      {analysis.challengeIdentification.challenges.map((challenge, index) => (
                        <div key={index} className="analysis-challenge">
                          <h4 className="analysis-challenge-title">{challenge.challenge}</h4>
                          <p className="analysis-challenge-text">{challenge.explanation}</p>
                          <p className="analysis-challenge-solution">Solution: {challenge.solution}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Phase Detail Modal */}
      {showPhaseModal && selectedPhase && (
        <div className="tl-overlay" onClick={() => setShowPhaseModal(false)}>
          <div className="tl-modal" onClick={e => e.stopPropagation()}>
            <button 
              className="tl-modal-close" 
              onClick={() => setShowPhaseModal(false)}
            >
              <FaTimes />
            </button>

            <div className="tl-modal-header">
              <div className="tl-modal-icon" style={{ color: selectedPhase.color }}>
                <selectedPhase.icon />
              </div>
              <div className="tl-modal-title">
                <h2>{selectedPhase.name}</h2>
                <p>Days {selectedPhase.dayRange}</p>
              </div>
            </div>

            <div className="tl-modal-insight">
              <h3>What's Happening</h3>
              <p>{selectedPhase.description}</p>
              <p><strong>Scientific basis:</strong> {selectedPhase.scientificMechanism}</p>
            </div>

            <div className="tl-modal-section">
              <h3>Expected Symptoms</h3>
              <ul>
                {selectedPhase.expectedSymptoms?.map((symptom, index) => (
                  <li key={index}>{symptom}</li>
                ))}
              </ul>
            </div>

            <div className="tl-modal-section warning">
              <h3>
                <FaExclamationTriangle />
                Warning Signs
              </h3>
              <ul>
                {selectedPhase.warningSigns?.map((sign, index) => (
                  <li key={index}>{sign}</li>
                ))}
              </ul>
            </div>

            <div className="tl-modal-section">
              <h3>Techniques</h3>
              <ul>
                {selectedPhase.specificTechniques?.map((technique, index) => (
                  <li key={index}>{technique}</li>
                ))}
              </ul>
            </div>

            <button 
              className="tl-modal-btn"
              onClick={() => setShowPhaseModal(false)}
            >
              <FaCheckCircle />
              Got It
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmotionalTimeline;