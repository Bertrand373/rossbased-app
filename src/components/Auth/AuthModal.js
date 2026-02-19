// AuthModal.js - TITANTRACK MODERN MINIMAL
import React, { useState, useEffect, useCallback, useRef } from 'react';
import './AuthModal.css';
import { FaSpinner } from 'react-icons/fa';
import { FcGoogle } from 'react-icons/fc';
import { BsDiscord } from 'react-icons/bs';
import useBodyScrollLock from '../../hooks/useBodyScrollLock';
import { trackLogin, trackSignup } from '../../utils/mixpanel';

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
  
  // Forgot password state
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSuccess, setForgotSuccess] = useState(false);
  
  const googleButtonRef = useRef(null);
  
  useBodyScrollLock(true);
  
  const GOOGLE_CLIENT_ID = '81026306470-im14ikk81801f6l1obk0b4cu260nito1.apps.googleusercontent.com';
  const DISCORD_CLIENT_ID = '1446165239174529132';

  const handleGoogleResponse = useCallback(async (response) => {
    if (!response.credential) {
      setError('Google sign-in failed');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
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

      localStorage.setItem('token', data.token);
      localStorage.setItem('username', data.username);
      
      // Track signup or login in Mixpanel
      if (data.isNewUser) {
        trackSignup('google');
      } else {
        trackLogin('google');
      }

      const elapsedTime = Date.now() - loadingStartTime;
      const remainingTime = Math.max(0, 1200 - elapsedTime);
      await new Promise(resolve => setTimeout(resolve, remainingTime));
      
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

  useEffect(() => {
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

    return () => {};
  }, []);

  useEffect(() => {
    if (googleLoaded && window.google?.accounts?.id && googleButtonRef.current && !googleButtonRendered) {
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleGoogleResponse,
        cancel_on_tap_outside: false,
        auto_select: false
      });
      
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
  
  useEffect(() => {
    setError('');
  }, [isLogin]);
  
  useEffect(() => {
    if (error) setError('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [username, email, password, confirmPassword]);

  // Clear forgot password error when user types
  useEffect(() => {
    if (error && showForgotPassword) setError('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [forgotEmail]);
  
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
        await new Promise(resolve => setTimeout(resolve, 1200));
        const success = await onLogin(username.trim(), password);
        
        if (success) {
          trackLogin('email');
        }
        
        if (!success) {
          setError('Invalid credentials or account not found.');
          setIsLoading(false);
        }
      } else {
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
        
        localStorage.setItem('token', data.token);
        localStorage.setItem('username', data.username);
        
        // Track signup in Mixpanel
        trackSignup('email');
        
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

  // Forgot password submit handler
  const handleForgotPassword = async (e) => {
    e.preventDefault();

    if (!forgotEmail.trim()) {
      setError('Please enter your email');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(forgotEmail.trim())) {
      setError('Please enter a valid email');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const res = await fetch(`${API_URL}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail.trim() })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to send reset email');
      }

      setForgotSuccess(true);
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleSocialLogin = (provider) => {
    if (isLoading) return;
    
    if (provider === 'Google') {
      if (googleButtonRef.current) {
        const googleBtn = googleButtonRef.current.querySelector('div[role="button"]');
        if (googleBtn) {
          googleBtn.click();
        } else {
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
      const REDIRECT_URI = encodeURIComponent(
        window.location.hostname === 'localhost' 
          ? 'http://localhost:3000/auth/discord/callback'
          : 'https://titantrack.app/auth/discord/callback'
      );
      const scope = encodeURIComponent('identify email');
      
      window.location.href = `https://discord.com/api/oauth2/authorize?client_id=${DISCORD_CLIENT_ID}&redirect_uri=${REDIRECT_URI}&response_type=code&scope=${scope}`;
    }
  };
  
  const handleOverlayClick = () => {
    if (!isLoading && onClose) {
      onClose();
    }
  };

  // Exit forgot password and go back to login
  const exitForgotPassword = () => {
    setShowForgotPassword(false);
    setForgotEmail('');
    setForgotSuccess(false);
    setError('');
  };

  // Hidden Google button - ALWAYS rendered to prevent layout issues during OAuth
  const hiddenGoogleButton = (
    <div 
      ref={googleButtonRef} 
      className="google-hidden-button"
      aria-hidden="true"
    />
  );

  if (isLoading && !showForgotPassword) {
    return (
      <div className="auth-overlay">
        {hiddenGoogleButton}
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

  // =============================================
  // FORGOT PASSWORD VIEW
  // =============================================
  if (showForgotPassword) {
    return (
      <div className="auth-overlay" onClick={handleOverlayClick}>
        {hiddenGoogleButton}
        <div className="auth-modal" onClick={e => e.stopPropagation()}>

          <div className="auth-brand">
            <img src="/icon-192.png" alt="" className="auth-brand-icon" />
          </div>

          <div className="auth-header">
            <h2>{forgotSuccess ? 'Check your email' : 'Forgot password'}</h2>
            <p>
              {forgotSuccess 
                ? 'If an account exists with that email, a reset link has been sent. Check your inbox and spam folder.'
                : 'Enter the email you signed up with and we\'ll send you a reset link.'
              }
            </p>
          </div>

          {error && (
            <div className="auth-error">{error}</div>
          )}

          {!forgotSuccess ? (
            <form className="auth-form" onSubmit={handleForgotPassword}>
              <div className="auth-field">
                <label htmlFor="forgot-email">Email</label>
                <input
                  id="forgot-email"
                  type="email"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  placeholder="Enter your email"
                  autoComplete="email"
                  autoCapitalize="off"
                  autoFocus
                  disabled={isLoading}
                />
              </div>

              <button type="submit" className="auth-submit" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <FaSpinner className="auth-spinner" />
                    <span>Sending...</span>
                  </>
                ) : (
                  <span>Send reset link</span>
                )}
              </button>
            </form>
          ) : null}

          <div className="auth-footer">
            <p>
              <button 
                type="button" 
                className="auth-switch" 
                onClick={exitForgotPassword}
                disabled={isLoading}
              >
                Back to sign in
              </button>
            </p>
          </div>
        </div>
      </div>
    );
  }
  
  // =============================================
  // MAIN AUTH VIEW (LOGIN / SIGNUP)
  // =============================================
  return (
    <div className="auth-overlay" onClick={handleOverlayClick}>
      {hiddenGoogleButton}
      <div className="auth-modal" onClick={e => e.stopPropagation()}>
        
        <div className="auth-brand">
          <img src="/icon-192.png" alt="" className="auth-brand-icon" />
        </div>

        <div className="auth-header">
          <h2>{isLogin ? 'Welcome back' : 'Create account'}</h2>
          <p>{isLogin ? 'Sign in to continue your journey' : 'Start tracking your progress today'}</p>
        </div>
        
        {error && (
          <div className="auth-error">
            {error}
          </div>
        )}
        
        <div className="auth-social">
          <button
            type="button"
            className="auth-social-btn auth-social-google"
            onClick={() => handleSocialLogin('Google')}
            disabled={!googleLoaded || isLoading}
          >
            <FcGoogle />
            <span>Google</span>
          </button>
          
          <button
            type="button"
            className="auth-social-btn auth-social-discord"
            onClick={() => handleSocialLogin('Discord')}
            disabled={isLoading}
          >
            <BsDiscord />
            <span>Discord</span>
          </button>
        </div>
        
        <div className="auth-divider">
          <span>or</span>
        </div>
        
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

          {/* Forgot password link - login mode only */}
          {isLogin && (
            <div className="auth-forgot-row">
              <button
                type="button"
                className="auth-forgot-link"
                onClick={() => {
                  setShowForgotPassword(true);
                  setError('');
                }}
              >
                Forgot password?
              </button>
            </div>
          )}
          
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
