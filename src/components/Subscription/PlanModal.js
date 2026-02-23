// src/components/Subscription/PlanModal.js
// Universal upgrade modal - triggered from ANY upgrade CTA across the app
// Uses shared BottomSheet.css pattern (pill, swipe, backdrop tap)
// Mobile: slide-up sheet · Desktop: centered floating card

import React, { useState, useEffect, useCallback, useRef } from 'react';
import './PlanModal.css';
import '../../styles/BottomSheet.css';
import useBodyScrollLock from '../../hooks/useBodyScrollLock';

const PlanModal = ({ 
  isOpen, 
  onClose, 
  onCheckout,
  subscriptionStatus 
}) => {
  const [selectedPlan, setSelectedPlan] = useState('yearly');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showContent, setShowContent] = useState(false);
  const [sheetReady, setSheetReady] = useState(false);

  const sheetPanelRef = useRef(null);
  const touchStartY = useRef(0);
  const touchDeltaY = useRef(0);
  const isDragging = useRef(false);

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

  // Swipe-to-dismiss on pill header
  const onTouchStart = useCallback((e) => {
    touchStartY.current = e.touches[0].clientY;
    touchDeltaY.current = 0;
    isDragging.current = false;
  }, []);

  const onTouchMove = useCallback((e) => {
    const delta = e.touches[0].clientY - touchStartY.current;
    if (delta < 0) return;
    if (delta > 10) {
      isDragging.current = true;
      touchDeltaY.current = delta;
      if (sheetPanelRef.current) {
        sheetPanelRef.current.style.transform = `translateY(${delta}px)`;
        sheetPanelRef.current.style.transition = 'none';
      }
    }
  }, []);

  const onTouchEnd = useCallback(() => {
    if (!isDragging.current) return;
    if (sheetPanelRef.current) {
      sheetPanelRef.current.style.transition = '';
      sheetPanelRef.current.style.transform = '';
    }
    if (touchDeltaY.current > 80) {
      handleClose();
    }
    isDragging.current = false;
  }, [handleClose]);

  if (!showContent) return null;

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
    <div className={`sheet-backdrop plan-backdrop${sheetReady ? ' open' : ''}`} onClick={handleClose}>
      <div 
        ref={sheetPanelRef}
        className={`sheet-panel plan-sheet${sheetReady ? ' open' : ''}`}
        onClick={e => e.stopPropagation()}
      >
        <div 
          className="sheet-header"
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        />

        <div className="plan-content">
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
