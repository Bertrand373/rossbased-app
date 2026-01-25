// src/components/DailyTransmission/DailyTransmission.js
// AI-powered daily wisdom transmission - replaces DailyQuote
// Streams on first view of the day, shows instantly on subsequent views

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
  
  const streamIntervalRef = useRef(null);
  const hasStreamedRef = useRef(false);

  // Check if user has seen today's transmission
  const getTodayKey = useCallback(() => {
    const today = new Date().toDateString();
    return `transmission_seen_${today}`;
  }, []);

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

  return (
    <div className={`daily-transmission ${isStreaming ? 'streaming' : ''}`}>
      <div className="transmission-header">
        <span className="transmission-icon">✦</span>
        <span className="transmission-label">Daily Transmission</span>
      </div>
      <p 
        className="transmission-text"
        dangerouslySetInnerHTML={{ __html: formatText(displayedText) }}
      />
      {isStreaming && <span className="transmission-cursor"></span>}
    </div>
  );
};

export default DailyTransmission;
