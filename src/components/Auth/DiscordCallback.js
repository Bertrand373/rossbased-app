// src/components/Auth/DiscordCallback.js
import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

const API_URL = process.env.REACT_APP_API_URL || 'https://rossbased-app.onrender.com';

const DiscordCallback = ({ onLogin }) => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = useState('');

  useEffect(() => {
    const code = searchParams.get('code');
    
    if (code) {
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

      // Call onLogin
      await onLogin(data.username, null, true);
      
      // Navigate to home
      navigate('/');
    } catch (err) {
      console.error('Discord auth error:', err);
      setError(err.message || 'Discord sign-in failed');
    }
  };

  if (error) {
    return (
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column',
        alignItems: 'center', 
        justifyContent: 'center', 
        height: '100vh',
        color: 'white',
        textAlign: 'center',
        padding: '20px'
      }}>
        <h2>Authentication Error</h2>
        <p>{error}</p>
        <button 
          onClick={() => navigate('/')}
          style={{
            marginTop: '20px',
            padding: '12px 24px',
            background: '#5865F2',
            border: 'none',
            borderRadius: '8px',
            color: 'white',
            cursor: 'pointer'
          }}
        >
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column',
      alignItems: 'center', 
      justifyContent: 'center', 
      height: '100vh',
      color: 'white'
    }}>
      <p>Signing in with Discord...</p>
    </div>
  );
};

export default DiscordCallback;