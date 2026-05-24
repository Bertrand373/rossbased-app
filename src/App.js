// App.js - TITANTRACK MODERN MINIMAL
import React, { useState, useEffect, useRef, useCallback, createContext, useContext } from 'react';
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
import UrgeToolkit from './components/UrgeToolkit/UrgeToolkit';
import Profile from './components/Profile/Profile';
import Landing from './components/Landing/Landing';

// AI Prediction Display (PatternInsightCard handles floating alerts, this handles full view)
import PredictionDisplay from './components/PredictionDisplay/PredictionDisplay';

// Shared components
import AuthModal from './components/Auth/AuthModal';
import DiscordCallback from './components/Auth/DiscordCallback';
import ResetPassword from './components/Auth/ResetPassword';
import MobileNavigation from './components/Navigation/MobileNavigation';
import InstallPrompt from './components/InstallPrompt/InstallPrompt';
import AIChat from './components/AIChat/AIChat';
import AdminCockpit from './components/Admin/AdminCockpit';
import ScrollIndicator from './components/Shared/ScrollIndicator';
import WhatsNew from './components/Announcements/WhatsNew';
import TransmissionSheet from './components/Transmissions/TransmissionSheet';

// Custom hook for user data
import { useUserData } from './hooks/useUserData';
import { useSubscription } from './hooks/useSubscription';
import { useFeedbackReplies } from './hooks/useFeedbackReplies';
import PaywallScreen from './components/Subscription/PaywallScreen';
import PlanModal from './components/Subscription/PlanModal';
import DiscordLinkCallback from './components/Auth/DiscordLinkCallback';
import YouTubeLinkCallback from './components/Auth/YouTubeLinkCallback';
import Privacy from './components/Legal/Privacy';
import Terms from './components/Legal/Terms';
import Timeline from './components/Timeline/Timeline';

// AMBIENT AI HOOKS - Auto-train only (risk indicator removed, floating card handles alerts)
import { useAutoTrain } from './hooks/useAutoTrain';
import { CircleProvider } from './hooks/useCircle';
import CircleStack from './components/Circle/CircleStack';
import CircleSheet from './components/Circle/CircleSheet';

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

  // Apply theme to document and update localStorage.
  // Uses the View Transitions API for a smooth crossfade where supported
  // (Chromium + Safari 18+); falls through to a snap on older browsers.
  const setTheme = (newTheme) => {
    const apply = () => {
      setThemeState(newTheme);
      localStorage.setItem('titantrack-theme', newTheme);
      document.documentElement.setAttribute('data-theme', newTheme);

      const themeColorMeta = document.getElementById('theme-color-meta');
      if (themeColorMeta) {
        themeColorMeta.setAttribute('content', newTheme === 'light' ? '#f4ede0' : '#000000');
      }
    };

    if (typeof document !== 'undefined' && document.startViewTransition) {
      document.startViewTransition(apply);
    } else {
      apply();
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

// Discord Button - opens the community server
// On mobile with Discord installed, Discord's invite page auto-handoffs to the app
// via Universal Links / App Links. No manual discord:// scheme needed.
const DiscordButton = () => (
  <a
    href="https://discord.gg/RDFC5eUtuA"
    target="_blank"
    rel="noopener noreferrer"
    className="header-discord-link"
    aria-label="Join the TitanTrack Discord community"
    title="Join the Discord"
  >
    <svg
      viewBox="0 0 24 24"
      className="header-discord-icon"
      aria-hidden="true"
      focusable="false"
    >
      <path
        fill="currentColor"
        d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189Z"
      />
    </svg>
  </a>
);

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

// Desktop Navigation - Text only with dividers, sliding dash, Oracle center
const HeaderNavigation = ({ onOracleClick }) => {
  const location = useLocation();
  const navRef = useRef(null);
  const dashRef = useRef(null);
  const deskInitialized = useRef(false);

  const navItems = [
    { path: '/', label: 'Tracker' },
    { path: '/calendar', label: 'Calendar' },
    { type: 'oracle', label: 'Oracle' },
    { path: '/stats', label: 'Stats' },
    { path: '/urge-toolkit', label: 'Urges' }
  ];

  // Position the dash under the active route tab
  useEffect(() => {
    const positionDash = () => {
      if (!navRef.current || !dashRef.current) return;

      const active = navRef.current.querySelector('.nav-link.active');
      if (!active) {
        dashRef.current.style.opacity = '0';
        return;
      }

      const navRect = navRef.current.getBoundingClientRect();
      const itemRect = active.getBoundingClientRect();
      const x = itemRect.left + itemRect.width / 2 - navRect.left - 10;

      if (!deskInitialized.current) {
        dashRef.current.style.transition = 'none';
        dashRef.current.style.transform = `translateX(${x}px)`;
        dashRef.current.style.opacity = '1';
        dashRef.current.offsetHeight; // eslint-disable-line no-unused-expressions
        dashRef.current.style.transition = '';
        deskInitialized.current = true;
      } else {
        dashRef.current.style.transform = `translateX(${x}px)`;
        dashRef.current.style.opacity = '1';
      }
    };

    const timer = setTimeout(positionDash, 30);
    return () => clearTimeout(timer);
  }, [location.pathname]);

  // Re-measure on resize
  useEffect(() => {
    const recalc = () => {
      if (!navRef.current || !dashRef.current) return;
      const active = navRef.current.querySelector('.nav-link.active');
      if (!active) {
        dashRef.current.style.opacity = '0';
        return;
      }
      const navRect = navRef.current.getBoundingClientRect();
      const itemRect = active.getBoundingClientRect();
      const x = itemRect.left + itemRect.width / 2 - navRect.left - 10;
      dashRef.current.style.transition = 'none';
      dashRef.current.style.transform = `translateX(${x}px)`;
      dashRef.current.style.opacity = '1';
      dashRef.current.offsetHeight; // eslint-disable-line no-unused-expressions
      dashRef.current.style.transition = '';
    };

    window.addEventListener('resize', recalc);
    return () => window.removeEventListener('resize', recalc);
  }, []);

  return (
    <nav className="header-nav">
      <div className="nav-container" ref={navRef}>
        <span ref={dashRef} className="nav-dash" />
        {navItems.map((item, index) => (
          <React.Fragment key={item.path || item.type}>
            {item.type === 'oracle' ? (
              <button 
                className="nav-link nav-link-oracle"
                onClick={onOracleClick}
                aria-label="Oracle"
              >
                <img src="/The_Oracle.png" alt="" className="nav-oracle-eye" />
              </button>
            ) : (
              <NavLink 
                to={item.path}
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              >
                {item.label}
              </NavLink>
            )}
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
    const publicRoutes = ['/reset-password', '/privacy', '/terms', '/timeline'];
    const isPublicRoute = publicRoutes.includes(location.pathname);
    if (!isLoggedIn && location.pathname !== '/' && !isAuthCallback && !isPublicRoute) {
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
    if (page && page !== '/auth/discord/callback' && page !== '/auth/discord/link-callback' && page !== '/auth/youtube/link-callback') {
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
  const [oracleHasUnread, setOracleHasUnread] = useState(false);

  // Listen for Oracle unread transmission events (fired by AIChat.js)
  useEffect(() => {
    const handleUnread = (e) => {
      const count = e.detail || 0;
      setOracleHasUnread(count > 0);
    };
    window.addEventListener('oracle-unread', handleUnread);
    return () => window.removeEventListener('oracle-unread', handleUnread);
  }, []);

  // Toggle body data attribute for Oracle unread dot (survives React re-renders)
  useEffect(() => {
    if (oracleHasUnread) {
      document.body.setAttribute('data-oracle-unread', 'true');
    } else {
      document.body.removeAttribute('data-oracle-unread');
    }
  }, [oracleHasUnread]);

  // Wrapper to open Oracle and clear unread
  const openOracle = () => {
    setShowAIChat(true);
    setOracleHasUnread(false);
  };
  
  const [isRefreshLoading, setIsRefreshLoading] = useState(() => {
    return localStorage.getItem('isLoggedIn') === 'true';
  });
  const [loadingMessage, setLoadingMessage] = useState('Loading...');
  
  // Minimum loading screen duration for smooth UX (prevents flash).
  //   PWA standalone: 3800ms (~800ms iOS splash + ~3000ms / ~1.5 pulses).
  //   Browser/desktop: 1800ms — no splash to cover, but still long enough
  //     for one clean pulse cycle to be visually perceivable. 600ms (the
  //     original value) showed so little of the 2s pulse that it read as
  //     static.
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches
    || window.navigator.standalone === true;
  const MIN_LOADING_MS = isStandalone ? 3800 : 1800;
  
  const [minLoadingComplete, setMinLoadingComplete] = useState(false);
  
  useEffect(() => {
    const timer = setTimeout(() => setMinLoadingComplete(true), MIN_LOADING_MS);
    return () => clearTimeout(timer);
  }, []);

  // SAFETY NET: If loading states hang (stale SW cache, slow API, etc.),
  // force the app to show after 10 seconds. Prevents infinite splash screen.
  const [loadingSafetyTimeout, setLoadingSafetyTimeout] = useState(false);
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setLoadingSafetyTimeout(true);
      console.warn('⚠️ App loading safety timeout triggered — forcing app visible');
    }, 10000);
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
  // Safety timeout forces app visible after 10s to prevent infinite splash.
  const appReady = (
    !isLoading && !isRefreshLoading && minLoadingComplete && 
    (!isLoggedIn || subscriptionStatus.reason !== 'loading') &&
    !isAuthCallback
  ) || (loadingSafetyTimeout && !isAuthCallback);

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
      <CircleProvider isLoggedIn={isLoggedIn}>
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
          openOracle={openOracle}
          oracleHasUnread={oracleHasUnread}
          setOracleHasUnread={setOracleHasUnread}
          isMobile={isMobile}
          hasSubscription={hasSubscription}
          isGrandfathered={isGrandfathered}
          isTrial={isTrial}
          trialDaysLeft={trialDaysLeft}
          subLoading={subLoading}
          hasUsedTrial={hasUsedTrial}
          subscriptionStatus={subscriptionStatus}
          createCheckout={createCheckout}
          openPortal={openPortal}
          refreshSubscription={refreshSubscription}
        />
      </CircleProvider>
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
  openOracle,
  oracleHasUnread,
  setOracleHasUnread,
  isMobile,
  hasSubscription,
  isGrandfathered,
  isTrial,
  trialDaysLeft,
  subLoading,
  hasUsedTrial,
  subscriptionStatus,
  createCheckout,
  openPortal,
  refreshSubscription
}) {
  // Derive effective premium status from subscription system
  // This is what ALL child components use to gate premium features
  const effectivePremium = hasSubscription;
  
  // Plan modal state - single upgrade flow for the entire app
  const [showPlanModal, setShowPlanModal] = useState(false);
  const openPlanModal = () => setShowPlanModal(true);

  // Circle sheet state — owned at app level so any surface can open it
  // (header CircleStack on every tab, post-log CheckInSheet, etc).
  const [showCircleSheet, setShowCircleSheet] = useState(false);
  const openCircleSheet = useCallback(() => setShowCircleSheet(true), []);

  const { theme } = useTheme();

  // Pending admin replies to user-submitted feedback (bug responses, etc).
  // Surfaced as a one-shot Transmission sheet on app load.
  const {
    pending: feedbackReplies,
    acknowledge: ackFeedbackReply
  } = useFeedbackReplies(isLoggedIn, userData?.username);

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
            background: '#1a1a1a',
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
            icon: <span style={{ width: 16, height: 3, borderRadius: 2, background: '#22c55e', flexShrink: 0 }} />,
          },
          error: {
            duration: 3500,
            style: {
              background: '#1a1a1a',
              border: '1px solid rgba(255, 59, 48, 0.15)',
            },
            icon: <span style={{ width: 16, height: 3, borderRadius: 2, background: '#ff3b30', flexShrink: 0 }} />,
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
              
              {!isMobile && <HeaderNavigation onOracleClick={openOracle} />}
              
              <div className="header-actions">
                <CircleStack onClick={openCircleSheet} />
                <DiscordButton />
                <ProfileButton userData={userData} />
              </div>
            </header>
            
            {isMobile && <ScrollIndicator />}
            
            {isMobile && (
              <MobileNavigation 
                onOracleClick={openOracle}
                isOracleActive={showAIChat}
                oracleHasUnread={oracleHasUnread}
              />
            )}
            
            {/* PWA Install Prompt - only when user has full access and nothing is overlaying */}
            <InstallPrompt 
              triggerAfterCheckIns={1}
              triggerAfterVisits={3}
              currentCheckIns={userData?.totalCheckIns || 0}
              suppress={!hasSubscription || subLoading}
            />
            
            {/* AI Chat - Now triggered by nav Oracle icon */}
            <AIChat 
              isLoggedIn={isLoggedIn} 
              isOpen={showAIChat}
              onClose={() => { setShowAIChat(false); setOracleHasUnread(false); }}
              openPlanModal={openPlanModal}
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
                      onUpgrade={openPlanModal}
                      openOracle={openOracle}
                    />
                  } />
                  <Route path="/calendar" element={
                    <Calendar userData={userData} isPremium={effectivePremium} updateUserData={updateUserData} openPlanModal={openPlanModal} />
                  } />
                  <Route path="/stats" element={
                    <Stats userData={userData} isPremium={effectivePremium} updateUserData={updateUserData} openPlanModal={openPlanModal} />
                  } />
                  <Route path="/urge-toolkit" element={
                    <UrgeToolkit userData={userData} isPremium={effectivePremium} updateUserData={updateUserData} openPlanModal={openPlanModal} />
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
                      openPlanModal={openPlanModal}
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
                  <Route path="/auth/youtube/link-callback" element={
                    <YouTubeLinkCallback onLinkComplete={() => refreshSubscription()} />
                  } />
                  <Route path="/reset-password" element={<ResetPassword />} />
                  <Route path="/privacy" element={<Privacy />} />
                  <Route path="/terms" element={<Terms />} />
                  <Route path="/timeline" element={<Timeline />} />
                  <Route path="*" element={<Navigate to="/" />} />
                </Routes>
              </div>
            </main>
            
            {/* Universal upgrade modal */}
            <PlanModal
              isOpen={showPlanModal}
              onClose={() => setShowPlanModal(false)}
              onCheckout={createCheckout}
              subscriptionStatus={subscriptionStatus}
            />
            
            {/* What's New announcement sheet — suppressed during onboarding */}
            <WhatsNew isLoggedIn={true} username={userData?.username} suppress={!userData?.hasSeenOnboarding} />

            {/* Admin reply to user feedback — surfaces on app load when present */}
            <TransmissionSheet
              pending={feedbackReplies}
              onAcknowledge={ackFeedbackReply}
              suppress={!userData?.hasSeenOnboarding}
            />

            <CircleSheet
              open={showCircleSheet}
              onClose={() => setShowCircleSheet(false)}
              viewerUsername={userData?.username}
              currentStreak={userData?.currentStreak || 0}
            />
          </>
        ) : (
          <Routes>
            <Route path="/auth/discord/callback" element={<DiscordCallback onLogin={handleLogin} />} />
            <Route path="/auth/discord/link-callback" element={
              <DiscordLinkCallback onLinkComplete={() => refreshSubscription()} />
            } />
            <Route path="/auth/youtube/link-callback" element={
              <YouTubeLinkCallback onLinkComplete={() => refreshSubscription()} />
            } />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/timeline" element={<Timeline />} />
            <Route path="*" element={<Landing onLogin={handleLogin} />} />
          </Routes>
        )}
      </div>
    </Router>
  );
}

export default App;
