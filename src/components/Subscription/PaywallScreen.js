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
  const [selectedTier, setSelectedTier] = useState('practitioner');
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
      await onCheckout(selectedPlan, selectedTier);
      // Safety net: if redirect somehow didn't happen, reset after 10s
      setTimeout(() => setIsProcessing(false), 10000);
    } catch (err) {
      // Checkout failed before redirect (network error, etc.)
      setIsProcessing(false);
    }
  };

  // Pricing config per tier
  const pricing = selectedTier === 'ascended' 
    ? { monthly: 17, yearly: 170, monthlyEquiv: '14.17', save: '17%', oracleLimit: 9 }
    : { monthly: 8, yearly: 62, monthlyEquiv: '5.17', save: '35%', oracleLimit: 3 };

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
          <div className="paywall-feature">Full analytics, phase insights, and {pricing.oracleLimit} daily Oracle messages</div>
        </div>

        {/* Tier toggle */}
        <div className="paywall-tier-toggle">
          <button 
            className={`paywall-tier-btn ${selectedTier === 'practitioner' ? 'active' : ''}`}
            onClick={() => setSelectedTier('practitioner')}
          >
            Practitioner
          </button>
          <button 
            className={`paywall-tier-btn paywall-tier-ascended ${selectedTier === 'ascended' ? 'active' : ''}`}
            onClick={() => setSelectedTier('ascended')}
          >
            Ascended
          </button>
        </div>
        
        {/* Plan selector */}
        <div className="paywall-plans">
          <button 
            className={`paywall-plan ${selectedPlan === 'monthly' ? 'selected' : ''}`}
            onClick={() => setSelectedPlan('monthly')}
          >
            <span className="plan-label">Monthly</span>
            <span className="plan-price">${pricing.monthly}<span className="plan-period">/mo</span></span>
          </button>
          
          <button 
            className={`paywall-plan featured ${selectedPlan === 'yearly' ? 'selected' : ''}`}
            onClick={() => setSelectedPlan('yearly')}
          >
            <span className="plan-badge">Save {pricing.save}</span>
            <span className="plan-label">Annual</span>
            <span className="plan-price">${pricing.yearly}<span className="plan-period">/yr</span></span>
            <span className="plan-monthly">${pricing.monthlyEquiv}/mo</span>
          </button>
        </div>
        
        {/* CTA */}
        <button 
          className="paywall-cta"
          onClick={handleCheckout}
          disabled={isProcessing}
        >
          {isProcessing ? 'Processing...' : 
            `Upgrade — $${selectedPlan === 'yearly' ? pricing.yearly + '/yr' : pricing.monthly + '/mo'}`
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
