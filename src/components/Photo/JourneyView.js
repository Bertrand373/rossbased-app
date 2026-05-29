// src/components/Photo/JourneyView.js
//
// The Visual Journey — a vertical, editorial-style photo strip that
// lives inside Calendar as the third view (alongside Month and Week).
// Each entry reads like a page in a personal photo book: the image is
// the hero, captioned underneath with day count + date in tracked
// caps, with an optional note in italic.
//
// Milestone days (Day 7 / 30 / 60 / 90 / 180 / 365) get a gold-
// accented eyebrow + the milestone's short title so they read as
// chapter marks rather than just-another-row.
//
// Photos persist across relapses — this is the user's full visual
// record, NOT the current-streak-only view. That's intentional; the
// "before X relapse" photo IS the most valuable photo they own.

import React, { useEffect, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { listPhotoEntries } from '../../utils/dayJournal';
import { getPresignedUrl } from '../../utils/photoUrl';
import { MILESTONE_DAYS, MILESTONE_TITLE } from './MilestoneSheet';

const MILESTONE_SET = new Set(MILESTONE_DAYS);

/**
 * Compute the streak-day-count for a given dayStr relative to the
 * user's start date and any relapse history. Falls back to absolute
 * order if streakHistory is missing.
 */
function dayCountFor(dayStr, userData, index) {
  // First, try to derive from streakHistory — find the streak window
  // this day falls into, then return the offset within it.
  const history = userData?.streakHistory || [];
  const dayDate = parseISO(dayStr);

  for (const seg of history) {
    if (!seg.start) continue;
    const start = typeof seg.start === 'string' ? parseISO(seg.start) : new Date(seg.start);
    const end = seg.end
      ? (typeof seg.end === 'string' ? parseISO(seg.end) : new Date(seg.end))
      : new Date(); // open streak
    if (dayDate >= start && dayDate <= end) {
      const diff = Math.floor((dayDate - start) / (1000 * 60 * 60 * 24)) + 1;
      return Math.max(1, diff);
    }
  }

  // Fallback: 1-indexed by chronological order in the photo list.
  return index + 1;
}

const PhotoEntry = ({ entry, dayNumber, isMilestone, rowIndex, onOpen }) => {
  const [url, setUrl] = useState(null);

  useEffect(() => {
    let cancelled = false;
    getPresignedUrl(entry.photoKey).then((u) => { if (!cancelled) setUrl(u); });
    return () => { cancelled = true; };
  }, [entry.photoKey]);

  let dateLabel = '';
  let weekdayLabel = '';
  try {
    const parsed = parseISO(entry.dayStr);
    dateLabel = format(parsed, 'MMM d, yyyy').toUpperCase();
    weekdayLabel = format(parsed, 'EEEE').toUpperCase();
  } catch { /* ignore */ }

  const milestoneTitle = isMilestone ? MILESTONE_TITLE[dayNumber] : null;

  // --row-i drives the staggered fade-in (see Photo.css). Capped in CSS.
  const entryStyle = { '--row-i': rowIndex };

  return (
    <article
      className={`journey-entry${isMilestone ? ' milestone' : ''}`}
      style={entryStyle}
    >
      {isMilestone && (
        <div className="journey-entry-eyebrow milestone">
          <span className="journey-entry-eyebrow-glyph" aria-hidden="true">✦</span>
          <span className="journey-entry-eyebrow-label">
            Milestone · Day {dayNumber}{milestoneTitle ? ` — ${milestoneTitle}` : ''}
          </span>
        </div>
      )}

      <button
        type="button"
        className={`journey-entry-photo${isMilestone ? ' milestone' : ''}`}
        onClick={() => onOpen(entry.dayStr)}
        aria-label={`View photo from day ${dayNumber}`}
      >
        {url ? <img src={url} alt={`Day ${dayNumber}`} /> : null}
        <span className="journey-entry-photo-inner" aria-hidden="true" />
      </button>

      <div className="journey-entry-caption">
        <div className="journey-entry-caption-day">
          <span className="journey-entry-caption-day-num">{dayNumber}</span>
          <span className="journey-entry-caption-day-label">Day</span>
        </div>
        <div className="journey-entry-caption-meta">
          <div className="journey-entry-caption-date">{dateLabel}</div>
          <div className="journey-entry-caption-weekday">{weekdayLabel}</div>
        </div>
      </div>

      {entry.text ? (
        <p className="journey-entry-note">{entry.text}</p>
      ) : null}
    </article>
  );
};

const JourneyView = ({ userData, onOpenDay, onAddFirstPhoto }) => {
  const photos = listPhotoEntries(userData?.notes);

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

  // Compute the journey arc for the hero strip — Day 1 → Day {latest}.
  // Uses the same dayCountFor logic as the entries so the numbers match.
  const lastDayNumber = dayCountFor(
    photos[photos.length - 1].dayStr,
    userData,
    photos.length - 1
  );

  return (
    <div className="journey-view" data-no-swipe>
      <header className="journey-hero">
        <div className="journey-hero-arc">
          <span className="journey-hero-arc-from">Day 1</span>
          <span className="journey-hero-arc-rule" aria-hidden="true" />
          <span className="journey-hero-arc-to">Day {lastDayNumber}</span>
        </div>
        <div className="journey-hero-sub">
          {photos.length} {photos.length === 1 ? 'moment' : 'moments'} captured
        </div>
      </header>

      {photos.map((entry, i) => {
        const dayNumber = dayCountFor(entry.dayStr, userData, i);
        const isMilestone = MILESTONE_SET.has(dayNumber);
        return (
          <PhotoEntry
            key={entry.dayStr}
            entry={entry}
            dayNumber={dayNumber}
            isMilestone={isMilestone}
            rowIndex={i}
            onOpen={onOpenDay}
          />
        );
      })}
    </div>
  );
};

export default JourneyView;
