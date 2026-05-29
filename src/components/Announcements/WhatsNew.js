// src/components/Announcements/WhatsNew.js
// What's New bottom sheet — auto-shows once per announcement on app load.
//
// LEGACY (v1) rendering: vertical scroll of markdown-ish body text.
// CAROUSEL (v2) rendering: when announcement has `slides[]`, render a
// horizontal swipable deck. Each slide = image + optional title/body/CTA.
// Backward-compatible — if the document has no slides, fall back to body.
//
// Sheet chrome (TT mark + "What's New" + version + footer) is the same in
// both modes. The body region is what swaps.

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import useSheetSwipe from '../../hooks/useSheetSwipe';
import './WhatsNew.css';
import '../../styles/BottomSheet.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001';
const SWIPE_THRESHOLD = 60;        // px of horizontal drag to commit to next slide
const SWIPE_DIRECTION_LOCK = 8;    // px before we lock horizontal vs vertical

const WhatsNew = ({ isLoggedIn, username, suppress }) => {
  const [announcement, setAnnouncement] = useState(null);
  const [showSheet, setShowSheet] = useState(false);
  const [sheetReady, setSheetReady] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const sheetPanelRef = useRef(null);
  const carouselRef = useRef(null);
  const navigate = useNavigate();
  const autoCheckedRef = useRef(false);

  const seenKey = username ? `titantrack-seen-announcement-${username}` : 'titantrack-seen-announcement';
  const isAdmin = username && ['rossbased', 'ross'].includes(username.toLowerCase());

  const checkAnnouncement = useCallback(async (delay = 1500) => {
    if (!isLoggedIn || !username) return;
    try {
      let url = `${API_URL}/api/announcements/latest`;
      const headers = {};
      if (isAdmin) {
        url += '?preview=true';
        const token = localStorage.getItem('token');
        if (token) headers.Authorization = `Bearer ${token}`;
      }

      const res = await fetch(url, { headers });
      if (!res.ok) return;
      const data = await res.json();
      if (!data || !data._id) return;

      const seenId = localStorage.getItem(seenKey);
      if (seenId === data._id) return;

      if (delay > 0) {
        setTimeout(() => {
          setAnnouncement(data);
          setCurrentSlide(0);
          setShowSheet(true);
        }, delay);
      } else {
        setAnnouncement(data);
        setCurrentSlide(0);
        setShowSheet(true);
      }
    } catch (err) {
      // Silent — announcements are non-critical
    }
  }, [isLoggedIn, isAdmin, username, seenKey]);

  useEffect(() => {
    if (!username || autoCheckedRef.current || suppress) return;
    autoCheckedRef.current = true;
    checkAnnouncement(1500);
  }, [username, checkAnnouncement, suppress]);

  useEffect(() => {
    const handleManualShow = () => checkAnnouncement(0);
    window.addEventListener('show-whats-new', handleManualShow);
    return () => window.removeEventListener('show-whats-new', handleManualShow);
  }, [checkAnnouncement]);

  useEffect(() => {
    if (showSheet) {
      requestAnimationFrame(() => requestAnimationFrame(() => setSheetReady(true)));
    } else {
      setSheetReady(false);
    }
  }, [showSheet]);

  const closeSheet = useCallback((cb) => {
    setSheetReady(false);
    setTimeout(() => { if (cb) cb(); }, 300);
  }, []);

  const dismiss = useCallback(() => {
    if (announcement?._id) {
      localStorage.setItem(seenKey, announcement._id);
    }
    closeSheet(() => setShowSheet(false));
  }, [announcement, closeSheet, seenKey]);

  // Vertical swipe-to-dismiss on the panel
  useSheetSwipe(sheetPanelRef, showSheet, dismiss);

  const hasSlides = Array.isArray(announcement?.slides) && announcement.slides.length > 0;
  const totalSlides = hasSlides ? announcement.slides.length : 0;

  const goToSlide = useCallback((index) => {
    if (!hasSlides) return;
    const clamped = Math.max(0, Math.min(totalSlides - 1, index));
    setCurrentSlide(clamped);
  }, [hasSlides, totalSlides]);

  const nextSlide = useCallback(() => goToSlide(currentSlide + 1), [goToSlide, currentSlide]);
  const prevSlide = useCallback(() => goToSlide(currentSlide - 1), [goToSlide, currentSlide]);

  // Keyboard arrow navigation — desktop
  useEffect(() => {
    if (!showSheet || !hasSlides) return;
    const onKey = (e) => {
      if (e.key === 'ArrowRight') nextSlide();
      else if (e.key === 'ArrowLeft') prevSlide();
      else if (e.key === 'Escape') dismiss();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showSheet, hasSlides, nextSlide, prevSlide, dismiss]);

  // Horizontal touch swipe — restricted to the carousel zone via
  // `data-no-swipe` so the vertical sheet-dismiss hook leaves it alone.
  useEffect(() => {
    const el = carouselRef.current;
    if (!el || !hasSlides) return;

    let startX = 0;
    let startY = 0;
    let lockedHorizontal = null; // null = undetermined; true = horizontal; false = vertical

    const onStart = (e) => {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      lockedHorizontal = null;
    };

    const onMove = (e) => {
      const dx = e.touches[0].clientX - startX;
      const dy = e.touches[0].clientY - startY;
      if (lockedHorizontal === null) {
        if (Math.abs(dx) > SWIPE_DIRECTION_LOCK || Math.abs(dy) > SWIPE_DIRECTION_LOCK) {
          lockedHorizontal = Math.abs(dx) > Math.abs(dy);
        }
      }
      if (lockedHorizontal) {
        // Block the page from also doing vertical scroll / sheet dismiss
        e.preventDefault();
      }
    };

    const onEnd = (e) => {
      if (!lockedHorizontal) return;
      const dx = e.changedTouches[0].clientX - startX;
      if (dx < -SWIPE_THRESHOLD) nextSlide();
      else if (dx > SWIPE_THRESHOLD) prevSlide();
    };

    el.addEventListener('touchstart', onStart, { passive: true });
    el.addEventListener('touchmove', onMove, { passive: false });
    el.addEventListener('touchend', onEnd, { passive: true });

    return () => {
      el.removeEventListener('touchstart', onStart);
      el.removeEventListener('touchmove', onMove);
      el.removeEventListener('touchend', onEnd);
    };
  }, [hasSlides, nextSlide, prevSlide]);

  const handleFeedback = () => {
    dismiss();
    setTimeout(() => navigate('/profile?feedback=true'), 350);
  };

  const handleSlideCta = (route) => {
    if (!route) return;
    dismiss();
    setTimeout(() => navigate(route), 350);
  };

  if (!showSheet || !announcement) return null;

  const formattedDate = new Date(announcement.publishedAt).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });

  return (
    <div
      className={`sheet-backdrop wn-backdrop${sheetReady ? ' open' : ''}`}
      onClick={dismiss}
    >
      <div
        ref={sheetPanelRef}
        className={`sheet-panel wn-sheet${sheetReady ? ' open' : ''}${hasSlides ? ' wn-sheet-deck' : ''}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sheet-header" />

        {/* Sticky header — TT mark, "What's New", version */}
        <div className="wn-modal-header">
          <img src="/tt-icon-white.png" alt="" className="wn-icon" />
          <h2 className="wn-title">What's New</h2>
          <span className="wn-version">v{announcement.version}</span>
          {announcement.status === 'draft' && (
            <span className="wn-draft-badge">Draft Preview</span>
          )}
          {hasSlides && (
            <div className="wn-progress" role="tablist" aria-label="Slide progress">
              {announcement.slides.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  role="tab"
                  aria-selected={i === currentSlide}
                  aria-label={`Slide ${i + 1} of ${totalSlides}`}
                  className={`wn-progress-bar${i <= currentSlide ? ' filled' : ''}`}
                  onClick={() => goToSlide(i)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Body — carousel (v2) or vertical scroll (legacy v1) */}
        {hasSlides ? (
          <div className="wn-carousel" ref={carouselRef} data-no-swipe>
            <div
              className="wn-carousel-track"
              style={{ transform: `translateX(-${currentSlide * 100}%)` }}
            >
              {announcement.slides.map((slide, i) => (
                <div key={i} className="wn-slide" aria-hidden={i !== currentSlide}>
                  <img
                    src={slide.image}
                    alt={slide.title || `Slide ${i + 1}`}
                    className="wn-slide-img"
                    draggable={false}
                  />
                  {(slide.title || slide.body) && (
                    <div className="wn-slide-text">
                      {slide.title && <h3 className="wn-slide-title">{slide.title}</h3>}
                      {slide.body && <p className="wn-slide-body">{slide.body}</p>}
                    </div>
                  )}
                  {slide.cta?.label && (
                    <button
                      type="button"
                      className="wn-slide-cta"
                      onClick={() => handleSlideCta(slide.cta.route)}
                    >
                      {slide.cta.label}  →
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="wn-modal-content">
            {announcement.title && (
              <h3 className="wn-announcement-title">{announcement.title}</h3>
            )}
            <div className="wn-body">
              {(announcement.body || '').split('\n').map((line, i) => {
                const trimmed = line.trim();
                if (!trimmed) return null;
                if (trimmed.startsWith('#')) {
                  const headerText = trimmed.replace(/^#+\s*/, '');
                  return <h4 key={i} className="wn-section-header">{headerText}</h4>;
                }
                return <p key={i}>{trimmed}</p>;
              })}
            </div>
            <span className="wn-date">{formattedDate}</span>
          </div>
        )}

        {/* Sticky footer — feedback link + Got it */}
        <div className="wn-modal-footer">
          <button className="wn-feedback" onClick={handleFeedback}>
            Got feedback? Let us know
          </button>
          <button className="wn-dismiss" onClick={dismiss}>
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};

export default WhatsNew;
