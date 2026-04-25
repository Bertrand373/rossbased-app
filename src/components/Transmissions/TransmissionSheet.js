// src/components/Transmissions/TransmissionSheet.js
// Branded one-shot sheet shown on app load when admin has replied to the user's feedback.
// Bottom sheet on mobile, glass modal on desktop (via shared BottomSheet.css media query).
// On acknowledge, dismissed forever; if more pending, the next surfaces after auto-show delay.

import React, { useState, useEffect, useRef, useCallback } from 'react';
import useSheetSwipe from '../../hooks/useSheetSwipe';
import './TransmissionSheet.css';
import '../../styles/BottomSheet.css';

const TransmissionSheet = ({ pending, onAcknowledge, suppress }) => {
  const [showSheet, setShowSheet] = useState(false);
  const [sheetReady, setSheetReady] = useState(false);
  const sheetPanelRef = useRef(null);
  const showTimerRef = useRef(null);

  const current = pending && pending.length > 0 ? pending[0] : null;
  const hasPending = !!current && !suppress;

  // Auto-show with a brief delay so it doesn't slam the user on open
  useEffect(() => {
    if (!hasPending) {
      setShowSheet(false);
      return;
    }
    if (showSheet) return;
    showTimerRef.current = setTimeout(() => setShowSheet(true), 1500);
    return () => clearTimeout(showTimerRef.current);
  }, [hasPending, showSheet]);

  // Sheet animation
  useEffect(() => {
    if (showSheet) {
      requestAnimationFrame(() => requestAnimationFrame(() => setSheetReady(true)));
    } else {
      setSheetReady(false);
    }
  }, [showSheet]);

  const closeSheet = useCallback((cb) => {
    setSheetReady(false);
    setTimeout(() => {
      if (cb) cb();
    }, 300);
  }, []);

  const handleAcknowledge = useCallback(() => {
    if (!current) return;
    const id = current._id;
    closeSheet(() => {
      setShowSheet(false);
      onAcknowledge(id);
    });
  }, [current, closeSheet, onAcknowledge]);

  useSheetSwipe(sheetPanelRef, showSheet, handleAcknowledge);

  if (!showSheet || !current) return null;

  const formattedDate = current.createdAt
    ? new Date(current.createdAt).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      })
    : '';

  const statusLabel = current.status === 'acknowledged' ? 'Acknowledged' : 'Resolved';

  return (
    <div
      className={`sheet-backdrop tx-backdrop${sheetReady ? ' open' : ''}`}
      onClick={handleAcknowledge}
    >
      <div
        ref={sheetPanelRef}
        className={`sheet-panel tx-sheet${sheetReady ? ' open' : ''}`}
        onClick={e => e.stopPropagation()}
      >
        <div className="sheet-header" />

        <div className="tx-content">
          <div className="tx-header">
            <img src="/tt-icon-white.png" alt="" className="tx-icon" />
            <h2 className="tx-title">Transmission</h2>
            <span className={`tx-status tx-status-${current.status || 'fixed'}`}>
              {statusLabel}
            </span>
          </div>

          {current.feedbackText && (
            <div className="tx-original">
              <span className="tx-original-label">Your feedback</span>
              <p className="tx-original-text">{current.feedbackText}</p>
            </div>
          )}

          <div className="tx-body">
            {current.message.split('\n').map((line, i) => {
              const trimmed = line.trim();
              if (!trimmed) return null;
              return <p key={i}>{trimmed}</p>;
            })}
          </div>

          {formattedDate && <span className="tx-date">{formattedDate}</span>}

          <button className="tx-dismiss" onClick={handleAcknowledge}>
            Acknowledge
          </button>
        </div>
      </div>
    </div>
  );
};

export default TransmissionSheet;
