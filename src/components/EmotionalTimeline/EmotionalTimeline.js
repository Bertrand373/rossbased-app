// components/EmotionalTimeline/EmotionalTimeline.js - UPDATED: Added premium lock overlay matching Tracker design
import React, { useState, useEffect } from 'react';
import { format, differenceInDays } from 'date-fns';
import toast from 'react-hot-toast';
import './EmotionalTimeline.css';

// Icons
import { FaMapSigns, FaLightbulb, FaHeart, FaBrain, FaLeaf, FaTrophy, 
  FaCheckCircle, FaLock, FaPen, FaInfoCircle, FaExclamationTriangle, 
  FaRegLightbulb, FaEye, FaTimes, FaStar } from 'react-icons/fa';

const EmotionalTimeline = ({ userData, isPremium, updateUserData }) => {
  const [showJournalModal, setShowJournalModal] = useState(false);
  const [currentNote, setCurrentNote] = useState('');
  const [wisdomMode, setWisdomMode] = useState(false);
  const [selectedPhase, setSelectedPhase] = useState(null);
  const [showPhaseDetail, setShowPhaseDetail] = useState(false);
  
  // Enhanced emotional tracking states
  const [todayEmotions, setTodayEmotions] = useState({
    anxiety: 5,
    moodStability: 5,
    mentalClarity: 5,
    emotionalProcessing: 5
  });
  const [emotionsLogged, setEmotionsLogged] = useState(false);

  // FIXED: Use current streak instead of calculated day difference
  const currentDay = userData.currentStreak || 0;

  // UPDATED: Mastery Levels System - replaces confusing milestones
  const masteryLevels = [
    { id: 1, name: "Master", dayRange: "181-365", startDay: 181, endDay: 365, duration: "6 months" },
    { id: 2, name: "Sage", dayRange: "366-730", startDay: 366, endDay: 730, duration: "1 year" },
    { id: 3, name: "Enlightened", dayRange: "731-1095", startDay: 731, endDay: 1095, duration: "1 year" },
    { id: 4, name: "Transcendent", dayRange: "1096-1460", startDay: 1096, endDay: 1460, duration: "1 year" },
    { id: 5, name: "Ascended Master", dayRange: "1461-1825", startDay: 1461, endDay: 1825, duration: "1 year" },
    { id: 6, name: "Divine Avatar", dayRange: "1826+", startDay: 1826, endDay: 999999, duration: "Eternal" }
  ];

  // UPDATED: Get current mastery level for advanced practitioners
  const getCurrentMasteryLevel = () => {
    if (currentDay < 181) return null;
    
    for (const level of masteryLevels) {
      if (currentDay >= level.startDay && currentDay <= level.endDay) {
        return level;
      }
    }
    
    // Fallback to highest level for extremely long streaks
    return masteryLevels[masteryLevels.length - 1];
  };

  // FIXED: Enhanced phase definitions with correct icon colors
  const emotionalPhases = [
    {
      id: 1,
      name: "Initial Adaptation",
      dayRange: "1-14",
      startDay: 1,
      endDay: 14,
      icon: FaLeaf,
      color: "#22c55e", // Green
      description: "Your body begins adapting to retention while initial urges peak",
      esotericDescription: "The vital force begins redirecting from lower centers to higher consciousness",
      commonExperiences: [
        "Strong physical urges",
        "Excitement and motivation", 
        "Restlessness",
        "Increased energy"
      ],
      esotericExperiences: [
        "Life force awakening",
        "Spiritual excitement",
        "Energy seeking new pathways",
        "Kundalini stirring"
      ],
      copingStrategies: [
        "Cold showers daily",
        "Intense physical exercise",
        "Stay extremely busy",
        "Use urge management tools"
      ],
      esotericStrategies: [
        "Channel energy through breathwork",
        "Practice energy circulation",
        "Ground excess energy in nature",
        "Invoke protective mantras"
      ],
      insights: {
        practical: "This phase is about building new neural pathways. Your brain is rewiring itself away from instant gratification.",
        esoteric: "You're breaking free from millennia of unconscious patterns. The life force is remembering its divine purpose."
      }
    },
    {
      id: 2,
      name: "Emotional Purging",
      dayRange: "15-45",
      startDay: 15,
      endDay: 45,
      icon: FaHeart,
      color: "#f59e0b", // Orange/Yellow
      description: "Suppressed emotions surface for healing - this is the most challenging phase",
      esotericDescription: "The heart chakra opens, releasing stored emotional trauma for spiritual purification",
      commonExperiences: [
        "Intense mood swings",
        "Anxiety and depression waves",
        "Old memories surfacing",
        "Feeling emotionally raw",
        "Crying episodes",
        "Anger flashes"
      ],
      esotericExperiences: [
        "Karmic memories awakening",
        "Past life emotional releases",
        "Shadow integration process",
        "Heart chakra purification",
        "Emotional body cleansing",
        "Soul fragments returning"
      ],
      copingStrategies: [
        "Journal extensively",
        "Accept emotions without resistance", 
        "Therapy or counseling",
        "Meditation and mindfulness",
        "Gentle exercise",
        "Reach out to support systems"
      ],
      esotericStrategies: [
        "Practice emotional alchemy",
        "Use crystal healing for heart chakra",
        "Perform ritual cleansing",
        "Connect with your higher self",
        "Channel emotions into creative work",
        "Seek guidance from spiritual teachers"
      ],
      insights: {
        practical: "This emotional turbulence is your psyche healing itself. Suppressed feelings are finally being processed and released.",
        esoteric: "You're undergoing a sacred initiation - the dissolution of the ego's emotional armor to reveal your authentic self."
      }
    },
    {
      id: 3,
      name: "Mental Expansion", 
      dayRange: "46-90",
      startDay: 46,
      endDay: 90,
      icon: FaBrain,
      color: "#3b82f6", // Blue
      description: "Cognitive abilities enhance as emotional turbulence stabilizes",
      esotericDescription: "The third eye awakens as mental faculties expand beyond ordinary consciousness",
      commonExperiences: [
        "Improved focus and concentration",
        "Enhanced creativity",
        "Clearer decision making",
        "Better memory",
        "Increased motivation",
        "Emotional stability returning"
      ],
      esotericExperiences: [
        "Third eye activation",
        "Psychic abilities emerging",
        "Intuitive downloads increasing",
        "Connection to universal mind",
        "Prophetic dreams",
        "Telepathic sensitivity"
      ],
      copingStrategies: [
        "Pursue challenging mental tasks",
        "Learn new skills",
        "Set ambitious goals",
        "Practice problem-solving",
        "Engage in creative projects",
        "Read complex material"
      ],
      esotericStrategies: [
        "Practice meditation on third eye",
        "Study sacred geometry",
        "Explore consciousness expansion",
        "Connect with higher dimensions",
        "Channel creative inspiration",
        "Practice lucid dreaming"
      ],
      insights: {
        practical: "Your brain is operating at higher efficiency due to increased neuroplasticity and optimized neurotransmitter balance.",
        esoteric: "The retained life force is now powering higher mental faculties, connecting you to the universal field of consciousness."
      }
    },
    {
      id: 4,
      name: "Spiritual Integration",
      dayRange: "91-180",
      startDay: 91,
      endDay: 180,
      icon: FaLightbulb,
      color: "#8b5cf6", // Purple
      description: "Profound inner transformation as benefits become deeply integrated",
      esotericDescription: "Soul integration as the divine masculine energy fully awakens within",
      commonExperiences: [
        "Deep sense of purpose",
        "Magnetic personal presence",
        "Effortless discipline",
        "Compassionate wisdom",
        "Natural leadership qualities",
        "Inner peace and confidence"
      ],
      esotericExperiences: [
        "Divine masculine embodiment",
        "Christ consciousness activation",
        "Merkaba energy body activation",
        "Cosmic consciousness glimpses",
        "Service to humanity calling",
        "Unity consciousness experiences"
      ],
      copingStrategies: [
        "Share wisdom with others",
        "Take on leadership roles",
        "Pursue meaningful work",
        "Build deep relationships",
        "Practice gratitude daily",
        "Maintain humble confidence"
      ],
      esotericStrategies: [
        "Practice service to others",
        "Teach what you've learned",
        "Connect with spiritual community",
        "Study advanced metaphysics",
        "Practice energy healing",
        "Prepare for ascension"
      ],
      insights: {
        practical: "You've achieved what few people ever do - complete mastery over one of humanity's strongest drives. This discipline transfers to all areas of life.",
        esoteric: "You've successfully transmuted the base life force into spiritual gold. You now carry the refined energy of the awakened masculine."
      }
    },
    {
      id: 5,
      name: "Mastery & Service",
      dayRange: "181+",
      startDay: 181,
      endDay: 999999, // UPDATED: Very high number for mastery system
      icon: FaTrophy,
      color: "#ffdd00", // Gold/Yellow
      description: "Complete integration - you've transcended the need for external validation",
      esotericDescription: "Bodhisattva consciousness - enlightened being choosing to serve others",
      commonExperiences: [
        "Effortless self-control",
        "Natural charisma and influence",
        "Deep emotional intelligence",
        "Visionary thinking",
        "Inspirational presence",
        "Wisdom beyond your years"
      ],
      esotericExperiences: [
        "Avatar consciousness",
        "Direct divine communication",
        "Healing abilities manifesting",
        "Timeline manipulation awareness",
        "Multidimensional perception",
        "Cosmic mission clarity"
      ],
      copingStrategies: [
        "Mentor others on the path",
        "Create lasting positive impact",
        "Build your legacy",
        "Maintain beginner's mind",
        "Practice radical compassion",
        "Stay grounded in humility"
      ],
      esotericStrategies: [
        "Anchor higher frequencies on Earth",
        "Assist in planetary awakening",
        "Bridge heaven and earth",
        "Embody divine will",
        "Transmit light to others",
        "Prepare for cosmic service"
      ],
      insights: {
        practical: "You've become a living example of human potential. Your presence alone inspires others to pursue their highest path.",
        esoteric: "You are now a conscious co-creator with the divine, wielding the full power of transmuted sexual energy for cosmic purposes."
      }
    }
  ];

  // FIXED: Get current phase based on current streak (not calculated days)
  const getCurrentPhase = () => {
    if (currentDay <= 0) return null;
    
    // Find the phase that contains the current day
    for (const phase of emotionalPhases) {
      if (currentDay >= phase.startDay && (phase.endDay === 999999 || currentDay <= phase.endDay)) {
        return phase;
      }
    }
    
    // Fallback to first phase if something goes wrong
    return emotionalPhases[0];
  };

  const currentPhase = getCurrentPhase();

  // UPDATED: Calculate progress percentage with mastery level support
  const getPhaseProgress = (phase) => {
    if (!phase || currentDay <= 0) return 0;
    
    // UPDATED: Special handling for mastery phase (181+)
    if (phase.startDay === 181) {
      const masteryLevel = getCurrentMasteryLevel();
      if (!masteryLevel) return 0;
      
      // Calculate progress within current mastery level
      const daysIntoLevel = currentDay - masteryLevel.startDay;
      const totalDaysInLevel = masteryLevel.endDay === 999999 ? 
        365 : (masteryLevel.endDay - masteryLevel.startDay + 1); // 1 year for most levels
      
      const progress = (daysIntoLevel / totalDaysInLevel) * 100;
      return Math.min(100, Math.max(0, progress));
    }
    
    // CORRECTED: Calculate how far through the current phase
    const daysCompletedInPhase = currentDay - phase.startDay; // How many days completed (0-based from phase start)
    const totalDaysInPhase = phase.endDay - phase.startDay + 1; // Total days this phase spans
    const progress = (daysCompletedInPhase / totalDaysInPhase) * 100;
    
    return Math.min(100, Math.max(0, progress));
  };

  // UPDATED: Get progress text with mastery level support
  const getPhaseProgressText = (phase) => {
    if (!phase || currentDay <= 0) return "";
    
    // UPDATED: Special handling for mastery phase - show level progression
    if (phase.startDay === 181) {
      const masteryLevel = getCurrentMasteryLevel();
      if (!masteryLevel) return "";
      
      const daysIntoLevel = currentDay - masteryLevel.startDay;
      const currentDayInLevel = daysIntoLevel + 1; // 1-based current day in level
      
      if (masteryLevel.endDay === 999999) {
        // Divine Avatar level - eternal
        return `Level ${masteryLevel.id} ${masteryLevel.name} - Day ${currentDayInLevel} (Eternal Journey)`;
      } else {
        const totalDaysInLevel = masteryLevel.endDay - masteryLevel.startDay + 1;
        const daysRemainingInLevel = masteryLevel.endDay - currentDay;
        return `Level ${masteryLevel.id} ${masteryLevel.name} - Day ${currentDayInLevel} of ${totalDaysInLevel} (${daysRemainingInLevel} days to next level)`;
      }
    }
    
    // CORRECTED CALCULATION for regular phases:
    const daysCompletedInPhase = currentDay - phase.startDay; // 0-based completed days
    const currentDayInPhase = daysCompletedInPhase + 1; // 1-based current day in phase
    const totalDaysInPhase = phase.endDay - phase.startDay + 1; // Total phase length
    const daysRemainingInPhase = phase.endDay - currentDay; // Days left after today
    
    return `Day ${currentDayInPhase} of ${totalDaysInPhase} in this phase (${daysRemainingInPhase} remaining)`;
  };

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
    if (!isPremium) return; // Prevent changes if not premium
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
    
    // Remove existing entry for today if it exists
    const updatedEmotionalTracking = (userData.emotionalTracking || []).filter(
      emotion => format(new Date(emotion.date), 'yyyy-MM-dd') !== todayStr
    );
    
    // Add new entry
    updatedEmotionalTracking.push({
      date: today,
      day: currentDay,
      phase: currentPhase?.id || 1,
      ...todayEmotions
    });
    
    // Sort by date
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

  // Get phase-specific journal prompt
  const getPhaseJournalPrompt = () => {
    if (!currentPhase) return "How are you feeling about your journey today?";
    
    const prompts = {
      1: "What urges are you experiencing? How are you channeling this new energy?",
      2: "What emotions or memories are surfacing? Remember, this purging is part of healing.",
      3: "How has your mental clarity improved? What new insights are you gaining?", 
      4: "What deeper purpose is emerging in your life? How do you want to serve others?",
      5: "How are you using your mastery to inspire and help others on their journey?"
    };
    
    return prompts[currentPhase.id] || prompts[1];
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

  // ADDED: Premium upgrade handler
  const handleUpgradeClick = () => {
    toast.success('Premium upgrade coming soon! 🚀');
  };

  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const todayNote = userData.notes && userData.notes[todayStr];

  return (
    <div className="emotional-timeline-container">
      {/* Header */}
      <div className="timeline-header">
        <div className="timeline-header-spacer"></div>
        <h2>Emotional Timeline</h2>
        <div className="timeline-header-actions">
          <button 
            className={`wisdom-toggle-btn ${wisdomMode ? 'active' : ''}`}
            onClick={() => isPremium ? setWisdomMode(!wisdomMode) : handleUpgradeClick()}
            title={isPremium ? (wisdomMode ? "Switch to Practical View" : "Switch to Esoteric View") : "Premium Feature"}
            disabled={!isPremium}
          >
            <FaEye />
            <span>{wisdomMode ? 'Esoteric' : 'Practical'}</span>
          </button>
        </div>
      </div>

      {/* UPDATED: Timeline Content Container with Premium Lock */}
      <div className="timeline-content-container">
        {/* ULTRA FIX: Current Phase Display with CSS custom properties */}
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

              {/* ULTRA FIX: Progress bar using CSS custom properties */}
              <div className="phase-progress">
                <div 
                  className="progress-bar"
                  style={{
                    '--phase-color': currentPhase.color
                  }}
                >
                  <div 
                    className="progress-fill progress-fill-colored"
                    style={{ 
                      width: `${getPhaseProgress(currentPhase)}%`
                    }}
                  ></div>
                </div>
                <div className="progress-text">
                  {getPhaseProgressText(currentPhase)}
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

        {/* UPDATED: Timeline Overview with mastery levels section */}
        <div className="timeline-overview">
          <h3>Complete Journey Map</h3>
          <div className="phases-timeline">
            {emotionalPhases.map((phase, index) => {
              const isCompleted = currentDay > phase.endDay && phase.endDay !== 999999;
              const isCurrent = currentPhase?.id === phase.id;
              const isUpcoming = currentDay < phase.startDay;
              
              return (
                <div 
                  key={phase.id} 
                  className={`timeline-phase ${isCompleted ? 'completed' : ''} ${isCurrent ? 'current' : ''} ${isUpcoming ? 'upcoming' : ''} ${!isPremium ? 'locked' : ''}`}
                  onClick={() => showPhaseDetails(phase)}
                >
                  <div className="timeline-phase-icon" style={{ color: phase.color }}>
                    <phase.icon />
                  </div>
                  <div className="timeline-phase-info">
                    <div className="timeline-phase-name">{phase.name}</div>
                    <div className="timeline-phase-range">Days {phase.dayRange}</div>
                  </div>
                  {isPremium ? (
                    <>
                      {isCompleted && (
                        <div className="timeline-phase-check">
                          <FaCheckCircle style={{ color: phase.color }} />
                        </div>
                      )}
                      {isCurrent && (
                        <div className="timeline-phase-current" style={{ color: phase.color }}>
                          Current
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="timeline-phase-lock">
                      <FaLock />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* ADDED: Mastery Levels Display for advanced practitioners */}
          {currentDay >= 181 && (
            <div className="mastery-levels-section">
              <h3>Mastery Levels (Days 181+)</h3>
              <div className="mastery-levels-grid">
                {masteryLevels.map((level, index) => {
                  const isCompleted = currentDay > level.endDay && level.endDay !== 999999;
                  const isCurrent = getCurrentMasteryLevel()?.id === level.id;
                  const isUpcoming = currentDay < level.startDay;
                  
                  return (
                    <div 
                      key={level.id}
                      className={`mastery-level-card ${isCompleted ? 'completed' : ''} ${isCurrent ? 'current' : ''} ${isUpcoming ? 'upcoming' : ''} ${!isPremium ? 'locked' : ''}`}
                    >
                      <div className="mastery-level-header">
                        <div className="mastery-level-number">Level {level.id}</div>
                        <div className="mastery-level-name">{level.name}</div>
                      </div>
                      <div className="mastery-level-range">Days {level.dayRange}</div>
                      <div className="mastery-level-duration">{level.duration}</div>
                      
                      {isPremium && isCurrent && (
                        <div className="mastery-level-progress">
                          <div className="mastery-progress-bar">
                            <div 
                              className="mastery-progress-fill"
                              style={{ width: `${getPhaseProgress(currentPhase)}%` }}
                            ></div>
                          </div>
                        </div>
                      )}
                      
                      {isPremium ? (
                        <>
                          {isCompleted && (
                            <div className="mastery-level-check">
                              <FaCheckCircle />
                            </div>
                          )}
                          {isCurrent && (
                            <div className="mastery-level-current">
                              Current Level
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="mastery-level-lock">
                          <FaLock />
                        </div>
                      )}
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
                {isPremium ? (
                  <button 
                    className="action-btn edit-emotions-btn"
                    onClick={enableEmotionEditing}
                  >
                    <FaPen />
                    <span>Edit</span>
                  </button>
                ) : (
                  <button 
                    className="action-btn edit-emotions-btn"
                    onClick={handleUpgradeClick}
                  >
                    <FaStar />
                    <span>Unlock</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="emotions-not-logged">
                <FaInfoCircle className="info-icon" />
                <span>Track your emotional state to better understand your phase progression</span>
              </div>
            )}
          </div>

          {/* UPDATED: Emotion sliders with premium lock */}
          <div className={`emotion-sliders-container ${!isPremium ? 'premium-locked' : ''}`}>
            <div className="emotion-sliders">
              <div className="emotion-slider-item">
                <div className="emotion-slider-header">
                  <span className="emotion-label">Anxiety Level</span>
                  <span className="emotion-value">{todayEmotions.anxiety}/10</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={todayEmotions.anxiety}
                  onChange={(e) => handleEmotionChange('anxiety', parseInt(e.target.value))}
                  className="emotion-range-slider"
                  disabled={emotionsLogged || !isPremium}
                />
                <div className="slider-labels">
                  <span>Calm</span>
                  <span>High Anxiety</span>
                </div>
              </div>

              <div className="emotion-slider-item">
                <div className="emotion-slider-header">
                  <span className="emotion-label">Mood Stability</span>
                  <span className="emotion-value">{todayEmotions.moodStability}/10</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={todayEmotions.moodStability}
                  onChange={(e) => handleEmotionChange('moodStability', parseInt(e.target.value))}
                  className="emotion-range-slider"
                  disabled={emotionsLogged || !isPremium}
                />
                <div className="slider-labels">
                  <span>Mood Swings</span>
                  <span>Very Stable</span>
                </div>
              </div>

              <div className="emotion-slider-item">
                <div className="emotion-slider-header">
                  <span className="emotion-label">Mental Clarity</span>
                  <span className="emotion-value">{todayEmotions.mentalClarity}/10</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={todayEmotions.mentalClarity}
                  onChange={(e) => handleEmotionChange('mentalClarity', parseInt(e.target.value))}
                  className="emotion-range-slider"
                  disabled={emotionsLogged || !isPremium}
                />
                <div className="slider-labels">
                  <span>Foggy</span>
                  <span>Crystal Clear</span>
                </div>
              </div>

              <div className="emotion-slider-item">
                <div className="emotion-slider-header">
                  <span className="emotion-label">Emotional Processing</span>
                  <span className="emotion-value">{todayEmotions.emotionalProcessing}/10</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={todayEmotions.emotionalProcessing}
                  onChange={(e) => handleEmotionChange('emotionalProcessing', parseInt(e.target.value))}
                  className="emotion-range-slider"
                  disabled={emotionsLogged || !isPremium}
                />
                <div className="slider-labels">
                  <span>Suppressed</span>
                  <span>Flowing</span>
                </div>
              </div>
            </div>

            {/* PREMIUM LOCK OVERLAY for emotion sliders */}
            {!isPremium && (
              <div className="timeline-premium-lock-overlay">
                <div className="timeline-lock-fade-gradient">
                  <div className="timeline-lock-center">
                    <FaLock className="timeline-lock-icon" />
                    <span className="timeline-lock-text">Premium</span>
                    <span className="timeline-lock-subtitle">Unlock Emotional Tracking</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {!emotionsLogged && (
            <div className="emotion-actions">
              {isPremium ? (
                <button 
                  className="action-btn save-emotions-btn"
                  onClick={saveEmotions}
                >
                  <FaCheckCircle />
                  <span>Save Emotional Check-in</span>
                </button>
              ) : (
                <button 
                  className="action-btn upgrade-emotions-btn"
                  onClick={handleUpgradeClick}
                >
                  <FaStar />
                  <span>Unlock Emotional Tracking</span>
                </button>
              )}
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
                disabled={!isPremium}
              >
                <FaPen />
                <span>{isPremium ? (todayNote ? 'Edit Entry' : 'Add Entry') : 'Premium Feature'}</span>
              </button>
            </div>
          </div>

          <div className="journal-prompt">
            <FaRegLightbulb className="prompt-icon" />
            <p>{getPhaseJournalPrompt()}</p>
          </div>

          {isPremium ? (
            <>
              {todayNote ? (
                <div className="journal-preview">
                  <p>"{todayNote.length > 150 ? `${todayNote.substring(0, 150)}...` : todayNote}"</p>
                </div>
              ) : (
                <div className="empty-journal">
                  <FaInfoCircle className="info-icon" />
                  <p>No journal entry for today. Recording your emotional journey helps track progress through phases.</p>
                </div>
              )}
            </>
          ) : (
            <div className="journal-premium-teaser">
              <FaLock className="lock-icon" />
              <p>Unlock phase-specific journal prompts and track your emotional journey through each phase with Premium.</p>
              <button className="upgrade-journal-btn" onClick={handleUpgradeClick}>
                <FaStar />
                Upgrade to Premium
              </button>
            </div>
          )}
        </div>

        {/* Current Phase Insight */}
        {currentPhase && (
          <div className="phase-insight-section">
            <h3>Understanding Your Current Phase</h3>
            {isPremium ? (
              <div className="insight-card">
                <div className="insight-header">
                  <FaRegLightbulb className="insight-icon" />
                  <span>{wisdomMode ? 'Spiritual Insight' : 'Practical Insight'}</span>
                </div>
                <div className="insight-text">
                  {wisdomMode ? currentPhase.insights.esoteric : currentPhase.insights.practical}
                </div>
              </div>
            ) : (
              <div className="insight-premium-teaser">
                <FaLock className="lock-icon" />
                <p>Get deep insights into your current phase with practical and spiritual perspectives.</p>
                <button className="upgrade-insight-btn" onClick={handleUpgradeClick}>
                  <FaStar />
                  Unlock Phase Insights
                </button>
              </div>
            )}
          </div>
        )}

        {/* PREMIUM LOCK OVERLAY covering the entire timeline content */}
        {!isPremium && (
          <div className="main-timeline-premium-lock-overlay">
            <div className="main-timeline-lock-fade-gradient">
              <div className="main-timeline-lock-center">
                <FaLock className="main-timeline-lock-icon" />
                <span className="main-timeline-lock-text">Premium</span>
                <span className="main-timeline-lock-subtitle">Unlock Full Emotional Timeline</span>
                <button className="main-timeline-upgrade-btn" onClick={handleUpgradeClick}>
                  <FaStar />
                  Upgrade Now
                </button>
              </div>
            </div>
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

            <div className="phase-modal-section">
              <h4>Common Experiences</h4>
              <ul>
                {(wisdomMode ? selectedPhase.esotericExperiences : selectedPhase.commonExperiences).map((experience, index) => (
                  <li key={index}>{experience}</li>
                ))}
              </ul>
            </div>

            <div className="phase-modal-section">
              <h4>Coping Strategies</h4>
              <ul>
                {(wisdomMode ? selectedPhase.esotericStrategies : selectedPhase.copingStrategies).map((strategy, index) => (
                  <li key={index}>{strategy}</li>
                ))}
              </ul>
            </div>

            <div className="phase-modal-insight">
              <h4>{wisdomMode ? 'Spiritual Understanding' : 'Scientific Understanding'}</h4>
              <p>{wisdomMode ? selectedPhase.insights.esoteric : selectedPhase.insights.practical}</p>
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
              <p>{getPhaseJournalPrompt()}</p>
            </div>
            
            <div className="form-group">
              <textarea
                value={currentNote}
                onChange={(e) => setCurrentNote(e.target.value)}
                rows="6"
                placeholder="Describe your emotional state, any memories surfacing, or insights gained..."
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