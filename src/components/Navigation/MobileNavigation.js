// MobileNavigation.js - TITANTRACK
// Text-only navigation with dividers
import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import './MobileNavigation.css';

const MobileNavigation = ({ riskLevel = 'none' }) => {
  const location = useLocation();
  
  const navItems = [
    { path: '/', label: 'Track' },
    { path: '/calendar', label: 'Calendar' },
    { path: '/stats', label: 'Stats' },
    { path: '/timeline', label: 'Timeline' },
    { path: '/urge-toolkit', label: 'Urges', showRiskIndicator: true }
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
              {/* Risk indicator for Urges tab */}
              {item.showRiskIndicator && riskLevel !== 'none' && (
                <span className={`mobile-risk-dot ${riskLevel}`} />
              )}
            </NavLink>
            {index < navItems.length - 1 && <span className="mobile-nav-divider" />}
          </React.Fragment>
        ))}
      </div>
    </nav>
  );
};

export default MobileNavigation;