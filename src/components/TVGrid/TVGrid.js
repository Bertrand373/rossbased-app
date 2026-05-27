// src/components/TVGrid/TVGrid.js
//
// The /tv landing — Atlas-style 2-column grid of episode cards. Lets
// members browse the curated library and pick what to watch, instead
// of dropping them straight into the feed.
//
// Each card is a poster-fill with title + episode + duration overlaid
// at the bottom and an "EP N" badge top-right. Watched episodes are
// dimmed with a quiet "WATCHED" pill so the user can see what they
// haven't covered yet at a glance.
//
// Tap a card → parent (TVFeed) flips to player mode at that episode
// (state lives in the ?play=id URL param, so the back button works
// naturally and the URL is shareable). Tap the X → exit to /.
//
// Watched tracking is localStorage-based for now (key `tttv_watched`,
// JSON array of video IDs). The feed component writes to it when a
// video crosses 80% playback. Server-side history is a future hop.

import React from 'react';
import { FaTimes, FaPlay } from 'react-icons/fa';
import './TVGrid.css';

function formatDuration(sec) {
  const s = Math.floor(sec || 0);
  const m = Math.floor(s / 60);
  const r = s % 60;
  if (m > 0) return `${m}:${String(r).padStart(2, '0')}`;
  return `0:${String(r).padStart(2, '0')}`;
}

// Read the watched-IDs set from localStorage. Returns a Set for O(1)
// membership checks during the render. Wrapped in try/catch because
// JSON.parse on garbage throws and we'd rather show the grid than crash.
export function getWatchedSet() {
  try {
    const raw = localStorage.getItem('tttv_watched');
    return new Set(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set();
  }
}

// Append an ID to the watched set. The feed calls this when playback
// crosses 80% of the video's duration — same threshold YouTube uses
// for "counted as a view" in their analytics.
export function markWatched(id) {
  if (!id) return;
  try {
    const set = getWatchedSet();
    if (set.has(id)) return;
    set.add(id);
    localStorage.setItem('tttv_watched', JSON.stringify([...set]));
  } catch {
    /* localStorage full or disabled — fail silently */
  }
}

const TVGrid = ({ videos, onPlay, onExit }) => {
  const watched = getWatchedSet();

  return (
    <div className="tv-grid">
      {/* Header — TTTV mark center, X top-right (matches the player chrome
          so the surface feels like the same family). */}
      <header className="tv-grid-header">
        <img
          src="/tttv-logo-white.png"
          alt="TitanTrack TV"
          className="tv-grid-header-mark"
        />
        <button
          className="tv-grid-exit"
          onClick={onExit}
          aria-label="Close"
          type="button"
        >
          <FaTimes />
        </button>
      </header>

      {/* Header → straight to cards. The intro "SESSIONS / N episodes
          curated by Ross" was meta nobody cares about. Premium libraries
          (Mubi, Criterion) don't tell you how many films they have either —
          the grid itself speaks. Restraint over chatter. */}

      {/* 2-column card grid. order: -1 in the API sort gives newest-first;
          the order field also lets us reorder in admin. */}
      <ul className="tv-grid-cards">
        {videos.map((video) => {
          const isWatched = watched.has(video._id);
          const ep = String(video.episode || '').padStart(2, '0');
          return (
            <li key={video._id} className={`tv-grid-card${isWatched ? ' watched' : ''}`}>
              <button
                type="button"
                className="tv-grid-card-btn"
                onClick={() => onPlay(video._id)}
                aria-label={`Play episode ${ep}: ${video.title}`}
              >
                {/* Poster fills the card. If no poster, fall back to a
                    quiet gold-tinted gradient so we don't show broken-image
                    chrome on freshly uploaded shorts whose poster generation
                    hasn't completed. */}
                {video.posterUrl ? (
                  <img
                    src={video.posterUrl}
                    alt=""
                    className="tv-grid-card-poster"
                    loading="lazy"
                  />
                ) : (
                  <div className="tv-grid-card-poster tv-grid-card-poster-fallback">
                    <FaPlay />
                  </div>
                )}

                {/* Corner badge removed — was Atlas-verbatim. Episode #
                    moved to the meta line below the title where it sits
                    quietly with the duration instead of competing with
                    the poster for the corner real estate. */}

                {/* Watched pill — only when seen. Quiet, top-left. */}
                {isWatched && (
                  <div className="tv-grid-card-watched">WATCHED</div>
                )}

                {/* Bottom scrim + text. Title gets the full card width now
                    that the badge is gone — wraps to 2 lines if needed,
                    confident single-line otherwise. */}
                <div className="tv-grid-card-scrim" aria-hidden="true" />
                <div className="tv-grid-card-info">
                  <div className="tv-grid-card-title">{video.title}</div>
                  <div className="tv-grid-card-meta">
                    <span className="tv-grid-card-meta-ep">EP {ep}</span>
                    <span className="tv-grid-card-meta-sep">·</span>
                    <span>{formatDuration(video.durationSec)}</span>
                  </div>
                </div>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default TVGrid;
