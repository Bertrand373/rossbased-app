// components/Navigation/MobileNavigation.js - Updated with Timeline
import React from 'react';
import { NavLink } from 'react-router-dom';
import './MobileNavigation.css';

// Icons
import { 
  FaHome,
  FaCalendarAlt,
  FaChartBar,
  FaMapSigns, // CHANGED: Timeline icon instead of quote
  FaShieldAlt
} from 'react-icons/fa';

const MobileNavigation = ({ activeTab, setActiveTab }) => {
  return (
    <div className="mobile-navigation">
      <NavLink 
        to="/" 
        className={({ isActive }) => 
          isActive ? 'mobile-nav-item active' : 'mobile-nav-item'
        }
        onClick={() => setActiveTab('tracker')}
      >
        <FaHome className="mobile-nav-icon" />
        <span>Tracker</span>
      </NavLink>
      
      <NavLink 
        to="/calendar" 
        className={({ isActive }) => 
          isActive ? 'mobile-nav-item active' : 'mobile-nav-item'
        }
        onClick={() => setActiveTab('calendar')}
      >
        <FaCalendarAlt className="mobile-nav-icon" />
        <span>Calendar</span>
      </NavLink>
      
      <NavLink 
        to="/stats" 
        className={({ isActive }) => 
          isActive ? 'mobile-nav-item active' : 'mobile-nav-item'
        }
        onClick={() => setActiveTab('stats')}
      >
        <FaChartBar className="mobile-nav-icon" />
        <span>Stats</span>
      </NavLink>
      
      <NavLink 
        to="/timeline" 
        className={({ isActive }) => 
          isActive ? 'mobile-nav-item active' : 'mobile-nav-item'
        }
        onClick={() => setActiveTab('timeline')}
      >
        <FaMapSigns className="mobile-nav-icon" />
        <span>Timeline</span>
      </NavLink>
      
      <NavLink 
        to="/urge-toolkit" 
        className={({ isActive }) => 
          isActive ? 'mobile-nav-item active' : 'mobile-nav-item'
        }
        onClick={() => setActiveTab('urge-toolkit')}
      >
        <FaShieldAlt className="mobile-nav-icon" />
        <span>Urges</span>
      </NavLink>
    </div>
  );
};

export default MobileNavigation;