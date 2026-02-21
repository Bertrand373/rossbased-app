// Landing.js - TITANTRACK ELITE CONVERSION PAGE
import React, { useState, useEffect, useRef } from 'react';
import './Landing.css';
import AuthModal from '../Auth/AuthModal';
import trackerLogo from '../../assets/trackerapplogo-white.png';

const Landing = ({ onLogin }) => {
  const [showAuthModal, setShowAuthModal] = useState(false);
  const featuresRef = useRef(null);
  const problemRef = useRef(null);
  const testimonialRef = useRef(null);
  const journeyRef = useRef(null);
  const pricingRef = useRef(null);

  const handleLoginSuccess = async (username, password, isGoogleAuth) => {
    const result = await onLogin(username, password, isGoogleAuth);
    if (!result) setShowAuthModal(false);
    return result;
  };

  const openAuth = () => setShowAuthModal(true);

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

    [featuresRef, problemRef, testimonialRef, journeyRef, pricingRef].forEach(ref => {
      if (ref.current) observer.observe(ref.current);
    });

    return () => observer.disconnect();
  }, []);

  return (
    <div className="landing">
      <div className="landing-bg" />

      {/* ============================================================
          HERO — Logo, headline, video, CTA
          ============================================================ */}
      <section className="landing-hero">
        <div className="landing-logo-container">
          <img src={trackerLogo} alt="TitanTrack" className="landing-logo" />
        </div>

        <h1 className="landing-headline">
          Your patterns are predictable.<br />
          <span className="landing-headline-accent">Now they work for you.</span>
        </h1>

        <p className="landing-sub">
          The AI-powered retention tracker that learns your vulnerabilities
          and intervenes before you relapse.
        </p>

        {/* Demo video */}
        <div className="landing-video-wrap">
          <video
            autoPlay
            muted
            loop
            playsInline
            className="landing-video"
          >
            <source src="/videos/demo.mp4" type="video/mp4" />
          </video>
        </div>

        <button className="landing-cta" onClick={openAuth}>
          Start Free Trial
        </button>
        <p className="landing-trial-note">7 days free · $8/mo after · Cancel anytime</p>
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
          TESTIMONIAL
          ============================================================ */}
      <section className="landing-testimonial" ref={testimonialRef}>
        <blockquote className="landing-quote">
          "Your app has potential to be one of the best quitting apps. Already it's amazing.
          It's great to not only track days and have access to overall progress within
          your being. A habit-share style app specifically for this is monumental."
        </blockquote>
        <p className="landing-quote-attr">— Community member, daily user since launch</p>
      </section>

      {/* ============================================================
          JOURNEY — How the AI learns
          ============================================================ */}
      <section className="landing-journey" ref={journeyRef}>
        <p className="landing-section-label">How it works</p>

        <div className="landing-journey-steps">
          <div className="landing-step">
            <span className="landing-step-time">Week 1</span>
            <h3 className="landing-step-title">Track</h3>
            <p className="landing-step-desc">
              Log daily. The system observes your energy, focus, habits, and emotional state.
            </p>
          </div>

          <div className="landing-step-line" />

          <div className="landing-step">
            <span className="landing-step-time">Week 2–3</span>
            <h3 className="landing-step-title">Learn</h3>
            <p className="landing-step-desc">
              The neural network silently trains on your patterns.
              It identifies your danger zones, your vulnerable hours, your triggers.
            </p>
          </div>

          <div className="landing-step-line" />

          <div className="landing-step">
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
          Start Free Trial
        </button>
        <p className="landing-trial-note">7 days free · Cancel anytime · No commitment</p>
      </section>

      {/* ============================================================
          FOOTER
          ============================================================ */}
      <footer className="landing-footer">
        <p>All data encrypted · ML runs on-device · We never sell your data</p>
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
