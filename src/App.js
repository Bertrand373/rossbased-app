// App.js - Replaced text logo with image
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, NavLink } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import './App.css';
import logo from './assets/logo.png'; // Import logo image

// Tabs
import Tracker from './components/Tracker/Tracker';
import Calendar from './components/Calendar/Calendar';
import Stats from './components/Stats/Stats';
// import DailyMotivation from './components/DailyMotivation/DailyMotivation';
import UrgeToolkit from './components/UrgeToolkit/UrgeToolkit';
import Community from './components/Community/Community';

// Shared components
import AuthModal from './components/Auth/AuthModal';
import SubscriptionBanner from './components/Subscription/SubscriptionBanner';
import MobileNavigation from './components/Navigation/MobileNavigation';

// Custom hooks
import { useUserData } from './hooks/useUserData';

function App() {
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [activeTab, setActiveTab] = useState('tracker');
  const { userData, isLoggedIn, isPremium, login, logout, updateUserData } = useUserData();

  // Monitor screen size for responsive design
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <Router>
      <div className="app-container">
        <Toaster 
          position="top-center" 
          toastOptions={{
            style: {
              background: '#1a1a1a',
              color: '#f9fafb',
              border: '1px solid #2a2a2a'
            },
          }}
        />
        
        {showAuthModal && (
          <AuthModal 
            onClose={() => setShowAuthModal(false)} 
            onLogin={login}
          />
        )}
        
        <div className="app-top-section">
          <header className="app-header">
            <img src={logo} alt="Titantrack Logo" className="app-logo" />
            <div className="user-controls">
              {isLoggedIn ? (
                <div className="user-info">
                  <span className="username">{userData.username}</span>
                  <button className="logout-btn" onClick={logout}>Logout</button>
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
        </div>
        
        <main className="app-content">
          <Routes>
            <Route path="/" element={<Tracker userData={userData} updateUserData={updateUserData} isPremium={isPremium} />} />
            <Route path="/calendar" element={<Calendar userData={userData} isPremium={isPremium} />} />
            <Route path="/stats" element={<Stats userData={userData} isPremium={isPremium} />} />
            <Route path="/urge-toolkit" element={<UrgeToolkit userData={userData} isPremium={isPremium} updateUserData={updateUserData} />} />
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