// src/components/Tracker/TrackerLogPill.js
//
// The consolidated "Log Today" pill on Tracker — Metrics + Photo
// rolled into a single glass surface that expands in-place to reveal
// both sub-actions. A capsule when collapsed; its corners flatten to a
// rounded card as it grows, so the eye reads the height change and a
// gentle corner morph as one motion.
//
// Design contract — every detail in here was nailed in the mock
// before writing this file (.claude/log-pill-mock.html). Don't drift
// from these without re-checking the mock:
//
//   - Corner radius morphs 28px (collapsed capsule) → 24px (expanded
//     card). NOT locked at 9999px: in the ~219px-wide column a 9999px
//     radius clamps to a circle once the box goes near-square.
//   - Background is a constant rgba(255,255,255,0.05) — the SAME clear
//     glass collapsed and expanded. Expanding changes height, corner
//     radius, and adds a drop shadow; it does NOT shift the fill tone
//     (the earlier two-tone 5% -> 18% read as jarring).
//   - NO backdrop-filter. Even a light blur is composited by iOS Safari a
//     frame after first paint, so the pill popped clear -> frosted on load
//     (an unprofessional shift). A plain translucent tint + border paints
//     in one pass: one stable render, no shift. (A heavy blur + saturate
//     also used to flood it green over a green photo — gone too.)
//   - One transition curve for everything: 380ms ease-out cubic-
//     bezier(0.22, 1, 0.36, 1). All animated properties on the same
//     timing so the eye reads ONE motion both directions.
//   - Rows are 14px rounded rectangles inside the pill (nested
//     iOS-style hierarchy), not pills. Plain <div role="button">, not
//     <button> — a div has no UA metrics for iOS Safari to inflate.
//   - Height is constant per state (56 collapsed / 188 expanded),
//     driven purely by CSS like the mock — no live measurement.
//   - Outside pointerdown collapses. Keyboard: Enter/Space to
//     toggle, Escape to close.
//
// State derivation
// ----------------
//   - Metrics done ← prop `vitalsLogged` from Tracker
//   - Photo done ← derived from userData.notes[today].photoKey
//   - Score ← prop `todayScore` (string)

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { format } from 'date-fns';
import { hasPhoto } from '../../utils/dayJournal';
import './TrackerLogPill.css';

// Inline SVG glyphs — no icon-library dependency. Kept small so they
// inherit color via currentColor and stay GPU-friendly.

const PulseGlyph = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
  </svg>
);

const CameraGlyph = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="2" y="6" width="20" height="14" rx="2" />
    <circle cx="12" cy="13" r="3.5" />
  </svg>
);

const CheckGlyph = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const ChevronDownGlyph = ({ size = 11 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

const ChevronRightGlyph = ({ size = 13 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polyline points="9 18 15 12 9 6" />
  </svg>
);

const TrackerLogPill = ({
  userData,
  todayScore,
  vitalsLogged,
  onOpenVitals,
  onOpenPhoto
}) => {
  const [expanded, setExpanded] = useState(false);

  // Photo state derived live from notes so the pill reflects updates
  // the instant a capture lands.
  const today = useMemo(() => format(new Date(), 'yyyy-MM-dd'), []);
  const photoCaptured = hasPhoto(userData?.notes, today);

  const doneCount = (vitalsLogged ? 1 : 0) + (photoCaptured ? 1 : 0);
  const allDone = doneCount === 2;

  const pillRef = useRef(null);

  const fireHaptic = useCallback(() => {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try { navigator.vibrate(8); } catch (_) { /* ignore */ }
    }
  }, []);

  const toggleExpanded = useCallback(() => {
    setExpanded(e => !e);
    fireHaptic();
  }, [fireHaptic]);

  const handleVitalsClick = useCallback((e) => {
    e.stopPropagation();
    fireHaptic();
    onOpenVitals?.();
  }, [fireHaptic, onOpenVitals]);

  const handlePhotoClick = useCallback((e) => {
    e.stopPropagation();
    fireHaptic();
    onOpenPhoto?.();
  }, [fireHaptic, onOpenPhoto]);

  // Outside-pointerdown collapses. Only attached while expanded so we
  // don't waste listeners on idle pills. Using pointerdown instead of
  // click so touch-tap-outside-then-tap-inside doesn't race.
  useEffect(() => {
    if (!expanded) return undefined;
    const onPointer = (e) => {
      if (pillRef.current && !pillRef.current.contains(e.target)) {
        setExpanded(false);
      }
    };
    document.addEventListener('pointerdown', onPointer);
    return () => document.removeEventListener('pointerdown', onPointer);
  }, [expanded]);

  // Escape closes when expanded — standard menu/popover hygiene.
  useEffect(() => {
    if (!expanded) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') setExpanded(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [expanded]);

  // Header content varies by state — keep the JSX tidy with a helper.
  const renderHeader = () => {
    if (allDone) {
      return (
        <>
          <span className="tlp-check"><CheckGlyph size={14} /></span>
          <span className="tlp-label">{todayScore || '—'}</span>
          <span className="tlp-sep">·</span>
          <span className="tlp-meta">Logged today</span>
        </>
      );
    }
    if (doneCount === 1) {
      return (
        <>
          <span className="tlp-label">Log Today</span>
          <span className="tlp-sep">·</span>
          <span className="tlp-progress">1 of 2</span>
        </>
      );
    }
    return <span className="tlp-label">Log Today</span>;
  };

  return (
    <div className="tracker-log-pill-slot">
      <div
        ref={pillRef}
        className={`tracker-log-pill${expanded ? ' is-expanded' : ''}${allDone ? ' is-complete' : ''}`}
        role="button"
        tabIndex={0}
        aria-expanded={expanded}
        aria-label={`Log today's metrics and photo. ${doneCount} of 2 done.`}
        onClick={toggleExpanded}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            toggleExpanded();
          }
        }}
      >
        <div className="tlp-header">
          {renderHeader()}
          <span className="tlp-caret" aria-hidden="true">
            <ChevronDownGlyph />
          </span>
        </div>

        <div className="tlp-drawer">
          <div
            className={`tlp-row${vitalsLogged ? ' is-done' : ''}`}
            role="button"
            tabIndex={expanded ? 0 : -1}
            onClick={handleVitalsClick}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleVitalsClick(e);
              }
            }}
          >
            <span className="tlp-row-icon">
              {vitalsLogged ? <CheckGlyph /> : <PulseGlyph />}
            </span>
            <span className="tlp-row-label">Metrics</span>
            {vitalsLogged && (
              <>
                <span className="tlp-row-meta">{todayScore || '—'}</span>
                <span className="tlp-row-chevron"><ChevronRightGlyph /></span>
              </>
            )}
          </div>

          <div
            className={`tlp-row${photoCaptured ? ' is-done' : ''}`}
            role="button"
            tabIndex={expanded ? 0 : -1}
            onClick={handlePhotoClick}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handlePhotoClick(e);
              }
            }}
          >
            <span className="tlp-row-icon">
              {photoCaptured ? <CheckGlyph /> : <CameraGlyph />}
            </span>
            <span className="tlp-row-label">Photo</span>
            {photoCaptured && (
              <>
                <span className="tlp-row-meta">Captured</span>
                <span className="tlp-row-chevron"><ChevronRightGlyph /></span>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TrackerLogPill;
