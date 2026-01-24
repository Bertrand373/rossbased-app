// App.js - TITANTRACK MODERN MINIMAL
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { Toaster, toast } from 'react-hot-toast';
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

// AI Prediction Display (PatternInsightCard handles floating alerts, this handles full view)
import PredictionDisplay from './components/PredictionDisplay/PredictionDisplay';

// Shared components
import AuthModal from './components/Auth/AuthModal';
import DiscordCallback from './components/Auth/DiscordCallback';
import SubscriptionBanner from './components/Subscription/SubscriptionBanner';
import MobileNavigation from './components/Navigation/MobileNavigation';
import InstallPrompt from './components/InstallPrompt/InstallPrompt';
import AIChat from './components/AIChat/AIChat';

// Custom hook for user data
import { useUserData } from './hooks/useUserData';

// AMBIENT AI HOOKS - Auto-train only (risk indicator removed, floating card handles alerts)
import { useAutoTrain } from './hooks/useAutoTrain';

// Mixpanel Analytics
import { initMixpanel, identifyUser, trackAppOpen, trackPageView, trackLogout, resetMixpanel } from './utils/mixpanel';

// AI Chat Header Button - Minimal, matches profile circle style
const AIChatButton = ({ onClick }) => {
  return (
    <button 
      className="ai-chat-header-btn"
      onClick={onClick}
      aria-label="AI Mentor"
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2L14.09 8.26L20 9.27L15.55 13.97L16.91 20L12 16.9L7.09 20L8.45 13.97L4 9.27L9.91 8.26L12 2Z" fill="currentColor"/>
      </svg>
    </button>
  );
};

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

// Navigate to root when logged out (fixes black screen on sign out)
// EXCLUDES auth callback paths to allow OAuth flow to complete
const LogoutRedirect = ({ isLoggedIn }) => {
  const navigate = useNavigate();
  const location = useLocation();
  
  useEffect(() => {
    // Don't redirect if on an auth callback path - let OAuth complete
    const isAuthCallback = location.pathname.startsWith('/auth/');
    
    // If user is logged out and not on root or auth callback, redirect to root
    if (!isLoggedIn && location.pathname !== '/' && !isAuthCallback) {
      navigate('/', { replace: true });
    }
  }, [isLoggedIn, location.pathname, navigate]);
  
  return null;
};

// Mixpanel Analytics Tracker - handles init, user ID, and page views
const MixpanelTracker = ({ isLoggedIn, userData }) => {
  const location = useLocation();
  const hasInitialized = React.useRef(false);
  const hasIdentified = React.useRef(false);
  const previousPath = React.useRef(null);

  // Initialize Mixpanel once on first render
  useEffect(() => {
    if (!hasInitialized.current) {
      initMixpanel();
      trackAppOpen();
      hasInitialized.current = true;
      console.log('📊 Mixpanel initialized');
    }
  }, []);

  // Identify user when logged in
  useEffect(() => {
    if (isLoggedIn && userData?.email && !hasIdentified.current) {
      identifyUser(userData.email, {
        email: userData.email,
        username: userData.username,
        isPremium: userData.isPremium || false,
        createdAt: userData.createdAt,
        currentStreak: userData.currentStreak || 0,
        longestStreak: userData.longestStreak || 0,
        totalCheckIns: userData.totalCheckIns || 0,
        relapseCount: userData.relapseCount || 0
      });
      hasIdentified.current = true;
      console.log('📊 User identified:', userData.email);
    }
    
    // Reset on logout
    if (!isLoggedIn && hasIdentified.current) {
      hasIdentified.current = false;
    }
  }, [isLoggedIn, userData]);

  // Track page views on route change
  useEffect(() => {
    if (isLoggedIn && location.pathname !== previousPath.current) {
      const pageMap = {
        '/': 'Tracker',
        '/calendar': 'Calendar',
        '/stats': 'Stats',
        '/timeline': 'Timeline',
        '/urge-toolkit': 'Urge Toolkit',
        '/profile': 'Profile',
        '/urge-prediction': 'AI Prediction'
      };
      
      const pageName = pageMap[location.pathname] || location.pathname;
      trackPageView(pageName);
      previousPath.current = location.pathname;
    }
  }, [location.pathname, isLoggedIn]);

  return null;
};

function App() {
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [activeTab, setActiveTab] = useState('tracker');
  const [shouldNavigateToTracker, setShouldNavigateToTracker] = useState(false);
  const [showAIChat, setShowAIChat] = useState(false);
  
  const [isRefreshLoading, setIsRefreshLoading] = useState(() => {
    return localStorage.getItem('isLoggedIn') === 'true';
  });
  const [loadingMessage, setLoadingMessage] = useState('Loading...');
  
  // Minimum loading screen duration for smooth UX (prevents flash)
  const [minLoadingComplete, setMinLoadingComplete] = useState(false);
  
  useEffect(() => {
    const timer = setTimeout(() => setMinLoadingComplete(true), 600);
    return () => clearTimeout(timer);
  }, []);
  
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

  // Show logout/account deleted message after redirect
  useEffect(() => {
    const logoutMessage = sessionStorage.getItem('logoutMessage');
    if (logoutMessage) {
      toast.success(logoutMessage);
      sessionStorage.removeItem('logoutMessage');
    }
  }, []);

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
  // Shows until BOTH data is loaded AND minimum display time has passed
  if (isLoading || isRefreshLoading || !minLoadingComplete) {
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
      <MixpanelTracker isLoggedIn={isLoggedIn} userData={userData} />
      <PostLoginNavigator 
        shouldNavigate={shouldNavigateToTracker} 
        onNavigated={() => setShouldNavigateToTracker(false)} 
      />
      <LogoutRedirect isLoggedIn={isLoggedIn} />
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
        {/* Landscape Blocker - Portrait Only */}
        <div className="landscape-blocker">
          <div className="landscape-blocker-icon">
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="14" y="6" width="20" height="36" rx="3" stroke="currentColor" strokeWidth="2"/>
              <line x1="14" y1="12" x2="34" y2="12" stroke="currentColor" strokeWidth="1.5" opacity="0.3"/>
              <line x1="14" y1="36" x2="34" y2="36" stroke="currentColor" strokeWidth="1.5" opacity="0.3"/>
              <circle cx="24" cy="40" r="2" fill="currentColor" opacity="0.4"/>
            </svg>
          </div>
          <p className="landscape-blocker-text">Rotate to Portrait</p>
          <p className="landscape-blocker-subtext">TitanTrack is optimized for vertical viewing</p>
        </div>

        {isLoggedIn ? (
          <>
            <header className="app-header">
              <div className="logo-container">
                <img src={trackerLogo} alt="TitanTrack" className="app-logo" />
              </div>
              
              {!isMobile && <HeaderNavigation />}
              
              <div className="header-actions">
                <AIChatButton onClick={() => setShowAIChat(true)} />
                <ProfileButton userData={userData} />
              </div>
            </header>
            
            {isMobile && (
              <MobileNavigation 
                activeTab={activeTab} 
                setActiveTab={setActiveTab}
              />
            )}
            
            {/* PWA Install Prompt - shows after first check-in or 3rd visit */}
            <InstallPrompt 
              triggerAfterCheckIns={1}
              triggerAfterVisits={3}
              currentCheckIns={userData?.totalCheckIns || 0}
            />
            
            {/* AI Chat - Now controlled by header button */}
            <AIChat 
              isLoggedIn={isLoggedIn} 
              isOpen={showAIChat}
              onClose={() => setShowAIChat(false)}
            />
            
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
                  <Route path="*" element={<Navigate to="/" />} />
                </Routes>
              </div>
            </main>
          </>
        ) : (
          <Routes>
            <Route path="/auth/discord/callback" element={<DiscordCallback onLogin={handleLogin} />} />
            <Route path="*" element={<Landing onLogin={handleLogin} />} />
          </Routes>
        )}
      </div>
    </Router>
  );
}

export default App;
