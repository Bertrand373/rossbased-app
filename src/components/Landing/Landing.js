// Landing.js - TITANTRACK MODERN MINIMAL
import React, { useState } from 'react';
import './Landing.css';
import AuthModal from '../Auth/AuthModal';
import trackerLogo from '../../assets/trackerapplogo-white.png';

const Landing = ({ onLogin }) => {
  const [showAuthModal, setShowAuthModal] = useState(false);

  const handleLoginSuccess = async (username, password) => {
    setShowAuthModal(false);
    return await onLogin(username, password);
  };

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
          Start Free Trial
        </button>
        
        <p className="landing-trial-note">7 days free. No credit card.</p>
        
        {/* Stats - meaningful to the practitioner */}
        <div className="landing-stats">
          <div className="landing-stat">
            <span className="landing-stat-value">On-device AI</span>
            <span className="landing-stat-label">Your patterns never leave your phone</span>
          </div>
          <div className="landing-stat-divider" />
          <div className="landing-stat">
            <span className="landing-stat-value">6 metrics</span>
            <span className="landing-stat-label">Track what retention actually changes</span>
          </div>
          <div className="landing-stat-divider" />
          <div className="landing-stat">
            <span className="landing-stat-value">Prediction</span>
            <span className="landing-stat-label">Know your risk before urges hit</span>
          </div>
        </div>
      </main>
      
      {/* Features - why this exists */}
      <section className="landing-features">
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
        <p>All data encrypted. ML runs on your device. We never see your patterns.</p>
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
