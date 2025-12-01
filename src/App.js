// App.js - TITANTRACK MODERN MINIMAL
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import './App.css';
import trackerLogo from './assets/trackerapplogo.png';

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

// Profile Button - Desktop
const ProfileButton = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  const isActive = location.pathname === '/profile';
  
  return (
    <button 
      className={`profile-btn ${isActive ? 'active' : ''}`} 
      onClick={() => navigate('/profile')} 
      title="Profile"
    >
      <FaUser />
      <span>Profile</span>
    </button>
  );
};

// Profile Button - Mobile (icon only)
const MobileProfileButton = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  const isActive = location.pathname === '/profile';
  
  return (
    <button 
      className={`profile-btn ${isActive ? 'active' : ''}`} 
      onClick={() => navigate('/profile')} 
      title="Profile"
    >
      <FaUser />
    </button>
  );
};

// Desktop Navigation
const HeaderNavigation = () => {
  const navItems = [
    { path: '/', icon: FaHome, label: 'Tracker' },
    { path: '/calendar', icon: FaCalendarAlt, label: 'Calendar' },
    { path: '/stats', icon: FaChartBar, label: 'Stats' },
    { path: '/timeline', icon: FaMapSigns, label: 'Timeline' },
    { path: '/urge-toolkit', icon: FaShieldAlt, label: 'Urges' }
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
            <item.icon />
            <span>{item.label}</span>
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
        <Toaster 
          position="top-center"
          toastOptions={{
            duration: 3000,
            style: {
              background: '#141414',
              color: '#ffffff',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '8px',
              padding: '12px 16px',
              fontSize: '14px',
              fontFamily: 'Inter, -apple-system, sans-serif',
            },
            success: {
              style: { borderLeft: '3px solid #34d399' },
              iconTheme: { primary: '#34d399', secondary: '#000' },
            },
            error: {
              style: { borderLeft: '3px solid #f87171' },
              iconTheme: { primary: '#f87171', secondary: '#fff' },
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
              {!isMobile ? (
                <>
                  <div className="logo-container">
                    <img src={trackerLogo} alt="TitanTrack" className="app-logo" />
                  </div>
                  <HeaderNavigation />
                  <div className="user-controls">
                    <ProfileButton />
                    <button className="logout-btn" onClick={logout} title="Sign out">
                      <FaPowerOff />
                      <span>Sign out</span>
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="logo-container">
                    <img src={trackerLogo} alt="TitanTrack" className="app-logo" />
                  </div>
                  <div className="mobile-user-controls">
                    <MobileProfileButton />
                    <button className="logout-btn" onClick={logout} title="Sign out">
                      <FaPowerOff />
                    </button>
                  </div>
                </>
              )}
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