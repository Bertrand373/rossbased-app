/**
 * Animated toast icons — stroke-draw effect (Apple/Stripe/Linear pattern).
 *
 * Circle traces in first, then the check/X strokes draw in sequence.
 * Pure CSS via `pathLength="100"` + stroke-dasharray/dashoffset.
 *
 * Default colors: green (success), red (error).
 * For ceremonial moments (Oracle sync, lifetime access, streak milestones,
 * Based30 complete), use the GOLD constant or the pre-bound `goldCheckIcon` /
 * `goldXIcon` shortcuts, paired with `className: GOLD_TOAST_CLASS` so the
 * left-edge bar also flips to gold.
 */

import React from 'react';

export const GOLD = '#d4af37';
export const GOLD_TOAST_CLASS = 'toast-gold';

const CIRCLE_ANIM = 'toast-draw-stroke 360ms cubic-bezier(0.22, 1, 0.36, 1) forwards';
const STROKE_ANIM_DELAY = (delay) =>
  `toast-draw-stroke 240ms cubic-bezier(0.65, 0, 0.35, 1) ${delay}ms forwards`;

const baseSvgProps = {
  width: 20,
  height: 20,
  viewBox: '0 0 24 24',
  fill: 'none',
  style: { flexShrink: 0 },
};

const dashed = {
  pathLength: '100',
  strokeDasharray: '100',
  strokeDashoffset: '100',
};

export const AnimatedCheck = ({ color = '#22c55e' }) => (
  <svg {...baseSvgProps} aria-hidden="true">
    <circle
      cx="12"
      cy="12"
      r="10"
      stroke={color}
      strokeWidth="1.6"
      {...dashed}
      style={{ animation: CIRCLE_ANIM }}
    />
    <path
      d="M7.5 12.5 L10.5 15.5 L16.5 8.5"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...dashed}
      style={{ animation: STROKE_ANIM_DELAY(220) }}
    />
  </svg>
);

export const AnimatedX = ({ color = '#ff3b30' }) => (
  <svg {...baseSvgProps} aria-hidden="true">
    <circle
      cx="12"
      cy="12"
      r="10"
      stroke={color}
      strokeWidth="1.6"
      {...dashed}
      style={{ animation: CIRCLE_ANIM }}
    />
    <path
      d="M8 8 L16 16"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      {...dashed}
      style={{ animation: STROKE_ANIM_DELAY(220) }}
    />
    <path
      d="M16 8 L8 16"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      {...dashed}
      style={{ animation: STROKE_ANIM_DELAY(340) }}
    />
  </svg>
);

// Pre-bound shortcuts for ceremony moments (Oracle, lifetime, milestones).
export const goldCheckIcon = <AnimatedCheck color={GOLD} />;
export const goldXIcon = <AnimatedX color={GOLD} />;
