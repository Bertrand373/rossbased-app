// src/components/Photo/PhotoCaptureSheet.js
//
// Capture flow for the daily photo. Shows the user's previous photo
// (if one exists for ANY prior day) as guidance — "match this angle" —
// then hands off to the device camera via <input type=file capture>.
// On mobile, this triggers the native camera fullscreen. On desktop,
// it opens a file picker.
//
// v1 ships without a live in-browser ghost-overlay camera; the
// previous-photo preview is the guidance vehicle. v2 can add a
// custom getUserMedia camera with a true ghost overlay if usage data
// shows people aren't matching framing well.
//
// On successful upload + save, fires onSaved(payload) so the caller can
// trigger downstream effects (e.g. milestone detection).

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

const PhotoCaptureSheet = ({ open, onClose, userData, updateUserData, onSaved, targetDate }) => {
  const [sheetReady, setSheetReady] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [guidanceUrl, setGuidanceUrl] = useState(null);
  const sheetPanelRef = useRef(null);
  const fileInputRef = useRef(null);

  const today = useMemo(() => targetDate || format(new Date(), 'yyyy-MM-dd'), [targetDate]);
  const baseline = useMemo(() => getBaselinePhoto(userData?.notes), [userData?.notes]);
  const todayEntry = useMemo(() => readEntry(userData?.notes, today), [userData?.notes, today]);

  // Guidance photo: the most recent prior photo (NOT today's, so the
  // user is told to "match" something they already have, not the same
  // photo they're about to retake).
  const guidanceKey = useMemo(() => {
    const photos = listPhotoEntries(userData?.notes);
    const priors = photos.filter(p => p.dayStr !== today);
    return priors.length > 0 ? priors[priors.length - 1].photoKey : null;
  }, [userData?.notes, today]);

  // Reset + animate on open
  useEffect(() => {
    if (open) {
      setUploading(false);
      requestAnimationFrame(() => requestAnimationFrame(() => setSheetReady(true)));
    } else {
      setSheetReady(false);
    }
  }, [open]);

  // Resolve a presigned URL for the guidance photo, if any.
  useEffect(() => {
    let cancelled = false;
    if (!open || !guidanceKey) { setGuidanceUrl(null); return; }
    getPresignedUrl(guidanceKey).then(url => {
      if (!cancelled) setGuidanceUrl(url);
    });
    return () => { cancelled = true; };
  }, [open, guidanceKey]);

  const closeSheet = useCallback((cb) => {
    setSheetReady(false);
    setTimeout(() => { if (cb) cb(); }, 300);
  }, []);

  useSheetSwipe(sheetPanelRef, open, () => closeSheet(() => onClose && onClose()));

  const handleOpenCamera = () => {
    if (uploading) return;
    fileInputRef.current?.click();
  };

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // reset so picking the same file twice still fires
    if (!file) return;
    if (uploading) return;

    setUploading(true);
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

      // Save into the journal entry for the target day.
      const nextNotes = writeEntry(userData?.notes || {}, today, {
        photoKey: key,
        capturedAt: new Date().toISOString()
      });
      const success = await updateUserData({ notes: nextNotes });
      if (!success && success !== undefined) {
        // updateUserData returned false (sync failed) — surface the error.
        throw new Error('Could not save photo to your journal');
      }

      toast.success('Photo saved.');
      // Pre-warm the presigned URL cache so the next render shows the photo.
      await getPresignedUrl(key);

      const replacedOld = !!todayEntry.photoKey;
      closeSheet(() => {
        if (onSaved) onSaved({ key, dayStr: today, replacedOld });
        if (onClose) onClose();
      });
    } catch (err) {
      console.warn('Photo upload failed:', err);
      toast.error(err.message || 'Could not save the photo');
      setUploading(false);
    }
  };

  if (!open) return null;

  const isFirstPhoto = !baseline;
  const isReplace = !!todayEntry.photoKey;

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
          <span className="oracle-pulse-label">
            {isFirstPhoto ? 'YOUR BASELINE' : isReplace ? 'RETAKE TODAY' : 'TODAY’S SHOT'}
          </span>
        </div>

        <div className="photo-capture-body" data-no-swipe>
          {isFirstPhoto ? (
            <p className="photo-capture-sub">
              This is your first photo. Stand in good light, framed how you'll want to see yourself in a year. Future shots will line up against this one.
            </p>
          ) : guidanceUrl ? (
            <>
              <p className="photo-capture-sub">Match this angle for a clean side-by-side.</p>
              <div className="photo-capture-guidance">
                <img src={guidanceUrl} alt="Previous shot for framing reference" />
                <span className="photo-capture-guidance-label">PREVIOUS</span>
              </div>
            </>
          ) : (
            <p className="photo-capture-sub">Same angle as your last shot. Quick and consistent.</p>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="user"
          style={{ display: 'none' }}
          onChange={handleFile}
        />

        <div className="photo-capture-actions">
          <button
            type="button"
            className="btn-ghost"
            onClick={() => closeSheet(() => onClose && onClose())}
            disabled={uploading}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={handleOpenCamera}
            disabled={uploading}
          >
            {uploading ? 'Saving…' : (isFirstPhoto ? 'Set baseline' : isReplace ? 'Retake' : 'Open camera')}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default PhotoCaptureSheet;
