// src/components/InstallPrompt/InstallPrompt.js
// TITANTRACK - Premium PWA Install Prompt
// Minimal, typography-driven, matches app aesthetic exactly

import React, { useState, useEffect, useCallback, useRef } from 'react';
import './InstallPrompt.css';
import '../../styles/BottomSheet.css';
import useSheetSwipe from '../../hooks/useSheetSwipe';

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

// Apple's Share glyph: narrow open-top box with vertical arrow breaching the top.
// Closer proportions to the SF Symbol `square.and.arrow.up` than a generic upload icon.
const ShareIcon = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <path d="M8 11v8a2 2 0 002 2h4a2 2 0 002-2v-8"/>
    <path d="M12 16V4M9 7l3-3 3 3"/>
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

// Safari compass — circle with red/white needle (simplified)
const SafariIcon = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <circle cx="12" cy="12" r="9"/>
    <path d="M12 12l4.5-6.5L10 10z" fill="currentColor" stroke="none"/>
    <path d="M12 12l-4.5 6.5L14 14z" fill="currentColor" stroke="none" opacity="0.45"/>
  </svg>
);

// Bouncing chevron used to point at the Share icon in the toolbar mockup
const ChevronDownAnim = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 9l6 6 6-6"/>
  </svg>
);

// =============================================================================
// INSTRUCTION STEPS BY PLATFORM
// =============================================================================

const getInstructionSteps = (platform, browser) => {
  // iOS in a non-Safari browser (Chrome, Firefox, in-app webviews from
  // Discord/Instagram/Twitter, etc) — Apple blocks PWA install everywhere
  // except Safari, so step 01 is "open in Safari".
  if (platform === 'ios' && browser !== 'safari') {
    return [
      { num: '01', icon: <SafariIcon />, title: 'Open in Safari', desc: 'iOS only allows installs there' },
      { num: '02', icon: <ShareIcon />, title: 'Tap Share', desc: 'In the Safari toolbar' },
      { num: '03', icon: <PlusIcon />, title: 'Add to Home Screen', desc: 'Then tap Add' }
    ];
  }

  if (platform === 'ios') {
    return [
      { num: '01', icon: <ShareIcon />, title: 'Tap Share', desc: 'In the Safari toolbar' },
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

// Compact Safari bottom-toolbar mockup, with a bouncing arrow drawing the
// eye to the Share icon. Only shown when the user is actually in iOS Safari.
const SafariToolbarMockup = () => (
  <div className="install-toolbar-mockup" aria-hidden="true">
    <div className="install-toolbar-address">
      <span className="install-toolbar-aa">AA</span>
      <span className="install-toolbar-url">titantrack.app</span>
    </div>

    <div className="install-toolbar-row">
      <div className="install-toolbar-btn install-toolbar-dim">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M15 18l-6-6 6-6"/>
        </svg>
      </div>
      <div className="install-toolbar-btn install-toolbar-dim">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 18l6-6-6-6"/>
        </svg>
      </div>

      <div className="install-toolbar-share-wrap">
        <div className="install-toolbar-arrow">
          <ChevronDownAnim />
        </div>
        <div className="install-toolbar-btn install-toolbar-share">
          <ShareIcon size={16} />
        </div>
      </div>

      <div className="install-toolbar-btn install-toolbar-dim">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 4h14v17l-7-4-7 4z"/>
        </svg>
      </div>
      <div className="install-toolbar-btn install-toolbar-dim">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
          <rect x="4" y="4" width="7" height="7" rx="1.4"/>
          <rect x="13" y="4" width="7" height="7" rx="1.4"/>
          <rect x="4" y="13" width="7" height="7" rx="1.4"/>
          <rect x="13" y="13" width="7" height="7" rx="1.4"/>
        </svg>
      </div>
    </div>
  </div>
);

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
  const [sheetReady, setSheetReady] = useState(false);
  const panelRef = useRef(null);

  // Sheet open animation
  useEffect(() => {
    if (isVisible) {
      requestAnimationFrame(() => requestAnimationFrame(() => setSheetReady(true)));
    } else {
      setSheetReady(false);
    }
  }, [isVisible]);

  const closeSheet = useCallback((cb) => {
    setSheetReady(false);
    setTimeout(() => cb && cb(), 300);
  }, []);

  // Swipe-to-dismiss — non-passive native listeners so iOS respects preventDefault
  useSheetSwipe(panelRef, isVisible, () => closeSheet(() => {
    setIsVisible(false);
    onClose?.();
  }));
  
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
    closeSheet(() => {
      setIsVisible(false);
      onClose?.();
    });
  };
  
  const handleClose = () => {
    closeSheet(() => {
      setIsVisible(false);
      onClose?.();
    });
  };
  
  // Don't render if conditions not met
  if (!isVisible || !platformInfo || platformInfo.isStandalone || suppress) {
    return null;
  }
  
  const steps = getInstructionSteps(platformInfo.platform, platformInfo.browser);
  const canUseNativeInstall = deferredPrompt && platformInfo.platform !== 'ios';
  const isIOSSafari = platformInfo.platform === 'ios' && platformInfo.browser === 'safari';
  const isIOSNonSafari = platformInfo.platform === 'ios' && platformInfo.browser !== 'safari';
  const platformLabel = platformInfo.platform === 'ios' ? 'Safari' :
                        platformInfo.platform === 'android' ? 'Chrome' : 'Browser';
  
  return (
    <div className={`sheet-backdrop${sheetReady ? ' open' : ''}`} onClick={handleClose} style={{ zIndex: 10000 }}>
      <div ref={panelRef} className={`sheet-panel install-sheet${sheetReady ? ' open' : ''}`} onClick={e => e.stopPropagation()}>
        <div className="sheet-header" />
        
        {/* Header */}
        <div className="install-header">
          <img src="/tt-icon-white.png" alt="" className="install-app-icon" />
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
            {/* Non-Safari iOS: warn that install requires Safari */}
            {isIOSNonSafari && (
              <div className="install-safari-warning">
                <div className="install-safari-warning-icon">
                  <SafariIcon size={22} />
                </div>
                <div className="install-safari-warning-text">
                  <strong>Open in Safari to install</strong>
                  <span>iOS only allows PWA installs from Safari. The Share button in this browser won't show "Add to Home Screen."</span>
                </div>
              </div>
            )}

            {/* iOS Safari: show toolbar mockup pointing at the Share icon */}
            {isIOSSafari && <SafariToolbarMockup />}

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