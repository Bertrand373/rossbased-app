// App.js - TITANTRACK MODERN MINIMAL
// DEBUG VERSION - with console logs to diagnose login issue

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import './App.css';
import trackerLogo from './assets/trackerapplogo.png';

// Tabs
import Tracker from './components/Tracker/Tracker';
import Calendar from './components/Calendar/Calendar';
import Stats from './components/Stats/Stats';
import EmotionalTimeline from './components/EmotionalTimeline/EmotionalTimeline';
import UrgeToolkit from './components/UrgeToolkit/UrgeToolkit';
import Profile from './components/Profile/Profile';
import Landing from './components/Landing/Landing';

// ML Components
import PredictionDisplay from './components/PredictionDisplay/PredictionDisplay';
import MLTraining from './components/MLTraining/MLTraining';

// Shared components
import AuthModal from './components/Auth/AuthModal';
import SubscriptionBanner from './components/Subscription/SubscriptionBanner';
import MobileNavigation from './components/Navigation/MobileNavigation';

// Custom hooks
import { useUserData } from './hooks/useUserData';

// Profile Button - Minimal circle
const ProfileButton = ({ userData }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const isActive = location.pathname === '/profile';
  
  const initial = userData?.email?.charAt(0)?.toUpperCase() || 
                  userData?.username?.charAt(0)?.toUpperCase() || 
                  '?';
  
  return (
    <button 
      className={`profile-circle ${isActive ? 'active' : ''}`} 
      onClick={() => navigate('/profile')} 
      aria-label="Profile"
    >
      {initial}
    </button>
  );
};

// Desktop Navigation - sliding dot indicator
const HeaderNavigation = () => {
  const location = useLocation();
  const containerRef = useRef(null);
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

  const getActiveIndex = useCallback(() => {
    return navItems.findIndex(item => {
      if (item.path === '/') {
        return location.pathname === '/';
      }
      return location.pathname.startsWith(item.path);
    });
  }, [location.pathname]);

  const updateDotPosition = useCallback(() => {
    const activeIdx = getActiveIndex();
    if (activeIdx >= 0 && containerRef.current && itemRefs.current[activeIdx]) {
      const containerRect = containerRef.current.getBoundingClientRect();
      const itemRect = itemRefs.current[activeIdx].getBoundingClientRect();
      const centerX = itemRect.left - containerRect.left + (itemRect.width / 2);
      setDotPosition(centerX);
      setIsReady(true);
    }
  }, [getActiveIndex]);

  useEffect(() => {
    const timer = setTimeout(updateDotPosition, 10);
    return () => clearTimeout(timer);
  }, [location.pathname, updateDotPosition]);

  useEffect(() => {
    window.addEventListener('resize', updateDotPosition);
    return () => window.removeEventListener('resize', updateDotPosition);
  }, [updateDotPosition]);

  return (
    <nav className="header-nav">
      <div className="nav-container" ref={containerRef}>
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
              className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}
            >
              {item.label}
            </NavLink>
          </div>
        ))}
      </div>
    </nav>
  );
};

// Scroll to top on route change
const ScrollToTop = () => {
  const location = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [location.pathname]);

  return null;
};

// Service worker listener for notifications
const ServiceWorkerListener = () => {
  const navigate = useNavigate();

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data?.type === 'NAVIGATE_TO_PREDICTION') {
          navigate('/urge-prediction');
        }
      });
    }
  }, [navigate]);

  return null;
};

function App() {
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [activeTab, setActiveTab] = useState('tracker');
  
  const [isRefreshLoading, setIsRefreshLoading] = useState(() => {
    return localStorage.getItem('isLoggedIn') === 'true';
  });
  const [loadingMessage, setLoadingMessage] = useState('Loading...');
  
  const { 
    userData, 
    isLoggedIn, 
    isPremium, 
    isLoading, 
    login, 
    logout, 
    updateUserData,
    setGoal,
    cancelGoal
  } = useUserData();

  // DEBUG: Log state changes
  useEffect(() => {
    console.log('🔍 DEBUG App.js State:', {
      isLoggedIn,
      isLoading,
      isRefreshLoading,
      hasUserData: !!userData,
      username: userData?.username
    });
  }, [isLoggedIn, isLoading, isRefreshLoading, userData]);

  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (isRefreshLoading) {
      const timer = setTimeout(() => setIsRefreshLoading(false), 1200);
      return () => clearTimeout(timer);
    }
  }, [isRefreshLoading]);

  const handleLogin = async (username, password) => {
    console.log('🔍 DEBUG handleLogin called with:', username);
    setLoadingMessage('Signing in...');
    const success = await login(username, password);
    console.log('🔍 DEBUG login result:', success);
    if (success) setShowAuthModal(false);
    return success;
  };

  // DEBUG: Log render decision
  console.log('🔍 DEBUG Render decision:', {
    isLoading,
    isRefreshLoading,
    isLoggedIn,
    hasUserData: !!userData,
    willShowApp: isLoggedIn && userData,
    willShowLanding: !isLoggedIn || !userData
  });

  // Loading screen
  if (isLoading || isRefreshLoading) {
    console.log('🔍 DEBUG: Showing loading screen');
    return (
      <div className="app-loading-screen">
        <img 
          src="/icon-192.png" 
          alt="" 
          className="app-loading-icon"
        />
      </div>
    );
  }

  return (
    <Router>
      <ScrollToTop />
      <ServiceWorkerListener />
      <Toaster 
        position="top-center"
        toastOptions={{
          duration: 3000,
          style: {
            background: '#1a1a1a',
            color: '#ffffff',
            borderRadius: '12px',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            fontSize: '0.875rem',
            padding: '12px 16px',
          },
        }}
      />
      
      <AuthModal 
        isOpen={showAuthModal} 
        onClose={() => setShowAuthModal(false)}
        onLogin={handleLogin}
      />
      
      <div className="app">
        {isLoggedIn && userData ? (
          <>
            {console.log('🔍 DEBUG: Rendering main app')}
            <header className="app-header">
              <div className="logo-container">
                <img src={trackerLogo} alt="TitanTrack" className="app-logo" />
              </div>
              
              {!isMobile && <HeaderNavigation />}
              
              <ProfileButton userData={userData} />
            </header>
            
            {isMobile && (
              <MobileNavigation 
                activeTab={activeTab} 
                setActiveTab={setActiveTab}
              />
            )}
            
            <main className="app-content">
              <div className="main-content-wrapper">
                <Routes>
                  <Route path="/" element={
                    <Tracker 
                      userData={userData} 
                      updateUserData={updateUserData} 
                      isPremium={isPremium}
                      setGoal={setGoal}
                      cancelGoal={cancelGoal}
                    />
                  } />
                  <Route path="/calendar" element={
                    <Calendar userData={userData} isPremium={isPremium} updateUserData={updateUserData} />
                  } />
                  <Route path="/stats" element={
                    <Stats userData={userData} isPremium={isPremium} updateUserData={updateUserData} />
                  } />
                  <Route path="/timeline" element={
                    <EmotionalTimeline userData={userData} isPremium={isPremium} updateUserData={updateUserData} />
                  } />
                  <Route path="/urge-toolkit" element={
                    <UrgeToolkit userData={userData} isPremium={isPremium} updateUserData={updateUserData} />
                  } />
                  <Route path="/profile" element={
                    <Profile userData={userData} isPremium={isPremium} updateUserData={updateUserData} onLogout={logout} />
                  } />
                  
                  {/* ML Routes */}
                  <Route path="/urge-prediction" element={
                    <PredictionDisplay mode="full" userData={userData} />
                  } />
                  <Route path="/ml-training" element={<MLTraining />} />
                  
                  <Route path="*" element={<Navigate to="/" />} />
                </Routes>
              </div>
            </main>
          </>
        ) : (
          <>
            {console.log('🔍 DEBUG: Rendering Landing page')}
            <Routes>
              <Route path="*" element={<Landing onLogin={handleLogin} />} />
            </Routes>
          </>
        )}
      </div>
    </Router>
  );
}

export default App;