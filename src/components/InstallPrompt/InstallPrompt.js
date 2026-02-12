// src/components/InstallPrompt/InstallPrompt.js
// TITANTRACK - Premium PWA Install Prompt
// Minimal, typography-driven, matches app aesthetic exactly

import React, { useState, useEffect, useCallback } from 'react';
import './InstallPrompt.css';

// =============================================================================
// PLATFORM DETECTION
// =============================================================================

const getPlatformInfo = () => {
  const ua = navigator.userAgent || navigator.vendor || window.opera;
  
  // Check if already installed as PWA
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches 
    || window.navigator.standalone 
    || document.referrer.includes('android-app://');
  
  // Platform detection
  const isIOS = /iPad|iPhone|iPod/.test(ua) && !window.MSStream;
  const isAndroid = /android/i.test(ua);
  const isSafari = /^((?!chrome|android).)*safari/i.test(ua);
  const isChrome = /chrome/i.test(ua) && !/edge|edg/i.test(ua);
  const isSamsung = /samsungbrowser/i.test(ua);
  
  let platform = 'desktop';
  let browser = 'chrome';
  
  if (isIOS) {
    platform = 'ios';
    browser = isSafari ? 'safari' : 'other';
  } else if (isAndroid) {
    platform = 'android';
    if (isSamsung) browser = 'samsung';
    else if (isChrome) browser = 'chrome';
    else browser = 'other';
  } else {
    platform = 'desktop';
    if (isChrome) browser = 'chrome';
    else browser = 'other';
  }
  
  return {
    platform,
    browser,
    isStandalone,
    isInstallable: !isStandalone && (isIOS || isAndroid || isChrome)
  };
};

// =============================================================================
// MINIMAL SVG ICONS
// =============================================================================

const ShareIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M12 2v12M8 6l4-4 4 4" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M20 14v4a2 2 0 01-2 2H6a2 2 0 01-2-2v-4" strokeLinecap="round"/>
  </svg>
);

const MenuIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <circle cx="12" cy="5" r="1.5"/>
    <circle cx="12" cy="12" r="1.5"/>
    <circle cx="12" cy="19" r="1.5"/>
  </svg>
);

const PlusIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <rect x="4" y="4" width="16" height="16" rx="3" strokeLinecap="round"/>
    <path d="M12 8v8M8 12h8" strokeLinecap="round"/>
  </svg>
);

const CheckIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M5 12l5 5L19 7" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

// =============================================================================
// INSTRUCTION STEPS BY PLATFORM
// =============================================================================

const getInstructionSteps = (platform, browser) => {
  if (platform === 'ios') {
    return [
      { num: '01', icon: <ShareIcon />, title: 'Tap Share', desc: 'Bottom of Safari' },
      { num: '02', icon: <PlusIcon />, title: 'Add to Home Screen', desc: 'Scroll to find it' },
      { num: '03', icon: <CheckIcon />, title: 'Tap Add', desc: 'Top right corner' }
    ];
  }
  
  if (platform === 'android') {
    return [
      { num: '01', icon: <MenuIcon />, title: 'Tap Menu', desc: 'Three dots, top right' },
      { num: '02', icon: <PlusIcon />, title: 'Install App', desc: 'Or "Add to Home screen"' },
      { num: '03', icon: <CheckIcon />, title: 'Confirm', desc: 'Tap Install' }
    ];
  }
  
  // Desktop
  return [
    { num: '01', icon: <PlusIcon />, title: 'Click Install', desc: 'In the address bar' },
    { num: '02', icon: <CheckIcon />, title: 'Confirm', desc: 'Click Install' }
  ];
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

const InstallPrompt = ({ 
  triggerAfterCheckIns = 1,
  triggerAfterVisits = 3,
  currentCheckIns = 0,
  forceShow = false,
  suppress = false,
  onClose,
  onInstalled
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [platformInfo, setPlatformInfo] = useState(null);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  
  // Initialize
  useEffect(() => {
    setPlatformInfo(getPlatformInfo());
  }, []);
  
  // Native install prompt listener (Chrome/Edge)
  useEffect(() => {
    const handleBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);
  
  // Smart trigger logic
  useEffect(() => {
    if (forceShow) {
      setIsVisible(true);
      return;
    }
    
    if (!platformInfo?.isInstallable) return;
    
    // Check dismissal status
    const dismissed = localStorage.getItem('titantrack_install_dismissed');
    if (dismissed === 'permanent') return;
    
    if (dismissed) {
      const dismissedDate = new Date(dismissed);
      const daysSince = (Date.now() - dismissedDate.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSince < 7) return;
    }
    
    // Track visits
    const visitCount = parseInt(localStorage.getItem('titantrack_visit_count') || '0') + 1;
    localStorage.setItem('titantrack_visit_count', visitCount.toString());
    
    // Check trigger conditions
    const shouldShow = currentCheckIns >= triggerAfterCheckIns || visitCount >= triggerAfterVisits;
    
    if (shouldShow) {
      const timer = setTimeout(() => setIsVisible(true), 2000);
      return () => clearTimeout(timer);
    }
  }, [platformInfo, currentCheckIns, triggerAfterCheckIns, triggerAfterVisits, forceShow]);
  
  // Handle native install
  const handleNativeInstall = useCallback(async () => {
    if (!deferredPrompt) return;
    
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
      localStorage.setItem('titantrack_installed', 'true');
      onInstalled?.();
      handleClose();
    }
  }, [deferredPrompt, onInstalled]);
  
  // Dismiss handlers
  const handleDismiss = (permanent = false) => {
    if (permanent) {
      localStorage.setItem('titantrack_install_dismissed', 'permanent');
    } else {
      localStorage.setItem('titantrack_install_dismissed', new Date().toISOString());
    }
    setIsVisible(false);
    onClose?.();
  };
  
  const handleClose = () => {
    setIsVisible(false);
    onClose?.();
  };
  
  // Don't render if conditions not met
  if (!isVisible || !platformInfo || platformInfo.isStandalone || suppress) {
    return null;
  }
  
  const steps = getInstructionSteps(platformInfo.platform, platformInfo.browser);
  const canUseNativeInstall = deferredPrompt && platformInfo.platform !== 'ios';
  const platformLabel = platformInfo.platform === 'ios' ? 'Safari' : 
                        platformInfo.platform === 'android' ? 'Chrome' : 'Browser';
  
  return (
    <div className="install-overlay" onClick={handleClose}>
      <div className="install-modal" onClick={e => e.stopPropagation()}>
        
        {/* Header */}
        <div className="install-header">
          <h2>Install TitanTrack</h2>
          <p>Add to your home screen for the full experience</p>
        </div>
        
        {/* Native Install (Chrome/Edge) */}
        {canUseNativeInstall ? (
          <div className="install-actions">
            <button className="install-btn-primary" onClick={handleNativeInstall}>
              Install
            </button>
            <button className="install-btn-ghost" onClick={() => handleDismiss(false)}>
              Maybe Later
            </button>
          </div>
        ) : (
          <>
            {/* Manual Steps */}
            <div className="install-steps">
              <span className="install-steps-label">{platformLabel}</span>
              
              {steps.map((step, index) => (
                <div key={index} className="install-step">
                  <div className="install-step-num">{step.num}</div>
                  <div className="install-step-icon">{step.icon}</div>
                  <div className="install-step-text">
                    <span className="install-step-title">{step.title}</span>
                    <span className="install-step-desc">{step.desc}</span>
                  </div>
                </div>
              ))}
            </div>
            
            {/* Footer */}
            <div className="install-footer">
              <button className="install-btn-ghost" onClick={() => handleDismiss(false)}>
                Remind Me Later
              </button>
              <button className="install-btn-text" onClick={() => handleDismiss(true)}>
                Don't Show Again
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

// =============================================================================
// HOOK FOR INSTALL STATUS
// =============================================================================

export const useInstallStatus = () => {
  const [status, setStatus] = useState({
    isInstalled: false,
    isInstallable: false,
    platform: null
  });
  
  useEffect(() => {
    const info = getPlatformInfo();
    setStatus({
      isInstalled: info.isStandalone,
      isInstallable: info.isInstallable,
      platform: info.platform
    });
  }, []);
  
  return status;
};

export default InstallPrompt;