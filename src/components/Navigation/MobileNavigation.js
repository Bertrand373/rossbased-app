// components/Navigation/MobileNavigation.js - UPDATED: Added bulletproof sliding pill animation matching profile tabs
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
  
  // BULLETPROOF: Enhanced sliding animation with mobile-first state management - identical to Profile
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

  // MOBILE DETECTION: Simplified mobile detection - identical to Profile
  const detectMobile = useCallback(() => {
    const isMobileDevice = window.innerWidth <= 768 || 'ontouchstart' in window;
    setIsMobile(isMobileDevice);
    return isMobileDevice;
  }, []);

  // FIXED: Enhanced slider positioning with perfect edge alignment - identical to Profile
  const updateMobileNavSlider = useCallback(() => {
    // Guard clauses for safety
    if (!navContainerRef.current || !sliderRef.current) {
      return false;
    }
    
    try {
      const navContainer = navContainerRef.current;
      const slider = sliderRef.current;
      const activeNavElement = navContainer.querySelector('.mobile-nav-item.active');
      
      if (!activeNavElement) {
        console.warn('No active mobile nav element found');
        // Hide slider if no active element
        slider.style.opacity = '0';
        slider.style.visibility = 'hidden';
        return false;
      }

      // Wait for next frame to ensure layout is complete
      requestAnimationFrame(() => {
        try {
          // Get measurements relative to container
          const containerRect = navContainer.getBoundingClientRect();
          const navRect = activeNavElement.getBoundingClientRect();
          
          // Validate measurements
          if (containerRect.width === 0 || navRect.width === 0) {
            console.warn('Invalid measurements, mobile nav container or nav not rendered');
            return;
          }

          // FIXED: Calculate position with consistent spacing on all sides for visual balance
          // Get the computed padding from CSS and add extra spacing for visual separation
          const containerStyle = window.getComputedStyle(navContainer);
          const paddingLeft = Math.round(parseFloat(containerStyle.paddingLeft) || 4);
          const extraSpacing = 2; // Additional spacing to match top/bottom breathing room
          
          // Calculate exact position with consistent edge spacing on all sides
          const leftOffset = Math.round(navRect.left - containerRect.left - paddingLeft - extraSpacing);
          const navWidth = Math.round(navRect.width - (extraSpacing * 2)); // Reduce width to maintain right-edge spacing
          
          // Apply positioning and make visible
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

  // FIXED: Proper slider initialization - identical to Profile
  useEffect(() => {
    const initializeSlider = () => {
      detectMobile();
      
      if (!navContainerRef.current || !sliderRef.current) {
        return;
      }

      // Initialize slider immediately
      requestAnimationFrame(() => {
        const success = updateMobileNavSlider();
        
        if (success) {
          setIsSliderInitialized(true);
        } else {
          // Retry after short delay to ensure DOM is ready
          setTimeout(() => {
            if (updateMobileNavSlider()) {
              setIsSliderInitialized(true);
            } else {
              // Final fallback - force slider to be visible
              if (sliderRef.current) {
                sliderRef.current.style.opacity = '1';
                sliderRef.current.style.visibility = 'visible';
                setIsSliderInitialized(true);
                // Try to update position one more time
                setTimeout(updateMobileNavSlider, 50);
              }
            }
          }, 100);
        }
      });
    };

    // Initialize after DOM is ready
    const timer = setTimeout(initializeSlider, 100);
    
    return () => clearTimeout(timer);
  }, [updateMobileNavSlider, detectMobile]);

  // SIMPLIFIED: Basic resize handling for mobile - identical to Profile
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

  // Update slider when location changes - identical to Profile
  useEffect(() => {
    if (isSliderInitialized) {
      // Small delay to ensure DOM is updated
      setTimeout(updateMobileNavSlider, 10);
    }
  }, [location.pathname, isSliderInitialized, updateMobileNavSlider]);

  // Cleanup timeouts on unmount - identical to Profile
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
        {/* ENHANCED: Bulletproof sliding indicator with mobile optimizations - identical to Profile */}
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