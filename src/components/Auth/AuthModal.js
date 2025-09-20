// components/Auth/AuthModal.js - ENHANCED: Login phase transitions with dynamic messages
import React, { useState, useEffect } from 'react';
import './AuthModal.css';
import helmetImage from '../../assets/helmet.png';

// Icons
import { FaTimes, FaUser, FaLock, FaGoogle, FaDiscord, FaEnvelope, FaSpinner } from 'react-icons/fa';

const AuthModal = ({ onClose, onLogin, isLoginLoading, loginPhase }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [discordUsername, setDiscordUsername] = useState('');
  const [error, setError] = useState('');
  
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
    
    setError('');
    
    try {
      const success = await onLogin(username.trim(), password);
      
      if (!success) {
        setError('Login failed. Please check your credentials and try again.');
      }
      // If success, modal will be closed by parent component after login phases complete
    } catch (error) {
      console.error('Authentication error:', error);
      setError('Something went wrong. Please try again.');
    }
  };
  
  const handleSocialLogin = (provider) => {
    if (isLoginLoading) return;
    
    // In a real app, this would initiate OAuth flow
    setError(`${provider} login is not available in demo mode`);
  };
  
  const switchMode = () => {
    if (isLoginLoading) return;
    setIsLogin(!isLogin);
    setError('');
  };
  
  const handleClose = () => {
    if (isLoginLoading) return;
    onClose();
  };

  // ENHANCED: Dynamic loading message based on login phase
  const getLoadingMessage = () => {
    if (!isLogin) {
      return 'Creating your account...';
    }
    
    switch (loginPhase) {
      case 'authenticating':
        return 'Logging you in...';
      case 'loading-dashboard':
        return 'Loading your dashboard...';
      default:
        return 'Logging you in...';
    }
  };

  // ENHANCED: Loading State with Dynamic Messages
  if (isLoginLoading) {
    return (
      <div className="modal-overlay">
        <div className="modal-content auth-modal">
          <div className="auth-loading-state">
            <img 
              src={helmetImage} 
              alt="Loading" 
              className="auth-loading-helmet"
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.nextElementSibling.style.display = 'block';
              }}
            />
            <div className="auth-loading-helmet-fallback" style={{display: 'none'}}>⚡</div>
            
            <div className="auth-loading-text">
              {getLoadingMessage()}
            </div>
            
            <div className="auth-loading-dots">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content auth-modal" onClick={e => e.stopPropagation()}>
        <button className="close-modal-btn" onClick={handleClose} disabled={isLoginLoading}>
          <FaTimes />
        </button>
        
        <h2>{isLogin ? 'Welcome Back' : 'Create Account'}</h2>
        
        <div className="auth-social-buttons">
          <button 
            className="social-btn google-btn" 
            disabled={isLoginLoading}
            onClick={() => handleSocialLogin('Google')}
          >
            <FaGoogle />
            <span>{isLogin ? 'Login with Google' : 'Sign up with Google'}</span>
          </button>
          
          <button 
            className="social-btn discord-btn" 
            disabled={isLoginLoading}
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
              disabled={isLoginLoading}
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
                disabled={isLoginLoading}
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
              disabled={isLoginLoading}
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
                  disabled={isLoginLoading}
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
                  disabled={isLoginLoading}
                />
              </div>
            </>
          )}
          
          <button type="submit" className="auth-submit-btn" disabled={isLoginLoading}>
            {isLoginLoading ? (
              <>
                <FaSpinner className="spinner" /> 
                {getLoadingMessage()}
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
                disabled={isLoginLoading}
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
                disabled={isLoginLoading}
              >
                Login
              </button>
            </p>
          )}
        </div>
        
        {isLogin && (
          <div className="forgot-password">
            <button className="forgot-btn" disabled={isLoginLoading}>
              Forgot password?
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuthModal;