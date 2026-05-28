// src/components/Photo/JourneyView.js
//
// Chronological photo strip view shown inside Calendar as an alternate
// to the month grid. Each row: day-count label on the left, photo on
// the right, optional journal text below. Milestone days get a quiet
// gold treatment so users can spot their Day-30 / Day-90 / Day-365
// shots at a glance.
//
// Photos persist across relapses — this is the user's full visual
// record, NOT the current-streak-only view. That's intentional; the
// "before X relapse" photo IS the most valuable photo they own.

import React, { useEffect, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { listPhotoEntries } from '../../utils/dayJournal';
import { getPresignedUrl } from '../../utils/photoUrl';
import { MILESTONE_DAYS } from './MilestoneSheet';

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

const PhotoRow = ({ entry, dayNumber, isMilestone, onOpen }) => {
  const [url, setUrl] = useState(null);

  useEffect(() => {
    let cancelled = false;
    getPresignedUrl(entry.photoKey).then((u) => { if (!cancelled) setUrl(u); });
    return () => { cancelled = true; };
  }, [entry.photoKey]);

  let dateLabel = '';
  try {
    dateLabel = format(parseISO(entry.dayStr), 'MMM d').toUpperCase();
  } catch { /* ignore */ }

  return (
    <div className="journey-row">
      <div className="journey-row-meta">
        <div className={`journey-row-day${isMilestone ? ' milestone' : ''}`}>
          Day {dayNumber}
        </div>
        <div className="journey-row-date">{dateLabel}</div>
      </div>
      <div>
        <div
          className={`journey-row-photo${isMilestone ? ' milestone' : ''}`}
          onClick={() => onOpen(entry.dayStr)}
        >
          {url
            ? <img src={url} alt={`Day ${dayNumber}`} />
            : null}
        </div>
        {entry.text ? (
          <div className="journey-row-note">{entry.text}</div>
        ) : null}
      </div>
    </div>
  );
};

const JourneyView = ({ userData, onOpenDay, onAddFirstPhoto }) => {
  const photos = listPhotoEntries(userData?.notes);

  if (photos.length === 0) {
    return (
      <div className="journey-empty">
        <div>Your visual journey starts with one photo.</div>
        <div className="journey-empty-cta">
          <button type="button" className="calendar-journal-add-photo" onClick={onAddFirstPhoto}>
            Set your baseline
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="journey-view" data-no-swipe>
      {photos.map((entry, i) => {
        const dayNumber = dayCountFor(entry.dayStr, userData, i);
        const isMilestone = MILESTONE_SET.has(dayNumber);
        return (
          <PhotoRow
            key={entry.dayStr}
            entry={entry}
            dayNumber={dayNumber}
            isMilestone={isMilestone}
            onOpen={onOpenDay}
          />
        );
      })}
    </div>
  );
};

export default JourneyView;
