// App.js - Main application component with proper navigation and Landing component
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, NavLink } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import './App.css';
import trackerLogo from './assets/trackerapplogo.png';

// Tabs
import Tracker from './components/Tracker/Tracker';
import Calendar from './components/Calendar/Calendar';
import Stats from './components/Stats/Stats';
import DailyMotivation from './components/DailyMotivation/DailyMotivation';
import UrgeToolkit from './components/UrgeToolkit/UrgeToolkit';
import Landing from './components/Landing/Landing'; // Use your existing Landing component

// Shared components
import AuthModal from './components/Auth/AuthModal';
import SubscriptionBanner from './components/Subscription/SubscriptionBanner';
import MobileNavigation from './components/Navigation/MobileNavigation';

// Custom hook for user data
import { useUserData } from './hooks/useUserData';

function App() {
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [activeTab, setActiveTab] = useState('tracker');
  const { userData, isLoggedIn, isPremium, isLoading, login, logout, updateUserData } = useUserData();

  // Monitor screen size for responsive design
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Handle login
  const handleLogin = async (username, password) => {
    const success = await login(username, password);
    if (success) {
      setShowAuthModal(false);
    }
    return success;
  };

  return (
    <Router>
      <div className="app-container">
        <Toaster position="top-center" />
        
        {showAuthModal && (
          <AuthModal 
            onClose={() => setShowAuthModal(false)} 
            onLogin={handleLogin}
          />
        )}
        
        {isLoading && (
          <div className="loading-overlay">
            <div className="loading-container">
              <div className="loading-spinner">
                <div className="spinner-inner"></div>
              </div>
              <p className="loading-message">Logging you in...</p>
            </div>
          </div>
        )}
        
        {isLoggedIn ? (
          // Show main app UI if logged in
          <>
            <header className="app-header">
              <div className="logo-container">
                <img src={trackerLogo} alt="Tracker App Logo" className="app-logo" />
              </div>
              <div className="user-controls">
                <div className="user-info">
                  <span className="username">{userData.username}</span>
                  <button className="logout-btn" onClick={logout}>Logout</button>
                </div>
              </div>
            </header>
            
            {/* Banner hidden while all features are free */}
            {/* {!isPremium && <SubscriptionBanner />} */}
            
            {!isMobile ? (
              <nav className="desktop-nav">
                <NavLink 
                  to="/" 
                  className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}
                  onClick={() => setActiveTab('tracker')}>
                  Tracker
                </NavLink>
                <NavLink 
                  to="/calendar" 
                  className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}
                  onClick={() => setActiveTab('calendar')}>
                  Calendar
                </NavLink>
                <NavLink 
                  to="/stats" 
                  className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}
                  onClick={() => setActiveTab('stats')}>
                  Stats
                </NavLink>
                <NavLink 
                  to="/motivation" 
                  className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}
                  onClick={() => setActiveTab('motivation')}>
                  Daily Motivation
                </NavLink>
                <NavLink 
                  to="/urge-toolkit" 
                  className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}
                  onClick={() => setActiveTab('urge-toolkit')}>
                  Urge Toolkit
                </NavLink>
              </nav>
            ) : (
              <MobileNavigation 
                activeTab={activeTab} 
                setActiveTab={setActiveTab} 
                isPremium={false}
              />
            )}
            
            <main className="app-content">
              <Routes>
                <Route path="/" element={<Tracker userData={userData} updateUserData={updateUserData} isPremium={isPremium} />} />
                <Route path="/calendar" element={<Calendar userData={userData} isPremium={isPremium} />} />
                <Route path="/stats" element={<Stats userData={userData} isPremium={isPremium} updateUserData={updateUserData} />} />
                <Route path="/motivation" element={<DailyMotivation userData={userData} isPremium={isPremium} />} />
                <Route path="/urge-toolkit" element={<UrgeToolkit userData={userData} isPremium={isPremium} updateUserData={updateUserData} />} />
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