// components/Navigation/MobileNavigation.js - FIXED: Perfect sliding pill alignment
import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  
  // Enhanced sliding animation with mobile-first state management
  const navContainerRef = useRef(null);
  const sliderRef = useRef(null);
  const [isSliderInitialized, setIsSliderInitialized] = useState(false);
  const [isMobile, setIsMobile] = useState(true); // Always mobile for this component
  const resizeTimeoutRef = useRef(null);
  
  const navItems = [
    { path: '/', icon: FaHome, label: 'Tracker', tab: 'tracker' },
    { path: '/calendar', icon: FaCalendarAlt, label: 'Calendar', tab: 'calendar' },
    { path: '/stats', icon: FaChartBar, label: 'Stats', tab: 'stats' },
    { path: '/timeline', icon: FaMapSigns, label: 'Timeline', tab: 'timeline' },
    { path: '/urge-toolkit', icon: FaShieldAlt, label: 'Urges', tab: 'urge-toolkit' }
  ];

  // Mobile detection
  const detectMobile = useCallback(() => {
    const isMobileDevice = window.innerWidth <= 768 || 'ontouchstart' in window;
    setIsMobile(isMobileDevice);
    return isMobileDevice;
  }, []);

  // FIXED: Proper slider positioning with centered content
  const updateMobileNavSlider = useCallback(() => {
    if (!navContainerRef.current || !sliderRef.current) {
      return false;
    }
    
    try {
      const navContainer = navContainerRef.current;
      const slider = sliderRef.current;
      const activeNavElement = navContainer.querySelector('.mobile-nav-item.active');
      
      if (!activeNavElement) {
        console.warn('No active mobile nav element found');
        slider.style.opacity = '0';
        slider.style.visibility = 'hidden';
        return false;
      }

      requestAnimationFrame(() => {
        try {
          const containerRect = navContainer.getBoundingClientRect();
          const navRect = activeNavElement.getBoundingClientRect();
          
          if (containerRect.width === 0 || navRect.width === 0) {
            console.warn('Invalid measurements, mobile nav container or nav not rendered');
            return;
          }

          // FIXED: Simplified calculation for perfect alignment
          // Calculate the left offset from the container's left edge
          const leftOffset = navRect.left - containerRect.left;
          const navWidth = navRect.width;
          
          // Apply positioning with proper width
          slider.style.transform = `translateX(${Math.round(leftOffset)}px)`;
          slider.style.width = `${Math.round(navWidth)}px`;
          slider.style.opacity = '1';
          slider.style.visibility = 'visible';
          
        } catch (innerError) {
          console.error('Inner mobile nav slider positioning failed:', innerError);
        }
      });
      
      return true;
      
    } catch (error) {
      console.error('Mobile nav slider update failed:', error);
      return false;
    }
  }, []);

  // Slider initialization
  useEffect(() => {
    const initializeSlider = () => {
      detectMobile();
      
      if (!navContainerRef.current || !sliderRef.current) {
        return;
      }

      requestAnimationFrame(() => {
        const success = updateMobileNavSlider();
        
        if (success) {
          setIsSliderInitialized(true);
        } else {
          setTimeout(() => {
            if (updateMobileNavSlider()) {
              setIsSliderInitialized(true);
            } else {
              if (sliderRef.current) {
                sliderRef.current.style.opacity = '1';
                sliderRef.current.style.visibility = 'visible';
                setIsSliderInitialized(true);
                setTimeout(updateMobileNavSlider, 50);
              }
            }
          }, 100);
        }
      });
    };

    const timer = setTimeout(initializeSlider, 100);
    
    return () => clearTimeout(timer);
  }, [updateMobileNavSlider, detectMobile]);

  // Resize handling
  useEffect(() => {
    const handleResize = () => {
      detectMobile();
      
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }
      
      resizeTimeoutRef.current = setTimeout(() => {
        if (isSliderInitialized) {
          updateMobileNavSlider();
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
  }, [isSliderInitialized, detectMobile, updateMobileNavSlider]);

  // Update slider when location changes
  useEffect(() => {
    if (isSliderInitialized) {
      setTimeout(updateMobileNavSlider, 10);
    }
  }, [location.pathname, isSliderInitialized, updateMobileNavSlider]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="mobile-navigation">
      <div 
        className="mobile-nav-container"
        ref={navContainerRef}
      >
        {/* Sliding indicator */}
        <div 
          className="mobile-nav-slider" 
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