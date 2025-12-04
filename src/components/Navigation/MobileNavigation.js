// MobileNavigation.js - TITANTRACK
// Text-only navigation with dividers (risk dots removed - floating card handles alerts)
import React from 'react';
import { NavLink } from 'react-router-dom';
import './MobileNavigation.css';

const MobileNavigation = () => {
  const navItems = [
    { path: '/', label: 'Track' },
    { path: '/calendar', label: 'Calendar' },
    { path: '/stats', label: 'Stats' },
    { path: '/timeline', label: 'Timeline' },
    { path: '/urge-toolkit', label: 'Urges' }
  ];

  return (
    <nav className="mobile-nav">
      <div className="mobile-nav-inner">
        {navItems.map((item, index) => (
          <React.Fragment key={item.path}>
            <NavLink 
              to={item.path}
              className={({ isActive }) => `mobile-nav-item ${isActive ? 'active' : ''}`}
            >
              <span className="mobile-nav-label">{item.label}</span>
            </NavLink>
            {index < navItems.length - 1 && <span className="mobile-nav-divider" />}
          </React.Fragment>
        ))}
      </div>
    </nav>
  );
};

export default MobileNavigation;