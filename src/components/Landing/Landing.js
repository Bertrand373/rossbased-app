// Landing.js - TITANTRACK ELITE CONVERSION PAGE
import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import './Landing.css';
import AuthModal from '../Auth/AuthModal';
import trackerLogo from '../../assets/trackerapplogo-white.png';

const Landing = ({ onLogin }) => {
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [headerSolid, setHeaderSolid] = useState(false);
  const featuresRef = useRef(null);
  const problemRef = useRef(null);
  const testimonialRef = useRef(null);
  const journeyRef = useRef(null);
  const pricingRef = useRef(null);
  const oracleRef = useRef(null);

  const handleLoginSuccess = async (username, password, isGoogleAuth) => {
    const result = await onLogin(username, password, isGoogleAuth);
    if (!result) setShowAuthModal(false);
    return result;
  };

  const openAuth = () => setShowAuthModal(true);

  // Sticky header — solid background after scrolling past hero
  useEffect(() => {
    const handleScroll = () => {
      setHeaderSolid(window.scrollY > 60);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Scroll-triggered animations
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('in-view');
          }
        });
      },
      { threshold: 0.15 }
    );

    [featuresRef, problemRef, testimonialRef, journeyRef, pricingRef, oracleRef].forEach(ref => {
      if (ref.current) observer.observe(ref.current);
    });

    return () => observer.disconnect();
  }, []);

  // SEO — dynamic title, meta, canonical, OG tags, SoftwareApplication schema
  useEffect(() => {
    const originalTitle = document.title;

    // Page title — keyword-rich for the landing page
    document.title = 'TitanTrack — AI-Powered Semen Retention Tracker App';

    // Meta description — replace generic one from index.html
    const existingMeta = document.querySelector('meta[name="description"]');
    const originalDesc = existingMeta ? existingMeta.content : '';
    if (existingMeta) {
      existingMeta.content = 'Track your semen retention streak with AI predictions, 6-metric benefit tracking, emotional timeline mapping, and crisis tools. Free to start. Built by a 2,400+ day practitioner.';
    }

    // Canonical URL
    const canonical = document.createElement('link');
    canonical.rel = 'canonical';
    canonical.href = 'https://titantrack.app/';
    document.head.appendChild(canonical);

    // Open Graph tags
    const ogTags = [
      { property: 'og:title', content: 'TitanTrack — AI-Powered Semen Retention Tracker' },
      { property: 'og:description', content: 'The retention tracker that learns your patterns and predicts when you\'re vulnerable. 6-metric tracking, emotional timeline, AI crisis intervention. Free to start.' },
      { property: 'og:url', content: 'https://titantrack.app/' },
      { property: 'og:type', content: 'website' },
      { property: 'og:site_name', content: 'TitanTrack' },
      { property: 'og:image', content: 'https://titantrack.app/icon-512.png' }
    ];
    const ogElements = ogTags.map(tag => {
      const el = document.createElement('meta');
      el.setAttribute('property', tag.property);
      el.content = tag.content;
      document.head.appendChild(el);
      return el;
    });

    // Twitter card
    const twitterTags = [
      { name: 'twitter:card', content: 'summary' },
      { name: 'twitter:title', content: 'TitanTrack — AI-Powered Semen Retention Tracker' },
      { name: 'twitter:description', content: 'Track your retention streak with AI predictions, benefit tracking, and crisis tools. Built by a 2,400+ day practitioner.' }
    ];
    const twitterElements = twitterTags.map(tag => {
      const el = document.createElement('meta');
      el.name = tag.name;
      el.content = tag.content;
      document.head.appendChild(el);
      return el;
    });

    // SoftwareApplication structured data — for Google rich results
    const jsonLd = document.createElement('script');
    jsonLd.type = 'application/ld+json';
    jsonLd.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'SoftwareApplication',
      'name': 'TitanTrack',
      'description': 'AI-powered semen retention tracker with neural network predictions, 6-metric benefit tracking, emotional timeline mapping, and crisis intervention tools.',
      'url': 'https://titantrack.app',
      'applicationCategory': 'HealthApplication',
      'operatingSystem': 'Web, iOS, Android',
      'offers': [
        {
          '@type': 'Offer',
          'price': '0',
          'priceCurrency': 'USD',
          'description': 'Free tier with core tracking features'
        },
        {
          '@type': 'Offer',
          'price': '8.00',
          'priceCurrency': 'USD',
          'billingIncrement': 'P1M',
          'description': 'Premium monthly with AI predictions, Oracle, and advanced analytics'
        },
        {
          '@type': 'Offer',
          'price': '62.00',
          'priceCurrency': 'USD',
          'billingIncrement': 'P1Y',
          'description': 'Premium yearly — save 35%'
        }
      ],
      'featureList': 'AI pattern recognition, 6-metric benefit tracking, Emotional timeline, Crisis intervention, Subliminal mind program, Oracle AI guide'
    });
    document.head.appendChild(jsonLd);

    // Cleanup on unmount
    return () => {
      document.title = originalTitle;
      if (existingMeta) existingMeta.content = originalDesc;
      canonical.remove();
      ogElements.forEach(el => el.remove());
      twitterElements.forEach(el => el.remove());
      jsonLd.remove();
    };
  }, []);

  return (
    <div className="landing">
      <div className="landing-bg" />

      {/* Sticky header — logo + sign in for returning users */}
      <header className={`landing-header${headerSolid ? ' header-solid' : ''}`}>
        <img src={trackerLogo} alt="TitanTrack" className="landing-header-logo" />
        <button className="landing-sign-in" onClick={openAuth}>
          Sign in
        </button>
      </header>

      {/* ============================================================
          HERO — Split layout: copy left, video right on desktop
          ============================================================ */}
      <section className="landing-hero">
        <div className="landing-hero-inner">
          <div className="landing-hero-copy">
            <h1 className="landing-headline">
              Your patterns are predictable.<br />
              <span className="landing-headline-accent">Now they work for you.</span>
            </h1>

            <p className="landing-sub">
              The AI-powered retention tracker that learns your vulnerabilities
              and intervenes before you relapse.
            </p>

            <button className="landing-cta" onClick={openAuth}>
              Get Started Free
            </button>
            <p className="landing-trial-note">Free forever · Premium when you're ready</p>
          </div>

          {/* Demo video */}
          <div className="landing-hero-video">
            <div className="landing-video-wrap">
              <video
                autoPlay
                muted
                loop
                playsInline
                preload="auto"
                className="landing-video"
              >
                <source src="/videos/demo.mp4" type="video/mp4" />
              </video>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================
          PROBLEM — Call out the pain
          ============================================================ */}
      <section className="landing-problem" ref={problemRef}>
        <p className="landing-section-label">The problem</p>
        <h2 className="landing-problem-headline">
          Day counters don't work.
        </h2>
        <p className="landing-problem-text">
          You know the cycle. Start strong. Hit the same wall.
          Relapse at the same point. Reset to zero.
          The counter goes up and comes back down
          because counting days doesn't address the pattern underneath.
        </p>
        <p className="landing-problem-text">
          You don't need another number on a screen.
          You need something that actually understands when and why you fall — and warns you before it happens.
        </p>
      </section>

      {/* ============================================================
          FEATURES — What makes this different
          ============================================================ */}
      <section className="landing-features" ref={featuresRef}>
        <p className="landing-section-label">What's inside</p>

        <div className="landing-features-grid">
          <div className="landing-feature">
            <span className="landing-feature-num">01</span>
            <div className="landing-feature-body">
              <h3>AI pattern recognition</h3>
              <p>
                A neural network trains on your personal data — your streaks,
                your benefit scores, your relapse history. It learns when
                you're vulnerable. Not from a dataset. From you.
              </p>
            </div>
          </div>

          <div className="landing-feature">
            <span className="landing-feature-num">02</span>
            <div className="landing-feature-body">
              <h3>6-metric benefit tracking</h3>
              <p>
                Energy, focus, confidence, aura, sleep, workouts.
                Daily logging with visual trend analysis.
                See what's actually changing — and when it drops.
              </p>
            </div>
          </div>

          <div className="landing-feature">
            <span className="landing-feature-num">03</span>
            <div className="landing-feature-body">
              <h3>Emotional timeline</h3>
              <p>
                Five distinct phases from Initial Adaptation through
                Mastery & Purpose. Know exactly where you are
                in the journey and what to expect next.
              </p>
            </div>
          </div>

          <div className="landing-feature">
            <span className="landing-feature-num">04</span>
            <div className="landing-feature-body">
              <h3>Crisis intervention</h3>
              <p>
                Breathing protocols, grounding techniques, and
                emergency tools designed for the moments
                that matter most. Accessible in two taps.
              </p>
            </div>
          </div>

          <div className="landing-feature">
            <span className="landing-feature-num">05</span>
            <div className="landing-feature-body">
              <h3>Subliminal mind program</h3>
              <p>
                A 30-night audio protocol that rewires subconscious beliefs
                around sexual energy and self-control.
                Loop while you sleep. Your subconscious does the work.
              </p>
            </div>
          </div>

          <div className="landing-feature">
            <span className="landing-feature-num">06</span>
            <div className="landing-feature-body">
              <h3>Private by design</h3>
              <p>
                All machine learning runs on your device.
                Your data is encrypted and never sold. No cloud processing.
                No third-party analytics. Your journey stays yours.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================
          ORACLE — The AI guide
          ============================================================ */}
      <section className="landing-oracle" ref={oracleRef}>
        <img src="/oracle-wordmark.png" alt="Oracle" className="landing-oracle-wordmark" />
        <p className="landing-oracle-text">
          An AI guide trained on years of retention wisdom, esoteric knowledge, and real community patterns.
          It doesn't motivate. It observes. It knows where you are in the process before you tell it.
        </p>
        <p className="landing-oracle-sub">
          Available in the app and on Discord.
        </p>
        <div className="landing-oracle-demo">
          <div className="landing-oracle-video-wrap">
            <video
              autoPlay
              muted
              loop
              playsInline
              preload="auto"
              className="landing-oracle-video"
            >
              <source src="/videos/oracle-demo.mp4" type="video/mp4" />
            </video>
          </div>
        </div>
      </section>

      {/* ============================================================
          TESTIMONIAL
          ============================================================ */}
      <section className="landing-testimonial" ref={testimonialRef}>
        <div className="landing-testimonial-grid">
          <div className="landing-testimonial-item">
            <blockquote className="landing-quote">
              "Your app has potential to be one of the best quitting apps. Already it's amazing.
              It's great to not only track days and have access to overall progress within
              your being. A habit-share style app specifically for this is monumental."
            </blockquote>
            <p className="landing-quote-attr">— Community member, daily user since launch</p>
          </div>
          <div className="landing-testimonial-item">
            <blockquote className="landing-quote">
              "This Titan App is cool. Just logging the days is good reassurance.
              Love the Oracle as well, made me so aware of where my energy is
              being wasted. So useful to know!"
            </blockquote>
            <p className="landing-quote-attr">— Chris, Discord member</p>
          </div>
        </div>
      </section>

      {/* ============================================================
          JOURNEY — How the AI learns
          ============================================================ */}
      <section className="landing-journey" ref={journeyRef}>
        <p className="landing-section-label">How it works</p>

        <div className="landing-journey-steps">
          <div className="landing-step">
            <span className="landing-step-num">1</span>
            <span className="landing-step-time">Week 1</span>
            <h3 className="landing-step-title">Track</h3>
            <p className="landing-step-desc">
              Log daily. The system observes your energy, focus, habits, and emotional state.
              Every entry sharpens the model.
            </p>
          </div>

          <div className="landing-step-line" />

          <div className="landing-step">
            <span className="landing-step-num">2</span>
            <span className="landing-step-time">Week 2–3</span>
            <h3 className="landing-step-title">Learn</h3>
            <p className="landing-step-desc">
              The neural network trains on your patterns.
              It identifies your danger zones, your vulnerable hours, your triggers.
            </p>
          </div>

          <div className="landing-step-line" />

          <div className="landing-step">
            <span className="landing-step-num">3</span>
            <span className="landing-step-time">Week 3+</span>
            <h3 className="landing-step-title">Predict</h3>
            <p className="landing-step-desc">
              Real-time risk alerts when conditions match your past relapses.
              The model retrains weekly, getting sharper with every data point.
            </p>
          </div>
        </div>
      </section>

      {/* ============================================================
          PRICING
          ============================================================ */}
      <section className="landing-pricing" ref={pricingRef}>
        <p className="landing-section-label">Pricing</p>
        <div className="landing-pricing-cards">
          <div className="landing-price-card">
            <span className="landing-price-period">Monthly</span>
            <span className="landing-price-amount">$8<span className="landing-price-unit">/mo</span></span>
          </div>
          <div className="landing-price-card featured">
            <span className="landing-price-badge">Save 35%</span>
            <span className="landing-price-period">Yearly</span>
            <span className="landing-price-amount">$62<span className="landing-price-unit">/yr</span></span>
          </div>
        </div>

        <button className="landing-cta cta-bottom" onClick={openAuth}>
          Get Started Free
        </button>
        <p className="landing-trial-note">Free to start · Upgrade anytime · Cancel anytime</p>
      </section>

      {/* ============================================================
          FOOTER
          ============================================================ */}
      <footer className="landing-footer">
        <div className="landing-footer-brand">
          <img src="/tt-icon-white.png" alt="" className="landing-footer-icon" />
        </div>
        
        <div className="landing-footer-social">
          <a href="https://www.youtube.com/@rossbased" target="_blank" rel="noopener noreferrer" className="landing-footer-social-link" aria-label="YouTube">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M23.5 6.19a3.02 3.02 0 0 0-2.12-2.14C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.38.55A3.02 3.02 0 0 0 .5 6.19 31.6 31.6 0 0 0 0 12a31.6 31.6 0 0 0 .5 5.81 3.02 3.02 0 0 0 2.12 2.14c1.87.55 9.38.55 9.38.55s7.5 0 9.38-.55a3.02 3.02 0 0 0 2.12-2.14A31.6 31.6 0 0 0 24 12a31.6 31.6 0 0 0-.5-5.81zM9.54 15.57V8.43L15.82 12l-6.28 3.57z"/>
            </svg>
          </a>
          <a href="https://discord.gg/RDFC5eUtuA" target="_blank" rel="noopener noreferrer" className="landing-footer-social-link" aria-label="Discord">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20.32 4.37a19.8 19.8 0 0 0-4.93-1.52.07.07 0 0 0-.08.04c-.21.38-.45.87-.61 1.26a18.27 18.27 0 0 0-5.4 0 12.6 12.6 0 0 0-.62-1.26.08.08 0 0 0-.08-.04 19.74 19.74 0 0 0-4.93 1.52.07.07 0 0 0-.03.03C.53 9.05-.32 13.58.1 18.06a.08.08 0 0 0 .03.06 19.9 19.9 0 0 0 5.99 3.03.08.08 0 0 0 .08-.03c.46-.63.87-1.3 1.22-2a.08.08 0 0 0-.04-.1 13.1 13.1 0 0 1-1.87-.9.08.08 0 0 1 0-.12c.13-.09.25-.19.37-.29a.07.07 0 0 1 .08-.01c3.93 1.8 8.18 1.8 12.07 0a.07.07 0 0 1 .08 0c.12.1.25.2.37.3a.08.08 0 0 1 0 .11c-.6.35-1.22.65-1.87.9a.08.08 0 0 0-.04.11c.36.7.77 1.36 1.22 2a.08.08 0 0 0 .08.03 19.83 19.83 0 0 0 6-3.03.08.08 0 0 0 .03-.05c.5-5.18-.84-9.68-3.55-13.66a.06.06 0 0 0-.03-.03zM8.02 15.33c-1.18 0-2.16-1.08-2.16-2.42 0-1.33.96-2.42 2.16-2.42 1.21 0 2.18 1.1 2.16 2.42 0 1.34-.96 2.42-2.16 2.42zm7.97 0c-1.18 0-2.16-1.08-2.16-2.42 0-1.33.96-2.42 2.16-2.42 1.21 0 2.18 1.1 2.16 2.42 0 1.34-.95 2.42-2.16 2.42z"/>
            </svg>
          </a>
        </div>

        <div className="landing-footer-legal">
          <Link to="/timeline">Free Timeline Tool</Link>
          <span className="landing-footer-dot">·</span>
          <Link to="/privacy">Privacy</Link>
          <span className="landing-footer-dot">·</span>
          <Link to="/terms">Terms</Link>
          <span className="landing-footer-dot">·</span>
          <a href="mailto:titantrackapp@gmail.com">Contact</a>
        </div>

        <p className="landing-footer-copy">© 2026 TitanTrack</p>
        <p className="landing-footer-disclaimer">Not medical advice. Consult a professional for health concerns.</p>
      </footer>

      {/* Auth Modal */}
      {showAuthModal && (
        <AuthModal
          onClose={() => setShowAuthModal(false)}
          onLogin={handleLoginSuccess}
        />
      )}
    </div>
  );
};

export default Landing;
