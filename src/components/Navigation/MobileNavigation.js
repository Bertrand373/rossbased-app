// MobileNavigation.js - TITANTRACK
import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import './MobileNavigation.css';

const MobileNavigation = () => {
  const location = useLocation();
  
  const navItems = [
    { path: '/', label: 'Tracker' },
    { path: '/calendar', label: 'Calendar' },
    { path: '/stats', label: 'Stats' },
    { path: '/timeline', label: 'Timeline' },
    { path: '/urge-toolkit', label: 'Urges' }
  ];

  // Find active tab index for sliding indicator
  const activeIndex = navItems.findIndex(item => {
    if (item.path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(item.path);
  });

  return (
    <nav className="mobile-nav">
      {/* Sliding dot indicator */}
      <div 
        className="nav-slider" 
        style={{ 
          '--active-index': activeIndex >= 0 ? activeIndex : 0,
          '--total-items': navItems.length 
        }} 
      />
      
      {navItems.map(item => (
        <NavLink 
          key={item.path}
          to={item.path}
          className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}
        >
          <span className="nav-label">{item.label}</span>
        </NavLink>
      ))}
    </nav>
  );
};

export default MobileNavigation;