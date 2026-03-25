// EmotionalTimeline.js - TITANTRACK
// V2: Calendar-DNA viewport-filling layout — spine + gap cells, zero scroll
// Same hand that built the Calendar and Stats built this.
import React, { useState, useRef, useMemo } from 'react';
import './EmotionalTimeline.css';
import '../../styles/BottomSheet.css';
import { FaExclamationTriangle } from 'react-icons/fa';
import useBodyScrollLock from '../../hooks/useBodyScrollLock';
import useSheetSwipe from '../../hooks/useSheetSwipe';

const EmotionalTimeline = ({ userData, updateUserData, isPremium, openPlanModal }) => {
  const [selectedPhase, setSelectedPhase] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const sheetPanelRef = useRef(null);

  useBodyScrollLock(showModal);

  const currentDay = userData?.currentStreak || 0;

  // ============================================================
  // PHASE DEFINITIONS — full content for detail sheets
  // ============================================================
  const phases = [
    {
      id: 1,
      name: "Initial Adaptation",
      shortName: "Adapt",
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
      shortName: "Process",
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
      shortName: "Expand",
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
      whatsNext: "Days 91-180 bring Integration & Growth. Your new capacities become baseline. The discipline that felt like effort becomes effortless. Your sense of purpose clarifies. You stop doing retention and start being retained.",
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
      name: "Integration & Growth",
      shortName: "Integrate",
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
      whatsNext: "Day 181+ marks Mastery & Purpose. The question shifts from what can I gain to what can I contribute. Most men at this stage describe retention choosing them, rather than the other way around.",
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
      name: "Mastery & Purpose",
      shortName: "Master",
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

  // ============================================================
  // PHASE UTILITIES
  // ============================================================
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

  const getPhaseStatus = (phase) => {
    if (currentDay < phase.start) return 'upcoming';
    if (currentDay > phase.end && phase.end !== 999999) return 'completed';
    return 'current';
  };

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
    return { percent, text: `Day ${daysIn} of ${totalDays} · ${remaining} remaining` };
  };

  const progress = getProgress();

  // ============================================================
  // TRAJECTORY CALCULATION
  // ============================================================
  const analysis = useMemo(() => {
    const allBenefits = userData?.benefitTracking || [];
    const log = allBenefits.filter(b => typeof b.anxiety === 'number');

    if (log.length < 7) {
      return { hasData: false, checkIns: log.length, needed: 7 };
    }

    const sortedLog = [...log].sort((a, b) => new Date(a.date) - new Date(b.date));
    const early = sortedLog.slice(0, 7);
    const now = sortedLog.slice(-7);

    const avg = (arr, key) => {
      const valid = arr.filter(e => typeof e[key] === 'number');
      if (valid.length === 0) return null;
      return valid.reduce((sum, e) => sum + e[key], 0) / valid.length;
    };

    const metrics = [
      { key: 'anxiety', label: 'Calm', invert: false },
      { key: 'mood', label: 'Mood', invert: false },
      { key: 'clarity', label: 'Drive', invert: false }
    ];

    const trajectory = metrics.map(metric => {
      const earlyAvg = avg(early, metric.key);
      const nowAvg = avg(now, metric.key);
      if (earlyAvg === null || nowAvg === null) {
        return { ...metric, early: null, now: null, delta: null, improved: null };
      }
      const delta = nowAvg - earlyAvg;
      const improved = metric.invert ? delta < -0.3 : delta > 0.3;
      const declined = metric.invert ? delta > 0.3 : delta < -0.3;
      return {
        ...metric,
        early: earlyAvg.toFixed(1),
        now: nowAvg.toFixed(1),
        delta: Math.abs(delta).toFixed(1),
        improved,
        declined,
        stable: !improved && !declined
      };
    });

    return { hasData: true, checkIns: log.length, trajectory };
  }, [userData?.benefitTracking]);

  // Trajectory extremes
  const extremes = useMemo(() => {
    if (!analysis.hasData) return null;
    const valid = analysis.trajectory.filter(m => m.now !== null);
    if (valid.length < 2) return null;
    const sorted = [...valid].sort((a, b) => parseFloat(b.now) - parseFloat(a.now));
    return {
      strongest: sorted[0],
      growthArea: sorted[sorted.length - 1]
    };
  }, [analysis]);

  // ============================================================
  // MODAL HANDLERS
  // ============================================================
  const openPhase = (phase) => {
    setSelectedPhase(phase);
    setShowModal(true);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => setModalOpen(true));
    });

    // Track phase detail views for admin feature adoption metrics
    // Dedup: only one view per phase per day
    if (updateUserData) {
      const today = new Date().toISOString().split('T')[0];
      const existing = (userData.emotionalTracking || []);
      const alreadyViewed = existing.some(e => {
        const entryDate = new Date(e.date).toISOString().split('T')[0];
        return entryDate === today && e.phase === phase.id;
      });
      if (!alreadyViewed) {
        updateUserData({
          emotionalTracking: [...existing, {
            date: new Date(),
            day: currentDay,
            phase: phase.id,
            anxiety: 0,
            moodStability: 0,
            mentalClarity: 0,
            emotionalProcessing: 0
          }]
        });
      }
    }
  };

  const closeModal = () => {
    setModalOpen(false);
    setTimeout(() => {
      setShowModal(false);
      setSelectedPhase(null);
    }, 300);
  };

  useSheetSwipe(sheetPanelRef, modalOpen, closeModal);

  // Phase progress label
  const phaseProgressLabel = `${currentDay} days · ${currentPhase?.name}`;

  // ============================================================
  // RENDER
  // ============================================================
  return (
    <>
      <div className="et-container">

        {/* ---- PHASE STRIP: 5-cell gap grid ---- */}
        <div className="et-phase-strip">
          {phases.map((phase, i) => {
            const status = getPhaseStatus(phase);
            return (
              <button
                key={phase.id}
                className={`et-strip-cell ${status}`}
                onClick={() => openPhase(phase)}
              >
                {status === 'completed' && <span className="et-strip-check">✓</span>}
                <span className="et-strip-num">{String(i + 1).padStart(2, '0')}</span>
                <span className="et-strip-label">{phase.shortName}</span>
              </button>
            );
          })}
        </div>

        {/* ---- PROGRESS BAR — attached to phase strip ---- */}
        <div className="et-prog-bar">
          <div className="et-prog-meta">
            <span className="et-prog-text">{phaseProgressLabel}</span>
          </div>
          <div className="et-prog-track">
            <div className="et-prog-fill" style={{ width: `${progress.percent}%` }} />
          </div>
        </div>

        {/* ---- PHASE HERO — fills viewport between progress bar and trajectory ---- */}
        <div className="et-hero" onClick={() => openPhase(currentPhase)}>
          <span className="et-hero-num">
            {String(phases.findIndex(p => p.id === currentPhase.id) + 1).padStart(2, '0')}
          </span>
          <span className="et-hero-name">{currentPhase.name}</span>
          <span className="et-hero-days">Days {currentPhase.days}</span>
          <p className="et-hero-expect">{currentPhase.expectation}</p>
          <span className="et-hero-progress">{progress.text}</span>
        </div>

        {/* ---- TRAJECTORY GRID ---- */}
        <div className="et-traj">
          {analysis.hasData ? (
            <>
              <div className="et-traj-grid">
                {analysis.trajectory.map(m => (
                  <div key={m.key} className="et-traj-cell">
                    <span className="et-traj-value">{m.now || '—'}</span>
                    <span className="et-traj-label">{m.label}</span>
                    {m.delta && (
                      <span className={`et-traj-delta ${m.improved ? 'delta-up' : m.declined ? 'delta-down' : 'delta-flat'}`}>
                        {m.improved ? '↑' : m.declined ? '↓' : '→'} {m.delta}
                      </span>
                    )}
                  </div>
                ))}
              </div>
              {extremes && (
                <div className="et-traj-extremes">
                  <div className="et-traj-extreme">
                    <span className="et-traj-extreme-label">Strongest</span>
                    <span className="et-traj-extreme-value">{extremes.strongest.label}</span>
                  </div>
                  <div className="et-traj-extreme">
                    <span className="et-traj-extreme-label">Growth Area</span>
                    <span className="et-traj-extreme-value">{extremes.growthArea.label}</span>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="et-traj-empty">
              <div className="et-traj-empty-inner">
                <span className="et-traj-empty-count">{analysis.checkIns}/{analysis.needed} emotional logs</span>
                <span className="et-traj-empty-sub">Track how you feel to see trajectory</span>
              </div>
            </div>
          )}
        </div>

      </div>

      {/* ====== PHASE DETAIL SHEET ====== */}
      {showModal && selectedPhase && (
        <div className={`sheet-backdrop${modalOpen ? ' open' : ''}`} onClick={closeModal}>
          <div ref={sheetPanelRef} className={`sheet-panel et-sheet${modalOpen ? ' open' : ''}`} onClick={e => e.stopPropagation()}>
            <div className="sheet-header" />

            <div className="et-sheet-header">
              <span className="et-sheet-num">
                {String(phases.findIndex(p => p.id === selectedPhase.id) + 1).padStart(2, '0')}
              </span>
              <div>
                <h2>{selectedPhase.name}</h2>
                <p>Days {selectedPhase.days}</p>
              </div>
            </div>

            <div className="et-sheet-scroll" data-no-swipe>
              <div className="et-sheet-body">
                {selectedPhase.duration && (
                  <div className="et-modal-section et-duration">
                    <p>{selectedPhase.duration}</p>
                  </div>
                )}

                {selectedPhase.whatsHappening && (
                  <div className="et-modal-section">
                    <h4>What's Happening</h4>
                    <p>{selectedPhase.whatsHappening}</p>
                  </div>
                )}

                {selectedPhase.traumaTimeline && (
                  <div className="et-modal-section">
                    <h4>What Surfaces When</h4>
                    <ul>
                      {selectedPhase.traumaTimeline.map((item, i) => <li key={i}>{item}</li>)}
                    </ul>
                  </div>
                )}

                {selectedPhase.socialShift && (
                  <div className="et-modal-section">
                    <h4>What Others Will Notice</h4>
                    <p>{selectedPhase.socialShift}</p>
                  </div>
                )}

                {selectedPhase.relationshipShift && (
                  <div className="et-modal-section">
                    <h4>What Shifts</h4>
                    <p>{selectedPhase.relationshipShift}</p>
                  </div>
                )}

                {selectedPhase.responsibilityShift && (
                  <div className="et-modal-section">
                    <h4>What Shifts</h4>
                    <p>{selectedPhase.responsibilityShift}</p>
                  </div>
                )}

                {selectedPhase.criticalRule && (
                  <div className={`et-modal-section ${selectedPhase.criticalRuleHighlight ? 'et-critical' : 'et-rule'}`}>
                    <h4>{selectedPhase.criticalRuleHighlight ? 'Critical' : 'Remember'}</h4>
                    <p>{selectedPhase.criticalRule}</p>
                  </div>
                )}

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

                {selectedPhase.whatsNext && (
                  <div className="et-modal-section et-next">
                    <h4>What's Next</h4>
                    <p>{selectedPhase.whatsNext}</p>
                  </div>
                )}
              </div>
            </div>

            <button className="btn-ghost" onClick={closeModal}>
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default EmotionalTimeline;
