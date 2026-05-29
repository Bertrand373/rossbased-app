// src/components/Photo/PhotoCaptureSheet.js
//
// Custom in-app camera flow for daily photo capture. A v1 of this
// shipped with two iOS Safari bugs and was reverted (#113):
//   1. `<video>` srcObject was attached inside an async useEffect,
//      out of the user-activation window — iOS refused to play().
//   2. `autoPlay` alone is insufficient on iOS when a stream is
//      attached after mount; an explicit `.play()` is required.
// Net result: camera permission was granted (Dynamic Island lit up
// the orange "camera in use" indicator) but the preview stayed
// black because the video element never started playback.
//
// This v2 fixes both:
//   1. Camera doesn't start on sheet open. The sheet shows a "Tap
//      to start camera" pill inside the viewport instead. The user's
//      tap on that pill is what calls getUserMedia, preserving the
//      Safari user-activation window for the same gesture.
//   2. We `await videoRef.current.play()` immediately after setting
//      srcObject. The promise is properly caught so we surface
//      failures rather than silently leaving a black viewport.
//
// State machine (`phase`):
//   'ready'      → sheet open, camera not yet started, "Tap to start"
//   'starting'   → user tapped, getUserMedia in flight
//   'live'       → live preview + face oval + shutter
//   'review'     → captured snapshot + Retake / Use Photo
//   'uploading'  → posting to /api/photos/upload
//   'denied'     → permission denied → fallback to native input
//   'error'      → device-level failure → same fallback path
//
// Vocabulary stays TitanTrack — white face guide (NOT gold, gold is
// reserved for milestone moments), tracked-caps copy, iconic round
// white shutter as the only ornamental element.

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import ReactDOM from 'react-dom';
import toast from 'react-hot-toast';
import useSheetSwipe from '../../hooks/useSheetSwipe';
import { readEntry, writeEntry, getBaselinePhoto, listPhotoEntries } from '../../utils/dayJournal';
import { getPresignedUrl } from '../../utils/photoUrl';
import { format } from 'date-fns';
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

const PhotoCaptureSheet = ({ open, onClose, userData, updateUserData, onSaved, targetDate }) => {
  const [sheetReady, setSheetReady] = useState(false);
  const [phase, setPhase] = useState(PHASES.READY);
  const [errorMessage, setErrorMessage] = useState('');
  const [capturedBlob, setCapturedBlob] = useState(null);
  const [capturedPreview, setCapturedPreview] = useState(null);
  const [guidanceUrl, setGuidanceUrl] = useState(null);
  const [showGhost, setShowGhost] = useState(false);

  const sheetPanelRef = useRef(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const fileInputRef = useRef(null);

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

  // Guidance photo — used as the optional ghost overlay for angle
  // matching. NOT today's photo (so we don't tell the user to "match"
  // what they're about to retake).
  const guidanceKey = useMemo(() => {
    const photos = listPhotoEntries(userData?.notes);
    const priors = photos.filter(p => p.dayStr !== today);
    return priors.length > 0 ? priors[priors.length - 1].photoKey : null;
  }, [userData?.notes, today]);

  const isFirstPhoto = !baseline;
  const isReplace = !!todayEntry.photoKey;

  // Open animation + reset state
  useEffect(() => {
    if (open) {
      setPhase(PHASES.READY);
      setErrorMessage('');
      setCapturedBlob(null);
      setCapturedPreview(null);
      setShowGhost(false);
      requestAnimationFrame(() => requestAnimationFrame(() => setSheetReady(true)));
    } else {
      setSheetReady(false);
    }
  }, [open]);

  // Resolve a presigned URL for the ghost-overlay guidance photo.
  useEffect(() => {
    let cancelled = false;
    if (!open || !guidanceKey) { setGuidanceUrl(null); return; }
    getPresignedUrl(guidanceKey).then(url => {
      if (!cancelled) setGuidanceUrl(url);
    });
    return () => { cancelled = true; };
  }, [open, guidanceKey]);

  // Stop the camera tracks whenever the sheet closes or unmounts.
  // Critical: without this, the camera light stays on after dismiss.
  const stopStream = useCallback(() => {
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

  // The KEY fix vs v1: getUserMedia + play() fire inside this tap
  // handler, NOT in a useEffect. Safari treats this whole chain as
  // one user-activation context, so play() is allowed and the
  // preview actually starts.
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
        // CRITICAL on iOS: autoPlay alone won't start a stream that's
        // attached after mount. Must call play() explicitly, and we
        // must do it inside the same user-activation chain as the
        // getUserMedia tap.
        try {
          await videoRef.current.play();
        } catch (playErr) {
          // Some Safari versions reject the first .play() then accept
          // a retry one tick later. Try once more before giving up.
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
    } catch (err) {
      console.warn('Camera open failed:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setPhase(PHASES.DENIED);
      } else {
        setErrorMessage(err.message || 'Could not start the camera.');
        setPhase(PHASES.ERROR);
      }
    }
  }, [phase]);

  // Snapshot the current video frame to a JPEG blob. Mirrored
  // horizontally so the saved image matches the preview the user saw.
  const handleCapture = useCallback(() => {
    const video = videoRef.current;
    if (!video || video.readyState < 2) return;
    const w = video.videoWidth;
    const h = video.videoHeight;
    if (!w || !h) return;

    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    // Mirror so the saved frame matches the preview the user saw.
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
    }, 'image/jpeg', 0.92);
  }, []);

  const handleRetake = useCallback(() => {
    if (capturedPreview) URL.revokeObjectURL(capturedPreview);
    setCapturedBlob(null);
    setCapturedPreview(null);
    setPhase(PHASES.LIVE);
  }, [capturedPreview]);

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

  // Permission-denied / error fallback — uses the original native
  // camera input. Same upload path as the in-app capture.
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
        <div className="sheet-header" />

        <div className="photo-capture-headline">
          <span className="oracle-pulse-label">{headline}</span>
        </div>

        <div className="photo-capture-body" data-no-swipe>
          {/* 3:4 portrait viewport — every phase renders inside this
              container so the surrounding sheet never jumps in size. */}
          <div className="capture-viewport">
            {/* Video stays mounted across phases so the ref is stable
                and we don't tear down/rebuild the element. The iOS-
                critical attributes are all present:
                  playsInline       → don't go fullscreen
                  muted             → required for autoplay
                  autoPlay          → background hint (we still call
                                      .play() explicitly)
                  disablePictureInPicture → no PiP native chrome
                  disableRemotePlayback   → no AirPlay native chrome */}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              disablePictureInPicture
              disableRemotePlayback
              className={`capture-video${phase === PHASES.LIVE ? ' is-active' : ''}`}
            />

            {/* Ghost overlay — previous photo at very low opacity,
                gated behind the user-opt-in chip. Only shown in live. */}
            {phase === PHASES.LIVE && guidanceUrl && showGhost && (
              <img
                className="capture-ghost"
                src={guidanceUrl}
                alt=""
                aria-hidden="true"
              />
            )}

            {/* Face guide oval — restrained white, shown in ready and
                live phases. In ready, it serves as a visual placeholder
                so the user sees where their face will go before they
                opt in to start the camera. */}
            {(phase === PHASES.READY || phase === PHASES.LIVE) && (
              <svg
                className="capture-guide"
                viewBox="0 0 300 400"
                preserveAspectRatio="xMidYMid meet"
                aria-hidden="true"
              >
                <ellipse cx="150" cy="180" rx="92" ry="120" />
              </svg>
            )}

            {/* Ready state — viewport sits dark behind the guide,
                "Tap to start camera" pill centered. Critical: the
                tap on THIS button is what fires getUserMedia, so
                Safari sees a fresh user activation. */}
            {phase === PHASES.READY && (
              <div className="capture-ready">
                <button
                  type="button"
                  className="capture-start-btn"
                  onClick={handleStartCamera}
                >
                  Tap to start camera
                </button>
              </div>
            )}

            {/* Starting state — brief overlay while permission is
                being requested and the stream is warming up. */}
            {phase === PHASES.STARTING && (
              <div className="capture-status">
                <span className="capture-status-label">Starting camera…</span>
              </div>
            )}

            {/* Live-state instruction chip */}
            {phase === PHASES.LIVE && (
              <div className="capture-instruction">
                <span className="capture-instruction-label">
                  Center your face inside the oval
                </span>
              </div>
            )}

            {/* Ghost overlay toggle — discreet pill, top-left */}
            {phase === PHASES.LIVE && guidanceUrl && (
              <button
                type="button"
                className={`capture-ghost-toggle${showGhost ? ' is-on' : ''}`}
                onClick={() => setShowGhost(s => !s)}
              >
                {showGhost ? 'Hide guide' : 'Show last shot'}
              </button>
            )}

            {/* Review snapshot */}
            {phase === PHASES.REVIEW && capturedPreview && (
              <img
                className="capture-review-img"
                src={capturedPreview}
                alt="Captured frame"
              />
            )}

            {/* Permission-denied state */}
            {phase === PHASES.DENIED && (
              <div className="capture-status capture-status-denied">
                <span className="capture-status-eyebrow">Camera blocked</span>
                <p className="capture-status-message">
                  Allow camera access in Safari to use the in-app
                  capture. Or use your device camera below.
                </p>
              </div>
            )}

            {/* Error state */}
            {phase === PHASES.ERROR && (
              <div className="capture-status capture-status-denied">
                <span className="capture-status-eyebrow">Camera unavailable</span>
                <p className="capture-status-message">
                  {errorMessage || 'Could not start the camera on this device.'}
                </p>
              </div>
            )}

            {/* Uploading overlay */}
            {phase === PHASES.UPLOADING && (
              <div className="capture-status capture-status-uploading">
                <span className="capture-status-label">Saving…</span>
              </div>
            )}
          </div>

          {/* Phase-specific bottom controls. */}
          {phase === PHASES.LIVE && (
            <div className="capture-controls">
              <button
                type="button"
                className="capture-shutter"
                onClick={handleCapture}
                aria-label="Capture photo"
              >
                <span className="capture-shutter-inner" />
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

          {phase === PHASES.READY && (
            <div className="capture-ready-sub">
              <span className="capture-ready-sub-label">
                {isFirstPhoto
                  ? 'Your first shot becomes the baseline every future photo lines up against.'
                  : 'Same angle as your last shot. Quick and consistent.'}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};

export default PhotoCaptureSheet;
