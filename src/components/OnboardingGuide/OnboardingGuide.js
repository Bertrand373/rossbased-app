// OnboardingGuide.js - TITANTRACK
// First-time user onboarding - 3 focused tooltips
import React, { useState, useEffect, useCallback } from 'react';
import './OnboardingGuide.css';

const OnboardingGuide = ({ onComplete, onTriggerDatePicker }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(true);
  const [targetRect, setTargetRect] = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);

  // Check for mobile on resize
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Define the 3 onboarding steps
  // Nav target changes based on device
  const steps = [
    {
      target: '.streak-counter',
      title: 'Set your start date',
      message: 'Tap the counter to set when your journey began.',
      position: 'bottom'
    },
    {
      target: '.benefits-trigger',
      title: 'Track daily benefits',
      message: 'Log how you feel each day. This powers your AI insights.',
      position: 'top'
    },
    {
      // Mobile: bottom nav, Desktop: header nav
      target: isMobile ? '.mobile-nav' : '.header-nav',
      title: 'Explore when ready',
      message: 'Calendar, stats, timeline, and crisis tools await.',
      position: isMobile ? 'top' : 'bottom'
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
        right: rect.right
      });
    } else {
      setTargetRect(null);
    }
  }, [currentStep, isMobile]);

  // Update position on mount and step change
  useEffect(() => {
    const timer = setTimeout(() => {
      updateTargetPosition();
    }, 100);
    
    window.addEventListener('resize', updateTargetPosition);
    window.addEventListener('scroll', updateTargetPosition);
    
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', updateTargetPosition);
      window.removeEventListener('scroll', updateTargetPosition);
    };
  }, [updateTargetPosition, currentStep]);

  // Handle next step or complete
  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      handleComplete();
    }
  };

  // Handle skip/complete
  const handleComplete = () => {
    setIsVisible(false);
    setTimeout(() => {
      onComplete();
    }, 200);
  };

  // Handle spotlight tap
  const handleSpotlightTap = () => {
    if (currentStep === 0 && onTriggerDatePicker) {
      onTriggerDatePicker();
    } else {
      handleNext();
    }
  };

  if (!isVisible) return null;

  const step = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;

  // Calculate tooltip position
  const getTooltipStyle = () => {
    if (!targetRect) {
      return {
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)'
      };
    }

    const tooltipOffset = 20;

    if (step.position === 'bottom') {
      return {
        top: `${targetRect.bottom + tooltipOffset}px`,
        left: '50%',
        transform: 'translateX(-50%)'
      };
    } else if (step.position === 'top') {
      return {
        bottom: `${window.innerHeight - targetRect.top + tooltipOffset}px`,
        left: '50%',
        transform: 'translateX(-50%)'
      };
    }

    return {};
  };

  // Get spotlight style - clean rounded corners, no border
  const getSpotlightStyle = () => {
    if (!targetRect) return {};
    
    // For nav (step 3), use full width
    if (currentStep === 2) {
      return {
        top: `${targetRect.top - 8}px`,
        left: '0',
        width: '100%',
        height: `${targetRect.height + 16}px`,
        borderRadius: '0'
      };
    }
    
    // For counter (step 1), generous padding
    if (currentStep === 0) {
      return {
        top: `${targetRect.top - 20}px`,
        left: `${targetRect.left - 20}px`,
        width: `${targetRect.width + 40}px`,
        height: `${targetRect.height + 40}px`,
        borderRadius: '24px'
      };
    }
    
    // For benefits button (step 2)
    return {
      top: `${targetRect.top - 12}px`,
      left: `${targetRect.left - 12}px`,
      width: `${targetRect.width + 24}px`,
      height: `${targetRect.height + 24}px`,
      borderRadius: '16px'
    };
  };

  return (
    <div className="onboarding-overlay">
      {/* Spotlight cutout effect */}
      {targetRect && (
        <div 
          className="onboarding-spotlight"
          style={getSpotlightStyle()}
          onClick={handleSpotlightTap}
        />
      )}

      {/* Tooltip */}
      <div 
        className={`onboarding-tooltip ${step.position}`}
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
          >
            Skip
          </button>
          <button 
            className="onboarding-next"
            onClick={handleNext}
          >
            {isLastStep ? 'Get Started' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default OnboardingGuide;
