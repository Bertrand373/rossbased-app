// MobileNavigation.js - TITANTRACK
import React, { useRef, useEffect, useState, useCallback } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import './MobileNavigation.css';

const MobileNavigation = () => {
  const location = useLocation();
  const navRef = useRef(null);
  const itemRefs = useRef([]);
  const [dotPosition, setDotPosition] = useState(0);
  const [isReady, setIsReady] = useState(false);
  
  const navItems = [
    { path: '/', label: 'Tracker' },
    { path: '/calendar', label: 'Calendar' },
    { path: '/stats', label: 'Stats' },
    { path: '/timeline', label: 'Timeline' },
    { path: '/urge-toolkit', label: 'Urges' }
  ];

  // Find active tab index
  const getActiveIndex = useCallback(() => {
    return navItems.findIndex(item => {
      if (item.path === '/') {
        return location.pathname === '/';
      }
      return location.pathname.startsWith(item.path);
    });
  }, [location.pathname]);

  // Calculate dot position
  const updateDotPosition = useCallback(() => {
    const activeIdx = getActiveIndex();
    if (activeIdx >= 0 && navRef.current && itemRefs.current[activeIdx]) {
      const navRect = navRef.current.getBoundingClientRect();
      const itemRect = itemRefs.current[activeIdx].getBoundingClientRect();
      
      // Calculate center of active item relative to nav
      const centerX = itemRect.left - navRect.left + (itemRect.width / 2);
      setDotPosition(centerX);
      setIsReady(true);
    }
  }, [getActiveIndex]);

  // Update on mount and route change
  useEffect(() => {
    // Small delay to ensure DOM is ready
    const timer = setTimeout(updateDotPosition, 10);
    return () => clearTimeout(timer);
  }, [location.pathname, updateDotPosition]);

  // Update on resize
  useEffect(() => {
    window.addEventListener('resize', updateDotPosition);
    return () => window.removeEventListener('resize', updateDotPosition);
  }, [updateDotPosition]);

  return (
    <nav className="mobile-nav" ref={navRef}>
      {/* Sliding dot */}
      <div 
        className="nav-slider-dot"
        style={{
          left: `${dotPosition}px`,
          opacity: isReady ? 1 : 0
        }}
      />
      
      {navItems.map((item, index) => (
        <div 
          key={item.path}
          ref={el => itemRefs.current[index] = el}
          className="nav-item-wrapper"
        >
          <NavLink 
            to={item.path}
            className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}
          >
            <span className="nav-label">{item.label}</span>
          </NavLink>
        </div>
      ))}
    </nav>
  );
};

export default MobileNavigation;