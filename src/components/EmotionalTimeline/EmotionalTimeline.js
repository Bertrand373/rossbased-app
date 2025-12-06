// EmotionalTimeline.js - TITANTRACK MINIMAL
// Matches Landing/Tracker/Stats aesthetic
// UPDATED: Analysis tab focused on ONE powerful insight - emotional trajectory
import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import './EmotionalTimeline.css';
import { FaCheck, FaExclamationTriangle } from 'react-icons/fa';

// Body scroll lock for modals
import useBodyScrollLock from '../../hooks/useBodyScrollLock';

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

  // Lock body scroll when modal is open
  useBodyScrollLock(showModal);

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
      expectation: "Emotional volatility is normal. Your system is recalibrating.",
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
      expectation: "This is the hardest phase. Emotional turbulence means healing is happening.",
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
      expectation: "Emotional stability returns. Clarity and calm become the norm.",
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
      expectation: "Deep inner peace. Emotions serve you rather than control you.",
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
      expectation: "Emotional mastery. You choose your state rather than react.",
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

  // Check if logged today - load existing values
  useEffect(() => {
    if (userData?.emotionalLog) {
      const today = new Date().toDateString();
      const lastLog = userData.emotionalLog[userData.emotionalLog.length - 1];
      if (lastLog && new Date(lastLog.date).toDateString() === today) {
        setHasLoggedToday(true);
        setIsEditing(false);
        setEmotions({
          anxiety: lastLog.anxiety || 5,
          mood: lastLog.mood || 5,
          clarity: lastLog.clarity || 5,
          processing: lastLog.processing || 5
        });
      }
    }
  }, [userData]);

  // Lock scroll on Analysis tab (fixed content)
  useEffect(() => {
    if (activeTab === 'analysis') {
      document.body.classList.add('static-view');
    } else {
      document.body.classList.remove('static-view');
    }
    return () => document.body.classList.remove('static-view');
  }, [activeTab]);

  // ============================================================
  // ANALYSIS - Focused trajectory calculation
  // ============================================================
  const calculateTrajectory = () => {
    const log = userData?.emotionalLog || [];
    
    // Need at least 7 check-ins for meaningful comparison
    if (log.length < 7) {
      return { 
        hasData: false, 
        checkIns: log.length,
        needed: 7 
      };
    }

    // Sort by date to ensure correct order
    const sortedLog = [...log].sort((a, b) => new Date(a.date) - new Date(b.date));

    // Early = first 7 check-ins
    const early = sortedLog.slice(0, 7);
    // Now = last 7 check-ins
    const now = sortedLog.slice(-7);

    const avg = (arr, key) => {
      const valid = arr.filter(e => typeof e[key] === 'number');
      if (valid.length === 0) return null;
      return valid.reduce((sum, e) => sum + e[key], 0) / valid.length;
    };

    const metrics = [
      { 
        key: 'anxiety', 
        label: 'Anxiety',
        invert: true // Lower is better
      },
      { 
        key: 'mood', 
        label: 'Mood',
        invert: false // Higher is better
      },
      { 
        key: 'clarity', 
        label: 'Clarity',
        invert: false
      },
      { 
        key: 'processing', 
        label: 'Processing',
        invert: false
      }
    ];

    const trajectory = metrics.map(metric => {
      const earlyAvg = avg(early, metric.key);
      const nowAvg = avg(now, metric.key);
      
      if (earlyAvg === null || nowAvg === null) {
        return { ...metric, early: null, now: null, delta: null, improved: null };
      }

      const delta = nowAvg - earlyAvg;
      // For anxiety, improvement means going DOWN (negative delta)
      // For others, improvement means going UP (positive delta)
      const improved = metric.invert ? delta < -0.3 : delta > 0.3;
      const declined = metric.invert ? delta > 0.3 : delta < -0.3;

      return {
        ...metric,
        early: earlyAvg.toFixed(1),
        now: nowAvg.toFixed(1),
        delta: Math.abs(delta).toFixed(1),
        direction: metric.invert 
          ? (delta < 0 ? 'down' : delta > 0 ? 'up' : 'stable')
          : (delta > 0 ? 'up' : delta < 0 ? 'down' : 'stable'),
        improved,
        declined,
        stable: !improved && !declined
      };
    });

    // Count improvements
    const improvements = trajectory.filter(t => t.improved).length;
    const declines = trajectory.filter(t => t.declined).length;

    return {
      hasData: true,
      checkIns: log.length,
      trajectory,
      improvements,
      declines,
      overallTrend: improvements > declines ? 'positive' : 
                    declines > improvements ? 'concerning' : 'stable'
    };
  };

  const analysis = calculateTrajectory();

  // Save check-in (first time)
  const handleSave = async () => {
    if (hasLoggedToday) return;

    const entry = {
      date: new Date().toISOString(),
      day: currentDay,
      phase: currentPhase?.id || 1,
      ...emotions
    };

    try {
      const existingLog = userData?.emotionalLog || [];
      await updateUserData({
        emotionalLog: [...existingLog, entry]
      });
      setHasLoggedToday(true);
      setIsEditing(false);
      toast.success('Check-in saved');
    } catch (error) {
      toast.error('Failed to save');
    }
  };

  // Update check-in (editing existing)
  const handleUpdate = async () => {
    if (!hasLoggedToday || !isEditing) return;

    try {
      const existingLog = userData?.emotionalLog || [];
      const today = new Date().toDateString();
      
      const updatedLog = existingLog.map(entry => {
        if (new Date(entry.date).toDateString() === today) {
          return { ...entry, ...emotions };
        }
        return entry;
      });

      await updateUserData({ emotionalLog: updatedLog });
      setIsEditing(false);
      toast.success('Check-in updated');
    } catch (error) {
      toast.error('Failed to update');
    }
  };

  // Handle button click
  const handleButtonClick = () => {
    if (!hasLoggedToday) {
      handleSave();
    } else if (!isEditing) {
      setIsEditing(true);
    } else {
      handleUpdate();
    }
  };

  // Get button text based on state
  const getButtonText = () => {
    if (!hasLoggedToday) return 'Save Check-in';
    if (isEditing) return 'Update Check-in';
    return 'Logged Today ✓';
  };

  // Get button class based on state
  const getButtonClass = () => {
    if (!hasLoggedToday) return 'et-save-btn';
    if (isEditing) return 'et-save-btn';
    return 'et-save-btn logged';
  };

  // Determine if sliders should be interactive
  const slidersInteractive = !hasLoggedToday || isEditing;

  // Open phase modal
  const openPhase = (phase) => {
    setSelectedPhase(phase);
    setShowModal(true);
  };

  // Slider items
  const sliderItems = [
    { key: 'anxiety', label: 'Anxiety Level', desc: '1 = calm, 10 = severe' },
    { key: 'mood', label: 'Mood Stability', desc: '1 = volatile, 10 = stable' },
    { key: 'clarity', label: 'Mental Clarity', desc: '1 = foggy, 10 = sharp' },
    { key: 'processing', label: 'Emotional Processing', desc: '1 = blocked, 10 = flowing' }
  ];

  // Tab items
  const tabs = [
    { key: 'journey', label: 'Journey' },
    { key: 'checkin', label: 'Check-in' },
    { key: 'analysis', label: 'Analysis' }
  ];

  return (
    <div className="et-container">
      {/* Tabs */}
      <nav className="et-tabs">
        {tabs.map((tab, index) => (
          <React.Fragment key={tab.key}>
            <button
              className={`et-tab ${activeTab === tab.key ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label}
            </button>
            {index < tabs.length - 1 && <div className="et-tab-divider" />}
          </React.Fragment>
        ))}
      </nav>

      {/* Journey Tab */}
      {activeTab === 'journey' && (
        <div className="et-journey">
          <div className="et-current" onClick={() => openPhase(currentPhase)}>
            <div className="et-current-header">
              <span className="et-current-num">
                {String(phases.findIndex(p => p.id === currentPhase?.id) + 1).padStart(2, '0')}
              </span>
              <div className="et-current-info">
                <h2 className="et-current-name">{currentPhase?.name}</h2>
                <p className="et-current-days">Days {currentPhase?.days}</p>
              </div>
            </div>
            
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
          <div className="et-checkin-header">Daily Check-in</div>
          
          <div className="et-sliders">
            {sliderItems.map(({ key, label, desc }) => (
              <div 
                key={key} 
                className={`et-slider-group ${!slidersInteractive ? 'view-mode' : ''}`}
              >
                <div className="et-slider-header">
                  <span className="et-slider-label">{label}</span>
                  <span className="et-slider-value">{emotions[key]}/10</span>
                </div>
                <div className="et-slider-wrap">
                  <div 
                    className="et-slider-fill" 
                    style={{ width: `${((emotions[key] - 1) / 9) * 100}%` }}
                  />
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={emotions[key]}
                    onChange={(e) => setEmotions(prev => ({ 
                      ...prev, 
                      [key]: parseInt(e.target.value) 
                    }))}
                    className="et-slider"
                    disabled={!slidersInteractive}
                  />
                </div>
                <span className="et-slider-desc">{desc}</span>
              </div>
            ))}
          </div>

          <button 
            className={getButtonClass()}
            onClick={handleButtonClick}
          >
            {getButtonText()}
          </button>
        </div>
      )}

      {/* Analysis Tab - ONE powerful insight */}
      {activeTab === 'analysis' && (
        <div className="et-analysis">
          {/* YOUR PROGRESS - The core insight */}
          <div className="insight-card">
            <div className="insight-card-header">
              <span>Your Progress</span>
            </div>
            <div className="insight-card-content">
              {!analysis.hasData ? (
                <div className="insight-empty">
                  <p className="empty-message">{analysis.checkIns}/{analysis.needed} check-ins</p>
                  <p className="empty-context">
                    {analysis.needed - analysis.checkIns} more to unlock your emotional trajectory
                  </p>
                </div>
              ) : (
                <div className="trajectory-list">
                  {analysis.trajectory.map((metric) => (
                    <div key={metric.key} className="trajectory-row">
                      <span className="trajectory-label">{metric.label}</span>
                      <div className="trajectory-values">
                        <span className="trajectory-early">{metric.early}</span>
                        <span className="trajectory-arrow">→</span>
                        <span className="trajectory-now">{metric.now}</span>
                      </div>
                      <span className={`trajectory-delta ${
                        metric.improved ? 'improved' : 
                        metric.declined ? 'declined' : 'stable'
                      }`}>
                        {metric.improved ? (metric.invert ? '↓' : '↑') : 
                         metric.declined ? (metric.invert ? '↑' : '↓') : '→'} {metric.delta}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* PHASE CONTEXT - Only show when we have trajectory data */}
          {analysis.hasData && (
            <div className="phase-context">
              <div className="phase-context-inner">
                <span className="phase-context-phase">{currentPhase?.name}</span>
                <span className="phase-context-expectation">{currentPhase?.expectation}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Phase Modal */}
      {showModal && selectedPhase && (
        <div className="et-overlay">
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

            <div className="et-modal-scroll">
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
            </div>
            
            <div className="et-modal-footer">
              <button className="et-modal-btn" onClick={() => setShowModal(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmotionalTimeline;