// src/components/Circle/CircleSheet.js
//
// The primary Circle surface. Bottom sheet showing every member of the
// user's circle, who's reported today, their note, and a CTA to share
// today's check-in. When the user has no circle yet, defers to
// CircleEmptySheet (create/join flow).
//
// Aesthetic notes (so the next person doesn't break them):
//   - Eyebrow label "CIRCLE ALIGNMENT" mirrors .oracle-pulse-label
//   - Member rows borrow from .recovery-notes-item visual family
//   - Buttons inherit .btn-primary / .btn-ghost from App.css
//   - Gold accents reserved for: reported indicator and the streak number.
//     Everything else uses the neutral text/border palette.

import React, { useState, useEffect, useRef, useCallback } from 'react';
import ReactDOM from 'react-dom';
import toast from 'react-hot-toast';
import useSheetSwipe from '../../hooks/useSheetSwipe';
import { useCircle } from '../../hooks/useCircle';
import { resolveAvatar } from '../../utils/avatar';
import CircleEmptySheet from './CircleEmptySheet';
import ConfirmSheet from '../Shared/ConfirmSheet';
import '../../styles/BottomSheet.css';
import './Circle.css';

const NOTE_MAX = 140;

const CircleSheet = ({ open, onClose, viewerUsername, currentStreak, isPremium, openPlanModal }) => {
  const { circle, submitCheckIn, removeCheckIn, leave, refresh } = useCircle();

  const [sheetReady, setSheetReady] = useState(false);
  const sheetPanelRef = useRef(null);

  // Local state for the inline check-in editor
  const [showCheckInEditor, setShowCheckInEditor] = useState(false);
  const [noteDraft, setNoteDraft] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showManage, setShowManage] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);

  // Capture "started in empty flow" at open time. Without this, the
  // moment a user finishes Create (which populates `circle` in context),
  // this component would flip from rendering CircleEmptySheet to the
  // full circle view — yanking the code-reveal screen out from under
  // them. We keep them in CircleEmptySheet for the full duration of
  // the open, regardless of when `circle` populates.
  const [startedEmpty, setStartedEmpty] = useState(false);

  useEffect(() => {
    if (open) {
      // Pull fresh data every time the sheet opens — members may have
      // checked in since the last render.
      refresh();
      // Snapshot empty-ness exactly once per open. The intentional miss
      // of `circle` in the dep array is what keeps the flow stable.
      setStartedEmpty(!circle);
      requestAnimationFrame(() => requestAnimationFrame(() => setSheetReady(true)));
    } else {
      setSheetReady(false);
      setShowCheckInEditor(false);
      setShowManage(false);
      setNoteDraft('');
      setStartedEmpty(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, refresh]);

  const closeSheet = useCallback((cb) => {
    setSheetReady(false);
    setTimeout(() => { if (cb) cb(); }, 300);
  }, []);

  useSheetSwipe(sheetPanelRef, open, () => closeSheet(() => onClose && onClose()));

  // ─── Empty / create-join flow ─────────────────────────────────
  // Stay in the empty-sheet for the entire lifecycle of this open if
  // the user started there — that lets the post-create "code reveal"
  // step render without being unmounted by the context refresh.
  if (open && (startedEmpty || !circle)) {
    return <CircleEmptySheet open={open} onClose={onClose} isPremium={isPremium} openPlanModal={openPlanModal} />;
  }

  if (!open || !circle) return null;

  const viewerMember = circle.members.find(m => m.username === viewerUsername);
  const viewerReported = !!viewerMember?.reported;
  const reportedCount = circle.members.filter(m => m.reported).length;

  // ─── Check-in actions ───────────────────────────────────────────
  const openEditor = () => {
    // Pre-fill the editor with whatever the user already wrote today
    // (lets "edit" feel like editing, not retyping from blank).
    setNoteDraft(viewerMember?.note || '');
    setShowCheckInEditor(true);
  };

  const handleSubmitCheckIn = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      await submitCheckIn({ note: noteDraft.trim(), streakDay: currentStreak || 0 });
      setShowCheckInEditor(false);
      toast.success('Shared with your circle.');
    } catch (err) {
      toast.error(err.message || 'Could not share check-in');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemoveCheckIn = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      await removeCheckIn();
      setShowCheckInEditor(false);
      toast.success('Check-in removed.');
    } catch (err) {
      toast.error(err.message || 'Could not remove check-in');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(circle.code);
      toast.success(`Code ${circle.code} copied.`);
    } catch {
      toast.error('Could not copy code');
    }
  };

  const handleShareInvite = async () => {
    const shareText = `Join my Circle on TitanTrack — code ${circle.code}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: 'TitanTrack Circle', text: shareText });
        return;
      } catch { /* user cancelled or unsupported */ }
    }
    await handleCopyCode();
  };

  // Show the branded confirmation sheet instead of native window.confirm.
  const requestLeave = () => {
    if (submitting) return;
    setShowLeaveConfirm(true);
  };

  const handleLeave = async () => {
    setShowLeaveConfirm(false);
    if (submitting) return;
    setSubmitting(true);
    try {
      await leave();
      toast.success('You left the circle.');
      closeSheet(() => onClose && onClose());
    } catch (err) {
      toast.error(err.message || 'Could not leave');
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Portal ─────────────────────────────────────────────────────
  // Leave confirmation rendered as a sibling portal so it sits above
  // the main CircleSheet panel cleanly.
  const leaveConfirm = (
    <ConfirmSheet
      open={showLeaveConfirm}
      title="Leave this circle?"
      message={circle ? `You can join another anytime — but "${circle.name}" continues without you.` : 'You can join another anytime.'}
      confirmLabel="Leave"
      cancelLabel="Stay"
      tone="danger"
      onConfirm={handleLeave}
      onCancel={() => setShowLeaveConfirm(false)}
    />
  );

  return ReactDOM.createPortal(
    <div
      className={`sheet-backdrop${sheetReady ? ' open' : ''}`}
      onClick={() => closeSheet(() => onClose && onClose())}
    >
      <div
        ref={sheetPanelRef}
        className={`sheet-panel circle-sheet${sheetReady ? ' open' : ''}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sheet-header" />

        {/* Desktop-only X — mobile dismisses via swipe-down + backdrop. The
            shared .sheet-close-desktop class in BottomSheet.css handles the
            mobile hide and hover treatment. */}
        <button
          type="button"
          className="sheet-close-desktop"
          onClick={() => closeSheet(() => onClose && onClose())}
          aria-label="Close"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        <div className="circle-sheet-headline">
          <span className="oracle-pulse-label">CIRCLE ALIGNMENT</span>
          <div className="circle-sheet-title-row">
            <span className="circle-sheet-name">{circle.name}</span>
            <span className="circle-sheet-meta">{reportedCount} of {circle.members.length} reported</span>
          </div>
        </div>

        <div className="circle-sheet-scroll" data-no-swipe>
          <ul className="circle-member-list">
            {circle.members.map(m => {
              const isYou = m.username === viewerUsername;
              const avatar = resolveAvatar(m, { size: 96 });
              return (
                <li key={m.username} className={`circle-member-row${m.reported ? ' reported' : ''}${isYou ? ' is-you' : ''}`}>
                  <span className="circle-member-avatar">
                    {avatar.kind === 'image'
                      ? <img src={avatar.src} alt="" />
                      : <span className="circle-member-initial">{avatar.initial}</span>}
                  </span>
                  <div className="circle-member-body">
                    <div className="circle-member-headline">
                      <span className="circle-member-name">
                        {avatar.displayName || m.username}
                        {isYou && <span className="circle-member-you">  (you)</span>}
                      </span>
                      <span className="circle-member-status" aria-label={m.reported ? 'reported' : 'unreported'}>
                        {m.reported ? '✓' : '◯'}
                      </span>
                    </div>
                    <div className="circle-member-sub">
                      {m.currentStreak > 0 ? `Day ${m.currentStreak}` : '—'}
                    </div>
                    {m.reported ? (
                      <div className="circle-member-note">
                        {m.note ? `“${m.note}”` : (m.benefitSummary || 'Logged today.')}
                      </div>
                    ) : (
                      <div className="circle-member-note circle-member-note-quiet">Unreported</div>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>

        {/* ─── Check-in editor (inline) ──────────────────────────── */}
        {showCheckInEditor ? (
          <div className="circle-checkin-editor">
            <textarea
              className="circle-checkin-input"
              placeholder="How's today landing? (optional)"
              value={noteDraft}
              maxLength={NOTE_MAX}
              onChange={(e) => setNoteDraft(e.target.value)}
              rows={2}
              autoFocus
            />
            <div className="circle-checkin-counter">{noteDraft.length}/{NOTE_MAX}</div>
            <div className="circle-checkin-actions">
              <button
                type="button"
                className="btn-ghost"
                onClick={() => setShowCheckInEditor(false)}
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={handleSubmitCheckIn}
                disabled={submitting}
              >
                {viewerReported ? 'Update' : 'Share'}
              </button>
            </div>
            {viewerReported && (
              <button
                type="button"
                className="circle-checkin-remove"
                onClick={handleRemoveCheckIn}
                disabled={submitting}
              >
                Remove today's check-in
              </button>
            )}
          </div>
        ) : (
          <button
            type="button"
            className={`circle-primary-cta${viewerReported ? ' reported' : ''}`}
            onClick={openEditor}
          >
            {viewerReported ? '✓ Reported today — edit' : 'Share today’s check-in'}
          </button>
        )}

        {/* ─── Manage panel (collapsed by default) ───────────────── */}
        <div className="circle-manage">
          {showManage ? (
            <div className="circle-manage-panel">
              <div className="circle-manage-invite">
                <span className="circle-manage-label">Invite code</span>
                <div className="circle-manage-code-row">
                  <code className="circle-manage-code">{circle.code}</code>
                  <button type="button" className="circle-manage-mini" onClick={handleCopyCode}>Copy</button>
                  <button type="button" className="circle-manage-mini" onClick={handleShareInvite}>Share</button>
                </div>
                {circle.memberCount >= circle.maxSize ? (
                  <p className="circle-manage-hint">Your circle is full ({circle.maxSize}/{circle.maxSize}).</p>
                ) : (
                  <p className="circle-manage-hint">Up to {circle.maxSize - circle.memberCount} more can join.</p>
                )}
              </div>
              <button type="button" className="circle-manage-leave" onClick={requestLeave} disabled={submitting}>
                Leave circle
              </button>
              <button type="button" className="circle-manage-close" onClick={() => setShowManage(false)}>
                Hide
              </button>
            </div>
          ) : (
            <button type="button" className="circle-manage-toggle" onClick={() => setShowManage(true)}>
              Manage circle
            </button>
          )}
        </div>
      </div>
      {leaveConfirm}
    </div>,
    document.body
  );
};

export default CircleSheet;
