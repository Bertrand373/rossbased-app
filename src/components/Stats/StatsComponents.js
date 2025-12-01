// StatsComponents.js - TITANTRACK MINIMAL
// Clean helper components without helmet decorations
import React from 'react';
import { format } from 'date-fns';

// Minimal loading state - just a spinner
export const InsightLoadingState = ({ insight, isVisible }) => {
  if (!isVisible) return null;
  
  return (
    <div className="insight-loading">
      <div className="insight-loading-spinner"></div>
    </div>
  );
};

// Minimal empty state - clean text only
export const InsightEmptyState = ({ insight, userData, sectionTitle, sectionDescription }) => {
  const trackedDays = userData?.benefitTracking?.length || 0;
  const targetDays = 14;
  const remaining = targetDays - trackedDays;
  
  return (
    <div className="insight-empty">
      <p className="insight-empty-title">{trackedDays}/{targetDays} days tracked</p>
      <p className="insight-empty-text">
        {sectionDescription} Track {remaining} more days to unlock.
      </p>
    </div>
  );
};

// Minimal info banner - text only, no helmet
export const MiniInfoBanner = ({ description }) => {
  return (
    <div className="mini-info-banner">
      <p>{description}</p>
    </div>
  );
};

// Helper function to format trigger names
const formatTriggerName = (trigger) => {
  if (!trigger || typeof trigger !== 'string') return 'not recorded';
  
  const triggerMap = {
    'lustful_thoughts': 'lustful thoughts',
    'stress': 'stress',
    'boredom': 'boredom',
    'social_media': 'social media',
    'loneliness': 'loneliness',
    'relationship': 'relationship issues',
    'home_environment': 'being home alone',
    'home_alone': 'being home alone',
    'explicit_content': 'explicit content',
    'alcohol_substances': 'alcohol/substances',
    'sleep_deprivation': 'sleep deprivation'
  };
  
  return triggerMap[trigger] || trigger.replace(/_/g, ' ').replace(/[^a-zA-Z0-9\s]/g, '');
};

// Stat Card Modal - Clean minimal design
export const StatCardModal = ({ showModal, selectedStatCard, onClose, userData }) => {
  if (!showModal || !selectedStatCard) return null;

  const generateStatCardContent = (statType) => {
    const streakHistory = userData.streakHistory || [];
    const startDate = userData.startDate ? new Date(userData.startDate) : null;
    
    switch (statType) {
      case 'currentStreak':
        return {
          value: userData.currentStreak || 0,
          label: 'Current Streak',
          description: 'Your active streak of consecutive days. This resets if you log a relapse.',
          breakdown: startDate ? [
            { label: 'Started', value: format(startDate, 'MMM d, yyyy') }
          ] : null
        };
        
      case 'longestStreak':
        const longestFromHistory = streakHistory.reduce((max, s) => {
          const length = s?.length || 0;
          return length > max ? length : max;
        }, 0);
        const longest = Math.max(userData.longestStreak || 0, longestFromHistory);
        
        return {
          value: longest,
          label: 'Longest Streak',
          description: 'Your personal best - the longest streak you\'ve achieved. A record to beat.',
          breakdown: null
        };
        
      case 'wetDreams':
        return {
          value: userData.wetDreamCount || 0,
          label: 'Wet Dreams',
          description: 'Natural nocturnal emissions. These don\'t count as relapses - they\'re part of the body\'s normal regulation process.',
          breakdown: null
        };
        
      case 'relapses':
        const relapseHistory = streakHistory.filter(s => s?.reason === 'relapse') || [];
        const triggers = {};
        
        relapseHistory.forEach(r => {
          const trigger = r.trigger || 'unknown';
          triggers[trigger] = (triggers[trigger] || 0) + 1;
        });
        
        const topTrigger = Object.entries(triggers).sort((a, b) => b[1] - a[1])[0];
        
        return {
          value: userData.relapseCount || 0,
          label: 'Relapses',
          description: 'Total relapse count. Each one is a lesson. What matters is you\'re still here, still trying.',
          breakdown: topTrigger ? [
            { label: 'Top Trigger', value: formatTriggerName(topTrigger[0]) }
          ] : null
        };
        
      default:
        return {
          value: 0,
          label: 'Unknown',
          description: '',
          breakdown: null
        };
    }
  };

  const content = generateStatCardContent(selectedStatCard);

  return (
    <div className="stats-overlay" onClick={onClose}>
      <div className="stats-modal stat-detail-modal" onClick={e => e.stopPropagation()}>
        <div className="stat-detail-value">{content.value}</div>
        <div className="stat-detail-label">{content.label}</div>
        <p className="stat-detail-info">{content.description}</p>
        
        {content.breakdown && (
          <div className="stat-detail-breakdown">
            {content.breakdown.map((item, index) => (
              <div key={index} className="stat-breakdown-item">
                <span className="stat-breakdown-label">{item.label}</span>
                <span className="stat-breakdown-value">{item.value}</span>
              </div>
            ))}
          </div>
        )}
        
        <div className="modal-actions">
          <button className="btn-ghost" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
};

export default {
  InsightLoadingState,
  InsightEmptyState,
  MiniInfoBanner,
  StatCardModal
};