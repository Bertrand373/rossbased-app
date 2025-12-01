// Landing.js - TITANTRACK MODERN MINIMAL
import React, { useState } from 'react';
import './Landing.css';
import AuthModal from '../Auth/AuthModal';
import trackerLogo from '../../assets/trackerapplogo.png';

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
          Track your journey. Build discipline. Become unstoppable.
        </p>
        
        {/* CTA */}
        <button 
          className="landing-cta"
          onClick={() => setShowAuthModal(true)}
        >
          Get Started
        </button>
        
        {/* Subtle stats or social proof */}
        <div className="landing-stats">
          <div className="landing-stat">
            <span className="landing-stat-value">10K+</span>
            <span className="landing-stat-label">Active users</span>
          </div>
          <div className="landing-stat-divider" />
          <div className="landing-stat">
            <span className="landing-stat-value">500K+</span>
            <span className="landing-stat-label">Days tracked</span>
          </div>
          <div className="landing-stat-divider" />
          <div className="landing-stat">
            <span className="landing-stat-value">4.9</span>
            <span className="landing-stat-label">User rating</span>
          </div>
        </div>
      </main>
      
      {/* Features - minimal */}
      <section className="landing-features">
        <div className="landing-feature">
          <div className="landing-feature-number">01</div>
          <div className="landing-feature-content">
            <h3>Track</h3>
            <p>Monitor your streak with precision</p>
          </div>
        </div>
        
        <div className="landing-feature">
          <div className="landing-feature-number">02</div>
          <div className="landing-feature-content">
            <h3>Analyze</h3>
            <p>Understand your patterns and triggers</p>
          </div>
        </div>
        
        <div className="landing-feature">
          <div className="landing-feature-number">03</div>
          <div className="landing-feature-content">
            <h3>Overcome</h3>
            <p>Tools for when discipline is tested</p>
          </div>
        </div>
      </section>
      
      {/* Footer */}
      <footer className="landing-footer">
        <p>Your data stays private. Always.</p>
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