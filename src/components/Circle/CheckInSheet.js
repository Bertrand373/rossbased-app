// src/components/Circle/CheckInSheet.js
//
// One-shot prompt that opens right after the user submits their daily
// Tracker log. Asks if they want to share a check-in with their Circle.
// Optional 140-char note. Skipping is a real, friction-free choice —
// silence is fine; the auto-generated benefit summary still lands if
// they later check in from the Circle sheet.
//
// Only renders when (a) user is in a circle, (b) they haven't reported
// today, and (c) their autoShareCheckIn pref is on. The caller is
// responsible for those checks before mounting this with open=true.

import React, { useState, useEffect, useRef, useCallback } from 'react';
import ReactDOM from 'react-dom';
import toast from 'react-hot-toast';
import useSheetSwipe from '../../hooks/useSheetSwipe';
import { useCircle } from '../../hooks/useCircle';
import '../../styles/BottomSheet.css';
import './Circle.css';

const NOTE_MAX = 140;

// Build a friendly "X, Y, and N others" phrase from the member list,
// excluding the viewer. Falls back gracefully for small circles.
function buildAudienceLabel(members = [], viewerUsername) {
  const others = members
    .filter(m => m.username !== viewerUsername)
    .map(m => m.displayName || m.username);
  if (others.length === 0) return 'You’re the only one in your circle so far';
  if (others.length === 1) return `${others[0]} will see this.`;
  if (others.length === 2) return `${others[0]} and ${others[1]} will see this.`;
  const visible = others.slice(0, 2).join(', ');
  return `${visible}, and ${others.length - 2} other${others.length - 2 === 1 ? '' : 's'} will see this.`;
}

const CheckInSheet = ({ open, onClose, viewerUsername, currentStreak }) => {
  const { circle, submitCheckIn } = useCircle();
  const [sheetReady, setSheetReady] = useState(false);
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const sheetPanelRef = useRef(null);

  useEffect(() => {
    if (open) {
      setNote('');
      setSubmitting(false);
      requestAnimationFrame(() => requestAnimationFrame(() => setSheetReady(true)));
    } else {
      setSheetReady(false);
    }
  }, [open]);

  const closeSheet = useCallback((cb) => {
    setSheetReady(false);
    setTimeout(() => { if (cb) cb(); }, 300);
  }, []);

  useSheetSwipe(sheetPanelRef, open, () => closeSheet(() => onClose && onClose()));

  if (!open || !circle) return null;

  const audienceLabel = buildAudienceLabel(circle.members, viewerUsername);

  const handleShare = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      await submitCheckIn({ note: note.trim(), streakDay: currentStreak || 0 });
      toast.success('Shared with your circle.');
      closeSheet(() => onClose && onClose());
    } catch (err) {
      toast.error(err.message || 'Could not share');
      setSubmitting(false);
    }
  };

  const handleSkip = () => {
    closeSheet(() => onClose && onClose());
  };

  return ReactDOM.createPortal(
    <div
      className={`sheet-backdrop${sheetReady ? ' open' : ''}`}
      onClick={() => closeSheet(() => onClose && onClose())}
    >
      <div
        ref={sheetPanelRef}
        className={`sheet-panel circle-checkin-sheet${sheetReady ? ' open' : ''}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sheet-header" />

        <div className="circle-sheet-headline">
          <span className="oracle-pulse-label">SHARE TODAY’S CHECK-IN</span>
        </div>

        <div className="circle-checkin-body" data-no-swipe>
          <p className="circle-checkin-audience">{audienceLabel}</p>

          <textarea
            className="circle-checkin-input"
            placeholder="How’s today landing? (optional)"
            value={note}
            maxLength={NOTE_MAX}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            autoFocus
          />
          <div className="circle-checkin-counter">{note.length}/{NOTE_MAX}</div>

          <p className="circle-checkin-note-hint">
            We’ll share your streak day and a short summary of today’s log either way. The note is the human touch.
          </p>
        </div>

        <div className="circle-checkin-actions">
          <button type="button" className="btn-ghost" onClick={handleSkip} disabled={submitting}>
            Skip
          </button>
          <button type="button" className="btn-primary" onClick={handleShare} disabled={submitting}>
            {submitting ? 'Sharing…' : 'Share'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default CheckInSheet;
