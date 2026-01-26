// src/components/DailyTransmission/DailyTransmission.js
// AI-powered daily wisdom transmission - replaces DailyQuote
// Expandable card: shows preview, tap to expand as overlay

import React, { useState, useEffect, useRef, useCallback } from 'react';
import './DailyTransmission.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001';

const DailyTransmission = ({ userData, isPatternAlertShowing }) => {
  const [transmission, setTransmission] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [displayedText, setDisplayedText] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [hasSeenToday, setHasSeenToday] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [needsExpansion, setNeedsExpansion] = useState(false);
  
  const streamIntervalRef = useRef(null);
  const hasStreamedRef = useRef(false);
  const textRef = useRef(null);

  // Check if user has seen today's transmission
  const getTodayKey = useCallback(() => {
    const today = new Date().toDateString();
    return `transmission_seen_${today}`;
  }, []);

  // Check if text overflows (needs expansion)
  useEffect(() => {
    if (textRef.current && displayedText && !isStreaming) {
      const element = textRef.current;
      // Check if content exceeds 3 lines (approx 4.8em at 1.6 line-height)
      setNeedsExpansion(element.scrollHeight > element.clientHeight + 2);
    }
  }, [displayedText, isStreaming]);

  // Fetch transmission from server
  const fetchTransmission = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const token = localStorage.getItem('token');
      if (!token) {
        setIsLoading(false);
        return;
      }

      // Get user's timezone for accurate day calculation
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

      // Check if already seen today
      const seenToday = localStorage.getItem(getTodayKey());
      setHasSeenToday(!!seenToday);

      // If seen today, show full text immediately
      if (seenToday || hasStreamedRef.current) {
        setDisplayedText(data.transmission);
      }

    } catch (err) {
      console.error('Transmission fetch error:', err);
      setError(err.message);
      // Set fallback
      setTransmission({
        transmission: "Your journey continues. Every day of retention builds upon the last.",
        fallback: true
      });
      setDisplayedText("Your journey continues. Every day of retention builds upon the last.");
    } finally {
      setIsLoading(false);
    }
  }, [getTodayKey]);

  // Initial fetch
  useEffect(() => {
    fetchTransmission();
    
    // Cleanup streaming on unmount
    return () => {
      if (streamIntervalRef.current) {
        clearInterval(streamIntervalRef.current);
      }
    };
  }, [fetchTransmission]);

  // Stream effect for first view of the day
  useEffect(() => {
    if (!transmission || isLoading || hasSeenToday || hasStreamedRef.current) {
      return;
    }

    // Start streaming
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
        
        // Mark as seen today
        localStorage.setItem(getTodayKey(), 'true');
        setHasSeenToday(true);
        return;
      }

      const char = fullText[currentIndex];

      // Handle HTML tags (for bold text like **Day 23.**)
      if (char === '*' && fullText[currentIndex + 1] === '*') {
        // Skip markdown bold markers, we'll handle styling in CSS
        currentIndex += 2;
        return;
      }

      currentDisplay += char;
      setDisplayedText(currentDisplay);
      currentIndex++;
    }, 20); // ~50 chars per second

    return () => {
      if (streamIntervalRef.current) {
        clearInterval(streamIntervalRef.current);
      }
    };
  }, [transmission, isLoading, hasSeenToday, getTodayKey]);

  // Don't render if pattern alert is showing (they're mutually exclusive)
  if (isPatternAlertShowing) {
    return null;
  }

  // Don't render if no start date (onboarding not complete)
  if (!userData?.startDate) {
    return null;
  }

  // Loading state
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

  // Error state - show fallback
  if (error && !transmission) {
    return null;
  }

  // Format text - convert **bold** to <strong>
  const formatText = (text) => {
    if (!text) return '';
    
    // Convert **text** to <strong>text</strong>
    let formatted = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    
    // Also handle Day X. at start to make it bold if not already
    if (!formatted.startsWith('<strong>')) {
      formatted = formatted.replace(/^(Day \d[\d,]*\.?)/, '<strong>$1</strong>');
    }
    
    return formatted;
  };

  const handleCardClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (needsExpansion && !isStreaming) {
      setIsExpanded(true);
    }
  };

  const handleClose = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsExpanded(false);
  };

  return (
    <>
      {/* Collapsed card - always in normal flow */}
      <div 
        className={`daily-transmission ${isStreaming ? 'streaming' : ''} ${needsExpansion ? 'expandable' : ''} ${isExpanded ? 'hidden-for-expand' : ''}`}
        onClick={handleCardClick}
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
          dangerouslySetInnerHTML={{ __html: formatText(displayedText) }}
        />
        {isStreaming && <span className="transmission-cursor"></span>}
      </div>

      {/* Expanded overlay - rendered separately */}
      {isExpanded && (
        <>
          <div className="transmission-overlay" onClick={handleClose} />
          <div className="daily-transmission expanded" onClick={(e) => e.stopPropagation()}>
            <div className="transmission-header">
              <span className="transmission-icon">✦</span>
              <span className="transmission-label">Daily Transmission</span>
              <button 
                className="transmission-close-btn" 
                onClick={handleClose}
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <p 
              className="transmission-text"
              dangerouslySetInnerHTML={{ __html: formatText(displayedText) }}
            />
          </div>
        </>
      )}
    </>
  );
};

export default DailyTransmission;
