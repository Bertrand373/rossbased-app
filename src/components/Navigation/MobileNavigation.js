// MobileNavigation.js - TITANTRACK
// Text-only nav: left tabs | Oracle center | right tabs + sliding dash
// The Oracle eye is a living presence: it breathes on the same 8s cycle as
// the streak counter, blooms when OraclePulse reveals a new observation
// (`oracle-breath` document event), and heralds unread Oracle notes.
import React, { useRef, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import './MobileNavigation.css';

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Negative delay locks every 8s breath on the page to one shared metronome
const breathePhase = () => `-${(performance.now() / 1000) % 8}s`;

const MobileNavigation = ({ onOracleClick, isOracleActive, oracleHasUnread }) => {
  const location = useLocation();
  const navRef = useRef(null);
  const dashRef = useRef(null);
  const initialized = useRef(false);
  const eyeRef = useRef(null);
  const oracleBtnRef = useRef(null);
  const wakeTimerRef = useRef(null);

  // Position the dash under the active route tab
  useEffect(() => {
    const positionDash = () => {
      if (!navRef.current || !dashRef.current) return;

      const active = navRef.current.querySelector('.mobile-nav-item.active');
      if (!active) {
        dashRef.current.style.opacity = '0';
        return;
      }

      const navRect = navRef.current.getBoundingClientRect();
      const itemRect = active.getBoundingClientRect();
      const x = itemRect.left + itemRect.width / 2 - navRect.left - 10;

      if (!initialized.current) {
        dashRef.current.style.transition = 'none';
        dashRef.current.style.transform = `translateX(${x}px)`;
        dashRef.current.style.opacity = '1';
        dashRef.current.offsetHeight; // eslint-disable-line no-unused-expressions
        dashRef.current.style.transition = '';
        initialized.current = true;
      } else {
        dashRef.current.style.transform = `translateX(${x}px)`;
        dashRef.current.style.opacity = '1';
      }
    };

    const timer = setTimeout(positionDash, 30);
    return () => clearTimeout(timer);
  }, [location.pathname]);

  // Re-measure on resize and orientation change
  useEffect(() => {
    const recalc = () => {
      if (!navRef.current || !dashRef.current) return;
      const active = navRef.current.querySelector('.mobile-nav-item.active');
      if (!active) {
        dashRef.current.style.opacity = '0';
        return;
      }
      const navRect = navRef.current.getBoundingClientRect();
      const itemRect = active.getBoundingClientRect();
      const x = itemRect.left + itemRect.width / 2 - navRect.left - 10;
      dashRef.current.style.transition = 'none';
      dashRef.current.style.transform = `translateX(${x}px)`;
      dashRef.current.style.opacity = '1';
      dashRef.current.offsetHeight; // eslint-disable-line no-unused-expressions
      dashRef.current.style.transition = '';
    };

    const hideAndRecalc = () => {
      if (dashRef.current) {
        dashRef.current.style.transition = 'none';
        dashRef.current.style.opacity = '0';
      }
      setTimeout(recalc, 200);
      setTimeout(recalc, 500);
    };

    window.addEventListener('resize', hideAndRecalc);
    window.addEventListener('orientationchange', hideAndRecalc);

    const mql = window.matchMedia('(orientation: portrait)');
    const onOrientationMedia = () => hideAndRecalc();
    mql.addEventListener('change', onOrientationMedia);

    return () => {
      window.removeEventListener('resize', hideAndRecalc);
      window.removeEventListener('orientationchange', hideAndRecalc);
      mql.removeEventListener('change', onOrientationMedia);
    };
  }, []);

  // Oracle eye idle breathing — phase-locked to the page's 8s metronome
  useEffect(() => {
    const img = eyeRef.current;
    if (!img || prefersReducedMotion()) return undefined;
    if (document.documentElement.getAttribute('data-theme') === 'light') return undefined;
    img.style.animationDelay = breathePhase();
    img.classList.add('breath-idle');
    return () => img.classList.remove('breath-idle');
  }, []);

  // Wake bloom + expanding ring when OraclePulse exhales a new observation
  useEffect(() => {
    const onBreath = () => {
      const img = eyeRef.current;
      const btn = oracleBtnRef.current;
      if (!img || !btn || prefersReducedMotion()) return;
      if (document.documentElement.getAttribute('data-theme') === 'light') return;
      img.classList.remove('breath-idle');
      img.style.animationDelay = '0s';
      img.offsetHeight; // eslint-disable-line no-unused-expressions
      img.classList.add('breath-wake');
      btn.classList.add('breath-wake-ring');
      if (wakeTimerRef.current) clearTimeout(wakeTimerRef.current);
      wakeTimerRef.current = setTimeout(() => {
        img.classList.remove('breath-wake');
        btn.classList.remove('breath-wake-ring');
        img.style.animationDelay = breathePhase();
        img.classList.add('breath-idle');
      }, 2100);
    };
    document.addEventListener('oracle-breath', onBreath);
    return () => {
      document.removeEventListener('oracle-breath', onBreath);
      if (wakeTimerRef.current) clearTimeout(wakeTimerRef.current);
    };
  }, []);

  // Herald — a single bloom when an unread Oracle note arrives ("I watched
  // you log; I have words"). The dot still marks the unread state.
  useEffect(() => {
    if (!oracleHasUnread) return undefined;
    const img = eyeRef.current;
    if (!img || prefersReducedMotion()) return undefined;
    if (document.documentElement.getAttribute('data-theme') === 'light') return undefined;
    img.classList.add('breath-herald');
    const t = setTimeout(() => img.classList.remove('breath-herald'), 1900);
    return () => {
      clearTimeout(t);
      img.classList.remove('breath-herald');
    };
  }, [oracleHasUnread]);

  return (
    <nav className="mobile-nav">
      <div className="mobile-nav-inner" ref={navRef}>
        {/* Sliding dash */}
        <span ref={dashRef} className="mobile-nav-dash" />

        {/* Left group */}
        <div className="mobile-nav-group">
          <NavLink
            to="/"
            className={({ isActive }) => `mobile-nav-item ${isActive ? 'active' : ''}`}
          >
            <span className="mobile-nav-label">Track</span>
          </NavLink>
          <NavLink
            to="/calendar"
            className={({ isActive }) => `mobile-nav-item ${isActive ? 'active' : ''}`}
          >
            <span className="mobile-nav-label">Calendar</span>
          </NavLink>
        </div>

        {/* Center — Oracle eye */}
        <button
          ref={oracleBtnRef}
          className={`mobile-nav-oracle ${isOracleActive ? 'active' : ''}`}
          onClick={onOracleClick}
          aria-label="Open The Oracle"
        >
          <span className="mobile-nav-oracle-ring" aria-hidden="true" />
          <img ref={eyeRef} src="/The_Oracle.png" alt="" className="mobile-nav-oracle-img" />
          {oracleHasUnread && !isOracleActive && <span className="mobile-nav-oracle-dot" />}
        </button>

        {/* Right group */}
        <div className="mobile-nav-group">
          <NavLink
            to="/stats"
            className={({ isActive }) => `mobile-nav-item ${isActive ? 'active' : ''}`}
          >
            <span className="mobile-nav-label">Stats</span>
          </NavLink>
          <NavLink
            to="/urge-toolkit"
            className={({ isActive }) => `mobile-nav-item ${isActive ? 'active' : ''}`}
          >
            <span className="mobile-nav-label">Urges</span>
          </NavLink>
        </div>
      </div>
    </nav>
  );
};

export default MobileNavigation;
