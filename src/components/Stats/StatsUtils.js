// components/Stats/StatsUtils.js - Utility Functions
// REFACTORED: Removed educational phase content, keeping essential utilities
import { format, subDays, differenceInDays } from 'date-fns';
import toast from 'react-hot-toast';
import { validateUserData, getFilteredBenefitData, calculateAverage, calculateDataQuality } from './StatsCalculationUtils';

// Helper function to convert markdown-style **text** to HTML bold
export const renderTextWithBold = (text) => {
  if (!text || typeof text !== 'string') return { __html: '' };
  try {
    const htmlText = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    return { __html: htmlText };
  } catch (error) {
    console.warn('Text rendering error:', error);
    return { __html: text };
  }
};

// Helper function to get time range display text
export const getTimeRangeDisplayText = (timeRange) => {
  const ranges = {
    'week': '(Last 7 Days)',
    'month': '(Last 30 Days)',
    'quarter': '(Last 90 Days)'
  };
  return ranges[timeRange] || '';
};

// Badge checking logic with error handling
export const checkAndUpdateBadges = (userData) => {
  try {
    const safeData = validateUserData(userData);
    
    if (!Array.isArray(safeData.badges)) {
      return safeData;
    }

    const currentStreak = safeData.currentStreak || 0;
    const longestStreak = safeData.longestStreak || 0;
    const maxStreak = Math.max(currentStreak, longestStreak);
    let hasNewBadges = false;
    
    const badgeThresholds = [
      { name: '7-Day Warrior', days: 7 },
      { name: '14-Day Monk', days: 14 },
      { name: '30-Day Master', days: 30 },
      { name: '90-Day King', days: 90 },
      { name: '180-Day Emperor', days: 180 },
      { name: '365-Day Sage', days: 365 }
    ];

    const updatedBadges = safeData.badges.map(badge => {
      if (!badge || typeof badge !== 'object') return badge;
      
      const threshold = badgeThresholds.find(t => t.name === badge.name);
      if (!threshold) return badge;

      const shouldBeEarned = maxStreak >= threshold.days;
      
      if (!badge.earned && shouldBeEarned) {
        hasNewBadges = true;
        
        try {
          toast.success(`🏆 Achievement Unlocked: ${badge.name}!`, {
            duration: 4000,
            style: {
              background: '#1a1a1a',
              color: '#ffffff',
              border: '1px solid #ffdd00'
            }
          });
        } catch (toastError) {
          console.warn('Toast notification error:', toastError);
        }
        
        return {
          ...badge,
          earned: true,
          date: new Date()
        };
      }
      
      return badge;
    });

    if (hasNewBadges) {
      return {
        ...safeData,
        badges: updatedBadges
      };
    }

    return safeData;
  } catch (error) {
    console.error('Badge update error:', error);
    return userData;
  }
};

// Calculate days since last relapse
export const calculateDaysSinceLastRelapse = (userData) => {
  try {
    const safeData = validateUserData(userData);
    const streakHistory = safeData.streakHistory || [];
    
    // Filter for actual relapses
    const relapses = streakHistory.filter(streak => 
      streak && streak.reason === 'relapse' && streak.end
    );
    
    if (relapses.length === 0) {
      return null; // Never relapsed
    }
    
    // Find the most recent relapse
    const mostRecentRelapse = relapses.reduce((latest, current) => {
      try {
        const currentDate = new Date(current.end);
        const latestDate = new Date(latest.end);
        return currentDate > latestDate ? current : latest;
      } catch (error) {
        return latest;
      }
    });
    
    if (!mostRecentRelapse || !mostRecentRelapse.end) {
      return null;
    }
    
    const lastRelapseDate = new Date(mostRecentRelapse.end);
    const today = new Date();
    const daysDifference = Math.floor((today - lastRelapseDate) / (1000 * 60 * 60 * 24));
    
    return daysDifference >= 0 ? daysDifference : 0;
  } catch (error) {
    console.error('Days since last relapse calculation error:', error);
    return null;
  }
};

// Info banner logic
export const shouldShowInfoBanner = (userData, timeRange) => {
  try {
    const safeData = validateUserData(userData);
    const benefitData = getFilteredBenefitData(safeData, timeRange);
    const hasMinimalData = benefitData.length < 7;
    const currentStreak = safeData.currentStreak || 0;
    const isNewUser = currentStreak <= 3;
    
    return hasMinimalData || isNewUser;
  } catch (error) {
    console.warn('Info banner check error:', error);
    return true;
  }
};

// Re-export calculation functions
export { 
  validateUserData, 
  getFilteredBenefitData, 
  generateChartData, 
  calculateAverage, 
  calculateDataQuality 
} from './StatsCalculationUtils';