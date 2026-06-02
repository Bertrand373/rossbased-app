// src/components/Photo/JourneyView.js
//
// The Visual Journey — a scroll-less grid of every photo the user has
// captured, ordered chronologically. Lives inside Calendar as the third
// view alongside Month and Week, and intentionally borrows the Month
// grid's vocabulary (gap-based rounded surfaces, restrained borders,
// gold reserved for milestones) so it reads as the photographic
// companion to the calendar — not a separate "feed."
//
// Pagination is driven by Calendar (the parent owns phase state). This
// component receives the current phase's photos as a prop, and re-runs
// its stagger entrance whenever the phase key changes — so swiping
// between Baseline → One Week → First Month feels like turning chapters.
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
import { getPresignedUrl } from '../../utils/photoUrl';
import { listPhotoEntries } from '../../utils/dayJournal';
import { MILESTONE_DAYS } from './MilestoneSheet';
import PhotoLightbox from './PhotoLightbox';

const MILESTONE_SET = new Set(MILESTONE_DAYS);

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

const JourneyView = ({ userData, phasePhotos, phaseKey, onAddFirstPhoto, isPremium, openPlanModal }) => {
  const photos = phasePhotos || [];
  const [lightboxState, setLightboxState] = useState({ open: false, url: null });

  // Empty state — only reached when the user has no photos at all.
  // Phases with zero photos are filtered out by the parent before
  // they reach this component, so an empty phasePhotos here means
  // userData has no captured photos yet.
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

  // Premium gate — capturing daily photos is free (it builds the habit
  // and the record), but the transformation TIMELINE is the payoff and
  // lives behind Premium. Free users see how much they've banked + the
  // path to unlock it (the milestone share stays free elsewhere).
  if (!isPremium) {
    const totalShots = listPhotoEntries(userData?.notes).length;
    return (
      <div className="journey-view journey-empty journey-locked" data-no-swipe>
        <div className="journey-empty-frame" aria-hidden="true">
          <span className="journey-empty-frame-glyph">✦</span>
        </div>
        <h3 className="journey-empty-headline">Your transformation timeline</h3>
        <p className="journey-empty-sub">
          {totalShots > 0
            ? `You've banked ${totalShots} ${totalShots === 1 ? 'shot' : 'shots'}. Unlock the timeline to see every day side by side — and watch yourself change.`
            : 'See every shot side by side and watch yourself change over time.'}
        </p>
        <button
          type="button"
          className="journey-empty-cta-btn"
          onClick={() => openPlanModal && openPlanModal()}
        >
          Unlock with Premium
        </button>
      </div>
    );
  }

  return (
    <>
      {/* phaseKey on the grid re-mounts cells when the phase changes so
          the stagger entrance plays fresh on each chapter swipe. */}
      <div className="journey-view" data-no-swipe key={phaseKey}>
        {photos.map((entry, i) => {
          const dayNumber = entry.dayNumber;
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
