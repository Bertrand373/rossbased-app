// src/components/Subscription/PaywallScreen.js
// Full-screen paywall - shown when user has no active subscription
// Premium, minimal design matching TitanTrack aesthetic

import React, { useState } from 'react';
import './PaywallScreen.css';

const PaywallScreen = ({ 
  userData, 
  subscriptionStatus,
  onCheckout,
  onLinkDiscord 
}) => {
  const [selectedPlan, setSelectedPlan] = useState('monthly');
  const [isProcessing, setIsProcessing] = useState(false);
  
  const streakCount = userData?.currentStreak || 0;
  const hasDiscord = !!userData?.discordId;
  const reason = subscriptionStatus?.reason || 'no_subscription';
  
  // Determine headline based on context
  const getHeadline = () => {
    if (reason === 'trial_expired') {
      return streakCount > 0 
        ? `${streakCount} days built.` 
        : 'Your trial has ended.';
    }
    if (reason === 'subscription_ended' || reason === 'expired') {
      return 'Welcome back.';
    }
    return 'Unlock TitanTrack.';
  };
  
  const getSubheadline = () => {
    if (reason === 'trial_expired' && streakCount > 0) {
      return "Don't lose momentum.";
    }
    if (reason === 'trial_expired') {
      return 'Continue your journey.';
    }
    return 'Everything you need to master retention.';
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
          <img src="/icon-192.png" alt="" className="paywall-icon" />
        </div>
        
        {/* Headline */}
        <h1 className="paywall-headline">{getHeadline()}</h1>
        <p className="paywall-subheadline">{getSubheadline()}</p>
        
        {/* Feature list - brief, not salesy */}
        <div className="paywall-features">
          <div className="paywall-feature">AI-powered relapse prediction</div>
          <div className="paywall-feature">6-metric benefit analytics</div>
          <div className="paywall-feature">Based30 Mind Program</div>
          <div className="paywall-feature">The Oracle AI guide</div>
          <div className="paywall-feature">Crisis intervention toolkit</div>
          <div className="paywall-feature">Emotional timeline tracking</div>
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
        
        {/* CTA - Trial auto-starts on signup, so paywall only shows post-trial */}
        <button 
          className="paywall-cta"
          onClick={handleCheckout}
          disabled={isProcessing}
        >
          {isProcessing ? 'Processing...' : `Subscribe — $${selectedPlan === 'yearly' ? '62/yr' : '8/mo'}`}
        </button>
        
        {/* Discord grandfather prompt */}
        {!hasDiscord && (
          <div className="paywall-discord">
            <p>Were you in our Discord before Feb 17?</p>
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
      </div>
    </div>
  );
};

export default PaywallScreen;
