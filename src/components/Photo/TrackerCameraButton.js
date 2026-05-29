// src/components/Photo/TrackerCameraButton.js
//
// Subordinate "snap today's photo" affordance that sits directly
// beneath Log Today on the Tracker hero. Rendered as a ghost text
// link (no border, no pill) so it reads as a quiet sibling to the
// primary CTA rather than competing with it.
//
// Two states:
//   - No photo today: "+ Snap today's photo"  (muted text)
//   - Photo today:    "✓ Photo captured"      (app's success green)
//
// Tap always opens the PhotoCaptureSheet so the user can capture
// for the first time or replace the existing capture.

import React from 'react';
import { hasPhoto } from '../../utils/dayJournal';
import { format } from 'date-fns';

const TrackerCameraButton = ({ userData, onClick }) => {
  const today = format(new Date(), 'yyyy-MM-dd');
  const hasToday = hasPhoto(userData?.notes, today);

  return (
    <div className="tracker-camera-wrap">
      <button
        type="button"
        className={`tracker-camera-link${hasToday ? ' has-today' : ''}`}
        onClick={onClick}
        aria-label={hasToday ? "Replace today's photo" : "Snap today's photo"}
      >
        <span className="tracker-camera-link-glyph" aria-hidden="true">
          {hasToday ? '✓' : '+'}
        </span>
        <span className="tracker-camera-link-label">
          {hasToday ? 'Photo captured' : 'Snap today’s photo'}
        </span>
      </button>
    </div>
  );
};

export default TrackerCameraButton;
