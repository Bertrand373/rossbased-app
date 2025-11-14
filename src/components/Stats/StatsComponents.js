// components/Stats/StatsComponents.js - FIXED: Modal autoFocus and X button positioning
import React from 'react';
import { format, differenceInDays } from 'date-fns';
import { FaFire, FaTrophy, FaRedo, FaCheckCircle, FaTimes, FaInfoCircle } from 'react-icons/fa';

// Helper function to format trigger names
const formatTriggerName = (trigger) => {
  return trigger
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

// StatCardModal Component
export function StatCardModal({ showModal, selectedStatCard, onClose, userData }) {
  if (!showModal) return null;

  const generateStatCardContent = (cardType) => {
    const currentStreak = userData.currentStreak || 0;
    const longestStreak = userData.longestStreak || 0;
    const relapseCount = userData.relapseCount || 0;
    
    // Calculate additional stats for relapse analysis
    const streakHistory = userData.streakHistory || [];
    const relapses = streakHistory.filter(streak => streak && streak.reason === 'relapse');
    
    // Get trigger counts
    const triggerCounts = {};
    relapses.forEach(relapse => {
      if (relapse.trigger) {
        triggerCounts[relapse.trigger] = (triggerCounts[relapse.trigger] || 0) + 1;
      }
    });
    
    const mostRecordedTrigger = Object.keys(triggerCounts).length > 0 ? 
      Object.keys(triggerCounts).reduce((a, b) => triggerCounts[a] > triggerCounts[b] ? a : b) :
      null;
    
    switch(cardType) {
      case 'current':
        return {
          title: 'Current Streak Analysis',
          icon: <FaFire />,
          mainValue: `${currentStreak} ${currentStreak === 1 ? 'day' : 'days'}`,
          content: [
            currentStreak === 0 ? 
              'Your journey starts today. Every master was once a beginner.' :
            currentStreak < 7 ? 
              `You're in the Foundation Phase. Energy fluctuations are normal. Stay committed!` :
            currentStreak < 14 ? 
              `Great progress! You're building momentum. Noticeable benefits emerging.` :
            currentStreak < 30 ? 
              `Excellent work! You're in the Adjustment Phase. Strength and clarity increasing.` :
            currentStreak < 90 ? 
              `Outstanding! You're in the Momentum Phase. Natural body composition changes occurring.` :
              `Legendary status! You've achieved mastery level. Complete transformation manifesting.`,
              
            currentStreak > 0 && longestStreak > 0 ?
              currentStreak >= longestStreak ? 
                'This is your best streak ever! Keep pushing forward!' :
                `${longestStreak - currentStreak} days to beat your record.` :
              '',
              
            currentStreak >= 30 ? 
              'Your self-control and pattern awareness have significantly improved.' :
            currentStreak >= 14 ? 
              'Physical and mental benefits are becoming more pronounced.' :
            currentStreak >= 7 ? 
              'Foundation phase complete. Prepare for increased benefits.' :
              'Focus on getting through the first 24 hours. Then the first 3 days.'
          ].filter(text => text !== '')
        };

      case 'longest':
        const daysAgo = userData.longestStreakDate ? 
          differenceInDays(new Date(), new Date(userData.longestStreakDate)) : null;
          
        return {
          title: 'Longest Streak Record',
          icon: <FaTrophy />,
          mainValue: `${longestStreak} ${longestStreak === 1 ? 'day' : 'days'}`,
          content: [
            longestStreak === 0 ? 
              'No streak recorded yet. Start your journey today!' :
            longestStreak < 7 ? 
              'Foundation phase reached. Next target: 7-Day Warrior badge.' :
            longestStreak < 14 ? 
              'Impressive start! Push for the 14-Day Monk achievement.' :
            longestStreak < 30 ? 
              'Strong progress! The 30-Day Master badge is within reach.' :
            longestStreak < 90 ? 
              'Exceptional dedication! You're approaching elite status.' :
            longestStreak < 180 ? 
              'King-level achievement! You've mastered self-control.' :
            longestStreak < 365 ? 
              'Emperor status! Spiritual integration achieved.' :
              'Sage level! Complete mastery and transformation achieved.',
              
            userData.longestStreakDate && daysAgo !== null ? 
              daysAgo === 0 ? 
                'This record was set today!' :
              daysAgo === 1 ? 
                'This record was set yesterday.' :
              daysAgo < 7 ? 
                `This record was set ${daysAgo} days ago.` :
              daysAgo < 30 ? 
                `This record was set ${Math.floor(daysAgo / 7)} weeks ago.` :
                `This record was set ${format(new Date(userData.longestStreakDate), 'MMMM d, yyyy')}.` :
              '',
              
            currentStreak > 0 && currentStreak >= longestStreak * 0.8 ? 
              'You're approaching your record! Stay focused and surpass it!' :
            longestStreak > 30 ? 
              'This achievement represents significant personal growth.' :
              'Every day you persist, you're building stronger neural pathways.'
          ].filter(text => text !== '')
        };

      case 'relapses':
        const avgStreakLength = relapseCount > 0 && streakHistory.length > 0 ? 
          Math.round(streakHistory.reduce((sum, streak) => sum + (streak?.days || 0), 0) / streakHistory.length) :
          0;
          
        return {
          title: 'Relapse Pattern Analysis',
          icon: <FaRedo />,
          mainValue: `${relapseCount} ${relapseCount === 1 ? 'relapse' : 'relapses'}`,
          content: [
            relapseCount === 0 ? 
              'Perfect record! No relapses recorded. Exceptional self-control!' :
            relapseCount === 1 ? 
              'Single setback only. Excellent resilience and recovery!' :
            relapseCount < 5 ? 
              'Minimal relapses. You're developing strong pattern awareness.' :
            relapseCount < 10 ? 
              'Learning from each experience. Progress over perfection.' :
              'Each relapse teaches valuable lessons. Focus on extending streaks.',
              
            avgStreakLength > 0 ? 
              `Average streak length: ${avgStreakLength} days.` :
              '',
              
            relapseCount > 0 && avgStreakLength > 14 ? 
              'Your average streak shows strong commitment and recovery ability.' :
            relapseCount > 0 && avgStreakLength > 7 ? 
              'You're consistently reaching the foundation phase between relapses.' :
            relapseCount > 0 && avgStreakLength > 0 ? 
              'Focus on identifying patterns and extending each streak.' :
              relapseCount > 0 ? 
                'Track your triggers to identify patterns and prevent future relapses.' :
                'No relapses recorded.',
            
            mostRecordedTrigger ? 
              `Most frequent trigger: ${formatTriggerName(mostRecordedTrigger)} (${triggerCounts[mostRecordedTrigger]} times)` :
              relapseCount > 0 ? 
                'Trigger information not available.' :
                'No trigger data to display.'
          ].filter(text => text !== '')
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
        <button 
          className="stat-modal-close"
          onClick={onClose}
          aria-label="Close modal"
        >
          <FaTimes />
        </button>
        
        <div className="stat-details-header">
          <div className="stat-details-icon">
            {content.icon}
          </div>
          <h3 id="stat-modal-title">{content.title}</h3>
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
            className="modal-got-it-btn" 
            onClick={onClose}
            onKeyDown={(e) => e.key === 'Enter' && onClose()}
          >
            <FaCheckCircle />
            Got It
          </button>
        </div>
      </div>
    </div>
  );
};