// MobileNavigation.js - TITANTRACK
// 3-group layout: left tabs | Oracle center | right tabs + sliding dash
import React, { useRef, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import './MobileNavigation.css';

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

    // On orientation/visibility change: hide immediately, recalc after layout settles
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

    // matchMedia is more reliable than orientationchange on modern devices
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
            <span className="mobile-nav-label">Track</span>
          </NavLink>
          <span className="mobile-nav-divider" />
          <NavLink 
            to="/calendar"
            className={({ isActive }) => `mobile-nav-item ${isActive ? 'active' : ''}`}
          >
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
            <span className="mobile-nav-label">Stats</span>
          </NavLink>
          <span className="mobile-nav-divider" />
          <NavLink 
            to="/urge-toolkit"
            className={({ isActive }) => `mobile-nav-item ${isActive ? 'active' : ''}`}
          >
            <span className="mobile-nav-label">Urges</span>
          </NavLink>
        </div>
      </div>
    </nav>
  );
};

export default MobileNavigation;
