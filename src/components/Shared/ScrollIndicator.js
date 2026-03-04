// ScrollIndicator.js - TITANTRACK
// Subtle scroll chevron — appears when content extends below the fold.
// Fades out after user scrolls ~150px. Re-evaluates on every route change. Mobile only.

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import './ScrollIndicator.css';

const ScrollIndicator = () => {
  const [visible, setVisible] = useState(false);
  const dismissed = useRef(false);
  const location = useLocation();

  // Check if page has scrollable overflow below the viewport
  const checkOverflow = useCallback(() => {
    if (dismissed.current) return;
    const scrollable = document.documentElement.scrollHeight > window.innerHeight + 80;
    const nearTop = window.scrollY < 150;
    setVisible(scrollable && nearTop);
  }, []);

  // Reset on every route change
  useEffect(() => {
    dismissed.current = false;
    setVisible(false);
    // Wait for new page content to render before checking
    const timer = setTimeout(checkOverflow, 400);
    return () => clearTimeout(timer);
  }, [location.pathname, checkOverflow]);

  // Scroll listener — dismiss after 150px
  useEffect(() => {
    const onScroll = () => {
      if (window.scrollY > 150) {
        setVisible(false);
        dismissed.current = true;
      }
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', checkOverflow, { passive: true });

    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', checkOverflow);
    };
  }, [checkOverflow]);

  if (!visible) return null;

  return (
    <div className="scroll-indicator" aria-hidden="true">
      <svg width="20" height="10" viewBox="0 0 20 10" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M2 2L10 8L18 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
};

export default ScrollIndicator;
