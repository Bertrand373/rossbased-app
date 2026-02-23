// StatsComponents.js - TITANTRACK
// Shared components for Stats - modals and loading states
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { format } from 'date-fns';

// Loading state component
export const InsightLoadingState = ({ insight, isVisible }) => {
  if (!isVisible) return null;
  
  return (
    <div className="insight-loading">
      <div className="insight-loading-spinner"></div>
    </div>
  );
};

// Empty state component  
export const InsightEmptyState = ({ insight, userData, sectionTitle, sectionDescription }) => {
  const daysTracked = userData?.benefitTracking?.length || 0;
  const daysNeeded = 14;
  const remaining = Math.max(0, daysNeeded - daysTracked);
  
  return (
    <div className="insight-empty">
      <p className="insight-empty-title">{daysTracked}/{daysNeeded} days tracked</p>
      <p className="insight-empty-text">
        {sectionDescription || `Track ${remaining} more days to unlock.`}
      </p>
    </div>
  );
};

// Mini info banner
export const MiniInfoBanner = ({ description }) => {
  if (!description) return null;
  
  return (
    <div className="mini-info-banner">
      <p>{description}</p>
    </div>
  );
};

// Stat Card Modal — Bottom sheet with X close
export const StatCardModal = ({ showModal, selectedStatCard, onClose, userData }) => {
  const [sheetReady, setSheetReady] = useState(false);
  const panelRef = useRef(null);
  const startY = useRef(0);
  const deltaY = useRef(0);
  const dragging = useRef(false);

  // Animate in
  useEffect(() => {
    if (showModal) {
      requestAnimationFrame(() => requestAnimationFrame(() => setSheetReady(true)));
    } else {
      setSheetReady(false);
    }
  }, [showModal]);

  const closeSheet = useCallback(() => {
    setSheetReady(false);
    setTimeout(onClose, 300);
  }, [onClose]);

  // Swipe-to-close
  const onTouchStart = useCallback((e) => {
    startY.current = e.touches[0].clientY;
    deltaY.current = 0;
    dragging.current = false;
  }, []);

  const onTouchMove = useCallback((e) => {
    const d = e.touches[0].clientY - startY.current;
    if (d < 0) return;
    if (d > 10) {
      dragging.current = true;
      deltaY.current = d;
      if (panelRef.current) {
        panelRef.current.style.transition = 'none';
        panelRef.current.style.transform = `translateY(${d}px)`;
      }
    }
  }, []);

  const onTouchEnd = useCallback(() => {
    if (!dragging.current) return;
    if (deltaY.current > 100 && panelRef.current) {
      panelRef.current.style.transition = 'transform 250ms ease-out';
      panelRef.current.style.transform = 'translateY(100%)';
      setTimeout(() => {
        if (panelRef.current) {
          panelRef.current.style.transition = '';
          panelRef.current.style.transform = '';
        }
        setSheetReady(false);
        onClose();
      }, 250);
    } else if (panelRef.current) {
      panelRef.current.style.transition = 'transform 250ms ease-out';
      panelRef.current.style.transform = '';
      setTimeout(() => {
        if (panelRef.current) panelRef.current.style.transition = '';
      }, 250);
    }
    dragging.current = false;
    deltaY.current = 0;
  }, [onClose]);
  
  if (!showModal || !selectedStatCard) return null;
  
  const getStatInfo = () => {
    switch (selectedStatCard) {
      case 'currentStreak':
        return {
          value: userData?.currentStreak || 0,
          label: 'Current Streak',
          description: 'Your active streak. Resets if you log a relapse.',
          details: [
            { label: 'Started', value: userData?.startDate ? format(new Date(userData.startDate), 'MMM d, yyyy') : 'N/A' },
            { label: 'Longest', value: `${userData?.longestStreak || 0} days` }
          ]
        };
      case 'longestStreak':
        return {
          value: userData?.longestStreak || 0,
          label: 'Longest Streak',
          description: 'Your personal best.',
          details: [
            { label: 'Current', value: `${userData?.currentStreak || 0} days` },
            { label: 'Attempts', value: `${(userData?.relapseCount || 0) + 1}` }
          ]
        };
      case 'wetDreams':
        return {
          value: userData?.wetDreamCount || 0,
          label: 'Wet Dreams',
          description: 'Natural emissions. These don\'t count as relapses.',
          details: []
        };
      case 'relapses':
        return {
          value: userData?.relapseCount || 0,
          label: 'Relapses',
          description: 'Each one is a lesson. You\'re still here.',
          details: [
            { label: 'Current', value: `${userData?.currentStreak || 0} days` },
            { label: 'Best', value: `${userData?.longestStreak || 0} days` }
          ]
        };
      default:
        return { value: 0, label: '', description: '', details: [] };
    }
  };
  
  const info = getStatInfo();
  
  return (
    <div className={`sheet-backdrop${sheetReady ? ' open' : ''}`} onClick={closeSheet}>
      <div ref={panelRef} className={`sheet-panel stats-sheet${sheetReady ? ' open' : ''}`} onClick={e => e.stopPropagation()}>
        <div className="sheet-header" onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
          <button className="sheet-close" onClick={closeSheet} aria-label="Close">✕</button>
        </div>
        <div className="modal" style={{ animation: 'none' }}>
          <span className="modal-num">{info.value}</span>
          <h2>{info.label}</h2>
          <p className="modal-text">{info.description}</p>
          
          {info.details.length > 0 && (
            <div className="stat-detail-breakdown">
              {info.details.map((detail, idx) => (
                <div key={idx} className="stat-breakdown-item">
                  <span className="stat-breakdown-label">{detail.label}</span>
                  <span className="stat-breakdown-value">{detail.value}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Helper to render bold text
export const renderTextWithBold = (text) => {
  if (!text || typeof text !== 'string') return { __html: '' };
  const htmlText = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  return { __html: htmlText };
};