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
import { useNavigate, useSearchParams } from 'react-router-dom';
import { FaPlay, FaVolumeMute, FaVolumeUp, FaBookmark, FaShareAlt } from 'react-icons/fa';
import toast from 'react-hot-toast';
import { listFeed } from '../../services/tttvService';
import TVGrid, { markWatched } from '../TVGrid/TVGrid';
import './TVFeed.css';

const WHEEL_COOLDOWN_MS = 700;        // debounce between wheel-driven transitions
const SWIPE_RATIO_TO_ADVANCE = 0.10;  // 10% of viewport = commit nav (lowered from 20%)
const FLICK_VELOCITY_PX_PER_MS = 0.45; // ~450 px/sec = a clear flick → commit regardless of distance
const EDGE_RESISTANCE = 0.35;         // rubber-band damping at first/last
const SNAP_DURATION_MS = 320;         // cubic snap-to-position duration (slightly snappier)
const SNAP_EASING = 'cubic-bezier(0.16, 1, 0.3, 1)';

const TVFeed = ({ isPremium }) => {
  const navigate = useNavigate();
  // URL state for which episode is playing. No ?play param = grid view.
  // ?play=<videoId> = player at that episode. Lets back button return to
  // grid naturally and makes specific-episode URLs shareable.
  const [searchParams, setSearchParams] = useSearchParams();
  const playingId = searchParams.get('play');
  const containerRef = useRef(null);
  // Stack container (translates vertically to bring slots into view) and a
  // map of per-slot video element refs keyed by absolute video index.
  // videoRefs lets us reach into the prev/current/next videos to play, pause,
  // or attach event listeners without tracking three separate refs by name.
  const stackRef = useRef(null);
  const videoRefs = useRef({});
  // Drag state lives in a ref so touchmove updates don't re-render React at
  // 60fps — only the inline transform on stackRef updates during the drag.
  // startTime + lastY/lastTime let us compute velocity at release: a fast
  // flick can commit nav even when the user only dragged a short distance.
  // Premium short-form (TikTok/Reels/Shorts) all do velocity-aware swipes.
  const dragStateRef = useRef({
    active: false,
    startY: 0,
    deltaY: 0,
    startTime: 0,
    lastY: 0,
    lastTime: 0,
  });

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
  // Real-time playback position (0-100) for the bottom progress bar, and
  // visibility of the Oracle overlay (italic-serif line that fades in
  // at the timestamp the episode specifies).
  const [progress, setProgress] = useState(0);
  const [oracleVisible, setOracleVisible] = useState(false);
  // Scrub state — when user drags the progress bar, we pause the video
  // and update currentTime live so they see the frame at their finger.
  // Resumes play on release. wasPlayingBeforeScrubRef remembers whether
  // they were playing before so we don't auto-resume a paused video.
  const [isScrubbing, setIsScrubbing] = useState(false);
  const progressBarRef = useRef(null);
  const wasPlayingBeforeScrubRef = useRef(true);
  // End-of-session card — fires when the LAST video plays to completion
  // (only that video has loop=false). Premium feel: bounded session ends
  // gracefully instead of looping forever.
  const [showEndCard, setShowEndCard] = useState(false);
  // Episode ambient color — pulled from the active poster's mid-tones.
  // Used as a CSS variable to tint the radial glow behind the top brand
  // pill, giving each episode a quiet color identity (Mubi pattern). Null
  // until extraction completes; chrome falls back to gold when null.
  const [episodeColor, setEpisodeColor] = useState(null);
  // Splash minimum duration — even if the feed loads instantly we hold
  // the TTTV mark for 450ms so the transition from Me-sheet tap to grid
  // reads as a deliberate intro instead of a flash. Premium = pacing.
  const [minSplashDone, setMinSplashDone] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setMinSplashDone(true), 450);
    return () => clearTimeout(t);
  }, []);

  // Always start with the body scroll locked — TVFeed is a takeover view.
  // Restored on unmount so the user lands back in normal scroll state.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  // Sync currentIndex to the URL's ?play=<videoId> param. Runs whenever
  // playingId changes (user tapped a grid card) or videos finish loading
  // (deep-link to /tv?play=X on first mount). Defaults to 0 if the id
  // doesn't match any loaded episode.
  useEffect(() => {
    if (!playingId || videos.length === 0) return;
    const idx = videos.findIndex(v => v._id === playingId);
    if (idx >= 0 && idx !== currentIndex) {
      setCurrentIndex(idx);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playingId, videos]);

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
    // Consistent px units everywhere — mixing vh and px in transforms
    // makes Safari interpolate weirdly mid-snap. Snap = absolute px.
    stack.style.transform = `translate3d(0, ${-currentIndex * window.innerHeight}px, 0)`;
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
        const ratio = video.currentTime / video.duration;
        setProgress(ratio * 100);
        // Mark watched when the user crosses 80% — same threshold YouTube
        // uses for "counted as a view." Localstorage-only for now; future
        // PR can sync to backend per user.
        if (ratio >= 0.8 && current?._id) {
          markWatched(current._id);
        }
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
  // Haptic on commit — 8ms feels like the "click" iOS uses for picker
  // wheels. Subtle, just enough to confirm the gesture landed.
  const haptic = () => {
    if (navigator.vibrate) {
      try { navigator.vibrate(8); } catch {/* unsupported */}
    }
  };

  const goNext = useCallback(() => {
    setCurrentIndex(i => {
      if (i + 1 >= videos.length) return i; // clamp; don't loop the session
      haptic();
      setShowSwipeHint(false);
      return i + 1;
    });
  }, [videos.length]);

  const goPrev = useCallback(() => {
    setCurrentIndex(i => {
      if (i <= 0) return i;
      haptic();
      return i - 1;
    });
  }, []);

  // Exit: from player → back to grid (clears ?play). From grid → exit
  // the /tv route entirely. The conditional means the X button does the
  // right "one level up" thing regardless of which view we're in.
  const handleExit = useCallback(() => {
    if (playingId) {
      setSearchParams({});
    } else {
      navigate('/');
    }
  }, [navigate, playingId, setSearchParams]);

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

  // ─── Episode ambient color ────────────────────────────────
  // Extracts a mid-tone color from the active poster and exposes it via
  // the --episode-color CSS variable on the .tv-feed root. The radial
  // glow behind the top brand pill uses that variable to give each
  // episode its own quiet color identity. Transitions smoothly via CSS.
  useEffect(() => {
    if (videos.length === 0) return;
    const current = videos[currentIndex];
    if (!current?.posterUrl) {
      setEpisodeColor(null);
      return;
    }
    let cancelled = false;
    extractDominantColor(current.posterUrl).then((color) => {
      if (!cancelled) setEpisodeColor(color);
    });
    return () => { cancelled = true; };
  }, [currentIndex, videos]);

  // ─── End-of-session detection ─────────────────────────────
  // The last video has loop={false} (see slot render). When it plays to
  // completion, fire the end-of-session overlay. Other videos loop, so
  // 'ended' never fires for them — only the explicit last-video case.
  useEffect(() => {
    if (videos.length === 0) return;
    if (currentIndex !== videos.length - 1) {
      setShowEndCard(false);
      return;
    }
    const video = videoRefs.current[currentIndex];
    if (!video) return;
    const onEnded = () => setShowEndCard(true);
    video.addEventListener('ended', onEnded);
    return () => video.removeEventListener('ended', onEnded);
  }, [currentIndex, videos.length]);

  // ─── Media Session API (lock-screen + control-center metadata) ─
  // Tells iOS / Android what's playing so the lock screen shows the
  // poster + title + play/pause/next/prev controls. Re-runs on every
  // index change so each episode's metadata is current.
  useEffect(() => {
    if (!('mediaSession' in navigator)) return;
    if (videos.length === 0) return;
    const current = videos[currentIndex];
    if (!current) return;

    try {
      navigator.mediaSession.metadata = new window.MediaMetadata({
        title: current.title || `Episode ${current.episode}`,
        artist: 'TitanTrack TV',
        album: `Curated by Ross · Episode ${current.episode}`,
        artwork: current.posterUrl
          ? [{ src: current.posterUrl, sizes: '512x512', type: 'image/jpeg' }]
          : [],
      });
    } catch {/* MediaMetadata unsupported */}

    const setHandler = (action, fn) => {
      try { navigator.mediaSession.setActionHandler(action, fn); } catch {}
    };
    setHandler('play', () => videoRefs.current[currentIndex]?.play().catch(() => {}));
    setHandler('pause', () => videoRefs.current[currentIndex]?.pause());
    setHandler('nexttrack', goNext);
    setHandler('previoustrack', goPrev);

    return () => {
      ['play', 'pause', 'nexttrack', 'previoustrack'].forEach(a => setHandler(a, null));
    };
  }, [currentIndex, videos, goNext, goPrev]);

  // ─── Wake Lock (screen doesn't dim during playback) ────────
  // Acquired on mount, released on unmount. Also re-acquired when the
  // tab becomes visible again — wakeLock auto-releases when the tab
  // goes hidden, so visibility changes need a re-grab.
  useEffect(() => {
    if (!('wakeLock' in navigator)) return;
    let lock = null;
    let cancelled = false;

    const acquire = async () => {
      try {
        const w = await navigator.wakeLock.request('screen');
        if (cancelled) {
          await w.release();
          return;
        }
        lock = w;
      } catch {/* user gesture not yet given, or unsupported */}
    };

    const onVisibility = () => {
      if (document.visibilityState === 'visible' && !lock) acquire();
    };

    acquire();
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisibility);
      if (lock) lock.release().catch(() => {});
    };
  }, []);

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

  // ─── Save current moment ──────────────────────────────────
  // Bookmarks the exact timestamp the user is at (so the entry remembers
  // "this 12-second mark of Episode 3"). localStorage for v1 — future
  // integration with NotesLibrary will let saved moments appear in the
  // same Highlights & Notes library as Oracle text quotes (one library,
  // two sources). Capped at 100 entries to keep localStorage sane.
  const handleSave = useCallback(() => {
    const video = videoRefs.current[currentIndex];
    const current = videos[currentIndex];
    if (!video || !current) return;
    try {
      const raw = localStorage.getItem('tttv_saved_moments');
      const list = raw ? JSON.parse(raw) : [];
      // Don't double-save the same moment if user mashes the button —
      // dedupe on (videoId, atSec rounded to seconds).
      const atSec = Math.floor(video.currentTime || 0);
      const dedupeKey = `${current._id}@${atSec}`;
      const exists = list.some(m => `${m.videoId}@${Math.floor(m.atSec)}` === dedupeKey);
      if (exists) {
        toast('Already saved');
      } else {
        list.unshift({
          videoId: current._id,
          atSec: video.currentTime || 0,
          title: current.title,
          episode: current.episode,
          savedAt: Date.now(),
        });
        if (list.length > 100) list.length = 100;
        localStorage.setItem('tttv_saved_moments', JSON.stringify(list));
        toast.success('Saved to Library');
      }
    } catch {
      toast.error("Couldn't save");
    }
    revealChrome();
  }, [currentIndex, videos, revealChrome]);

  // ─── Share current episode ────────────────────────────────
  // Web Share API on mobile gives the native iOS share sheet (text to a
  // buddy, copy link, etc.). On desktop or unsupported browsers, falls
  // back to clipboard copy. URL includes ?play=<id> so the recipient
  // lands directly on the episode.
  const handleShare = useCallback(async () => {
    const current = videos[currentIndex];
    if (!current) return;
    const url = `${window.location.origin}/tv?play=${current._id}`;
    revealChrome();
    if (navigator.share) {
      try {
        await navigator.share({
          title: `TitanTrack TV · ${current.title}`,
          text: `Watching "${current.title}" on TitanTrack TV`,
          url,
        });
      } catch (err) {
        // User cancelled (AbortError) — silent. Other errors fall through.
        if (err.name !== 'AbortError') {
          try {
            await navigator.clipboard.writeText(url);
            toast.success('Link copied');
          } catch { toast.error("Couldn't share"); }
        }
      }
    } else {
      try {
        await navigator.clipboard.writeText(url);
        toast.success('Link copied');
      } catch { toast.error("Couldn't share"); }
    }
  }, [currentIndex, videos, revealChrome]);

  // ─── Scrub seek ────────────────────────────────────────────
  // Tap on the progress bar = jump to position. Drag along the bar =
  // live scrub (currentTime updates as the finger moves). Pauses the
  // video during scrub so the user sees the frame they're landing on,
  // resumes on release — unless they had it paused before, in which
  // case we leave it paused.
  const seekToClientX = useCallback((clientX) => {
    const bar = progressBarRef.current;
    const video = videoRefs.current[currentIndex];
    if (!bar || !video || !video.duration) return;
    const rect = bar.getBoundingClientRect();
    const fraction = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    try {
      video.currentTime = video.duration * fraction;
      setProgress(fraction * 100);
    } catch {/* iOS quirk on rapid seeks */}
  }, [currentIndex]);

  const handleScrubStart = useCallback((e) => {
    e.stopPropagation();
    const video = videoRefs.current[currentIndex];
    if (!video) return;
    wasPlayingBeforeScrubRef.current = !video.paused;
    try { video.pause(); } catch {}
    setIsScrubbing(true);
    revealChrome();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    seekToClientX(clientX);
  }, [currentIndex, revealChrome, seekToClientX]);

  // Document-level scrub move/end so the user can drag outside the bar
  // without losing the gesture. Active only while isScrubbing.
  useEffect(() => {
    if (!isScrubbing) return;

    const onMove = (e) => {
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      seekToClientX(clientX);
    };
    const onUp = () => {
      setIsScrubbing(false);
      const video = videoRefs.current[currentIndex];
      if (video && wasPlayingBeforeScrubRef.current) {
        video.play().catch(() => {});
      }
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    document.addEventListener('touchmove', onMove, { passive: true });
    document.addEventListener('touchend', onUp);
    document.addEventListener('touchcancel', onUp);
    return () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      document.removeEventListener('touchmove', onMove);
      document.removeEventListener('touchend', onUp);
      document.removeEventListener('touchcancel', onUp);
    };
  }, [isScrubbing, currentIndex, seekToClientX]);

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
      // If the touch started inside the progress bar, let the scrub
      // handler take over — vertical-swipe nav shouldn't fire.
      if (e.target.closest && e.target.closest('.tv-feed-progress-wrap')) {
        return;
      }
      const now = performance.now();
      dragStateRef.current.active = true;
      dragStateRef.current.startY = e.touches[0].clientY;
      dragStateRef.current.deltaY = 0;
      dragStateRef.current.startTime = now;
      dragStateRef.current.lastY = e.touches[0].clientY;
      dragStateRef.current.lastTime = now;
      // Disable transition for immediate finger-follow.
      if (stackRef.current) {
        stackRef.current.style.transition = 'none';
      }
    };

    const onTouchMove = (e) => {
      const drag = dragStateRef.current;
      if (!drag.active) return;
      // preventDefault BEFORE Safari claims the gesture (~10px) so native
      // vertical scroll doesn't fight our finger-follow drag. Requires
      // passive: false on the listener.
      if (e.cancelable) e.preventDefault();
      const y = e.touches[0].clientY;
      drag.deltaY = y - drag.startY;
      // Update last-y/time at every move so velocity is the *recent* speed
      // at release — not the average across the whole drag.
      drag.lastY = y;
      drag.lastTime = performance.now();

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
      const elapsed = Math.max(1, drag.lastTime - drag.startTime);
      // Velocity in px/ms — positive = downward, negative = upward.
      const velocity = delta / elapsed;
      const speed = Math.abs(velocity);

      const distanceThreshold = vh() * SWIPE_RATIO_TO_ADVANCE;
      const canGoNext = currentIndex < videos.length - 1;
      const canGoPrev = currentIndex > 0;

      // Commit nav if EITHER the distance threshold is met OR the user
      // flicked fast enough. Direction comes from delta sign (negative =
      // dragged upward = next video). This matches TikTok/Reels/Shorts
      // feel — quick flicks always advance, slow short drags snap back.
      const distancePast = Math.abs(delta) >= distanceThreshold;
      const flicked = speed >= FLICK_VELOCITY_PX_PER_MS;

      if (distancePast || flicked) {
        if (delta < 0 && canGoNext) {
          goNext();
          revealChrome();
          return; // snapStack effect handles the settle
        }
        if (delta > 0 && canGoPrev) {
          goPrev();
          revealChrome();
          return;
        }
      }
      // Below threshold AND not a flick — or at an edge. Snap back.
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
    container.addEventListener('touchmove', onTouchMove, { passive: false });
    container.addEventListener('touchend', onTouchEnd, { passive: true });
    container.addEventListener('touchcancel', onTouchEnd, { passive: true });
    container.addEventListener('wheel', onWheel, { passive: true });
    window.addEventListener('keydown', onKey);

    return () => {
      container.removeEventListener('touchstart', onTouchStart);
      container.removeEventListener('touchmove', onTouchMove);
      container.removeEventListener('touchend', onTouchEnd);
      container.removeEventListener('touchcancel', onTouchEnd);
      container.removeEventListener('wheel', onWheel);
      window.removeEventListener('keydown', onKey);
    };
  }, [goNext, goPrev, handleExit, handleMuteToggle, snapStack, videos.length, currentIndex]);

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
  // Premium "intentional intro" splash. The TTTV mark fades + scales in
  // on a cubic curve, sits a beat with the breathing animation, then the
  // grid takes over. Even when the network fetch is instant we hold the
  // splash for at least 450ms (see minSplashDone) so the transition
  // never feels like a flicker — it reads as a deliberate intro instead.
  if (loading || !minSplashDone) {
    return (
      <div className="tv-feed tv-feed-splash" aria-label="Loading TitanTrack TV">
        <img
          src="/tttv-logo-white.png"
          alt=""
          className="tv-feed-splash-mark"
        />
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

  // ─── Render: grid (browse) ────────────────────────────────
  // No ?play in the URL = user is browsing. Atlas-style 2-column card
  // grid with poster bg, episode badge, title, and watched indicators.
  // Tap a card to enter player mode at that episode.
  if (!playingId) {
    return (
      <TVGrid
        videos={videos}
        onPlay={(id) => setSearchParams({ play: id })}
        onExit={() => navigate('/')}
      />
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

  // Episode color as a CSS variable string. Falls back to the brand
  // gold when extraction returns null (CORS not configured, transparent
  // poster, etc).
  const episodeColorVar = episodeColor
    ? `rgb(${episodeColor.r}, ${episodeColor.g}, ${episodeColor.b})`
    : 'rgb(255, 221, 0)';

  return (
    <div
      className={`tv-feed${showChrome ? ' chrome-visible' : ' chrome-hidden'}`}
      ref={containerRef}
      style={{ '--episode-color': episodeColorVar }}
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
            style={{
              top: `${index * 100}%`,
              // Poster lives on the slot bg instead of the <video poster=>
              // attribute. Same image but it renders BEHIND the video element,
              // so there's no "poster shows → video plays" flash. The video
              // is transparent until its frames are ready, then covers the
              // bg seamlessly. (Was a real flicker between transitions.)
              backgroundImage: video.posterUrl ? `url(${video.posterUrl})` : undefined,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundColor: '#000',
            }}
          >
            <video
              ref={(el) => {
                if (el) videoRefs.current[index] = el;
                else delete videoRefs.current[index];
              }}
              className="tv-feed-video"
              src={video.storageUrl}
              preload="auto"
              autoPlay={index === currentIndex}
              // Last video doesn't loop so we can detect end-of-session via
              // the 'ended' event. Everything else loops indefinitely (user
              // moves on via swipe).
              loop={index !== videos.length - 1}
              playsInline
              muted={isMuted}
              onClick={index === currentIndex ? handleVideoTap : undefined}
            />
          </div>
        ))}
      </div>

      {/* Bottom progress bar — tap to seek, drag to scrub. 24px touch
          target (the wrap) with a 3px visible bar at its bottom edge —
          premium-player pattern, big enough to drag, small enough to be
          quiet visually. The fill uses the app's Oracle-gold token so
          it tracks the brand color anywhere it's set. */}
      <div
        className={`tv-feed-progress-wrap${isScrubbing ? ' scrubbing' : ''}`}
        ref={progressBarRef}
        onMouseDown={handleScrubStart}
        onTouchStart={handleScrubStart}
      >
        <div className="tv-feed-progress" aria-hidden="true">
          <div
            className="tv-feed-progress-fill"
            style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
          />
        </div>
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

      {/* Persistent quiet brand mark — top center. Wrapped in a subtle
          dark pill so it reads on any video frame (was getting lost on
          lighter ones). Same scrim+blur vocabulary as the corner buttons,
          just elongated. Fades with the rest of the chrome on idle. */}
      <div className="tv-feed-brand-pill" aria-hidden="true">
        <img
          src="/tttv-logo-white.png"
          alt=""
          className="tv-feed-brand"
        />
      </div>

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

      {/* Feed dots removed — the grid view + bottom progress bar already
          tell the user where they are in the session, and the action stack
          owns the right edge now. Position indicator was redundant. */}

      {/* Right-side action stack — Save + Share. TikTok/Reels/Shorts have
          this column; we adapt with TTTV-appropriate verbs (no like/dislike
          counts — saving is the only verb). Buttons auto-hide with the rest
          of the chrome; tap on video reveals them. */}
      <div className="tv-feed-actions">
        <button
          type="button"
          className="tv-feed-action"
          onClick={(e) => { e.stopPropagation(); handleSave(); }}
          aria-label="Save moment to Library"
        >
          <span className="tv-feed-action-icon"><FaBookmark /></span>
          <span className="tv-feed-action-label">Save</span>
        </button>
        <button
          type="button"
          className="tv-feed-action"
          onClick={(e) => { e.stopPropagation(); handleShare(); }}
          aria-label="Share episode"
        >
          <span className="tv-feed-action-icon"><FaShareAlt /></span>
          <span className="tv-feed-action-label">Share</span>
        </button>
      </div>

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

      {/* Swipe hint removed — bottom progress bar + vertical layout
          already signal "video, swipe vertically" via universal muscle
          memory (TikTok/Reels). Don't reinvent the wheel. */}

      {/* End-of-session card — overlays the last video when it plays
          through to completion. Curated sessions END instead of looping
          forever; this is what makes TTTV feel premium-bounded rather
          than algorithmic-infinite. */}
      {showEndCard && (
        <div className="tv-feed-end" role="dialog" aria-modal="true">
          <img
            src="/tttv-logo-white.png"
            alt=""
            className="tv-feed-end-mark"
            aria-hidden="true"
          />
          <div className="tv-feed-end-eyebrow">TITANTRACK · TV</div>
          <h2 className="tv-feed-end-title">End of session.</h2>
          <p className="tv-feed-end-sub">
            You've watched everything in today's library.
          </p>
          <button
            type="button"
            className="tv-feed-end-btn"
            onClick={() => {
              setShowEndCard(false);
              setSearchParams({});
            }}
          >
            Back to episodes
          </button>
        </div>
      )}
    </div>
  );
};

// Top-left close button — positioned absolute so it stays pinned to the
// corner regardless of whether it's wrapping the active feed or a centered
// state screen. Was previously inside a flex-centered parent which floated
// it next to the content text.
// X glyph matches the system modal close used in BottomSheet sheets
// (Tracker, CircleSheet, etc.) — same 18×18 SVG with rounded-cap diagonal
// lines. Was FaTimes (Font Awesome) which felt heavier and squared off
// vs the rest of the app. Inlined to match the existing pattern in
// Tracker.js / CircleSheet.js rather than introducing a new shared
// component for a single glyph.
function TVFeedExit({ onClick }) {
  return (
    <button className="tv-feed-exit" onClick={onClick} aria-label="Close">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6" y1="6" x2="18" y2="18" />
      </svg>
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

// Extracts a representative mid-tone color from an image URL via a canvas
// pixel sample. Skips extreme bright/dark pixels so the result reflects
// the dominant content tone, not the bezels or highlights. Returns null
// on CORS taint or load error — caller falls back to the gold default.
//
// Mubi/Criterion use this same pattern to tint UI per film. For TTTV,
// each episode gets a subtle ambient color around the brand pill — felt,
// not seen.
//
// Requires the storage bucket to have CORS configured to allow
// crossOrigin requests; without it canvas tainting blocks the read.
// See PR notes for the bucket CORS command.
function extractDominantColor(url) {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const w = canvas.width = 40;
        const h = canvas.height = 40;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);
        const data = ctx.getImageData(0, 0, w, h).data;
        let r = 0, g = 0, b = 0, count = 0;
        for (let i = 0; i < data.length; i += 4) {
          const a = data[i + 3];
          if (a < 200) continue;
          const br = (data[i] + data[i + 1] + data[i + 2]) / 3;
          if (br < 35 || br > 220) continue; // skip near-black and near-white
          r += data[i];
          g += data[i + 1];
          b += data[i + 2];
          count++;
        }
        if (count === 0) return resolve(null);
        resolve({
          r: Math.round(r / count),
          g: Math.round(g / count),
          b: Math.round(b / count),
        });
      } catch {
        // Canvas taint or other read error — silent fallback.
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

function formatDuration(sec) {
  const s = Math.floor(sec || 0);
  const m = Math.floor(s / 60);
  const r = s % 60;
  if (m > 0) return `${m}m ${String(r).padStart(2, '0')}s`;
  return `${r}s`;
}

export default TVFeed;
