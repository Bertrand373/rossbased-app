// App.js - UPDATED: Added bulletproof sliding pill animation to header navigation
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import './App.css';
import trackerLogo from './assets/trackerapplogo.png';
import helmetImage from './assets/helmet.png';

// Icons for header
import { 
  FaPowerOff, 
  FaUser,
  FaHome,
  FaCalendarAlt,
  FaChartBar,
  FaMapSigns,
  FaShieldAlt
} from 'react-icons/fa';

// Tabs
import Tracker from './components/Tracker/Tracker';
import Calendar from './components/Calendar/Calendar';
import Stats from './components/Stats/Stats';
import EmotionalTimeline from './components/EmotionalTimeline/EmotionalTimeline';
import UrgeToolkit from './components/UrgeToolkit/UrgeToolkit';
import Profile from './components/Profile/Profile';
import Landing from './components/Landing/Landing';

// Shared components
import AuthModal from './components/Auth/AuthModal';
import SubscriptionBanner from './components/Subscription/SubscriptionBanner';
import MobileNavigation from './components/Navigation/MobileNavigation';
import SpartanLoader from './components/Shared/SpartanLoader';

// Custom hook for user data
import { useUserData } from './hooks/useUserData';

// Profile Button Component - handles navigation to profile
const ProfileButton = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  const handleProfileClick = () => {
    navigate('/profile');
  };
  
  const isActive = location.pathname === '/profile';
  
  return (
    <button 
      className={`profile-btn ${isActive ? 'active' : ''}`} 
      onClick={handleProfileClick} 
      title="Profile Settings"
    >
      <FaUser />
      <span>Profile</span>
    </button>
  );
};

// Mobile Profile Button Component
const MobileProfileButton = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  const handleProfileClick = () => {
    navigate('/profile');
  };
  
  const isActive = location.pathname === '/profile';
  
  return (
    <button 
      className={`profile-btn ${isActive ? 'active' : ''}`} 
      onClick={handleProfileClick} 
      title="Profile Settings"
    >
      <FaUser />
    </button>
  );
};

// NEW: Header Navigation with Sliding Animation Component
const HeaderNavigation = () => {
  const location = useLocation();
  
  // BULLETPROOF: Enhanced slider with mobile-first state management
  const navContainerRef = useRef(null);
  const sliderRef = useRef(null);
  const [isSliderInitialized, setIsSliderInitialized] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const resizeTimeoutRef = useRef(null);
  
  const navItems = [
    { path: '/', icon: FaHome, label: 'Tracker' },
    { path: '/calendar', icon: FaCalendarAlt, label: 'Calendar' },
    { path: '/stats', icon: FaChartBar, label: 'Stats' },
    { path: '/timeline', icon: FaMapSigns, label: 'Timeline' },
    { path: '/urge-toolkit', icon: FaShieldAlt, label: 'Urge Toolkit' }
  ];

  // MOBILE DETECTION: Simplified mobile detection
  const detectMobile = useCallback(() => {
    const isMobileDevice = window.innerWidth <= 768 || 'ontouchstart' in window;
    setIsMobile(isMobileDevice);
    return isMobileDevice;
  }, []);

  // ROBUST: Enhanced slider positioning with comprehensive error handling
  const updateNavSlider = useCallback(() => {
    // Guard clauses for safety
    if (!navContainerRef.current || !sliderRef.current) {
      return false;
    }
    
    try {
      const navContainer = navContainerRef.current;
      const slider = sliderRef.current;
      const activeNavElement = navContainer.querySelector('.nav-link.active');
      
      if (!activeNavElement) {
        // No active nav found, hide slider
        slider.style.opacity = '0';
        slider.style.visibility = 'hidden';
        return false;
      }

      // Wait for next frame to ensure layout is complete
      requestAnimationFrame(() => {
        try {
          // Get measurements
          const containerRect = navContainer.getBoundingClientRect();
          const navRect = activeNavElement.getBoundingClientRect();
          
          // Validate measurements
          if (containerRect.width === 0 || navRect.width === 0) {
            console.warn('Invalid measurements, container or nav not rendered');
            return;
          }

          // Calculate position - accounting for container padding
          const paddingLeft = 8; // var(--spacing-xs)
          const leftOffset = navRect.left - containerRect.left - paddingLeft;
          const navWidth = navRect.width;
          
          // Robust boundary checking
          const containerWidth = containerRect.width - (paddingLeft * 2);
          const clampedOffset = Math.max(0, Math.min(leftOffset, containerWidth - navWidth));
          const clampedWidth = Math.min(navWidth, containerWidth);
          
          // Apply positioning and make visible
          slider.style.transform = `translateX(${Math.round(clampedOffset)}px)`;
          slider.style.width = `${Math.round(clampedWidth)}px`;
          slider.style.opacity = '1';
          slider.style.visibility = 'visible';
          
        } catch (innerError) {
          console.error('Inner nav slider positioning failed:', innerError);
        }
      });
      
      return true;
      
    } catch (error) {
      console.error('Nav slider update failed:', error);
      return false;
    }
  }, []);

  // FIXED: Proper slider initialization
  useEffect(() => {
    const initializeSlider = () => {
      detectMobile();
      
      if (!navContainerRef.current || !sliderRef.current) {
        return;
      }

      // Initialize slider immediately
      requestAnimationFrame(() => {
        const success = updateNavSlider();
        
        if (success) {
          setIsSliderInitialized(true);
        } else {
          // Retry after short delay to ensure DOM is ready
          setTimeout(() => {
            if (updateNavSlider()) {
              setIsSliderInitialized(true);
            } else {
              // Final fallback - force slider to be visible
              if (sliderRef.current) {
                sliderRef.current.style.opacity = '1';
                sliderRef.current.style.visibility = 'visible';
                setIsSliderInitialized(true);
                // Try to update position one more time
                setTimeout(updateNavSlider, 50);
              }
            }
          }, 100);
        }
      });
    };

    // Initialize after DOM is ready
    const timer = setTimeout(initializeSlider, 100);
    
    return () => clearTimeout(timer);
  }, [updateNavSlider, detectMobile]);

  // SIMPLIFIED: Basic resize handling
  useEffect(() => {
    const handleResize = () => {
      detectMobile();
      
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }
      
      resizeTimeoutRef.current = setTimeout(() => {
        if (isSliderInitialized) {
          updateNavSlider();
        }
      }, 100);
    };

    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }
    };
  }, [isSliderInitialized, detectMobile, updateNavSlider]);

  // Update slider when location changes
  useEffect(() => {
    if (isSliderInitialized) {
      // Small delay to ensure DOM is updated
      setTimeout(updateNavSlider, 10);
    }
  }, [location.pathname, isSliderInitialized, updateNavSlider]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }
    };
  }, []);

  return (
    <nav className="header-nav">
      <div 
        className="nav-container"
        ref={navContainerRef}
      >
        {/* ENHANCED: Bulletproof sliding indicator with mobile optimizations */}
        <div 
          className="header-nav-slider" 
          ref={sliderRef}
          style={{ 
            opacity: 0,
            visibility: 'hidden',
            transform: 'translateX(0px)',
            width: '0px'
          }}
        />
        
        {navItems.map(item => (
          <NavLink 
            key={item.path}
            to={item.path}
            className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}
          >
            <item.icon />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
};