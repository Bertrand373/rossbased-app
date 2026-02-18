// OnboardingGuide.js - TITANTRACK
// Premium onboarding with architectural line+dot connector
// UPDATED: 4 steps - now includes Crisis Toolkit as highlighted step

import React, { useState, useEffect, useCallback } from 'react';
import './OnboardingGuide.css';

const OnboardingGuide = ({ onComplete, onTriggerDatePicker }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(true);
  const [targetRect, setTargetRect] = useState(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [tooltipVisible, setTooltipVisible] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);

  // Check for mobile on resize
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Define the 4 onboarding steps - Crisis toolkit now highlighted
  const steps = [
    {
      // Step 1: Target ONLY the streak number itself
      target: '.streak-num',
      title: 'Set your start date',
      message: 'Tap the counter to set when your journey began.',
      position: 'bottom',
      padding: 12
    },
    {
      // Step 2: Target the log button
      target: '.benefits-trigger',
      title: 'Track daily benefits',
      message: 'Log how you feel each day. This powers your AI insights.',
      position: 'top',
      padding: 6
    },
    {
      // Step 3: NEW - Target the Urges/Crisis nav item specifically
      target: isMobile 
        ? '.mobile-nav-item[href="/urge-toolkit"]' 
        : '.nav-link[href="/urge-toolkit"]',
      title: 'Crisis toolkit ready',
      message: 'When urges hit, breathing exercises and emergency protocols are one tap away.',
      position: isMobile ? 'top' : 'bottom',
      padding: 8
    },
    {
      // Step 4: Target just the nav links container (not full bar)
      target: isMobile ? '.mobile-nav-inner' : '.nav-container',
      title: 'Explore when ready',
      message: 'Calendar, stats, and emotional timeline await.',
      position: isMobile ? 'top' : 'bottom',
      padding: 10
    }
  ];

  // Find and measure the target element
  const updateTargetPosition = useCallback(() => {
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
      setTargetRect(null);
    }
  }, [currentStep, isMobile]);

  // Update position on mount and step change
  useEffect(() => {
    const timer = setTimeout(() => {
      updateTargetPosition();
    }, 50);
    
    window.addEventListener('resize', updateTargetPosition);
    window.addEventListener('scroll', updateTargetPosition);
    
    return () => {
      clearTimeout(timer);
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

  // Calculate tooltip position - follows target with screen constraints
  const getTooltipStyle = () => {
    if (!targetRect) {
      return {
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)'
      };
    }

    // Space between spotlight and tooltip
    const tooltipOffset = 16;
    const tooltipWidth = 300;
    const screenPadding = 20;
    
    // Calculate horizontal position - follow target but stay on screen
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
    } else if (step.position === 'top') {
      return {
        bottom: `${window.innerHeight - targetRect.top + padding + tooltipOffset}px`,
        left: `${leftPos}px`,
        transform: 'translateX(-50%)'
      };
    }

    return {};
  };

  // Get spotlight style - TIGHT, element-specific
  const getSpotlightStyle = () => {
    if (!targetRect) return { opacity: 0 };
    
    // For full nav (step 4) - rounded corners
    if (currentStep === 3) {
      return {
        top: `${targetRect.top - padding}px`,
        left: `${targetRect.left - padding}px`,
        width: `${targetRect.width + (padding * 2)}px`,
        height: `${targetRect.height + (padding * 2)}px`,
        borderRadius: '16px'
      };
    }
    
    // For crisis/urges nav item (step 3) - tighter focus
    if (currentStep === 2) {
      return {
        top: `${targetRect.top - padding}px`,
        left: `${targetRect.left - padding}px`,
        width: `${targetRect.width + (padding * 2)}px`,
        height: `${targetRect.height + (padding * 2)}px`,
        borderRadius: '12px'
      };
    }
    
    // For counter (step 1) - tight around just the button
    if (currentStep === 0) {
      return {
        top: `${targetRect.top - padding}px`,
        left: `${targetRect.left - padding}px`,
        width: `${targetRect.width + (padding * 2)}px`,
        height: `${targetRect.height + (padding * 2)}px`,
        borderRadius: '20px'
      };
    }
    
    // For benefits button (step 2)
    return {
      top: `${targetRect.top - padding}px`,
      left: `${targetRect.left - padding}px`,
      width: `${targetRect.width + (padding * 2)}px`,
      height: `${targetRect.height + (padding * 2)}px`,
      borderRadius: '14px'
    };
  };

  return (
    <div className="onboarding-overlay">
      {/* Full-screen click blocker - prevents ALL interaction with app */}
      <div className="onboarding-blocker" />
      
      {/* Spotlight - tight focus on element */}
      {targetRect && (
        <div 
          className="onboarding-spotlight"
          style={getSpotlightStyle()}
        />
      )}

      {/* Tooltip */}
      <div 
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