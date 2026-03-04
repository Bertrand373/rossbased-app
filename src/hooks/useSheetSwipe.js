// src/hooks/useSheetSwipe.js
// Shared swipe-to-dismiss hook for all bottom sheets
//
// WHY THIS EXISTS:
// React's synthetic onTouchMove handlers are passive by default — iOS Safari
// ignores e.preventDefault() in passive listeners, so it claims scroll gestures
// before our code can intercept them. This hook attaches native non-passive
// listeners directly so preventDefault() fires before iOS makes its decision.
//
// SCROLL DISAMBIGUATION:
// If the touch started inside a scrollable child that hasn't reached scroll-top,
// native scroll is allowed. Once at top (or no scrollable child), swipe takes over.

import { useEffect } from 'react';

const useSheetSwipe = (panelRef, isOpen, onDismiss, threshold = 100) => {
  useEffect(() => {
    const panel = panelRef.current;
    if (!panel || !isOpen) return;

    let startY = 0;
    let delta = 0;
    let dragging = false;
    let scrollableEl = null;

    // Walk up the DOM from the touch target looking for a scrollable ancestor
    const findScrollable = (target) => {
      let el = target;
      while (el && el !== panel) {
        const oy = window.getComputedStyle(el).overflowY;
        if ((oy === 'auto' || oy === 'scroll') && el.scrollHeight > el.clientHeight + 1) return el;
        el = el.parentElement;
      }
      return null;
    };

    const onStart = (e) => {
      // If touch starts inside a no-swipe zone (e.g. sliders), don't intercept
      if (e.target.closest('[data-no-swipe]')) {
        startY = -1; // sentinel — onMove will bail immediately
        return;
      }
      startY = e.touches[0].clientY;
      delta = 0;
      dragging = false;
      scrollableEl = findScrollable(e.target);
    };

    const onMove = (e) => {
      if (startY === -1) return; // touch started in no-swipe zone
      delta = e.touches[0].clientY - startY;
      if (delta <= 0) return;
      // If inside a scrollable area that still has content above, let it scroll
      if (scrollableEl && scrollableEl.scrollTop > 2) return;
      // Must preventDefault BEFORE iOS claims the gesture (~10px threshold)
      e.preventDefault();
      dragging = true;
      panel.style.transition = 'none';
      panel.style.transform = `translateY(${delta}px)`;
    };

    const onEnd = () => {
      if (startY === -1 || !dragging) return;
      if (delta > threshold) {
        // Call onDismiss immediately — lets component set sheetReady(false) now
        // so the backdrop CSS transition fades in sync with the panel sliding down
        onDismiss();
        panel.style.transition = 'transform 250ms ease-out';
        panel.style.transform = 'translateY(100%)';
        setTimeout(() => {
          if (panel) {
            panel.style.transition = '';
            panel.style.transform = '';
          }
        }, 250);
      } else {
        panel.style.transition = 'transform 250ms ease-out';
        panel.style.transform = '';
        setTimeout(() => {
          if (panel) panel.style.transition = '';
        }, 250);
      }
      dragging = false;
      delta = 0;
    };

    panel.addEventListener('touchstart', onStart, { passive: true });
    panel.addEventListener('touchmove', onMove, { passive: false });
    panel.addEventListener('touchend', onEnd, { passive: true });

    return () => {
      panel.removeEventListener('touchstart', onStart);
      panel.removeEventListener('touchmove', onMove);
      panel.removeEventListener('touchend', onEnd);
    };
  }, [panelRef, isOpen, onDismiss, threshold]);
};

export default useSheetSwipe;
