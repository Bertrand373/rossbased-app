// components/Auth/AuthModal.js
import React, { useState } from 'react';
import './AuthModal.css';

// Icons
import { FaTimes, FaUser, FaLock, FaGoogle, FaDiscord } from 'react-icons/fa';

const AuthModal = ({ onClose, onLogin }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [discordUsername, setDiscordUsername] = useState('');
  const [error, setError] = useState('');
  
  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Basic validation
    if (!username || !password) {
      setError('Please fill out all required fields');
      return;
    }
    
    if (!isLogin && password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    // In a real app, this would authenticate with a backend
    // For demo purposes, we'll just pass the username to the login function
    onLogin(username, password);
    onClose();
  };
  
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content auth-modal" onClick={e => e.stopPropagation()}>
        <button className="close-modal-btn" onClick={onClose}>
          <FaTimes />
        </button>
        
        <h2>{isLogin ? 'Welcome Back' : 'Create Account'}</h2>
        
        <div className="auth-social-buttons">
          <button className="social-btn google-btn">
            <FaGoogle />
            <span>{isLogin ? 'Login with Google' : 'Sign up with Google'}</span>
          </button>
          
          <button className="social-btn discord-btn">
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
              placeholder="Enter your username"
              required
            />
          </div>
          
          {!isLogin && (
            <div className="form-group">
              <label htmlFor="email">
                <span>Email</span>
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                required
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
                />
              </div>
            </>
          )}
          
          <button type="submit" className="btn btn-primary auth-submit-btn">
            {isLogin ? 'Login' : 'Create Account'}
          </button>
        </form>
        
        <div className="auth-switch">
          {isLogin ? (
            <p>
              Don't have an account?{' '}
              <button 
                className="switch-btn"
                onClick={() => setIsLogin(false)}
              >
                Sign Up
              </button>
            </p>
          ) : (
            <p>
              Already have an account?{' '}
              <button 
                className="switch-btn"
                onClick={() => setIsLogin(true)}
              >
                Login
              </button>
            </p>
          )}
        </div>
        
        {isLogin && (
          <div className="forgot-password">
            <button className="forgot-btn">Forgot password?</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuthModal;