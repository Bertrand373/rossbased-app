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

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaTimes, FaPlay, FaVolumeMute, FaVolumeUp } from 'react-icons/fa';
import { listFeed } from '../../services/tttvService';
import './TVFeed.css';

const WHEEL_COOLDOWN_MS = 700;        // debounce between wheel-driven transitions
const SWIPE_RATIO_TO_ADVANCE = 0.20;  // 20% of viewport height = commit nav
const EDGE_RESISTANCE = 0.35;         // rubber-band damping at first/last
const SNAP_DURATION_MS = 360;         // cubic snap-to-position duration
const SNAP_EASING = 'cubic-bezier(0.16, 1, 0.3, 1)';

const TVFeed = ({ isPremium }) => {
  const navigate = useNavigate();
  const containerRef = useRef(null);
  // Stack container (translates vertically to bring slots into view) and a
  // map of per-slot video element refs keyed by absolute video index.
  // videoRefs lets us reach into the prev/current/next videos to play, pause,
  // or attach event listeners without tracking three separate refs by name.
  const stackRef = useRef(null);
  const videoRefs = useRef({});
  // Drag state lives in a ref so touchmove updates don't re-render React at
  // 60fps — only the inline transform on stackRef updates during the drag.
  const dragStateRef = useRef({ active: false, startY: 0, deltaY: 0 });

  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isMuted, setIsMuted] = useState(true);
  const [showSwipeHint, setShowSwipeHint] = useState(true);
  // Playback + chrome visibility — sync directly with the video element's
  // play/pause events so the overlay stays right even when iOS pauses on
  // its own (e.g., tab backgrounded, system audio interruption).
  const [isPlaying, setIsPlaying] = useState(true);
  const [showChrome, setShowChrome] = useState(true);
  const chromeTimeoutRef = useRef(null);
  // Real-time playback position (0-100) for the top progress bar, and
  // visibility of the Oracle overlay (italic-serif line that fades in
  // at the timestamp the episode specifies).
  const [progress, setProgress] = useState(0);
  const [oracleVisible, setOracleVisible] = useState(false);

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

  // ─── Switch active video when currentIndex changes ─────────
  // With the 3-video stack, prev/current/next are all mounted at once. On
  // every index change we pause every non-current video and play the new
  // current. Pre-loaded videos start near-instantly because the browser
  // already has metadata + first chunk via preload="auto" + the src binding.
  useEffect(() => {
    if (videos.length === 0) return;
    const active = videoRefs.current[currentIndex];

    // Pause everyone except the new active
    Object.entries(videoRefs.current).forEach(([idx, el]) => {
      if (!el) return;
      if (Number(idx) === currentIndex) return;
      try { el.pause(); } catch {/* harmless */}
    });

    if (!active) return;
    try { active.currentTime = 0; } catch {/* iOS quirk */}

    const tryPlay = () => {
      const p = active.play();
      if (p && p.catch) p.catch(() => {});
    };
    tryPlay();
    active.addEventListener('loadedmetadata', tryPlay);
    active.addEventListener('canplay', tryPlay);

    setProgress(0);
    setOracleVisible(false);

    return () => {
      active.removeEventListener('loadedmetadata', tryPlay);
      active.removeEventListener('canplay', tryPlay);
    };
  }, [currentIndex, videos]);

  // ─── Snap stack to the current slot on every index change ──
  // The stack is at translate3d(0, -currentIndex * 100vh, 0). When state
  // updates (from navigation, end-of-drag, etc), this useEffect smoothly
  // animates the stack to the new position. During a drag, the touchmove
  // handler imperatively overrides this transform — but on release, this
  // effect re-runs (via the snapStack util) to settle to the snap position.
  const snapStack = useCallback(() => {
    const stack = stackRef.current;
    if (!stack) return;
    stack.style.transition = `transform ${SNAP_DURATION_MS}ms ${SNAP_EASING}`;
    stack.style.transform = `translate3d(0, ${-currentIndex * 100}vh, 0)`;
  }, [currentIndex]);

  useEffect(() => {
    snapStack();
  }, [snapStack]);

  // ─── Real-time progress + Oracle overlay window ───────────
  // Single timeupdate listener drives both the top progress bar (% of
  // current video played) and the Oracle overlay fade-in window
  // (currentTime ∈ [overlay.atSec, overlay.atSec + 4]). Putting both in
  // one listener avoids racing two separate handlers on the same event.
  // Targets the ACTIVE video in the stack — re-attaches when currentIndex
  // changes.
  useEffect(() => {
    const video = videoRefs.current[currentIndex];
    if (!video || videos.length === 0) return;
    const current = videos[currentIndex];
    const overlay = current?.oracleOverlay;
    const hasOverlay = overlay && overlay.text && overlay.text.trim().length > 0;

    const onTimeUpdate = () => {
      if (video.duration > 0) {
        setProgress((video.currentTime / video.duration) * 100);
      }
      if (hasOverlay) {
        const t = video.currentTime;
        const start = overlay.atSec || 0;
        const end = start + 4; // 4-second visibility window
        setOracleVisible(t >= start && t <= end);
      }
    };

    video.addEventListener('timeupdate', onTimeUpdate);
    return () => video.removeEventListener('timeupdate', onTimeUpdate);
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

  // ─── Chrome auto-hide ─────────────────────────────────────
  // After 2.8s of no interaction, the corner controls + brand mark + dots
  // fade out so the video takes full attention. Any tap brings them back.
  // The title stays always — premium players keep context visible.
  const scheduleChromeHide = useCallback(() => {
    if (chromeTimeoutRef.current) clearTimeout(chromeTimeoutRef.current);
    chromeTimeoutRef.current = setTimeout(() => setShowChrome(false), 2800);
  }, []);

  const revealChrome = useCallback(() => {
    setShowChrome(true);
    scheduleChromeHide();
  }, [scheduleChromeHide]);

  // Kick off the auto-hide once playback starts on the first video.
  useEffect(() => {
    if (videos.length > 0 && isPlaying) scheduleChromeHide();
    return () => {
      if (chromeTimeoutRef.current) clearTimeout(chromeTimeoutRef.current);
    };
  }, [videos.length, isPlaying, scheduleChromeHide]);

  // Reveal chrome on every video change so the user sees what's playing next.
  useEffect(() => {
    if (videos.length > 0) revealChrome();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex]);

  // Sync isPlaying with the active video — re-attaches on index change.
  useEffect(() => {
    const video = videoRefs.current[currentIndex];
    if (!video) return;
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    video.addEventListener('play', onPlay);
    video.addEventListener('pause', onPause);
    return () => {
      video.removeEventListener('play', onPlay);
      video.removeEventListener('pause', onPause);
    };
  }, [currentIndex]);

  const handleVideoTap = useCallback(() => {
    const video = videoRefs.current[currentIndex];
    if (!video) return;
    if (video.paused) {
      video.play().catch(() => {});
    } else {
      video.pause();
    }
    revealChrome();
  }, [currentIndex, revealChrome]);

  // ─── Touch (finger-follow) + wheel + keyboard ─────────────
  // Touch handlers drive the stack transform DIRECTLY (via inline style,
  // bypassing React) so dragging stays at native 60fps regardless of how
  // many videos are in flight. On release, snapStack via the index-change
  // useEffect handles the cubic settle to the new (or same) position.
  //
  // Edge rubber-band: at the first video, downward drag is damped
  // (delta * EDGE_RESISTANCE) — same at the last video for upward drag.
  // Same vibe as native iOS scroll bounce.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let wheelLock = false;
    const vh = () => window.innerHeight;

    const onTouchStart = (e) => {
      dragStateRef.current.active = true;
      dragStateRef.current.startY = e.touches[0].clientY;
      dragStateRef.current.deltaY = 0;
      // Disable transition for immediate finger-follow.
      if (stackRef.current) {
        stackRef.current.style.transition = 'none';
      }
    };

    const onTouchMove = (e) => {
      const drag = dragStateRef.current;
      if (!drag.active) return;
      drag.deltaY = e.touches[0].clientY - drag.startY;

      // Rubber-band at edges so the user feels resistance instead of
      // dragging into the void.
      let effective = drag.deltaY;
      if (currentIndex === 0 && effective > 0) {
        effective = effective * EDGE_RESISTANCE;
      } else if (currentIndex === videos.length - 1 && effective < 0) {
        effective = effective * EDGE_RESISTANCE;
      }

      if (stackRef.current) {
        const baseY = -currentIndex * vh();
        stackRef.current.style.transform = `translate3d(0, ${baseY + effective}px, 0)`;
      }
    };

    const onTouchEnd = () => {
      const drag = dragStateRef.current;
      if (!drag.active) return;
      drag.active = false;

      const delta = drag.deltaY;
      const threshold = vh() * SWIPE_RATIO_TO_ADVANCE;
      const canGoNext = currentIndex < videos.length - 1;
      const canGoPrev = currentIndex > 0;

      if (Math.abs(delta) >= threshold) {
        if (delta < 0 && canGoNext) {
          goNext();
          revealChrome();
          return; // snapStack effect handles the settle to new index
        }
        if (delta > 0 && canGoPrev) {
          goPrev();
          revealChrome();
          return;
        }
      }
      // Below threshold OR at an edge — snap back to current.
      snapStack();
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

  // 3-video sliding window — render prev / current / next so all are
  // preloaded by the browser in parallel. The stack container translates
  // vertically to bring the active slot into view; swipes drag the whole
  // stack, then snap to whichever slot is now under the viewport.
  const visibleSlots = videos
    .map((video, index) => ({ index, video }))
    .filter(({ index }) => Math.abs(index - currentIndex) <= 1);

  return (
    <div
      className={`tv-feed${showChrome ? ' chrome-visible' : ' chrome-hidden'}`}
      ref={containerRef}
    >
      {/* 3-video preload stack — all slots in [currentIndex-1, currentIndex+1]
          are mounted with their src set so the browser fetches in parallel.
          Only the active slot has autoPlay; navigation switches which one
          is playing. Swipe drags the stack via inline transform; release
          snaps via snapStack(). The slot at top: index*100vh is positioned
          absolutely so the entire stack just needs to translateY to bring
          a given slot into the viewport. */}
      <div className="tv-feed-stack" ref={stackRef}>
        {visibleSlots.map(({ index, video }) => (
          <div
            key={video._id || index}
            className={`tv-feed-slot${index === currentIndex ? ' active' : ''}`}
            style={{ top: `${index * 100}vh` }}
          >
            <video
              ref={(el) => {
                if (el) videoRefs.current[index] = el;
                else delete videoRefs.current[index];
              }}
              className="tv-feed-video"
              src={video.storageUrl}
              poster={video.posterUrl || undefined}
              preload="auto"
              autoPlay={index === currentIndex}
              loop
              playsInline
              muted={isMuted}
              onClick={index === currentIndex ? handleVideoTap : undefined}
            />
          </div>
        ))}
      </div>

      {/* Top progress bar — always-on, thin gold line at the very top edge
          showing playback position in the current video. Live signal that
          something is happening. */}
      <div className="tv-feed-progress" aria-hidden="true">
        <div
          className="tv-feed-progress-fill"
          style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
        />
      </div>

      {/* Scrims — gradient + backdrop-blur zones that guarantee legibility
          of overlay chrome on ANY video frame. The bottom scrim is always
          on (supports the always-visible title); the top scrim fades with
          the corner controls when chrome auto-hides. The mask + blur combo
          (the "frosted floor" pattern) is what Apple TV+, Netflix, premium
          players all use — softer than a hard gradient, anchors text without
          looking like a box. */}
      <div className="tv-feed-scrim-top" aria-hidden="true" />
      <div className="tv-feed-scrim-bottom" aria-hidden="true" />

      {/* Pause overlay — frosted play glyph fades into center when paused.
          Same vocabulary as the corner buttons (scrim + blur) just scaled
          up. Vanishes on play. */}
      {!isPlaying && (
        <div className="tv-feed-pause-overlay" aria-hidden="true">
          <svg width="38" height="38" viewBox="0 0 24 24" fill="currentColor">
            <path d="M8 5v14l11-7z" />
          </svg>
        </div>
      )}

      {/* Persistent quiet brand mark — top center, low opacity. The kind
          of detail TikTok structurally can't do (they have no brand for
          the player). Fades with the rest of the chrome on idle. */}
      <img
        src="/tttv-logo-white.png"
        alt=""
        className="tv-feed-brand"
        aria-hidden="true"
      />

      {/* Top-corner controls. Both auto-hide with the rest of the chrome
          after 2.8s of no interaction; tap on video brings them back. */}
      <TVFeedExit onClick={handleExit} />
      <button
        className="tv-feed-mute"
        onClick={(e) => { e.stopPropagation(); handleMuteToggle(); revealChrome(); }}
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

      {/* Oracle overlay — the TTTV differentiator. When an episode has
          oracleOverlay.text set in admin, at oracleOverlay.atSec the line
          fades in for 4 seconds, then fades out. Italic serif here is
          intentional — this IS the Notes-style "quoted moment" voice
          that serif is meant to carry. */}
      {current.oracleOverlay?.text && (
        <div
          className={`tv-feed-oracle${oracleVisible ? ' visible' : ''}`}
          aria-hidden={!oracleVisible}
        >
          {current.oracleOverlay.text}
        </div>
      )}

      {/* Title overlay — always-on. Premium players keep context visible
          even when the rest of the chrome fades. */}
      <div className="tv-feed-info">
        <div className="tv-feed-title">{current.title}</div>
        <div className="tv-feed-meta">
          Episode {current.episode}
          {current.durationSec ? ` · ${formatDuration(current.durationSec)}` : ''}
        </div>
      </div>

      {/* Swipe hint — only on first video, only if there's a next, fades
          on first navigation. */}
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

// TTTV brand mark — the finalized Canva logo (chevron + TV wordmark
// composed as a single asset, transparent bg). Lives in /public so it
// can be referenced as a static URL without import overhead.
function TTTVMark() {
  return (
    <img
      src="/tttv-logo-white.png"
      alt="TitanTrack TV"
      className="tv-feed-state-mark"
    />
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
