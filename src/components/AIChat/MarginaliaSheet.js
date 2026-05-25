// src/components/AIChat/MarginaliaSheet.js
// Sheet/modal for writing or editing the marginalia note attached to a
// highlight. Centered card on desktop; bottom sheet on mobile.

import React, { useEffect, useRef, useState } from 'react';

const COLORS = [
  { id: 'amber', label: 'Amber' },
  { id: 'rose',  label: 'Rose'  },
  { id: 'azure', label: 'Azure' },
  { id: 'sage',  label: 'Sage'  },
];

const MAX_LEN = 1000;

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

  if (!open || !note) return null;

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

  return (
    <div className="oracle-marginalia-overlay" onClick={onClose}>
      <div
        className={`oracle-marginalia-sheet oracle-marginalia--${color}`}
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
    </div>
  );
}
