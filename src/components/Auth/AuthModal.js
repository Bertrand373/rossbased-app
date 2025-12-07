// AuthModal.js - TITANTRACK MODERN MINIMAL
import React, { useState, useEffect, useCallback, useRef } from 'react';
import './AuthModal.css';

import { FaSpinner } from 'react-icons/fa';
import { FcGoogle } from 'react-icons/fc';
import { BsDiscord } from 'react-icons/bs';

// Body scroll lock for modals
import useBodyScrollLock from '../../hooks/useBodyScrollLock';

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
  const [googleButtonRendered, setGoogleButtonRendered] = useState(false);
  
  // Ref for hidden Google button container
  const googleButtonRef = useRef(null);
  
  // Lock body scroll when modal is open (always true since this component only renders when shown)
  useBodyScrollLock(true);
  
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
      // Track when loading started for minimum duration
      const loadingStartTime = Date.now();
      
      const res = await fetch(`${API_URL}/api/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential: response.credential })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Google authentication failed');
      }

      // Store token and username FIRST
      localStorage.setItem('token', data.token);
      localStorage.setItem('username', data.username);

      // Wait for minimum 1200ms loading duration BEFORE completing login
      // (onLogin closes the modal, so we must wait first)
      const elapsedTime = Date.now() - loadingStartTime;
      const remainingTime = Math.max(0, 1200 - elapsedTime);
      await new Promise(resolve => setTimeout(resolve, remainingTime));
      
      // NOW complete login (this will close the modal)
      const success = await onLogin(data.username, null, true);
      
      if (!success) {
        throw new Error('Failed to complete login');
      }

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

  // Initialize Google Sign-In and render hidden button when loaded
  useEffect(() => {
    if (googleLoaded && window.google?.accounts?.id && googleButtonRef.current && !googleButtonRendered) {
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleGoogleResponse
      });
      
      // Render the Google button (hidden) - this is more reliable than prompt()
      window.google.accounts.id.renderButton(
        googleButtonRef.current,
        { 
          type: 'standard',
          theme: 'filled_black',
          size: 'large',
          text: 'signin_with',
          width: 280
        }
      );
      
      setGoogleButtonRendered(true);
    }
  }, [googleLoaded, handleGoogleResponse, googleButtonRendered]);
  
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
      if (isLogin) {
        // SIGN IN - wait for minimum duration, then complete login
        await new Promise(resolve => setTimeout(resolve, 1200));
        const success = await onLogin(username.trim(), password);
        
        if (!success) {
          setError('Invalid credentials or account not found.');
          setIsLoading(false);
        }
      } else {
        // SIGN UP - call signup endpoint directly
        const response = await fetch(`${API_URL}/api/signup`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: username.trim(),
            password,
            email: email.trim()
          })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.error || 'Signup failed');
        }
        
        // Store token and username
        localStorage.setItem('token', data.token);
        localStorage.setItem('username', data.username);
        
        // Complete login flow (similar to OAuth)
        const success = await onLogin(data.username, null, true);
        
        if (!success) {
          throw new Error('Failed to complete signup');
        }
      }
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
      setIsLoading(false);
    }
  };
  
  const handleSocialLogin = (provider) => {
    if (isLoading) return;
    
    if (provider === 'Google') {
      // Click the hidden Google button - much more reliable than prompt()
      if (googleButtonRef.current) {
        const googleBtn = googleButtonRef.current.querySelector('div[role="button"]');
        if (googleBtn) {
          googleBtn.click();
        } else {
          // Fallback: try to find any clickable element in the Google button container
          const anyButton = googleButtonRef.current.querySelector('iframe') || 
                           googleButtonRef.current.querySelector('div');
          if (anyButton) {
            anyButton.click();
          } else {
            setError('Google Sign-In is loading. Please try again.');
          }
        }
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
  
  // Close modal when tapping outside (on overlay)
  const handleOverlayClick = () => {
    if (!isLoading && onClose) {
      onClose();
    }
  };

  // Loading state - icon only, no text (premium/modern approach)
  if (isLoading) {
    return (
      <div className="auth-overlay">
        <div className="auth-modal" onClick={e => e.stopPropagation()}>
          <div className="auth-loading">
            <img 
              src="/icon-192.png" 
              alt="" 
              className="auth-loading-icon"
            />
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="auth-overlay" onClick={handleOverlayClick}>
      <div className="auth-modal" onClick={e => e.stopPropagation()}>
        
        {/* Hidden Google Sign-In Button - rendered by Google SDK */}
        <div 
          ref={googleButtonRef} 
          style={{ 
            position: 'absolute', 
            opacity: 0, 
            pointerEvents: 'none',
            width: 0,
            height: 0,
            overflow: 'hidden'
          }} 
        />
        
        {/* Header */}
        <div className="auth-header">
          <h2>{isLogin ? 'Welcome back' : 'Create account'}</h2>
          <p>{isLogin ? 'Sign in to continue your journey' : 'Start tracking your progress today'}</p>
        </div>
        
        {/* Error message */}
        {error && (
          <div className="auth-error">
            {error}
          </div>
        )}
        
        {/* Social buttons */}
        <div className="auth-social">
          <button
            type="button"
            className="auth-social-btn auth-social-google"
            onClick={() => handleSocialLogin('Google')}
            disabled={!googleLoaded || isLoading}
          >
            <FcGoogle />
            <span>Continue with Google</span>
          </button>
          
          <button
            type="button"
            className="auth-social-btn auth-social-discord"
            onClick={() => handleSocialLogin('Discord')}
            disabled={isLoading}
          >
            <BsDiscord />
            <span>Continue with Discord</span>
          </button>
        </div>
        
        {/* Divider */}
        <div className="auth-divider">
          <span>or</span>
        </div>
        
        {/* Form */}
        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="auth-field">
            <label htmlFor="username">Username</label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username"
              autoComplete="username"
              autoCapitalize="off"
              disabled={isLoading}
            />
          </div>
          
          {!isLogin && (
            <div className="auth-field">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                autoComplete="email"
                autoCapitalize="off"
                disabled={isLoading}
              />
            </div>
          )}
          
          <div className="auth-field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              autoComplete={isLogin ? 'current-password' : 'new-password'}
              disabled={isLoading}
            />
          </div>
          
          {!isLogin && (
            <div className="auth-field">
              <label htmlFor="confirmPassword">Confirm Password</label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm your password"
                autoComplete="new-password"
                disabled={isLoading}
              />
            </div>
          )}
          
          <button type="submit" className="auth-submit" disabled={isLoading}>
            {isLoading ? (
              <>
                <FaSpinner className="auth-spinner" />
                <span>{isLogin ? 'Signing in...' : 'Creating account...'}</span>
              </>
            ) : (
              <span>{isLogin ? 'Sign in' : 'Create account'}</span>
            )}
          </button>
        </form>
        
        {/* Footer - switch mode */}
        <div className="auth-footer">
          <p>
            {isLogin ? "Don't have an account?" : 'Already have an account?'}
            <button 
              type="button" 
              className="auth-switch" 
              onClick={() => setIsLogin(!isLogin)}
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