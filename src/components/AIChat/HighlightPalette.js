// src/components/AIChat/HighlightPalette.js
// Floating palette that appears when the user selects text inside an Oracle
// message. Offers 4 ink colors + a Note button. Positioned absolutely against
// the chat panel using x/y coordinates supplied by the parent.

import React, { useRef } from 'react';

const COLORS = [
  { id: 'amber', label: 'Amber' },
  { id: 'rose',  label: 'Rose'  },
  { id: 'azure', label: 'Azure' },
  { id: 'sage',  label: 'Sage'  },
];

export default function HighlightPalette({ visible, x, y, placement = 'above', onPickColor, onAddNote, onClose }) {
  const ref = useRef(null);

  // Lifecycle is managed by the parent's selectionchange listener: palette
  // shows on non-empty selection, hides when selection clears. Previously we
  // ALSO dismissed on any outside touchstart — but on iOS that also fires
  // when the user taps the system Copy/Look Up/Translate menu OR drags the
  // blue selection handles, both of which sit outside our palette bounds.
  // The result: palette + selection both nuked the moment the user tried
  // to interact with native selection UI. Removing the outside-touch
  // handler lets the iOS menu and our palette coexist; the palette only
  // dismisses when selection actually clears (selectionchange in parent).
  //
  // `placement` ('above' | 'below') comes from the parent's positioner. We
  // prefer above so the palette doesn't cover the text being acted on, but
  // flip below when the selection is near the top — that's also where iOS
  // tends to put its Copy/Look Up menu, so flipping cuts down on overlap.

  if (!visible) return null;

  // Tail height — keep in sync with .oracle-palette::after in CSS
  return (
    <div
      ref={ref}
      className={`oracle-palette oracle-palette--${placement}`}
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
