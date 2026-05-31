// src/components/Tracker/TrackerLogPill.js
//
// The primary "log today" surface on Tracker — consolidates the two
// previously separate affordances (Log Today button + Snap today's
// photo ghost link) into one glass pill that expands in-place to
// reveal both options.
//
// Vocabulary
// ----------
// All states share the same glass treatment (background, border,
// blur). Green only appears on the values that earn it — check marks,
// score, "Captured" meta, chevrons in the editable state. State D
// (both logged) is NOT a green-washed pill; it's the same glass with
// a green check + score + muted "Logged today" text.
//
// Behavior
// --------
// - The expanded drawer is rendered inside the same pill element with
//   overflow: hidden, animating the pill's height instead of pushing
//   content below. The parent positions the pill `absolute` so the
//   surrounding Tracker page doesn't shift on expand.
// - Pill stays expanded between sub-actions; user explicitly collapses.
// - State D (both done) stays tappable — rows reopen the existing
//   benefits / photo flows so users can update earlier logs.
//
// Animation
// ---------
// A single useSpring driving a 0 → 1 progress value. Every property
// (height, border-radius, background-color, border-color, box-shadow,
// children opacity, children translateY) interpolates from that one
// value. Collapse naturally reverses since the children's stagger
// is encoded as ranges of the progress value (row 1 visible above
// 0.25, row 2 above 0.45) — no separate "reverse" animation needed.

import React, { useState, useRef, useEffect, useCallback, useLayoutEffect } from 'react';
import { useSpring, animated } from '@react-spring/web';
import { format } from 'date-fns';
import { hasPhoto } from '../../utils/dayJournal';
import './TrackerLogPill.css';

// Apple-like spring settle. Close to react-spring's `config.gentle`
// but slightly tighter friction for a snappier feel on tap.
const SPRING_CONFIG = { tension: 280, friction: 32 };

// Generous fallback so the first frame doesn't snap-resize. The real
// height is measured immediately after mount via ResizeObserver.
const DRAWER_HEIGHT_FALLBACK = 120;
const COLLAPSED_PILL_HEIGHT = 52;

// Inline icon components — pulse waveform for Vitals, camera for Photo,
// chevron for editable rows, check for completed rows. Kept inline so
// the pill has zero icon-library dependencies.

const PulseIcon = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
  </svg>
);

const CameraIcon = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="2" y="6" width="20" height="14" rx="2" />
    <circle cx="12" cy="13" r="3.5" />
  </svg>
);

const CheckIcon = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const ChevronIcon = ({ size = 13 }) => (
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

  // Measure the drawer's natural height so the pill height animation
  // lands on the exact pixel value (avoids max-height rubber-banding).
  const drawerRef = useRef(null);
  const [drawerHeight, setDrawerHeight] = useState(DRAWER_HEIGHT_FALLBACK);

  useLayoutEffect(() => {
    if (!drawerRef.current) return undefined;
    const measure = () => {
      if (drawerRef.current) {
        setDrawerHeight(drawerRef.current.scrollHeight);
      }
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(drawerRef.current);
    return () => observer.disconnect();
  }, []);

  // Today's photo state — derived live from userData.notes so the
  // pill reflects updates the moment a photo is captured.
  const today = format(new Date(), 'yyyy-MM-dd');
  const photoCaptured = hasPhoto(userData?.notes, today);

  const doneCount = (vitalsLogged ? 1 : 0) + (photoCaptured ? 1 : 0);
  const allDone = doneCount === 2;

  // The single driving spring. All animated properties below
  // interpolate off `progress`.
  const spring = useSpring({
    progress: expanded ? 1 : 0,
    config: SPRING_CONFIG
  });

  const pillStyle = {
    // Height is the ONLY size that changes. Border-radius stays at
    // 9999px throughout the animation — the pill shape is preserved
    // (top semicircle anchored, bottom semicircle drops down, straight
    // side walls grow to fill the middle). No "pill → rounded card"
    // morph; it's just the same pill, taller.
    height: spring.progress.to(p => COLLAPSED_PILL_HEIGHT + drawerHeight * p),
    backgroundColor: spring.progress.to(p =>
      // Translucent white tint throughout — backdrop-filter does the
      // visual containment, NOT background opacity. Goes from very
      // subtle (collapsed) to slightly more visible (expanded), but
      // never opaque. Stays iOS-frosted-glass throughout.
      `rgba(255, 255, 255, ${0.05 + 0.04 * p})`
    ),
    borderColor: spring.progress.to(p => `rgba(255, 255, 255, ${0.10 + 0.08 * p})`),
    boxShadow: spring.progress.to(p =>
      // Soft lift when expanded — gives the glass pill a subtle
      // hover-off-the-page presence without darkening it.
      `0 1px 2px rgba(0, 0, 0, 0.3), 0 ${14 * p}px ${32 * p}px rgba(0, 0, 0, ${0.35 * p})`
    )
  };

  // Each row visible across a sub-range of the master progress so the
  // stagger naturally reverses on collapse (row 2 disappears first,
  // then row 1).
  const rowStyleFor = (startProgress) => ({
    opacity: spring.progress.to(p => {
      const range = 1 - startProgress;
      return Math.max(0, Math.min(1, (p - startProgress) / range));
    }),
    transform: spring.progress.to(p => {
      const range = 1 - startProgress;
      const local = Math.max(0, Math.min(1, (p - startProgress) / range));
      return `translateY(${(1 - local) * 6}px)`;
    })
  });

  const row1Style = rowStyleFor(0.20);
  const row2Style = rowStyleFor(0.40);

  const toggleExpanded = useCallback(() => {
    setExpanded(e => !e);
    // Brief haptic on tap where supported. Fails silently otherwise.
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try { navigator.vibrate(8); } catch (_) { /* ignore */ }
    }
  }, []);

  const handleVitalsClick = useCallback((e) => {
    e.stopPropagation();
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try { navigator.vibrate(8); } catch (_) {}
    }
    onOpenVitals?.();
  }, [onOpenVitals]);

  const handlePhotoClick = useCallback((e) => {
    e.stopPropagation();
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try { navigator.vibrate(8); } catch (_) {}
    }
    onOpenPhoto?.();
  }, [onOpenPhoto]);

  // Outside-click to collapse the drawer. Only attached while expanded
  // so we don't waste listeners on idle pills.
  const pillRef = useRef(null);
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

  // Header content varies by state.
  const renderHeader = () => {
    if (allDone) {
      return (
        <>
          <span className="tlp-check"><CheckIcon size={14} /></span>
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
      <animated.div
        ref={pillRef}
        className={`tracker-log-pill${expanded ? ' is-expanded' : ''}${allDone ? ' is-complete' : ''}`}
        style={pillStyle}
        role="button"
        tabIndex={0}
        aria-expanded={expanded}
        aria-label="Log today's vitals and photo"
        onClick={toggleExpanded}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            toggleExpanded();
          }
        }}
      >
        <div className="tlp-header">{renderHeader()}</div>

        <div className="tlp-drawer-clip" ref={drawerRef}>
          {/* Vitals row */}
          <animated.button
            type="button"
            className={`tlp-row${vitalsLogged ? ' is-done' : ''}`}
            style={row1Style}
            onClick={handleVitalsClick}
            tabIndex={expanded ? 0 : -1}
            aria-hidden={!expanded}
          >
            <span className="tlp-row-icon">
              {vitalsLogged ? <CheckIcon /> : <PulseIcon />}
            </span>
            <span className="tlp-row-label">Vitals</span>
            {vitalsLogged && (
              <>
                <span className="tlp-row-meta">{todayScore || '—'}</span>
                <span className="tlp-row-chevron"><ChevronIcon /></span>
              </>
            )}
          </animated.button>

          {/* Photo row */}
          <animated.button
            type="button"
            className={`tlp-row${photoCaptured ? ' is-done' : ''}`}
            style={row2Style}
            onClick={handlePhotoClick}
            tabIndex={expanded ? 0 : -1}
            aria-hidden={!expanded}
          >
            <span className="tlp-row-icon">
              {photoCaptured ? <CheckIcon /> : <CameraIcon />}
            </span>
            <span className="tlp-row-label">Photo</span>
            {photoCaptured && (
              <>
                <span className="tlp-row-meta">Captured</span>
                <span className="tlp-row-chevron"><ChevronIcon /></span>
              </>
            )}
          </animated.button>
        </div>
      </animated.div>
    </div>
  );
};

export default TrackerLogPill;
