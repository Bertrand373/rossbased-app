// src/components/Subscription/PlanModal.js
// Universal upgrade modal - triggered from ANY upgrade CTA across the app
// Replaces direct createCheckout calls with plan selection first
// Matches TitanTrack premium aesthetic

import React, { useState, useEffect } from 'react';
import './PlanModal.css';

const PlanModal = ({ 
  isOpen, 
  onClose, 
  onCheckout,
  subscriptionStatus 
}) => {
  const [selectedPlan, setSelectedPlan] = useState('yearly');
  const [isProcessing, setIsProcessing] = useState(false);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedPlan('yearly');
      setIsProcessing(false);
    }
  }, [isOpen]);

  // Reset processing if user comes back from Stripe
  useEffect(() => {
    if (!isOpen) return;
    
    const reset = () => setIsProcessing(false);
    
    window.addEventListener('focus', reset);
    
    const onPageShow = (e) => { if (e.persisted) reset(); };
    window.addEventListener('pageshow', onPageShow);
    
    const onVisibility = () => {
      if (document.visibilityState === 'visible') reset();
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      window.removeEventListener('focus', reset);
      window.removeEventListener('pageshow', onPageShow);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [isOpen]);

  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.classList.add('modal-open');
    } else {
      document.body.classList.remove('modal-open');
    }
    return () => document.body.classList.remove('modal-open');
  }, [isOpen]);

  if (!isOpen) return null;

  const reason = subscriptionStatus?.reason || 'no_subscription';
  const isNewUser = reason === 'no_subscription';

  const handleCheckout = async () => {
    setIsProcessing(true);
    try {
      await onCheckout(selectedPlan);
      // Stripe redirect will happen — safety timeout
      setTimeout(() => setIsProcessing(false), 10000);
    } catch (err) {
      setIsProcessing(false);
    }
  };

  return (
    <div className="plan-overlay" onClick={onClose}>
      <div className="plan-modal" onClick={e => e.stopPropagation()}>
        
        {/* Close button */}
        <button className="plan-close" onClick={onClose} aria-label="Close">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        {/* Header */}
        <div className="plan-header">
          <img src="/tt-icon-white.png" alt="" className="plan-icon" />
          <h2 className="plan-title">Upgrade to Premium</h2>
          <p className="plan-subtitle">Unlock the full system</p>
        </div>

        {/* What you get */}
        <div className="plan-features">
          <div className="plan-feature">AI pattern recognition that learns you</div>
          <div className="plan-feature">Full benefit analytics and trend charts</div>
          <div className="plan-feature">Personalized relapse prediction</div>
          <div className="plan-feature">25 daily Oracle messages</div>
          <div className="plan-feature">Subliminal mind program</div>
        </div>

        {/* Plan cards */}
        <div className="plan-cards">
          <button 
            className={`plan-card ${selectedPlan === 'monthly' ? 'selected' : ''}`}
            onClick={() => setSelectedPlan('monthly')}
          >
            <span className="plan-card-label">Monthly</span>
            <span className="plan-card-price">$8<span className="plan-card-period">/mo</span></span>
          </button>
          
          <button 
            className={`plan-card ${selectedPlan === 'yearly' ? 'selected' : ''}`}
            onClick={() => setSelectedPlan('yearly')}
          >
            <span className="plan-card-badge">Save 35%</span>
            <span className="plan-card-label">Annual</span>
            <span className="plan-card-price">$62<span className="plan-card-period">/yr</span></span>
            <span className="plan-card-monthly">$5.17/mo</span>
          </button>
        </div>

        {/* CTA */}
        <button 
          className="plan-cta"
          onClick={handleCheckout}
          disabled={isProcessing}
        >
          {isProcessing ? 'Processing...' : 
            isNewUser 
              ? 'Start 7-Day Free Trial' 
              : `Continue — $${selectedPlan === 'yearly' ? '62/yr' : '8/mo'}`
          }
        </button>

        {/* Legal */}
        <p className="plan-legal">
          {isNewUser 
            ? 'Card required. Not charged until trial ends. Cancel anytime.'
            : 'Cancel anytime. Secure payment via Stripe.'
          }
        </p>
      </div>
    </div>
  );
};

export default PlanModal;
