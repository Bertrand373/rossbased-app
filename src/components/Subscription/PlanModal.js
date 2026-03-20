// src/components/Subscription/PlanModal.js
// Universal upgrade modal - triggered from ANY upgrade CTA across the app
// Uses shared BottomSheet.css pattern (pill, swipe, backdrop tap)
// Mobile: slide-up sheet · Desktop: centered floating card

import React, { useState, useEffect, useCallback, useRef } from 'react';
import './PlanModal.css';
import '../../styles/BottomSheet.css';
import useBodyScrollLock from '../../hooks/useBodyScrollLock';
import useSheetSwipe from '../../hooks/useSheetSwipe';
import toast from 'react-hot-toast';

const PlanModal = ({ 
  isOpen, 
  onClose, 
  onCheckout,
  subscriptionStatus 
}) => {
  const [selectedPlan, setSelectedPlan] = useState('yearly');
  const [selectedTier, setSelectedTier] = useState('practitioner');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showContent, setShowContent] = useState(false);
  const [sheetReady, setSheetReady] = useState(false);

  const sheetPanelRef = useRef(null);

  // Mount/unmount + animation
  useEffect(() => {
    if (isOpen) {
      setShowContent(true);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setSheetReady(true));
      });
    } else {
      setSheetReady(false);
      const timer = setTimeout(() => setShowContent(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Lock body scroll
  useBodyScrollLock(showContent);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedPlan('yearly');
      setSelectedTier('practitioner');
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

  // Animated close
  const closeSheet = useCallback((cb) => {
    setSheetReady(false);
    setTimeout(cb, 300);
  }, []);

  const handleClose = useCallback(() => closeSheet(onClose), [closeSheet, onClose]);

  // Swipe-to-dismiss — non-passive native listeners so iOS respects preventDefault
  useSheetSwipe(sheetPanelRef, showContent, () => closeSheet(onClose));

  if (!showContent) return null;

  const reason = subscriptionStatus?.reason || 'no_subscription';
  const isNewUser = reason === 'no_subscription';
  const isGfUser = subscriptionStatus?.reason === 'grandfathered' || !!subscriptionStatus?.subscription?.grandfatheredAt;

  const handleCheckout = async () => {
    setIsProcessing(true);
    try {
      await onCheckout(selectedPlan, selectedTier);
      // Stripe redirect will happen — safety timeout
      setTimeout(() => setIsProcessing(false), 10000);
    } catch (err) {
      setIsProcessing(false);
      if (err.message) toast.error(err.message, { duration: 4000 });
    }
  };

  // Pricing config per tier
  const pricing = selectedTier === 'ascended' 
    ? { monthly: 17, yearly: 170, monthlyEquiv: '14.17', save: '17%', oracleLimit: 9 }
    : { monthly: 8, yearly: 62, monthlyEquiv: '5.17', save: '35%', oracleLimit: 3 };

  return (
    <div className={`sheet-backdrop plan-backdrop${sheetReady ? ' open' : ''}`} onClick={handleClose}>
      <div 
        ref={sheetPanelRef}
        className={`sheet-panel plan-sheet${sheetReady ? ' open' : ''}`}
        onClick={e => e.stopPropagation()}
      >
        <div 
          className="sheet-header"
        />

        <div className="plan-content">
          {/* Header */}
          <div className="plan-header">
            <img src="/tt-icon-white.png" alt="" className="plan-icon" />
            <h2 className="plan-title">{isGfUser ? 'Unlock Deeper Oracle Access' : selectedTier === 'ascended' ? 'Go Deeper' : 'Upgrade to Premium'}</h2>
            <p className="plan-subtitle">{isGfUser ? `${pricing.oracleLimit} Oracle messages per day` : selectedTier === 'ascended' ? '9 Oracle messages per day' : 'Unlock the full system'}</p>
          </div>

          {/* Tier toggle */}
          <div className="plan-tier-toggle">
            <button 
              className={`plan-tier-btn ${selectedTier === 'practitioner' ? 'active' : ''}`}
              onClick={() => setSelectedTier('practitioner')}
            >
              Practitioner
            </button>
            <button 
              className={`plan-tier-btn plan-tier-ascended ${selectedTier === 'ascended' ? 'active' : ''}`}
              onClick={() => setSelectedTier('ascended')}
            >
              Ascended
            </button>
          </div>

          {/* What you get */}
          <div className="plan-features">
            <div className="plan-feature">AI pattern recognition that learns you</div>
            <div className="plan-feature">Full benefit analytics and trend charts</div>
            <div className="plan-feature">Personalized relapse prediction</div>
            <div className="plan-feature">{pricing.oracleLimit} daily Oracle messages</div>
            <div className="plan-feature">Subliminal mind program</div>
          </div>

          {/* Plan cards */}
          <div className="plan-cards">
            <button 
              className={`plan-card ${selectedPlan === 'monthly' ? 'selected' : ''}`}
              onClick={() => setSelectedPlan('monthly')}
            >
              <span className="plan-card-label">Monthly</span>
              <span className="plan-card-price">${pricing.monthly}<span className="plan-card-period">/mo</span></span>
            </button>
            
            <button 
              className={`plan-card ${selectedPlan === 'yearly' ? 'selected' : ''}`}
              onClick={() => setSelectedPlan('yearly')}
            >
              <span className="plan-card-badge">Save {pricing.save}</span>
              <span className="plan-card-label">Annual</span>
              <span className="plan-card-price">${pricing.yearly}<span className="plan-card-period">/yr</span></span>
              <span className="plan-card-monthly">${pricing.monthlyEquiv}/mo</span>
            </button>
          </div>

          {/* CTA */}
          <button 
            className="plan-cta"
            onClick={handleCheckout}
            disabled={isProcessing}
          >
            {isProcessing ? 'Processing...' : 
              isNewUser && selectedTier !== 'ascended' && !isGfUser
                ? 'Start 7-Day Free Trial' 
                : `Continue — $${selectedPlan === 'yearly' ? pricing.yearly + '/yr' : pricing.monthly + '/mo'}`
            }
          </button>

          {/* Legal */}
          <p className="plan-legal">
            {isNewUser && selectedTier !== 'ascended' && !isGfUser
              ? 'Card required. Not charged until trial ends. Cancel anytime.'
              : 'Cancel anytime. Secure payment via Stripe.'
            }
          </p>

          {/* Ghost dismiss */}
          <button className="plan-dismiss" onClick={handleClose}>
            Not now
          </button>
        </div>
      </div>
    </div>
  );
};

export default PlanModal;
