// Timeline.js — TITANTRACK FREE SEO TOOL
// Route: /timeline
// Purpose: Personalized retention timeline generator for organic search acquisition
// Design: Matches Landing.js aesthetic exactly (ambient gradients, film grain, typography)

import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import './Timeline.css';

// ============================================================
// PHASE DATA — Built from 7+ years of practitioner observation
// Aligned with EmotionalTimeline.js phases exactly
// ============================================================
const PHASES = [
  {
    key: 'initial',
    name: 'Initial Adaptation',
    range: [1, 14],
    color: '#22c55e',
    summary: 'Your body begins recalibrating. Energy fluctuates as your nervous system adjusts to the absence of regular dopamine spikes from ejaculation.',
    expect: [
      'Strong urges, especially in the first 72 hours',
      'Sleep disruption or unusually vivid dreams',
      'Bursts of energy followed by fatigue',
      'Heightened irritability as dopamine receptors reset'
    ],
    risk: 'This is where over 60% of attempts end. The neurochemical withdrawal is real — not a willpower failure.',
    insight: 'Men who pair retention with physical exercise during this phase report significantly smoother transitions.'
  },
  {
    key: 'emotional',
    name: 'Emotional Processing',
    range: [15, 45],
    color: '#f59e0b',
    summary: 'Suppressed emotions surface. This phase feels like regression but is actually deep healing — your body is processing what it previously numbed with release.',
    expect: [
      'Mood swings that feel disproportionate to circumstances',
      'Old memories or emotions surfacing unexpectedly',
      'Periods of anxiety alternating with profound calm',
      'Social sensitivity — both positive and negative'
    ],
    risk: 'The most psychologically challenging phase. Many mistake emotional purging for the practice "not working" and quit.',
    insight: 'Practitioners who journal through this phase report the highest long-term success rates. The emotions need somewhere to go.'
  },
  {
    key: 'mental',
    name: 'Mental Expansion',
    range: [46, 90],
    color: '#3b82f6',
    summary: 'Cognitive clarity sharpens dramatically. Focus deepens, creative output increases, and confidence becomes internally sourced rather than externally validated.',
    expect: [
      'Sustained focus for longer periods',
      'Increased creative ideation and problem-solving',
      'Confidence that feels natural rather than forced',
      'Deeper vocal resonance and physical presence'
    ],
    risk: 'Complacency becomes the threat. The benefits feel normal, which can lead to testing boundaries.',
    insight: 'This is where most practitioners report others noticing changes before they do — social magnetism, eye contact, presence.'
  },
  {
    key: 'integration',
    name: 'Integration & Growth',
    range: [91, 180],
    color: '#8b5cf6',
    summary: 'Benefits compound and stabilize. The practice shifts from discipline to identity — retention becomes who you are, not something you do.',
    expect: [
      'Emotional stability that feels unshakable',
      'Clear sense of purpose and direction',
      'Physical vitality — skin, posture, energy all elevated',
      'Deeper capacity for genuine connection'
    ],
    risk: 'Rare but intense urge windows can still occur, often triggered by major life stress or emotional events.',
    insight: 'Practitioners in this phase consistently describe a shift from willpower-based retention to natural, effortless conservation.'
  },
  {
    key: 'mastery',
    name: 'Mastery & Purpose',
    range: [181, 999999],
    color: '#ffdd00',
    summary: 'The practice transcends personal benefit. Energy is naturally directed toward creation, service, and legacy. You are operating at full capacity.',
    expect: [
      'Sustained high performance across all domains',
      'Natural leadership presence and influence',
      'Deep inner peace independent of external circumstances',
      'Desire to mentor and elevate others'
    ],
    risk: 'The primary risk is ego attachment to the streak itself. The number becomes less important than the life it enables.',
    insight: 'This is the time for major intellectual and creative achievements. Channel the energy into something that outlives you.'
  }
];

// ============================================================
// PROJECTION ENGINE — Generates personalized timeline
// Based on phase model + input segmentation
// ============================================================
const generateProjection = (inputs) => {
  const { streakDay, ageRange, exercise, priority } = inputs;
  const day = parseInt(streakDay) || 0;

  // Determine current phase
  const currentPhase = PHASES.find(p => day >= p.range[0] && day <= p.range[1]) || PHASES[0];
  const currentPhaseIndex = PHASES.indexOf(currentPhase);

  // Calculate progress through current phase
  const phaseLength = currentPhase.range[1] === 999999 ? 365 : (currentPhase.range[1] - currentPhase.range[0] + 1);
  const daysInPhase = Math.max(1, day - currentPhase.range[0] + 1);
  const daysRemaining = currentPhase.range[1] === 999999 ? null : Math.max(0, currentPhase.range[1] - day);
  const progressPercent = currentPhase.range[1] === 999999 ? 100 : Math.min(100, Math.round((daysInPhase / phaseLength) * 100));

  // Exercise modifier — affects benefit acceleration
  const exerciseMultiplier = exercise === 'heavy' ? 1.3 : exercise === 'sometimes' ? 1.0 : 0.75;

  // Age modifier — younger = faster physical adaptation, older = faster mental clarity
  const ageModifiers = {
    '18-24': { physical: 1.2, mental: 0.9, label: 'Your age gives you a strong physiological advantage — testosterone response and physical adaptation tend to be fastest in this range.' },
    '25-30': { physical: 1.1, mental: 1.1, label: 'Peak balance of physical responsiveness and mental maturity. Optimal window for compounding benefits.' },
    '31-40': { physical: 0.95, mental: 1.2, label: 'Mental clarity and emotional stability benefits tend to manifest earlier and stronger. Physical benefits build steadily.' },
    '40+': { physical: 0.85, mental: 1.3, label: 'The cognitive and emotional benefits are often the most pronounced. Energy conservation has an outsized impact at this stage.' }
  };
  const ageMod = ageModifiers[ageRange] || ageModifiers['25-30'];

  // Priority-specific projections
  const priorityInsights = {
    energy: {
      label: 'Energy & Physical Performance',
      early: 'Energy gains typically begin within the first 7 days as your body redirects resources previously spent on sperm production.',
      peak: `With ${exercise === 'heavy' ? 'your consistent training' : exercise === 'sometimes' ? 'moderate activity' : 'even without regular exercise'}, most practitioners report peak energy gains between days 21-45.`,
      sustained: 'Sustained high energy becomes baseline by day 60-90. The body fully adapts to conservation.'
    },
    clarity: {
      label: 'Mental Clarity & Focus',
      early: 'Mental fog begins clearing as dopamine receptor sensitivity normalizes — typically noticeable by day 10-14.',
      peak: 'Deep focus and creative clarity accelerate sharply during Mental Expansion (days 46-90). This is where cognitive performance peaks.',
      sustained: 'Long-term practitioners describe a permanent upgrade in processing speed, memory, and sustained attention.'
    },
    confidence: {
      label: 'Confidence & Social Presence',
      early: 'Internal confidence begins building as self-discipline compounds. Others may notice changes in your posture and eye contact before you do.',
      peak: 'The most dramatic social feedback typically arrives between days 30-60 — deeper voice, stronger presence, natural magnetism.',
      sustained: 'By day 90+, confidence is internally sourced. It no longer fluctuates with external validation.'
    },
    stability: {
      label: 'Emotional Stability & Self-Control',
      early: 'Expect turbulence first. Emotional Processing (days 15-45) surfaces suppressed feelings. This is healing, not failure.',
      peak: 'Emotional equilibrium typically stabilizes between days 45-75. Reactivity decreases. Responses become measured.',
      sustained: 'Deep emotional mastery — the ability to observe feelings without being controlled by them — develops beyond day 90.'
    }
  };

  // Risk windows based on streak position
  const riskWindows = [];
  if (day < 7) {
    riskWindows.push({
      range: 'Days 1-7',
      level: 'Critical',
      description: 'Neurochemical withdrawal peaks. Your brain is demanding the dopamine it\'s used to receiving.',
      survival: 'Minute-by-minute if needed. Cold showers, physical movement, and leaving the environment are your primary tools.'
    });
  }
  if (day < 21) {
    riskWindows.push({
      range: 'Days 14-21',
      level: 'High',
      description: 'The transition into Emotional Processing catches practitioners off guard. Urges combine with emotional instability.',
      survival: 'Journal daily. The urge is often an emotion in disguise — name the feeling and it loses power.'
    });
  }
  if (day < 45) {
    riskWindows.push({
      range: 'Days 30-45',
      level: 'Moderate',
      description: 'Flatline period. Benefits seem to plateau or disappear. Many quit believing retention "stopped working."',
      survival: 'This is the system recalibrating. Maintain the practice. The breakthrough follows the flatline.'
    });
  }
  if (day >= 45) {
    riskWindows.push({
      range: 'Days 60-75',
      level: 'Low-Moderate',
      description: 'Complacency risk. Benefits feel normal. The thought of "I can handle one release" appears.',
      survival: 'Remember why you started. One release doesn\'t reset everything — but it often triggers a pattern.'
    });
  }

  // Next 30 days projection
  const next30 = [];
  for (let i = 0; i < 30; i += 7) {
    const futureDay = day + i;
    const futurePhase = PHASES.find(p => futureDay >= p.range[0] && futureDay <= p.range[1]) || PHASES[PHASES.length - 1];
    const isTransition = i > 0 && futurePhase.key !== (PHASES.find(p => (day + i - 7) >= p.range[0] && (day + i - 7) <= p.range[1]) || PHASES[0]).key;

    next30.push({
      dayRange: `Days ${futureDay}-${futureDay + 6}`,
      phase: futurePhase.name,
      phaseColor: futurePhase.color,
      isTransition,
      transitionNote: isTransition ? `Entering ${futurePhase.name}. Expect a shift in what you experience.` : null
    });
  }

  return {
    currentPhase,
    currentPhaseIndex,
    daysInPhase,
    daysRemaining,
    progressPercent,
    ageMod,
    exerciseMultiplier,
    priorityData: priorityInsights[priority],
    riskWindows,
    next30,
    streakDay: day
  };
};


// ============================================================
// MAIN COMPONENT
// ============================================================
const Timeline = () => {
  const [step, setStep] = useState(0); // 0=hero, 1=form, 2=results, 3=email gate
  const [inputs, setInputs] = useState({
    streakDay: '',
    streakBucket: '',
    ageRange: '',
    exercise: '',
    priority: ''
  });
  const [projection, setProjection] = useState(null);
  const [email, setEmail] = useState('');
  const [emailSubmitted, setEmailSubmitted] = useState(false);
  const [headerSolid, setHeaderSolid] = useState(false);

  const resultsRef = useRef(null);
  const seoRef = useRef(null);

  // Sticky header on scroll
  useEffect(() => {
    const handleScroll = () => setHeaderSolid(window.scrollY > 60);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Scroll-triggered animations for SEO content
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) entry.target.classList.add('in-view');
        });
      },
      { threshold: 0.15 }
    );
    if (seoRef.current) observer.observe(seoRef.current);
    return () => observer.disconnect();
  }, []);

  // SEO — dynamic title, meta, canonical, OG tags, FAQ JSON-LD
  useEffect(() => {
    const originalTitle = document.title;

    // Page title — primary keyword front-loaded
    document.title = 'Semen Retention Timeline — Personalized Day-by-Day Projections | TitanTrack';

    // Meta description — replace existing from index.html
    const existingMeta = document.querySelector('meta[name="description"]');
    const originalDesc = existingMeta ? existingMeta.content : '';
    if (existingMeta) {
      existingMeta.content = 'Free personalized semen retention timeline based on your age, exercise, and streak position. See what to expect at day 7, 30, 90+ with phase-by-phase projections.';
    }

    // Canonical URL
    const canonical = document.createElement('link');
    canonical.rel = 'canonical';
    canonical.href = 'https://titantrack.app/timeline';
    document.head.appendChild(canonical);

    // Open Graph tags
    const ogTags = [
      { property: 'og:title', content: 'Semen Retention Timeline — What Will Retention Do For You?' },
      { property: 'og:description', content: 'Free personalized timeline showing your semen retention phases, risk windows, and projected benefits. Takes 30 seconds.' },
      { property: 'og:url', content: 'https://titantrack.app/timeline' },
      { property: 'og:type', content: 'website' },
      { property: 'og:site_name', content: 'TitanTrack' }
    ];
    const ogElements = ogTags.map(tag => {
      const el = document.createElement('meta');
      el.setAttribute('property', tag.property);
      el.content = tag.content;
      document.head.appendChild(el);
      return el;
    });

    // FAQ JSON-LD structured data (Google prefers this over microdata)
    const jsonLd = document.createElement('script');
    jsonLd.type = 'application/ld+json';
    jsonLd.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      'mainEntity': [
        {
          '@type': 'Question',
          'name': 'How long until semen retention benefits start?',
          'acceptedAnswer': {
            '@type': 'Answer',
            'text': 'Most practitioners report noticeable changes within 7-14 days, particularly increased energy and sharper mental clarity. Deeper benefits like emotional stability and sustained confidence typically develop between days 30-90. The timeline varies based on your starting point, age, and lifestyle factors.'
          }
        },
        {
          '@type': 'Question',
          'name': 'What happens at day 30 of semen retention?',
          'acceptedAnswer': {
            '@type': 'Answer',
            'text': 'Day 30 typically falls within the Emotional Processing phase (days 15-45). You may experience a period known as a "flatline" where benefits seem to plateau. This is actually your system recalibrating at a deeper level. Practitioners who push through the flatline consistently report the most significant breakthroughs in the weeks that follow.'
          }
        },
        {
          '@type': 'Question',
          'name': 'What does 90 days of semen retention feel like?',
          'acceptedAnswer': {
            '@type': 'Answer',
            'text': 'At 90 days, most practitioners have transitioned through Mental Expansion and into early Integration. Commonly reported experiences include deep cognitive clarity, internally-sourced confidence, emotional stability, and a clear sense of purpose. Many describe feeling fundamentally different from who they were at day one.'
          }
        },
        {
          '@type': 'Question',
          'name': 'Is semen retention different from NoFap?',
          'acceptedAnswer': {
            '@type': 'Answer',
            'text': 'While they overlap, semen retention and NoFap have different focuses. NoFap primarily addresses pornography addiction and compulsive behavior. Semen retention is a broader practice focused on conserving sexual energy for physical, mental, and spiritual benefit. Many practitioners combine elements of both approaches.'
          }
        }
      ]
    });
    document.head.appendChild(jsonLd);

    // Cleanup on unmount — restore original title, remove injected tags
    return () => {
      document.title = originalTitle;
      if (existingMeta) existingMeta.content = originalDesc;
      canonical.remove();
      ogElements.forEach(el => el.remove());
      jsonLd.remove();
    };
  }, []);

  // Handle streak bucket selection → map to day number
  const handleBucketSelect = (bucket) => {
    const dayMap = { 'start': '1', 'week1': '5', 'building': '18', 'deep': '' };
    setInputs(prev => ({
      ...prev,
      streakBucket: bucket,
      streakDay: dayMap[bucket] || ''
    }));
  };

  // Generate results
  const handleGenerate = () => {
    const day = parseInt(inputs.streakDay) || 1;
    const result = generateProjection({
      streakDay: day,
      ageRange: inputs.ageRange,
      exercise: inputs.exercise,
      priority: inputs.priority
    });
    setProjection(result);
    setStep(2);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Email submission → Mailchimp via backend
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailError, setEmailError] = useState('');

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !email.includes('@')) return;

    setEmailLoading(true);
    setEmailError('');

    try {
      const response = await fetch('/api/timeline/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          streakDay: inputs.streakDay,
          ageRange: inputs.ageRange,
          exercise: inputs.exercise,
          priority: inputs.priority,
          projection: projection ? {
            currentPhase: { name: projection.currentPhase.name, summary: projection.currentPhase.summary, expect: projection.currentPhase.expect, insight: projection.currentPhase.insight },
            daysInPhase: projection.daysInPhase,
            daysRemaining: projection.daysRemaining,
            ageMod: { label: projection.ageMod.label },
            priorityData: projection.priorityData,
            riskWindows: projection.riskWindows,
            next30: projection.next30,
            streakDay: projection.streakDay
          } : null
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setEmailSubmitted(true);
      } else {
        setEmailError('Something went wrong. Try again.');
      }
    } catch (err) {
      setEmailError('Connection error. Try again.');
    } finally {
      setEmailLoading(false);
    }
  };

  // Check if form is complete
  const formComplete = inputs.streakBucket && inputs.ageRange && inputs.exercise && inputs.priority &&
    (inputs.streakBucket !== 'deep' || (inputs.streakDay && parseInt(inputs.streakDay) > 30));

  return (
    <div className="tl">
      <div className="tl-bg" />

      {/* ── Header ── */}
      <header className={`tl-header${headerSolid ? ' tl-header-solid' : ''}`}>
        <Link to="/" className="tl-header-brand">
          <img src="/tt-icon-white.png" alt="TitanTrack" className="tl-header-logo" />
        </Link>
        <Link to="/" className="tl-header-link">
          Sign in
        </Link>
      </header>

      {/* ── STEP 0: Hero ── */}
      {step === 0 && (
        <section className="tl-hero">
          <p className="tl-hero-label">Free Tool</p>
          <h1 className="tl-hero-headline">
            What will retention<br />
            <span className="tl-hero-accent">do for you?</span>
          </h1>
          <p className="tl-hero-sub">
            Personalized projections based on patterns observed across
            thousands of practitioners in the TitanTrack community.
          </p>
          <button className="tl-cta" onClick={() => { setStep(1); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>
            See Your Timeline
          </button>
          <p className="tl-hero-note">No account required. Takes 30 seconds.</p>
        </section>
      )}

      {/* ── STEP 1: Input Form ── */}
      {step === 1 && (
        <section className="tl-form-section">
          <p className="tl-form-label">Your Timeline</p>
          <h2 className="tl-form-headline">Tell us where you are.</h2>
          <p className="tl-form-sub">Four questions. Personalized results.</p>

          <div className="tl-form">

            {/* Q1: Streak position */}
            <div className="tl-question">
              <p className="tl-q-label">Where are you in your journey?</p>
              <div className="tl-options">
                {[
                  { key: 'start', label: 'Just starting', sub: 'Day 0-3' },
                  { key: 'week1', label: 'First week', sub: 'Day 4-7' },
                  { key: 'building', label: 'Building momentum', sub: 'Day 8-30' },
                  { key: 'deep', label: 'Deep streak', sub: 'Day 31+' }
                ].map(opt => (
                  <button
                    key={opt.key}
                    className={`tl-option${inputs.streakBucket === opt.key ? ' tl-option-active' : ''}`}
                    onClick={() => handleBucketSelect(opt.key)}
                  >
                    <span className="tl-option-label">{opt.label}</span>
                    <span className="tl-option-sub">{opt.sub}</span>
                  </button>
                ))}
              </div>
              {inputs.streakBucket === 'deep' && (
                <div className="tl-day-input-wrap">
                  <input
                    type="number"
                    className="tl-day-input"
                    placeholder="Enter your current day"
                    value={inputs.streakDay}
                    onChange={(e) => setInputs(prev => ({ ...prev, streakDay: e.target.value }))}
                    min="31"
                    max="9999"
                    autoFocus
                  />
                </div>
              )}
            </div>

            {/* Q2: Age range */}
            <div className="tl-question">
              <p className="tl-q-label">What's your age range?</p>
              <div className="tl-options tl-options-row">
                {['18-24', '25-30', '31-40', '40+'].map(age => (
                  <button
                    key={age}
                    className={`tl-option tl-option-compact${inputs.ageRange === age ? ' tl-option-active' : ''}`}
                    onClick={() => setInputs(prev => ({ ...prev, ageRange: age }))}
                  >
                    <span className="tl-option-label">{age}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Q3: Exercise */}
            <div className="tl-question">
              <p className="tl-q-label">Do you exercise regularly?</p>
              <div className="tl-options">
                {[
                  { key: 'heavy', label: 'Yes, 3+ times/week' },
                  { key: 'sometimes', label: 'Sometimes' },
                  { key: 'no', label: 'Not currently' }
                ].map(opt => (
                  <button
                    key={opt.key}
                    className={`tl-option${inputs.exercise === opt.key ? ' tl-option-active' : ''}`}
                    onClick={() => setInputs(prev => ({ ...prev, exercise: opt.key }))}
                  >
                    <span className="tl-option-label">{opt.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Q4: Priority */}
            <div className="tl-question">
              <p className="tl-q-label">What matters most to you?</p>
              <div className="tl-options">
                {[
                  { key: 'energy', label: 'Energy & physical performance' },
                  { key: 'clarity', label: 'Mental clarity & focus' },
                  { key: 'confidence', label: 'Confidence & social presence' },
                  { key: 'stability', label: 'Emotional stability & self-control' }
                ].map(opt => (
                  <button
                    key={opt.key}
                    className={`tl-option${inputs.priority === opt.key ? ' tl-option-active' : ''}`}
                    onClick={() => setInputs(prev => ({ ...prev, priority: opt.key }))}
                  >
                    <span className="tl-option-label">{opt.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Generate CTA */}
            <button
              className={`tl-cta tl-cta-generate${formComplete ? '' : ' tl-cta-disabled'}`}
              onClick={handleGenerate}
              disabled={!formComplete}
            >
              Generate My Timeline
            </button>
          </div>
        </section>
      )}

      {/* ── STEP 2: Results ── */}
      {step === 2 && projection && (
        <section className="tl-results" ref={resultsRef}>

          {/* Current Phase */}
          <div className="tl-result-block tl-phase-block">
            <p className="tl-result-label">Your Current Phase</p>
            <div className="tl-phase-header">
              <h2 className="tl-phase-name">
                {projection.currentPhase.name}
              </h2>
              <span className="tl-phase-day">Day {projection.streakDay}</span>
            </div>
            <p className="tl-phase-summary">{projection.currentPhase.summary}</p>

            {/* Progress bar */}
            <div className="tl-progress">
              <div className="tl-progress-bar">
                <div
                  className="tl-progress-fill"
                  style={{ width: `${projection.progressPercent}%` }}
                />
              </div>
              <div className="tl-progress-meta">
                <span>{projection.daysInPhase} days in</span>
                <span>
                  {projection.daysRemaining !== null
                    ? `${projection.daysRemaining} days remaining`
                    : 'Ongoing mastery'}
                </span>
              </div>
            </div>

            {/* What to expect */}
            <div className="tl-expect">
              <p className="tl-expect-label">What to expect in this phase</p>
              {projection.currentPhase.expect.map((item, i) => (
                <div className="tl-expect-item" key={i}>
                  <span className="tl-expect-dot" />
                  <span>{item}</span>
                </div>
              ))}
            </div>

            {/* Phase-specific insight */}
            <div className="tl-insight-box">
              <p className="tl-insight-text">{projection.currentPhase.insight}</p>
            </div>
          </div>

          {/* Priority-specific projection */}
          <div className="tl-result-block">
            <p className="tl-result-label">{projection.priorityData.label}</p>
            <div className="tl-priority-timeline">
              <div className="tl-priority-stage">
                <span className="tl-priority-marker" />
                <div>
                  <p className="tl-priority-phase">Early Phase</p>
                  <p className="tl-priority-text">{projection.priorityData.early}</p>
                </div>
              </div>
              <div className="tl-priority-line" />
              <div className="tl-priority-stage">
                <span className="tl-priority-marker tl-priority-marker-mid" />
                <div>
                  <p className="tl-priority-phase">Peak Development</p>
                  <p className="tl-priority-text">{projection.priorityData.peak}</p>
                </div>
              </div>
              <div className="tl-priority-line" />
              <div className="tl-priority-stage">
                <span className="tl-priority-marker tl-priority-marker-full" />
                <div>
                  <p className="tl-priority-phase">Sustained Integration</p>
                  <p className="tl-priority-text">{projection.priorityData.sustained}</p>
                </div>
              </div>
            </div>

            {/* Age context */}
            <div className="tl-age-note">
              <p>{projection.ageMod.label}</p>
            </div>
          </div>

          {/* Risk Windows */}
          <div className="tl-result-block">
            <p className="tl-result-label">Your Risk Windows</p>
            <p className="tl-result-sub">Where practitioners in your position are most vulnerable.</p>
            <div className="tl-risks">
              {projection.riskWindows.map((risk, i) => (
                <div className="tl-risk-card" key={i}>
                  <div className="tl-risk-header">
                    <span className="tl-risk-range">{risk.range}</span>
                    <span className={`tl-risk-level tl-risk-${risk.level.toLowerCase().replace('-', '')}`}>
                      {risk.level}
                    </span>
                  </div>
                  <p className="tl-risk-desc">{risk.description}</p>
                  <p className="tl-risk-survival"><strong>How to get through it:</strong> {risk.survival}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Email Gate — Full 90-day timeline */}
          {!emailSubmitted ? (
            <div className="tl-result-block tl-gate">
              <div className="tl-gate-inner">
                <p className="tl-gate-label">Your full 90-day timeline is ready.</p>
                <h3 className="tl-gate-headline">
                  Get your complete phase-by-phase<br />
                  breakdown delivered to your inbox.
                </h3>
                <p className="tl-gate-sub">
                  Includes extended projections, all five phases mapped to your profile,
                  and specific strategies for each risk window.
                </p>
                <form className="tl-gate-form" onSubmit={handleEmailSubmit}>
                  <input
                    type="email"
                    className="tl-gate-input"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={emailLoading}
                  />
                  <button type="submit" className={`tl-cta tl-cta-gate${emailLoading ? ' tl-cta-disabled' : ''}`} disabled={emailLoading}>
                    {emailLoading ? 'Sending...' : 'Send My Full Timeline'}
                  </button>
                  {emailError && <p className="tl-gate-error">{emailError}</p>}
                </form>
                <p className="tl-gate-privacy">No spam. Unsubscribe anytime.</p>
              </div>
            </div>
          ) : (
            <div className="tl-result-block tl-gate tl-gate-confirmed">
              <div className="tl-gate-inner">
                <p className="tl-gate-check">✓</p>
                <h3 className="tl-gate-headline">Check your inbox.</h3>
                <p className="tl-gate-sub">
                  Your full 90-day personalized timeline is on its way.
                </p>
              </div>
            </div>
          )}

          {/* CTA to TitanTrack */}
          <div className="tl-result-block tl-app-cta">
            <p className="tl-app-cta-label">Track it in real time</p>
            <h3 className="tl-app-cta-headline">
              See how your reality compares<br />
              to these projections.
            </h3>
            <p className="tl-app-cta-sub">
              TitanTrack monitors your benefits daily with AI that learns your patterns
              and predicts your vulnerable moments before they arrive.
            </p>
            <Link to="/" className="tl-cta">
              Start Tracking Free
            </Link>
            <p className="tl-hero-note">7-day free trial. $8/month after.</p>
          </div>

          {/* Restart */}
          <button className="tl-restart" onClick={() => { setStep(0); setProjection(null); setEmail(''); setEmailSubmitted(false); window.scrollTo({ top: 0 }); }}>
            ← Generate another timeline
          </button>
        </section>
      )}

      {/* ── SEO Content (always visible below hero/results) ── */}
      <section className="tl-seo" ref={seoRef}>
        <div className="tl-seo-inner">
          <h2 className="tl-seo-headline">Understanding the Semen Retention Timeline</h2>

          <p className="tl-seo-text">
            Every man's semen retention timeline is different. While generic guides offer broad stage-by-stage overviews, 
            the reality is that your experience depends on factors unique to you — your age, activity level, how long 
            you've been practicing, and what you're optimizing for.
          </p>

          <p className="tl-seo-text">
            The timeline tool above generates personalized projections based on patterns observed across the TitanTrack 
            practitioner community. Rather than recycling the same vague claims, it maps your specific inputs against 
            a five-phase model refined over seven years of real-world observation.
          </p>

          <h3 className="tl-seo-subhead">The Five Phases of Semen Retention</h3>

          <p className="tl-seo-text">
            <strong>Initial Adaptation (Days 1-14)</strong> is where your body recalibrates. Energy fluctuates, 
            urges are strongest, and your dopamine system begins resetting. Most attempts end in this phase — not 
            because of weak willpower, but because the neurochemical adjustment is genuinely challenging.
          </p>

          <p className="tl-seo-text">
            <strong>Emotional Processing (Days 15-45)</strong> is the phase most practitioners don't expect. 
            Suppressed emotions surface as the body processes what it previously numbed through release. 
            Mood swings, unexpected memories, and heightened sensitivity are normal indicators of deep healing.
          </p>

          <p className="tl-seo-text">
            <strong>Mental Expansion (Days 46-90)</strong> is where the benefits become undeniable. Focus sharpens, 
            creative output increases, and confidence becomes internally sourced. This is often when others begin 
            noticing changes — deeper presence, stronger eye contact, natural magnetism.
          </p>

          <p className="tl-seo-text">
            <strong>Integration & Growth (Days 91-180)</strong> marks the shift from discipline to identity. 
            Benefits compound and stabilize. Retention becomes who you are rather than something you're doing. 
            Emotional stability reaches its peak.
          </p>

          <p className="tl-seo-text">
            <strong>Mastery & Purpose (Days 181+)</strong> transcends personal benefit. Energy is naturally channeled 
            into creation, service, and legacy. Practitioners at this stage consistently describe operating at 
            full capacity across all domains of life.
          </p>

          <h3 className="tl-seo-subhead">Frequently Asked Questions</h3>

          <div className="tl-faq" itemScope itemType="https://schema.org/FAQPage">
            <div className="tl-faq-item" itemScope itemProp="mainEntity" itemType="https://schema.org/Question">
              <p className="tl-faq-q" itemProp="name">How long until semen retention benefits start?</p>
              <div itemScope itemProp="acceptedAnswer" itemType="https://schema.org/Answer">
                <p className="tl-faq-a" itemProp="text">
                  Most practitioners report noticeable changes within 7-14 days, particularly increased energy 
                  and sharper mental clarity. Deeper benefits like emotional stability and sustained confidence 
                  typically develop between days 30-90. The timeline varies based on your starting point, 
                  age, and lifestyle factors.
                </p>
              </div>
            </div>

            <div className="tl-faq-item" itemScope itemProp="mainEntity" itemType="https://schema.org/Question">
              <p className="tl-faq-q" itemProp="name">What happens at day 30 of semen retention?</p>
              <div itemScope itemProp="acceptedAnswer" itemType="https://schema.org/Answer">
                <p className="tl-faq-a" itemProp="text">
                  Day 30 typically falls within the Emotional Processing phase (days 15-45). You may experience 
                  a period known as a "flatline" where benefits seem to plateau. This is actually your system 
                  recalibrating at a deeper level. Practitioners who push through the flatline consistently 
                  report the most significant breakthroughs in the weeks that follow.
                </p>
              </div>
            </div>

            <div className="tl-faq-item" itemScope itemProp="mainEntity" itemType="https://schema.org/Question">
              <p className="tl-faq-q" itemProp="name">What does 90 days of semen retention feel like?</p>
              <div itemScope itemProp="acceptedAnswer" itemType="https://schema.org/Answer">
                <p className="tl-faq-a" itemProp="text">
                  At 90 days, most practitioners have transitioned through Mental Expansion and into early 
                  Integration. Commonly reported experiences include deep cognitive clarity, internally-sourced 
                  confidence, emotional stability, and a clear sense of purpose. Many describe feeling 
                  fundamentally different from who they were at day one.
                </p>
              </div>
            </div>

            <div className="tl-faq-item" itemScope itemProp="mainEntity" itemType="https://schema.org/Question">
              <p className="tl-faq-q" itemProp="name">Is semen retention different from NoFap?</p>
              <div itemScope itemProp="acceptedAnswer" itemType="https://schema.org/Answer">
                <p className="tl-faq-a" itemProp="text">
                  While they overlap, semen retention and NoFap have different focuses. NoFap primarily addresses 
                  pornography addiction and compulsive behavior. Semen retention is a broader practice focused on 
                  conserving sexual energy for physical, mental, and spiritual benefit. Many practitioners combine 
                  elements of both approaches.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="tl-footer">
        <div className="tl-footer-links">
          <Link to="/">TitanTrack</Link>
          <span className="tl-footer-dot">·</span>
          <Link to="/privacy">Privacy</Link>
          <span className="tl-footer-dot">·</span>
          <Link to="/terms">Terms</Link>
        </div>
        <p className="tl-footer-copy">© 2026 TitanTrack</p>
        <p className="tl-footer-disclaimer">
          Not medical advice. Projections based on community-observed patterns, not clinical data. 
          Consult a professional for health concerns.
        </p>
      </footer>
    </div>
  );
};

export default Timeline;
