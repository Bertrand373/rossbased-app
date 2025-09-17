// components/Landing/Landing.js - Updated with SpartanLoader and fixed loading flow
import React, { useState } from 'react';
import { FaChartLine, FaShieldAlt, FaChartBar } from 'react-icons/fa';
import './Landing.css';
import AuthModal from '../Auth/AuthModal';
import SpartanLoader from '../Shared/SpartanLoader';
import trackerLogo from '../../assets/trackerapplogo.png';

const Landing = ({ onLogin }) => {
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleLoginClick = () => {
    setShowAuthModal(true);
  };

  // FIXED: Handle login success properly - let the main app handle loading
  const handleLoginSuccess = async (username, password) => {
    setShowAuthModal(false);
    // The main app will handle the loading state now
    return await onLogin(username, password);
  };

  return (
    <div className="landing-container">
      {isLoading ? (
        <div className="loading-screen">
          <SpartanLoader 
            size={100}
            message="Preparing your dashboard..."
            showMessage={true}
            animationType="warrior"
          />
        </div>
      ) : (
        <div className="landing-content">
          <img src={trackerLogo} alt="Tracker App Logo" className="landing-logo" />
          <p className="landing-subtitle">Track your streak, manage urges, and unlock your potential</p>
          
          <div className="landing-features">
            <div className="feature-item">
              <div className="feature-icon">
                <FaChartLine size={40} />
              </div>
              <h3>Track Progress</h3>
              <p>Monitor streaks and visualize your journey</p>
            </div>
            
            <div className="feature-item">
              <div className="feature-icon">
                <FaShieldAlt size={40} />
              </div>
              <h3>Manage Urges</h3>
              <p>Access tools for challenging moments</p>
            </div>
            
            <div className="feature-item">
              <div className="feature-icon">
                <FaChartBar size={40} />
              </div>
              <h3>Track Benefits</h3>
              <p>Record benefits you experience over time</p>
            </div>
          </div>
          
          <div className="landing-cta">
            <button 
              className="login-cta-btn"
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
          onLogin={handleLoginSuccess}
        />
      )}
    </div>
  );
};

export default Landing;