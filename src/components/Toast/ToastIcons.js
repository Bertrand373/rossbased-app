/**
 * Animated toast icons — circleless stroke-draw.
 *
 * Matches the Feather-style checkmark used elsewhere in the app
 * (RevenueCard, AdminCockpit, Discord/YouTube link success, etc.):
 * the classic three-point polyline "20 6, 9 17, 4 12". Drawn in via
 * `pathLength="100"` + animated `stroke-dashoffset` — no circle around it,
 * just the check (or X) tracing itself in as the toast enters.
 *
 * Default colors: green (success), red (error).
 * For ceremony moments (Oracle sync, lifetime access, streak milestones,
 * Based30 complete), use `goldCheckIcon` / `goldXIcon` paired with
 * `className: GOLD_TOAST_CLASS` so the left-edge bar also flips to gold.
 */

import React from 'react';

export const GOLD = '#d4af37';
export const GOLD_TOAST_CLASS = 'toast-gold';

const DRAW_ANIM = (delay = 0) =>
  `toast-draw-stroke 360ms cubic-bezier(0.65, 0, 0.35, 1) ${delay}ms forwards`;

const baseSvgProps = {
  width: 18,
  height: 18,
  viewBox: '0 0 24 24',
  fill: 'none',
  style: { flexShrink: 0 },
};

const dashed = {
  pathLength: '100',
  strokeDasharray: '100',
  strokeDashoffset: '100',
};

// Canonical Feather check: drawn left-to-right (bottom-left → center → top-right)
// so it traces in the way a hand would write it.
export const AnimatedCheck = ({ color = '#22c55e' }) => (
  <svg {...baseSvgProps} aria-hidden="true">
    <path
      d="M4 12 L10 18 L20 6"
      stroke={color}
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...dashed}
      style={{ animation: DRAW_ANIM() }}
    />
  </svg>
);

// X: two diagonal strokes drawn in sequence (top-left→bottom-right, then the cross).
export const AnimatedX = ({ color = '#ff3b30' }) => (
  <svg {...baseSvgProps} aria-hidden="true">
    <path
      d="M6 6 L18 18"
      stroke={color}
      strokeWidth="2.5"
      strokeLinecap="round"
      {...dashed}
      style={{ animation: DRAW_ANIM(0) }}
    />
    <path
      d="M18 6 L6 18"
      stroke={color}
      strokeWidth="2.5"
      strokeLinecap="round"
      {...dashed}
      style={{ animation: DRAW_ANIM(160) }}
    />
  </svg>
);

// Pre-bound shortcuts for ceremony moments (Oracle, lifetime, milestones).
export const goldCheckIcon = <AnimatedCheck color={GOLD} />;
export const goldXIcon = <AnimatedX color={GOLD} />;
