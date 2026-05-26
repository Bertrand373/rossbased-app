// src/components/AdminTV/AdminTV.js
//
// TTTV producer-side tool. Where Ross uploads shorts.
//
// Single screen, three sections:
//   1. Upload — drag-drop an MP4. We probe duration + first-frame poster
//      in the browser (canvas), so the server gets both as part of one POST.
//   2. Form — title + optional Oracle overlay (italic-serif line + timestamp)
//      + publish toggle. Defaults to "draft" so Ross can stage before going
//      live to members.
//   3. List — every uploaded episode with publish/draft status, quick
//      unpublish/publish toggle, and delete.
//
// Authorization is enforced server-side (adminCheck on every write route).
// The route mount in App.js is gated by the same isAdmin check, so non-admins
// get a redirect before they ever see this component — defense in depth.
//
// Things this component intentionally doesn't do (yet):
//   - Reorder via drag-and-drop. PATCH /videos/:id supports it; UI is a
//     v2 if Ross ends up with enough episodes that order matters.
//   - Edit-in-place for title / Oracle overlay. Today: delete and re-upload.
//     Adding inline edit is a 1-hour PR when it becomes useful.
//   - Progress bar during upload. Files are small (≤25MB typical), and a
//     simple "Uploading…" button state covers the common case. Real progress
//     would need XHR or fetch + a ReadableStream — out of scope for v1.

import React, { useState, useEffect, useRef, useCallback } from 'react';
import toast from 'react-hot-toast';
import { FaUpload, FaTrash, FaCheck, FaTimes, FaPlay } from 'react-icons/fa';
import {
  listAllVideos,
  uploadVideo,
  updateVideo,
  deleteVideo
} from '../../services/tttvService';
import './AdminTV.css';

// Pull duration, dimensions, and a first-frame poster from a video File.
// Seeks slightly past 0 so we don't capture a black "video element initial
// state" frame — most encoders have at least a quarter-second of header
// frames before real content starts.
function probeVideo(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;
    video.src = url;

    let done = false;

    video.onloadedmetadata = () => {
      const seek = Math.min(0.5, (video.duration || 0) / 4);
      video.currentTime = seek;
    };

    video.onseeked = () => {
      if (done) return;
      done = true;
      try {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0);
        canvas.toBlob(
          (blob) => {
            resolve({
              posterBlob: blob,
              duration: video.duration,
              width: video.videoWidth,
              height: video.videoHeight,
              previewUrl: url
            });
          },
          'image/jpeg',
          0.85
        );
      } catch (e) {
        URL.revokeObjectURL(url);
        reject(e);
      }
    };

    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Could not read this video file'));
    };
  });
}

function formatDuration(sec) {
  const s = Math.floor(sec || 0);
  const m = Math.floor(s / 60);
  const r = s % 60;
  if (m > 0) return `${m}m ${String(r).padStart(2, '0')}s`;
  return `${r}s`;
}

const AdminTV = () => {
  // ─── List state ──────────────────────────────────────────────
  const [videos, setVideos] = useState([]);
  const [loadingList, setLoadingList] = useState(true);
  const [errorList, setErrorList] = useState(null);

  // ─── Upload state ────────────────────────────────────────────
  const [file, setFile] = useState(null);
  const [meta, setMeta] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [posterBlob, setPosterBlob] = useState(null);
  const [title, setTitle] = useState('');
  const [oracleText, setOracleText] = useState('');
  const [oracleAt, setOracleAt] = useState(0);
  const [isPublished, setIsPublished] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);

  // ─── Fetch list ──────────────────────────────────────────────
  const fetchVideos = useCallback(async () => {
    setLoadingList(true);
    setErrorList(null);
    try {
      const list = await listAllVideos();
      setVideos(list);
    } catch (e) {
      setErrorList(e.message || 'Failed to load episodes');
    } finally {
      setLoadingList(false);
    }
  }, []);

  useEffect(() => {
    fetchVideos();
  }, [fetchVideos]);

  // Clean up the preview blob URL on unmount.
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  // ─── File handlers ───────────────────────────────────────────
  const handleFile = useCallback(async (f) => {
    if (!f || !f.type.startsWith('video/')) {
      toast.error('Please choose a video file');
      return;
    }
    setFile(f);
    // Default the title to the filename (sans extension) — easy to edit if wrong.
    setTitle(f.name.replace(/\.[^.]+$/, ''));
    try {
      const probe = await probeVideo(f);
      setMeta(probe);
      setPosterBlob(probe.posterBlob);
      setPreviewUrl(probe.previewUrl);
    } catch (e) {
      toast.error(e.message || 'Could not read video metadata');
    }
  }, []);

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  };
  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };
  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const f = e.dataTransfer?.files?.[0];
    if (f) handleFile(f);
  };

  const resetUpload = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(null);
    setMeta(null);
    setPreviewUrl(null);
    setPosterBlob(null);
    setTitle('');
    setOracleText('');
    setOracleAt(0);
    setIsPublished(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // ─── Submit ──────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file || !meta) return;
    setUploading(true);
    try {
      await uploadVideo({
        videoFile: file,
        posterBlob,
        title,
        durationSec: meta.duration,
        oracleOverlayText: oracleText,
        oracleOverlayAt: oracleAt,
        isPublished
      });
      toast.success('Episode uploaded.');
      resetUpload();
      fetchVideos();
    } catch (err) {
      toast.error(err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  // ─── List actions ────────────────────────────────────────────
  const togglePublish = async (v) => {
    try {
      const updated = await updateVideo(v._id, { isPublished: !v.isPublished });
      setVideos((vs) => vs.map((item) => (item._id === v._id ? updated : item)));
      toast.success(updated.isPublished ? 'Published.' : 'Moved to drafts.');
    } catch (err) {
      toast.error(err.message || 'Could not update');
    }
  };

  const handleDelete = async (v) => {
    if (!window.confirm(`Delete "${v.title}"? The video file goes too.`)) return;
    try {
      await deleteVideo(v._id);
      setVideos((vs) => vs.filter((item) => item._id !== v._id));
      toast.success('Deleted.');
    } catch (err) {
      toast.error(err.message || 'Could not delete');
    }
  };

  // Aspect-ratio nudge — TTTV is 9:16 vertical. Doesn't block upload (Ross
  // might want a 1:1 clip occasionally), just warns visibly.
  const aspectWarning =
    meta && meta.width > meta.height
      ? 'Heads up: this is landscape. TTTV is built for 9:16 vertical.'
      : null;

  return (
    <div className="admin-tv">
      <header className="admin-tv-head">
        <h1 className="admin-tv-title">TTTV · Admin</h1>
        <p className="admin-tv-tagline">Upload, publish, and curate shorts for premium members.</p>
      </header>

      {/* ─── UPLOAD ─────────────────────────────────────────── */}
      <section className="admin-tv-section">
        <h2 className="admin-tv-section-label">Upload episode</h2>

        {!file ? (
          <div
            className={`admin-tv-dropzone${dragActive ? ' active' : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                fileInputRef.current?.click();
              }
            }}
          >
            <FaUpload className="admin-tv-dropzone-icon" />
            <div className="admin-tv-dropzone-text">
              Drop an MP4 here, or click to browse
            </div>
            <div className="admin-tv-dropzone-sub">
              Vertical 9:16 · max 200 MB · first frame becomes the poster
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="video/*"
              hidden
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            />
          </div>
        ) : (
          <div className="admin-tv-stage">
            <div className="admin-tv-preview">
              {previewUrl && (
                <video
                  className="admin-tv-preview-video"
                  src={previewUrl}
                  controls
                  playsInline
                  muted
                />
              )}
              <div className="admin-tv-preview-meta">
                {meta && (
                  <>
                    <span>{meta.width}×{meta.height}</span>
                    <span aria-hidden="true">·</span>
                    <span>{formatDuration(meta.duration)}</span>
                  </>
                )}
              </div>
              {aspectWarning && (
                <div className="admin-tv-warning">{aspectWarning}</div>
              )}
            </div>

            <form className="admin-tv-form" onSubmit={handleSubmit}>
              <label className="admin-tv-field">
                <span className="admin-tv-field-label">Title</span>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  maxLength={200}
                  className="admin-tv-input"
                />
              </label>

              <fieldset className="admin-tv-fieldset">
                <legend className="admin-tv-fieldset-legend">Oracle overlay (optional)</legend>
                <p className="admin-tv-fieldset-hint">
                  One italic-serif line that fades in mid-video. The differentiator.
                </p>
                <label className="admin-tv-field">
                  <span className="admin-tv-field-label">Line</span>
                  <input
                    type="text"
                    value={oracleText}
                    onChange={(e) => setOracleText(e.target.value)}
                    placeholder="e.g. The reset isn't a punishment."
                    maxLength={120}
                    className="admin-tv-input"
                  />
                </label>
                <label className="admin-tv-field">
                  <span className="admin-tv-field-label">Timestamp (seconds)</span>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={oracleAt}
                    onChange={(e) => setOracleAt(parseFloat(e.target.value) || 0)}
                    className="admin-tv-input admin-tv-input-narrow"
                  />
                </label>
              </fieldset>

              <label className="admin-tv-toggle">
                <input
                  type="checkbox"
                  checked={isPublished}
                  onChange={(e) => setIsPublished(e.target.checked)}
                />
                <span>Publish immediately (otherwise saved as draft)</span>
              </label>

              <div className="admin-tv-form-actions">
                <button
                  type="button"
                  className="admin-tv-btn admin-tv-btn-ghost"
                  onClick={resetUpload}
                  disabled={uploading}
                >
                  Discard
                </button>
                <button
                  type="submit"
                  className="admin-tv-btn admin-tv-btn-primary"
                  disabled={uploading}
                >
                  {uploading ? 'Uploading…' : 'Upload episode'}
                </button>
              </div>
            </form>
          </div>
        )}
      </section>

      {/* ─── EPISODE LIST ───────────────────────────────────── */}
      <section className="admin-tv-section">
        <h2 className="admin-tv-section-label">Episodes ({videos.length})</h2>

        {loadingList ? (
          <div className="admin-tv-empty">Loading…</div>
        ) : errorList ? (
          <div className="admin-tv-empty admin-tv-empty-error">{errorList}</div>
        ) : videos.length === 0 ? (
          <div className="admin-tv-empty">No episodes yet. Upload your first above.</div>
        ) : (
          <ul className="admin-tv-list">
            {videos.map((v) => (
              <li
                key={v._id}
                className={`admin-tv-row${v.isPublished ? ' published' : ' draft'}`}
              >
                <div className="admin-tv-row-poster">
                  {v.posterUrl ? (
                    <img src={v.posterUrl} alt="" />
                  ) : (
                    <div className="admin-tv-row-poster-empty">
                      <FaPlay />
                    </div>
                  )}
                </div>
                <div className="admin-tv-row-body">
                  <div className="admin-tv-row-title">
                    <span className="admin-tv-row-ep">EP {v.episode}</span>
                    <span className="admin-tv-row-name">{v.title}</span>
                  </div>
                  <div className="admin-tv-row-sub">
                    {formatDuration(v.durationSec)}
                    {v.oracleOverlay?.text ? ' · Oracle overlay' : ''}
                  </div>
                </div>
                <div className="admin-tv-row-status">
                  <span
                    className={`admin-tv-status${
                      v.isPublished ? ' admin-tv-status-published' : ' admin-tv-status-draft'
                    }`}
                  >
                    {v.isPublished ? 'Published' : 'Draft'}
                  </span>
                </div>
                <div className="admin-tv-row-actions">
                  <button
                    type="button"
                    className="admin-tv-row-btn"
                    onClick={() => togglePublish(v)}
                    aria-label={v.isPublished ? 'Unpublish' : 'Publish'}
                    title={v.isPublished ? 'Unpublish' : 'Publish'}
                  >
                    {v.isPublished ? <FaTimes /> : <FaCheck />}
                  </button>
                  <button
                    type="button"
                    className="admin-tv-row-btn admin-tv-row-btn-danger"
                    onClick={() => handleDelete(v)}
                    aria-label="Delete"
                    title="Delete"
                  >
                    <FaTrash />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
};

export default AdminTV;
