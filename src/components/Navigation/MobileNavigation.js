// MobileNavigation.js - TITANTRACK
// Icons + labels nav: left tabs | Oracle center | right tabs + sliding dash
import React, { useRef, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import './MobileNavigation.css';

/* ── Inline SVG icons — thin-line, 20×20, stroke = currentColor ── */
const TrackIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 20V10" />
    <path d="M18 20V4" />
    <path d="M6 20v-4" />
  </svg>
);

const CalendarIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);

const StatsIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
  </svg>
);

const UrgesIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
);

const MobileNavigation = ({ onOracleClick, isOracleActive, oracleHasUnread }) => {
  const location = useLocation();
  const navRef = useRef(null);
  const dashRef = useRef(null);
  const initialized = useRef(false);

  // Position the dash under the active route tab
  useEffect(() => {
    const positionDash = () => {
      if (!navRef.current || !dashRef.current) return;

      const active = navRef.current.querySelector('.mobile-nav-item.active');
      if (!active) {
        dashRef.current.style.opacity = '0';
        return;
      }

      const navRect = navRef.current.getBoundingClientRect();
      const itemRect = active.getBoundingClientRect();
      const x = itemRect.left + itemRect.width / 2 - navRect.left - 10;

      if (!initialized.current) {
        dashRef.current.style.transition = 'none';
        dashRef.current.style.transform = `translateX(${x}px)`;
        dashRef.current.style.opacity = '1';
        dashRef.current.offsetHeight; // eslint-disable-line no-unused-expressions
        dashRef.current.style.transition = '';
        initialized.current = true;
      } else {
        dashRef.current.style.transform = `translateX(${x}px)`;
        dashRef.current.style.opacity = '1';
      }
    };

    const timer = setTimeout(positionDash, 30);
    return () => clearTimeout(timer);
  }, [location.pathname]);

  // Re-measure on resize and orientation change
  useEffect(() => {
    const recalc = () => {
      if (!navRef.current || !dashRef.current) return;
      const active = navRef.current.querySelector('.mobile-nav-item.active');
      if (!active) {
        dashRef.current.style.opacity = '0';
        return;
      }
      const navRect = navRef.current.getBoundingClientRect();
      const itemRect = active.getBoundingClientRect();
      const x = itemRect.left + itemRect.width / 2 - navRect.left - 10;
      dashRef.current.style.transition = 'none';
      dashRef.current.style.transform = `translateX(${x}px)`;
      dashRef.current.style.opacity = '1';
      dashRef.current.offsetHeight; // eslint-disable-line no-unused-expressions
      dashRef.current.style.transition = '';
    };

    const hideAndRecalc = () => {
      if (dashRef.current) {
        dashRef.current.style.transition = 'none';
        dashRef.current.style.opacity = '0';
      }
      setTimeout(recalc, 200);
      setTimeout(recalc, 500);
    };

    window.addEventListener('resize', hideAndRecalc);
    window.addEventListener('orientationchange', hideAndRecalc);

    const mql = window.matchMedia('(orientation: portrait)');
    const onOrientationMedia = () => hideAndRecalc();
    mql.addEventListener('change', onOrientationMedia);

    return () => {
      window.removeEventListener('resize', hideAndRecalc);
      window.removeEventListener('orientationchange', hideAndRecalc);
      mql.removeEventListener('change', onOrientationMedia);
    };
  }, []);

  return (
    <nav className="mobile-nav">
      <div className="mobile-nav-inner" ref={navRef}>
        {/* Sliding dash */}
        <span ref={dashRef} className="mobile-nav-dash" />

        {/* Left group */}
        <div className="mobile-nav-group">
          <NavLink 
            to="/"
            className={({ isActive }) => `mobile-nav-item ${isActive ? 'active' : ''}`}
          >
            <TrackIcon />
            <span className="mobile-nav-label">Track</span>
          </NavLink>
          <NavLink 
            to="/calendar"
            className={({ isActive }) => `mobile-nav-item ${isActive ? 'active' : ''}`}
          >
            <CalendarIcon />
            <span className="mobile-nav-label">Calendar</span>
          </NavLink>
        </div>

        {/* Center — Oracle eye */}
        <button 
          className={`mobile-nav-oracle ${isOracleActive ? 'active' : ''}`}
          onClick={onOracleClick}
          aria-label="Open The Oracle"
        >
          <img src="/The_Oracle.png" alt="" className="mobile-nav-oracle-img" />
          {oracleHasUnread && !isOracleActive && <span className="mobile-nav-oracle-dot" />}
        </button>

        {/* Right group */}
        <div className="mobile-nav-group">
          <NavLink 
            to="/stats"
            className={({ isActive }) => `mobile-nav-item ${isActive ? 'active' : ''}`}
          >
            <StatsIcon />
            <span className="mobile-nav-label">Stats</span>
          </NavLink>
          <NavLink 
            to="/urge-toolkit"
            className={({ isActive }) => `mobile-nav-item ${isActive ? 'active' : ''}`}
          >
            <UrgesIcon />
            <span className="mobile-nav-label">Urges</span>
          </NavLink>
        </div>
      </div>
    </nav>
  );
};

export default MobileNavigation;
