// AuthModal.js - TITANTRACK MODERN MINIMAL
import React, { useState, useEffect, useCallback } from 'react';
import './AuthModal.css';
import trackerLogo from '../../assets/trackerapplogo.png';

import { FaSpinner } from 'react-icons/fa';
import { FcGoogle } from 'react-icons/fc';
import { BsDiscord } from 'react-icons/bs';

// API URL - same as your useUserData hook
const API_URL = process.env.REACT_APP_API_URL || 'https://rossbased-app.onrender.com';

const AuthModal = ({ onClose, onLogin, loadingMessage }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [googleLoaded, setGoogleLoaded] = useState(false);
  
  // Google Client ID
  const GOOGLE_CLIENT_ID = '81026306470-im14ikk81801f6l1obk0b4cu260nito1.apps.googleusercontent.com';
  
  // Discord Client ID
  const DISCORD_CLIENT_ID = '1446165239174529132';

  // Handle Google credential response
  const handleGoogleResponse = useCallback(async (response) => {
    if (!response.credential) {
      setError('Google sign-in failed');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const res = await fetch(`${API_URL}/api/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential: response.credential })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Google authentication failed');
      }

      // Store token and username
      localStorage.setItem('token', data.token);
      localStorage.setItem('username', data.username);

      // Call onLogin with the username (this will trigger data load)
      await onLogin(data.username, null, true); // true = isGoogleAuth

    } catch (err) {
      console.error('Google auth error:', err);
      setError(err.message || 'Google sign-in failed. Please try again.');
      setIsLoading(false);
    }
  }, [onLogin]);

  // Load Google Sign-In script
  useEffect(() => {
    // Check if already loaded
    if (window.google?.accounts?.id) {
      setGoogleLoaded(true);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => {
      setGoogleLoaded(true);
    };
    document.body.appendChild(script);

    return () => {
      // Cleanup if needed
    };
  }, []);

  // Initialize Google Sign-In when loaded
  useEffect(() => {
    if (googleLoaded && window.google?.accounts?.id) {
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleGoogleResponse
      });
    }
  }, [googleLoaded, handleGoogleResponse]);
  
  // Clear error when switching modes
  useEffect(() => {
    setError('');
  }, [isLogin]);
  
  // Clear error when typing
  useEffect(() => {
    if (error) setError('');
  }, [username, email, password, confirmPassword]);
  
  const validateUsername = (username) => {
    const trimmed = username.trim();
    if (trimmed.length < 3) return 'Username must be at least 3 characters';
    if (trimmed.length > 20) return 'Username must be 20 characters or less';
    if (trimmed.includes('@')) return 'Username cannot contain @';
    if (trimmed.includes(' ')) return 'Username cannot contain spaces';
    if (!/^[a-zA-Z0-9_-]+$/.test(trimmed)) return 'Letters, numbers, underscores, hyphens only';
    return null;
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!username.trim() || !password.trim()) {
      setError('Please fill out all fields');
      return;
    }
    
    const usernameError = validateUsername(username);
    if (usernameError) {
      setError(usernameError);
      return;
    }
    
    if (password.length < 4) {
      setError('Password must be at least 4 characters');
      return;
    }
    
    if (!isLogin) {
      if (!email.trim()) {
        setError('Email is required');
        return;
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match');
        return;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
        setError('Please enter a valid email');
        return;
      }
    }
    
    setIsLoading(true);
    setError('');
    
    try {
      const [success] = await Promise.all([
        onLogin(username.trim(), password),
        new Promise(resolve => setTimeout(resolve, 800))
      ]);
      
      if (!success) {
        setError('Invalid credentials. Please try again.');
        setIsLoading(false);
      }
    } catch (err) {
      setError('Something went wrong. Please try again.');
      setIsLoading(false);
    }
  };
  
  const handleSocialLogin = (provider) => {
    if (isLoading) return;
    
    if (provider === 'Google') {
      if (googleLoaded && window.google?.accounts?.id) {
        window.google.accounts.id.prompt((notification) => {
          if (notification.isNotDisplayed()) {
            window.google.accounts.id.prompt();
          }
        });
      } else {
        setError('Google Sign-In is loading. Please try again.');
      }
    } else if (provider === 'Discord') {
      // Discord OAuth - redirect to Discord
      const REDIRECT_URI = encodeURIComponent(
        window.location.hostname === 'localhost' 
          ? 'http://localhost:3000/auth/discord/callback'
          : 'https://titantrack.app/auth/discord/callback'
      );
      const scope = encodeURIComponent('identify email');
      
      window.location.href = `https://discord.com/api/oauth2/authorize?client_id=${DISCORD_CLIENT_ID}&redirect_uri=${REDIRECT_URI}&response_type=code&scope=${scope}`;
    }
  };
  
  const handleClose = () => {
    if (!isLoading) onClose();
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="auth-overlay" onClick={handleClose}>
        <div className="auth-modal" onClick={e => e.stopPropagation()}>
          <div className="auth-loading">
            <img 
              src={trackerLogo} 
              alt="TitanTrack" 
              className="auth-loading-logo"
              onError={(e) => {
                e.target.style.display = 'none';
              }}
            />
            <p className="auth-loading-text">
              {loadingMessage || (isLogin ? 'Signing in...' : 'Creating account...')}
            </p>
            <div className="auth-loading-dots">
              <span /><span /><span />
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="auth-overlay" onClick={handleClose}>
      <div className="auth-modal" onClick={e => e.stopPropagation()}>
        
        {/* Header */}
        <div className="auth-header">
          <h2>{isLogin ? 'Welcome back' : 'Create account'}</h2>
          <p>{isLogin ? 'Sign in to continue your journey' : 'Start tracking your progress'}</p>
        </div>
        
        {/* Social buttons */}
        <div className="auth-social">
          <button 
            className="auth-social-btn"
            onClick={() => handleSocialLogin('Google')}
            disabled={isLoading}
          >
            <FcGoogle size={18} />
            <span>Google</span>
          </button>
          
          <button 
            className="auth-social-btn auth-social-discord"
            onClick={() => handleSocialLogin('Discord')}
            disabled={isLoading}
          >
            <BsDiscord size={18} />
            <span>Discord</span>
          </button>
        </div>
        
        {/* Divider */}
        <div className="auth-divider">
          <span>or</span>
        </div>
        
        {/* Error */}
        {error && <div className="auth-error">{error}</div>}
        
        {/* Form */}
        <form onSubmit={handleSubmit} className="auth-form">
          <div className="auth-field">
            <label htmlFor="username">Username</label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter username"
              autoComplete="username"
              maxLength={20}
            />
          </div>
          
          {!isLogin && (
            <div className="auth-field">
              <label htmlFor="email">Email</label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter email"
                autoComplete="email"
              />
            </div>
          )}
          
          <div className="auth-field">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              autoComplete={isLogin ? "current-password" : "new-password"}
            />
          </div>
          
          {!isLogin && (
            <div className="auth-field">
              <label htmlFor="confirmPassword">Confirm password</label>
              <input
                type="password"
                id="confirmPassword"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm password"
                autoComplete="new-password"
              />
            </div>
          )}
          
          <button type="submit" className="auth-submit" disabled={isLoading}>
            {isLoading ? (
              <>
                <FaSpinner className="auth-spinner" />
                <span>{isLogin ? 'Signing in...' : 'Creating...'}</span>
              </>
            ) : (
              <span>{isLogin ? 'Sign in' : 'Create account'}</span>
            )}
          </button>
        </form>
        
        {/* Footer */}
        <div className="auth-footer">
          <p>
            {isLogin ? "Don't have an account?" : "Already have an account?"}
            <button 
              className="auth-switch"
              onClick={() => !isLoading && setIsLogin(!isLogin)}
              disabled={isLoading}
            >
              {isLogin ? 'Sign up' : 'Sign in'}
            </button>
          </p>
        </div>
        
      </div>
    </div>
  );
};

export default AuthModal;