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
    const reset = () => setIsProcessing(false);
    
    // Window regains focus (tab switch back)
    window.addEventListener('focus', reset);
    
    // Page restored from bfcache (browser back button)
    const onPageShow = (e) => { if (e.persisted) reset(); };
    window.addEventListener('pageshow', onPageShow);
    
    // Tab becomes visible again (mobile PWA, app switch)
    const onVisibility = () => {
      if (document.visibilityState === 'visible') reset();
    };
    document.addEventListener('visibilitychange', onVisibility);
    
    // Stripe cancel redirect lands with ?checkout=canceled
    const params = new URLSearchParams(window.location.search);
    if (params.get('checkout') === 'canceled') {
      reset();
    }

    return () => {
      window.removeEventListener('focus', reset);
      window.removeEventListener('pageshow', onPageShow);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);
  
  const streakCount = userData?.currentStreak || 0;
  const longestStreak = userData?.longestStreak || 0;
  const hasDiscord = !!userData?.discordId;
  const reason = subscriptionStatus?.reason || 'no_subscription';
  
  // Determine headline based on context
  const getHeadline = () => {
    if ((reason === 'subscription_ended' || reason === 'expired') && streakCount > 0) {
      return `Day ${streakCount}.`;
    }
    if (reason === 'subscription_ended' || reason === 'expired') {
      return 'Nothing was lost.';
    }
    if (streakCount > 30) {
      return `Day ${streakCount}. You're ready.`;
    }
    return 'Upgrade to Premium.';
  };
  
  const getSubheadline = () => {
    if (reason === 'subscription_ended' || reason === 'expired') {
      return 'Your history, your patterns, your progress. All here.';
    }
    if (streakCount > 30) {
      return 'Your free logging window ended. Premium keeps the data flowing.';
    }
    return 'Your streak runs free. Premium unlocks the full picture.';
  };

  const handleCheckout = async () => {
    setIsProcessing(true);
    try {
      await onCheckout(selectedPlan);
      // Safety net: if redirect somehow didn't happen, reset after 10s
      setTimeout(() => setIsProcessing(false), 10000);
    } catch (err) {
      // Checkout failed before redirect (network error, etc.)
      setIsProcessing(false);
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
        
        {/* What Premium unlocks */}
        <div className="paywall-features">
          <div className="paywall-feature">Unlimited benefit logging — track every day, not just 30</div>
          <div className="paywall-feature">ML predictions that learn your patterns and warn before urges</div>
          <div className="paywall-feature">Full analytics, phase insights, and unlimited Oracle access</div>
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
            className={`paywall-plan featured ${selectedPlan === 'yearly' ? 'selected' : ''}`}
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
          {isProcessing ? 'Processing...' : 
            `Upgrade — $${selectedPlan === 'yearly' ? '62/yr' : '8/mo'}`
          }
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
