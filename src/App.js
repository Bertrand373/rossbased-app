// App.js - TITANTRACK MODERN MINIMAL
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, NavLink, useNavigate, useLocation } from 'react-router-dom';
import toast, { Toaster } from 'react-hot-toast';
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
import SpartanLoader from './components/Shared/SpartanLoader';

// Custom hook for user data
import { useUserData } from './hooks/useUserData';

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

// Desktop Navigation - text only
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
        {navItems.map(item => (
          <NavLink 
            key={item.path}
            to={item.path}
            className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}
          >
            {item.label}
          </NavLink>
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
    setLoadingMessage('Signing in...');
    const success = await login(username, password);
    if (success) setShowAuthModal(false);
    return success;
  };

  // Loading screen
  if (isLoading || isRefreshLoading) {
    return (
      <div className="spartan-loading-screen">
        <div className="spartan-loader-container">
          <div className="spartan-loader-animation">
            <img 
              src={trackerLogo} 
              alt="TitanTrack" 
              className="app-loading-helmet-size"
              onError={(e) => {
                e.target.style.display = 'none';
                if (e.target.nextElementSibling) {
                  e.target.nextElementSibling.style.display = 'block';
                }
              }}
            />
            <div className="app-loading-helmet-fallback-size" style={{display: 'none'}}>TT</div>
          </div>
          <div className="spartan-loader-message">
            {loadingMessage}
          </div>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <ScrollToTop />
      <ServiceWorkerListener />
      <div className="app-container">
        {/* Toast Notifications - Bottom position, tap to dismiss */}
        <Toaster 
          position="bottom-center"
          containerStyle={{
            bottom: 100, // Above mobile nav
          }}
          toastOptions={{
            duration: 2000,
            style: {
              background: 'rgba(20, 20, 20, 0.95)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              color: '#ffffff',
              border: 'none',
              borderRadius: '12px',
              padding: '10px 16px',
              fontSize: '0.8125rem',
              fontWeight: '500',
              fontFamily: 'Inter, -apple-system, sans-serif',
              boxShadow: '0 4px 24px rgba(0, 0, 0, 0.4)',
              maxWidth: '90vw',
            },
            success: {
              icon: <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#34d399', flexShrink: 0 }} />,
              style: {
                background: 'rgba(20, 20, 20, 0.95)',
              },
            },
            error: {
              icon: <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#f87171', flexShrink: 0 }} />,
              style: {
                background: 'rgba(20, 20, 20, 0.95)',
              },
            },
          }}
        />
        
        {showAuthModal && (
          <AuthModal 
            onClose={() => setShowAuthModal(false)} 
            onLogin={handleLogin}
            loadingMessage={loadingMessage}
          />
        )}
        
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