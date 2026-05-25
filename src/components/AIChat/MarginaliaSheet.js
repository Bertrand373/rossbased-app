// src/components/AIChat/MarginaliaSheet.js
// Sheet/modal for writing or editing the marginalia note attached to a
// highlight. Centered card on desktop; bottom sheet on mobile.

import React, { useEffect, useRef, useState } from 'react';
import ReactDOM from 'react-dom';
import useSheetSwipe from '../../hooks/useSheetSwipe';

const COLORS = [
  { id: 'amber', label: 'Amber' },
  { id: 'rose',  label: 'Rose'  },
  { id: 'azure', label: 'Azure' },
  { id: 'sage',  label: 'Sage'  },
];

const MAX_LEN = 1000;

// Same exit-animation window as NotesLibrary — must stay in sync with the
// CSS keyframes on .oracle-marginalia-sheet.closing + overlay.closing.
const EXIT_DURATION_MS = 280;

export default function MarginaliaSheet({ open, note, onSave, onDelete, onClose }) {
  const [text, setText] = useState('');
  const [color, setColor] = useState('amber');
  const [saving, setSaving] = useState(false);
  const textareaRef = useRef(null);

  // Hydrate fields when a new note is opened
  useEffect(() => {
    if (open && note) {
      setText(note.note || '');
      setColor(note.color || 'amber');
      // Focus the textarea after the sheet animates in
      setTimeout(() => {
        textareaRef.current?.focus();
        // Place caret at end
        const ta = textareaRef.current;
        if (ta) ta.setSelectionRange(ta.value.length, ta.value.length);
      }, 150);
    }
  }, [open, note]);

  // Mount/unmount with exit animation — keep mounted EXIT_DURATION_MS after
  // the parent flips `open` to false so the sheet can slide down smoothly.
  const [shouldRender, setShouldRender] = useState(open);
  const [isClosing, setIsClosing] = useState(false);
  useEffect(() => {
    if (open) {
      setShouldRender(true);
      setIsClosing(false);
    } else if (shouldRender) {
      setIsClosing(true);
      const t = setTimeout(() => {
        setShouldRender(false);
        setIsClosing(false);
      }, EXIT_DURATION_MS);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [open, shouldRender]);

  // Keep refs / dirty calculation accessible to the swipe-dismiss handler.
  // We declare them above the useSheetSwipe call so the closure captures
  // the current text/color values when the swipe completes.
  const sheetRef = useRef(null);
  const textRef = useRef(text);
  const colorRef = useRef(color);
  useEffect(() => { textRef.current = text; }, [text]);
  useEffect(() => { colorRef.current = color; }, [color]);

  // Swipe-down behavior matches iOS Notes: if the draft has changes, save
  // them (no work lost); if nothing changed, just dismiss. Either way the
  // parent's onClose fires after the swipe completes.
  const handleSwipeDismiss = () => {
    if (!note) { onClose && onClose(); return; }
    const nextText = textRef.current;
    const nextColor = colorRef.current;
    const isDirty =
      (nextText !== (note.note || '')) ||
      (nextColor !== (note.color || 'amber'));
    if (isDirty) {
      // Fire-and-forget save — sheet is dismissing regardless. The server
      // request continues in the background; if it fails the existing
      // toast/error UI in useOracleNotes handles it.
      Promise.resolve(onSave({ color: nextColor, note: nextText })).catch(() => {});
    }
    onClose && onClose();
  };
  useSheetSwipe(sheetRef, open && !isClosing, handleSwipeDismiss);

  if (!shouldRender || !note) return null;

  const dirty = (text !== (note.note || '')) || (color !== (note.color || 'amber'));
  const remaining = MAX_LEN - text.length;

  const handleSave = async () => {
    if (!dirty || saving) {
      onClose && onClose();
      return;
    }
    setSaving(true);
    await onSave({ color, note: text });
    setSaving(false);
    onClose && onClose();
  };

  const handleDelete = async () => {
    if (saving) return;
    setSaving(true);
    await onDelete();
    setSaving(false);
    onClose && onClose();
  };

  if (typeof document === 'undefined') return null;

  return ReactDOM.createPortal(
    <div className={`oracle-marginalia-overlay${isClosing ? ' closing' : ''}`} onClick={onClose}>
      <div
        ref={sheetRef}
        className={`oracle-marginalia-sheet oracle-marginalia--${color}${isClosing ? ' closing' : ''}`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Edit note"
      >
        <div className="oracle-marginalia-grip" />

        {/* The highlighted passage — what you're noting against */}
        <div className="oracle-marginalia-passage">
          <span className={`oracle-marginalia-bar oracle-marginalia-bar--${color}`} />
          <blockquote>"{note.highlightedText}"</blockquote>
        </div>

        {/* Marginalia textarea — serif, generous line-height */}
        <label className="oracle-marginalia-label">Your thoughts</label>
        <textarea
          ref={textareaRef}
          className="oracle-marginalia-textarea"
          value={text}
          onChange={(e) => setText(e.target.value.slice(0, MAX_LEN))}
          placeholder="Write what came to mind…"
          rows={5}
          maxLength={MAX_LEN}
        />
        <div className="oracle-marginalia-count">{remaining}</div>

        {/* Color picker — change ink color */}
        <div className="oracle-marginalia-colors">
          {COLORS.map(c => (
            <button
              key={c.id}
              type="button"
              className={`oracle-marginalia-color oracle-marginalia-color--${c.id}${color === c.id ? ' active' : ''}`}
              aria-label={c.label}
              onClick={() => setColor(c.id)}
            />
          ))}
        </div>

        {/* Actions */}
        <div className="oracle-marginalia-actions">
          <button
            type="button"
            className="oracle-marginalia-delete"
            onClick={handleDelete}
            disabled={saving}
          >Remove</button>
          <button
            type="button"
            className="oracle-marginalia-save"
            onClick={handleSave}
            disabled={saving}
          >{dirty ? 'Save' : 'Done'}</button>
        </div>
      </div>
    </div>,
    document.body
  );
}
