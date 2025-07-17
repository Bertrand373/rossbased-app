// components/Stats/StatsCalculationUtils.js - Core Calculation Functions
import { subDays, startOfDay, format, differenceInDays } from 'date-fns';

// ENHANCED: Memoization cache for expensive calculations
const calculationCache = new Map();
const CACHE_EXPIRY = 5 * 60 * 1000; // 5 minutes

// ENHANCED: Cache utilities
const generateCacheKey = (userData, ...args) => {
  try {
    const safeUserData = userData || {};
    const benefitTrackingLength = safeUserData.benefitTracking?.length || 0;
    const currentStreak = safeUserData.currentStreak || 0;
    return `${benefitTrackingLength}-${currentStreak}-${args.join('-')}-${Date.now() % 60000}`;
  } catch (error) {
    console.warn('Cache key generation error:', error);
    return `fallback-${Date.now()}`;
  }
};

const getCachedResult = (key) => {
  try {
    const cached = calculationCache.get(key);
    if (cached && (Date.now() - cached.timestamp) < CACHE_EXPIRY) {
      return cached.result;
    }
    return null;
  } catch (error) {
    console.warn('Cache retrieval error:', error);
    return null;
  }
};

const setCachedResult = (key, result) => {
  try {
    calculationCache.set(key, { result, timestamp: Date.now() });
    // Cleanup old entries if cache gets too large
    if (calculationCache.size > 50) {
      const oldestKey = calculationCache.keys().next().value;
      calculationCache.delete(oldestKey);
    }
  } catch (error) {
    console.warn('Cache storage error:', error);
  }
};

// ENHANCED: Safe data validator
export const validateUserData = (userData) => {
  if (!userData || typeof userData !== 'object') {
    return {
      currentStreak: 0,
      longestStreak: 0,
      startDate: new Date(),
      benefitTracking: [],
      badges: [],
      streakHistory: []
    };
  }

  return {
    currentStreak: Number.isInteger(userData.currentStreak) ? userData.currentStreak : 0,
    longestStreak: Number.isInteger(userData.longestStreak) ? userData.longestStreak : 0,
    startDate: userData.startDate ? new Date(userData.startDate) : new Date(),
    benefitTracking: Array.isArray(userData.benefitTracking) ? userData.benefitTracking : [],
    badges: Array.isArray(userData.badges) ? userData.badges : [],
    streakHistory: Array.isArray(userData.streakHistory) ? userData.streakHistory : [],
    ...userData
  };
};

// ENHANCED: Filter benefit data with better error handling and caching
export const getFilteredBenefitData = (userData, timeRange) => {
  try {
    const cacheKey = generateCacheKey(userData, 'filtered', timeRange);
    const cached = getCachedResult(cacheKey);
    if (cached) return cached;

    const safeData = validateUserData(userData);
    
    if (!Array.isArray(safeData.benefitTracking)) {
      return [];
    }
    
    const timeRangeOptions = {
      week: 7,
      month: 30,
      quarter: 90
    };
    
    const days = timeRangeOptions[timeRange] || 7;
    const cutoffDate = subDays(new Date(), days);
    
    const result = safeData.benefitTracking
      .filter(item => {
        try {
          if (!item || !item.date) return false;
          const itemDate = new Date(item.date);
          return !isNaN(itemDate.getTime()) && itemDate >= cutoffDate;
        } catch (filterError) {
          console.warn('Date filtering error:', filterError);
          return false;
        }
      })
      .sort((a, b) => {
        try {
          return new Date(a.date) - new Date(b.date);
        } catch (sortError) {
          console.warn('Sort error:', sortError);
          return 0;
        }
      });

    setCachedResult(cacheKey, result);
    return result;
  } catch (error) {
    console.error('Filter benefit data error:', error);
    return [];
  }
};

// ENHANCED: Generate chart data with defensive programming
export const generateChartData = (userData, selectedMetric, timeRange) => {
  try {
    const cacheKey = generateCacheKey(userData, 'chart', selectedMetric, timeRange);
    const cached = getCachedResult(cacheKey);
    if (cached) return cached;

    const safeData = validateUserData(userData);
    const allUserData = safeData.benefitTracking || [];
    
    const timeRangeOptions = {
      week: 7,
      month: 30,
      quarter: 90
    };
    
    const days = timeRangeOptions[timeRange] || 7;
    const today = new Date();
    
    // Create complete time range array
    const timeRangeArray = [];
    const dataMap = new Map();
    
    // Build data map from user's actual data with error handling
    allUserData.forEach(item => {
      try {
        if (!item || !item.date) return;
        
        const itemDate = startOfDay(new Date(item.date));
        if (isNaN(itemDate.getTime())) return;
        
        let value = null;
        if (selectedMetric === 'sleep') {
          value = item[selectedMetric] || item.attraction || null;
        } else {
          value = item[selectedMetric] || null;
        }
        
        // Validate value is a number between 1-10
        if (typeof value === 'number' && value >= 1 && value <= 10) {
          dataMap.set(itemDate.getTime(), value);
        }
      } catch (itemError) {
        console.warn('Chart data item error:', itemError);
      }
    });
    
    // Generate time range labels and data
    for (let i = days - 1; i >= 0; i--) {
      try {
        const date = startOfDay(subDays(today, i));
        timeRangeArray.push({
          date,
          value: dataMap.get(date.getTime()) || null
        });
      } catch (dateError) {
        console.warn('Date generation error:', dateError);
      }
    }
    
    // Format labels based on time range
    const labels = timeRangeArray.map(item => {
      try {
        if (timeRange === 'week') {
          return format(item.date, 'EEE');
        } else if (timeRange === 'month') {
          return format(item.date, 'MMM d');
        } else {
          return format(item.date, 'MMM d');
        }
      } catch (formatError) {
        console.warn('Label formatting error:', formatError);
        return '';
      }
    });
    
    const data = timeRangeArray.map(item => item.value);
    
    const datasets = [{
      label: selectedMetric ? selectedMetric.charAt(0).toUpperCase() + selectedMetric.slice(1) : 'Data',
      data: data,
      borderColor: '#ffdd00',
      backgroundColor: 'rgba(255, 221, 0, 0.1)',
      tension: 0.3,
      fill: false,
      pointBackgroundColor: '#ffdd00',
      pointBorderColor: '#ffdd00',
      pointHoverBackgroundColor: '#f6cc00',
      pointHoverBorderColor: '#f6cc00',
      pointRadius: (context) => {
        try {
          return context.parsed.y !== null ? (timeRange === 'quarter' ? 4 : 6) : 0;
        } catch (contextError) {
          return 6;
        }
      },
      pointHoverRadius: (context) => {
        try {
          return context.parsed.y !== null ? (timeRange === 'quarter' ? 6 : 8) : 0;
        } catch (contextError) {
          return 8;
        }
      },
      pointBorderWidth: 2,
      pointHoverBorderWidth: 3,
      spanGaps: false
    }];
    
    const result = { labels, datasets, timeRangeArray };
    setCachedResult(cacheKey, result);
    return result;
  } catch (error) {
    console.error('Chart data generation error:', error);
    return {
      labels: [],
      datasets: [{
        label: 'Data',
        data: [],
        borderColor: '#ffdd00',
        backgroundColor: 'rgba(255, 221, 0, 0.1)'
      }],
      timeRangeArray: []
    };
  }
};

// ENHANCED: Calculate average with better error handling
export const calculateAverage = (userData, selectedMetric, timeRange, isPremium) => {
  try {
    const cacheKey = generateCacheKey(userData, 'average', selectedMetric, timeRange, isPremium);
    const cached = getCachedResult(cacheKey);
    if (cached) return cached;

    const safeData = validateUserData(userData);
    
    if (!isPremium) {
      const allData = safeData.benefitTracking || [];
      const last7DaysData = allData
        .filter(item => {
          try {
            if (!item || !item.date) return false;
            const itemDate = new Date(item.date);
            const cutoffDate = subDays(new Date(), 7);
            return !isNaN(itemDate.getTime()) && itemDate >= cutoffDate;
          } catch (filterError) {
            return false;
          }
        })
        .sort((a, b) => {
          try {
            return new Date(a.date) - new Date(b.date);
          } catch (sortError) {
            return 0;
          }
        });
      
      if (last7DaysData.length === 0) {
        setCachedResult(cacheKey, 'N/A');
        return 'N/A';
      }
      
      const validValues = last7DaysData
        .map(item => item.energy || 0)
        .filter(val => typeof val === 'number' && val >= 1 && val <= 10);
        
      if (validValues.length === 0) {
        setCachedResult(cacheKey, 'N/A');
        return 'N/A';
      }
      
      const sum = validValues.reduce((acc, val) => acc + val, 0);
      const result = (sum / validValues.length).toFixed(1);
      setCachedResult(cacheKey, result);
      return result;
    }
    
    const filteredData = getFilteredBenefitData(safeData, timeRange);
    if (filteredData.length === 0) {
      setCachedResult(cacheKey, 'N/A');
      return 'N/A';
    }
    
    const validValues = filteredData
      .map(item => {
        if (selectedMetric === 'sleep') {
          return item[selectedMetric] || item.attraction || 0;
        }
        return item[selectedMetric] || 0;
      })
      .filter(val => typeof val === 'number' && val >= 1 && val <= 10);
      
    if (validValues.length === 0) {
      setCachedResult(cacheKey, 'N/A');
      return 'N/A';
    }
    
    const sum = validValues.reduce((acc, val) => acc + val, 0);
    const result = (sum / validValues.length).toFixed(1);
    setCachedResult(cacheKey, result);
    return result;
  } catch (error) {
    console.error('Average calculation error:', error);
    return 'N/A';
  }
};

// Calculate data quality for analysis
export const calculateDataQuality = (userData) => {
  try {
    const safeData = validateUserData(userData);
    const allData = safeData.benefitTracking || [];
    
    const recentData = allData.filter(item => {
      try {
        if (!item || !item.date) return false;
        const itemDate = new Date(item.date);
        const cutoffDate = subDays(new Date(), 14);
        return !isNaN(itemDate.getTime()) && itemDate >= cutoffDate;
      } catch (filterError) {
        return false;
      }
    });

    const recentCount = recentData.length;

    if (recentCount >= 14) {
      return { level: 'rich', label: 'Rich Analytics', days: recentCount };
    } else if (recentCount >= 7) {
      return { level: 'good', label: 'Good Data Set', days: recentCount };
    } else if (recentCount >= 3) {
      return { level: 'minimal', label: 'Basic Analysis', days: recentCount };
    } else {
      return { level: 'insufficient', label: 'Insufficient Data', days: recentCount };
    }
  } catch (error) {
    console.error('Data quality calculation error:', error);
    return { level: 'insufficient', label: 'Insufficient Data', days: 0 };
  }
};

// ENHANCED: Cache cleanup utility
export const clearStatsCache = () => {
  try {
    calculationCache.clear();
    console.log('Stats calculation cache cleared');
  } catch (error) {
    console.warn('Cache clear error:', error);
  }
};

// ENHANCED: Performance monitoring utility
export const getStatsPerformanceMetrics = () => {
  try {
    return {
      cacheSize: calculationCache.size,
      cacheKeys: Array.from(calculationCache.keys()),
      memoryUsage: calculationCache.size * 100 // Rough estimate in bytes
    };
  } catch (error) {
    console.warn('Performance metrics error:', error);
    return {
      cacheSize: 0,
      cacheKeys: [],
      memoryUsage: 0
    };
  }
};