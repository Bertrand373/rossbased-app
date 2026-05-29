// src/components/Shared/ConfirmSheet.js
//
// Branded confirmation sheet. Replaces ad-hoc window.confirm() calls
// throughout the app so destructive prompts feel like part of TitanTrack
// instead of native iOS / Chrome.
//
// Built on the same .sheet-panel + .confirm-modal vocabulary the Tracker
// reset modal already uses — so the visual treatment is identical to
// "Reset streak?", "Log wet dream?", etc.
//
// Confirm action defaults to .btn-danger (destructive). Pass tone="primary"
// for a non-destructive confirmation that uses .btn-primary instead.

import React, { useState, useEffect, useRef, useCallback } from 'react';
import ReactDOM from 'react-dom';
import useSheetSwipe from '../../hooks/useSheetSwipe';
import '../../styles/BottomSheet.css';
// confirm-modal styles live in Tracker.css today; we reuse the same
// class names so the visual treatment matches the Reset / Wet dream
// confirmations exactly.
import '../Tracker/Tracker.css';

const ConfirmSheet = ({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  tone = 'danger',           // 'danger' | 'primary'
  onConfirm,
  onCancel
}) => {
  const [sheetReady, setSheetReady] = useState(false);
  const sheetPanelRef = useRef(null);

  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => requestAnimationFrame(() => setSheetReady(true)));
    } else {
      setSheetReady(false);
    }
  }, [open]);

  const closeSheet = useCallback((cb) => {
    setSheetReady(false);
    setTimeout(() => { if (cb) cb(); }, 300);
  }, []);

  useSheetSwipe(sheetPanelRef, open, () => closeSheet(() => onCancel && onCancel()));

  if (!open) return null;

  const handleConfirm = () => closeSheet(() => onConfirm && onConfirm());
  const handleCancel = () => closeSheet(() => onCancel && onCancel());

  return ReactDOM.createPortal(
    <div
      className={`sheet-backdrop${sheetReady ? ' open' : ''}`}
      onClick={handleCancel}
    >
      <div
        ref={sheetPanelRef}
        className={`sheet-panel tracker-sheet${sheetReady ? ' open' : ''}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sheet-header" />
        <div className="confirm-modal">
          <h2>{title}</h2>
          {message ? <p>{message}</p> : null}
          <div className="confirm-actions">
            <button
              type="button"
              className={tone === 'primary' ? 'btn-primary' : 'btn-danger'}
              onClick={handleConfirm}
            >
              {confirmLabel}
            </button>
            <button type="button" className="btn-ghost" onClick={handleCancel}>
              {cancelLabel}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default ConfirmSheet;
