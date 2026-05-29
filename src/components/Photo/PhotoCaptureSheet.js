// src/components/Photo/PhotoCaptureSheet.js
//
// Custom in-app camera flow for daily photo capture. Replaces the
// earlier `<input type="file" capture>` handoff to the iOS native
// camera — that handoff dropped users into an unbranded white
// screen and gave us no way to guide framing. The new flow uses
// getUserMedia for a live preview, overlays a soft white face-oval
// guide, and optionally ghosts the user's previous photo behind the
// video so they can line up the exact same angle.
//
// State machine (the `phase` ref):
//   'requesting' → asking for camera permission (or warming up)
//   'live'       → showing the live preview + guide + capture button
//   'review'     → showing the captured snapshot with Retake/Use Photo
//   'uploading'  → posting to /api/photos/upload
//   'denied'     → permission denied; fall back to the native input
//   'error'      → device-level failure (no camera, in-use, etc.)
//
// Design vocabulary stays TitanTrack — white face guide (NOT gold,
// gold is for milestones), restrained typography in tracked caps,
// pill buttons, dark sheet background. The capture button is the
// only "iconic" element: a round white shutter, the universal
// camera vocabulary.

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
  REQUESTING: 'requesting',
  LIVE: 'live',
  REVIEW: 'review',
  UPLOADING: 'uploading',
  DENIED: 'denied',
  ERROR: 'error'
};

const PhotoCaptureSheet = ({ open, onClose, userData, updateUserData, onSaved, targetDate }) => {
  const [sheetReady, setSheetReady] = useState(false);
  const [phase, setPhase] = useState(PHASES.REQUESTING);
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

  // Guidance photo: the most recent prior photo, used as the ghost
  // overlay for angle-matching. NOT today's photo (so we don't tell
  // the user to "match" what they're about to retake).
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
      setPhase(PHASES.REQUESTING);
      setErrorMessage('');
      setCapturedBlob(null);
      setCapturedPreview(null);
      setShowGhost(false);
      requestAnimationFrame(() => requestAnimationFrame(() => setSheetReady(true)));
    } else {
      setSheetReady(false);
    }
  }, [open]);

  // Request camera + attach to <video>. The stream lifecycle is
  // tied to the sheet being open — tracks get stopped on close to
  // free the camera for other apps.
  useEffect(() => {
    if (!open) return undefined;
    if (phase !== PHASES.REQUESTING) return undefined;

    let cancelled = false;

    const start = async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        if (!cancelled) setPhase(PHASES.DENIED);
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
        if (cancelled) {
          stream.getTracks().forEach(t => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setPhase(PHASES.LIVE);
      } catch (err) {
        console.warn('Camera open failed:', err);
        if (cancelled) return;
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          setPhase(PHASES.DENIED);
        } else {
          setErrorMessage(err.message || 'Could not start the camera.');
          setPhase(PHASES.ERROR);
        }
      }
    };

    start();
    return () => { cancelled = true; };
  }, [open, phase]);

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

  // Snapshot the current video frame to a JPEG blob. Mirrored
  // horizontally so the saved image matches what the user sees on
  // screen (selfie cameras are normally rendered mirrored, but the
  // raw stream is un-mirrored — un-mirror means text in shot would
  // read backward).
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

  // Permission-denied fallback: native camera input. Still uses
  // FormData upload through the same API endpoint.
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
          {/* The live preview / review / fallback all share this 3:4
              portrait viewport so the surrounding sheet doesn't jump
              between phases. Each phase swaps its content inside. */}
          <div className="capture-viewport">
            {/* Video stays mounted across phases so the ref persists
                and the camera doesn't re-init mid-session. Visibility
                is toggled below. */}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`capture-video${phase === PHASES.LIVE ? ' is-active' : ''}`}
            />

            {/* Optional ghost overlay — previous photo at low opacity,
                gated behind a tap so it doesn't visually compete by
                default. Only shown in live phase. */}
            {phase === PHASES.LIVE && guidanceUrl && showGhost && (
              <img
                className="capture-ghost"
                src={guidanceUrl}
                alt=""
                aria-hidden="true"
              />
            )}

            {/* Face guide oval — white, restrained, only rendered in
                live phase. Centered slightly above middle to leave
                visual room for the capture button below. */}
            {phase === PHASES.LIVE && (
              <svg
                className="capture-guide"
                viewBox="0 0 300 400"
                preserveAspectRatio="xMidYMid meet"
                aria-hidden="true"
              >
                <ellipse cx="150" cy="180" rx="92" ry="120" />
              </svg>
            )}

            {/* Live-phase instruction */}
            {phase === PHASES.LIVE && (
              <div className="capture-instruction">
                <span className="capture-instruction-label">
                  Center your face inside the oval
                </span>
              </div>
            )}

            {/* Ghost toggle — small chip top-left, only shown when a
                guidance photo exists. White minimal pill. */}
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

            {/* Requesting / loading state */}
            {phase === PHASES.REQUESTING && (
              <div className="capture-status">
                <span className="capture-status-label">Preparing camera…</span>
              </div>
            )}

            {/* Permission-denied state */}
            {phase === PHASES.DENIED && (
              <div className="capture-status capture-status-denied">
                <span className="capture-status-eyebrow">Camera blocked</span>
                <p className="capture-status-message">
                  Allow camera access in your browser to use the in-app
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

            {/* Uploading overlay (during review-confirm-upload) */}
            {phase === PHASES.UPLOADING && (
              <div className="capture-status capture-status-uploading">
                <span className="capture-status-label">Saving…</span>
              </div>
            )}
          </div>

          {/* Below the viewport: phase-specific bottom controls.
              Keeps the viewport's vertical center clean. */}
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
        </div>
      </div>
    </div>,
    document.body
  );
};

export default PhotoCaptureSheet;
