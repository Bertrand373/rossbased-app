// src/components/Photo/JourneyView.js
//
// The Visual Journey — a scroll-less grid of every photo the user has
// captured, ordered chronologically. Lives inside Calendar as the third
// view alongside Month and Week, and intentionally borrows the Month
// grid's vocabulary (gap-based rounded surfaces, restrained borders,
// gold reserved for milestones) so it reads as the photographic
// companion to the calendar — not a separate "feed."
//
// Each cell is a portrait photo with a small Day chip in the bottom-
// left corner. Milestone days (7/30/60/90/180/365) get a gold ✦ in the
// top-right and a gold-tinted day chip. Tap any cell to open the
// PhotoLightbox at full size.
//
// Photos persist across relapses — this is the user's full visual
// record, NOT the current-streak-only view. That's intentional; the
// "before X relapse" photo IS the most valuable photo they own.

import React, { useEffect, useState } from 'react';
import { parseISO } from 'date-fns';
import { listPhotoEntries } from '../../utils/dayJournal';
import { getPresignedUrl } from '../../utils/photoUrl';
import { MILESTONE_DAYS } from './MilestoneSheet';
import PhotoLightbox from './PhotoLightbox';

const MILESTONE_SET = new Set(MILESTONE_DAYS);

/**
 * Compute the streak-day-count for a given dayStr relative to the
 * user's start date and any relapse history. Falls back to absolute
 * order if streakHistory is missing.
 */
function dayCountFor(dayStr, userData, index) {
  const history = userData?.streakHistory || [];
  const dayDate = parseISO(dayStr);

  for (const seg of history) {
    if (!seg.start) continue;
    const start = typeof seg.start === 'string' ? parseISO(seg.start) : new Date(seg.start);
    const end = seg.end
      ? (typeof seg.end === 'string' ? parseISO(seg.end) : new Date(seg.end))
      : new Date();
    if (dayDate >= start && dayDate <= end) {
      const diff = Math.floor((dayDate - start) / (1000 * 60 * 60 * 24)) + 1;
      return Math.max(1, diff);
    }
  }
  return index + 1;
}

const JourneyCell = ({ entry, dayNumber, isMilestone, cellIndex, onOpen }) => {
  const [url, setUrl] = useState(null);

  useEffect(() => {
    let cancelled = false;
    getPresignedUrl(entry.photoKey).then((u) => { if (!cancelled) setUrl(u); });
    return () => { cancelled = true; };
  }, [entry.photoKey]);

  // --cell-i drives the staggered fade-in (see Photo.css). Capped in CSS.
  const cellStyle = { '--cell-i': cellIndex };

  return (
    <button
      type="button"
      className={`journey-cell${isMilestone ? ' milestone' : ''}`}
      style={cellStyle}
      onClick={() => url && onOpen({ url, dayNumber, isMilestone })}
      aria-label={`View Day ${dayNumber} photo`}
    >
      {url ? <img src={url} alt={`Day ${dayNumber}`} /> : null}
      {isMilestone && (
        <span className="journey-cell-glyph" aria-hidden="true">✦</span>
      )}
      <span className="journey-cell-day">Day {dayNumber}</span>
    </button>
  );
};

const JourneyView = ({ userData, onAddFirstPhoto }) => {
  const photos = listPhotoEntries(userData?.notes);
  const [lightboxState, setLightboxState] = useState({ open: false, url: null });

  if (photos.length === 0) {
    return (
      <div className="journey-view journey-empty" data-no-swipe>
        <div className="journey-empty-frame" aria-hidden="true">
          <span className="journey-empty-frame-glyph">Day 1</span>
        </div>
        <h3 className="journey-empty-headline">Your journey starts with one photo.</h3>
        <p className="journey-empty-sub">
          A single baseline is all it takes. Every photo after this one writes the rest of the story.
        </p>
        <button type="button" className="journey-empty-cta-btn" onClick={onAddFirstPhoto}>
          Set your baseline
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="journey-view" data-no-swipe>
        {photos.map((entry, i) => {
          const dayNumber = dayCountFor(entry.dayStr, userData, i);
          const isMilestone = MILESTONE_SET.has(dayNumber);
          return (
            <JourneyCell
              key={entry.dayStr}
              entry={entry}
              dayNumber={dayNumber}
              isMilestone={isMilestone}
              cellIndex={i}
              onOpen={(payload) => setLightboxState({ open: true, ...payload })}
            />
          );
        })}
      </div>

      <PhotoLightbox
        open={lightboxState.open}
        src={lightboxState.url}
        alt={lightboxState.dayNumber ? `Day ${lightboxState.dayNumber}` : ''}
        onClose={() => setLightboxState({ open: false, url: null })}
      />
    </>
  );
};

export default JourneyView;
