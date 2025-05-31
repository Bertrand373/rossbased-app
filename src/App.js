// App.js - Updated with Emotional Timeline replacing Daily Motivation
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, NavLink } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import './App.css';
import trackerLogo from './assets/trackerapplogo.png';

// Icons for header
import { FaPowerOff, FaUser } from 'react-icons/fa';

// Tabs
import Tracker from './components/Tracker/Tracker';
import Calendar from './components/Calendar/Calendar';
import Stats from './components/Stats/Stats';
import EmotionalTimeline from './components/EmotionalTimeline/EmotionalTimeline'; // CHANGED: Replaced DailyMotivation
import UrgeToolkit from './components/UrgeToolkit/UrgeToolkit';
import Landing from './components/Landing/Landing';

// Shared components
import AuthModal from './components/Auth/AuthModal';
import SubscriptionBanner from './components/Subscription/SubscriptionBanner';
import MobileNavigation from './components/Navigation/MobileNavigation';
import SpartanLoader from './components/Shared/SpartanLoader';

// Custom hook for user data
import { useUserData } from './hooks/useUserData';

function App() {
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [activeTab, setActiveTab] = useState('tracker');
  const [isInitialLoading, setIsInitialLoading] = useState(true);
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

  // FIXED: Show SpartanLoader when loading OR when initially loading the app
  if (isLoading || isInitialLoading) {
    return (
      <div className="spartan-loading-screen">
        <SpartanLoader 
          size={100}
          message={isLoading ? "Logging you in..." : "Loading your dashboard..."}
          showMessage={true}
          animationType="warrior"
        />
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