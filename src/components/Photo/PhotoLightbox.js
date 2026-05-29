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
      <button
        type="button"
        className="photo-lightbox-close"
        onClick={(e) => { e.stopPropagation(); onClose && onClose(); }}
        aria-label="Close photo"
      >
        ×
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
