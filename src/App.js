// App.js - TITANTRACK MODERN MINIMAL
import React, { useState, useEffect } from 'react';
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

// Import UNIFIED PredictionDisplay
import PredictionDisplay from './components/PredictionDisplay/PredictionDisplay';
import MLTraining from './components/MLTraining/MLTraining';

// Shared components
import AuthModal from './components/Auth/AuthModal';
import SubscriptionBanner from './components/Subscription/SubscriptionBanner';
import MobileNavigation from './components/Navigation/MobileNavigation';

// Custom hook for user data
import { useUserData } from './hooks/useUserData';

// AMBIENT AI HOOKS - Auto-train only (risk indicator removed, floating card handles alerts)
import { useAutoTrain } from './hooks/useAutoTrain';

// Profile Button - Minimal circle
const ProfileButton = ({ userData }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const isActive = location.pathname === '/profile';
  
  // Get first initial from email or username
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

// Desktop Navigation - Text only with dividers (dots removed)
const HeaderNavigation = () => {
  const navItems = [
    { path: '/', label: 'Tracker' },
    { path: '/calendar', label: 'Calendar' },
    { path: '/stats', label: 'Stats' },
    { path: '/timeline', label: 'Timeline' },
    { path: '/urge-toolkit', label: 'Urges' }
  ];

  return (
    <nav className="header-nav">
      <div className="nav-container">
        {navItems.map((item, index) => (
          <React.Fragment key={item.path}>
            <NavLink 
              to={item.path}
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            >
              {item.label}
            </NavLink>
            {index < navItems.length - 1 && <span className="nav-divider" />}
          </React.Fragment>
        ))}
      </div>
    </nav>
  );
};

// Static view controller - prevents scroll on fixed-content views
const StaticViewManager = () => {
  const location = useLocation();
  
  useEffect(() => {
    const staticRoutes = ['/'];
    if (staticRoutes.includes(location.pathname)) {
      document.body.classList.add('static-view');
    } else {
      document.body.classList.remove('static-view');
    }
    return () => document.body.classList.remove('static-view');
  }, [location.pathname]);
  
  return null;
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

// Navigate to Tracker after successful login
const PostLoginNavigator = ({ shouldNavigate, onNavigated }) => {
  const navigate = useNavigate();
  
  useEffect(() => {
    if (shouldNavigate) {
      navigate('/', { replace: true });
      onNavigated();
    }
  }, [shouldNavigate, navigate, onNavigated]);
  
  return null;
};

function App() {
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [activeTab, setActiveTab] = useState('tracker');
  const [shouldNavigateToTracker, setShouldNavigateToTracker] = useState(false);
  
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

  // AMBIENT AI: Auto-train only (floating card on Tracker handles risk alerts)
  useAutoTrain(isLoggedIn ? userData : null);

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

  const handleLogin = async (username, password, isGoogleAuth = false) => {
    setLoadingMessage('Signing in...');
    const success = await login(username, password, isGoogleAuth);
    if (success) {
      setShowAuthModal(false);
      setActiveTab('tracker');
      setShouldNavigateToTracker(true);
    }
    return success;
  };

  // Loading screen - icon only, no text
  if (isLoading || isRefreshLoading) {
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
      <StaticViewManager />
      <ServiceWorkerListener />
      <PostLoginNavigator 
        shouldNavigate={shouldNavigateToTracker} 
        onNavigated={() => setShouldNavigateToTracker(false)} 
      />
      {/* RESPONSIVE TOAST: Desktop top-right, Mobile top-center below header */}
      <Toaster 
        position={isMobile ? "top-center" : "top-right"}
        containerStyle={isMobile ? {
          top: 70,  // Below mobile header
          zIndex: 9999,  // Above modals
        } : {
          top: 80,   // Below desktop header
          right: 24,
          zIndex: 9999,  // Above modals
        }}
        toastOptions={{
          duration: 2500,
          style: {
            background: 'rgba(255, 255, 255, 0.06)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '12px',
            color: '#ffffff',
            fontSize: '0.875rem',
            fontWeight: '500',
            padding: '14px 20px',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
            maxWidth: isMobile ? 'calc(100vw - 32px)' : '380px',
          },
          success: {
            duration: 2500,
            icon: <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e', flexShrink: 0 }} />,
          },
          error: {
            duration: 3500,
            style: {
              background: 'rgba(255, 59, 48, 0.08)',
              border: '1px solid rgba(255, 59, 48, 0.12)',
            },
            icon: <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#ff3b30', flexShrink: 0 }} />,
          },
        }}
      />
      
      <div className="app-container">
        {isLoggedIn ? (
          <>
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
          <Routes>
            <Route path="*" element={<Landing onLogin={handleLogin} />} />
          </Routes>
        )}
      </div>
    </Router>
  );
}

export default App;