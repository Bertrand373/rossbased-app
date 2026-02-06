// MindProgram.js - Based30 Mind Program
// Subliminal audio player + 30-night tracker
// Lives at top of UrgeToolkit, always accessible

import React, { useState, useEffect, useRef, useCallback } from 'react';
import toast from 'react-hot-toast';
import './MindProgram.css';

// ============================================================
// CONFIGURATION
// ============================================================

// Audio source — update this path when hosting the MP3
// Option A: Serve from your public directory → '/audio/based30.mp3'
// Option B: Serve from Render backend → `${process.env.REACT_APP_API_URL}/audio/based30.mp3`
const AUDIO_SRC = '/audio/based30.mp3';

const STORAGE_KEY = 'titantrack_mindprogram';
const TOTAL_NIGHTS = 30;

// ============================================================
// HELPERS
// ============================================================

const getTodayString = () => new Date().toISOString().split('T')[0];

const getDefaultData = () => ({
  nightsCompleted: 0,
  startDate: null,
  lastConfirmedDate: null,
  isComplete: false
});

const loadProgress = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return { ...getDefaultData(), ...JSON.parse(stored) };
  } catch (e) {
    console.warn('MindProgram: Could not load progress', e);
  }
  return getDefaultData();
};

const saveProgress = (data) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.warn('MindProgram: Could not save progress', e);
  }
};

// ============================================================
// COMPONENT
// ============================================================

const MindProgram = ({ isPremium }) => {
  // Progress state
  const [progress, setProgress] = useState(loadProgress);
  const [showInstructions, setShowInstructions] = useState(false);

  // Audio state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [loopEnabled, setLoopEnabled] = useState(true);
  const [audioLoaded, setAudioLoaded] = useState(false);
  const [audioError, setAudioError] = useState(false);

  const audioRef = useRef(null);

  // Derived state
  const todayString = getTodayString();
  const alreadyConfirmedToday = progress.lastConfirmedDate === todayString;
  const progressPercent = (progress.nightsCompleted / TOTAL_NIGHTS) * 100;

  // ============================================================
  // AUDIO HANDLERS
  // ============================================================

  const handlePlay = useCallback(() => {
    if (!audioRef.current || audioError) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.loop = loopEnabled;
      audioRef.current.play()
        .then(() => setIsPlaying(true))
        .catch((err) => {
          console.warn('MindProgram: Playback failed', err);
          setIsPlaying(false);
        });
    }
  }, [isPlaying, loopEnabled, audioError]);

  const handleTimeUpdate = useCallback(() => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  }, []);

  const handleLoadedMetadata = useCallback(() => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
      setAudioLoaded(true);
    }
  }, []);

  const handleAudioError = useCallback(() => {
    setAudioError(true);
    setAudioLoaded(false);
  }, []);

  const handleProgressClick = useCallback((e) => {
    if (!audioRef.current || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const pct = Math.max(0, Math.min(1, x / rect.width));
    audioRef.current.currentTime = pct * duration;
    setCurrentTime(pct * duration);
  }, [duration]);

  const toggleLoop = useCallback(() => {
    setLoopEnabled(prev => {
      const next = !prev;
      if (audioRef.current) audioRef.current.loop = next;
      return next;
    });
  }, []);

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
    };
  }, []);

  // ============================================================
  // PROGRESS HANDLERS
  // ============================================================

  const handleConfirmNight = useCallback(() => {
    if (alreadyConfirmedToday || progress.isComplete) return;

    const newNights = progress.nightsCompleted + 1;
    const isNowComplete = newNights >= TOTAL_NIGHTS;

    const updated = {
      ...progress,
      nightsCompleted: newNights,
      lastConfirmedDate: todayString,
      startDate: progress.startDate || todayString,
      isComplete: isNowComplete
    };

    setProgress(updated);
    saveProgress(updated);

    if (isNowComplete) {
      toast.success('Based30 complete — 30 nights');
    } else {
      toast.success(`Night ${newNights} logged`);
    }
  }, [progress, alreadyConfirmedToday, todayString]);

  const handleRestart = useCallback(() => {
    const fresh = getDefaultData();
    setProgress(fresh);
    saveProgress(fresh);
    toast.success('Program restarted');
  }, []);

  // ============================================================
  // FORMAT HELPERS
  // ============================================================

  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const audioProgress = duration > 0 ? (currentTime / duration) * 100 : 0;

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <div className="mp-section">
      {/* Hidden audio element */}
      <audio
        ref={audioRef}
        src={AUDIO_SRC}
        preload="metadata"
        loop={loopEnabled}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onError={handleAudioError}
        onEnded={() => { if (!loopEnabled) setIsPlaying(false); }}
      />

      {/* Section label */}
      <div className="mp-label">MIND PROGRAM</div>

      {/* Header */}
      <div className="mp-header">
        <h2 className="mp-title">Based30</h2>
        <p className="mp-desc">Nightly subliminal audio · 30 nights</p>
      </div>

      {/* Premium gate */}
      {!isPremium ? (
        <div className="mp-locked">
          <span className="mp-locked-text">Subscribe to unlock the Based30 Mind Program</span>
        </div>
      ) : (
        <>
          {/* Audio Player */}
          <div className="mp-player">
            <div className="mp-player-main">
              <button
                className={`mp-play-btn ${isPlaying ? 'active' : ''}`}
                onClick={handlePlay}
                disabled={audioError}
              >
                {isPlaying ? (
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                    <rect x="3" y="2" width="3.5" height="12" rx="1" />
                    <rect x="9.5" y="2" width="3.5" height="12" rx="1" />
                  </svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M4 2.5v11l9-5.5L4 2.5z" />
                  </svg>
                )}
              </button>

              <div className="mp-track-info">
                <div className="mp-track-row">
                  <span className="mp-track-name">Based30</span>
                  <div className="mp-track-meta">
                    <span
                      className={`mp-loop-indicator ${loopEnabled ? 'on' : ''}`}
                      onClick={toggleLoop}
                      role="button"
                      tabIndex={0}
                      aria-label={loopEnabled ? 'Loop on' : 'Loop off'}
                    >
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="17 1 21 5 17 9" />
                        <path d="M3 11V9a4 4 0 0 1 4-4h14" />
                        <polyline points="7 23 3 19 7 15" />
                        <path d="M21 13v2a4 4 0 0 1-4 4H3" />
                      </svg>
                    </span>
                    <span className="mp-track-time">
                      {formatTime(currentTime)} / {formatTime(duration)}
                    </span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="mp-audio-track" onClick={handleProgressClick}>
                  <div className="mp-audio-fill" style={{ width: `${audioProgress}%` }} />
                  {isPlaying && (
                    <div className="mp-audio-thumb" style={{ left: `${audioProgress}%` }} />
                  )}
                </div>
              </div>
            </div>

            {audioError && (
              <span className="mp-audio-error">Audio file not available</span>
            )}
          </div>

          {/* 30-Night Progress */}
          {!progress.isComplete ? (
            <div className="mp-tracker">
              <div className="mp-tracker-header">
                <span className="mp-tracker-label">PROGRESS</span>
                <span className="mp-tracker-count">
                  {progress.nightsCompleted}
                  <span className="mp-tracker-total"> / {TOTAL_NIGHTS}</span>
                </span>
              </div>

              <div className="mp-progress-bar">
                <div className="mp-progress-fill" style={{ width: `${progressPercent}%` }} />
              </div>

              <button
                className={`mp-confirm-btn ${alreadyConfirmedToday ? 'confirmed' : ''}`}
                onClick={handleConfirmNight}
                disabled={alreadyConfirmedToday}
              >
                {alreadyConfirmedToday
                  ? `Night ${progress.nightsCompleted} confirmed`
                  : 'I listened last night'}
              </button>
            </div>
          ) : (
            <div className="mp-complete">
              <div className="mp-progress-bar">
                <div className="mp-progress-fill" style={{ width: '100%' }} />
              </div>

              <div className="mp-complete-info">
                <span className="mp-complete-title">Program Complete</span>
                <span className="mp-complete-desc">
                  30 consecutive nights — subconscious reprogrammed
                </span>
              </div>

              <button className="mp-restart-btn" onClick={handleRestart}>
                Restart program
              </button>
            </div>
          )}
        </>
      )}

      {/* Instructions accordion */}
      <button
        className="mp-instructions-toggle"
        onClick={() => setShowInstructions(!showInstructions)}
      >
        <span className="mp-instructions-label">How it works</span>
        <span className={`mp-instructions-arrow ${showInstructions ? 'open' : ''}`}>↓</span>
      </button>

      {showInstructions && (
        <div className="mp-instructions">
          <div className="mp-instr-item">
            <span className="mp-instr-num">01</span>
            <span className="mp-instr-text">
              Play every night on repeat while you sleep. Low to medium volume.
            </span>
          </div>
          <div className="mp-instr-item">
            <span className="mp-instr-num">02</span>
            <span className="mp-instr-text">
              Use a sleep headband or comfortable headphones that won't fall out.
            </span>
          </div>
          <div className="mp-instr-item">
            <span className="mp-instr-num">03</span>
            <span className="mp-instr-text">
              Confirm each morning. 30 consecutive nights — no skipping.
            </span>
          </div>
          <div className="mp-instr-item">
            <span className="mp-instr-num">04</span>
            <span className="mp-instr-text">
              The audio is sped up intentionally. Your subconscious processes it.
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default MindProgram;
