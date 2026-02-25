// MobileNavigation.js - TITANTRACK
// 3-group layout: left tabs | Oracle center | right tabs + sliding dash
import React, { useRef, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import './MobileNavigation.css';

const MobileNavigation = ({ onOracleClick, isOracleActive }) => {
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
      const x = itemRect.left + itemRect.width / 2 - navRect.left - 8;

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

  // Re-measure on resize
  useEffect(() => {
    const handleResize = () => {
      if (!navRef.current || !dashRef.current) return;
      const active = navRef.current.querySelector('.mobile-nav-item.active');
      if (!active) return;
      const navRect = navRef.current.getBoundingClientRect();
      const itemRect = active.getBoundingClientRect();
      const x = itemRect.left + itemRect.width / 2 - navRect.left - 8;
      dashRef.current.style.transition = 'none';
      dashRef.current.style.transform = `translateX(${x}px)`;
      dashRef.current.offsetHeight; // eslint-disable-line no-unused-expressions
      dashRef.current.style.transition = '';
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
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
