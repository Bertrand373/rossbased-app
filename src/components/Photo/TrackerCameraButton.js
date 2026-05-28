// src/components/Photo/TrackerCameraButton.js
//
// The ghost camera affordance that sits below "Log Today" on the
// Tracker hero. 44px dashed-ring at low opacity (mirrors CircleStack
// empty-slot vocabulary). Slightly elevated when there's already a
// photo for today (solid ring instead of dashed) — same way a
// CircleStack-reported state contrasts with unreported.
//
// Lives in its own wrapper so the parent Tracker doesn't need to
// know about layout / animation timing.

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
        className={`tracker-camera-btn${hasToday ? ' has-today' : ''}`}
        onClick={onClick}
        aria-label={hasToday ? "Retake today's photo" : "Snap today's photo"}
        title={hasToday ? "Retake today's photo" : "Snap today's photo"}
      >
        <svg
          className="tracker-camera-icon"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M14.5 4l1 2H20a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4.5l1-2h5z" />
          <circle cx="12" cy="13" r="3.5" />
        </svg>
      </button>
    </div>
  );
};

export default TrackerCameraButton;
