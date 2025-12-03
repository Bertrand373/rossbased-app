// EmotionalTimeline.js - TITANTRACK MINIMAL
import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import './EmotionalTimeline.css';
import { FaTimes, FaCheck, FaExclamationTriangle } from 'react-icons/fa';

const EmotionalTimeline = ({ userData, updateUserData }) => {
  const [activeTab, setActiveTab] = useState('journey');
  const [selectedPhase, setSelectedPhase] = useState(null);
  const [showModal, setShowModal] = useState(false);
  
  // Check-in state
  const [emotions, setEmotions] = useState({
    anxiety: 5,
    mood: 5,
    clarity: 5,
    processing: 5
  });
  const [hasLoggedToday, setHasLoggedToday] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const currentDay = userData?.currentStreak || 0;

  // Phase definitions
  const phases = [
    {
      id: 1,
      name: "Initial Adaptation",
      days: "1-14",
      start: 1,
      end: 14,
      summary: "Body begins adapting while urges peak",
      description: "Your body begins adapting to retention while initial urges peak. This phase builds new neural pathways as your brain rewires dopamine pathways away from instant gratification.",
      science: "Cessation triggers hypothalamic-pituitary adjustments. Testosterone stabilizes while dopamine receptors rebalance from overstimulation.",
      symptoms: [
        "Strong physical urges and restlessness",
        "Energy fluctuations between high and fatigue",
        "Sleep disruption as body adjusts",
        "Excitement and motivation bursts",
        "Appetite changes and food cravings"
      ],
      warnings: [
        "Extreme mood swings beyond normal adaptation",
        "Complete inability to sleep for multiple nights",
        "Severe anxiety or panic attacks",
        "Thoughts of self-harm or extreme despair"
      ],
      techniques: [
        "Cold showers daily (2-5 minutes)",
        "Intense physical exercise",
        "Establish morning routine",
        "Remove triggers from environment",
        "4-7-8 breathing during urges"
      ]
    },
    {
      id: 2,
      name: "Emotional Processing",
      days: "15-45",
      start: 15,
      end: 45,
      summary: "Suppressed emotions surface for healing",
      description: "Suppressed emotions surface for healing - this is often the most challenging phase. Your psyche is healing itself through this natural process.",
      science: "Without ejaculation's endorphin/prolactin release numbing pain, stored trauma surfaces. Retained energy amplifies all emotions as healing occurs.",
      symptoms: [
        "Intense mood swings and emotional volatility",
        "Waves of anxiety, depression, sadness",
        "Old memories surfacing vividly",
        "Crying episodes without clear triggers",
        "Anger flashes and irritability"
      ],
      warnings: [
        "Suicidal thoughts or self-harm ideation",
        "Complete emotional numbness lasting weeks",
        "Violent impulses toward others",
        "Inability to function in daily life"
      ],
      techniques: [
        "Journal extensively without censoring",
        "Accept emotions without resistance",
        "Cold water face splash when overwhelmed",
        "Vigorous exercise during anger",
        "Seek therapy for severe trauma"
      ]
    },
    {
      id: 3,
      name: "Mental Expansion",
      days: "46-90",
      start: 46,
      end: 90,
      summary: "Cognitive abilities enhance significantly",
      description: "Cognitive abilities enhance as emotional turbulence stabilizes. Your brain operates at higher efficiency with optimized neurotransmitter balance.",
      science: "Retained nutrients rebuild nerve sheaths. Brain tissue becomes more densely connected as resources redirect from reproduction to cognition.",
      symptoms: [
        "Dramatically improved focus",
        "Enhanced creativity and problem-solving",
        "Clearer, faster decision-making",
        "Better memory formation and recall",
        "Interest in deeper subjects"
      ],
      warnings: [
        "Intellectual arrogance or superiority",
        "Overthinking leading to paralysis",
        "Neglecting emotional and physical needs"
      ],
      techniques: [
        "Take on challenging mental projects",
        "Learn new skills",
        "Read complex material",
        "Practice strategic thinking",
        "Engage in creative activities"
      ]
    },
    {
      id: 4,
      name: "Integration",
      days: "91-180",
      start: 91,
      end: 180,
      summary: "Benefits become deeply integrated",
      description: "Profound inner transformation as benefits become deeply integrated. Complete endocrine rebalancing creates stable high-performance states.",
      science: "The entire nervous system optimizes for retention, creating self-sustaining high-performance states with permanent neuroplastic changes.",
      symptoms: [
        "Deep sense of life purpose",
        "Natural charisma and presence",
        "Effortless self-discipline",
        "Inner peace in all circumstances",
        "Intuitive abilities strengthen"
      ],
      warnings: [
        "Avoiding practical responsibilities",
        "Grandiose thinking",
        "Isolation from human connection"
      ],
      techniques: [
        "Take on leadership roles",
        "Mentor others on the journey",
        "Pursue meaningful work",
        "Build deeper relationships",
        "Practice daily gratitude"
      ]
    },
    {
      id: 5,
      name: "Mastery",
      days: "181+",
      start: 181,
      end: 999999,
      summary: "Complete integration and transcendence",
      description: "You've transcended the need for external validation. Sexual energy is permanently redirected, creating sustained states of expanded awareness.",
      science: "Permanent neuroplastic changes create self-sustaining states. Enhanced connectivity between regions associated with self-control and higher cognition.",
      symptoms: [
        "Effortless self-control",
        "Natural influence and presence",
        "Deep emotional intelligence",
        "Visionary thinking",
        "Others seeking your guidance"
      ],
      warnings: [
        "Using abilities for selfish gain",
        "Losing touch with ordinary experience",
        "Developing contempt for others"
      ],
      techniques: [
        "Focus on legacy creation",
        "Teach and guide others",
        "Apply abilities to serve others",
        "Maintain humility",
        "Stay connected to beginners"
      ]
    }
  ];

  // Get current phase
  const getCurrentPhase = () => {
    if (currentDay <= 0) return phases[0];
    for (const phase of phases) {
      if (currentDay >= phase.start && (phase.end === 999999 || currentDay <= phase.end)) {
        return phase;
      }
    }
    return phases[0];
  };

  const currentPhase = getCurrentPhase();

  // Get phase status
  const getPhaseStatus = (phase) => {
    if (currentDay < phase.start) return 'upcoming';
    if (currentDay > phase.end && phase.end !== 999999) return 'completed';
    return 'current';
  };

  // Get progress in current phase
  const getProgress = () => {
    if (!currentPhase || currentDay <= 0) return { percent: 0, text: '' };
    
    if (currentPhase.end === 999999) {
      const daysIn = currentDay - currentPhase.start + 1;
      return { percent: 100, text: `Day ${daysIn} of mastery` };
    }
    
    const daysIn = currentDay - currentPhase.start + 1;
    const totalDays = currentPhase.end - currentPhase.start + 1;
    const remaining = currentPhase.end - currentDay;
    const percent = Math.min(100, (daysIn / totalDays) * 100);
    
    return { 
      percent, 
      text: `Day ${daysIn} of ${totalDays} (${remaining} remaining)` 
    };
  };

  const progress = getProgress();

  // Check if logged today and load existing values
  useEffect(() => {
    if (userData?.emotionalLog) {
      const today = new Date().toDateString();
      const todayLog = userData.emotionalLog.find(
        log => new Date(log.date).toDateString() === today
      );
      if (todayLog) {
        setHasLoggedToday(true);
        setEmotions({
          anxiety: todayLog.anxiety || 5,
          mood: todayLog.mood || 5,
          clarity: todayLog.clarity || 5,
          processing: todayLog.processing || 5
        });
      }
    }
  }, [userData?.emotionalLog]);

  // Analysis
  const getAnalysis = () => {
    if (!userData?.emotionalLog || userData.emotionalLog.length < 3) return null;
    
    const logs = userData.emotionalLog;
    const recent = logs.slice(-14);
    const older = logs.slice(0, -14);
    
    // Calculate averages
    const avg = (arr, key) => arr.reduce((s, l) => s + (l[key] || 5), 0) / arr.length;
    
    const recentAvg = {
      anxiety: avg(recent, 'anxiety'),
      mood: avg(recent, 'mood'),
      clarity: avg(recent, 'clarity')
    };
    
    const olderAvg = older.length > 0 ? {
      anxiety: avg(older, 'anxiety'),
      mood: avg(older, 'mood'),
      clarity: avg(older, 'clarity')
    } : null;
    
    // Trends
    const getTrend = (key, invert = false) => {
      if (!olderAvg) return 'stable';
      const diff = recentAvg[key] - olderAvg[key];
      const threshold = 0.5;
      if (invert) {
        if (diff < -threshold) return 'improving';
        if (diff > threshold) return 'concerning';
      } else {
        if (diff > threshold) return 'improving';
        if (diff < -threshold) return 'concerning';
      }
      return 'stable';
    };
    
    // Wellbeing score
    const wellbeing = Math.round(
      ((10 - recentAvg.anxiety) + recentAvg.mood + recentAvg.clarity) / 3 * 10
    );
    
    return {
      total: logs.length,
      recent: recent.length,
      wellbeing: `${wellbeing}%`,
      trends: {
        anxiety: getTrend('anxiety', true),
        mood: getTrend('mood'),
        clarity: getTrend('clarity')
      }
    };
  };

  const analysis = getAnalysis();

  // Save handler
  const handleSave = () => {
    if (!userData) return;
    
    const today = new Date().toDateString();
    const existingLogs = userData.emotionalLog || [];
    
    // Remove existing entry for today if editing
    const filteredLogs = existingLogs.filter(
      log => new Date(log.date).toDateString() !== today
    );
    
    const newEntry = {
      date: new Date(),
      day: currentDay,
      phase: currentPhase?.name || 'Unknown',
      ...emotions
    };
    
    updateUserData({ emotionalLog: [...filteredLogs, newEntry] });
    setHasLoggedToday(true);
    setIsEditing(false);
    toast.success(isEditing ? 'Check-in updated' : 'Check-in saved');
  };

  // Enable editing
  const handleEdit = () => {
    setIsEditing(true);
  };

  // Cancel editing
  const handleCancelEdit = () => {
    // Reload original values
    if (userData?.emotionalLog) {
      const today = new Date().toDateString();
      const todayLog = userData.emotionalLog.find(
        log => new Date(log.date).toDateString() === today
      );
      if (todayLog) {
        setEmotions({
          anxiety: todayLog.anxiety || 5,
          mood: todayLog.mood || 5,
          clarity: todayLog.clarity || 5,
          processing: todayLog.processing || 5
        });
      }
    }
    setIsEditing(false);
  };

  // Open phase modal
  const openPhase = (phase) => {
    setSelectedPhase(phase);
    setShowModal(true);
  };

  // Determine if sliders should be interactive
  const slidersDisabled = hasLoggedToday && !isEditing;

  return (
    <div className="et-container">
      {/* Header */}
      <header className="et-header">
        <h1>Emotional Timeline</h1>
        <p>Day {currentDay} · {currentPhase?.name}</p>
      </header>

      {/* Tabs - Text only with dividers */}
      <nav className="et-tabs">
        {['journey', 'checkin', 'analysis'].map((tab, index, arr) => (
          <React.Fragment key={tab}>
            <button
              className={`et-tab ${activeTab === tab ? 'active' : ''}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab === 'journey' && 'Journey'}
              {tab === 'checkin' && 'Check-in'}
              {tab === 'analysis' && 'Analysis'}
            </button>
            {index < arr.length - 1 && <span className="et-tab-divider" />}
          </React.Fragment>
        ))}
      </nav>

      {/* Journey Tab */}
      {activeTab === 'journey' && (
        <div className="et-journey">
          {/* Current Phase Card */}
          <div className="et-current" onClick={() => openPhase(currentPhase)}>
            <div className="et-current-label">Current Phase</div>
            <h2 className="et-current-name">{currentPhase?.name}</h2>
            <p className="et-current-days">Days {currentPhase?.days}</p>
            
            <div className="et-progress">
              <div className="et-progress-bar">
                <div 
                  className="et-progress-fill" 
                  style={{ width: `${progress.percent}%` }} 
                />
              </div>
              <span className="et-progress-text">{progress.text}</span>
            </div>
          </div>

          {/* Phase List */}
          <div className="et-phases">
            {phases.map((phase, index) => {
              const status = getPhaseStatus(phase);
              return (
                <div 
                  key={phase.id}
                  className={`et-phase ${status}`}
                  onClick={() => openPhase(phase)}
                >
                  <div className="et-phase-num">
                    {String(index + 1).padStart(2, '0')}
                  </div>
                  <div className="et-phase-info">
                    <h3>{phase.name}</h3>
                    <p>Days {phase.days}</p>
                  </div>
                  <div className="et-phase-status">
                    {status === 'completed' && <FaCheck />}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Check-in Tab */}
      {activeTab === 'checkin' && (
        <div className="et-checkin">
          <div className="et-checkin-header">
            <span className="et-checkin-label">Daily Check-in</span>
            {hasLoggedToday && !isEditing && (
              <button className="et-edit-btn" onClick={handleEdit}>
                Edit
              </button>
            )}
            {isEditing && (
              <button className="et-cancel-btn" onClick={handleCancelEdit}>
                Cancel
              </button>
            )}
          </div>
          
          <div className={`et-sliders ${slidersDisabled ? 'disabled' : ''}`}>
            {[
              { key: 'anxiety', label: 'Anxiety Level', desc: '1 = calm, 10 = severe' },
              { key: 'mood', label: 'Mood Stability', desc: '1 = volatile, 10 = stable' },
              { key: 'clarity', label: 'Mental Clarity', desc: '1 = foggy, 10 = sharp' },
              { key: 'processing', label: 'Emotional Processing', desc: '1 = blocked, 10 = flowing' }
            ].map(({ key, label, desc }, index, arr) => (
              <React.Fragment key={key}>
                <div className="et-slider-group">
                  <div className="et-slider-header">
                    <span className="et-slider-label">{label}</span>
                    <span className="et-slider-value">{emotions[key]}</span>
                  </div>
                  <div className="et-slider-track-wrapper">
                    <input
                      type="range"
                      min="1"
                      max="10"
                      value={emotions[key]}
                      onChange={(e) => setEmotions(prev => ({ ...prev, [key]: parseInt(e.target.value) }))}
                      className="et-slider"
                      disabled={slidersDisabled}
                    />
                  </div>
                  <span className="et-slider-desc">{desc}</span>
                </div>
                {index < arr.length - 1 && <div className="et-slider-divider" />}
              </React.Fragment>
            ))}
          </div>

          <button 
            className={`et-save-btn ${slidersDisabled ? 'disabled' : ''}`}
            onClick={handleSave}
            disabled={slidersDisabled}
          >
            {hasLoggedToday && !isEditing ? 'Logged Today' : isEditing ? 'Update Check-in' : 'Save Check-in'}
          </button>
        </div>
      )}

      {/* Analysis Tab - Stats analytics style */}
      {activeTab === 'analysis' && (
        <div className="et-analysis">
          {!analysis ? (
            <div className="et-analysis-empty">
              <p className="et-analysis-empty-title">Not Enough Data</p>
              <p className="et-analysis-empty-text">
                Complete at least 3 daily check-ins to unlock pattern analysis and personalized insights.
              </p>
            </div>
          ) : (
            <div className="et-analysis-stack">
              {/* Wellbeing Section */}
              <div className="et-analysis-section">
                <span className="et-analysis-label">Overall Wellbeing</span>
                <div className="et-analysis-content">
                  <span className="et-wellbeing-score">{analysis.wellbeing}</span>
                  <p className="et-wellbeing-desc">
                    Based on your anxiety, mood, and clarity scores over the past {analysis.recent} days.
                  </p>
                </div>
              </div>

              {/* Data Points Section */}
              <div className="et-analysis-section">
                <span className="et-analysis-label">Data Collection</span>
                <div className="et-analysis-content">
                  <div className="et-data-row">
                    <span className="et-data-label">Total check-ins</span>
                    <span className="et-data-value">{analysis.total}</span>
                  </div>
                  <div className="et-data-row">
                    <span className="et-data-label">Recent (14 days)</span>
                    <span className="et-data-value">{analysis.recent}</span>
                  </div>
                </div>
              </div>

              {/* Trends Section */}
              <div className="et-analysis-section">
                <span className="et-analysis-label">Trends</span>
                <div className="et-analysis-content">
                  {[
                    { key: 'anxiety', label: 'Anxiety', invert: true },
                    { key: 'mood', label: 'Mood Stability' },
                    { key: 'clarity', label: 'Mental Clarity' }
                  ].map(({ key, label, invert }) => {
                    const trend = analysis.trends[key];
                    const symbol = trend === 'improving' ? (invert ? '↓' : '↑') : 
                                   trend === 'concerning' ? (invert ? '↑' : '↓') : '→';
                    return (
                      <div key={key} className="et-trend-row">
                        <span className="et-trend-label">{label}</span>
                        <span className={`et-trend-value ${trend}`}>
                          {symbol} {trend.charAt(0).toUpperCase() + trend.slice(1)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Phase Modal - Transparent floating */}
      {showModal && selectedPhase && (
        <div className="et-overlay" onClick={() => setShowModal(false)}>
          <button className="et-modal-close" onClick={() => setShowModal(false)}>
            <FaTimes />
          </button>
          
          <div className="et-modal" onClick={e => e.stopPropagation()}>
            <div className="et-modal-header">
              <span className="et-modal-num">
                {String(phases.findIndex(p => p.id === selectedPhase.id) + 1).padStart(2, '0')}
              </span>
              <div>
                <h2>{selectedPhase.name}</h2>
                <p>Days {selectedPhase.days}</p>
              </div>
            </div>

            <div className="et-modal-body">
              <div className="et-modal-section">
                <h4>Overview</h4>
                <p>{selectedPhase.description}</p>
              </div>

              <div className="et-modal-section">
                <h4>The Science</h4>
                <p>{selectedPhase.science}</p>
              </div>

              <div className="et-modal-section">
                <h4>What to Expect</h4>
                <ul>
                  {selectedPhase.symptoms.map((s, i) => <li key={i}>{s}</li>)}
                </ul>
              </div>

              <div className="et-modal-section et-warning">
                <h4><FaExclamationTriangle /> Warning Signs</h4>
                <ul>
                  {selectedPhase.warnings.map((w, i) => <li key={i}>{w}</li>)}
                </ul>
              </div>

              <div className="et-modal-section">
                <h4>Techniques</h4>
                <ul>
                  {selectedPhase.techniques.map((t, i) => <li key={i}>{t}</li>)}
                </ul>
              </div>
            </div>

            <button className="et-modal-btn" onClick={() => setShowModal(false)}>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmotionalTimeline;