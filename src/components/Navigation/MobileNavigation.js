// MobileNavigation.js - TITANTRACK
// Text navigation with Oracle eye center icon
import React from 'react';
import { NavLink } from 'react-router-dom';
import './MobileNavigation.css';

const MobileNavigation = ({ onOracleClick, isOracleActive }) => {
  return (
    <nav className="mobile-nav">
      <div className="mobile-nav-inner">
        {/* Left pair */}
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

        {/* Center — Oracle eye */}
        <button 
          className={`mobile-nav-oracle ${isOracleActive ? 'active' : ''}`}
          onClick={onOracleClick}
          aria-label="Open The Oracle"
        >
          <img src="/The_Oracle.png" alt="" className="mobile-nav-oracle-img" />
        </button>

        {/* Right pair */}
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
    </nav>
  );
};

export default MobileNavigation;
