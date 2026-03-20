// OnboardingGuide.js - TITANTRACK
// Premium onboarding — spotlight + floating tooltip
// 4 steps: streak counter → log button → crisis toolkit → explore nav

import React, { useState, useEffect, useCallback, useRef } from 'react';
import './OnboardingGuide.css';

const OnboardingGuide = ({ onComplete }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(true);
  const [targetRect, setTargetRect] = useState(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [tooltipVisible, setTooltipVisible] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  // Key increments on each step change to force CSS animation re-trigger
  const [animKey, setAnimKey] = useState(0);
  const retryRef = useRef(null);

  // Lock body scroll while onboarding is active
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    document.body.style.touchAction = 'none';
    return () => {
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
    };
  }, []);

  // Check for mobile on resize
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Escape key to skip
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape') handleComplete();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Define the 4 onboarding steps
  const steps = [
    {
      target: '.streak-num',
      title: 'Set your start date',
      message: 'Tap the counter to set when your journey began.',
      position: 'bottom',
      padding: 20,
      square: true,
      radius: '20px'
    },
    {
      target: '.benefits-trigger',
      title: 'Track daily benefits',
      message: 'Log how you feel each day. This powers your AI insights.',
      position: 'top',
      padding: 8,
      radius: '9999px'
    },
    {
      target: isMobile 
        ? '.mobile-nav-oracle' 
        : '.nav-link-oracle',
      title: 'Meet The Oracle',
      message: 'Your AI guide. Trained on retention science and built to know your patterns.',
      position: isMobile ? 'top' : 'bottom',
      padding: 10,
      radius: '50%'
    },
    {
      target: isMobile ? '.mobile-nav' : '.header-nav',
      title: 'Explore when ready',
      message: 'Calendar, stats, and crisis tools — all one tap away.',
      position: isMobile ? 'top' : 'bottom',
      padding: 4,
      radius: '0px'
    }
  ];

  // Find and measure the target element — with retry logic
  const updateTargetPosition = useCallback(() => {
    // Clear any pending retry
    if (retryRef.current) {
      clearTimeout(retryRef.current);
      retryRef.current = null;
    }

    const step = steps[currentStep];
    if (!step) return;

    const element = document.querySelector(step.target);

    if (element) {
      const rect = element.getBoundingClientRect();
      setTargetRect({
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
        bottom: rect.bottom,
        right: rect.right,
        centerX: rect.left + rect.width / 2,
        centerY: rect.top + rect.height / 2
      });
    } else {
      // Element not found — retry up to 5 times at increasing intervals
      // This handles race conditions where DOM isn't painted yet
      setTargetRect(null);
      let attempts = 0;
      const retry = () => {
        attempts++;
        const el = document.querySelector(step.target);
        if (el) {
          const r = el.getBoundingClientRect();
          setTargetRect({
            top: r.top,
            left: r.left,
            width: r.width,
            height: r.height,
            bottom: r.bottom,
            right: r.right,
            centerX: r.left + r.width / 2,
            centerY: r.top + r.height / 2
          });
        } else if (attempts < 5) {
          retryRef.current = setTimeout(retry, attempts * 150);
        }
        // After 5 attempts, tooltip will center on screen (graceful fallback)
      };
      retryRef.current = setTimeout(retry, 100);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep, isMobile]);

  // Update position on mount, step change, resize, scroll
  useEffect(() => {
    const timer = setTimeout(updateTargetPosition, 50);
    
    window.addEventListener('resize', updateTargetPosition);
    window.addEventListener('scroll', updateTargetPosition);
    
    return () => {
      clearTimeout(timer);
      if (retryRef.current) clearTimeout(retryRef.current);
      window.removeEventListener('resize', updateTargetPosition);
      window.removeEventListener('scroll', updateTargetPosition);
    };
  }, [updateTargetPosition, currentStep]);

  // Smooth transition to next step
  const transitionToStep = (nextStep) => {
    setIsTransitioning(true);
    setTooltipVisible(false);
    
    setTimeout(() => {
      setCurrentStep(nextStep);
      setAnimKey(k => k + 1); // Force animation re-trigger
    }, 200);
    
    setTimeout(() => {
      setTooltipVisible(true);
      setIsTransitioning(false);
    }, 550);
  };

  // Handle next step or complete
  const handleNext = () => {
    if (isTransitioning) return;
    
    if (currentStep < steps.length - 1) {
      transitionToStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  // Handle skip/complete
  const handleComplete = () => {
    setTooltipVisible(false);
    setIsVisible(false);
    setTimeout(() => {
      onComplete();
    }, 300);
  };

  if (!isVisible) return null;

  const step = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;
  const padding = step.padding || 8;

  // Tooltip position — follows target, stays on screen
  const getTooltipStyle = () => {
    if (!targetRect) {
      return {
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)'
      };
    }

    const tooltipOffset = 16;
    const tooltipWidth = 300;
    const screenPadding = 20;
    
    // Horizontal: follow target center, clamped to screen
    let leftPos = targetRect.centerX;
    const minLeft = screenPadding + (tooltipWidth / 2);
    const maxLeft = window.innerWidth - screenPadding - (tooltipWidth / 2);
    leftPos = Math.max(minLeft, Math.min(maxLeft, leftPos));

    if (step.position === 'bottom') {
      return {
        top: `${targetRect.bottom + padding + tooltipOffset}px`,
        left: `${leftPos}px`,
        transform: 'translateX(-50%)'
      };
    } else {
      return {
        bottom: `${window.innerHeight - targetRect.top + padding + tooltipOffset}px`,
        left: `${leftPos}px`,
        transform: 'translateX(-50%)'
      };
    }
  };

  // Spotlight style — unified, clamped to viewport
  const getSpotlightStyle = () => {
    if (!targetRect) return { opacity: 0 };
    
    // Square mode — size from height, centered horizontally
    // Shifts up by 20% of element height to compensate for font descender space
    // This scales with any font-size / screen size automatically
    if (step.square) {
      const size = targetRect.height + (padding * 2);
      const descenderShift = targetRect.height * 0.20;
      return {
        top: `${targetRect.top - padding - descenderShift}px`,
        left: `${targetRect.centerX - size / 2}px`,
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: step.radius
      };
    }
    
    let left = targetRect.left - padding;
    let width = targetRect.width + (padding * 2);
    const vw = window.innerWidth;
    
    // Shift left if overflowing right edge (keeps full padding)
    if (left + width > vw) {
      left = vw - width;
    }
    // If that pushed past left edge, pin to 0 and fit to screen
    if (left < 0) {
      left = 0;
      width = Math.min(width, vw);
    }
    
    return {
      top: `${targetRect.top - padding}px`,
      left: `${left}px`,
      width: `${width}px`,
      height: `${targetRect.height + (padding * 2)}px`,
      borderRadius: step.radius
    };
  };

  return (
    <div className="onboarding-overlay">
      {/* Full-screen click blocker */}
      <div className="onboarding-blocker" />
      
      {/* Spotlight */}
      {targetRect && (
        <div 
          className="onboarding-spotlight"
          style={getSpotlightStyle()}
        />
      )}

      {/* Tooltip — animKey forces re-mount for fresh CSS animation */}
      <div 
        key={animKey}
        className={`onboarding-tooltip ${step.position} ${tooltipVisible ? 'visible' : 'hidden'}`}
        style={getTooltipStyle()}
      >
        {/* Progress dots */}
        <div className="onboarding-progress">
          {steps.map((_, index) => (
            <div 
              key={index}
              className={`progress-dot ${index === currentStep ? 'active' : ''} ${index < currentStep ? 'completed' : ''}`}
            />
          ))}
        </div>

        {/* Content */}
        <h3 className="onboarding-title">{step.title}</h3>
        <p className="onboarding-message">{step.message}</p>

        {/* Actions */}
        <div className="onboarding-actions">
          <button 
            className="onboarding-skip"
            onClick={handleComplete}
            disabled={isTransitioning}
          >
            Skip
          </button>
          <button 
            className="onboarding-next"
            onClick={handleNext}
            disabled={isTransitioning}
          >
            {isLastStep ? 'Get Started' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default OnboardingGuide;
