// components/Auth/AuthModal.js - Fixed username validation and styling
import React, { useState, useEffect } from 'react';
import './AuthModal.css';

// Icons
import { FaTimes, FaUser, FaLock, FaGoogle, FaDiscord, FaEnvelope, FaSpinner } from 'react-icons/fa';

const AuthModal = ({ onClose, onLogin }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [discordUsername, setDiscordUsername] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // Clear error when switching between login/signup
  useEffect(() => {
    setError('');
  }, [isLogin]);
  
  // Clear error when user starts typing
  useEffect(() => {
    if (error) {
      setError('');
    }
  }, [username, email, password, confirmPassword]);
  
  // Username validation function
  const validateUsername = (username) => {
    const trimmed = username.trim();
    
    if (trimmed.length < 3) {
      return 'Username must be at least 3 characters long';
    }
    
    if (trimmed.length > 20) {
      return 'Username must be 20 characters or less';
    }
    
    if (trimmed.includes('@')) {
      return 'Username cannot contain @ symbol';
    }
    
    if (trimmed.includes(' ')) {
      return 'Username cannot contain spaces';
    }
    
    // Check for valid characters (alphanumeric, underscore, hyphen)
    const validUsernameRegex = /^[a-zA-Z0-9_-]+$/;
    if (!validUsernameRegex.test(trimmed)) {
      return 'Username can only contain letters, numbers, underscores, and hyphens';
    }
    
    return null; // Valid username
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Basic validation
    if (!username.trim() || !password.trim()) {
      setError('Please fill out all required fields');
      return;
    }
    
    // Username validation
    const usernameError = validateUsername(username);
    if (usernameError) {
      setError(usernameError);
      return;
    }
    
    if (password.length < 4) {
      setError('Password must be at least 4 characters long');
      return;
    }
    
    if (!isLogin) {
      if (!email.trim()) {
        setError('Please enter your email address');
        return;
      }
      
      if (password !== confirmPassword) {
        setError('Passwords do not match');
        return;
      }
      
      // Basic email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        setError('Please enter a valid email address');
        return;
      }
    }
    
    setIsLoading(true);
    setError('');
    
    try {
      // Ensure minimum loading time for better UX
      const [success] = await Promise.all([
        onLogin(username.trim(), password),
        new Promise(resolve => setTimeout(resolve, 800)) // Minimum 800ms loading
      ]);
      
      if (success) {
        // Success - modal will be closed by parent component
        // Don't set loading to false here, let the parent handle it
      } else {
        setError('Login failed. Please check your credentials and try again.');
        setIsLoading(false);
      }
    } catch (error) {
      console.error('Authentication error:', error);
      setError('Something went wrong. Please try again.');
      setIsLoading(false);
    }
  };
  
  const handleSocialLogin = (provider) => {
    if (isLoading) return;
    
    // In a real app, this would initiate OAuth flow
    setError(`${provider} login is not available in demo mode`);
  };
  
  const switchMode = () => {
    if (isLoading) return;
    setIsLogin(!isLogin);
    setError('');
  };
  
  const handleClose = () => {
    if (isLoading) return;
    onClose();
  };
  
  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content auth-modal" onClick={e => e.stopPropagation()}>
        <button className="close-modal-btn" onClick={handleClose} disabled={isLoading}>
          <FaTimes />
        </button>
        
        <h2>{isLogin ? 'Welcome Back' : 'Create Account'}</h2>
        
        <div className="auth-social-buttons">
          <button 
            className="social-btn google-btn" 
            disabled={isLoading}
            onClick={() => handleSocialLogin('Google')}
          >
            <FaGoogle />
            <span>{isLogin ? 'Login with Google' : 'Sign up with Google'}</span>
          </button>
          
          <button 
            className="social-btn discord-btn" 
            disabled={isLoading}
            onClick={() => handleSocialLogin('Discord')}
          >
            <FaDiscord />
            <span>{isLogin ? 'Login with Discord' : 'Sign up with Discord'}</span>
          </button>
        </div>
        
        <div className="auth-divider">
          <span>or</span>
        </div>
        
        {error && <div className="auth-error">{error}</div>}
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="username">
              <FaUser className="input-icon" />
              <span>Username</span>
            </label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder={isLogin ? "Enter your username" : "Choose a username (3-20 characters)"}
              required
              disabled={isLoading}
              autoComplete="username"
              maxLength={20}
            />
            {!isLogin && (
              <div className="input-help-text">
                Letters, numbers, underscores, and hyphens only. No spaces or @ symbols.
              </div>
            )}
          </div>
          
          {!isLogin && (
            <div className="form-group">
              <label htmlFor="email">
                <FaEnvelope className="input-icon" />
                <span>Email</span>
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                required
                disabled={isLoading}
                autoComplete="email"
              />
            </div>
          )}
          
          <div className="form-group">
            <label htmlFor="password">
              <FaLock className="input-icon" />
              <span>Password</span>
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
              disabled={isLoading}
              autoComplete={isLogin ? "current-password" : "new-password"}
            />
          </div>
          
          {!isLogin && (
            <>
              <div className="form-group">
                <label htmlFor="confirmPassword">
                  <FaLock className="input-icon" />
                  <span>Confirm Password</span>
                </label>
                <input
                  type="password"
                  id="confirmPassword"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm your password"
                  required
                  disabled={isLoading}
                  autoComplete="new-password"
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="discordUsername">
                  <FaDiscord className="input-icon" />
                  <span>Discord Username (optional)</span>
                </label>
                <input
                  type="text"
                  id="discordUsername"
                  value={discordUsername}
                  onChange={(e) => setDiscordUsername(e.target.value)}
                  placeholder="For leaderboard integration"
                  disabled={isLoading}
                />
              </div>
            </>
          )}
          
          <button type="submit" className="auth-submit-btn" disabled={isLoading}>
            {isLoading ? (
              <>
                <FaSpinner className="spinner" /> 
                {isLogin ? 'Logging in...' : 'Creating Account...'}
              </>
            ) : (
              isLogin ? 'Login' : 'Create Account'
            )}
          </button>
        </form>
        
        <div className="auth-switch">
          {isLogin ? (
            <p>
              Don't have an account?{' '}
              <button 
                className="switch-btn"
                onClick={switchMode}
                disabled={isLoading}
              >
                Sign Up
              </button>
            </p>
          ) : (
            <p>
              Already have an account?{' '}
              <button 
                className="switch-btn"
                onClick={switchMode}
                disabled={isLoading}
              >
                Login
              </button>
            </p>
          )}
        </div>
        
        {isLogin && (
          <div className="forgot-password">
            <button className="forgot-btn" disabled={isLoading}>
              Forgot password?
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuthModal;