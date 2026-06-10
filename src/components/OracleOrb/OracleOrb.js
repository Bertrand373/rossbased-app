// OracleOrb.js - TITANTRACK
// Desktop-only floating Oracle presence, bottom-right. Replaces the eye
// that previously lived in the header nav: one being, one body.
//
// States:
//   - idle: 8s breathing halo, phase-locked to the streak counter's
//     counterBreathe rhythm via a negative animation-delay
//   - waking: bloom + expanding ring, triggered by the `oracle-breath`
//     document event that OraclePulse fires when a new observation reveals
//   - herald: same bloom, fired when oracleHasUnread flips true (post-log
//     "I have words for you" moment)
//   - active: chat open — the AIChat overlay (z 200) dims the orb (z 90)
//
// Mobile never mounts this (App gates on !isMobile); the nav eye remains
// the Oracle's mobile body.
import React, { useEffect, useRef } from 'react';
import './OracleOrb.css';

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Negative delay locks every 8s breath on the page to one shared metronome
const breathePhase = () => `-${(performance.now() / 1000) % 8}s`;

const OracleOrb = ({ onOpen, hasUnread, isOracleActive }) => {
  const orbRef = useRef(null);
  const eyeRef = useRef(null);
  const wakeTimerRef = useRef(null);

  // Phase-lock the idle breathing on mount
  useEffect(() => {
    if (prefersReducedMotion()) return;
    const d = breathePhase();
    if (orbRef.current) orbRef.current.style.animationDelay = d;
    if (eyeRef.current) eyeRef.current.style.animationDelay = d;
  }, []);

  // Wake when the Oracle exhales a new observation on the Tracker
  useEffect(() => {
    const onBreath = () => {
      const orb = orbRef.current;
      if (!orb || prefersReducedMotion()) return;
      orb.classList.add('is-waking');
      if (wakeTimerRef.current) clearTimeout(wakeTimerRef.current);
      wakeTimerRef.current = setTimeout(() => {
        orb.classList.remove('is-waking');
        orb.style.animationDelay = breathePhase();
      }, 2200);
    };
    document.addEventListener('oracle-breath', onBreath);
    return () => {
      document.removeEventListener('oracle-breath', onBreath);
      if (wakeTimerRef.current) clearTimeout(wakeTimerRef.current);
    };
  }, []);

  // Herald bloom when an unread Oracle note arrives
  useEffect(() => {
    if (!hasUnread || prefersReducedMotion()) return undefined;
    const orb = orbRef.current;
    if (!orb) return undefined;
    orb.classList.add('is-herald');
    const t = setTimeout(() => orb.classList.remove('is-herald'), 2000);
    return () => {
      clearTimeout(t);
      orb.classList.remove('is-herald');
    };
  }, [hasUnread]);

  return (
    <button
      ref={orbRef}
      className={`oracle-orb${isOracleActive ? ' is-active' : ''}`}
      onClick={onOpen}
      aria-label="Open The Oracle"
    >
      <span className="oracle-orb-ring" aria-hidden="true" />
      <img ref={eyeRef} src="/The_Oracle.png" alt="" className="oracle-orb-eye" />
      {hasUnread && !isOracleActive && <span className="oracle-orb-dot" aria-hidden="true" />}
    </button>
  );
};

export default OracleOrb;
