// App.js - TITANTRACK MODERN MINIMAL
import React, { useState, useEffect, createContext, useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { Toaster, toast } from 'react-hot-toast';
import './App.css';

// Theme-aware logo imports
import trackerLogoWhite from './assets/trackerapplogo-white.png';
import trackerLogoBlack from './assets/trackerapplogo-black.png';

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
import MobileNavigation from './components/Navigation/MobileNavigation';
import InstallPrompt from './components/InstallPrompt/InstallPrompt';
import AIChat from './components/AIChat/AIChat';
import AdminCockpit from './components/Admin/AdminCockpit';

// Custom hook for user data
import { useUserData } from './hooks/useUserData';
import { useSubscription } from './hooks/useSubscription';
import PaywallScreen from './components/Subscription/PaywallScreen';
import DiscordLinkCallback from './components/Auth/DiscordLinkCallback';

// AMBIENT AI HOOKS - Auto-train only (risk indicator removed, floating card handles alerts)
import { useAutoTrain } from './hooks/useAutoTrain';

// Mixpanel Analytics
import { initMixpanel, identifyUser, trackAppOpen, trackPageView, trackLogout, resetMixpanel } from './utils/mixpanel';

// =============================================================================
// THEME CONTEXT - Manages light/dark theme across the app
// =============================================================================
const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

const ThemeProvider = ({ children }) => {
  // Initialize from localStorage (matches index.html initialization)
  const [theme, setThemeState] = useState(() => {
    return localStorage.getItem('titantrack-theme') || 'dark';
  });

  // Apply theme to document and update localStorage
  const setTheme = (newTheme) => {
    setThemeState(newTheme);
    localStorage.setItem('titantrack-theme', newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
    
    // Update theme-color meta tag for browser chrome
    const themeColorMeta = document.getElementById('theme-color-meta');
    if (themeColorMeta) {
      themeColorMeta.setAttribute('content', newTheme === 'light' ? '#ffffff' : '#000000');
    }
  };

  // Toggle between themes
  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  // Sync with document on mount (in case localStorage changed externally)
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

// Profile Button - Discord avatar with initial fallback
const ProfileButton = ({ userData }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const isActive = location.pathname === '/profile';
  
  // Get first initial from username or email as fallback
  const initial = userData?.username?.charAt(0)?.toUpperCase() || 
                  userData?.email?.charAt(0)?.toUpperCase() || 
                  '?';
  
  // Build Discord avatar URL if available
  const getDiscordAvatarUrl = () => {
    const { discordId, discordAvatar } = userData || {};
    if (discordAvatar && discordId) {
      const extension = discordAvatar.startsWith('a_') ? 'gif' : 'png';
      return `https://cdn.discordapp.com/avatars/${discordId}/${discordAvatar}.${extension}?size=64`;
    }
    return null;
  };
  
  const avatarUrl = getDiscordAvatarUrl();
  
  return (
    <button 
      className={`profile-circle ${isActive ? 'active' : ''} ${avatarUrl ? 'has-avatar' : ''}`} 
      onClick={() => navigate('/profile')} 
      aria-label="Profile"
    >
      {avatarUrl ? (
        <img src={avatarUrl} alt="" className="profile-circle-img" />
      ) : (
        initial
      )}
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
    const staticRoutes = [];
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
    // Only track if path actually changed
    if (previousPath.current !== location.pathname) {
      trackPageView(location.pathname);
      previousPath.current = location.pathname;
    }
  }, [location.pathname]);

  return null;
};

// ActivityTracker — page views + heartbeat for real-time admin analytics
const ActivityTracker = ({ isLoggedIn, username }) => {
  const location = useLocation();
  useEffect(() => {
    if (!isLoggedIn || !username) return;
    const API = process.env.REACT_APP_API_URL || 'https://rossbased-app.onrender.com';
    const token = localStorage.getItem('token');
    // Session ID persists per browser tab session
    let sid = sessionStorage.getItem('tt_sid');
    if (!sid) { sid = Date.now().toString(36) + Math.random().toString(36).slice(2, 8); sessionStorage.setItem('tt_sid', sid); }
    // Send page view
    const page = location.pathname;
    if (page && page !== '/auth/discord/callback' && page !== '/auth/discord/link-callback') {
      fetch(`${API}/api/track`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ page, sessionId: sid })
      }).catch(() => {});
    }
  }, [location.pathname, isLoggedIn, username]);

  // Heartbeat every 5 min for presence
  useEffect(() => {
    if (!isLoggedIn || !username) return;
    const API = process.env.REACT_APP_API_URL || 'https://rossbased-app.onrender.com';
    const token = localStorage.getItem('token');
    const ping = () => {
      fetch(`${API}/api/user/${username}/heartbeat`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
      }).catch(() => {});
    };
    ping();
    const interval = setInterval(ping, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [isLoggedIn, username]);

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

  // Subscription state - determines if user sees the app or the paywall
  const {
    isPremium: hasSubscription,
    isGrandfathered,
    isTrial,
    trialDaysLeft,
    isLoading: subLoading,
    hasUsedTrial,
    subscriptionStatus,
    startTrial,
    createCheckout,
    openPortal,
    fetchStatus: refreshSubscription
  } = useSubscription(isLoggedIn);

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

  // Detect auth callback — loading must stay up during entire OAuth flow
  const isAuthCallback = window.location.pathname.startsWith('/auth/');

  // App ready = everything resolved. One flag, one transition.
  const appReady = !isLoading && !isRefreshLoading && minLoadingComplete && 
    (!isLoggedIn || subscriptionStatus.reason !== 'loading') &&
    !isAuthCallback;

  // Control the SINGLE loading icon — the one from index.html.
  // React never renders its own. Zero handoffs. Zero animation phase mismatches.
  useEffect(() => {
    const loader = document.getElementById('initial-loader');
    if (!loader) return;
    
    if (appReady) {
      loader.style.transition = 'opacity 0.3s ease';
      loader.style.opacity = '0';
      loader.style.pointerEvents = 'none';
      setTimeout(() => {
        if (loader.parentNode) loader.parentNode.removeChild(loader);
      }, 300);
    }
  }, [appReady]);

  return (
    <ThemeProvider>
      <AppContent 
        isLoggedIn={isLoggedIn}
        userData={userData}
        isPremium={isPremium}
        updateUserData={updateUserData}
        setGoal={setGoal}
        cancelGoal={cancelGoal}
        logout={logout}
        handleLogin={handleLogin}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        shouldNavigateToTracker={shouldNavigateToTracker}
        setShouldNavigateToTracker={setShouldNavigateToTracker}
        showAIChat={showAIChat}
        setShowAIChat={setShowAIChat}
        isMobile={isMobile}
        hasSubscription={hasSubscription}
        isGrandfathered={isGrandfathered}
        isTrial={isTrial}
        trialDaysLeft={trialDaysLeft}
        subLoading={subLoading}
        hasUsedTrial={hasUsedTrial}
        subscriptionStatus={subscriptionStatus}
        startTrial={startTrial}
        createCheckout={createCheckout}
        openPortal={openPortal}
        refreshSubscription={refreshSubscription}
      />
    </ThemeProvider>
  );
}

// Separated to use theme context
function AppContent({ 
  isLoggedIn, 
  userData, 
  isPremium, 
  updateUserData, 
  setGoal, 
  cancelGoal, 
  logout, 
  handleLogin,
  activeTab,
  setActiveTab,
  shouldNavigateToTracker,
  setShouldNavigateToTracker,
  showAIChat,
  setShowAIChat,
  isMobile,
  hasSubscription,
  isGrandfathered,
  isTrial,
  trialDaysLeft,
  subLoading,
  hasUsedTrial,
  subscriptionStatus,
  startTrial,
  createCheckout,
  openPortal,
  refreshSubscription
}) {
  // Derive effective premium status from subscription system
  // This is what ALL child components use to gate premium features
  const effectivePremium = hasSubscription || isPremium;
  
  const { theme } = useTheme();
  
  // Theme-aware logo
  const trackerLogo = theme === 'light' ? trackerLogoBlack : trackerLogoWhite;

  return (
    <Router>
      <ScrollToTop />
      <StaticViewManager />
      <ServiceWorkerListener />
      <MixpanelTracker isLoggedIn={isLoggedIn} userData={userData} />
      <ActivityTracker isLoggedIn={isLoggedIn} username={userData?.username} />
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
            {/* PAYWALL: Show if user has no active subscription */}
            {!hasSubscription && (
              <PaywallScreen 
                userData={userData}
                subscriptionStatus={subscriptionStatus}
                onCheckout={createCheckout}
                onLinkDiscord={() => {
                  const clientId = process.env.REACT_APP_DISCORD_CLIENT_ID;
                  const redirectUri = encodeURIComponent(
                    window.location.origin + '/auth/discord/link-callback'
                  );
                  window.location.href = `https://discord.com/api/oauth2/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=identify%20email`;
                }}
              />
            )}
            
            <header className="app-header">
              <div className="logo-container">
                <img src={trackerLogo} alt="TitanTrack" className="app-logo" />
              </div>
              
              {!isMobile && <HeaderNavigation />}
              
              <div className="header-actions">
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
            
            {/* Floating Oracle Eye - Bottom right above nav */}
            {!showAIChat && (
              <button className="oracle-float-btn" onClick={() => setShowAIChat(true)} aria-label="Open The Oracle">
                <img src="/The_Oracle.png" alt="" />
              </button>
            )}
            
            {/* AI Chat - Now triggered by floating Oracle eye */}
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
                      isPremium={effectivePremium}
                      setGoal={setGoal}
                      cancelGoal={cancelGoal}
                    />
                  } />
                  <Route path="/calendar" element={
                    <Calendar userData={userData} isPremium={effectivePremium} updateUserData={updateUserData} />
                  } />
                  <Route path="/stats" element={
                    <Stats userData={userData} isPremium={effectivePremium} updateUserData={updateUserData} />
                  } />
                  <Route path="/timeline" element={
                    <EmotionalTimeline userData={userData} isPremium={effectivePremium} updateUserData={updateUserData} />
                  } />
                  <Route path="/urge-toolkit" element={
                    <UrgeToolkit userData={userData} isPremium={effectivePremium} updateUserData={updateUserData} />
                  } />
                  <Route path="/profile" element={
                    <Profile 
                      userData={userData} 
                      isPremium={effectivePremium} 
                      updateUserData={updateUserData} 
                      onLogout={logout}
                      subscriptionStatus={subscriptionStatus}
                      isGrandfathered={isGrandfathered}
                      isTrial={isTrial}
                      trialDaysLeft={trialDaysLeft}
                      onManageBilling={openPortal}
                      createCheckout={createCheckout}
                    />
                  } />
                  <Route path="/urge-prediction" element={
                    <PredictionDisplay mode="full" userData={userData} />
                  } />
                  <Route path="/admin" element={
                    <AdminCockpit />
                  } />
                  <Route path="/auth/discord/link-callback" element={
                    <DiscordLinkCallback onLinkComplete={() => refreshSubscription()} />
                  } />
                  <Route path="*" element={<Navigate to="/" />} />
                </Routes>
              </div>
            </main>
          </>
        ) : (
          <Routes>
            <Route path="/auth/discord/callback" element={<DiscordCallback onLogin={handleLogin} />} />
            <Route path="/auth/discord/link-callback" element={
              <DiscordLinkCallback onLinkComplete={() => refreshSubscription()} />
            } />
            <Route path="*" element={<Landing onLogin={handleLogin} />} />
          </Routes>
        )}
      </div>
    </Router>
  );
}

export default App;
