// App.js - TITANTRACK COMMAND CENTER
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

// Import UNIFIED PredictionDisplay (replaces UrgePrediction)
import PredictionDisplay from './components/PredictionDisplay/PredictionDisplay';
import MLTraining from './components/MLTraining/MLTraining';

// Shared components
import AuthModal from './components/Auth/AuthModal';
import SubscriptionBanner from './components/Subscription/SubscriptionBanner';
import MobileNavigation from './components/Navigation/MobileNavigation';
import SpartanLoader from './components/Shared/SpartanLoader';

// Custom hook for user data
import { useUserData } from './hooks/useUserData';

// Profile Button Component - Desktop (with text)
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

// Mobile Profile Button - Icon only
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

// Header Navigation - Desktop only (Sharp segmented tabs)
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

const ScrollToTop = () => {
  const location = useLocation();

  useEffect(() => {
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: 'instant'
    });
  }, [location.pathname]);

  return null;
};

const ServiceWorkerListener = () => {
  const navigate = useNavigate();

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'NAVIGATE_TO_PREDICTION') {
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
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  
  const [isRefreshLoading, setIsRefreshLoading] = useState(() => {
    const storedIsLoggedIn = localStorage.getItem('isLoggedIn');
    return storedIsLoggedIn === 'true';
  });
  const [loadingMessage, setLoadingMessage] = useState('Loading your dashboard...');
  
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
    const handleResize = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    setIsInitialLoading(false);
  }, []);

  useEffect(() => {
    if (isRefreshLoading) {
      const timer = setTimeout(() => {
        setIsRefreshLoading(false);
      }, 1200);
      
      return () => clearTimeout(timer);
    }
  }, []);

  const handleLogin = async (username, password) => {
    setLoadingMessage('Logging you in...');
    
    const loginPromise = login(username, password);
    
    setTimeout(() => {
      setLoadingMessage('Loading your dashboard...');
    }, 800);
    
    const success = await loginPromise;
    
    if (success) {
      setShowAuthModal(false);
    }
    return success;
  };

  // Loading screen
  if (isLoading || isRefreshLoading) {
    return (
      <div className="spartan-loading-screen">
        <div className="spartan-loader-container">
          <div className="spartan-loader-animation">
            <img 
              src={helmetImage} 
              alt="Loading" 
              className="spartan-helmet-image app-loading-helmet-size"
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.nextElementSibling.style.display = 'block';
              }}
            />
            <div className="spartan-helmet-image app-loading-helmet-fallback-size" style={{display: 'none'}}>⚡</div>
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
            duration: 4000,
            style: {
              background: '#161616',
              color: '#ffffff',
              border: '1px solid #2a2a2a',
              borderRadius: '4px',
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.5)',
              padding: '12px 16px',
              fontWeight: '500',
              fontSize: '14px',
              fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
            },
            success: {
              style: {
                borderLeft: '3px solid #00c853',
              },
              iconTheme: {
                primary: '#00c853',
                secondary: '#000000',
              },
            },
            error: {
              style: {
                borderLeft: '3px solid #ff3d3d',
              },
              iconTheme: {
                primary: '#ff3d3d',
                secondary: '#ffffff',
              },
            },
            loading: {
              style: {
                borderLeft: '3px solid #ffdd00',
              },
              iconTheme: {
                primary: '#ffdd00',
                secondary: '#000000',
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
            {/* HEADER - Command Bar */}
            <header className="app-header">
              {!isMobile ? (
                /* DESKTOP: Logo | Navigation | Controls */
                <>
                  <div className="logo-container">
                    <img src={trackerLogo} alt="TitanTrack" className="app-logo" />
                  </div>
                  
                  <HeaderNavigation />
                  
                  <div className="user-controls">
                    <ProfileButton />
                    <button className="logout-btn" onClick={logout} title="Logout">
                      <FaPowerOff />
                      <span>Logout</span>
                    </button>
                  </div>
                </>
              ) : (
                /* MOBILE: Logo | Controls (single row) */
                <>
                  <div className="logo-container">
                    <img src={trackerLogo} alt="TitanTrack" className="app-logo" />
                  </div>
                  <div className="mobile-user-controls">
                    <MobileProfileButton />
                    <button className="logout-btn" onClick={logout} title="Logout">
                      <FaPowerOff />
                    </button>
                  </div>
                </>
              )}
            </header>
            
            {/* Bottom Navigation - Mobile only */}
            {isMobile && (
              <MobileNavigation 
                activeTab={activeTab} 
                setActiveTab={setActiveTab} 
                isPremium={false}
              />
            )}
            
            {/* Main Content Area */}
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
                  <Route path="/calendar" element={<Calendar userData={userData} isPremium={isPremium} updateUserData={updateUserData} />} />
                  <Route path="/stats" element={<Stats userData={userData} isPremium={isPremium} updateUserData={updateUserData} />} />
                  <Route path="/timeline" element={<EmotionalTimeline userData={userData} isPremium={isPremium} updateUserData={updateUserData} />} />
                  <Route path="/urge-toolkit" element={<UrgeToolkit userData={userData} isPremium={isPremium} updateUserData={updateUserData} />} />
                  <Route path="/profile" element={<Profile userData={userData} isPremium={isPremium} updateUserData={updateUserData} onLogout={logout} />} />
                  <Route path="/urge-prediction" element={<PredictionDisplay mode="full" userData={userData} />} />
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