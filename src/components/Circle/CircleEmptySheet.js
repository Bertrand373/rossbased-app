// src/components/Circle/CircleEmptySheet.js
//
// Shown when the user taps the header CircleStack but isn't in a Circle
// yet. Two paths: create a new one (name → server returns code → share)
// OR join via 6-char code.
//
// Same sheet aesthetic as everywhere else. The two modes (idle / create /
// join / created) live in one component because they share the same
// container, and switching feels like a state transition rather than a
// new screen.

import React, { useState, useEffect, useRef, useCallback } from 'react';
import ReactDOM from 'react-dom';
import toast from 'react-hot-toast';
import useSheetSwipe from '../../hooks/useSheetSwipe';
import { useCircle } from '../../hooks/useCircle';
import '../../styles/BottomSheet.css';
import './Circle.css';

const NAME_MAX = 40;
const CODE_LENGTH = 6;

const CircleEmptySheet = ({ open, onClose, isPremium, openPlanModal }) => {
  const { createCircle, joinByCode } = useCircle();
  const [sheetReady, setSheetReady] = useState(false);
  const sheetPanelRef = useRef(null);

  // 'idle' (showing two options), 'create', 'join', 'created'
  const [mode, setMode] = useState('idle');
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [createdCode, setCreatedCode] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setMode('idle');
      setName('');
      setCode('');
      setCreatedCode('');
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

  const handleCreate = async () => {
    if (submitting) return;
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error('Give your circle a name');
      return;
    }
    setSubmitting(true);
    try {
      const data = await createCircle(trimmed);
      const newCode = data?.circle?.code || '';
      setCreatedCode(newCode);
      setMode('created');
    } catch (err) {
      toast.error(err.message || 'Could not create circle');
    } finally {
      setSubmitting(false);
    }
  };

  const handleJoin = async () => {
    if (submitting) return;
    const trimmed = code.trim().toUpperCase();
    if (trimmed.length !== CODE_LENGTH) {
      toast.error(`Code must be ${CODE_LENGTH} characters`);
      return;
    }
    setSubmitting(true);
    try {
      await joinByCode(trimmed);
      toast.success('You joined the circle.');
      closeSheet(() => onClose && onClose());
    } catch (err) {
      toast.error(err.message || 'Could not join');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopyCode = async () => {
    if (!createdCode) return;
    try {
      await navigator.clipboard.writeText(createdCode);
      toast.success('Code copied.');
    } catch {
      toast.error('Could not copy');
    }
  };

  const handleShareCode = async () => {
    if (!createdCode) return;
    const text = `Join my Circle on TitanTrack — code ${createdCode}`;
    if (navigator.share) {
      try { await navigator.share({ title: 'TitanTrack Circle', text }); return; }
      catch { /* user cancelled */ }
    }
    await handleCopyCode();
  };

  if (!open) return null;

  return ReactDOM.createPortal(
    <div
      className={`sheet-backdrop${sheetReady ? ' open' : ''}`}
      onClick={() => closeSheet(() => onClose && onClose())}
    >
      <div
        ref={sheetPanelRef}
        className={`sheet-panel circle-empty-sheet${sheetReady ? ' open' : ''}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sheet-header" />

        <div className="circle-sheet-headline">
          <span className="oracle-pulse-label">CIRCLE ALIGNMENT</span>
        </div>

        {mode === 'idle' && (
          <div className="circle-empty-body">
            <h2 className="circle-empty-title">Climb with up to four brothers.</h2>
            <p className="circle-empty-sub">
              Private. Three to five people you invite. Daily check-ins visible only inside the circle.
            </p>
            <div className="circle-empty-actions">
              <button
                className="btn-primary"
                type="button"
                onClick={() => isPremium
                  ? setMode('create')
                  : closeSheet(() => { onClose && onClose(); openPlanModal && openPlanModal(); })}
              >
                Create a Circle
              </button>
              <button className="btn-ghost" type="button" onClick={() => setMode('join')}>
                I have a code
              </button>
            </div>
          </div>
        )}

        {mode === 'create' && (
          <div className="circle-empty-body">
            <h2 className="circle-empty-title">Name your circle.</h2>
            <p className="circle-empty-sub">
              Members will see this. Keep it short — call it what it is.
            </p>
            <input
              className="circle-empty-input"
              placeholder="The Vanguard, Morning Climb, etc."
              value={name}
              maxLength={NAME_MAX}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
            <div className="circle-empty-counter">{name.length}/{NAME_MAX}</div>
            <div className="circle-empty-actions">
              <button className="btn-ghost" type="button" onClick={() => setMode('idle')} disabled={submitting}>
                Back
              </button>
              <button className="btn-primary" type="button" onClick={handleCreate} disabled={submitting || !name.trim()}>
                {submitting ? 'Creating…' : 'Create'}
              </button>
            </div>
          </div>
        )}

        {mode === 'join' && (
          <div className="circle-empty-body">
            <h2 className="circle-empty-title">Enter the code.</h2>
            <p className="circle-empty-sub">
              Six characters. Someone shared it with you.
            </p>
            <input
              className="circle-empty-input circle-empty-code-input"
              placeholder="ABC123"
              value={code}
              maxLength={CODE_LENGTH}
              onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
              autoFocus
            />
            <div className="circle-empty-actions">
              <button className="btn-ghost" type="button" onClick={() => setMode('idle')} disabled={submitting}>
                Back
              </button>
              <button
                className="btn-primary"
                type="button"
                onClick={handleJoin}
                disabled={submitting || code.length !== CODE_LENGTH}
              >
                {submitting ? 'Joining…' : 'Join'}
              </button>
            </div>
          </div>
        )}

        {mode === 'created' && (
          <div className="circle-empty-body">
            <h2 className="circle-empty-title">Circle created.</h2>
            <p className="circle-empty-sub">
              Share this code with the people you want in your circle. Up to four can join.
            </p>
            <div className="circle-created-code-card">
              <span className="circle-created-code-label">YOUR CODE</span>
              <code className="circle-created-code">{createdCode}</code>
            </div>
            <div className="circle-empty-actions">
              <button className="btn-ghost" type="button" onClick={handleCopyCode}>
                Copy
              </button>
              <button className="btn-primary" type="button" onClick={handleShareCode}>
                Share
              </button>
            </div>
            <button
              type="button"
              className="circle-empty-done"
              onClick={() => closeSheet(() => onClose && onClose())}
            >
              Done
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};

export default CircleEmptySheet;
