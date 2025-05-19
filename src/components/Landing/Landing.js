// components/Landing/Landing.js
import React, { useState } from 'react';
import './Landing.css';
import AuthModal from '../Auth/AuthModal';

const Landing = ({ onLogin }) => {
  const [showAuthModal, setShowAuthModal] = useState(false);

  return (
    <div className="landing-container">
      <div className="landing-content">
        <h1>Welcome to SR Tracker</h1>
        <p className="landing-subtitle">Track your streak, manage urges, and unlock your potential</p>
        
        <div className="landing-features">
          <div className="feature-item">
            <div className="feature-icon">📈</div>
            <h3>Track Your Progress</h3>
            <p>Monitor your streak, log events, and visualize your journey</p>
          </div>
          
          <div className="feature-item">
            <div className="feature-icon">🛡️</div>
            <h3>Manage Urges</h3>
            <p>Access tools and techniques to overcome challenging moments</p>
          </div>
          
          <div className="feature-item">
            <div className="feature-icon">📊</div>
            <h3>Track Benefits</h3>
            <p>Record and visualize the benefits you experience over time</p>
          </div>
        </div>
        
        <div className="landing-cta">
          <button 
            className="btn btn-primary login-cta-btn"
            onClick={() => setShowAuthModal(true)}
          >
            Login or Create Account
          </button>
        </div>
        
        <div className="privacy-notice">
          <p>Your data is kept private and secure. We never share your information.</p>
        </div>
      </div>
      
      {showAuthModal && (
        <AuthModal 
          onClose={() => setShowAuthModal(false)} 
          onLogin={onLogin}
        />
      )}
    </div>
  );
};

export default Landing;