// src/components/DailyTransmission/DailyTransmission.js
// AI-powered daily wisdom transmission
// Uses React Portal for overlay

import React, { useState, useEffect, useRef, useCallback } from 'react';
import ReactDOM from 'react-dom';
import './DailyTransmission.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001';

// Global state outside React to survive re-renders
let globalExpanded = false;
let globalSetExpanded = null;

// Overlay rendered via Portal
const TransmissionOverlay = ({ content }) => {
  const [isOpen, setIsOpen] = useState(globalExpanded);
  
  // Register the setter globally
  useEffect(() => {
    globalSetExpanded = setIsOpen;
    setIsOpen(globalExpanded);
    return () => { globalSetExpanded = null; };
  }, []);
  
  // Sync with global state
  useEffect(() => {
    globalExpanded = isOpen;
  }, [isOpen]);

  const handleClose = () => {
    globalExpanded = false;
    setIsOpen(false);
  };

  if (!isOpen) return null;
  
  return ReactDOM.createPortal(
    <div className="transmission-portal">
      <div 
        className="transmission-overlay" 
        onClick={handleClose}
      />
      <div 
        className="daily-transmission expanded"
        onClick={(e) => e.stopPropagation()}
      >
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
          dangerouslySetInnerHTML={{ __html: content }}
        />
      </div>
    </div>,
    document.body
  );
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

  const handleExpand = () => {
    if (needsExpansion && !isStreaming) {
      globalExpanded = true;
      if (globalSetExpanded) {
        globalSetExpanded(true);
      }
    }
  };

  return (
    <>
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

      <TransmissionOverlay content={formattedContent} />
    </>
  );
};

export default DailyTransmission;
