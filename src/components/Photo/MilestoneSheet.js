// src/components/Photo/MilestoneSheet.js
//
// The killer-feature sheet. Fires once when the user hits a streak
// milestone (Day 7 / 30 / 60 / 90 / 180 / 365) AND has both a baseline
// photo and today's photo. Pulls a server-composited side-by-side PNG
// with the TitanTrack watermark + day count and hands it to the native
// share sheet. Skippable; nothing forces sharing.
//
// Each milestone fires at most once per user. Tracked via
// userData.milestonesCelebrated[] so we don't re-prompt on repeat logs.

import React, { useState, useEffect, useRef, useCallback } from 'react';
import ReactDOM from 'react-dom';
import toast from 'react-hot-toast';
import useSheetSwipe from '../../hooks/useSheetSwipe';
import { getBaselinePhoto, readEntry } from '../../utils/dayJournal';
import { format, parseISO } from 'date-fns';
import '../../styles/BottomSheet.css';
import './Photo.css';

const API_URL = process.env.REACT_APP_API_URL || 'https://rossbased-app.onrender.com';

// Streak days that trigger a milestone celebration. Frozen — adding
// new ones is a deliberate decision (each is "DAY X — LOOK AT YOU"
// real estate; too many becomes noise).
export const MILESTONE_DAYS = [7, 30, 60, 90, 180, 365];

const MILESTONE_BLURB = {
  7: 'One week clean. The first hurdle most never clear.',
  30: 'A month. This is where the changes start to be undeniable.',
  60: 'Two months. People are noticing now.',
  90: 'Ninety days. The threshold most retention writing builds toward.',
  180: 'Half a year. This is a different person from Day 1.',
  365: 'A full year. The proof in the pictures speaks for itself.'
};

// Short milestone titles used in the Visual Journey caption — sit
// underneath the milestone photo as a "chapter name" in the strip.
// Distinct from MILESTONE_BLURB (longer celebration copy used in the
// share sheet).
export const MILESTONE_TITLE = {
  7: 'One Week',
  30: 'First Month',
  60: 'Two Months',
  90: 'Ninety Days',
  180: 'Half a Year',
  365: 'One Year'
};

// Phases of the Visual Journey — each is a swipeable "chapter" in
// the photo grid. Boundaries align with MILESTONE_DAYS so the gold
// milestone celebration always lives inside the phase it earned.
// "Baseline" is the foundational phase before any milestone has
// been reached.
export const JOURNEY_PHASES = [
  { id: 'baseline',  name: 'Baseline',     startDay: 1,   endDay: 6 },
  { id: 'week',      name: 'One Week',     startDay: 7,   endDay: 29 },
  { id: 'month',     name: 'First Month',  startDay: 30,  endDay: 59 },
  { id: 'twomonths', name: 'Two Months',   startDay: 60,  endDay: 89 },
  { id: 'ninety',    name: 'Ninety Days',  startDay: 90,  endDay: 179 },
  { id: 'halfyear',  name: 'Half a Year',  startDay: 180, endDay: 364 },
  { id: 'year',      name: 'One Year',     startDay: 365, endDay: Infinity }
];

/** Find the phase a given streak-day-number belongs to. */
export function phaseForDay(dayNumber) {
  return JOURNEY_PHASES.find(p => dayNumber >= p.startDay && dayNumber <= p.endDay)
    || JOURNEY_PHASES[0];
}

/**
 * Compute the next un-celebrated milestone the user qualifies for.
 * Returns null if there isn't one to celebrate right now.
 */
export function pendingMilestone(userData, currentStreak) {
  const celebrated = new Set(userData?.milestonesCelebrated || []);
  for (const d of MILESTONE_DAYS) {
    if (currentStreak >= d && !celebrated.has(d)) return d;
  }
  return null;
}

const MilestoneSheet = ({ open, onClose, userData, updateUserData, currentStreak, milestoneDay }) => {
  const [sheetReady, setSheetReady] = useState(false);
  const [compositePngUrl, setCompositePngUrl] = useState(null);
  const [compositePngBlob, setCompositePngBlob] = useState(null);
  const [composing, setComposing] = useState(true);
  const sheetPanelRef = useRef(null);

  // Animate open / cleanup on close.
  useEffect(() => {
    if (open) {
      setComposing(true);
      setCompositePngUrl(null);
      setCompositePngBlob(null);
      requestAnimationFrame(() => requestAnimationFrame(() => setSheetReady(true)));
    } else {
      setSheetReady(false);
      // Release blob URL when the sheet closes
      if (compositePngUrl) {
        URL.revokeObjectURL(compositePngUrl);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const closeSheet = useCallback((cb) => {
    setSheetReady(false);
    setTimeout(() => { if (cb) cb(); }, 300);
  }, []);

  useSheetSwipe(sheetPanelRef, open, () => closeSheet(() => onClose && onClose()));

  // Compose the side-by-side on open. Caller must have already verified
  // baseline + today photo exist — this just builds the share artifact.
  useEffect(() => {
    if (!open || !milestoneDay) return;
    let cancelled = false;

    (async () => {
      try {
        const baseline = getBaselinePhoto(userData?.notes);
        const today = format(new Date(), 'yyyy-MM-dd');
        const todayEntry = readEntry(userData?.notes, today);
        if (!baseline?.photoKey || !todayEntry.photoKey) {
          throw new Error('Missing baseline or today\'s photo');
        }

        // Day number for the baseline = days between baseline.dayStr
        // and the user's start date + 1. If we don't have a start date
        // we fall back to 1 (the user's first photo IS the baseline).
        let baselineDay = 1;
        if (userData?.startDate) {
          const start = typeof userData.startDate === 'string'
            ? parseISO(userData.startDate)
            : new Date(userData.startDate);
          const baselineDate = parseISO(baseline.dayStr);
          const diff = Math.floor((baselineDate - start) / (1000 * 60 * 60 * 24)) + 1;
          baselineDay = Math.max(1, diff);
        }

        const token = localStorage.getItem('token');
        const res = await fetch(`${API_URL}/api/photos/milestone`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            baselineKey: baseline.photoKey,
            currentKey: todayEntry.photoKey,
            baselineDay,
            currentDay: milestoneDay
          })
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || 'Could not build the milestone image');
        }

        const blob = await res.blob();
        if (cancelled) return;
        const url = URL.createObjectURL(blob);
        setCompositePngBlob(blob);
        setCompositePngUrl(url);
      } catch (err) {
        console.warn('Milestone compose failed:', err);
        if (!cancelled) toast.error(err.message || 'Could not build the milestone image');
      } finally {
        if (!cancelled) setComposing(false);
      }
    })();

    return () => { cancelled = true; };
  }, [open, milestoneDay, userData?.notes, userData?.startDate]);

  const recordCelebrated = useCallback(async () => {
    // Mark this milestone as celebrated so we don't prompt again next log.
    const list = Array.from(new Set([...(userData?.milestonesCelebrated || []), milestoneDay]));
    await updateUserData({ milestonesCelebrated: list });
  }, [milestoneDay, userData?.milestonesCelebrated, updateUserData]);

  const handleShare = async () => {
    if (!compositePngBlob) return;
    const file = new File([compositePngBlob], `titantrack-day-${milestoneDay}.png`, { type: 'image/png' });
    const shareData = {
      title: `Day ${milestoneDay} · TitanTrack`,
      text: `Day ${milestoneDay} held. Same person, ${milestoneDay - 1} days apart.`,
      files: [file]
    };

    if (navigator.canShare && navigator.canShare(shareData)) {
      try {
        await navigator.share(shareData);
      } catch {
        // user cancelled; not an error
      }
    } else {
      // Desktop fallback: download the image
      const a = document.createElement('a');
      a.href = compositePngUrl;
      a.download = `titantrack-day-${milestoneDay}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      toast.success('Image saved.');
    }

    await recordCelebrated();
    closeSheet(() => onClose && onClose());
  };

  const handleSave = async () => {
    if (!compositePngBlob || !compositePngUrl) return;
    const a = document.createElement('a');
    a.href = compositePngUrl;
    a.download = `titantrack-day-${milestoneDay}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    toast.success('Saved to your downloads.');
    await recordCelebrated();
    closeSheet(() => onClose && onClose());
  };

  const handleDismiss = async () => {
    await recordCelebrated();
    closeSheet(() => onClose && onClose());
  };

  if (!open || !milestoneDay) return null;

  return ReactDOM.createPortal(
    <div
      className={`sheet-backdrop${sheetReady ? ' open' : ''}`}
      onClick={() => closeSheet(() => onClose && onClose())}
    >
      <div
        ref={sheetPanelRef}
        className={`sheet-panel milestone-sheet${sheetReady ? ' open' : ''}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sheet-header" />

        <div className="milestone-headline">
          <span className="milestone-eyebrow">DAY {milestoneDay}. LOOK AT YOU.</span>
          <h2 className="milestone-title">{milestoneDay} days held.</h2>
          <p className="milestone-sub">{MILESTONE_BLURB[milestoneDay] || ''}</p>
        </div>

        <div className="milestone-preview">
          {composing && !compositePngUrl && (
            <div className="milestone-preview-loading">Composing…</div>
          )}
          {compositePngUrl && (
            <img src={compositePngUrl} alt={`Day 1 next to Day ${milestoneDay}`} />
          )}
        </div>

        <div className="milestone-actions">
          <button
            type="button"
            className="btn-primary"
            onClick={handleShare}
            disabled={!compositePngBlob}
          >
            Share
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={handleSave}
            disabled={!compositePngBlob}
            style={{ background: 'transparent' }}
          >
            Save to album
          </button>
          <button type="button" className="btn-ghost" onClick={handleDismiss}>
            Not now
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default MilestoneSheet;
