// components/EmotionalTimeline/EmotionalTimeline.js - Main Component with Analysis System
import React, { useState, useEffect, useRef } from 'react';
import { format, differenceInDays } from 'date-fns';
import toast from 'react-hot-toast';
import './EmotionalTimeline.css';

// Icons
import { FaMapSigns, FaLightbulb, FaHeart, FaBrain, FaLeaf, FaTrophy, 
  FaCheckCircle, FaLock, FaPen, FaInfoCircle, FaExclamationTriangle, 
  FaRegLightbulb, FaEye, FaTimes, FaStar, FaChartLine, FaFire, FaSearch,
  FaShieldAlt, FaBolt, FaUserGraduate, FaFlask, FaAtom, FaStethoscope } from 'react-icons/fa';

// Import helmet image
import helmetImage from '../../assets/helmet.png';

// Import utility functions and data
import {
  emotionalPhases,
  masteryLevels,
  getCurrentPhase,
  getCurrentMasteryLevel,
  getPhaseProgress,
  getPhaseProgressText,
  getPhaseJournalPrompt,
  generateComprehensivePhaseAnalysis
} from './EmotionalTimelineUtils';

const EmotionalTimeline = ({ userData, isPremium, updateUserData }) => {
  const [showJournalModal, setShowJournalModal] = useState(false);
  const [currentNote, setCurrentNote] = useState('');
  const [wisdomMode, setWisdomMode] = useState(false);
  const [selectedPhase, setSelectedPhase] = useState(null);
  const [showPhaseDetail, setShowPhaseDetail] = useState(false);
  const [showFloatingToggle, setShowFloatingToggle] = useState(false);
  
  // Enhanced emotional tracking states
  const [todayEmotions, setTodayEmotions] = useState({
    anxiety: 5,
    moodStability: 5,
    mentalClarity: 5,
    emotionalProcessing: 5
  });
  const [emotionsLogged, setEmotionsLogged] = useState(false);

  // Refs for scroll detection
  const timelineStartRef = useRef(null);
  const insightSectionRef = useRef(null);
  
  const currentDay = userData.currentStreak || 0;

  // Get current phase and mastery level
  const currentPhase = getCurrentPhase(currentDay, emotionalPhases);
  const currentMasteryLevel = getCurrentMasteryLevel(currentDay, masteryLevels);

  // Always show floating toggle
  useEffect(() => {
    setShowFloatingToggle(true);
  }, []);

  // Check if emotions are already logged for today
  useEffect(() => {
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const existingEmotions = userData.emotionalTracking?.find(
      emotion => format(new Date(emotion.date), 'yyyy-MM-dd') === todayStr
    );
    
    if (existingEmotions) {
      setTodayEmotions({
        anxiety: existingEmotions.anxiety || 5,
        moodStability: existingEmotions.moodStability || 5,
        mentalClarity: existingEmotions.mentalClarity || 5,
        emotionalProcessing: existingEmotions.emotionalProcessing || 5
      });
      setEmotionsLogged(true);
    }
  }, [userData.emotionalTracking]);

  // Handle emotional tracking
  const handleEmotionChange = (type, value) => {
    if (!isPremium) return;
    setTodayEmotions(prev => ({
      ...prev,
      [type]: value
    }));
  };

  const saveEmotions = () => {
    if (!isPremium) {
      handleUpgradeClick();
      return;
    }
    
    const today = new Date();
    const todayStr = format(today, 'yyyy-MM-dd');
    
    const updatedEmotionalTracking = (userData.emotionalTracking || []).filter(
      emotion => format(new Date(emotion.date), 'yyyy-MM-dd') !== todayStr
    );
    
    updatedEmotionalTracking.push({
      date: today,
      day: currentDay,
      phase: currentPhase?.id || 1,
      ...todayEmotions
    });
    
    updatedEmotionalTracking.sort((a, b) => new Date(a.date) - new Date(b.date));
    
    updateUserData({ emotionalTracking: updatedEmotionalTracking });
    setEmotionsLogged(true);
    toast.success('Emotional check-in saved!');
  };

  const enableEmotionEditing = () => {
    if (!isPremium) {
      handleUpgradeClick();
      return;
    }
    setEmotionsLogged(false);
  };

  // Handle journal modal
  const handleJournalPrompt = () => {
    if (!isPremium) {
      handleUpgradeClick();
      return;
    }
    
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const existingNote = userData.notes && userData.notes[todayStr];
    
    setCurrentNote(existingNote || '');
    setShowJournalModal(true);
  };

  const saveNote = () => {
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const updatedNotes = { ...userData.notes, [todayStr]: currentNote };
    
    updateUserData({ notes: updatedNotes });
    setShowJournalModal(false);
    toast.success('Journal entry saved!');
  };

  // Handle phase detail modal
  const showPhaseDetails = (phase) => {
    if (!isPremium) {
      handleUpgradeClick();
      return;
    }
    setSelectedPhase(phase);
    setShowPhaseDetail(true);
  };

  // Premium upgrade handler
  const handleUpgradeClick = () => {
    toast.success('Premium upgrade coming soon! 🚀');
  };

  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const todayNote = userData.notes && userData.notes[todayStr];

  return (
    <div className="emotional-timeline-container">
      {/* Smart Floating Wisdom Toggle */}
      {showFloatingToggle && (
        <button 
          className={`floating-wisdom-toggle ${wisdomMode ? 'active' : ''}`}
          onClick={() => setWisdomMode(!wisdomMode)}
          title={wisdomMode ? "Switch to Scientific View" : "Switch to Esoteric View"}
        >
          <FaEye className={`floating-wisdom-eye ${wisdomMode ? 'active' : ''}`} />
        </button>
      )}

      {/* Header */}
      <div className="timeline-header">
        <div className="timeline-header-spacer"></div>
        <h2>Emotional Timeline</h2>
        <div className="timeline-header-actions"></div>
      </div>

      {/* Timeline Content Container */}
      <div className="timeline-content-container">
        {/* Current Phase Display - ALWAYS VISIBLE */}
        {currentPhase && currentDay > 0 && (
          <div className="current-phase-container">
            <div className="phase-card current">
              <div className="phase-date">Day {currentDay} of your journey</div>
              
              <div className="phase-icon-section">
                <div className="phase-icon" style={{ color: currentPhase.color }}>
                  <currentPhase.icon />
                </div>
                <div className="phase-info">
                  <div className="phase-name">{currentPhase.name}</div>
                  <div className="phase-range">Days {currentPhase.dayRange}</div>
                </div>
              </div>
              
              <div className="phase-description">
                {wisdomMode ? currentPhase.esotericDescription : currentPhase.description}
              </div>

              {/* Progress bar */}
              <div className="phase-progress">
                <div 
                  className="progress-bar"
                  style={{ '--phase-color': currentPhase.color }}
                >
                  <div 
                    className="progress-fill progress-fill-colored"
                    style={{ width: `${getPhaseProgress(currentPhase, currentDay, currentMasteryLevel)}%` }}
                  ></div>
                </div>
                <div className="progress-text">
                  {getPhaseProgressText(currentPhase, currentDay, currentMasteryLevel)}
                </div>
              </div>

              <button 
                className="phase-detail-btn"
                onClick={() => showPhaseDetails(currentPhase)}
                disabled={!isPremium}
              >
                <FaInfoCircle />
                {isPremium ? 'View Phase Details' : 'Premium Feature'}
              </button>
            </div>
          </div>
        )}

        {/* PREMIUM CUTOFF */}
        {!isPremium ? (
          <div className="early-premium-teaser">
            <div className="early-teaser-content">
              <img 
                src={helmetImage} 
                alt="Premium" 
                className="early-teaser-helmet"
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.nextElementSibling.style.display = 'block';
                }}
              />
              <FaLock 
                className="early-teaser-helmet-fallback" 
                style={{ display: 'none' }}
              />
              <div className="early-teaser-text">
                <h3>Unlock World-Class Phase Analysis</h3>
                <p>Get comprehensive phase insights, scientific explanations, emotional tracking, and personalized guidance based on the ultimate retention guide</p>
                <button className="early-teaser-upgrade-btn" onClick={handleUpgradeClick}>
                  <FaStar />
                  Upgrade to Premium
                </button>
              </div>
            </div>
          </div>
        ) : (
          // PREMIUM FEATURES SECTION
          <div className="premium-features-section">
            {/* Timeline Overview */}
            <div className="timeline-overview" ref={timelineStartRef}>
              <h3>Complete Journey Map</h3>
              <div className="phases-timeline">
                {emotionalPhases.map((phase) => {
                  const isCompleted = currentDay > phase.endDay && phase.endDay !== 999999;
                  const isCurrent = currentPhase?.id === phase.id;
                  const isUpcoming = currentDay < phase.startDay;
                  
                  return (
                    <div 
                      key={phase.id} 
                      className={`timeline-phase ${isCompleted ? 'completed' : ''} ${isCurrent ? 'current' : ''} ${isUpcoming ? 'upcoming' : ''}`}
                      onClick={() => showPhaseDetails(phase)}
                      style={{ cursor: 'pointer' }}
                    >
                      <div className="timeline-phase-icon">
                        <phase.icon style={{ color: phase.color }} />
                      </div>
                      <div className="timeline-phase-info">
                        <div className="timeline-phase-name">{phase.name}</div>
                        <div className="timeline-phase-range">Days {phase.dayRange}</div>
                      </div>
                      {isCompleted && (
                        <div className="timeline-phase-check">
                          <FaCheckCircle style={{ color: "#22c55e" }} />
                        </div>
                      )}
                      {isCurrent && (
                        <div className="timeline-phase-current">
                          Current
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Mastery Levels Display */}
              {currentDay >= 181 && (
                <div className="mastery-levels-section">
                  <h3>Mastery Levels (Days 181+)</h3>
                  <div className="mastery-levels-timeline">
                    {masteryLevels.map((level) => {
                      const isCompleted = currentDay > level.endDay && level.endDay !== 999999;
                      const isCurrent = currentMasteryLevel?.id === level.id;
                      const isUpcoming = currentDay < level.startDay;
                      
                      return (
                        <div 
                          key={level.id}
                          className={`mastery-level-card ${isCompleted ? 'completed' : ''} ${isCurrent ? 'current' : ''} ${isUpcoming ? 'upcoming' : ''}`}
                        >
                          <div className="mastery-level-icon">
                            <FaTrophy />
                          </div>
                          
                          <div className="mastery-level-info">
                            <div className="mastery-level-name">Level {level.level}: {level.name}</div>
                            <div className="mastery-level-subtitle">{level.subtitle}</div>
                          </div>
                          
                          <div className="mastery-level-details">
                            <div className="mastery-level-range">
                              {level.timeRange}
                            </div>
                          </div>
                          
                          {isCurrent && (
                            <div className="mastery-level-progress">
                              <div 
                                className="mastery-progress-fill"
                                style={{ width: `${getPhaseProgress(currentPhase, currentDay, currentMasteryLevel)}%` }}
                              ></div>
                            </div>
                          )}
                          
                          <div className="mastery-level-status">
                            {isCompleted && (
                              <div className="mastery-level-check">
                                <FaCheckCircle />
                              </div>
                            )}
                            {isCurrent && (
                              <div className="mastery-level-current-badge">
                                Current Level
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Daily Emotional Check-in */}
            <div className="emotional-checkin-section">
              <h3>Daily Emotional Check-in</h3>
              
              <div className="emotion-status-section">
                {emotionsLogged ? (
                  <div className="emotions-logged">
                    <FaCheckCircle className="check-icon" />
                    <span>Emotional check-in completed for today!</span>
                    <button 
                      className="action-btn edit-emotions-btn"
                      onClick={enableEmotionEditing}
                    >
                      <FaPen />
                      <span>Edit</span>
                    </button>
                  </div>
                ) : (
                  <div className="emotions-not-logged">
                    <FaInfoCircle className="info-icon" />
                    <span>Track your emotional state to unlock personalized phase analysis and pattern recognition</span>
                  </div>
                )}
              </div>

              {/* Emotion sliders */}
              <div className="emotion-sliders">
                {[
                  { key: 'anxiety', label: 'Anxiety Level', value: todayEmotions.anxiety, lowLabel: 'Calm', highLabel: 'High Anxiety' },
                  { key: 'moodStability', label: 'Mood Stability', value: todayEmotions.moodStability, lowLabel: 'Mood Swings', highLabel: 'Very Stable' },
                  { key: 'mentalClarity', label: 'Mental Clarity', value: todayEmotions.mentalClarity, lowLabel: 'Foggy', highLabel: 'Crystal Clear' },
                  { key: 'emotionalProcessing', label: 'Emotional Processing', value: todayEmotions.emotionalProcessing, lowLabel: 'Suppressed', highLabel: 'Flowing' }
                ].map((emotion) => (
                  <div key={emotion.key} className="emotion-slider-item">
                    <div className="emotion-slider-header">
                      <span className="emotion-label">{emotion.label}</span>
                      <span className="emotion-value">{emotion.value}/10</span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="10"
                      value={emotion.value}
                      onChange={(e) => handleEmotionChange(emotion.key, parseInt(e.target.value))}
                      className="emotion-range-slider"
                      disabled={emotionsLogged}
                    />
                    <div className="slider-labels">
                      <span>{emotion.lowLabel}</span>
                      <span>{emotion.highLabel}</span>
                    </div>
                  </div>
                ))}
              </div>

              {!emotionsLogged && (
                <div className="emotion-actions">
                  <button 
                    className="action-btn save-emotions-btn"
                    onClick={saveEmotions}
                  >
                    <FaCheckCircle />
                    <span>Save Emotional Check-in</span>
                  </button>
                </div>
              )}
            </div>

            {/* Journal Section */}
            <div className="timeline-journal-section">
              <div className="journal-header">
                <div className="journal-header-spacer"></div>
                <h3>Phase-Specific Journal</h3>
                <div className="journal-actions">
                  <button 
                    className="action-btn"
                    onClick={handleJournalPrompt}
                  >
                    <FaPen />
                    <span>{todayNote ? 'Edit Entry' : 'Add Entry'}</span>
                  </button>
                </div>
              </div>

              <div className="journal-prompt">
                <FaRegLightbulb className="prompt-icon" />
                <p>{getPhaseJournalPrompt(currentPhase)}</p>
              </div>

              {todayNote ? (
                <div className="journal-preview">
                  <p>"{todayNote.length > 150 ? `${todayNote.substring(0, 150)}...` : todayNote}"</p>
                </div>
              ) : (
                <div className="empty-journal">
                  <FaInfoCircle className="info-icon" />
                  <p>No journal entry for today. Recording your journey helps track progress through phases.</p>
                </div>
              )}
            </div>

            {/* WORLD-CLASS: Comprehensive Phase Analysis Section */}
            {currentPhase && (
              <div className="phase-insight-section" ref={insightSectionRef}>
                <h3>Comprehensive Phase Analysis</h3>
                
                {(() => {
                  const analysis = generateComprehensivePhaseAnalysis(currentPhase, currentDay, userData, wisdomMode, isPremium);
                  const emotionalData = userData.emotionalTracking || [];
                  const recentData = emotionalData.filter(entry => 
                    differenceInDays(new Date(), new Date(entry.date)) <= 14
                  );
                  
                  return (
                    <>
                      {/* Data Quality Banner */}
                      {recentData.length < 7 && (
                        <div className="insight-data-banner">
                          <div className="insight-data-banner-content">
                            <FaInfoCircle className="insight-data-icon" />
                            <div className="insight-data-text">
                              <strong>Analysis improves with data:</strong> The more you track emotions, the more personalized and accurate this analysis becomes.
                              {recentData.length >= 3 && recentData.length < 7 && ` You've logged ${recentData.length} days - track 7+ days to unlock advanced pattern recognition.`}
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {/* Multiple Analysis Cards */}
                      <div className="analysis-cards-grid">
                        
                        {/* Phase Education Card */}
                        {analysis?.phaseEducation && (
                          <div className="insight-card phase-education-card">
                            <div className="insight-header">
                              <FaUserGraduate className="insight-icon-education" />
                              <span>Phase Education</span>
                            </div>
                            <div className="insight-content">
                              <div className="phase-overview">
                                <strong>Current Focus:</strong> {analysis.phaseEducation.phaseOverview}
                              </div>
                              <div className="key-learning">
                                <strong>Key Learning:</strong> {analysis.phaseEducation.keyLearning}
                              </div>
                              <div className="expectation">
                                <strong>What to Expect:</strong> {analysis.phaseEducation.expectation}
                              </div>
                              <div className="phase-progress-detail">
                                <strong>Progress:</strong> Day {analysis.phaseEducation.dayInPhase} of phase ({Math.round(analysis.phaseEducation.phaseProgress)}% complete)
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Scientific Explanation Card */}
                        {analysis?.scientificExplanation && (
                          <div className="insight-card scientific-card">
                            <div className="insight-header">
                              <FaFlask className="insight-icon-science" />
                              <span>{wisdomMode ? 'Energetic Understanding' : 'Scientific Mechanisms'}</span>
                            </div>
                            <div className="insight-content">
                              <div className="mechanism-explanation">
                                <strong>{wisdomMode ? 'Energetic:' : 'Neurochemical:'}</strong> {analysis.scientificExplanation.neurochemical}
                              </div>
                              <div className="physiological-explanation">
                                <strong>Physiological:</strong> {analysis.scientificExplanation.physiological}
                              </div>
                              <div className="behavioral-explanation">
                                <strong>{wisdomMode ? 'Consciousness:' : 'Behavioral:'}</strong> {analysis.scientificExplanation.behavioral}
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Data Analysis Card */}
                        {analysis?.dataAnalysis?.type === 'comprehensive' && (
                          <div className="insight-card data-analysis-card">
                            <div className="insight-header">
                              <FaChartLine className="insight-icon-data" />
                              <span>Personal Data Analysis</span>
                            </div>
                            <div className="insight-content">
                              <div className="wellbeing-score">
                                <strong>Wellbeing Score:</strong> {analysis.dataAnalysis.wellbeingScore.toFixed(1)}/10
                                <span className={`score-indicator ${
                                  analysis.dataAnalysis.wellbeingScore >= 7 ? 'excellent' : 
                                  analysis.dataAnalysis.wellbeingScore >= 5 ? 'good' : 'needs-attention'
                                }`}>
                                  {analysis.dataAnalysis.wellbeingScore >= 7 ? 'Excellent' : 
                                   analysis.dataAnalysis.wellbeingScore >= 5 ? 'Good' : 'Needs Attention'}
                                </span>
                              </div>
                              <div className="metric-breakdown">
                                <div className="metric-item">
                                  <span>Anxiety: {analysis.dataAnalysis.averages.avgAnxiety.toFixed(1)}/10</span>
                                  {analysis.dataAnalysis.trends?.anxiety && (
                                    <span className={`trend ${analysis.dataAnalysis.trends.anxiety}`}>
                                      {analysis.dataAnalysis.trends.anxiety === 'improving' ? '↓' : 
                                       analysis.dataAnalysis.trends.anxiety === 'concerning' ? '↑' : '→'}
                                    </span>
                                  )}
                                </div>
                                <div className="metric-item">
                                  <span>Mood: {analysis.dataAnalysis.averages.avgMoodStability.toFixed(1)}/10</span>
                                  {analysis.dataAnalysis.trends?.mood && (
                                    <span className={`trend ${analysis.dataAnalysis.trends.mood}`}>
                                      {analysis.dataAnalysis.trends.mood === 'improving' ? '↑' : 
                                       analysis.dataAnalysis.trends.mood === 'concerning' ? '↓' : '→'}
                                    </span>
                                  )}
                                </div>
                                <div className="metric-item">
                                  <span>Clarity: {analysis.dataAnalysis.averages.avgMentalClarity.toFixed(1)}/10</span>
                                  {analysis.dataAnalysis.trends?.clarity && (
                                    <span className={`trend ${analysis.dataAnalysis.trends.clarity}`}>
                                      {analysis.dataAnalysis.trends.clarity === 'improving' ? '↑' : 
                                       analysis.dataAnalysis.trends.clarity === 'concerning' ? '↓' : '→'}
                                    </span>
                                  )}
                                </div>
                                <div className="metric-item">
                                  <span>Processing: {analysis.dataAnalysis.averages.avgEmotionalProcessing.toFixed(1)}/10</span>
                                  {analysis.dataAnalysis.trends?.processing && (
                                    <span className={`trend ${analysis.dataAnalysis.trends.processing}`}>
                                      {analysis.dataAnalysis.trends.processing === 'improving' ? '↑' : 
                                       analysis.dataAnalysis.trends.processing === 'concerning' ? '↓' : '→'}
                                    </span>
                                  )}
                                </div>
                              </div>
                              {analysis.dataAnalysis.phaseAlignment && (
                                <div className="phase-alignment">
                                  <strong>Phase Alignment:</strong> 
                                  <span className={`alignment-score ${analysis.dataAnalysis.phaseAlignment.interpretation}`}>
                                    {analysis.dataAnalysis.phaseAlignment.interpretation} ({Math.round(analysis.dataAnalysis.phaseAlignment.score * 100)}%)
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Challenge Identification Card */}
                        {analysis?.challengeIdentification?.challenges?.length > 0 && (
                          <div className="insight-card challenge-card">
                            <div className="insight-header">
                              <FaShieldAlt className="insight-icon-challenge" />
                              <span>Challenge Analysis</span>
                              <span className={`risk-level ${analysis.challengeIdentification.riskLevel}`}>
                                {analysis.challengeIdentification.riskLevel.toUpperCase()} RISK
                              </span>
                            </div>
                            <div className="insight-content">
                              {analysis.challengeIdentification.challenges.map((challenge, index) => (
                                <div key={index} className={`challenge-item ${challenge.severity}`}>
                                  <div className="challenge-title">
                                    <strong>{challenge.challenge}</strong>
                                    <span className={`severity-badge ${challenge.severity}`}>{challenge.severity}</span>
                                  </div>
                                  <div className="challenge-explanation">{challenge.explanation}</div>
                                  <div className="challenge-solution">
                                    <strong>Solution:</strong> {challenge.solution}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Predictive Guidance Card */}
                        {analysis?.predictiveGuidance && (
                          <div className="insight-card predictive-card">
                            <div className="insight-header">
                              <FaSearch className="insight-icon-predictive" />
                              <span>Predictive Guidance</span>
                            </div>
                            <div className="insight-content">
                              <div className="current-focus">
                                <strong>Current Focus:</strong> {analysis.predictiveGuidance.currentFocus}
                              </div>
                              <div className="upcoming-challenge">
                                <strong>Upcoming Challenge:</strong> {analysis.predictiveGuidance.upcomingChallenge}
                              </div>
                              <div className="preparation">
                                <strong>Preparation:</strong> {analysis.predictiveGuidance.preparation}
                              </div>
                              <div className="timeline">
                                <strong>Timeline:</strong> {analysis.predictiveGuidance.timeline}
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Actionable Strategies Card */}
                        {analysis?.actionableStrategies && (
                          <div className="insight-card strategies-card">
                            <div className="insight-header">
                              <FaBolt className="insight-icon-strategies" />
                              <span>Actionable Strategies</span>
                            </div>
                            <div className="insight-content">
                              {analysis.actionableStrategies.urgent.length > 0 && (
                                <div className="strategy-section urgent">
                                  <strong>🚨 Urgent Actions:</strong>
                                  <ul>
                                    {analysis.actionableStrategies.urgent.map((action, index) => (
                                      <li key={index}>{action}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                              <div className="strategy-section daily">
                                <strong>📅 Daily Practices:</strong>
                                <ul>
                                  {analysis.actionableStrategies.daily.map((action, index) => (
                                    <li key={index}>{action}</li>
                                  ))}
                                </ul>
                              </div>
                              <div className="strategy-section weekly">
                                <strong>📊 Weekly Focus:</strong>
                                <ul>
                                  {analysis.actionableStrategies.weekly.map((action, index) => (
                                    <li key={index}>{action}</li>
                                  ))}
                                </ul>
                              </div>
                              <div className="strategy-section long-term">
                                <strong>🎯 Long-term Development:</strong>
                                <ul>
                                  {analysis.actionableStrategies.longTerm.map((action, index) => (
                                    <li key={index}>{action}</li>
                                  ))}
                                </ul>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Insufficient Data Card */}
                        {analysis?.dataAnalysis?.type === 'insufficient' && (
                          <div className="insight-card insufficient-data-card">
                            <div className="insight-header">
                              <FaStethoscope className="insight-icon-data" />
                              <span>Getting Started</span>
                            </div>
                            <div className="insight-content">
                              <div className="encouragement">
                                <strong>Begin Your Analysis Journey:</strong> You're on day {currentDay} of the {currentPhase.name} phase. 
                                Start tracking your emotions daily to unlock personalized insights about your unique journey.
                              </div>
                              <div className="data-benefits">
                                <strong>What You'll Unlock:</strong>
                                <ul>
                                  <li>• Pattern recognition across emotional metrics</li>
                                  <li>• Phase-specific challenge identification</li>
                                  <li>• Predictive guidance for upcoming phases</li>
                                  <li>• Personalized strategy recommendations</li>
                                  <li>• Scientific explanations for your experiences</li>
                                </ul>
                              </div>
                            </div>
                          </div>
                        )}

                      </div>

                      {/* Analysis Quality Footer */}
                      {analysis && (
                        <div className="analysis-footer">
                          <div className="comprehensiveness-score">
                            <strong>Analysis Comprehensiveness: {analysis.comprehensivenessScore}%</strong>
                            <div className="progress-indicator">
                              <div 
                                className="progress-fill" 
                                style={{ width: `${analysis.comprehensivenessScore}%` }}
                              ></div>
                            </div>
                          </div>
                          <div className="data-quality-indicator">
                            <span className={`quality-badge ${analysis.dataQuality.level}`}>
                              {analysis.dataQuality.description}
                            </span>
                            <span className="data-points">Based on {recentData.length} days of tracking</span>
                          </div>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Phase Detail Modal */}
      {showPhaseDetail && selectedPhase && (
        <div className="modal-overlay" onClick={() => setShowPhaseDetail(false)}>
          <div className="modal-content phase-detail-modal" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowPhaseDetail(false)}>
              <FaTimes />
            </button>

            <div className="phase-modal-header">
              <div className="phase-modal-icon" style={{ color: selectedPhase.color }}>
                <selectedPhase.icon />
              </div>
              <div className="phase-modal-info">
                <h3>{selectedPhase.name}</h3>
                <div className="phase-modal-range">Days {selectedPhase.dayRange}</div>
              </div>
            </div>

            <div className="phase-modal-description">
              <p>{wisdomMode ? selectedPhase.esotericDescription : selectedPhase.description}</p>
            </div>

            {/* Scientific Mechanism */}
            <div className="phase-modal-section">
              <h4>{wisdomMode ? 'Energetic Mechanism' : 'Scientific Mechanism'}</h4>
              <p>{selectedPhase.scientificMechanism}</p>
            </div>

            {/* Expected Symptoms */}
            <div className="phase-modal-section">
              <h4>Expected Symptoms</h4>
              <ul>
                {selectedPhase.expectedSymptoms.map((symptom, index) => (
                  <li key={index}>{symptom}</li>
                ))}
              </ul>
            </div>

            {/* Warning Signs */}
            <div className="phase-modal-section warning-section">
              <h4>⚠️ Warning Signs (Seek Support)</h4>
              <ul>
                {selectedPhase.warningSigns.map((sign, index) => (
                  <li key={index} className="warning-item">{sign}</li>
                ))}
              </ul>
            </div>

            {/* Specific Techniques */}
            <div className="phase-modal-section">
              <h4>Specific Techniques</h4>
              <ul>
                {selectedPhase.specificTechniques.map((technique, index) => (
                  <li key={index}>{technique}</li>
                ))}
              </ul>
            </div>

            {/* Trauma Release Pattern (for Emotional Purging phase) */}
            {selectedPhase.traumaReleasePattern && (
              <div className="phase-modal-section">
                <h4>Emotional Release Timeline</h4>
                <div className="trauma-timeline">
                  <div className="trauma-stage">
                    <strong>Weeks 1-4:</strong> {selectedPhase.traumaReleasePattern.weeks1to4}
                  </div>
                  <div className="trauma-stage">
                    <strong>Months 2-3:</strong> {selectedPhase.traumaReleasePattern.months2to3}
                  </div>
                  <div className="trauma-stage">
                    <strong>Months 4-6:</strong> {selectedPhase.traumaReleasePattern.months4to6}
                  </div>
                  <div className="trauma-stage">
                    <strong>6+ Months:</strong> {selectedPhase.traumaReleasePattern.sixMonthsPlus}
                  </div>
                </div>
              </div>
            )}

            <div className="phase-modal-insight">
              <h4>{wisdomMode ? 'Spiritual Understanding' : 'Scientific Understanding'}</h4>
              <p>{wisdomMode ? selectedPhase.insights.esoteric : selectedPhase.insights.scientific}</p>
            </div>
          </div>
        </div>
      )}

      {/* Journal Modal */}
      {showJournalModal && (
        <div className="modal-overlay" onClick={() => setShowJournalModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h2>Journal Entry - Day {currentDay}</h2>
            <div className="journal-modal-prompt">
              <FaRegLightbulb className="prompt-icon" />
              <p>{getPhaseJournalPrompt(currentPhase)}</p>
            </div>
            
            <div className="form-group">
              <textarea
                value={currentNote}
                onChange={(e) => setCurrentNote(e.target.value)}
                rows="6"
                placeholder="Describe your emotional state, any memories surfacing, insights gained, or experiences you're having..."
              ></textarea>
            </div>
            
            <div className="form-actions">
              <button onClick={saveNote} className="action-btn primary-action">
                <FaCheckCircle />
                Save Entry
              </button>
              <button onClick={() => setShowJournalModal(false)} className="action-btn">
                <FaTimes />
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmotionalTimeline;