// src/components/MeSheet/MeSheet.js
//
// The "Me" sheet — the polished foyer for everything personal.
// Tapping the profile avatar in the header opens this instead of routing
// straight to /profile. From here, three doors:
//   1. Community → external Discord invite (replaces the old DiscordButton
//      that lived in the header — we cleared the top-right pile)
//   2. Settings → existing /profile route (unchanged)
//   3. (TTTV tile is intentionally absent in PR #1 — added when /tv ships,
//      so its first appearance is a real reveal rather than a dead link)
//
// Plus a Library row → opens Oracle, which is where Highlights & Notes
// already live (one library, two doors). And a Sign out at the bottom.
//
// Sheet plumbing follows CheckInSheet/TransmissionSheet exactly: portaled,
// sheetReady RAF dance for smooth open, useSheetSwipe for dismissal,
// backdrop click to close. Reuses .sheet-backdrop / .sheet-panel /
// .sheet-header from BottomSheet.css — only the inner content is custom.
//
// PROPS
//   open          — controls visibility
//   onClose       — called when backdrop tapped, swipe-down, or a tile navigates
//   userData      — { username, email, discordId, discordAvatar, ... }
//   isPremium     — pass effectivePremium from App; used for the status line
//   onLogout      — App's logout() function
//   onOpenNotes   — opens Oracle (which contains the NotesLibrary). For PR #1
//                   we don't deep-link into the library — just open Oracle and
//                   let the user tap through. Refactor candidate for later.

import React, { useState, useEffect, useRef, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { FaCog, FaBookmark, FaSignOutAlt, FaChevronRight } from 'react-icons/fa';
import useSheetSwipe from '../../hooks/useSheetSwipe';
import '../../styles/BottomSheet.css';
import './MeSheet.css';

const DISCORD_INVITE = 'https://discord.gg/RDFC5eUtuA';

// Inline Discord glyph — matches the SVG that used to live in the header's
// DiscordButton. Kept inline rather than importing from react-icons/bs so
// the visual is identical to what users saw before the header cleanup.
const DiscordGlyph = () => (
  <svg viewBox="0 0 24 24" className="me-discord-glyph" aria-hidden="true" focusable="false">
    <path
      fill="currentColor"
      d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189Z"
    />
  </svg>
);

const MeSheet = ({ open, onClose, userData, isPremium, onLogout, onOpenNotes }) => {
  const navigate = useNavigate();
  const [sheetReady, setSheetReady] = useState(false);
  const sheetPanelRef = useRef(null);

  // RAF dance — same pattern CheckInSheet uses. Two RAFs let the
  // initial transform: translateY(100%) commit before we set .open,
  // so the slide-up animation actually plays instead of snapping.
  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => requestAnimationFrame(() => setSheetReady(true)));
    } else {
      setSheetReady(false);
    }
  }, [open]);

  const closeSheet = useCallback((cb) => {
    setSheetReady(false);
    setTimeout(() => { if (cb) cb(); }, 300);
  }, []);

  useSheetSwipe(sheetPanelRef, open, () => closeSheet(() => onClose && onClose()));

  if (!open) return null;

  // Avatar — same logic as the old ProfileButton so the Me sheet avatar
  // matches the header avatar exactly. Discord CDN preferred, initial fallback.
  const initial =
    userData?.username?.charAt(0)?.toUpperCase() ||
    userData?.email?.charAt(0)?.toUpperCase() ||
    '?';

  const getDiscordAvatarUrl = () => {
    const { discordId, discordAvatar } = userData || {};
    if (discordAvatar && discordId) {
      const ext = discordAvatar.startsWith('a_') ? 'gif' : 'png';
      return `https://cdn.discordapp.com/avatars/${discordId}/${discordAvatar}.${ext}?size=128`;
    }
    return null;
  };

  const avatarUrl = getDiscordAvatarUrl();
  const displayName = userData?.username || userData?.displayName || 'Member';
  const statusLabel = isPremium ? 'Premium member' : 'Member';

  // Each tile/row closes the sheet before its action fires. For external
  // links we open immediately; for routes we close + navigate. Calling
  // closeSheet first lets the slide-down animation play while the route
  // change happens underneath — feels intentional rather than abrupt.
  const handleCommunity = () => {
    closeSheet(() => {
      window.open(DISCORD_INVITE, '_blank', 'noopener,noreferrer');
      onClose && onClose();
    });
  };

  const handleSettings = () => {
    closeSheet(() => {
      onClose && onClose();
      navigate('/profile');
    });
  };

  const handleTTTV = () => {
    closeSheet(() => {
      onClose && onClose();
      navigate('/tv');
    });
  };

  const handleLibrary = () => {
    closeSheet(() => {
      onClose && onClose();
      onOpenNotes && onOpenNotes();
    });
  };

  const handleSignOut = () => {
    closeSheet(() => {
      onClose && onClose();
      onLogout && onLogout();
    });
  };

  return ReactDOM.createPortal(
    <div
      className={`sheet-backdrop${sheetReady ? ' open' : ''}`}
      onClick={() => closeSheet(() => onClose && onClose())}
    >
      <div
        ref={sheetPanelRef}
        className={`sheet-panel me-sheet${sheetReady ? ' open' : ''}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sheet-header" />

        {/* Identity strip — avatar + name + status. The status line is
            deliberately understated: "Premium member" / "Member". No badges,
            no levels — premium = quiet. */}
        <div className="me-identity">
          <div className={`me-avatar${avatarUrl ? ' has-avatar' : ''}`}>
            {avatarUrl ? (
              <img src={avatarUrl} alt="" className="me-avatar-img" />
            ) : (
              <span className="me-avatar-initial">{initial}</span>
            )}
          </div>
          <div className="me-identity-text">
            <div className="me-name">{displayName}</div>
            <div className="me-status">{statusLabel}</div>
          </div>
        </div>

        {/* Tiles. TTTV appears for premium members only — non-premium see
            two tiles (Community + Settings); the TTTV tile lights up when
            their subscription unlocks it. The grid auto-adjusts via the
            modifier class so we don't end up with a stretched 2-tile row
            once there are 3 items. */}
        <div className={`me-tiles me-tiles-${isPremium ? '3' : '2'}`}>
          <button type="button" className="me-tile" onClick={handleCommunity}>
            <div className="me-tile-icon"><DiscordGlyph /></div>
            <div className="me-tile-label">Community</div>
            <div className="me-tile-sub">Discord</div>
          </button>
          {isPremium && (
            <button type="button" className="me-tile me-tile-tttv" onClick={handleTTTV}>
              <div className="me-tile-icon me-tile-icon-tttv">
                {/* Two logos rendered, CSS hides whichever doesn't match the
                    active theme. White mark for dark mode, black mark for
                    light mode — the inverse of the icon container's neutral
                    tint per theme. */}
                <img src="/tttv-logo-white.png" alt="" className="me-tile-logo me-tile-logo-dark" />
                <img src="/tttv-logo-black.png" alt="" className="me-tile-logo me-tile-logo-light" />
              </div>
              <div className="me-tile-label">TTTV</div>
              <div className="me-tile-sub">Watch</div>
            </button>
          )}
          <button type="button" className="me-tile" onClick={handleSettings}>
            <div className="me-tile-icon"><FaCog /></div>
            <div className="me-tile-label">Settings</div>
            <div className="me-tile-sub">Account</div>
          </button>
        </div>

        <div className="me-section-label">Library</div>
        <button type="button" className="me-list-item" onClick={handleLibrary}>
          <span className="me-list-icon"><FaBookmark /></span>
          <span className="me-list-text">Highlights &amp; Notes</span>
          <span className="me-list-chevron"><FaChevronRight /></span>
        </button>

        <button type="button" className="me-signout" onClick={handleSignOut}>
          <FaSignOutAlt className="me-signout-icon" />
          <span>Sign out</span>
        </button>
      </div>
    </div>,
    document.body
  );
};

export default MeSheet;
