// src/components/Announcements/WhatsNew.js
// What's New bottom sheet — auto-shows once per announcement on app load
// Informational style (not sales-style like PlanModal)

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import useSheetSwipe from '../../hooks/useSheetSwipe';
import { useTheme } from '../../App';
import './WhatsNew.css';
import '../../styles/BottomSheet.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001';
const SEEN_KEY = 'titantrack-seen-announcement';

const WhatsNew = ({ isLoggedIn, username }) => {
  const [announcement, setAnnouncement] = useState(null);
  const [showSheet, setShowSheet] = useState(false);
  const [sheetReady, setSheetReady] = useState(false);
  const sheetPanelRef = useRef(null);
  const navigate = useNavigate();
  const { theme } = useTheme();

  // Check if current user is admin (sees drafts too)
  const isAdmin = username && ['rossbased', 'ross'].includes(username.toLowerCase());

  // Fetch latest announcement on login
  useEffect(() => {
    if (!isLoggedIn) return;

    const checkAnnouncement = async () => {
      try {
        // Admin sees drafts via preview mode, regular users see published only
        let url = `${API_URL}/api/announcements/latest`;
        const headers = {};
        if (isAdmin) {
          url += '?preview=true';
          const token = localStorage.getItem('token');
          if (token) headers.Authorization = `Bearer ${token}`;
        }

        const res = await fetch(url, { headers });
        if (!res.ok) return;
        const data = await res.json();
        if (!data || !data._id) return;

        // Check if user has already seen this one
        const seenId = localStorage.getItem(SEEN_KEY);
        if (seenId === data._id) return;

        // Delay showing the sheet so the app has time to settle
        setTimeout(() => {
          setAnnouncement(data);
          setShowSheet(true);
        }, 1500);
      } catch (err) {
        // Silent fail — announcements are non-critical
      }
    };

    checkAnnouncement();
  }, [isLoggedIn, isAdmin]);

  // Sheet animation
  useEffect(() => {
    if (showSheet) {
      requestAnimationFrame(() => requestAnimationFrame(() => setSheetReady(true)));
    } else {
      setSheetReady(false);
    }
  }, [showSheet]);

  const closeSheet = useCallback((cb) => {
    setSheetReady(false);
    setTimeout(() => {
      if (cb) cb();
    }, 300);
  }, []);

  const dismiss = useCallback(() => {
    if (announcement?._id) {
      localStorage.setItem(SEEN_KEY, announcement._id);
    }
    closeSheet(() => setShowSheet(false));
  }, [announcement, closeSheet]);

  // Swipe-to-dismiss
  useSheetSwipe(sheetPanelRef, showSheet, dismiss);

  const handleFeedback = () => {
    dismiss();
    // Small delay so the sheet finishes closing before navigating
    setTimeout(() => navigate('/profile'), 350);
  };

  if (!showSheet || !announcement) return null;

  const formattedDate = new Date(announcement.publishedAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  return (
    <div 
      className={`sheet-backdrop wn-backdrop${sheetReady ? ' open' : ''}`} 
      onClick={dismiss}
    >
      <div 
        ref={sheetPanelRef}
        className={`sheet-panel wn-sheet${sheetReady ? ' open' : ''}`}
        onClick={e => e.stopPropagation()}
      >
        <div className="sheet-header" />

        <div className="wn-content">
          {/* Header */}
          <div className="wn-header">
            <img 
              src={theme === 'light' ? '/icon-192-black.png' : '/icon-192.png'} 
              alt="" 
              className="wn-icon" 
            />
            <h2 className="wn-title">What's New</h2>
            <span className="wn-version">v{announcement.version}</span>
            {announcement.status === 'draft' && (
              <span className="wn-draft-badge">Draft Preview</span>
            )}
          </div>

          {/* Announcement title */}
          <h3 className="wn-announcement-title">{announcement.title}</h3>

          {/* Body — lines starting with # render as section headers */}
          <div className="wn-body">
            {announcement.body.split('\n').map((line, i) => {
              const trimmed = line.trim();
              if (!trimmed) return null;
              if (trimmed.startsWith('# ')) {
                return <h4 key={i} className="wn-section-header">{trimmed.slice(2)}</h4>;
              }
              return <p key={i}>{trimmed}</p>;
            })}
          </div>

          {/* Date */}
          <span className="wn-date">{formattedDate}</span>

          {/* Feedback CTA */}
          <button className="wn-feedback" onClick={handleFeedback}>
            Got feedback? Let us know
          </button>

          {/* Dismiss */}
          <button className="wn-dismiss" onClick={dismiss}>
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};

export default WhatsNew;
