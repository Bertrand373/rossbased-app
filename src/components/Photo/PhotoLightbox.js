// src/components/Photo/PhotoLightbox.js
//
// Tap-to-expand fullscreen view for a single photo. Lives outside the
// normal sheet vocabulary on purpose: it covers everything, locks the
// viewport, and gets dismissed by any tap or the X. Used by the
// Calendar journal panel and the Visual Journey view.
//
// Renders as a portal at document.body so it sits above sheets,
// modals, and the bottom nav. Closes on backdrop tap, X click, or
// Escape key.

import React, { useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom';
import './Photo.css';

const PhotoLightbox = ({ open, src, alt = '', onClose }) => {
  const handleEscape = useCallback((e) => {
    if (e.key === 'Escape') onClose && onClose();
  }, [onClose]);

  // Lock body scroll + listen for Esc while open.
  useEffect(() => {
    if (!open) return undefined;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleEscape);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', handleEscape);
    };
  }, [open, handleEscape]);

  if (!open || !src) return null;

  return ReactDOM.createPortal(
    <div className="photo-lightbox" onClick={() => onClose && onClose()}>
      {/* Close X — same 18×18 SVG used in sheet-close-desktop across the app
          (CircleSheet, Tracker, TVFeed, AIChat, NotesLibrary). Inlined to
          match the existing pattern rather than introducing a shared
          component for a single glyph. */}
      <button
        type="button"
        className="photo-lightbox-close"
        onClick={(e) => { e.stopPropagation(); onClose && onClose(); }}
        aria-label="Close photo"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
      <img
        className="photo-lightbox-img"
        src={src}
        alt={alt}
        onClick={(e) => e.stopPropagation()}
      />
    </div>,
    document.body
  );
};

export default PhotoLightbox;
