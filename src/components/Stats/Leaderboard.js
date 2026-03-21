// src/components/Stats/Leaderboard.js
// In-app leaderboard — bottom sheet showing 180+ day streaks
// Uses sheet-backdrop/sheet-panel pattern from BottomSheet.css

import React, { useState, useEffect, useCallback, useRef } from 'react';
import useSheetSwipe from '../../hooks/useSheetSwipe';
import { countryToFlag } from '../../utils/countries';
import './Leaderboard.css';

const API_URL = process.env.REACT_APP_API_URL || '';

const Leaderboard = ({ isOpen, onClose }) => {
  const [sheetReady, setSheetReady] = useState(false);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const panelRef = useRef(null);

  // Animate in
  useEffect(() => {
    if (isOpen) {
      requestAnimationFrame(() => requestAnimationFrame(() => setSheetReady(true)));
      fetchLeaderboard();
    } else {
      setSheetReady(false);
    }
  }, [isOpen]);

  const closeSheet = useCallback(() => {
    setSheetReady(false);
    setTimeout(onClose, 300);
  }, [onClose]);

  useSheetSwipe(panelRef, isOpen, closeSheet);

  const fetchLeaderboard = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/leaderboard/in-app`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
      }
    } catch (err) {
      console.error('Leaderboard fetch failed:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className={`sheet-backdrop lb-backdrop${sheetReady ? ' open' : ''}`} onClick={closeSheet} />
      <div ref={panelRef} className={`sheet-panel lb-sheet${sheetReady ? ' open' : ''}`} onClick={e => e.stopPropagation()}>
        <div className="sheet-header" />
        
        <div className="lb-content">
          {/* Header */}
          <div className="lb-header">
            <span className="lb-eyebrow">TITANTRACK</span>
            <h2 className="lb-title">Leaderboard</h2>
            <span className="lb-subtitle">180+ day streaks</span>
          </div>

          {/* List */}
          <div className="lb-list" data-no-swipe>
            {loading ? (
              <div className="lb-loading">
                <div className="lb-loading-spinner" />
              </div>
            ) : users.length === 0 ? (
              <div className="lb-empty">
                <span>No members with 180+ day streaks yet.</span>
              </div>
            ) : (
              users.map((user, index) => (
                <div key={user.username || index} className="lb-row">
                  <span className="lb-rank">{index + 1}</span>
                  <div className="lb-avatar-wrap">
                    <img
                      src={user.avatarUrl}
                      alt=""
                      className="lb-avatar"
                      loading="lazy"
                      onError={(e) => {
                        e.target.src = 'https://cdn.discordapp.com/embed/avatars/0.png';
                      }}
                    />
                  </div>
                  <div className="lb-info">
                    <span className="lb-name">
                      {user.displayName}
                      {user.country && (
                        <span className="lb-flag">{countryToFlag(user.country)}</span>
                      )}
                    </span>
                  </div>
                  <span className="lb-streak">{user.currentStreak}d</span>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="lb-footer">
            <span>Opt in via Profile to appear here</span>
          </div>
        </div>
      </div>
    </>
  );
};

export default Leaderboard;
