// components/Landing/Landing.js
import React, { useState } from 'react';
import './Landing.css';
import AuthModal from '../Auth/AuthModal';
import trackerLogo from '../../assets/trackerapplogo.png';

const Landing = ({ onLogin }) => {
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleLoginClick = () => {
    setShowAuthModal(true);
  };

  const handleLoginSuccess = () => {
    setShowAuthModal(false);
    setIsLoading(true);
    // Loading animation will show for 2 seconds before redirect
    setTimeout(() => {
      window.location.href = '/';
    }, 2000);
  };

  return (
    <div className="landing-container">
      {isLoading ? (
        <div className="loading-screen">
          <div className="loading-animation">
            <div className="loading-circle"></div>
            <p>Preparing your dashboard...</p>
          </div>
        </div>
      ) : (
        <div className="landing-content">
          <img src={trackerLogo} alt="Tracker App Logo" className="landing-logo" style={{ height: '80px', marginBottom: '20px' }} />
          <h1>SR Tracker</h1>
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
              onClick={handleLoginClick}
            >
              Login or Create Account
            </button>
          </div>
          
          <div className="privacy-notice">
            <p>Your data is kept private and secure. We never share your information.</p>
          </div>
        </div>
      )}
      
      {showAuthModal && (
        <AuthModal 
          onClose={() => setShowAuthModal(false)} 
          onLogin={(username, password) => {
            onLogin(username, password).then(success => {
              if (success) handleLoginSuccess();
            });
          }}
        />
      )}
    </div>
  );
};

export default Landing;