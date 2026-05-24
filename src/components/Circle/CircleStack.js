// src/components/Circle/CircleStack.js
//
// Header indicator: stacked overlapping member avatars showing who has
// reported today at a glance. The avatars ARE the indicator — no badges,
// no banners, no numbers. Tapping opens the Circle sheet.
//
// States:
//   - No circle yet           → single dashed ring with "+" icon
//   - In a circle, no reports → grey-ringed avatars, subdued
//   - Members reported today  → gold-ringed avatars for those who reported
//   - All reported            → entire stack gets a quiet gold wash
//
// Mount animation: staggered fade-up. New report: single gold-ring pulse.

import React from 'react';
import { useCircle } from '../../hooks/useCircle';
import { resolveAvatar } from '../../utils/avatar';
import './Circle.css';

const MAX_DISPLAY = 5;

const CircleStack = ({ onClick }) => {
  const { circle } = useCircle();

  // Empty state — single dashed-ring "+" affordance.
  if (!circle) {
    return (
      <button
        type="button"
        className="circle-stack circle-stack-empty"
        onClick={onClick}
        aria-label="Create or join a Circle"
      >
        <span className="circle-stack-empty-ring">
          <span className="circle-stack-empty-plus">+</span>
        </span>
      </button>
    );
  }

  const members = (circle.members || []).slice(0, MAX_DISPLAY);
  const reportedCount = members.filter(m => m.reported).length;
  const allReported = members.length > 0 && reportedCount === members.length;

  return (
    <button
      type="button"
      className={`circle-stack${allReported ? ' all-reported' : ''}`}
      onClick={onClick}
      aria-label={`Circle: ${reportedCount} of ${members.length} reported today`}
    >
      {members.map((m, i) => {
        const avatar = resolveAvatar(m, { size: 64 });
        return (
          <span
            key={m.username}
            className={`circle-stack-avatar${m.reported ? ' reported' : ''}`}
            style={{
              zIndex: MAX_DISPLAY - i,
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
