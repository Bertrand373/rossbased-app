// MobileNavigation.js - TITANTRACK
import React from 'react';
import { NavLink } from 'react-router-dom';
import './MobileNavigation.css';

const MobileNavigation = () => {
  const navItems = [
    { path: '/', label: 'Tracker' },
    { path: '/calendar', label: 'Calendar' },
    { path: '/stats', label: 'Stats' },
    { path: '/timeline', label: 'Timeline' },
    { path: '/urge-toolkit', label: 'Urges' }
  ];

  return (
    <nav className="mobile-nav">
      {navItems.map(item => (
        <NavLink 
          key={item.path}
          to={item.path}
          className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}
        >
          <span className="nav-label">{item.label}</span>
          <span className="nav-indicator" />
        </NavLink>
      ))}
    </nav>
  );
};

export default MobileNavigation;