// src/components/AIChat/HighlightPalette.js
// Floating palette that appears when the user selects text inside an Oracle
// message. Offers 4 ink colors + a Note button. Positioned absolutely against
// the chat panel using x/y coordinates supplied by the parent.

import React, { useEffect, useRef } from 'react';

const COLORS = [
  { id: 'amber', label: 'Amber' },
  { id: 'rose',  label: 'Rose'  },
  { id: 'azure', label: 'Azure' },
  { id: 'sage',  label: 'Sage'  },
];

export default function HighlightPalette({ visible, x, y, onPickColor, onAddNote, onClose }) {
  const ref = useRef(null);

  // Dismiss on outside pointer-down. Selection clears naturally as part of this.
  useEffect(() => {
    if (!visible) return;
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose && onClose();
    };
    document.addEventListener('mousedown', handler);
    document.addEventListener('touchstart', handler, { passive: true });
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('touchstart', handler);
    };
  }, [visible, onClose]);

  if (!visible) return null;

  // Tail height — keep in sync with .oracle-palette::after in CSS
  return (
    <div
      ref={ref}
      className="oracle-palette"
      style={{ left: `${x}px`, top: `${y}px` }}
      onMouseDown={(e) => e.preventDefault()} // don't blur the selection on tap
    >
      {COLORS.map(c => (
        <button
          key={c.id}
          type="button"
          className={`oracle-palette-dot oracle-palette-dot--${c.id}`}
          aria-label={`Highlight ${c.label}`}
          onClick={() => onPickColor && onPickColor(c.id)}
        />
      ))}
      <span className="oracle-palette-divider" />
      <button
        type="button"
        className="oracle-palette-note"
        aria-label="Add note"
        onClick={() => onAddNote && onAddNote()}
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 20h9" />
          <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z" />
        </svg>
        <span>Note</span>
      </button>
    </div>
  );
}
