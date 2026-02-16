// EmotionalTimeline.js - TITANTRACK MINIMAL
// Matches Landing/Tracker/Stats aesthetic
// UPDATED: Analysis tab focused on ONE powerful insight - emotional trajectory
import React, { useState, useEffect } from 'react';
import './EmotionalTimeline.css';
import { FaCheck, FaExclamationTriangle } from 'react-icons/fa';

// Body scroll lock for modals
import useBodyScrollLock from '../../hooks/useBodyScrollLock';

const EmotionalTimeline = ({ userData, updateUserData }) => {
  const [activeTab, setActiveTab] = useState('journey');
  const [selectedPhase, setSelectedPhase] = useState(null);
  const [showModal, setShowModal] = useState(false);

  // Lock body scroll when modal is open
  useBodyScrollLock(showModal);

  const currentDay = userData?.currentStreak || 0;

  // Phase definitions with enhanced content
  const phases = [
    {
      id: 1,
      name: "Initial Adaptation",
      days: "1-14",
      start: 1,
      end: 14,
      summary: "Body begins adapting while urges peak",
      duration: "Typical duration: 10-14 days. Some clear it in 7, others take 21. Your starting point determines speed.",
      whatsHappening: "Your body has been in depletion mode for years, possibly decades. Now it's recalibrating. Hormone production is adjusting. Dopamine receptors that were overloaded are resetting. You're not broken. You're rebooting.",
      description: "Your body begins adapting to retention while initial urges peak. This phase builds new neural pathways as your brain rewires dopamine pathways away from instant gratification.",
      science: "Cessation triggers hypothalamic-pituitary adjustments. Testosterone stabilizes while dopamine receptors rebalance from overstimulation.",
      expectation: "Emotional volatility is normal. Your system is recalibrating.",
      criticalRule: "The urges in this phase are loud but shallow. They're habit, not need. Every urge you ride out weakens the pattern permanently.",
      whatsNext: "Days 15-45 bring Emotional Processing, the hardest phase. The physical urges you're fighting now will quiet down, but suppressed emotions will surface. This is normal. It's healing. Prepare by establishing your daily practices now.",
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
      duration: "Typical duration: 2-6 weeks of intensity. The waves come and go, they don't stay at peak. Most men report the heaviest period around days 20-35.",
      whatsHappening: "Sexual release was numbing emotional pain you didn't know you were carrying. Without that numbing agent, old wounds surface. This isn't retention causing depression. It's retention revealing what was always there, buried. You're not falling apart. You're finally processing.",
      description: "Suppressed emotions surface for healing. This is often the most challenging phase. Your psyche is healing itself through this natural process.",
      science: "Without ejaculation's endorphin/prolactin release numbing pain, stored trauma surfaces. Retained energy amplifies all emotions as healing occurs.",
      expectation: "This is the hardest phase. Emotional turbulence means healing is happening.",
      traumaTimeline: [
        "Weeks 1-2: Recent frustrations, current life stress",
        "Weeks 2-4: Past relationship pain, betrayals, heartbreak",
        "Month 2+: Deeper patterns begin emerging"
      ],
      criticalRule: "This is where 90% of men fail. The emotional pain makes release feel like relief. It's a trap. Breaking retention here resets everything AND you'll face these same emotions again later. The flatline always ends. Hold the line.",
      criticalRuleHighlight: true,
      whatsNext: "Days 46-90 bring Mental Expansion. The emotional storms stabilize. Clarity, creativity, and focus emerge. Many men describe it as the fog lifting. The hardest part is almost behind you.",
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
      duration: "This phase builds progressively. Most men notice significant cognitive shifts by day 60. Peak mental clarity often hits between days 75-90.",
      whatsHappening: "Your brain is no longer spending resources on constant reproductive signaling. That energy is redirecting upward. Neural pathways are strengthening. The mental fog from the emotional phase clears. Many men describe this as thinking in HD for the first time.",
      description: "Cognitive abilities enhance as emotional turbulence stabilizes. Your brain operates at higher efficiency with optimized neurotransmitter balance.",
      science: "Retained nutrients rebuild nerve sheaths. Brain tissue becomes more densely connected as resources redirect from reproduction to cognition.",
      expectation: "Emotional stability returns. Clarity and calm become the norm.",
      socialShift: "Around day 60, something shifts externally. People treat you differently. Eye contact changes. Women notice you. Men either respect you or seem uncomfortable around you. This isn't imagination. Your energy has tangibly shifted. How you handle this attention is the next test.",
      criticalRule: "The temptation here is different. You feel powerful. Your brain will rationalize: I've got the benefits, I can release once. Don't believe it. You're accessing the surface of what's possible. The real transformation is still ahead.",
      whatsNext: "Days 91-180 bring Integration. Your new capacities become baseline. The discipline that felt like effort becomes effortless. Your sense of purpose clarifies. You stop doing retention and start being retained.",
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
      duration: "This phase spans roughly 90 days, but integration continues indefinitely. Most men report feeling fundamentally different by day 120-150.",
      whatsHappening: "The practices that required willpower are becoming automatic. Your energy signature has permanently shifted. You're not fighting urges anymore. They've lost their power. Your body and mind have accepted retention as the new normal.",
      description: "Profound inner transformation as benefits become deeply integrated. Complete endocrine rebalancing creates stable high-performance states.",
      science: "The entire nervous system optimizes for retention, creating self-sustaining high-performance states with permanent neuroplastic changes.",
      expectation: "Deep inner peace. Emotions serve you rather than control you.",
      relationshipShift: "Relationships change during this phase. Some friendships fade naturally because you've outgrown them. New connections appear. People seek your advice without knowing why. Old flames may resurface. Not everyone will understand your transformation. That's okay.",
      criticalRule: "The danger here is complacency. You feel stable. You forget how hard the early days were. A single release might seem harmless. It's not. Protect what you've built. The cost of rebuilding is higher than the cost of maintaining.",
      whatsNext: "Day 181+ marks Mastery. The question shifts from what can I gain to what can I contribute. Most men at this stage describe retention choosing them, rather than the other way around.",
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
      duration: "There is no end point. Mastery deepens indefinitely. Men who've practiced for years report benefits continuing to compound.",
      whatsHappening: "You've crossed a threshold most men never reach. The energy you've cultivated is substantial. Personal optimization feels less interesting now. Service and legacy feel more relevant. The question is no longer whether you can retain. It's what you'll build with what you've accumulated.",
      description: "You've transcended the need for external validation. Sexual energy is permanently redirected, creating sustained states of expanded awareness.",
      science: "Permanent neuroplastic changes create self-sustaining states. Enhanced connectivity between regions associated with self-control and higher cognition.",
      expectation: "Emotional mastery. You choose your state rather than react.",
      responsibilityShift: "Others sense something different about you. Some will ask questions. Be discerning about who you teach. Not everyone is ready, and your energy is valuable. The right people will find you. Focus on what you're here to contribute.",
      criticalRule: "Mastery isn't invincibility. The ego can inflate here. Stay humble. Stay grounded. The practice that brought you here is the same practice that keeps you here. Don't abandon the fundamentals because you feel beyond them.",
      whatsNext: "The journey continues. Deeper states. Greater clarity. Expanded capacity. Men who've retained for years speak of dimensions that can't be described to those who haven't experienced them. You're at the beginning of mastery, not the end.",
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
    // Read emotional data from benefit tracking entries
    const allBenefits = userData?.benefitTracking || [];
    const log = allBenefits.filter(b => typeof b.anxiety === 'number');
    
    // Need at least 7 entries with emotional data
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

  // Open phase modal
  const openPhase = (phase) => {
    setSelectedPhase(phase);
    setShowModal(true);
  };

  // Tab items - Journey and Analysis only
  const tabs = [
    { key: 'journey', label: 'Journey' },
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
                  <p className="empty-message">{analysis.checkIns}/{analysis.needed} logs</p>
                  <p className="empty-context">
                    Log how you feel in the Tracker to build your emotional trajectory
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

      {/* Phase Modal - Enhanced with new content sections */}
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
                {/* Duration estimate */}
                {selectedPhase.duration && (
                  <div className="et-modal-section et-duration">
                    <p>{selectedPhase.duration}</p>
                  </div>
                )}

                {/* What's Happening - plain language */}
                {selectedPhase.whatsHappening && (
                  <div className="et-modal-section">
                    <h4>What's Happening</h4>
                    <p>{selectedPhase.whatsHappening}</p>
                  </div>
                )}

                {/* Trauma Timeline - Phase 2 only */}
                {selectedPhase.traumaTimeline && (
                  <div className="et-modal-section">
                    <h4>What Surfaces When</h4>
                    <ul>
                      {selectedPhase.traumaTimeline.map((item, i) => <li key={i}>{item}</li>)}
                    </ul>
                  </div>
                )}

                {/* Social Shift - Phase 3 only */}
                {selectedPhase.socialShift && (
                  <div className="et-modal-section">
                    <h4>What Others Will Notice</h4>
                    <p>{selectedPhase.socialShift}</p>
                  </div>
                )}

                {/* Relationship Shift - Phase 4 only */}
                {selectedPhase.relationshipShift && (
                  <div className="et-modal-section">
                    <h4>What Shifts</h4>
                    <p>{selectedPhase.relationshipShift}</p>
                  </div>
                )}

                {/* Responsibility Shift - Phase 5 only */}
                {selectedPhase.responsibilityShift && (
                  <div className="et-modal-section">
                    <h4>What Shifts</h4>
                    <p>{selectedPhase.responsibilityShift}</p>
                  </div>
                )}

                {/* Critical Rule - highlighted for Phase 2 */}
                {selectedPhase.criticalRule && (
                  <div className={`et-modal-section ${selectedPhase.criticalRuleHighlight ? 'et-critical' : 'et-rule'}`}>
                    <h4>{selectedPhase.criticalRuleHighlight ? 'Critical' : 'Remember'}</h4>
                    <p>{selectedPhase.criticalRule}</p>
                  </div>
                )}

                {/* What to Expect */}
                <div className="et-modal-section">
                  <h4>What to Expect</h4>
                  <ul>
                    {selectedPhase.symptoms.map((s, i) => <li key={i}>{s}</li>)}
                  </ul>
                </div>

                {/* Warning Signs */}
                <div className="et-modal-section et-warning">
                  <h4><FaExclamationTriangle /> Warning Signs</h4>
                  <ul>
                    {selectedPhase.warnings.map((w, i) => <li key={i}>{w}</li>)}
                  </ul>
                </div>

                {/* Techniques */}
                <div className="et-modal-section">
                  <h4>Techniques</h4>
                  <ul>
                    {selectedPhase.techniques.map((t, i) => <li key={i}>{t}</li>)}
                  </ul>
                </div>

                {/* What's Next */}
                {selectedPhase.whatsNext && (
                  <div className="et-modal-section et-next">
                    <h4>What's Next</h4>
                    <p>{selectedPhase.whatsNext}</p>
                  </div>
                )}
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