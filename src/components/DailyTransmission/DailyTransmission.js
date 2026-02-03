// src/components/DailyTransmission/DailyTransmission.js
// AI-powered daily wisdom transmission
// Uses pure DOM for overlay to avoid React re-render issues
// THEME-AWARE: Reads current theme and applies appropriate colors

import React, { useState, useEffect, useRef, useCallback } from 'react';
import './DailyTransmission.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001';

// Pure DOM overlay - completely outside React
// Theme-aware: reads data-theme attribute and matches inline card styling
const showOverlay = (content) => {
  // Remove any existing overlay first
  const existing = document.getElementById('transmission-overlay-root');
  if (existing) existing.remove();
  
  // Get current theme
  const theme = document.documentElement.getAttribute('data-theme') || 'dark';
  const isLight = theme === 'light';
  
  // Theme-aware colors - matches inline card styling (surface-overlay pattern)
  const colors = isLight ? {
    backdrop: 'rgba(255,255,255,0.95)',
    cardBg: 'rgba(0,0,0,0.03)',
    cardBorder: 'rgba(0,0,0,0.06)',
    cardShadow: '0 20px 60px rgba(0,0,0,0.12)',
    accent: '#b8860b',
    accentMuted: 'rgba(184,134,11,0.5)',
    text: 'rgba(0,0,0,0.6)',
    textStrong: '#000000',
    closeBtn: 'rgba(0,0,0,0.4)'
  } : {
    backdrop: 'rgba(0,0,0,0.95)',
    cardBg: 'rgba(255,255,255,0.08)',
    cardBorder: 'rgba(255,255,255,0.04)',
    cardShadow: '0 20px 60px rgba(0,0,0,0.5)',
    accent: '#ffdd00',
    accentMuted: 'rgba(255,221,0,0.5)',
    text: 'rgba(255,255,255,0.6)',
    textStrong: '#ffffff',
    closeBtn: 'rgba(255,255,255,0.4)'
  };
  
  // Create overlay container
  const root = document.createElement('div');
  root.id = 'transmission-overlay-root';
  root.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;z-index:99999;';
  root.innerHTML = `
    <div class="trans-modal-backdrop" style="position:fixed;top:0;left:0;right:0;bottom:0;background:${colors.backdrop};backdrop-filter:blur(40px);-webkit-backdrop-filter:blur(40px);z-index:99999;"></div>
    <div class="trans-modal-card" style="position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);width:calc(100vw - 40px);max-width:400px;background:${colors.cardBg};border:1px solid ${colors.cardBorder};border-radius:12px;padding:20px;z-index:100000;box-shadow:${colors.cardShadow};">
      <div style="display:flex;align-items:center;gap:6px;margin-bottom:14px;">
        <span style="font-size:0.625rem;color:${colors.accent};opacity:0.7;">✦</span>
        <span style="font-size:0.5625rem;font-weight:600;color:${colors.accentMuted};letter-spacing:0.1em;text-transform:uppercase;flex:1;">Daily Transmission</span>
        <button id="trans-close-btn" style="background:none;border:none;color:${colors.closeBtn};font-size:1.5rem;cursor:pointer;padding:0;line-height:1;width:32px;height:32px;display:flex;align-items:center;justify-content:center;">×</button>
      </div>
      <p style="font-size:0.9375rem;color:${colors.text};line-height:1.65;margin:0;">${content}</p>
    </div>
  `;
  
  // Style the strong tags in the content
  const paragraph = root.querySelector('p');
  if (paragraph) {
    const strongs = paragraph.querySelectorAll('strong');
    strongs.forEach(strong => {
      strong.style.color = colors.textStrong;
      strong.style.fontWeight = '600';
    });
  }
  
  document.body.appendChild(root);
  document.body.style.overflow = 'hidden';
  
  // Close handler - only runs on valid click events
  const closeOverlay = (e) => {
    if (!e || !e.target) return; // Guard against invalid calls
    e.preventDefault();
    e.stopPropagation();
    root.remove();
    document.body.style.overflow = '';
  };
  
  // Attach listeners after DOM is ready
  setTimeout(() => {
    const backdrop = root.querySelector('.trans-modal-backdrop');
    const closeBtn = root.querySelector('#trans-close-btn');
    
    if (backdrop) backdrop.addEventListener('click', closeOverlay);
    if (closeBtn) closeBtn.addEventListener('click', closeOverlay);
  }, 0);
};

const DailyTransmission = ({ userData, isPatternAlertShowing }) => {
  const [transmission, setTransmission] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [displayedText, setDisplayedText] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [hasSeenToday, setHasSeenToday] = useState(false);
  const [needsExpansion, setNeedsExpansion] = useState(false);
  
  const streamIntervalRef = useRef(null);
  const hasStreamedRef = useRef(false);
  const textRef = useRef(null);
  const formattedContentRef = useRef('');

  const getTodayKey = useCallback(() => {
    const today = new Date().toDateString();
    return `transmission_seen_${today}`;
  }, []);

  useEffect(() => {
    if (textRef.current && displayedText && !isStreaming) {
      const element = textRef.current;
      setNeedsExpansion(element.scrollHeight > element.clientHeight + 2);
    }
  }, [displayedText, isStreaming]);

  const fetchTransmission = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const token = localStorage.getItem('token');
      if (!token) {
        setIsLoading(false);
        return;
      }

      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

      const response = await fetch(`${API_URL}/api/transmission?timezone=${encodeURIComponent(timezone)}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch transmission');
      }

      const data = await response.json();
      setTransmission(data);

      const seenToday = localStorage.getItem(getTodayKey());
      setHasSeenToday(!!seenToday);

      if (seenToday || hasStreamedRef.current) {
        setDisplayedText(data.transmission);
      }

    } catch (err) {
      console.error('Transmission fetch error:', err);
      setError(err.message);
      setTransmission({
        transmission: "Your journey continues. Every day of retention builds upon the last.",
        fallback: true
      });
      setDisplayedText("Your journey continues. Every day of retention builds upon the last.");
    } finally {
      setIsLoading(false);
    }
  }, [getTodayKey]);

  useEffect(() => {
    fetchTransmission();
    
    return () => {
      if (streamIntervalRef.current) {
        clearInterval(streamIntervalRef.current);
      }
    };
  }, [fetchTransmission]);

  useEffect(() => {
    if (!transmission || isLoading || hasSeenToday || hasStreamedRef.current) {
      return;
    }

    setIsStreaming(true);
    const fullText = transmission.transmission;
    let currentIndex = 0;
    let currentDisplay = '';

    streamIntervalRef.current = setInterval(() => {
      if (currentIndex >= fullText.length) {
        clearInterval(streamIntervalRef.current);
        setIsStreaming(false);
        setDisplayedText(fullText);
        hasStreamedRef.current = true;
        localStorage.setItem(getTodayKey(), 'true');
        setHasSeenToday(true);
        return;
      }

      const char = fullText[currentIndex];

      if (char === '*' && fullText[currentIndex + 1] === '*') {
        currentIndex += 2;
        return;
      }

      currentDisplay += char;
      setDisplayedText(currentDisplay);
      currentIndex++;
    }, 20);

    return () => {
      if (streamIntervalRef.current) {
        clearInterval(streamIntervalRef.current);
      }
    };
  }, [transmission, isLoading, hasSeenToday, getTodayKey]);

  // Cleanup overlay on unmount
  useEffect(() => {
    return () => {
      const existing = document.getElementById('transmission-overlay-root');
      if (existing) existing.remove();
      document.body.style.overflow = '';
    };
  }, []);

  if (isPatternAlertShowing) {
    return null;
  }

  if (!userData?.startDate) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="daily-transmission">
        <div className="transmission-header">
          <span className="transmission-icon">✦</span>
          <span className="transmission-label">Daily Transmission</span>
        </div>
        <div className="transmission-skeleton">
          <div className="skeleton-line"></div>
          <div className="skeleton-line"></div>
        </div>
      </div>
    );
  }

  if (error && !transmission) {
    return null;
  }

  const formatText = (text) => {
    if (!text) return '';
    let formatted = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    if (!formatted.startsWith('<strong>')) {
      formatted = formatted.replace(/^(Day \d[\d,]*\.?)/, '<strong>$1</strong>');
    }
    return formatted;
  };

  const formattedContent = formatText(displayedText);
  formattedContentRef.current = formattedContent;

  const handleExpand = () => {
    if (needsExpansion && !isStreaming) {
      showOverlay(formattedContentRef.current);
    }
  };

  return (
    <div 
      className={`daily-transmission ${isStreaming ? 'streaming' : ''} ${needsExpansion ? 'expandable' : ''}`}
      onClick={handleExpand}
    >
      <div className="transmission-header">
        <span className="transmission-icon">✦</span>
        <span className="transmission-label">Daily Transmission</span>
        {needsExpansion && !isStreaming && (
          <span className="transmission-expand-hint">+</span>
        )}
      </div>
      <p 
        ref={textRef}
        className="transmission-text"
        dangerouslySetInnerHTML={{ __html: formattedContent }}
      />
      {isStreaming && <span className="transmission-cursor"></span>}
    </div>
  );
};

export default DailyTransmission;
