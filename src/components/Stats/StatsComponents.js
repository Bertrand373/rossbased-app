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
      setSheetReady(false);
      setTimeout(() => {
        if (panelRef.current) {
          panelRef.current.style.transition = '';
          panelRef.current.style.transform = '';
        }
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
      case 'longestStreak': {
        const current = userData?.currentStreak || 0;
        const longest = userData?.longestStreak || 0;
        const isActiveBest = current >= longest && current > 0;
        const gap = longest - current;
        
        let details = [];
        if (isActiveBest) {
          // On their best streak — show start date
          if (userData?.startDate) {
            details.push({ label: 'Started', value: format(new Date(userData.startDate), 'MMM d, yyyy') });
          }
        } else {
          // Had a better streak before — show current + gap
          details.push({ label: 'Current', value: `${current} days` });
          if (gap > 0) {
            details.push({ label: 'Gap', value: `${gap} days` });
          }
        }
        
        return {
          value: longest,
          label: 'Longest Streak',
          description: isActiveBest 
            ? 'You\'re on your personal best.' 
            : 'Your personal best.',
          details
        };
      }
      case 'wetDreams':
        return {
          value: userData?.wetDreamCount || 0,
          label: 'Wet Dreams',
          description: 'Natural emissions. These don\'t count as relapses.',
          details: []
        };
      case 'relapses': {
        const relapseVal = userData?.relapseCount || 0;
        const attempts = relapseVal + 1;
        const lastRelapse = (userData?.streakHistory || [])
          .filter(s => s.reason === 'relapse' && s.end)
          .sort((a, b) => new Date(b.end) - new Date(a.end))[0];
        const daysSinceLast = lastRelapse 
          ? Math.floor((new Date() - new Date(lastRelapse.end)) / (1000 * 60 * 60 * 24))
          : null;
        
        return {
          value: relapseVal,
          label: 'Relapses',
          description: relapseVal === 0 
            ? 'Zero relapses on this streak.' 
            : 'Each one is a lesson. You\'re still here.',
          details: relapseVal > 0 ? [
            ...(daysSinceLast !== null ? [{ label: 'Since Last', value: `${daysSinceLast} days` }] : []),
            { label: 'Attempts', value: `${attempts}` }
          ] : []
        };
      }
      default:
        return { value: 0, label: '', description: '', details: [] };
    }
  };
  
  const info = getStatInfo();
  
  return (
    <div className={`sheet-backdrop${sheetReady ? ' open' : ''}`} onClick={closeSheet}>
      <div ref={panelRef} className={`sheet-panel stats-sheet${sheetReady ? ' open' : ''}`} onClick={e => e.stopPropagation()}>
        <div className="sheet-header" onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd} />
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
          <button className="btn-ghost" onClick={closeSheet}>Close</button>
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