// src/components/TVFeed/TVFeed.js
//
// TitanTrack TV — the public viewer. Full-bleed vertical 9:16 feed of the
// shorts Ross publishes from /admin (Updates tab → TTTV). Members swipe
// up/down between episodes; videos auto-loop; serif title sits bottom-left
// the way the mockup laid out.
//
// Routing:
//   - /tv (defined in App.js) renders this component for premium members.
//   - Non-premium → upgrade screen (still rendered here, no redirect, so
//     the URL is still bookmarkable and we don't fight router state).
//   - Premium with no published videos → coming-soon screen with Oracle
//     line. NOT a 404 — empty state is part of the experience.
//
// Player state lives entirely in this component for v1. Future polish
// (Media Session API, wake lock, Oracle overlay rendering, long-press
// save-to-Library) all hook into this same component in PR #4.
//
// Navigation:
//   - Touch: swipe up = next, swipe down = previous. Threshold 60px so
//     accidental scrolls don't trigger transitions.
//   - Wheel (desktop trackpad): same, with a debounce so one scroll gesture
//     doesn't bounce through three videos.
//   - Keyboard: ArrowDown / ArrowUp for navigation, M to toggle mute,
//     Escape to exit. (Accessibility + power users.)
//   - Tap on the video itself: play/pause toggle.

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaTimes, FaPlay, FaVolumeMute, FaVolumeUp } from 'react-icons/fa';
import { listFeed } from '../../services/tttvService';
import './TVFeed.css';

const SWIPE_THRESHOLD = 60;     // px before a swipe counts as navigation
const WHEEL_COOLDOWN_MS = 700;  // debounce between wheel-driven transitions

const TVFeed = ({ isPremium }) => {
  const navigate = useNavigate();
  const containerRef = useRef(null);
  const videoRef = useRef(null);

  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isMuted, setIsMuted] = useState(true);
  const [showSwipeHint, setShowSwipeHint] = useState(true);

  // Always start with the body scroll locked — TVFeed is a takeover view.
  // Restored on unmount so the user lands back in normal scroll state.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  // ─── Load the published feed ───────────────────────────────
  useEffect(() => {
    if (!isPremium) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const data = await listFeed();
        if (!cancelled) {
          setVideos(data || []);
          setError(null);
        }
      } catch (e) {
        if (!cancelled) setError(e.message || 'Could not load videos');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [isPremium]);

  // ─── Restart playback when the current video changes ──────
  // Forced via .load() because changing src on an existing element doesn't
  // automatically reset the playback head on iOS Safari.
  useEffect(() => {
    if (!videoRef.current || videos.length === 0) return;
    try {
      videoRef.current.load();
      const playPromise = videoRef.current.play();
      if (playPromise && playPromise.catch) playPromise.catch(() => {});
    } catch {
      /* iOS sometimes throws if user gesture missing — fine, autoPlay+muted
         covers the rest, and tap-on-video can recover. */
    }
  }, [currentIndex, videos]);

  // ─── Navigation handlers ──────────────────────────────────
  const goNext = useCallback(() => {
    setCurrentIndex(i => {
      if (i + 1 >= videos.length) return i; // clamp; don't loop the session
      setShowSwipeHint(false);
      return i + 1;
    });
  }, [videos.length]);

  const goPrev = useCallback(() => {
    setCurrentIndex(i => Math.max(0, i - 1));
  }, []);

  const handleExit = useCallback(() => {
    navigate('/');
  }, [navigate]);

  const handleMuteToggle = useCallback(() => {
    setIsMuted(m => !m);
  }, []);

  const handleVideoTap = useCallback(() => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play().catch(() => {});
    } else {
      videoRef.current.pause();
    }
  }, []);

  // ─── Touch + wheel + keyboard ─────────────────────────────
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let startY = 0;
    let endY = 0;
    let dragging = false;
    let wheelLock = false;

    const onTouchStart = (e) => {
      startY = e.touches[0].clientY;
      endY = startY;
      dragging = true;
    };
    const onTouchMove = (e) => {
      if (!dragging) return;
      endY = e.touches[0].clientY;
    };
    const onTouchEnd = () => {
      if (!dragging) return;
      const diff = startY - endY;
      if (Math.abs(diff) >= SWIPE_THRESHOLD) {
        if (diff > 0) goNext();
        else goPrev();
      }
      dragging = false;
    };

    const onWheel = (e) => {
      if (wheelLock) return;
      if (Math.abs(e.deltaY) < 30) return;
      wheelLock = true;
      if (e.deltaY > 0) goNext();
      else goPrev();
      setTimeout(() => { wheelLock = false; }, WHEEL_COOLDOWN_MS);
    };

    const onKey = (e) => {
      if (e.key === 'ArrowDown' || e.key === 'PageDown' || e.key === ' ') {
        e.preventDefault();
        goNext();
      } else if (e.key === 'ArrowUp' || e.key === 'PageUp') {
        e.preventDefault();
        goPrev();
      } else if (e.key === 'Escape') {
        handleExit();
      } else if (e.key === 'm' || e.key === 'M') {
        handleMuteToggle();
      }
    };

    container.addEventListener('touchstart', onTouchStart, { passive: true });
    container.addEventListener('touchmove', onTouchMove, { passive: true });
    container.addEventListener('touchend', onTouchEnd, { passive: true });
    container.addEventListener('wheel', onWheel, { passive: true });
    window.addEventListener('keydown', onKey);

    return () => {
      container.removeEventListener('touchstart', onTouchStart);
      container.removeEventListener('touchmove', onTouchMove);
      container.removeEventListener('touchend', onTouchEnd);
      container.removeEventListener('wheel', onWheel);
      window.removeEventListener('keydown', onKey);
    };
  }, [goNext, goPrev, handleExit, handleMuteToggle]);

  // ─── Render: non-premium ──────────────────────────────────
  if (!isPremium) {
    return (
      <div className="tv-feed tv-feed-state">
        <TVFeedExit onClick={handleExit} />
        <div className="tv-feed-state-content">
          <TTTVMark />
          <h1 className="tv-feed-state-title">Members only.</h1>
          <p className="tv-feed-state-sub">
            A private library of shorts from Ross.
          </p>
          <button
            className="tv-feed-state-btn"
            onClick={() => navigate('/profile')}
          >
            Become a member
          </button>
        </div>
      </div>
    );
  }

  // ─── Render: loading ──────────────────────────────────────
  if (loading) {
    return (
      <div className="tv-feed tv-feed-state tv-feed-loading">
        <div className="tv-feed-spinner" aria-label="Loading TTTV" />
      </div>
    );
  }

  // ─── Render: error ────────────────────────────────────────
  if (error) {
    return (
      <div className="tv-feed tv-feed-state">
        <TVFeedExit onClick={handleExit} />
        <div className="tv-feed-state-content">
          <TTTVMark />
          <h1 className="tv-feed-state-title">Couldn't load.</h1>
          <p className="tv-feed-state-sub">{error}</p>
          <button className="tv-feed-state-btn" onClick={() => window.location.reload()}>
            Try again
          </button>
        </div>
      </div>
    );
  }

  // ─── Render: empty / coming-soon ──────────────────────────
  // Stripped to the bone per direct feedback: logo + headline + subtitle.
  // No Oracle italic line here — that's Notes vocabulary, not coming-soon
  // vocabulary. Pure black bg lets the mark carry.
  if (videos.length === 0) {
    return (
      <div className="tv-feed tv-feed-state">
        <TVFeedExit onClick={handleExit} />
        <div className="tv-feed-state-content">
          <TTTVMark />
          <h1 className="tv-feed-state-title">Arriving soon.</h1>
          <p className="tv-feed-state-sub">
            A private library of shorts from Ross.
          </p>
        </div>
      </div>
    );
  }

  // ─── Render: active feed ──────────────────────────────────
  const current = videos[currentIndex];

  return (
    <div className="tv-feed" ref={containerRef}>
      {/* Video — full-bleed, looping, muted by default (autoplay safety) */}
      <video
        ref={videoRef}
        className="tv-feed-video"
        src={current.storageUrl}
        poster={current.posterUrl || undefined}
        autoPlay
        loop
        playsInline
        muted={isMuted}
        onClick={handleVideoTap}
      />

      {/* Top bar — back X + mute toggle. Both anchored to corners via
          .tv-feed-exit / .tv-feed-mute absolute positioning, so they never
          drift into content space the way the old flex-centered version
          could. */}
      <TVFeedExit onClick={handleExit} />
      <button
        className="tv-feed-mute"
        onClick={handleMuteToggle}
        aria-label={isMuted ? 'Unmute' : 'Mute'}
      >
        {isMuted ? <FaVolumeMute /> : <FaVolumeUp />}
      </button>

      {/* Feed dots — right edge, position indicator for the curated session */}
      {videos.length > 1 && (
        <div className="tv-feed-dots" aria-hidden="true">
          {videos.map((_, i) => (
            <span
              key={i}
              className={`tv-feed-dot${i === currentIndex ? ' active' : ''}`}
            />
          ))}
        </div>
      )}

      {/* Title overlay — serif bottom-left, the TTTV signature */}
      <div className="tv-feed-info">
        <div className="tv-feed-title">{current.title}</div>
        <div className="tv-feed-meta">
          Episode {current.episode}
          {current.durationSec ? ` · ${formatDuration(current.durationSec)}` : ''}
        </div>
      </div>

      {/* Swipe hint — only on first video, only if there's a next, fades on
          first navigation. Quiet — not nagging. */}
      {showSwipeHint && currentIndex === 0 && videos.length > 1 && (
        <div className="tv-feed-swipe-hint" aria-hidden="true">
          <span className="tv-feed-swipe-chev">∧</span>
          <span className="tv-feed-swipe-text">Next</span>
        </div>
      )}
    </div>
  );
};

// Top-left close button — positioned absolute so it stays pinned to the
// corner regardless of whether it's wrapping the active feed or a centered
// state screen. Was previously inside a flex-centered parent which floated
// it next to the content text.
function TVFeedExit({ onClick }) {
  return (
    <button className="tv-feed-exit" onClick={onClick} aria-label="Close">
      <FaTimes />
    </button>
  );
}

// TTTV brand mark — TitanTrack chevron + "tv" wordmark. Built from
// /tt-icon-white.png (already in /public) until Ross drops his finalized
// Canva PNG at /public/tttv-logo-white.png. Once that exists, the <img
// src> below gets swapped for the single combined logo and the chevron+text
// composition collapses to one image.
function TTTVMark() {
  return (
    <div className="tv-feed-state-mark" aria-label="TitanTrack TV">
      <img
        src="/tt-icon-white.png"
        alt=""
        className="tv-feed-state-mark-chevron"
      />
      <span className="tv-feed-state-mark-tv">tv</span>
    </div>
  );
}

function formatDuration(sec) {
  const s = Math.floor(sec || 0);
  const m = Math.floor(s / 60);
  const r = s % 60;
  if (m > 0) return `${m}m ${String(r).padStart(2, '0')}s`;
  return `${r}s`;
}

export default TVFeed;
