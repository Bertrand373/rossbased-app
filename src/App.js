// App.js - Updated with auth protection
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, NavLink } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import './App.css';

// Tabs
import Tracker from './components/Tracker/Tracker';
import Calendar from './components/Calendar/Calendar';
import Stats from './components/Stats/Stats';
import DailyMotivation from './components/DailyMotivation/DailyMotivation';
import UrgeToolkit from './components/UrgeToolkit/UrgeToolkit';
import Community from './components/Community/Community';
import Landing from './components/Landing/Landing';

// Shared components
import AuthModal from './components/Auth/AuthModal';
import SubscriptionBanner from './components/Subscription/SubscriptionBanner';
import MobileNavigation from './components/Navigation/MobileNavigation';

// User data hook
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

  // Auth protection component
  const ProtectedRoute = ({ children }) => {
    if (!isLoggedIn) {
      return <Navigate to="/welcome" replace />;
    }
    
    return children;
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
        
        <Routes>
          {/* Landing/Welcome Page */}
          <Route path="/welcome" element={<Landing onLogin={login} />} />
          
          {/* Protected Routes */}
          <Route path="/" element={
            isLoggedIn ? (
              <div className="main-app">
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
                  <Tracker userData={userData} updateUserData={updateUserData} isPremium={isPremium} />
                </main>
              </div>
            ) : (
              <Navigate to="/welcome" replace />
            )
          } />
          
          <Route path="/calendar" element={
            <ProtectedRoute>
              <div className="main-app">
                <header className="app-header">
                  <h1>SR Tracker</h1>
                  <div className="user-controls">
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
                  <Calendar userData={userData} isPremium={isPremium} />
                </main>
              </div>
            </ProtectedRoute>
          } />
          
          <Route path="/stats" element={
            <ProtectedRoute>
              <div className="main-app">
                <header className="app-header">
                  <h1>SR Tracker</h1>
                  <div className="user-controls">
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
                  <Stats userData={userData} isPremium={isPremium} />
                </main>
              </div>
            </ProtectedRoute>
          } />
          
          <Route path="/motivation" element={
            <ProtectedRoute>
              <div className="main-app">
                <header className="app-header">
                  <h1>SR Tracker</h1>
                  <div className="user-controls">
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
                  <DailyMotivation userData={userData} isPremium={isPremium} />
                </main>
              </div>
            </ProtectedRoute>
          } />
          
          <Route path="/urge-toolkit" element={
            <ProtectedRoute>
              <div className="main-app">
                <header className="app-header">
                  <h1>SR Tracker</h1>
                  <div className="user-controls">
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
                  <UrgeToolkit userData={userData} updateUserData={updateUserData} isPremium={isPremium} />
                </main>
              </div>
            </ProtectedRoute>
          } />
          
          <Route path="/community" element={
            <ProtectedRoute>
              <div className="main-app">
                <header className="app-header">
                  <h1>SR Tracker</h1>
                  <div className="user-controls">
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
                  {isPremium ? <Community userData={userData} /> : <SubscriptionBanner fullPage={true} />}
                </main>
              </div>
            </ProtectedRoute>
          } />
          
          {/* Default redirect to Welcome page */}
          <Route path="*" element={<Navigate to={isLoggedIn ? "/" : "/welcome"} replace />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;