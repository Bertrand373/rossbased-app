// useScrollDirection.js - TITANTRACK
// Track scroll direction on a scrollable element. Used by AIChat to slide
// a sticky thread title in when the user scrolls UP through history and
// hide it when they scroll DOWN toward the latest message.
//
// Returns { direction, scrollTop }:
//   direction = 'up' when the user scrolls toward the top (scrollTop decreasing)
//   direction = 'down' when scrolling toward the bottom (scrollTop increasing)
//   direction = null on initial mount
//
// `threshold` (default 8px) ignores micro-movements so the title doesn't
// flicker from sub-pixel scroll noise (trackpad inertia, rubber-banding).
// Reads are rAF-throttled to keep this off the main scroll path.

import { useEffect, useRef, useState } from 'react';

export function useScrollDirection(scrollRef, threshold = 8) {
  const [state, setState] = useState({ direction: null, scrollTop: 0 });
  const lastScrollTopRef = useRef(0);
  const tickingRef = useRef(false);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return undefined;

    const handle = () => {
      const current = el.scrollTop;
      const last = lastScrollTopRef.current;
      const delta = current - last;

      if (Math.abs(delta) >= threshold) {
        setState({
          direction: delta > 0 ? 'down' : 'up',
          scrollTop: current,
        });
        lastScrollTopRef.current = current;
      } else {
        // Sub-threshold movement: keep direction stable but update scrollTop
        // so consumers using scrollTop for "am I near the top?" checks stay
        // in sync without thrashing direction state.
        setState((s) => (s.scrollTop !== current ? { ...s, scrollTop: current } : s));
      }
      tickingRef.current = false;
    };

    const onScroll = () => {
      if (!tickingRef.current) {
        tickingRef.current = true;
        requestAnimationFrame(handle);
      }
    };

    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, [scrollRef, threshold]);

  return state;
}
