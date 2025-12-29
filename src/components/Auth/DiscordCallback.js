// src/components/Auth/DiscordCallback.js
import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { trackLogin, trackSignup } from '../../utils/mixpanel';

const API_URL = process.env.REACT_APP_API_URL || 'https://rossbased-app.onrender.com';

const DiscordCallback = ({ onLogin }) => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const hasProcessed = useRef(false);

  useEffect(() => {
    // Prevent double processing in React StrictMode
    if (hasProcessed.current) return;
    
    const code = searchParams.get('code');
    
    if (code) {
      hasProcessed.current = true;
      handleDiscordAuth(code);
    } else {
      setError('No authorization code received');
    }
  }, [searchParams]);

  const handleDiscordAuth = async (code) => {
    try {
      const response = await fetch(`${API_URL}/api/auth/discord`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Discord authentication failed');
      }

      // Store token and username
      localStorage.setItem('token', data.token);
      localStorage.setItem('username', data.username);

      // Track signup or login in Mixpanel
      if (data.isNewUser) {
        trackSignup('discord');
      } else {
        trackLogin('discord');
      }

      // Call onLogin
      await onLogin(data.username, null, true);
      
      // Navigate with replace
      navigate('/', { replace: true });
    } catch (err) {
      console.error('Discord auth error:', err);
      setError(err.message || 'Discord sign-in failed');
    }
  };

  // Error state
  if (error) {
    return (
      <div style={styles.container}>
        <div style={styles.errorCard}>
          <img 
            src="/icon-192.png" 
            alt="" 
            style={styles.errorIcon}
          />
          <h2 style={styles.errorTitle}>Authentication Error</h2>
          <p style={styles.errorText}>{error}</p>
          <button 
            onClick={() => navigate('/')}
            style={styles.button}
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  // Loading state - Icon only, identical to main app loading screen
  return (
    <div style={styles.container}>
      <img 
        src="/icon-192.png" 
        alt="" 
        style={styles.icon}
      />
      <style>{keyframes}</style>
    </div>
  );
};

// Keyframes matching App.css exactly
const keyframes = `
  @keyframes icon-pulse {
    0%, 100% { 
      opacity: 1; 
      transform: scale(1);
    }
    50% { 
      opacity: 0.4; 
      transform: scale(0.95);
    }
  }
`;

// Styles matching app-loading-screen exactly
const styles = {
  container: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#000000',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999
  },
  icon: {
    width: '64px',
    height: '64px',
    animation: 'icon-pulse 2s ease-in-out infinite'
  },
  errorCard: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    padding: '40px 20px'
  },
  errorIcon: {
    width: '64px',
    height: '64px',
    opacity: 0.4,
    marginBottom: '24px'
  },
  errorTitle: {
    color: '#fff',
    fontSize: '1.125rem',
    fontWeight: '600',
    margin: '0 0 12px 0',
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, system-ui, sans-serif"
  },
  errorText: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: '0.875rem',
    margin: '0 0 24px 0',
    lineHeight: '1.5',
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, system-ui, sans-serif"
  },
  button: {
    padding: '14px 32px',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    border: '1px solid rgba(255, 255, 255, 0.15)',
    borderRadius: '8px',
    color: '#fff',
    fontSize: '0.875rem',
    fontWeight: '500',
    cursor: 'pointer',
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
    transition: 'all 0.15s ease'
  }
};

export default DiscordCallback;