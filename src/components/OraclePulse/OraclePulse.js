// src/components/OraclePulse/OraclePulse.js
// Oracle's daily observation on the Tracker — replaces static DailyQuote
// Free users: community-level observation (static render)
// Premium/OG: personalized observation with type-in effect + Oracle Gold support
import React, { useState, useEffect, useRef } from 'react';
import './OraclePulse.css';

const API = process.env.REACT_APP_API || process.env.REACT_APP_API_URL || 'https://rossbased-app.onrender.com';

const OraclePulse = ({ isPremium, isGold }) => {
  const [observation, setObservation] = useState(null);
  const [generatedAt, setGeneratedAt] = useState(null);
  const [tier, setTier] = useState(null);
  const [loading, setLoading] = useState(true);
  const [displayedText, setDisplayedText] = useState('');
  const [typingComplete, setTypingComplete] = useState(false);

  const mountedRef = useRef(true);
  const typingTimeoutRef = useRef(null);

  // Cleanup mounted ref
  useEffect(() => {
    return () => { mountedRef.current = false; };
  }, []);

  // Fetch observation from backend
  useEffect(() => {
    const fetchPulse = async () => {
      const token = localStorage.getItem('token');
      if (!token) { setLoading(false); return; }

      // Check localStorage cache (one per day)
      const today = new Date().toISOString().split('T')[0];
      const cacheKey = `oracle_pulse_${today}`;
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        try {
          const data = JSON.parse(cached);
          setObservation(data.observation);
          setGeneratedAt(data.generatedAt);
          setTier(data.tier);
          setLoading(false);
          return;
        } catch { /* stale cache, refetch */ }
      }

      try {
        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
        const res = await fetch(`${API}/api/oracle/pulse?timezone=${encodeURIComponent(tz)}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setObservation(data.observation);
          setGeneratedAt(data.generatedAt);
          setTier(data.tier);
          // Clear old cache keys, store today's
          Object.keys(localStorage).forEach(k => {
            if (k.startsWith('oracle_pulse_') && k !== cacheKey) localStorage.removeItem(k);
          });
          localStorage.setItem(cacheKey, JSON.stringify(data));
        }
      } catch (err) {
        console.error('Oracle Pulse fetch error:', err);
      }
      setLoading(false);
    };

    fetchPulse();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Typing effect — premium only, first view per day
  useEffect(() => {
    if (!observation || loading) return;

    const today = new Date().toISOString().split('T')[0];
    const seenKey = `oracle_pulse_seen_${today}`;
    const alreadySeen = localStorage.getItem(seenKey);

    // Static render for: free users, already-seen today, or community tier
    if (alreadySeen || tier !== 'personalized') {
      setDisplayedText(observation);
      setTypingComplete(true);
      return;
    }

    // Clean old seen keys
    Object.keys(localStorage).forEach(k => {
      if (k.startsWith('oracle_pulse_seen_') && k !== seenKey) localStorage.removeItem(k);
    });

    // Type-in effect
    let index = 0;

    const typeNext = () => {
      if (!mountedRef.current) return;
      if (index >= observation.length) {
        setTypingComplete(true);
        localStorage.setItem(seenKey, 'true');
        return;
      }

      index++;
      setDisplayedText(observation.substring(0, index));

      const char = observation[index - 1];
      let delay = 30;
      if (char === '.' && index < observation.length) delay = 220;
      else if (char === ',') delay = 110;
      else if (char === ':') delay = 140;

      typingTimeoutRef.current = setTimeout(typeNext, delay);
    };

    // Initial delay before typing begins
    typingTimeoutRef.current = setTimeout(typeNext, 500);

    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, [observation, loading, tier]);

  // Don't render until we have something
  if (loading || !observation) return null;

  const label = tier === 'personalized' ? 'ORACLE OBSERVES YOU' : 'ORACLE OBSERVES';
  const isPersonalGold = isGold && tier === 'personalized';

  // Format the generation timestamp
  let timeStr = '';
  if (generatedAt) {
    try {
      timeStr = new Date(generatedAt).toLocaleTimeString('en-US', { 
        hour: 'numeric', minute: '2-digit', hour12: true 
      });
    } catch { /* fallback: no time shown */ }
  }

  return (
    <div className={`oracle-pulse${typingComplete ? ' revealed' : ''}`}>
      <span className={`oracle-pulse-label${isPersonalGold ? ' gold' : ''}`}>{label}</span>
      <p className={`oracle-pulse-text${isPersonalGold ? ' oracle-gold' : ''}${!typingComplete ? ' typing' : ''}`}>
        {displayedText}
        {!typingComplete && <span className="oracle-pulse-cursor" />}
      </p>
      {typingComplete && timeStr && (
        <span className="oracle-pulse-time">Today · {timeStr}</span>
      )}
    </div>
  );
};

export default OraclePulse;
