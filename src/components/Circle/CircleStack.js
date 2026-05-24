// src/components/Circle/CircleStack.js
//
// Header indicator: stacked overlapping member avatars showing who has
// reported today at a glance. The avatars ARE the indicator — no badges,
// no banners, no numbers. Tapping opens the Circle sheet.
//
// Render model: SLOTS, not just members. Always render a minimum of 3
// slots so the empty state foreshadows the populated state and the
// widget never layout-shifts on first member join. Slots are either:
//   - 'member' — render the avatar + reported ring
//   - 'empty'  — render a dashed ring (with optional + glyph)
//
// States:
//   No circle yet         → 3 dashed slots, + glyph on the first
//   Circle with 1 member  → 1 filled + 2 dashed (open seats)
//   Circle with 3 members → 3 filled, no padding
//   Circle with 4-5       → grows naturally
//   All reported          → entire stack gets a quiet gold wash
//
// Mount: staggered fade-up. New report: single gold-ring pulse.

import React from 'react';
import { useCircle } from '../../hooks/useCircle';
import { resolveAvatar } from '../../utils/avatar';
import './Circle.css';

const MIN_SLOTS = 3; // foreshadow the smallest valid circle size
const MAX_SLOTS = 5; // hard cap (matches server Circle.MAX_MEMBERS)

const CircleStack = ({ onClick }) => {
  const { circle } = useCircle();

  const members = (circle?.members || []).slice(0, MAX_SLOTS);
  // Always render at least MIN_SLOTS; grow with the circle up to MAX_SLOTS.
  const slotCount = Math.min(MAX_SLOTS, Math.max(MIN_SLOTS, members.length));

  const slots = [];
  for (let i = 0; i < slotCount; i++) {
    if (i < members.length) {
      slots.push({ kind: 'member', member: members[i] });
    } else {
      // First empty slot gets the + glyph only when there's no circle at
      // all (zero members). Once even one member exists, empty seats
      // read as "open seats" without the call-to-action glyph.
      const showPlus = !circle && i === 0;
      slots.push({ kind: 'empty', showPlus });
    }
  }

  const reportedCount = members.filter(m => m.reported).length;
  const allReported = members.length > 0 && reportedCount === members.length;

  const ariaLabel = !circle
    ? 'Create or join a Circle'
    : `Circle: ${reportedCount} of ${members.length} reported today`;

  return (
    <button
      type="button"
      className={`circle-stack${allReported ? ' all-reported' : ''}${!circle ? ' is-prompt' : ''}`}
      onClick={onClick}
      aria-label={ariaLabel}
    >
      {slots.map((slot, i) => {
        if (slot.kind === 'empty') {
          return (
            <span
              key={`empty-${i}`}
              className={`circle-stack-avatar empty${slot.showPlus ? ' has-plus' : ''}`}
              style={{
                zIndex: MAX_SLOTS - i,
                animationDelay: `${i * 60}ms`
              }}
              aria-hidden="true"
            >
              {slot.showPlus && <span className="circle-stack-plus">+</span>}
            </span>
          );
        }

        const m = slot.member;
        const avatar = resolveAvatar(m, { size: 64 });
        return (
          <span
            key={m.username}
            className={`circle-stack-avatar${m.reported ? ' reported' : ''}`}
            style={{
              zIndex: MAX_SLOTS - i,
              animationDelay: `${i * 60}ms`
            }}
            title={`${avatar.displayName}${m.reported ? ' — reported' : ' — unreported'}`}
          >
            {avatar.kind === 'image' ? (
              <img src={avatar.src} alt="" className="circle-stack-img" />
            ) : (
              <span className="circle-stack-initial">{avatar.initial}</span>
            )}
          </span>
        );
      })}
    </button>
  );
};

export default CircleStack;
