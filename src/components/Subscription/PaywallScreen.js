// src/components/Subscription/PaywallScreen.js
// Full-screen paywall - shown when user has no active subscription
// Premium, minimal design matching TitanTrack aesthetic

import React, { useState, useEffect } from 'react';
import './PaywallScreen.css';

const PaywallScreen = ({ 
  userData, 
  subscriptionStatus,
  onCheckout,
  onLinkDiscord 
}) => {
  const [selectedPlan, setSelectedPlan] = useState('yearly');
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Reset processing state if user navigates back from Stripe
  useEffect(() => {
    const handleFocus = () => setIsProcessing(false);
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, []);
  
  const streakCount = userData?.currentStreak || 0;
  const longestStreak = userData?.longestStreak || 0;
  const hasDiscord = !!userData?.discordId;
  const reason = subscriptionStatus?.reason || 'no_subscription';
  
  // Determine headline based on context
  const getHeadline = () => {
    if (reason === 'trial_expired' && streakCount > 0) {
      return `Day ${streakCount}.`;
    }
    if (reason === 'trial_expired' && longestStreak > 0) {
      return 'Your patterns are still here.';
    }
    if (reason === 'trial_expired') {
      return 'Seven days in.';
    }
    if (reason === 'subscription_ended' || reason === 'expired') {
      return 'Nothing was lost.';
    }
    return 'Unlock TitanTrack.';
  };
  
  const getSubheadline = () => {
    if (reason === 'trial_expired' && streakCount > 0) {
      return 'Your streak is yours. Your data lives here.';
    }
    if (reason === 'trial_expired' && longestStreak > 0) {
      return 'Every check-in, every pattern, every prediction. Waiting.';
    }
    if (reason === 'trial_expired') {
      return 'Now you know what this is. Decide.';
    }
    if (reason === 'subscription_ended' || reason === 'expired') {
      return 'Your history, your patterns, your progress. All here.';
    }
    return 'Track the work. See the change.';
  };

  const handleCheckout = async () => {
    setIsProcessing(true);
    try {
      await onCheckout(selectedPlan);
    } finally {
      // Don't set false - page will redirect to Stripe
    }
  };

  return (
    <div className="paywall">
      <div className="paywall-content">
        
        {/* Logo */}
        <div className="paywall-logo">
          <img src="/tt-icon-white.png" alt="" className="paywall-icon" />
        </div>
        
        {/* Headline */}
        <h1 className="paywall-headline">{getHeadline()}</h1>
        <p className="paywall-subheadline">{getSubheadline()}</p>
        
        {/* Outcomes, not features */}
        <div className="paywall-features">
          <div className="paywall-feature">Know your risk before urges hit</div>
          <div className="paywall-feature">See what retention is actually changing in you</div>
          <div className="paywall-feature">Rewire your mind in 30 days</div>
          <div className="paywall-feature">AI that learns your patterns, not someone else's</div>
          <div className="paywall-feature">Break the cycle when it matters most</div>
        </div>
        
        {/* Plan selector */}
        <div className="paywall-plans">
          <button 
            className={`paywall-plan ${selectedPlan === 'monthly' ? 'selected' : ''}`}
            onClick={() => setSelectedPlan('monthly')}
          >
            <span className="plan-label">Monthly</span>
            <span className="plan-price">$8<span className="plan-period">/mo</span></span>
          </button>
          
          <button 
            className={`paywall-plan ${selectedPlan === 'yearly' ? 'selected' : ''}`}
            onClick={() => setSelectedPlan('yearly')}
          >
            <span className="plan-badge">Save 35%</span>
            <span className="plan-label">Annual</span>
            <span className="plan-price">$62<span className="plan-period">/yr</span></span>
            <span className="plan-monthly">$5.17/mo</span>
          </button>
        </div>
        
        {/* CTA */}
        <button 
          className="paywall-cta"
          onClick={handleCheckout}
          disabled={isProcessing}
        >
          {isProcessing ? 'Processing...' : `Continue — $${selectedPlan === 'yearly' ? '62/yr' : '8/mo'}`}
        </button>
        
        {/* Discord grandfather prompt */}
        {!hasDiscord && (
          <div className="paywall-discord">
            <p>Were you in our Discord before Feb 17, 2026?</p>
            <button 
              className="paywall-discord-link"
              onClick={onLinkDiscord}
            >
              Link Discord for lifetime access
            </button>
          </div>
        )}
        
        {/* Legal */}
        <p className="paywall-legal">
          Cancel anytime. Secure payment via Stripe.
        </p>
        
        <button className="paywall-signout" onClick={() => {
          localStorage.clear();
          window.location.href = '/';
        }}>
          Sign Out
        </button>
      </div>
    </div>
  );
};

export default PaywallScreen;
