// components/Stats/StatsComponents.js - Extracted UI Components for Stats
import React from 'react';
import { FaChartLine, FaTrophy, FaInfoCircle, FaTimes, FaExclamationTriangle, FaMoon } from 'react-icons/fa';
import { format } from 'date-fns';
import helmetImage from '../../assets/helmet.png';

// ENHANCED: Loading states component with helmet animation
export const InsightLoadingState = ({ insight, isVisible }) => {
  if (!isVisible) return null;
  
  return (
    <div className="insight-loading-state">
      <div className="insight-loading-content">
        <img 
          src={helmetImage} 
          alt="Analyzing" 
          className="insight-loading-helmet"
          onError={(e) => {
            e.target.style.display = 'none';
            e.target.nextSibling.style.display = 'block';
          }}
        />
        <div className="insight-loading-helmet-fallback" style={{display: 'none'}}>🧠</div>
        <div className="insight-loading-text">
          <div className="insight-loading-title">Calculating {insight}...</div>
          <div className="insight-loading-dots">
            <span></span>
            <span></span>
            <span></span>
          </div>
        </div>
      </div>
    </div>
  );
};

// ENHANCED: Progress indicator component with mobile optimizations
export const DataProgressIndicator = ({ userData, targetDays = 14 }) => {
  const trackedDays = userData.benefitTracking?.length || 0;
  const progressPercentage = Math.min((trackedDays / targetDays) * 100, 100);
  const isComplete = trackedDays >= targetDays;
  
  return (
    <div className="data-progress-indicator">
      <div className="data-progress-header">
        <div className="data-progress-title">
          {isComplete ? 'Analytics Ready' : 'Building Your Profile'}
        </div>
        <div className="data-progress-count">
          {trackedDays}/{targetDays} days
        </div>
      </div>
      <div className="data-progress-bar">
        <div 
          className="data-progress-fill"
          style={{ width: `${progressPercentage}%` }}
        />
      </div>
      {!isComplete && (
        <div className="data-progress-message">
          Track {targetDays - trackedDays} more days for detailed insights
        </div>
      )}
    </div>
  );
};

// ENHANCED: Empty state component with encouragement
export const InsightEmptyState = ({ insight, userData }) => {
  const suggestions = {
    'Smart Urge Management': 'Track your daily benefits to receive personalized vulnerability assessments and timing-based guidance.',
    'Relapse Risk Predictor': 'Build a benefit tracking history to unlock predictive analytics and risk mitigation strategies.',
    'Pattern Recognition': 'Continue logging daily benefits to identify correlations and trends in your retention journey.',
    'Optimization Guidance': 'Track benefits consistently to discover your peak performance zones and optimization opportunities.'
  };

  return (
    <div className="insight-empty-state">
      <div className="insight-empty-icon">
        <FaChartLine />
      </div>
      <div className="insight-empty-content">
        <div className="insight-empty-title">Building Your {insight}</div>
        <div className="insight-empty-description">
          {suggestions[insight] || 'Continue tracking to unlock personalized insights.'}
        </div>
        <DataProgressIndicator userData={userData} />
      </div>
    </div>
  );
};

// NEW: Stat Card Details Modal Content Generator
export const StatCardModal = ({ showModal, selectedStatCard, onClose, userData }) => {
  if (!showModal || !selectedStatCard) return null;

  const generateStatCardContent = (statType) => {
    const streakHistory = userData.streakHistory || [];
    const startDate = userData.startDate ? new Date(userData.startDate) : new Date();
    
    switch (statType) {
      case 'longestStreak':
        const longestStreak = userData.longestStreak || 0;
        
        // Find the longest streak record from history
        const longestStreakRecord = streakHistory
          .filter(streak => streak && streak.days)
          .reduce((longest, current) => {
            return (current.days || 0) > (longest?.days || 0) ? current : longest;
          }, null);

        const longestStreakStart = longestStreakRecord?.start ? 
          format(new Date(longestStreakRecord.start), 'MMMM d, yyyy') : 'Not recorded';
        const longestStreakEnd = longestStreakRecord?.end ? 
          format(new Date(longestStreakRecord.end), 'MMMM d, yyyy') : 'Current streak';

        return {
          title: 'Longest Streak Record',
          icon: <FaTrophy />,
          mainValue: `${longestStreak} days`,
          content: [
            longestStreak === 0 ? 
              'No streak longer than 1 day recorded yet.' :
              `Personal best streak: ${longestStreak} consecutive days.`,
            
            longestStreakRecord ? 
              `Duration: ${longestStreakStart} to ${longestStreakEnd}` : 
              'Date records not available for this streak.',
            
            longestStreakRecord?.reason ? 
              `Ended due to: ${longestStreakRecord.reason.replace(/_/g, ' ')}` :
              'End reason not recorded.'
          ]
        };

      case 'wetDreams':
        const wetDreamCount = userData.wetDreamCount || 0;
        
        // Calculate tracking period
        const daysSinceStart = Math.floor((new Date() - startDate) / (1000 * 60 * 60 * 24));
        const frequency = daysSinceStart > 30 && wetDreamCount > 0 ? 
          Math.round(daysSinceStart / wetDreamCount) : null;

        return {
          title: 'Wet Dream Record',
          icon: <FaMoon />,
          mainValue: `${wetDreamCount} total`,
          content: [
            `Total occurrences: ${wetDreamCount} wet dreams recorded.`,
            
            `Tracking period: ${daysSinceStart} days since ${format(startDate, 'MMMM d, yyyy')}.`,
            
            frequency ? 
              `Average frequency: approximately every ${frequency} days.` : 
              wetDreamCount === 0 ? 
                'No wet dreams recorded during tracking period.' :
                'Frequency calculation requires longer tracking period.'
          ]
        };

      case 'relapses':
        const relapseCount = userData.relapseCount || 0;
        
        // Find most recent relapse
        const relapses = streakHistory.filter(streak => 
          streak && streak.reason === 'relapse'
        );
        
        const mostRecentRelapse = relapses.length > 0 ? 
          relapses.reduce((latest, current) => {
            try {
              const currentDate = new Date(current.end || current.start);
              const latestDate = new Date(latest.end || latest.start);
              return currentDate > latestDate ? current : latest;
            } catch (error) {
              return latest;
            }
          }) : null;

        const daysSinceLastRelapse = mostRecentRelapse ? 
          Math.floor((new Date() - new Date(mostRecentRelapse.end || mostRecentRelapse.start)) / (1000 * 60 * 60 * 24)) : null;

        // Find most recorded trigger (no analysis, just facts)
        const triggerCounts = {};
        relapses.forEach(relapse => {
          const trigger = relapse.trigger || 'not recorded';
          triggerCounts[trigger] = (triggerCounts[trigger] || 0) + 1;
        });
        
        const mostRecordedTrigger = Object.keys(triggerCounts).length > 0 ? 
          Object.entries(triggerCounts).reduce((a, b) => a[1] > b[1] ? a : b)[0] : null;

        return {
          title: 'Relapse Record',
          icon: <FaExclamationTriangle />,
          mainValue: `${relapseCount} total`,
          content: [
            `Total relapses: ${relapseCount} recorded since starting.`,
            
            daysSinceLastRelapse !== null ? 
              `Most recent: ${daysSinceLastRelapse} days ago (${format(new Date(mostRecentRelapse.end || mostRecentRelapse.start), 'MMMM d, yyyy')})` :
              relapseCount > 0 ? 
                'Most recent relapse date not recorded.' :
                'No relapses recorded.',
            
            mostRecordedTrigger && mostRecordedTrigger !== 'not recorded' ? 
              `Most frequent trigger: ${mostRecordedTrigger.replace(/_/g, ' ')} (${triggerCounts[mostRecordedTrigger]} times)` :
              relapseCount > 0 ? 
                'Trigger information not available.' :
                'No trigger data to display.'
          ]
        };

      default:
        return {
          title: 'Stat Information',
          icon: <FaInfoCircle />,
          mainValue: 'N/A',
          content: ['Information not available for this statistic.']
        };
    }
  };

  const content = generateStatCardContent(selectedStatCard);

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="stat-modal-title">
      <div className="modal-content stat-details-modal" onClick={e => e.stopPropagation()}>
        <div className="stat-details-header">
          <div className="stat-details-icon">
            {content.icon}
          </div>
          <h3 id="stat-modal-title">{content.title}</h3>
          <button 
            className="stat-modal-close"
            onClick={onClose}
            aria-label="Close modal"
          >
            <FaTimes />
          </button>
        </div>
        
        <div className="stat-details-value">
          {content.mainValue}
        </div>
        
        <div className="stat-details-content">
          {content.content.map((text, index) => (
            <p key={index}>{text}</p>
          ))}
        </div>
        
        <div className="modal-actions">
          <button 
            className="btn btn-primary" 
            onClick={onClose}
            onKeyDown={(e) => e.key === 'Enter' && onClose()}
            autoFocus
          >
            Got It
          </button>
        </div>
      </div>
    </div>
  );
};