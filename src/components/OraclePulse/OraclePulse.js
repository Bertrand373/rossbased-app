// src/components/OraclePulse/OraclePulse.js
// Ambient observation slot on the Tracker hero screen.
// Voice rotation: Oracle community pulse is the default; the Almanac voice
// (see ./voices.js) appears as a guest star on lunar-significant days,
// special events, or master numerology days. Tapping the Almanac whisper
// opens the Energy Almanac sheet via the openAlmanac document event.
import React, { useState, useEffect, useRef, useCallback } from 'react';
import ReactDOM from 'react-dom';
import useSheetSwipe from '../../hooks/useSheetSwipe';
import '../../styles/BottomSheet.css';
import './OraclePulse.css';
import { pickTodaysVoice } from './voices';

const API = process.env.REACT_APP_API || process.env.REACT_APP_API_URL || 'https://rossbased-app.onrender.com';

/**
 * Split body text into readable paragraphs (2-3 sentences each)
 */
const formatBody = (text) => {
  if (!text) return [];
  // Split on sentence endings (. ! ?) followed by a space
  const sentences = text.split(/(?<=[.!?])\s+/);
  const paragraphs = [];
  for (let i = 0; i < sentences.length; i += 3) {
    paragraphs.push(sentences.slice(i, i + 3).join(' '));
  }
  return paragraphs;
};

const OraclePulse = () => {
  // Today's voice is picked once at mount. If pickTodaysVoice returns a voice
  // (Almanac), we render it directly — no network call. If it returns null,
  // we fall through to the Oracle community pulse fetch.
  const todaysVoiceRef = useRef(pickTodaysVoice(new Date()));
  const isAlmanacVoice = todaysVoiceRef.current?.source === 'almanac';

  const [observation, setObservation] = useState(null);
  const [body, setBody] = useState(null);
  const [pulseId, setPulseId] = useState(null);
  // Almanac voice has zero load latency — its data is local. Start
  // non-loading so the slot doesn't flash empty.
  const [loading, setLoading] = useState(!isAlmanacVoice);
  const [revealCount, setRevealCount] = useState(0);
  const [animating, setAnimating] = useState(false);
  const [complete, setComplete] = useState(false);

  // Sheet state — only used by the Oracle voice; the Almanac voice opens the
  // EnergyAlmanac sheet via document event instead of an internal sheet.
  const [showSheet, setShowSheet] = useState(false);
  const [sheetReady, setSheetReady] = useState(false);
  const sheetPanelRef = useRef(null);

  const mountedRef = useRef(true);
  const intervalRef = useRef(null);

  useEffect(() => {
    return () => { 
      mountedRef.current = false;
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  // Sheet open/close
  useEffect(() => {
    if (showSheet) {
      requestAnimationFrame(() => requestAnimationFrame(() => setSheetReady(true)));
    } else {
      setSheetReady(false);
    }
  }, [showSheet]);

  const closeSheet = useCallback((cb) => {
    setSheetReady(false);
    setTimeout(() => cb && cb(), 300);
  }, []);

  useSheetSwipe(sheetPanelRef, showSheet, () => closeSheet(() => setShowSheet(false)));

  // Fetch observation from backend (Oracle voice only).
  // For the Almanac voice, set state directly from the picker — no fetch.
  useEffect(() => {
    if (isAlmanacVoice) {
      const v = todaysVoiceRef.current;
      setObservation(v.observation);
      setBody(v.body || null);
      setPulseId(v.voiceKey); // reuses the seen-key scheme; one per voice per day
      return;
    }

    const fetchPulse = async () => {
      const token = localStorage.getItem('token');
      if (!token) { setLoading(false); return; }

      // Check localStorage cache (keyed by pulseId, not date)
      const cached = localStorage.getItem('oracle_pulse_community');
      if (cached) {
        try {
          const data = JSON.parse(cached);
          if (data.observation && data.pulseId) {
            setObservation(data.observation);
            setBody(data.body || null);
            setPulseId(data.pulseId);
            setLoading(false);
            // Still fetch in background to check for newer pulse
            fetchFromServer(data.pulseId);
            return;
          }
        } catch { /* stale cache, refetch */ }
      }

      await fetchFromServer(null);
    };

    const fetchFromServer = async (cachedPulseId) => {
      try {
        const res = await fetch(`${API}/api/oracle/pulse`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        if (res.ok) {
          const data = await res.json();
          if (data.observation) {
            // Only update state if pulse is different from cached
            if (data.pulseId !== cachedPulseId) {
              setObservation(data.observation);
              setBody(data.body || null);
              setPulseId(data.pulseId);
              // New pulse arrived — clean old seen keys (keep current)
              Object.keys(localStorage).forEach(k => {
                if (k.startsWith('oracle_pulse_seen_') && k !== `oracle_pulse_seen_${data.pulseId}`) {
                  localStorage.removeItem(k);
                }
              });
            }
            // Update cache
            localStorage.setItem('oracle_pulse_community', JSON.stringify(data));
            // Clean old date-based cache keys from previous system
            Object.keys(localStorage).forEach(k => {
              if (k.startsWith('oracle_pulse_2')) {
                localStorage.removeItem(k);
              }
            });
          }
        }
      } catch (err) {
        console.error('Oracle Pulse fetch error:', err);
      }
      if (mountedRef.current) setLoading(false);
    };

    fetchPulse();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Word-by-word reveal — plays once per unique pulse
  useEffect(() => {
    if (!observation || loading) return;

    const seenKey = pulseId ? `oracle_pulse_seen_${pulseId}` : null;
    const alreadySeen = seenKey ? localStorage.getItem(seenKey) : true;

    // Static render if already seen this pulse (or no pulseId)
    if (alreadySeen) {
      setRevealCount(observation.split(' ').length);
      setComplete(true);
      return;
    }

    // Word-by-word reveal for first view of this pulse
    const words = observation.split(' ');
    setAnimating(true);
    let count = 0;

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
            if (seenKey) localStorage.setItem(seenKey, 'true');
          }, 400);
        }
      }, 160);
    }, 600);

    return () => {
      clearTimeout(startTimeout);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [observation, loading, pulseId]);

  if (loading || !observation) return null;

  const words = observation.split(' ');
  const label = todaysVoiceRef.current?.label || 'ORACLE OBSERVES';
  // Almanac voice is always tappable (opens the Almanac sheet via event).
  // Oracle voice is only tappable once it has body text and the reveal is done.
  const isTappable = isAlmanacVoice
    ? complete
    : (!!body && complete);
  const handleTap = () => {
    if (!isTappable) return;
    if (isAlmanacVoice) {
      document.dispatchEvent(new CustomEvent('openAlmanac'));
    } else {
      setShowSheet(true);
    }
  };

  return (
    <>
      <div
        className={`oracle-pulse${complete ? ' revealed' : ''}${isTappable ? ' tappable' : ''}`}
        onClick={isTappable ? handleTap : undefined}
        role={isTappable ? 'button' : undefined}
        tabIndex={isTappable ? 0 : undefined}
      >
        <span className="oracle-pulse-label">{label}</span>
        <p className="oracle-pulse-text">
          {words.map((word, i) => (
            <span 
              key={i} 
              className={`oracle-pulse-word${i < revealCount ? ' visible' : ''}`}
            >
              {word}{i < words.length - 1 ? ' ' : ''}
            </span>
          ))}
        </p>
      </div>

      {/* Full observation sheet — portal to body so it renders above mobile nav */}
      {showSheet && ReactDOM.createPortal(
        <div className={`sheet-backdrop${sheetReady ? ' open' : ''}`} onClick={() => closeSheet(() => setShowSheet(false))}>
          <div
            ref={sheetPanelRef}
            className={`sheet-panel oracle-pulse-sheet${sheetReady ? ' open' : ''}`}
            onClick={e => e.stopPropagation()}
          >
            <div className="sheet-header" />
            <span className="oracle-pulse-label oracle-pulse-sheet-label">ORACLE OBSERVES</span>
            <div className="oracle-pulse-sheet-scroll" data-no-swipe>
              {formatBody(body).map((para, i) => (
                <p key={i} className="oracle-pulse-body">{para}</p>
              ))}
            </div>
            <div className="oracle-pulse-footer">
              <button className="oracle-pulse-close" onClick={() => closeSheet(() => setShowSheet(false))}>Done</button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
};

export default OraclePulse;
