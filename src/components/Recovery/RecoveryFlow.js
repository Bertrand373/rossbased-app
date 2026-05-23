// src/components/Recovery/RecoveryFlow.js
//
// Five-screen guided flow that intercepts a relapse reset on the Tracker.
// Captures trigger → reframes the streak → offers a free Oracle session →
// records the user's anchor (why) → locks in tomorrow's action.
//
// On completion, POSTs to /api/recovery and calls onComplete so the
// caller can perform the actual streak reset. The flow is fully skippable
// at every step; skipping still resets the streak but with no captured data.

import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import ReactDOM from 'react-dom';
import useSheetSwipe from '../../hooks/useSheetSwipe';
import { TRIGGERS } from '../../constants/triggerConstants';
import '../../styles/BottomSheet.css';
import './RecoveryFlow.css';

const API_URL = process.env.REACT_APP_API_URL || 'https://rossbased-app.onrender.com';

// Chips for tomorrow's anchor action — small, doable, before the phone
const ANCHOR_ACTIONS = [
  'Cold shower',
  'Gym',
  'Long walk',
  'Prayer',
  'Meditation',
  'Read',
  'Sun',
  'Journal'
];

const MAX_WHY = 280;
const MAX_NOTE = 280;

const RecoveryFlow = ({ open, streak, userData, onComplete, onClose, onOpenOracle }) => {
  const [step, setStep] = useState(1);
  const [trigger, setTrigger] = useState('');
  const [triggerNote, setTriggerNote] = useState('');
  const [why, setWhy] = useState('');
  const [anchor, setAnchor] = useState('');
  const [customAnchor, setCustomAnchor] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [sheetReady, setSheetReady] = useState(false);
  const sheetPanelRef = useRef(null);

  // Reset state every time the flow opens
  useEffect(() => {
    if (open) {
      setStep(1);
      setTrigger('');
      setTriggerNote('');
      setWhy('');
      setAnchor('');
      setCustomAnchor('');
      setSubmitting(false);
      requestAnimationFrame(() => requestAnimationFrame(() => setSheetReady(true)));
    } else {
      setSheetReady(false);
    }
  }, [open]);

  // Reframe context — compute once per flow open
  const reframe = useMemo(() => {
    const held = streak || 0;
    const history = userData?.streakHistory || [];
    const closed = history.filter(s => s.end && s.days);
    const longest = userData?.longestStreak || Math.max(0, ...closed.map(s => s.days || 0));
    const firstAttempt = closed.length > 0 ? closed[0].days || 0 : 0;

    if (closed.length === 0) {
      return {
        headline: `${held} day${held === 1 ? '' : 's'} held.`,
        line: 'First climb. You learned the terrain. The next one starts now.'
      };
    }
    if (held >= longest && longest > 0) {
      return {
        headline: `${held} day${held === 1 ? '' : 's'} held.`,
        line: `New ground — past your previous record of ${longest}.`
      };
    }
    if (firstAttempt > 0 && held > firstAttempt) {
      const factor = (held / firstAttempt).toFixed(1).replace(/\.0$/, '');
      return {
        headline: `${held} day${held === 1 ? '' : 's'} held.`,
        line: `${factor}× your first attempt of ${firstAttempt}. The climb isn't reset — your floor is higher now.`
      };
    }
    return {
      headline: `${held} day${held === 1 ? '' : 's'} held.`,
      line: 'You know the way up now. Climbing again is the only path through.'
    };
  }, [streak, userData]);

  const closeFlow = useCallback((cb) => {
    setSheetReady(false);
    setTimeout(() => { if (cb) cb(); }, 300);
  }, []);

  useSheetSwipe(sheetPanelRef, open, () => {
    closeFlow(() => onClose && onClose());
  });

  const finalAnchor = anchor === 'custom' ? customAnchor.trim() : anchor;

  // Submit + close. Resolves with whether the user asked to open Oracle.
  const submit = useCallback(async ({ openOracleAfter } = {}) => {
    if (submitting) return;
    setSubmitting(true);

    const payload = {
      trigger,
      triggerNote: triggerNote.trim(),
      why: why.trim(),
      anchor: finalAnchor,
      dayCount: streak || 0
    };

    try {
      const token = localStorage.getItem('token');
      await fetch(`${API_URL}/api/recovery`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify(payload)
      });
    } catch (err) {
      // Non-blocking — recovery flow still completes locally so the user
      // doesn't get stuck on a flaky network.
      console.warn('Recovery save failed (non-blocking):', err);
    }

    closeFlow(() => {
      if (onComplete) onComplete(payload);
      if (openOracleAfter && onOpenOracle) onOpenOracle(payload);
    });
  }, [submitting, trigger, triggerNote, why, finalAnchor, streak, closeFlow, onComplete, onOpenOracle]);

  if (!open) return null;

  // ── Step components ────────────────────────────────────────────────

  const StepProgress = () => (
    <div className="recovery-progress" aria-hidden="true">
      {[1, 2, 3, 4, 5].map(n => (
        <span key={n} className={`recovery-progress-dot${n <= step ? ' active' : ''}`} />
      ))}
    </div>
  );

  const SkipLink = ({ label = 'Skip' }) => (
    <button
      type="button"
      className="recovery-skip"
      onClick={() => {
        if (step < 5) setStep(step + 1);
        else submit();
      }}
    >
      {label}
    </button>
  );

  const renderStep = () => {
    if (step === 1) {
      // ── TRIGGER ────────────────────────────────────────────────
      return (
        <>
          <h2 className="recovery-title">What pulled you in?</h2>
          <p className="recovery-sub">Doesn't change what happened. Helps you spot it next time.</p>
          <div className="recovery-chips">
            {TRIGGERS.map(t => (
              <button
                key={t.id}
                type="button"
                className={`recovery-chip${trigger === t.id ? ' active' : ''}`}
                onClick={() => setTrigger(trigger === t.id ? '' : t.id)}
              >
                {t.label}
              </button>
            ))}
          </div>
          <textarea
            className="recovery-input"
            placeholder="Anything else? (optional)"
            value={triggerNote}
            maxLength={MAX_NOTE}
            onChange={e => setTriggerNote(e.target.value)}
            rows={2}
          />
          <div className="recovery-actions">
            <button className="recovery-primary" onClick={() => setStep(2)}>Continue</button>
            <SkipLink />
          </div>
        </>
      );
    }

    if (step === 2) {
      // ── REFRAME ───────────────────────────────────────────────
      return (
        <>
          <span className="recovery-eyebrow">The climb</span>
          <h2 className="recovery-title recovery-title-large">{reframe.headline}</h2>
          <p className="recovery-reframe">{reframe.line}</p>
          <div className="recovery-actions">
            <button className="recovery-primary" onClick={() => setStep(3)}>Keep going</button>
          </div>
        </>
      );
    }

    if (step === 3) {
      // ── ORACLE OFFER ───────────────────────────────────────────
      return (
        <>
          <span className="recovery-eyebrow">Bonus</span>
          <h2 className="recovery-title">Talk it through with the Oracle?</h2>
          <p className="recovery-sub">One message on the house. Doesn't count toward your daily limit.</p>
          <div className="recovery-actions recovery-actions-stack">
            <button
              className="recovery-primary"
              onClick={() => setStep(4)}
              data-defer-oracle
            >
              First — write my anchor
            </button>
            <button
              className="recovery-ghost"
              onClick={() => setStep(4)}
            >
              Save it for later
            </button>
          </div>
          <p className="recovery-fineprint">You'll get the chance to open Oracle right after locking in your anchor.</p>
        </>
      );
    }

    if (step === 4) {
      // ── ANCHOR (WHY) ──────────────────────────────────────────
      return (
        <>
          <span className="recovery-eyebrow">Your anchor</span>
          <h2 className="recovery-title">What are you retaining for?</h2>
          <p className="recovery-sub">Write it like you'll need to read it tomorrow.</p>
          <textarea
            className="recovery-input recovery-input-large"
            placeholder="To be present for my daughter without the fog…"
            value={why}
            maxLength={MAX_WHY}
            onChange={e => setWhy(e.target.value)}
            rows={4}
            autoFocus
          />
          <div className="recovery-counter">{why.length}/{MAX_WHY}</div>
          <div className="recovery-actions">
            <button
              className="recovery-primary"
              disabled={!why.trim()}
              onClick={() => setStep(5)}
            >
              Continue
            </button>
            <SkipLink />
          </div>
        </>
      );
    }

    // Step 5 — TOMORROW'S ACTION
    return (
      <>
        <span className="recovery-eyebrow">Tomorrow</span>
        <h2 className="recovery-title">One thing. Before anything else.</h2>
        <p className="recovery-sub">Small. Doable. Before you reach for the phone.</p>
        <div className="recovery-chips recovery-chips-anchor">
          {ANCHOR_ACTIONS.map(a => (
            <button
              key={a}
              type="button"
              className={`recovery-chip${anchor === a ? ' active' : ''}`}
              onClick={() => { setAnchor(anchor === a ? '' : a); setCustomAnchor(''); }}
            >
              {a}
            </button>
          ))}
          <button
            type="button"
            className={`recovery-chip${anchor === 'custom' ? ' active' : ''}`}
            onClick={() => setAnchor('custom')}
          >
            Other
          </button>
        </div>
        {anchor === 'custom' && (
          <input
            className="recovery-input"
            placeholder="What's the first thing tomorrow?"
            value={customAnchor}
            maxLength={MAX_NOTE}
            onChange={e => setCustomAnchor(e.target.value)}
            autoFocus
          />
        )}
        <div className="recovery-actions recovery-actions-stack">
          <button
            className="recovery-primary"
            disabled={submitting}
            onClick={() => submit({ openOracleAfter: true })}
          >
            Lock in &amp; open Oracle
          </button>
          <button
            className="recovery-ghost"
            disabled={submitting}
            onClick={() => submit({ openOracleAfter: false })}
          >
            Lock in
          </button>
        </div>
      </>
    );
  };

  // ── Portal ────────────────────────────────────────────────────────
  return ReactDOM.createPortal(
    <div
      className={`sheet-backdrop${sheetReady ? ' open' : ''}`}
      onClick={() => closeFlow(() => onClose && onClose())}
    >
      <div
        ref={sheetPanelRef}
        className={`sheet-panel recovery-sheet${sheetReady ? ' open' : ''}`}
        onClick={e => e.stopPropagation()}
      >
        <div className="sheet-header" />
        <div className="recovery-content" data-no-swipe>
          <StepProgress />
          {renderStep()}
        </div>
      </div>
    </div>,
    document.body
  );
};

export default RecoveryFlow;
