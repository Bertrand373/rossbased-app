// src/components/Auth/DiscordLinkCallback.js
// Handles the OAuth redirect when a user links their Discord from Profile
// Sends the code to /api/discord/link and refreshes subscription state

import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';

const API_URL = process.env.REACT_APP_API_URL || 'https://rossbased-app.onrender.com';

const DiscordLinkCallback = ({ onLinkComplete }) => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('processing');
  
  useEffect(() => {
    const code = searchParams.get('code');
    
    if (!code) {
      setStatus('error');
      toast.error('Discord linking failed - no code received');
      setTimeout(() => navigate('/profile', { replace: true }), 1500);
      return;
    }
    
    const linkDiscord = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          throw new Error('Not authenticated');
        }
        
        const response = await fetch(`${API_URL}/api/discord/link`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ code })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.message || data.error || 'Failed to link Discord');
        }
        
        setStatus('success');
        
        if (data.isGrandfathered) {
          toast.success('Discord linked! Lifetime access granted.', { duration: 4000 });
        } else {
          toast.success('Discord linked successfully');
        }
        
        // Notify parent to refresh data
        if (onLinkComplete) {
          onLinkComplete(data);
        }
        
        setTimeout(() => navigate('/profile', { replace: true }), 1000);
        
      } catch (error) {
        console.error('Discord link error:', error);
        setStatus('error');
        toast.error(error.message || 'Failed to link Discord');
        setTimeout(() => navigate('/profile', { replace: true }), 2000);
      }
    };
    
    linkDiscord();
  }, [searchParams, navigate, onLinkComplete]);
  
  // Simple loading state - uses existing app loading pattern
  const currentTheme = localStorage.getItem('titantrack-theme') || 'dark';
  const loadingIcon = currentTheme === 'light' ? '/icon-192-black.png' : '/icon-192.png';
  
  return (
    <div className="app-loading-screen">
      <img src={loadingIcon} alt="" className="app-loading-icon" />
      <p style={{ 
        color: currentTheme === 'light' ? '#000' : '#fff', 
        opacity: 0.5, 
        marginTop: 16,
        fontSize: '0.9rem'
      }}>
        {status === 'processing' && 'Linking Discord...'}
        {status === 'success' && 'Connected!'}
        {status === 'error' && 'Redirecting...'}
      </p>
    </div>
  );
};

export default DiscordLinkCallback;
