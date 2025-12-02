// EmotionalTimeline.js - TITANTRACK MINIMAL
import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import './EmotionalTimeline.css';
import { FaCheck, FaExclamationTriangle } from 'react-icons/fa';

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

  // Check if logged today
  useEffect(() => {
    if (userData?.emotionalLog) {
      const today = new Date().toDateString();
      const todayLog = userData.emotionalLog.find(
        log => new Date(log.date).toDateString() === today
      );
      setHasLoggedToday(!!todayLog);
      
      if (todayLog) {
        setEmotions({
          anxiety: todayLog.anxiety || 5,
          mood: todayLog.mood || 5,
          clarity: todayLog.clarity || 5,
          processing: todayLog.processing || 5
        });
      }
    }
  }, [userData]);

  // Open phase modal
  const openPhase = (phase) => {
    setSelectedPhase(phase);
    setShowModal(true);
  };

  // Save check-in
  const handleSave = async () => {
    if (hasLoggedToday) return;
    
    const newLog = {
      date: new Date().toISOString(),
      day: currentDay,
      phase: currentPhase?.id || 1,
      ...emotions
    };

    const existingLogs = userData?.emotionalLog || [];
    const updatedLogs = [...existingLogs, newLog];

    try {
      await updateUserData({ emotionalLog: updatedLogs });
      setHasLoggedToday(true);
      toast.success('Check-in saved');
    } catch (error) {
      toast.error('Failed to save');
    }
  };

  // Calculate analysis
  const getAnalysis = () => {
    const logs = userData?.emotionalLog || [];
    if (logs.length < 3) return null;

    const recent = logs.slice(-14);
    const older = logs.slice(0, -14);

    const avgRecent = (key) => {
      const vals = recent.map(l => l[key]).filter(Boolean);
      return vals.length ? (vals.reduce((a, b) => a + b, 0) / vals.length) : 5;
    };

    const avgOlder = (key) => {
      if (!older.length) return avgRecent(key);
      const vals = older.map(l => l[key]).filter(Boolean);
      return vals.length ? (vals.reduce((a, b) => a + b, 0) / vals.length) : 5;
    };

    const getTrend = (key, invert = false) => {
      const r = avgRecent(key);
      const o = avgOlder(key);
      const diff = r - o;
      
      if (Math.abs(diff) < 0.5) return 'stable';
      if (invert) return diff > 0 ? 'concerning' : 'improving';
      return diff > 0 ? 'improving' : 'concerning';
    };

    const wellbeing = ((avgRecent('mood') + avgRecent('clarity') + (10 - avgRecent('anxiety'))) / 3).toFixed(1);

    return {
      total: logs.length,
      recent: recent.length,
      wellbeing,
      trends: {
        anxiety: getTrend('anxiety', true),
        mood: getTrend('mood'),
        clarity: getTrend('clarity')
      }
    };
  };

  const analysis = getAnalysis();

  return (
    <div className="et-container">
      {/* Header */}
      <header className="et-header">
        <h1>Timeline</h1>
        <p>Your emotional journey through retention</p>
      </header>

      {/* Tabs */}
      <nav className="et-tabs">
        {['journey', 'checkin', 'analysis'].map(tab => (
          <button
            key={tab}
            className={`et-tab ${activeTab === tab ? 'active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab === 'journey' && 'Journey'}
            {tab === 'checkin' && 'Check-in'}
            {tab === 'analysis' && 'Analysis'}
          </button>
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
          <div className="et-checkin-card">
            <h3>Daily Check-in</h3>
            
            <div className="et-sliders">
              {[
                { key: 'anxiety', label: 'Anxiety Level', desc: '1 = calm, 10 = severe' },
                { key: 'mood', label: 'Mood Stability', desc: '1 = volatile, 10 = stable' },
                { key: 'clarity', label: 'Mental Clarity', desc: '1 = foggy, 10 = sharp' },
                { key: 'processing', label: 'Emotional Processing', desc: '1 = blocked, 10 = flowing' }
              ].map(({ key, label, desc }) => (
                <div key={key} className="et-slider-group">
                  <div className="et-slider-header">
                    <span className="et-slider-label">{label}</span>
                    <span className="et-slider-value">{emotions[key]}</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={emotions[key]}
                    onChange={(e) => setEmotions(prev => ({ ...prev, [key]: parseInt(e.target.value) }))}
                    className="et-slider"
                    disabled={hasLoggedToday}
                  />
                  <span className="et-slider-desc">{desc}</span>
                </div>
              ))}
            </div>
          </div>

          <button 
            className={`et-save-btn ${hasLoggedToday ? 'disabled' : ''}`}
            onClick={handleSave}
            disabled={hasLoggedToday}
          >
            {hasLoggedToday ? 'Already Logged Today' : 'Save Check-in'}
          </button>
        </div>
      )}

      {/* Analysis Tab */}
      {activeTab === 'analysis' && (
        <div className="et-analysis">
          {!analysis ? (
            <div className="et-empty">
              <p className="et-empty-title">Not Enough Data</p>
              <p className="et-empty-text">
                Complete at least 3 daily check-ins to unlock pattern analysis and personalized insights.
              </p>
            </div>
          ) : (
            <>
              <div className="et-stats-grid">
                <div className="et-stat">
                  <span className="et-stat-value">{analysis.wellbeing}</span>
                  <span className="et-stat-label">Wellbeing</span>
                </div>
                <div className="et-stat">
                  <span className="et-stat-value">{analysis.total}</span>
                  <span className="et-stat-label">Data Points</span>
                </div>
                <div className="et-stat">
                  <span className="et-stat-value">{analysis.recent}</span>
                  <span className="et-stat-label">Recent (14d)</span>
                </div>
              </div>

              <div className="et-trends">
                <h3>Trends</h3>
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
            </>
          )}
        </div>
      )}

      {/* Phase Modal - Transparent floating (matches Tracker) */}
      {showModal && selectedPhase && (
        <div className="et-overlay" onClick={() => setShowModal(false)}>
          <div className="et-modal" onClick={e => e.stopPropagation()}>
            <div className="et-modal-header">
              <div className="et-modal-num">
                {String(phases.findIndex(p => p.id === selectedPhase.id) + 1).padStart(2, '0')}
              </div>
              <h2>{selectedPhase.name}</h2>
              <p>Days {selectedPhase.days}</p>
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