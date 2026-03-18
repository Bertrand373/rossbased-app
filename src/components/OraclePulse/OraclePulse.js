// src/components/OraclePulse/OraclePulse.js
// Oracle's daily observation on the Tracker — replaces static DailyQuote
// Free users: community-level observation (static render)
// Premium/OG: personalized observation with word-by-word fade + Oracle Gold support
import React, { useState, useEffect, useRef } from 'react';
import './OraclePulse.css';

const API = process.env.REACT_APP_API || process.env.REACT_APP_API_URL || 'https://rossbased-app.onrender.com';

const OraclePulse = ({ isPremium, isGold }) => {
  const [observation, setObservation] = useState(null);
  const [generatedAt, setGeneratedAt] = useState(null);
  const [tier, setTier] = useState(null);
  const [loading, setLoading] = useState(true);
  const [revealCount, setRevealCount] = useState(0);
  const [animating, setAnimating] = useState(false);
  const [complete, setComplete] = useState(false);

  const mountedRef = useRef(true);
  const intervalRef = useRef(null);

  useEffect(() => {
    return () => { 
      mountedRef.current = false;
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  // Fetch observation from backend
  useEffect(() => {
    const fetchPulse = async () => {
      const token = localStorage.getItem('token');
      if (!token) { setLoading(false); return; }

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

  // Word-by-word reveal — premium only, first view per day
  useEffect(() => {
    if (!observation || loading) return;

    const today = new Date().toISOString().split('T')[0];
    const seenKey = `oracle_pulse_seen_${today}`;
    const alreadySeen = localStorage.getItem(seenKey);

    // Static render for: free users, already-seen today, or community tier
    if (alreadySeen || tier !== 'personalized') {
      setRevealCount(observation.split(' ').length);
      setComplete(true);
      return;
    }

    // Clean old seen keys
    Object.keys(localStorage).forEach(k => {
      if (k.startsWith('oracle_pulse_seen_') && k !== seenKey) localStorage.removeItem(k);
    });

    // Word-by-word reveal
    const words = observation.split(' ');
    setAnimating(true);
    let count = 0;

    // Initial pause before first word
    const startTimeout = setTimeout(() => {
      if (!mountedRef.current) return;

      intervalRef.current = setInterval(() => {
        if (!mountedRef.current) { clearInterval(intervalRef.current); return; }
        count++;
        setRevealCount(count);

        if (count >= words.length) {
          clearInterval(intervalRef.current);
          setTimeout(() => {
            if (!mountedRef.current) return;
            setAnimating(false);
            setComplete(true);
            localStorage.setItem(seenKey, 'true');
          }, 400);
        }
      }, 160);
    }, 600);

    return () => {
      clearTimeout(startTimeout);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [observation, loading, tier]);

  if (loading || !observation) return null;

  const label = tier === 'personalized' ? 'ORACLE PULSE' : 'ORACLE';
  const isPersonalGold = isGold;
  const words = observation.split(' ');

  // Format timestamp
  let timeStr = '';
  if (generatedAt) {
    try {
      timeStr = new Date(generatedAt).toLocaleTimeString('en-US', { 
        hour: 'numeric', minute: '2-digit', hour12: true 
      });
    } catch { /* no time shown */ }
  }

  return (
    <div className={`oracle-pulse${complete ? ' revealed' : ''}`}>
      <span className={`oracle-pulse-label${isPersonalGold ? ' gold' : ''}`}>{label}</span>
      <p className={`oracle-pulse-text${isPersonalGold ? ' oracle-gold' : ''}`}>
        {words.map((word, i) => (
          <span 
            key={i} 
            className={`oracle-pulse-word${i < revealCount ? ' visible' : ''}`}
          >
            {word}{i < words.length - 1 ? ' ' : ''}
          </span>
        ))}
      </p>
      {complete && timeStr && (
        <span className="oracle-pulse-time">Today · {timeStr}</span>
      )}
    </div>
  );
};

export default OraclePulse;
