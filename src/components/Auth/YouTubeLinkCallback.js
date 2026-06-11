// src/components/Auth/YouTubeLinkCallback.js
// Handles the OAuth redirect when a user links their YouTube from Profile.
// Sends the auth code to /api/auth/youtube/link, then redirects back to profile.

import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { goldCheckIcon, GOLD_TOAST_CLASS } from '../Toast/ToastIcons';
import { consumeOAuthState } from '../../utils/oauthState';

const API_URL = process.env.REACT_APP_API_URL || 'https://rossbased-app.onrender.com';

const YouTubeLinkCallback = ({ onLinkComplete }) => {
  const [status, setStatus] = useState('processing');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const error = params.get('error');
    const returnedState = params.get('state');

    if (error) {
      toast.error('YouTube linking canceled');
      window.location.href = '/profile';
      return;
    }
    if (!code) {
      toast.error('YouTube linking failed');
      window.location.href = '/profile';
      return;
    }

    // Guard: prevent the same code from being used twice
    const codeKey = `youtube_link_${code}`;
    if (sessionStorage.getItem(codeKey)) return;
    sessionStorage.setItem(codeKey, 'processing');

    // CSRF guard: the state Google echoes back must match the one we set when
    // this browser started the link flow. After the codeKey guard so
    // StrictMode's second mount doesn't double-consume the stored state.
    if (!consumeOAuthState('youtube_link', returnedState)) {
      sessionStorage.removeItem(codeKey);
      toast.error('Security check failed. Please try linking again.');
      window.location.href = '/profile';
      return;
    }

    const linkYouTube = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) throw new Error('Not authenticated');

        const response = await fetch(`${API_URL}/api/auth/youtube/link`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ code })
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || data.error || 'Failed to link YouTube');
        }

        setStatus('success');
        sessionStorage.removeItem(codeKey);

        // Gold icon — Oracle-themed
        toast.success(`YouTube linked — Oracle will recognize you in the comments.`, { duration: 4000, icon: goldCheckIcon, className: GOLD_TOAST_CLASS });

        if (onLinkComplete) onLinkComplete(data);

        setTimeout(() => { window.location.href = '/profile'; }, 1000);

      } catch (err) {
        console.error('YouTube link error:', err);
        setStatus('error');
        sessionStorage.removeItem(codeKey);
        toast.error(err.message || 'Failed to link YouTube');
        setTimeout(() => { window.location.href = '/profile'; }, 2000);
      }
    };

    linkYouTube();
  }, [onLinkComplete]);

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
        {status === 'processing' && 'Linking YouTube...'}
        {status === 'success' && 'Connected!'}
        {status === 'error' && 'Redirecting...'}
      </p>
    </div>
  );
};

export default YouTubeLinkCallback;
