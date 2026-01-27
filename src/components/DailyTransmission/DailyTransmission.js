// src/components/DailyTransmission/DailyTransmission.js
// AI-powered daily wisdom transmission
// Uses pure DOM for overlay to avoid React re-render issues

import React, { useState, useEffect, useRef, useCallback } from 'react';
import './DailyTransmission.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001';

// Pure DOM overlay - completely outside React
const showOverlay = (content) => {
  console.log('🟢 showOverlay called');
  
  // Remove any existing overlay first
  const existing = document.getElementById('transmission-overlay-root');
  if (existing) {
    console.log('🟡 Removing existing overlay');
    existing.remove();
  }
  
  // Create overlay container
  const root = document.createElement('div');
  root.id = 'transmission-overlay-root';
  root.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;z-index:99999;';
  root.innerHTML = `
    <div class="trans-modal-backdrop" style="position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.85);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);z-index:99999;"></div>
    <div class="trans-modal-card" style="position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);width:calc(100vw - 40px);max-width:400px;background:#0a0a0a;border:1px solid rgba(255,221,0,0.15);border-radius:16px;padding:20px;z-index:100000;box-shadow:0 20px 60px rgba(0,0,0,0.6);">
      <div style="display:flex;align-items:center;gap:6px;margin-bottom:14px;">
        <span style="font-size:0.625rem;color:#ffdd00;opacity:0.7;">✦</span>
        <span style="font-size:0.5625rem;font-weight:600;color:rgba(255,221,0,0.5);letter-spacing:0.1em;text-transform:uppercase;flex:1;">Daily Transmission</span>
        <button id="trans-close-btn" style="background:none;border:none;color:rgba(255,255,255,0.4);font-size:1.5rem;cursor:pointer;padding:0;line-height:1;width:32px;height:32px;display:flex;align-items:center;justify-content:center;">×</button>
      </div>
      <p style="font-size:0.9375rem;color:rgba(255,255,255,0.65);line-height:1.65;margin:0;">${content}</p>
    </div>
  `;
  
  document.body.appendChild(root);
  console.log('🟢 Overlay appended to body');
  document.body.style.overflow = 'hidden';
  
  // Monitor for removal
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.removedNodes.forEach((node) => {
        if (node.id === 'transmission-overlay-root') {
          console.log('🔴 OVERLAY WAS REMOVED! Stack trace:');
          console.trace();
        }
      });
    });
  });
  observer.observe(document.body, { childList: true });
  
  // Close handlers
  const closeOverlay = (e) => {
    console.log('🟡 closeOverlay called by:', e.target);
    e.preventDefault();
    e.stopPropagation();
    observer.disconnect();
    root.remove();
    document.body.style.overflow = '';
  };
  
  // Use setTimeout to ensure elements exist before attaching listeners
  setTimeout(() => {
    const backdrop = root.querySelector('.trans-modal-backdrop');
    const closeBtn = root.querySelector('#trans-close-btn');
    
    if (backdrop) backdrop.addEventListener('click', closeOverlay);
    if (closeBtn) closeBtn.addEventListener('click', closeOverlay);
    console.log('🟢 Event listeners attached');
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
