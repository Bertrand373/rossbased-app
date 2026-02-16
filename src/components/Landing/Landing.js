// Landing.js - TITANTRACK MODERN MINIMAL
import React, { useState, useEffect, useRef } from 'react';
import './Landing.css';
import AuthModal from '../Auth/AuthModal';
import trackerLogo from '../../assets/trackerapplogo-white.png';

const Landing = ({ onLogin }) => {
  const [showAuthModal, setShowAuthModal] = useState(false);
  const featuresRef = useRef(null);

  const handleLoginSuccess = async (username, password, isGoogleAuth) => {
    const result = await onLogin(username, password, isGoogleAuth);
    if (!result) setShowAuthModal(false);
    return result;
  };

  // Scroll-triggered stagger animation for features
  useEffect(() => {
    const section = featuresRef.current;
    if (!section) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          // Delay so page entrance animations finish first
          setTimeout(() => {
            section.classList.add('landing-features-visible');
          }, 400);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(section);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="landing">
      {/* Background subtle gradient */}
      <div className="landing-bg" />
      
      {/* Main content */}
      <main className="landing-main">
        {/* Logo */}
        <div className="landing-logo-container">
          <img 
            src={trackerLogo} 
            alt="TitanTrack" 
            className="landing-logo" 
          />
        </div>
        
        {/* Tagline */}
        <p className="landing-tagline">
          Not another streak counter.
        </p>
        
        {/* CTA */}
        <button 
          className="landing-cta"
          onClick={() => setShowAuthModal(true)}
        >
          Get Started
        </button>
        
        <p className="landing-trial-note">7 days free. No credit card.</p>
      </main>
      
      {/* Features - scroll-triggered stagger */}
      <section className="landing-features" ref={featuresRef}>
        <div className="landing-feature">
          <div className="landing-feature-number">01</div>
          <div className="landing-feature-content">
            <h3>Pattern recognition</h3>
            <p>The AI learns when you're vulnerable. Not from a dataset. From you.</p>
          </div>
        </div>
        
        <div className="landing-feature">
          <div className="landing-feature-number">02</div>
          <div className="landing-feature-content">
            <h3>Benefit tracking</h3>
            <p>Energy, focus, confidence, aura, sleep, workouts. See what's actually changing.</p>
          </div>
        </div>
        
        <div className="landing-feature">
          <div className="landing-feature-number">03</div>
          <div className="landing-feature-content">
            <h3>Crisis tools</h3>
            <p>Breathing protocols and intervention techniques for when it matters most.</p>
          </div>
        </div>
        
        <div className="landing-feature">
          <div className="landing-feature-number">04</div>
          <div className="landing-feature-content">
            <h3>Private by design</h3>
            <p>ML runs on your device. Your data is encrypted and never sold.</p>
          </div>
        </div>
      </section>
      
      {/* Pricing - transparent, minimal */}
      <section className="landing-pricing">
        <p className="landing-pricing-label">After your trial</p>
        <div className="landing-pricing-options">
          <span className="landing-pricing-option">$8/mo</span>
          <span className="landing-pricing-divider">or</span>
          <span className="landing-pricing-option">$62/yr <span className="landing-pricing-save">save 35%</span></span>
        </div>
        <p className="landing-pricing-cancel">Cancel anytime.</p>
      </section>
      
      {/* Footer */}
      <footer className="landing-footer">
        <p>All data encrypted. ML runs on your device. We never sell your data.</p>
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
