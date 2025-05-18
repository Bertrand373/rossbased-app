// components/Subscription/SubscriptionBanner.js
import React, { useState } from 'react';
import './SubscriptionBanner.css';

// Icons
import { FaCrown, FaChartLine, FaShieldAlt, FaUsers, FaQuoteLeft, FaTimes } from 'react-icons/fa';

const SubscriptionBanner = ({ fullPage = false }) => {
  const [showBanner, setShowBanner] = useState(true);
  const [showModal, setShowModal] = useState(false);
  
  if (!showBanner && !fullPage) return null;
  
  return (
    <>
      {!fullPage ? (
        <div className="subscription-banner">
          <div className="subscription-banner-content">
            <div className="banner-icon">
              <FaCrown />
            </div>
            <div className="banner-text">
              <p>Unlock all premium features for just $3.99/month</p>
            </div>
            <div className="banner-actions">
              <button 
                className="btn btn-light"
                onClick={() => setShowModal(true)}
              >
                Upgrade Now
              </button>
              <button 
                className="close-banner-btn"
                onClick={() => setShowBanner(false)}
              >
                <FaTimes />
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="subscription-page">
          <div className="subscription-header">
            <FaCrown className="crown-icon" />
            <h2>Upgrade to Premium</h2>
            <p>Take your semen retention journey to the next level</p>
          </div>
          
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">
                <FaChartLine />
              </div>
              <h3>Advanced Benefit Tracking</h3>
              <p>Track multiple benefits with detailed graphs, streak comparisons, and personalized insights</p>
            </div>
            
            <div className="feature-card">
              <div className="feature-icon">
                <FaShieldAlt />
              </div>
              <h3>Unlimited Urge Management</h3>
              <p>Access all urge management tools without limits, with personalized suggestions</p>
            </div>
            
            <div className="feature-card">
              <div className="feature-icon">
                <FaQuoteLeft />
              </div>
              <h3>Quote Archive & Sharing</h3>
              <p>Access past quotes, share to social media, and submit your own quotes</p>
            </div>
            
            <div className="feature-card">
              <div className="feature-icon">
                <FaUsers />
              </div>
              <h3>Exclusive Community</h3>
              <p>Join the premium community feed with exclusive challenges and leaderboard</p>
            </div>
          </div>
          
          <div className="subscription-pricing">
            <div className="pricing-header">
              <h3>Simple, Affordable Pricing</h3>
              <p>Less than the cost of a coffee per month</p>
            </div>
            
            <div className="pricing-options">
              <div className="pricing-card">
                <div className="pricing-title">Monthly</div>
                <div className="pricing-amount">$3.99</div>
                <div className="pricing-period">per month</div>
                <ul className="pricing-features">
                  <li>All premium features</li>
                  <li>Cancel anytime</li>
                  <li>Community access</li>
                  <li>Discord integration</li>
                </ul>
                <button className="btn btn-primary pricing-btn">
                  Choose Monthly
                </button>
              </div>
              
              <div className="pricing-card best-value">
                <div className="best-badge">Best Value</div>
                <div className="pricing-title">Annual</div>
                <div className="pricing-amount">$29.99</div>
                <div className="pricing-period">per year ($2.50/mo)</div>
                <ul className="pricing-features">
                  <li>All premium features</li>
                  <li>37% savings</li>
                  <li>Community access</li>
                  <li>Discord integration</li>
                </ul>
                <button className="btn btn-primary pricing-btn">
                  Choose Annual
                </button>
              </div>
            </div>
            
            <div className="guarantee">
              <p>7-day money-back guarantee. No questions asked.</p>
            </div>
          </div>
        </div>
      )}
      
      {/* Subscription Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content subscription-modal" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowModal(false)}>
              <FaTimes />
            </button>
            
            <h3>Choose Your Premium Plan</h3>
            
            <div className="subscription-options">
              <div className="subscription-option">
                <div className="option-header">
                  <h4>Monthly</h4>
                  <div className="option-price">$3.99</div>
                  <div className="option-period">per month</div>
                </div>
                <button className="btn btn-outline option-btn">
                  Select
                </button>
              </div>
              
              <div className="subscription-option recommended">
                <div className="recommended-badge">Best Value</div>
                <div className="option-header">
                  <h4>Annual</h4>
                  <div className="option-price">$29.99</div>
                  <div className="option-period">per year ($2.50/mo)</div>
                </div>
                <button className="btn btn-primary option-btn">
                  Select
                </button>
              </div>
            </div>
            
            <div className="premium-features-list">
              <h4>All Premium Plans Include:</h4>
              <ul>
                <li>Full benefit tracking with graphs</li>
                <li>Unlimited urge management tools</li>
                <li>Access to quote archive and sharing</li>
                <li>Exclusive community access</li>
                <li>Premium badges and achievements</li>
                <li>Discord leaderboard integration</li>
              </ul>
            </div>
            
            <div className="trial-note">
              <p>Try Premium free for 7 days. Cancel anytime.</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default SubscriptionBanner;