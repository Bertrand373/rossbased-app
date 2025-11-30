// MobileNavigation.js - TITANTRACK SHARP BOTTOM NAV
// Clean, simple navigation without sliding animations
import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import './MobileNavigation.css';

// Icons
import { 
  FaHome,
  FaCalendarAlt,
  FaChartBar,
  FaMapSigns,
  FaShieldAlt
} from 'react-icons/fa';

const MobileNavigation = ({ activeTab, setActiveTab }) => {
  const location = useLocation();
  
  const navItems = [
    { path: '/', icon: FaHome, label: 'Tracker', tab: 'tracker' },
    { path: '/calendar', icon: FaCalendarAlt, label: 'Calendar', tab: 'calendar' },
    { path: '/stats', icon: FaChartBar, label: 'Stats', tab: 'stats' },
    { path: '/timeline', icon: FaMapSigns, label: 'Timeline', tab: 'timeline' },
    { path: '/urge-toolkit', icon: FaShieldAlt, label: 'Urges', tab: 'urge-toolkit' }
  ];

  return (
    <div className="mobile-navigation">
      <div className="mobile-nav-container">
        {navItems.map(item => (
          <NavLink 
            key={item.path}
            to={item.path}
            className={({ isActive }) => 
              isActive ? 'mobile-nav-item active' : 'mobile-nav-item'
            }
            onClick={() => setActiveTab && setActiveTab(item.tab)}
          >
            <item.icon className="mobile-nav-icon" />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </div>
    </div>
  );
};

export default MobileNavigation;