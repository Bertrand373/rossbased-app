// src/components/OraclePulse/OraclePulse.js
// Ambient observation slot on the Tracker hero screen.
// Voice rotation: Oracle community pulse is the default; the Almanac voice
// (see ./voices.js) appears as a guest star on lunar-significant days,
// special events, or master numerology days. Tapping the Almanac whisper
// opens the Energy Almanac sheet via the openAlmanac document event.
//
// THE ORACLE'S BREATH — first view of a new pulse plays a ceremony:
//   wake     → the nav eye / desktop orb blooms (via `oracle-breath` event)
//              and exhales wisps of mist that rise toward the quote slot
//   condense → label letter-spacing settles in, words materialize from
//              blur (mist becoming ink), adaptive per-word stagger
//   fresh    → settled text holds bright for ~5s
//   settled  → relaxes to the resting whisper tone
// Already-seen pulses (and reduced-motion users) skip straight to settled.
// An ambient aurora drifts behind the text always — tinted by voice
// (gold Oracle / moon-silver Almanac / ember Anchor), dialed down over
// video Sanctum scenes where the footage supplies the atmosphere.
// While the Log Today pill is expanded the stage is occupied: an unplayed
// ceremony holds until the pill collapses (`tracker-log-expand` event).
import React, { useState, useEffect, useRef, useCallback } from 'react';
import ReactDOM from 'react-dom';
import useSheetSwipe from '../../hooks/useSheetSwipe';
import '../../styles/BottomSheet.css';
import './OraclePulse.css';
import { pickTodaysVoice } from './voices';
import { getSceneType } from '../GoldenSmoke/GoldenSmoke';
import { getTriggerLabel } from '../../constants/triggerConstants';

const API = process.env.REACT_APP_API || process.env.REACT_APP_API_URL || 'https://rossbased-app.onrender.com';

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

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

const OraclePulse = ({ userData, openOracle, scene } = {}) => {
  // Today's voice is picked once at mount. Anchor voice (the user's own
  // recovery covenant) takes priority over Almanac, which takes priority
  // over the default Oracle community pulse. Local voices skip the fetch.
  const todaysVoiceRef = useRef(pickTodaysVoice(new Date(), userData));
  const isAlmanacVoice = todaysVoiceRef.current?.source === 'almanac';
  const isAnchorVoice = todaysVoiceRef.current?.source === 'anchor';
  // Breath tint: the Oracle's light is gold; Almanac speaks in moon-silver,
  // the user's own Anchor in ember. Scene never recolors the voice.
  const voice = isAlmanacVoice ? 'almanac' : isAnchorVoice ? 'anchor' : 'oracle';
  // Backdrop kind: procedural wisp scenes get the full aurora, video scenes
  // a whisper of it (their footage is the dream already).
  const bgType = getSceneType(scene);

  const [observation, setObservation] = useState(null);
  const [body, setBody] = useState(null);
  const [pulseId, setPulseId] = useState(null);
  // Almanac/anchor voices have zero load latency — their data is local.
  // Start non-loading so the slot doesn't flash empty.
  const [loading, setLoading] = useState(!isAlmanacVoice && !isAnchorVoice);
  const [revealCount, setRevealCount] = useState(0);
  const [animating, setAnimating] = useState(false);
  const [complete, setComplete] = useState(false);
  // Breath ceremony phase — drives label/text/aurora styling via data-phase
  const [phase, setPhase] = useState('hidden');
  // Stage occupancy — Log Today pill expanded overlays this slot, so the
  // ceremony waits for a clear stage (TrackerLogPill dispatches the event)
  const [logExpanded, setLogExpanded] = useState(false);

  // Sheet state — only used by the Oracle voice; the Almanac voice opens the
  // EnergyAlmanac sheet via document event instead of an internal sheet.
  const [showSheet, setShowSheet] = useState(false);
  const [sheetReady, setSheetReady] = useState(false);
  const sheetPanelRef = useRef(null);

  const mountedRef = useRef(true);
  const intervalRef = useRef(null);
  const textRef = useRef(null);
  const wispLayerRef = useRef(null);
  const freshTimerRef = useRef(null);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (freshTimerRef.current) clearTimeout(freshTimerRef.current);
      if (wispLayerRef.current) wispLayerRef.current.remove();
    };
  }, []);

  // Stage watcher — Log Today pill expansion
  useEffect(() => {
    const onLogExpand = (e) => setLogExpanded(!!(e.detail && e.detail.expanded));
    document.addEventListener('tracker-log-expand', onLogExpand);
    return () => document.removeEventListener('tracker-log-expand', onLogExpand);
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
  // For the Almanac / Anchor voices, set state directly from the picker — no fetch.
  useEffect(() => {
    if (isAlmanacVoice || isAnchorVoice) {
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

  // Exhale — wisps of mist rise from the Oracle's body (mobile nav eye or
  // desktop orb) toward the quote slot. Pure DOM: a short-lived fixed layer,
  // transform/opacity keyframes only, removed after the flight.
  const spawnWisps = useCallback(() => {
    if (prefersReducedMotion()) return;
    if (document.documentElement.getAttribute('data-theme') === 'light') return;
    const eye =
      document.querySelector('.oracle-orb-eye') ||
      document.querySelector('.mobile-nav-oracle-img');
    const target = textRef.current;
    if (!eye || !target) return;

    const e = eye.getBoundingClientRect();
    const t = target.getBoundingClientRect();
    if (!e.width || !t.width) return;
    const fromOrb = eye.classList.contains('oracle-orb-eye');
    const cx = e.left + e.width / 2;
    const cy = e.top + e.height / 2;
    // Mobile: straight rise from the eye. Desktop orb: drift toward the
    // right end of the quote line.
    const tx = fromOrb ? t.right - Math.min(120, t.width * 0.2) : cx;
    const ty = t.top + t.height / 2;
    const dx = tx - cx;
    const dy = ty - cy;

    if (wispLayerRef.current) wispLayerRef.current.remove();
    const layer = document.createElement('div');
    layer.className = 'oracle-breath-wisps';
    layer.dataset.voice = voice;
    layer.setAttribute('aria-hidden', 'true');
    const offsets = fromOrb
      ? [[0, 0], [-26, 16], [20, -12]]
      : [[-14, 0], [10, 6], [-2, -6]];
    offsets.forEach((o, i) => {
      const w = document.createElement('i');
      w.style.left = `${cx + o[0]}px`;
      w.style.top = `${cy + o[1]}px`;
      w.style.setProperty('--bw-dx', `${dx}px`);
      w.style.setProperty('--bw-dy', `${dy}px`);
      w.style.animationDelay = `${i * 280}ms`;
      layer.appendChild(w);
    });
    document.body.appendChild(layer);
    wispLayerRef.current = layer;
    setTimeout(() => {
      layer.remove();
      if (wispLayerRef.current === layer) wispLayerRef.current = null;
    }, 3800);
  }, [voice]);

  // Word-by-word reveal — plays once per unique pulse.
  // Unseen pulse + clear stage → full breath ceremony. If the Log pill is
  // expanded, the effect early-returns and re-runs on collapse (logExpanded
  // dep), so the moment waits instead of playing to an occupied stage.
  useEffect(() => {
    if (!observation || loading) return;

    const seenKey = pulseId ? `oracle_pulse_seen_${pulseId}` : null;
    const alreadySeen = seenKey ? localStorage.getItem(seenKey) : true;
    const reduce = prefersReducedMotion();

    // Static render if already seen this pulse (or no pulseId / reduced motion)
    if (alreadySeen || reduce) {
      setRevealCount(observation.split(' ').length);
      setComplete(true);
      setPhase('settled');
      if (reduce && seenKey && !alreadySeen) localStorage.setItem(seenKey, 'true');
      return;
    }

    if (logExpanded) return; // stage occupied — hold the ceremony

    const words = observation.split(' ');
    // Adaptive stagger: long observations condense at the same total tempo
    const stepMs = Math.max(60, Math.min(110, Math.round(2200 / words.length)));
    setAnimating(true);
    setPhase('wake');
    document.dispatchEvent(new CustomEvent('oracle-breath', { detail: { phase: 'wake', voice } }));
    const wispTimer = setTimeout(spawnWisps, 350);
    let count = 0;

    const startTimeout = setTimeout(() => {
      if (!mountedRef.current) return;
      setPhase('condense');

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
            setPhase('fresh');
            if (seenKey) localStorage.setItem(seenKey, 'true');
            // Fresh thought holds bright, then relaxes into memory
            freshTimerRef.current = setTimeout(() => {
              if (mountedRef.current) setPhase('settled');
            }, 5200);
          }, 400);
        }
      }, stepMs);
    }, 1100);

    return () => {
      clearTimeout(startTimeout);
      clearTimeout(wispTimer);
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (freshTimerRef.current) clearTimeout(freshTimerRef.current);
      if (wispLayerRef.current) { wispLayerRef.current.remove(); wispLayerRef.current = null; }
    };
  }, [observation, loading, pulseId, logExpanded, voice, spawnWisps]);

  if (loading || !observation) return null;

  const words = observation.split(' ');
  const label = todaysVoiceRef.current?.label || 'ORACLE OBSERVES';
  // Almanac voice opens the Almanac sheet via event.
  // Anchor voice opens an internal sheet showing the user's full covenant.
  // Oracle voice opens its own sheet — only tappable once body text is loaded.
  const isTappable = isAlmanacVoice || isAnchorVoice
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

  const anchorData = isAnchorVoice ? todaysVoiceRef.current?.anchorData : null;

  const handleAnchorTalkToOracle = () => {
    try { localStorage.setItem('oracle_recovery_pending', '1'); } catch {}
    closeSheet(() => {
      setShowSheet(false);
      if (openOracle) openOracle();
    });
  };

  return (
    <>
      <div
        className={`oracle-pulse${complete ? ' revealed' : ''}${isTappable ? ' tappable' : ''}`}
        data-phase={phase}
        data-voice={voice}
        data-bg={bgType}
        data-suppressed={logExpanded ? 'true' : undefined}
        onClick={isTappable ? handleTap : undefined}
        role={isTappable ? 'button' : undefined}
        tabIndex={isTappable ? 0 : undefined}
      >
        {/* Ambient aurora — smoke shadow for contrast, voice glow, jade companion */}
        <span className="oracle-breath-aurora" aria-hidden="true">
          <i className="bsh" />
          <i className="bg1" />
          <i className="bg2" />
        </span>
        <span className="oracle-pulse-label">{label}</span>
        <p className="oracle-pulse-text" ref={textRef}>
          {words.map((word, i) => (
            <React.Fragment key={i}>
              <span className={`oracle-pulse-word${i < revealCount ? ' visible' : ''}`}>
                {word}
              </span>
              {i < words.length - 1 ? ' ' : ''}
            </React.Fragment>
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
            {isAnchorVoice && anchorData ? (
              <>
                <span className="oracle-pulse-label oracle-pulse-sheet-label">YOUR ANCHOR</span>
                <span className="oracle-pulse-anchor-day">
                  Day {anchorData.dayNumber} of {anchorData.windowDays}
                </span>
                <div className="oracle-pulse-sheet-scroll" data-no-swipe>
                  <p className="oracle-pulse-anchor-why">“{anchorData.why}”</p>
                  <div className="oracle-pulse-anchor-divider" />
                  {anchorData.trigger && (
                    <div className="oracle-pulse-anchor-row">
                      <span className="oracle-pulse-anchor-rowlabel">What pulled you in</span>
                      <span className="oracle-pulse-anchor-rowvalue">
                        {getTriggerLabel(anchorData.trigger)}
                        {anchorData.triggerNote ? ` · ${anchorData.triggerNote}` : ''}
                      </span>
                    </div>
                  )}
                  {anchorData.anchor && (
                    <div className="oracle-pulse-anchor-row">
                      <span className="oracle-pulse-anchor-rowlabel">Tomorrow's anchor</span>
                      <span className="oracle-pulse-anchor-rowvalue">{anchorData.anchor}</span>
                    </div>
                  )}
                </div>
                <div className="oracle-pulse-footer oracle-pulse-anchor-footer">
                  {openOracle && (
                    <button className="oracle-pulse-anchor-cta" onClick={handleAnchorTalkToOracle}>
                      Talk to Oracle
                    </button>
                  )}
                  <button className="oracle-pulse-close" onClick={() => closeSheet(() => setShowSheet(false))}>
                    Done
                  </button>
                </div>
              </>
            ) : (
              <>
                <span className="oracle-pulse-label oracle-pulse-sheet-label">ORACLE OBSERVES</span>
                <div className="oracle-pulse-sheet-scroll" data-no-swipe>
                  {formatBody(body).map((para, i) => (
                    <p key={i} className="oracle-pulse-body">{para}</p>
                  ))}
                </div>
                <div className="oracle-pulse-footer">
                  <button className="oracle-pulse-close" onClick={() => closeSheet(() => setShowSheet(false))}>Done</button>
                </div>
              </>
            )}
          </div>
        </div>,
        document.body
      )}
    </>
  );
};

export default OraclePulse;
