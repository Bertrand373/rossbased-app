// OnboardingGuide.js - TITANTRACK
// Premium onboarding with architectural line+dot connector
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

  // Define the 3 onboarding steps - TIGHT targeting
  const steps = [
    {
      // Target ONLY the streak number itself
      target: '.streak-num',
      title: 'Set your start date',
      message: 'Tap the counter to set when your journey began.',
      position: 'bottom',
      padding: 12 // Comfortable padding around just the number
    },
    {
      // Target the log button
      target: '.benefits-trigger',
      title: 'Track daily benefits',
      message: 'Log how you feel each day. This powers your AI insights.',
      position: 'top',
      padding: 6 // Tight padding - just the button
    },
    {
      // Target just the nav links container (not full bar)
      target: isMobile ? '.mobile-nav-inner' : '.nav-container',
      title: 'Explore when ready',
      message: 'Calendar, stats, timeline, and crisis tools await.',
      position: isMobile ? 'top' : 'bottom',
      padding: 10 // Padding for nav links
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

  // Calculate tooltip position
  const getTooltipStyle = () => {
    if (!targetRect) {
      return {
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)'
      };
    }

    // Space for the connector line
    const tooltipOffset = 48;

    if (step.position === 'bottom') {
      return {
        top: `${targetRect.bottom + padding + tooltipOffset}px`,
        left: '50%',
        transform: 'translateX(-50%)'
      };
    } else if (step.position === 'top') {
      return {
        bottom: `${window.innerHeight - targetRect.top + padding + tooltipOffset}px`,
        left: '50%',
        transform: 'translateX(-50%)'
      };
    }

    return {};
  };

  // Get spotlight style - TIGHT, element-specific
  const getSpotlightStyle = () => {
    if (!targetRect) return { opacity: 0 };
    
    // For nav (step 3) - rounded corners like other elements
    if (currentStep === 2) {
      return {
        top: `${targetRect.top - padding}px`,
        left: `${targetRect.left - padding}px`,
        width: `${targetRect.width + (padding * 2)}px`,
        height: `${targetRect.height + (padding * 2)}px`,
        borderRadius: '16px' // Rounded like other highlights
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

  // Calculate connector line position
  const getConnectorStyle = () => {
    if (!targetRect) return { opacity: 0 };
    
    const lineLength = 32;
    
    if (step.position === 'bottom') {
      // Line goes from bottom of spotlight to tooltip
      return {
        left: '50%',
        top: `${targetRect.bottom + padding + 4}px`,
        height: `${lineLength}px`,
        transform: 'translateX(-50%)'
      };
    } else {
      // Line goes from top of spotlight up to tooltip
      return {
        left: '50%',
        bottom: `${window.innerHeight - targetRect.top + padding + 4}px`,
        height: `${lineLength}px`,
        transform: 'translateX(-50%)'
      };
    }
  };

  // Get dot position (at end of line, near tooltip)
  const getDotStyle = () => {
    if (!targetRect) return { opacity: 0 };
    
    if (step.position === 'bottom') {
      return {
        left: '50%',
        top: `${targetRect.bottom + padding + 32}px`,
        transform: 'translateX(-50%)'
      };
    } else {
      return {
        left: '50%',
        bottom: `${window.innerHeight - targetRect.top + padding + 32}px`,
        transform: 'translateX(-50%)'
      };
    }
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

      {/* Connector line */}
      {targetRect && tooltipVisible && (
        <div 
          className={`onboarding-connector ${tooltipVisible ? 'visible' : ''}`}
          style={getConnectorStyle()}
        />
      )}

      {/* Terminal dot */}
      {targetRect && tooltipVisible && (
        <div 
          className={`onboarding-dot ${tooltipVisible ? 'visible' : ''}`}
          style={getDotStyle()}
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