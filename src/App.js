// App.js - Updated with Profile Component and improved profile button functionality
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import './App.css';
import trackerLogo from './assets/trackerapplogo.png';

// Icons for header - UPDATED: Added navigation icons
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
  const [activeTab, setActiveTab] = useState('tracker');
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  
  const { userData, isLoggedIn, loading, updateUserData, login, logout, isPremium } = useUserData();

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleLogin = (loginData) => {
    login(loginData);
    setIsAuthOpen(false);
  };

  if (loading) {
    return (
      <div className="app-container">
        <SpartanLoader message="Loading your tracker..." />
      </div>
    );
  }

  return (
    <Router>
      <Toaster 
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: 'var(--card-background)',
            color: 'var(--text)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
            padding: 'var(--spacing-md) var(--spacing-lg)',
            fontWeight: '500',
            fontSize: '0.875rem',
          },
        }}
      />
      
      <div className="app-container">
        {isLoggedIn ? (
          <>
            <header className="app-header">
              {!isMobile ? (
                // Desktop Layout - Single row with proper grid
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
                        <FaHome className="nav-link-icon" />
                        <span>Tracker</span>
                      </NavLink>
                      <NavLink 
                        to="/calendar" 
                        className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}
                        onClick={() => setActiveTab('calendar')}>
                        <FaCalendarAlt className="nav-link-icon" />
                        <span>Calendar</span>
                      </NavLink>
                      <NavLink 
                        to="/stats" 
                        className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}
                        onClick={() => setActiveTab('stats')}>
                        <FaChartBar className="nav-link-icon" />
                        <span>Stats</span>
                      </NavLink>
                      <NavLink 
                        to="/timeline" 
                        className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}
                        onClick={() => setActiveTab('timeline')}>
                        <FaMapSigns className="nav-link-icon" />
                        <span>Timeline</span>
                      </NavLink>
                      <NavLink 
                        to="/urge-toolkit" 
                        className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}
                        onClick={() => setActiveTab('urge-toolkit')}>
                        <FaShieldAlt className="nav-link-icon" />
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
                <Route path="/" element={<Tracker userData={userData} updateUserData={updateUserData} isPremium={isPremium} />} />
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
        
        {/* Auth Modal */}
        {isAuthOpen && (
          <AuthModal 
            isOpen={isAuthOpen} 
            onClose={() => setIsAuthOpen(false)} 
            onLogin={handleLogin}
          />
        )}
      </div>
    </Router>
  );
}

export default App;