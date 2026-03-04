// ScrollIndicator.js - TITANTRACK
// Scroll chevron — visible whenever there is more content below the viewport.
// Hides only when user reaches the bottom. Re-evaluates on route change. Mobile only.

import React, { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import './ScrollIndicator.css';

const ScrollIndicator = () => {
  const [visible, setVisible] = useState(false);
  const location = useLocation();

  // Check if there is still content below the current scroll position
  const checkCanScroll = useCallback(() => {
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    const viewportHeight = window.innerHeight;
    const totalHeight = document.documentElement.scrollHeight;
    // 100px buffer so it hides slightly before the absolute bottom
    const hasMoreBelow = totalHeight - scrollTop - viewportHeight > 100;
    setVisible(hasMoreBelow);
  }, []);

  // Reset and re-check on every route change
  useEffect(() => {
    setVisible(false);
    // Wait for new page content to render before checking
    const timer = setTimeout(checkCanScroll, 400);
    return () => clearTimeout(timer);
  }, [location.pathname, checkCanScroll]);

  // Continuously check on scroll and resize
  useEffect(() => {
    window.addEventListener('scroll', checkCanScroll, { passive: true });
    window.addEventListener('resize', checkCanScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', checkCanScroll);
      window.removeEventListener('resize', checkCanScroll);
    };
  }, [checkCanScroll]);

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
