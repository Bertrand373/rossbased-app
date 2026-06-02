// src/components/Photo/PhotoCaptureSheet.js
//
// Custom in-app camera flow for daily photo capture. v3 adds
// MediaPipe face detection on top of the v2 tap-to-start + explicit-
// .play() iOS Safari fixes:
//
//   - Oval guide turns SAGE GREEN when a face is detected, centered
//     within the oval, and adequately sized. White until then.
//     "Hold still" instruction fades in once locked.
//   - Auto-capture fires after 1.5s of continuous stable lock. User
//     can override at any time by tapping the shutter.
//   - White flash on capture for the premium-camera shutter feel.
//   - Optional haptic on lock acquisition (iOS Vibration API support
//     varies; fails silently where unsupported).
//
// MediaPipe is dynamically imported so the ~250KB runtime + ~190KB
// model only load once the user actually opens the camera sheet —
// keeps the initial CRA bundle clean.
//
// If MediaPipe fails to load (network blocked, older iOS Safari,
// WASM disabled), we fall back to plain white-oval manual capture
// — the entire face-detection layer is purely additive.
//
// State machine (`phase`):
//   'ready'      → "Tap to start camera" pill
//   'starting'   → getUserMedia in flight
//   'live'       → preview + face oval + shutter (detection runs here)
//   'review'     → captured snapshot + Retake / Use Photo
//   'uploading'  → posting to /api/photos/upload
//   'denied'     → permission denied → fallback to native input
//   'error'      → device-level failure → same fallback path

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import ReactDOM from 'react-dom';
import toast from 'react-hot-toast';
import useSheetSwipe from '../../hooks/useSheetSwipe';
import { readEntry, writeEntry, getBaselinePhoto, listPhotoEntries } from '../../utils/dayJournal';
import { getPresignedUrl } from '../../utils/photoUrl';
import { format, differenceInCalendarDays, parseISO } from 'date-fns';
import '../../styles/BottomSheet.css';
import './Photo.css';

const API_URL = process.env.REACT_APP_API_URL || 'https://rossbased-app.onrender.com';

const PHASES = {
  READY: 'ready',
  STARTING: 'starting',
  LIVE: 'live',
  REVIEW: 'review',
  UPLOADING: 'uploading',
  DENIED: 'denied',
  ERROR: 'error'
};

// Auto-capture delay once the face is continuously locked. Bumped
// from 1.5s — at that speed the manual shutter felt useless and
// users barely saw the sage transition before the white flash hit.
// 3.5s gives time to register "lock acquired, capture imminent" and
// either let it auto-fire or override with the shutter.
const AUTO_CAPTURE_DELAY_MS = 3500;

// Settle period — face must be continuously detected as "good" for
// this long before we actually flip `locked` to true. Prevents the
// sage <-> white flicker that happens when the face is on the
// detection boundary (just barely in the oval).
const LOCK_SETTLE_MS = 200;

// Lock geometry — what counts as "face is in the oval." With the v4
// full-bleed layout the feed fills the whole sheet: object-fit:cover
// crops the sides and shows the full frame height, and the oval guide
// sits in the camera area above the glass deck — visually ~0.32 down
// the frame. We target that point so the lock zone stays centered on
// the oval instead of biasing low (the old 3:4 viewport used 0.45,
// when the oval and the frame's 0.45 line coincided). LOCK_TOL_Y
// (0.20) comfortably absorbs the small per-device variance in where
// the fixed-height deck puts the oval.
const LOCK_TARGET_X = 0.5;
const LOCK_TARGET_Y = 0.32;
const LOCK_TOL_X = 0.18;
const LOCK_TOL_Y = 0.20;
const LOCK_MIN_AREA = 0.05;
const LOCK_MAX_AREA = 0.60;

const PhotoCaptureSheet = ({ open, onClose, userData, updateUserData, onSaved, targetDate }) => {
  const [sheetReady, setSheetReady] = useState(false);
  const [phase, setPhase] = useState(PHASES.READY);
  const [errorMessage, setErrorMessage] = useState('');
  const [capturedBlob, setCapturedBlob] = useState(null);
  const [capturedPreview, setCapturedPreview] = useState(null);
  const [guidanceUrl, setGuidanceUrl] = useState(null);
  const [showGhost, setShowGhost] = useState(false);
  const [locked, setLocked] = useState(false);
  const [flashing, setFlashing] = useState(false);

  const sheetPanelRef = useRef(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const fileInputRef = useRef(null);

  // Face detection refs
  const detectorRef = useRef(null);
  const rafRef = useRef(null);
  const settleStartTimeRef = useRef(0); // when face first detected as "good"
  const lockStartTimeRef = useRef(0);   // when stable lock began (post-settle)
  const autoCaptureScheduledRef = useRef(false);
  const lastHapticRef = useRef(0);

  const today = useMemo(
    () => targetDate || format(new Date(), 'yyyy-MM-dd'),
    [targetDate]
  );
  const baseline = useMemo(
    () => getBaselinePhoto(userData?.notes),
    [userData?.notes]
  );
  const todayEntry = useMemo(
    () => readEntry(userData?.notes, today),
    [userData?.notes, today]
  );

  const guidanceKey = useMemo(() => {
    const photos = listPhotoEntries(userData?.notes);
    const priors = photos.filter(p => p.dayStr !== today);
    return priors.length > 0 ? priors[priors.length - 1].photoKey : null;
  }, [userData?.notes, today]);

  // Day number for the shot — the user's JOURNEY day, matching the big
  // counter everywhere else in the app (not days since the first photo).
  // currentStreak is the app's source of truth "for consistency across
  // all tabs", so we use it for today's shot. A back-dated retake
  // (targetDate) derives that specific day's number from startDate.
  const dayCount = useMemo(() => {
    if (targetDate && userData?.startDate) {
      try {
        const d = differenceInCalendarDays(parseISO(targetDate), parseISO(userData.startDate)) + 1;
        if (Number.isFinite(d) && d >= 1) return d;
      } catch (_) { /* fall through to stored streak */ }
    }
    const streak = Number(userData?.currentStreak);
    if (Number.isFinite(streak) && streak >= 1) return streak;
    if (userData?.startDate) {
      try {
        const d = differenceInCalendarDays(parseISO(today), parseISO(userData.startDate)) + 1;
        if (Number.isFinite(d) && d >= 1) return d;
      } catch (_) { /* fall through */ }
    }
    return 1;
  }, [targetDate, today, userData?.currentStreak, userData?.startDate]);

  // Zero-pad to 3 ("014") for the odometer feel; switch to grouped
  // thousands ("2,000" / "10,000") past 999 so the chip never overflows
  // and the shutter stays centered in the deck grid.
  const dayLabel = useMemo(() => {
    const n = Math.max(1, dayCount);
    return n >= 1000 ? n.toLocaleString('en-US') : String(n).padStart(3, '0');
  }, [dayCount]);

  const isFirstPhoto = !baseline;
  const isReplace = !!todayEntry.photoKey;

  // Reset on open
  useEffect(() => {
    if (open) {
      setPhase(PHASES.READY);
      setErrorMessage('');
      setCapturedBlob(null);
      setCapturedPreview(null);
      // Ghost overlay defaults OFF for a clean, crisp feed — a faint
      // double-exposure of your last shot over your face reads muddy.
      // Tap the deck thumbnail to ghost-on when you want to align to
      // your baseline angle. Never shows on the baseline shot anyway.
      setShowGhost(false);
      setLocked(false);
      setFlashing(false);
      settleStartTimeRef.current = 0;
      lockStartTimeRef.current = 0;
      autoCaptureScheduledRef.current = false;
      requestAnimationFrame(() => requestAnimationFrame(() => setSheetReady(true)));
    } else {
      setSheetReady(false);
    }
  }, [open]);

  // Resolve guidance photo URL for ghost overlay
  useEffect(() => {
    let cancelled = false;
    if (!open || !guidanceKey) { setGuidanceUrl(null); return; }
    getPresignedUrl(guidanceKey).then(url => {
      if (!cancelled) setGuidanceUrl(url);
    });
    return () => { cancelled = true; };
  }, [open, guidanceKey]);

  // Stop the camera tracks + face detection on close/unmount
  const stopStream = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  useEffect(() => {
    if (!open) stopStream();
    return () => stopStream();
  }, [open, stopStream]);

  const closeSheet = useCallback((cb) => {
    setSheetReady(false);
    setTimeout(() => {
      stopStream();
      if (cb) cb();
    }, 300);
  }, [stopStream]);

  useSheetSwipe(sheetPanelRef, open, () => closeSheet(() => onClose && onClose()));

  // Lazy-load the MediaPipe face detector. ~250KB WASM + ~190KB model
  // loaded from CDN on first camera open, cached thereafter. If load
  // fails for any reason we proceed without auto-lock — the manual
  // shutter still works, the oval just stays white.
  const initDetector = useCallback(async () => {
    if (detectorRef.current) return detectorRef.current;
    try {
      const { FilesetResolver, FaceDetector } = await import('@mediapipe/tasks-vision');
      const vision = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/wasm'
      );
      const detector = await FaceDetector.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite'
          // No `delegate: 'GPU'` — WebGL acceleration via MediaPipe is
          // unreliable on iOS Safari. CPU is the safer default and
          // still runs at 30fps on anything iPhone X or newer.
        },
        runningMode: 'VIDEO'
      });
      detectorRef.current = detector;
      return detector;
    } catch (err) {
      console.warn('Face detector init failed (manual capture still works):', err);
      return null;
    }
  }, []);

  // The detection RAF loop. Runs while phase === 'live'. Reads
  // frames from the video, computes whether a face is centered and
  // sized correctly, updates locked state, and schedules auto-capture
  // when continuous lock exceeds the threshold.
  const detectLoop = useCallback(() => {
    const video = videoRef.current;
    const detector = detectorRef.current;
    if (!video || !detector || video.readyState < 2) {
      rafRef.current = requestAnimationFrame(detectLoop);
      return;
    }

    let isGood = false;
    try {
      const result = detector.detectForVideo(video, performance.now());
      if (result?.detections?.length > 0) {
        // Pick the largest detection if multiple faces (closest user)
        let best = result.detections[0];
        let bestArea = best.boundingBox.width * best.boundingBox.height;
        for (let i = 1; i < result.detections.length; i++) {
          const det = result.detections[i];
          const area = det.boundingBox.width * det.boundingBox.height;
          if (area > bestArea) { best = det; bestArea = area; }
        }
        const box = best.boundingBox;
        const vw = video.videoWidth || 1;
        const vh = video.videoHeight || 1;
        const cx = (box.originX + box.width / 2) / vw;
        const cy = (box.originY + box.height / 2) / vh;
        const area = (box.width * box.height) / (vw * vh);
        const xOk = Math.abs(cx - LOCK_TARGET_X) < LOCK_TOL_X;
        const yOk = Math.abs(cy - LOCK_TARGET_Y) < LOCK_TOL_Y;
        const sizeOk = area >= LOCK_MIN_AREA && area <= LOCK_MAX_AREA;
        isGood = xOk && yOk && sizeOk;
      }
    } catch (err) {
      // Don't bring down the whole loop if a single frame fails
      // (rare WASM hiccup) — just keep going.
      console.warn('detectForVideo error:', err);
    }

    if (isGood) {
      const now = performance.now();
      // Start (or continue) the settle window. Lock only flips to
      // true after LOCK_SETTLE_MS of continuous good detection — this
      // kills the sage<->white flicker that happens when the face is
      // right on the geometry boundary.
      if (settleStartTimeRef.current === 0) {
        settleStartTimeRef.current = now;
      }
      if (lockStartTimeRef.current === 0
          && now - settleStartTimeRef.current >= LOCK_SETTLE_MS) {
        lockStartTimeRef.current = now;
        setLocked(true);
        if ('vibrate' in navigator && now - lastHapticRef.current > 800) {
          try { navigator.vibrate(15); } catch (_) {}
          lastHapticRef.current = now;
        }
      }
      // Auto-capture fires only after a full lock-stable window has
      // elapsed past the actual lock moment.
      if (lockStartTimeRef.current !== 0
          && !autoCaptureScheduledRef.current
          && now - lockStartTimeRef.current >= AUTO_CAPTURE_DELAY_MS) {
        autoCaptureScheduledRef.current = true;
        Promise.resolve().then(() => triggerCapture());
      }
    } else {
      if (settleStartTimeRef.current !== 0 || lockStartTimeRef.current !== 0) {
        settleStartTimeRef.current = 0;
        lockStartTimeRef.current = 0;
        autoCaptureScheduledRef.current = false;
        setLocked(false);
      }
    }

    rafRef.current = requestAnimationFrame(detectLoop);
  // triggerCapture is stable via the ref pattern below; eslint
  // disable is fine here.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Tap-to-start: getUserMedia + .play() + detector init + detection
  // loop all fire inside this single user-activation chain.
  const handleStartCamera = useCallback(async () => {
    if (phase === PHASES.STARTING || phase === PHASES.LIVE) return;
    setPhase(PHASES.STARTING);
    setErrorMessage('');

    if (!navigator.mediaDevices?.getUserMedia) {
      setPhase(PHASES.DENIED);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 1080 },
          height: { ideal: 1440 }
        },
        audio: false
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        try {
          await videoRef.current.play();
        } catch (playErr) {
          console.warn('First play() failed, retrying:', playErr);
          await new Promise(r => setTimeout(r, 80));
          try {
            await videoRef.current.play();
          } catch (retryErr) {
            console.warn('Video play failed:', retryErr);
            setErrorMessage('Could not start the preview. Try again or use your device camera.');
            stream.getTracks().forEach(t => t.stop());
            streamRef.current = null;
            setPhase(PHASES.ERROR);
            return;
          }
        }
      }
      setPhase(PHASES.LIVE);
      // Kick off face detector init in parallel with the live
      // preview going up. Once it resolves, start the loop.
      initDetector().then((detector) => {
        if (detector && streamRef.current) {
          rafRef.current = requestAnimationFrame(detectLoop);
        }
      });
    } catch (err) {
      console.warn('Camera open failed:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setPhase(PHASES.DENIED);
      } else {
        setErrorMessage(err.message || 'Could not start the camera.');
        setPhase(PHASES.ERROR);
      }
    }
  }, [phase, initDetector, detectLoop]);

  // Capture core — used by both manual shutter tap and auto-capture.
  // Mirrors the canvas so the saved JPEG matches the mirrored preview.
  const triggerCapture = useCallback(() => {
    const video = videoRef.current;
    if (!video || video.readyState < 2) return;
    const w = video.videoWidth;
    const h = video.videoHeight;
    if (!w || !h) return;

    // White flash for the shutter-feel feedback. Removed when phase
    // moves to review below.
    setFlashing(true);
    setTimeout(() => setFlashing(false), 220);

    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.translate(w, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, w, h);

    canvas.toBlob((blob) => {
      if (!blob) {
        toast.error('Could not capture the frame');
        return;
      }
      const url = URL.createObjectURL(blob);
      setCapturedBlob(blob);
      setCapturedPreview(url);
      setPhase(PHASES.REVIEW);
      // Stop the detection loop — review screen doesn't need it.
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      settleStartTimeRef.current = 0;
      lockStartTimeRef.current = 0;
      autoCaptureScheduledRef.current = false;
      setLocked(false);
    }, 'image/jpeg', 0.92);
  }, []);

  const handleRetake = useCallback(() => {
    if (capturedPreview) URL.revokeObjectURL(capturedPreview);
    setCapturedBlob(null);
    setCapturedPreview(null);
    setLocked(false);
    settleStartTimeRef.current = 0;
    lockStartTimeRef.current = 0;
    autoCaptureScheduledRef.current = false;
    setPhase(PHASES.LIVE);
    // Restart the detection loop for the retake
    if (detectorRef.current && !rafRef.current) {
      rafRef.current = requestAnimationFrame(detectLoop);
    }
  }, [capturedPreview, detectLoop]);

  const handleConfirm = useCallback(async () => {
    if (!capturedBlob) return;
    setPhase(PHASES.UPLOADING);
    try {
      const token = localStorage.getItem('token');
      const form = new FormData();
      const file = new File(
        [capturedBlob],
        `titantrack-${today}.jpg`,
        { type: 'image/jpeg' }
      );
      form.append('photo', file);

      const res = await fetch(`${API_URL}/api/photos/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: form
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Upload failed (${res.status})`);
      }
      const { key } = await res.json();

      const nextNotes = writeEntry(userData?.notes || {}, today, {
        photoKey: key,
        capturedAt: new Date().toISOString()
      });
      const success = await updateUserData({ notes: nextNotes });
      if (!success && success !== undefined) {
        throw new Error('Could not save photo to your journal');
      }

      toast.success('Photo saved.');
      await getPresignedUrl(key);

      const replacedOld = !!todayEntry.photoKey;
      if (capturedPreview) URL.revokeObjectURL(capturedPreview);
      closeSheet(() => {
        if (onSaved) onSaved({ key, dayStr: today, replacedOld });
        if (onClose) onClose();
      });
    } catch (err) {
      console.warn('Photo upload failed:', err);
      toast.error(err.message || 'Could not save the photo');
      setPhase(PHASES.REVIEW);
    }
  }, [capturedBlob, capturedPreview, today, userData?.notes, todayEntry.photoKey, updateUserData, onSaved, onClose, closeSheet]);

  // Native-camera fallback (permission denied or detector unavailable)
  const handleFallbackFile = useCallback(async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setPhase(PHASES.UPLOADING);
    try {
      const token = localStorage.getItem('token');
      const form = new FormData();
      form.append('photo', file);
      const res = await fetch(`${API_URL}/api/photos/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: form
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Upload failed (${res.status})`);
      }
      const { key } = await res.json();
      const nextNotes = writeEntry(userData?.notes || {}, today, {
        photoKey: key,
        capturedAt: new Date().toISOString()
      });
      await updateUserData({ notes: nextNotes });
      toast.success('Photo saved.');
      await getPresignedUrl(key);
      const replacedOld = !!todayEntry.photoKey;
      closeSheet(() => {
        if (onSaved) onSaved({ key, dayStr: today, replacedOld });
        if (onClose) onClose();
      });
    } catch (err) {
      console.warn('Fallback upload failed:', err);
      toast.error(err.message || 'Could not save the photo');
      setPhase(PHASES.DENIED);
    }
  }, [today, userData?.notes, todayEntry.photoKey, updateUserData, onSaved, onClose, closeSheet]);

  if (!open) return null;

  const headline = isFirstPhoto
    ? 'YOUR BASELINE'
    : isReplace
      ? 'RETAKE TODAY'
      : 'TODAY’S SHOT';

  // Instruction text adapts to lock state during live phase
  const liveInstruction = locked ? 'Hold still' : 'Center your face inside the oval';

  return ReactDOM.createPortal(
    <div
      className={`sheet-backdrop${sheetReady ? ' open' : ''}`}
      onClick={() => closeSheet(() => onClose && onClose())}
    >
      <div
        ref={sheetPanelRef}
        className={`sheet-panel photo-capture-sheet${sheetReady ? ' open' : ''}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Full-bleed camera feed — backs the entire sheet; the glass
            deck below is translucent so the feed frosts through it. */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          disablePictureInPicture
          disableRemotePlayback
          className={`capture-video${phase === PHASES.LIVE ? ' is-active' : ''}`}
        />

        {/* Ghost of the prior shot — default-on so you align to your
            last angle. Renders only when a guidance photo exists, so it
            never appears on the baseline shot. */}
        {phase === PHASES.LIVE && guidanceUrl && showGhost && (
          <img
            className="capture-ghost"
            src={guidanceUrl}
            alt=""
            aria-hidden="true"
          />
        )}

        {/* Captured still during review — fills the sheet behind the
            glass deck's Retake / Use-photo actions. */}
        {phase === PHASES.REVIEW && capturedPreview && (
          <img
            className="capture-review-img"
            src={capturedPreview}
            alt="Captured frame"
          />
        )}

        {/* Legibility scrim under the floating top chrome. */}
        <div className="capture-scrim" aria-hidden="true" />

        {/* Swipe-to-dismiss handle + floating title. NOT data-no-swipe,
            so a downward drag here still closes the sheet (the camera
            stage and deck below opt out so framing taps don't dismiss). */}
        <div className="capture-handle">
          <span className="capture-grip" aria-hidden="true" />
          <span className="capture-title oracle-pulse-label">{headline}</span>
          {!isFirstPhoto && phase === PHASES.READY && (
            <span className="capture-subtitle">Align to your baseline</span>
          )}
        </div>

        {/* CAMERA STAGE — full-bleed feed area; chrome floats on top. */}
        <div className="capture-stage" data-no-swipe>
          {/* Face guide — oval + one hairline eye-line you match daily.
              Both go sage on lock. (Corner brackets removed: the oval
              already frames the face; brackets just added HUD noise.) */}
          {(phase === PHASES.READY || phase === PHASES.LIVE) && (
            <svg
              className={`capture-guide${locked ? ' is-locked' : ''}`}
              viewBox="0 0 300 400"
              preserveAspectRatio="xMidYMid meet"
              aria-hidden="true"
            >
              <ellipse cx="150" cy="180" rx="92" ry="120" />
              <line className="capture-eyeline" x1="92" y1="150" x2="208" y2="150" />
            </svg>
          )}

          {phase === PHASES.LIVE && (
            <div className={`capture-instruction${locked ? ' is-locked' : ''}`}>
              <span className="capture-instruction-label">
                {liveInstruction}
              </span>
            </div>
          )}

          {phase === PHASES.STARTING && (
            <div className="capture-status">
              <span className="capture-status-label">Starting camera…</span>
            </div>
          )}

          {phase === PHASES.DENIED && (
            <div className="capture-status capture-status-denied">
              <span className="capture-status-eyebrow">Camera blocked</span>
              <p className="capture-status-message">
                Allow camera access in Safari to use the in-app
                capture. Or use your device camera below.
              </p>
            </div>
          )}

          {phase === PHASES.ERROR && (
            <div className="capture-status capture-status-denied">
              <span className="capture-status-eyebrow">Camera unavailable</span>
              <p className="capture-status-message">
                {errorMessage || 'Could not start the camera on this device.'}
              </p>
            </div>
          )}

          {phase === PHASES.UPLOADING && (
            <div className="capture-status capture-status-uploading">
              <span className="capture-status-label">Saving…</span>
            </div>
          )}
        </div>

        {/* FROSTED GLASS DECK — the sheet's own material; controls live
            here on top of the feed frosting through from above. */}
        <div className="capture-deck" data-no-swipe>
          {/* Auto-capture countdown rides the camera→glass seam. When
              .is-locked is on, the sage fill animates left-to-right over
              AUTO_CAPTURE_DELAY_MS. key={locked} re-mounts the fill on
              each lock so the CSS animation restarts cleanly from 0.
              transform: scaleX is bulletproof on iOS Safari. */}
          {phase === PHASES.LIVE && (
            <div className={`capture-progress${locked ? ' is-locked' : ''}`}>
              <div
                className="capture-progress-fill"
                key={locked ? 'locked' : 'unlocked'}
              />
            </div>
          )}

          {/* Live controls — 3-zone grid (day-count · shutter · last
              shot). Shutter is the fixed center column so it stays
              optically centered no matter how wide the count grows. */}
          {phase === PHASES.LIVE && (
            <div className="capture-deck-row">
              <div className="capture-daycount">
                <span className="capture-daycount-k">Day</span>
                <span className="capture-daycount-v">{dayLabel}</span>
              </div>

              <button
                type="button"
                className={`capture-shutter${locked ? ' is-locked' : ''}`}
                onClick={triggerCapture}
                aria-label="Capture photo"
              >
                <span className="capture-shutter-inner" />
              </button>

              {guidanceUrl ? (
                <button
                  type="button"
                  className={`capture-thumb${showGhost ? ' is-on' : ''}`}
                  onClick={() => setShowGhost(s => !s)}
                  aria-pressed={showGhost}
                  aria-label={showGhost ? 'Hide last shot' : 'Show last shot'}
                >
                  <img src={guidanceUrl} alt="" aria-hidden="true" />
                </button>
              ) : (
                <span className="capture-thumb-spacer" aria-hidden="true" />
              )}
            </div>
          )}

          {phase === PHASES.READY && (
            <div className="capture-deck-ready">
              <span className="capture-ready-sub-label">
                {isFirstPhoto
                  ? 'Your first shot becomes the baseline every future photo lines up against.'
                  : 'Same angle as your last shot. Quick and consistent.'}
              </span>
              <button
                type="button"
                className="capture-start-btn"
                onClick={handleStartCamera}
              >
                Tap to start camera
              </button>
            </div>
          )}

          {phase === PHASES.REVIEW && (
            <div className="photo-capture-actions">
              <button
                type="button"
                className="btn-ghost"
                onClick={handleRetake}
              >
                Retake
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={handleConfirm}
              >
                {isFirstPhoto ? 'Set baseline' : isReplace ? 'Replace' : 'Use photo'}
              </button>
            </div>
          )}

          {(phase === PHASES.DENIED || phase === PHASES.ERROR) && (
            <div className="photo-capture-actions">
              <button
                type="button"
                className="btn-ghost"
                onClick={() => closeSheet(() => onClose && onClose())}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={() => fileInputRef.current?.click()}
              >
                Use device camera
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="user"
                style={{ display: 'none' }}
                onChange={handleFallbackFile}
              />
            </div>
          )}
        </div>

        {/* White flash on capture — full-sheet, above all chrome. */}
        {flashing && <div className="capture-flash" aria-hidden="true" />}
      </div>
    </div>,
    document.body
  );
};

export default PhotoCaptureSheet;
