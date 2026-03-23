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

const TOTAL_NIGHTS = 30;
const LEGACY_STORAGE_KEY = 'titantrack_mindprogram';

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

// ============================================================
// COMPONENT
// ============================================================

const MindProgram = ({ isPremium, userData, updateUserData, openPlanModal, onShowInfo }) => {
  // Initialize from server data, with one-time localStorage migration
  const getInitialProgress = () => {
    const serverData = userData?.mindProgram;
    if (serverData && serverData.nightsCompleted > 0) {
      return { ...getDefaultData(), ...serverData };
    }
    
    // Migration: check localStorage for existing progress
    try {
      const legacy = localStorage.getItem(LEGACY_STORAGE_KEY);
      if (legacy) {
        const parsed = { ...getDefaultData(), ...JSON.parse(legacy) };
        // Migrate to server and clean up localStorage
        if (updateUserData && parsed.nightsCompleted > 0) {
          updateUserData({ mindProgram: parsed });
          localStorage.removeItem(LEGACY_STORAGE_KEY);
        }
        return parsed;
      }
    } catch (e) {}
    
    return serverData ? { ...getDefaultData(), ...serverData } : getDefaultData();
  };

  // Progress state
  const [progress, setProgress] = useState(getInitialProgress);

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

  // Sync from server when userData changes (cross-device)
  useEffect(() => {
    const serverData = userData?.mindProgram;
    if (serverData && serverData.nightsCompleted > progress.nightsCompleted) {
      setProgress({ ...getDefaultData(), ...serverData });
    }
  }, [userData?.mindProgram]); // eslint-disable-line react-hooks/exhaustive-deps

  // ============================================================
  // MEDIA SESSION (Lock screen controls + metadata)
  // ============================================================

  const setupMediaSession = useCallback(() => {
    if (!('mediaSession' in navigator)) return;

    navigator.mediaSession.metadata = new MediaMetadata({
      title: 'Based30',
      artist: 'TitanTrack',
      album: 'Mind Program',
      artwork: [
        { src: '/images/based30-cover.png', sizes: '512x512', type: 'image/png' }
      ]
    });

    navigator.mediaSession.setActionHandler('play', () => {
      if (audioRef.current) {
        audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
      }
    });

    navigator.mediaSession.setActionHandler('pause', () => {
      if (audioRef.current) {
        audioRef.current.pause();
        setIsPlaying(false);
      }
    });

    navigator.mediaSession.setActionHandler('seekto', (details) => {
      if (audioRef.current && details.seekTime != null) {
        audioRef.current.currentTime = details.seekTime;
        setCurrentTime(details.seekTime);
      }
    });
  }, []);

  // ============================================================
  // AUDIO HANDLERS (iOS-resilient)
  // ============================================================

  const handlePlay = useCallback(() => {
    if (!audioRef.current || audioError) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.loop = loopEnabled;

      // Attempt play — if iOS killed the session, reload and retry
      audioRef.current.play()
        .then(() => {
          setIsPlaying(true);
          setupMediaSession();
        })
        .catch((err) => {
          console.warn('MindProgram: Play failed, attempting recovery...', err);

          // iOS recovery: reload source and retry once
          audioRef.current.load();
          audioRef.current.loop = loopEnabled;
          audioRef.current.play()
            .then(() => {
              setIsPlaying(true);
              setupMediaSession();
            })
            .catch((retryErr) => {
              console.warn('MindProgram: Recovery failed', retryErr);
              setIsPlaying(false);
            });
        });
    }
  }, [isPlaying, loopEnabled, audioError, setupMediaSession]);

  const handleTimeUpdate = useCallback(() => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  }, []);

  const handleLoadedMetadata = useCallback(() => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
      setAudioLoaded(true);
      // Set recommended volume (works on desktop/Android, iOS ignores gracefully)
      try { audioRef.current.volume = 0.3; } catch (e) {}
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
    updateUserData({ mindProgram: updated });

    if (isNowComplete) {
      toast.success('Based30 complete — 30 nights');
    } else {
      toast.success(`Night ${newNights} logged`);
    }
  }, [progress, alreadyConfirmedToday, todayString, updateUserData]);

  const handleRestart = useCallback(() => {
    const fresh = getDefaultData();
    setProgress(fresh);
    updateUserData({ mindProgram: fresh });
    toast.success('Program restarted');
  }, [updateUserData]);

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

      {/* Hero — album art + dedicated play button */}
      <div className="mp-hero">
        <img 
          src="/images/based30-cover.png" 
          alt="Based30" 
          className="mp-hero-art"
        />
        <button
          className={`mp-play-btn ${isPlaying ? 'active' : ''}`}
          onClick={handlePlay}
          disabled={audioError}
        >
          {isPlaying ? (
            <svg width="18" height="18" viewBox="0 0 16 16" fill="currentColor">
              <rect x="3" y="2" width="3.5" height="12" rx="1" />
              <rect x="9.5" y="2" width="3.5" height="12" rx="1" />
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 16 16" fill="currentColor">
              <path d="M4 2.5v11l9-5.5L4 2.5z" />
            </svg>
          )}
        </button>
        <span className="mp-hero-subtitle">Nightly subliminal · 30 nights</span>
      </div>

      {/* Premium gate */}
      {!isPremium ? (
        <div className="mp-locked">
          <span className="mp-locked-text">Upgrade to Premium to unlock Based30</span>
          {openPlanModal && (
            <button className="mp-locked-btn" onClick={openPlanModal}>
              Upgrade
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Audio Controls — compact card */}
          <div className="mp-controls">
            {/* Scrubber */}
            <div className="mp-audio-track" onClick={handleProgressClick}>
              <div className="mp-audio-fill" style={{ width: `${audioProgress}%` }} />
              {isPlaying && (
                <div className="mp-audio-thumb" style={{ left: `${audioProgress}%` }} />
              )}
            </div>
            
            {/* Time + Loop row */}
            <div className="mp-controls-row">
              <span className="mp-track-time">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
              <div className="mp-loop-row">
                <span className="mp-loop-label">Loop</span>
                <button
                  className={`mp-toggle-switch ${loopEnabled ? 'active' : ''}`}
                  onClick={toggleLoop}
                  aria-label={loopEnabled ? 'Loop on' : 'Loop off'}
                >
                  <span className="mp-toggle-knob" />
                </button>
              </div>
            </div>

            <span className="mp-volume-rec">Volume 20–30% before sleeping</span>

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

              {progress.nightsCompleted > 0 && (
                <button className="mp-reset-link" onClick={handleRestart}>
                  Reset progress
                </button>
              )}
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

      {/* Info Bar — bottom strip, opens sheets via parent */}
      <div className="mp-info-bar">
        <button className="mp-info-btn" onClick={() => onShowInfo && onShowInfo('whatItDoes')}>
          What this does
        </button>
        <span className="mp-info-div" />
        <button className="mp-info-btn" onClick={() => onShowInfo && onShowInfo('howToUse')}>
          How to use
        </button>
      </div>
    </div>
  );
};

export default MindProgram;
