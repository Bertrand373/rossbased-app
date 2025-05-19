// App.js - Main application component
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, NavLink } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import './App.css';

// Tabs
import Tracker from './components/Tracker/Tracker';
import Calendar from './components/Calendar/Calendar';
import Stats from './components/Stats/Stats';
import DailyMotivation from './components/DailyMotivation/DailyMotivation';
import UrgeToolkit from './components/UrgeToolkit/UrgeToolkit';
import Community from './components/Community/Community';

// Shared components
import AuthModal from './components/Auth/AuthModal';
import SubscriptionBanner from './components/Subscription/SubscriptionBanner';
import MobileNavigation from './components/Navigation/MobileNavigation';

// Mock user data - In a real app, this would come from a backend
import { useUserData } from './hooks/useUserData';

function App() {
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [activeTab, setActiveTab] = useState('tracker');
  const { userData, isLoggedIn, isPremium, login, logout, updateUserData, clearUserData } = useUserData();

  // Monitor screen size for responsive design
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleResetApp = () => {
    // Clear all local storage
    localStorage.clear();
    // Force page reload to reset the app state
    window.location.reload();
  };

  return (
    <Router>
      <div className="app-container">
        <Toaster position="top-center" />
        
        {showAuthModal && (
          <AuthModal 
            onClose={() => setShowAuthModal(false)} 
            onLogin={login}
          />
        )}
        
        <header className="app-header">
          <h1>SR Tracker</h1>
          <div className="user-controls">
            {isLoggedIn ? (
              <div className="user-info">
                <span className="username">{userData.username}</span>
                <button className="logout-btn" onClick={logout}>Logout</button>
                <button 
                  className="reset-btn" 
                  onClick={handleResetApp}
                  style={{ marginLeft: '8px', backgroundColor: '#ef4444' }}
                >
                  Reset App
                </button>
              </div>
            ) : (
              <button className="login-btn" onClick={() => setShowAuthModal(true)}>Login</button>
            )}
          </div>
        </header>
        
        {!isPremium && <SubscriptionBanner />}
        
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
            {isPremium && (
              <NavLink 
                to="/community" 
                className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}
                onClick={() => setActiveTab('community')}>
                Community
              </NavLink>
            )}
          </nav>
        ) : (
          <MobileNavigation 
            activeTab={activeTab} 
            setActiveTab={setActiveTab} 
            isPremium={isPremium}
          />
        )}
        
        <main className="app-content">
          <Routes>
            <Route path="/" element={<Tracker userData={userData} updateUserData={updateUserData} isPremium={isPremium} />} />
            <Route path="/calendar" element={<Calendar userData={userData} isPremium={isPremium} />} />
            <Route path="/stats" element={<Stats userData={userData} isPremium={isPremium} />} />
            <Route path="/motivation" element={<DailyMotivation userData={userData} isPremium={isPremium} />} />
            <Route path="/urge-toolkit" element={<UrgeToolkit userData={userData} updateUserData={updateUserData} isPremium={isPremium} />} />
            <Route path="/community" element={
              isPremium ? <Community userData={userData} /> : <SubscriptionBanner fullPage={true} />
            } />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;