// App.js - UPDATED: Added goal functions from useUserData hook
import React, { useState, useEffect } from 'react';
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

function App() {
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [activeTab, setActiveTab] = useState('tracker');
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  
  // UPDATED: Destructure goal functions from useUserData hook
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

  // Monitor screen size for responsive design
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Handle initial app loading (for page refreshes)
  useEffect(() => {
    // Simulate checking authentication state
    const timer = setTimeout(() => {
      setIsInitialLoading(false);
    }, 1500); // Show helmet for 1.5 seconds on page load/refresh

    return () => clearTimeout(timer);
  }, []);

  // Handle login
  const handleLogin = async (username, password) => {
    const success = await login(username, password);
    if (success) {
      setShowAuthModal(false);
    }
    return success;
  };

  // FIXED: Keep original SpartanLoader within grey container - just update the helmet
  if (isLoading || isInitialLoading) {
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
            {isLoading ? "Logging you in..." : "Loading your dashboard..."}
          </div>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <div className="app-container">
        <Toaster 
          position="top-center"
          toastOptions={{
            // Default options for all toasts
            duration: 4000,
            style: {
              background: 'linear-gradient(135deg, #2c2c2c 0%, #333333 100%)',
              color: '#ffffff',
              border: '1px solid #444444',
              borderRadius: '12px',
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
              padding: '16px 20px',
              fontWeight: '500',
              fontSize: '14px',
              minWidth: '300px',
              maxWidth: '400px',
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            },
            // Success toasts
            success: {
              style: {
                borderLeft: '4px solid #22c55e',
              },
              iconTheme: {
                primary: '#22c55e',
                secondary: '#ffffff',
              },
            },
            // Error toasts
            error: {
              style: {
                borderLeft: '4px solid #ef4444',
              },
              iconTheme: {
                primary: '#ef4444',
                secondary: '#ffffff',
              },
            },
            // Loading toasts
            loading: {
              style: {
                borderLeft: '4px solid #ffdd00',
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
          />
        )}
        
        {isLoggedIn ? (
          // Show main app UI if logged in
          <>
            <header className="app-header">
              {!isMobile ? (
                // Desktop Layout - Logo, Navigation, User Controls
                <>
                  <div className="logo-container">
                    <img src={trackerLogo} alt="Tracker App Logo" className="app-logo" />
                  </div>
                  
                  <nav className="header-nav">
                    <div className="nav-container">
                      <NavLink 
                        to="/" 
                        className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}
                        onClick={() => setActiveTab('tracker')}>
                        <FaHome />
                        <span>Tracker</span>
                      </NavLink>
                      <NavLink 
                        to="/calendar" 
                        className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}
                        onClick={() => setActiveTab('calendar')}>
                        <FaCalendarAlt />
                        <span>Calendar</span>
                      </NavLink>
                      <NavLink 
                        to="/stats" 
                        className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}
                        onClick={() => setActiveTab('stats')}>
                        <FaChartBar />
                        <span>Stats</span>
                      </NavLink>
                      <NavLink 
                        to="/timeline" 
                        className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}
                        onClick={() => setActiveTab('timeline')}>
                        <FaMapSigns />
                        <span>Timeline</span>
                      </NavLink>
                      <NavLink 
                        to="/urge-toolkit" 
                        className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}
                        onClick={() => setActiveTab('urge-toolkit')}>
                        <FaShieldAlt />
                        <span>Urge Toolkit</span>
                      </NavLink>
                    </div>
                  </nav>
                  
                  <div className="user-controls">
                    <ProfileButton />
                    <button className="logout-btn" onClick={logout} title="Logout">
                      <FaPowerOff />
                      <span>Logout</span>
                    </button>
                  </div>
                </>
              ) : (
                // Mobile Layout - Two rows
                <>
                  <div className="header-top-row">
                    <div className="logo-container">
                      <img src={trackerLogo} alt="Tracker App Logo" className="app-logo" />
                    </div>
                    <div className="mobile-user-controls">
                      <MobileProfileButton />
                      <button className="logout-btn" onClick={logout} title="Logout">
                        <FaPowerOff />
                      </button>
                    </div>
                  </div>
                  <div className="header-bottom-row">
                    <span className="mobile-username">{userData.username}</span>
                  </div>
                </>
              )}
            </header>
            
            {/* Banner hidden while all features are free */}
            {/* {!isPremium && <SubscriptionBanner />} */}
            
            {/* Mobile Navigation */}
            {isMobile && (
              <MobileNavigation 
                activeTab={activeTab} 
                setActiveTab={setActiveTab} 
                isPremium={false}
              />
            )}
            
            <main className="app-content">
              <Routes>
                {/* UPDATED: Pass goal functions to Tracker component */}
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
                <Route path="*" element={<Navigate to="/" />} />
              </Routes>
            </main>
          </>
        ) : (
          // Show landing page if not logged in
          <Routes>
            <Route path="*" element={<Landing onLogin={handleLogin} />} />
          </Routes>
        )}
      </div>
    </Router>
  );
}

export default App;