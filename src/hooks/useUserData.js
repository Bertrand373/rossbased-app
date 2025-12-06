// src/hooks/useUserData.js - FIXED: Proper MongoDB sync
// Changes: Always fetch from DB on load, robust sync with error handling
import { useState, useEffect, useCallback } from 'react';
import { addDays } from 'date-fns';
import toast from 'react-hot-toast';

// IMPORT: All mock data including 6 AI test users + AI Card Test User
import comprehensiveMockData, { 
  newUserMockData, 
  veteranUserMockData, 
  strugglingUserMockData,
  intjMockData,
  intpMockData,
  enfpMockData,
  aiTestUser1,
  aiTestUser2,
  aiTestUser3,
  aiTestUser4,
  aiTestUser5,
  aiTestUser6,
  aiCardTestUser
} from '../mockData';

// ========== TOGGLE THIS FOR PRODUCTION ==========
const MOCK_MODE = false; // PRODUCTION MODE - using real API
// ================================================

const API_URL = process.env.REACT_APP_API_URL || 'https://rossbased-app.onrender.com';

// Custom hook to manage user data
export const useUserData = () => {
  const [userData, setUserData] = useState({
    username: '',
    email: '',
    startDate: null,
    currentStreak: 0,
    longestStreak: 0,
    wetDreamCount: 0,
    relapseCount: 0,
    isPremium: true,
    goal: {
      targetDays: null,
      isActive: false,
      targetDate: null,
      achieved: false,
      achievementDate: null
    },
    badges: [
      { id: 1, name: '7-Day Warrior', earned: false, date: null },
      { id: 2, name: '14-Day Monk', earned: false, date: null },
      { id: 3, name: '30-Day Master', earned: false, date: null },
      { id: 4, name: '90-Day King', earned: false, date: null },
      { id: 5, name: '180-Day Emperor', earned: false, date: null },
      { id: 6, name: '365-Day Sage', earned: false, date: null }
    ],
    benefitTracking: [],
    emotionalTracking: [],
    streakHistory: [],
    urgeToolUsage: [],
    urgeLog: [],
    discordUsername: '',
    showOnLeaderboard: false,
    notes: {},
    dataSharing: false,
    analyticsOptIn: true,
    marketingEmails: false,
    darkMode: true,
    notifications: true,
    language: 'en',
    wisdomMode: false
  });
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isPremium, setIsPremium] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [syncStatus, setSyncStatus] = useState('idle'); // 'idle' | 'syncing' | 'error' | 'success'

  const calculateGoalTargetDate = (startDate, targetDays) => {
    if (!startDate || !targetDays) return null;
    return addDays(new Date(startDate), targetDays - 1);
  };

  const checkGoalAchievement = (currentStreak, targetDays) => {
    return currentStreak >= targetDays;
  };

  const clearMLData = async () => {
    // Clear localStorage ML data
    localStorage.removeItem('ml_normalization_stats');
    localStorage.removeItem('ml_training_history');
    localStorage.removeItem('prediction_feedback');
    
    // Clear IndexedDB TensorFlow model
    try {
      const databases = await window.indexedDB.databases();
      for (const db of databases) {
        if (db.name && (db.name.includes('tensorflowjs') || db.name.includes('titantrack'))) {
          window.indexedDB.deleteDatabase(db.name);
          console.log('Cleared IndexedDB:', db.name);
        }
      }
    } catch (e) {
      console.log('Could not clear IndexedDB:', e);
    }
  };

  // Process user data from API (convert dates, set defaults)
  const processUserData = (rawData) => {
    const processed = { ...rawData };
    
    // Convert date strings to Date objects
    if (processed.startDate) {
      processed.startDate = new Date(processed.startDate);
      
      // SYNC STREAK ON APP LOAD - ensures accuracy after days away
      const today = new Date();
      const daysDiff = Math.floor((today - processed.startDate) / (1000 * 60 * 60 * 24));
      processed.currentStreak = Math.max(0, daysDiff);
      
      // Also update longestStreak if current exceeds it
      if (processed.currentStreak > (processed.longestStreak || 0)) {
        processed.longestStreak = processed.currentStreak;
      }
    }
    
    // Process goal dates
    if (processed.goal) {
      if (processed.goal.targetDate) {
        processed.goal.targetDate = new Date(processed.goal.targetDate);
      }
      if (processed.goal.achievementDate) {
        processed.goal.achievementDate = new Date(processed.goal.achievementDate);
      }
    } else {
      processed.goal = {
        targetDays: null,
        isActive: false,
        targetDate: null,
        achieved: false,
        achievementDate: null
      };
    }
    
    // Process badges
    if (processed.badges) {
      processed.badges = processed.badges.map(badge => ({
        ...badge,
        date: badge.date ? new Date(badge.date) : null
      }));
    }
    
    // Process benefit tracking
    if (processed.benefitTracking) {
      processed.benefitTracking = processed.benefitTracking.map(item => ({
        ...item,
        date: new Date(item.date),
        aura: item.aura || 5,
        sleep: item.sleep || item.attraction || 5,
        workout: item.workout || item.gymPerformance || 5
      }));
    } else {
      processed.benefitTracking = [];
    }
    
    // Process emotional tracking
    if (processed.emotionalTracking) {
      processed.emotionalTracking = processed.emotionalTracking.map(item => ({
        ...item,
        date: new Date(item.date)
      }));
    } else {
      processed.emotionalTracking = [];
    }
    
    // Process urge log
    if (processed.urgeLog) {
      processed.urgeLog = processed.urgeLog.map(item => ({
        ...item,
        date: new Date(item.date)
      }));
    } else {
      processed.urgeLog = [];
    }
    
    // Process streak history
    if (processed.streakHistory) {
      processed.streakHistory = processed.streakHistory.map(streak => ({
        ...streak,
        start: new Date(streak.start),
        end: streak.end ? new Date(streak.end) : null
      }));
    }
    
    // Set defaults
    processed.email = processed.email || '';
    processed.dataSharing = processed.dataSharing || false;
    processed.analyticsOptIn = processed.analyticsOptIn !== false;
    processed.marketingEmails = processed.marketingEmails || false;
    processed.darkMode = processed.darkMode !== false;
    processed.notifications = processed.notifications !== false;
    processed.language = processed.language || 'en';
    processed.wisdomMode = processed.wisdomMode || false;
    processed.isPremium = true;
    
    return processed;
  };

  // ================================================================
  // FETCH FRESH DATA FROM MONGODB
  // ================================================================
  const fetchUserDataFromAPI = useCallback(async (username, token) => {
    try {
      console.log('Fetching fresh data from MongoDB for:', username);
      
      const response = await fetch(`${API_URL}/api/user/${username}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch user data');
      }
      
      const rawData = await response.json();
      return processUserData(rawData);
    } catch (err) {
      console.error('Error fetching from API:', err);
      return null;
    }
  }, []);

  // ================================================================
  // SYNC TO MONGODB - ROBUST VERSION WITH ERROR HANDLING
  // ================================================================
  const syncToAPI = useCallback(async (dataToSync) => {
    if (MOCK_MODE) return true;
    
    const token = localStorage.getItem('token');
    const username = dataToSync.username || localStorage.getItem('username');
    
    if (!token || !username) {
      console.warn('Cannot sync: missing token or username');
      return false;
    }
    
    try {
      setSyncStatus('syncing');
      
      const response = await fetch(`${API_URL}/api/user/${username}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(dataToSync)
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Sync failed with status ${response.status}`);
      }
      
      setSyncStatus('success');
      console.log('✅ Data synced to MongoDB');
      return true;
    } catch (err) {
      console.error('❌ Failed to sync to MongoDB:', err);
      setSyncStatus('error');
      // Show error toast so user knows sync failed
      toast.error('Data sync failed. Changes saved locally.', { 
        duration: 3000,
        icon: '⚠️'
      });
      return false;
    }
  }, []);

  // Production login via API
  const loginViaAPI = async (username, password, isGoogleAuth = false) => {
    try {
      setIsLoading(true);
      await clearMLData();
      
      let token = localStorage.getItem('token');
      let userDataFromAPI;
      
      // Auto-detect OAuth login: if password is null AND token already exists, treat as OAuth
      const isOAuthLogin = isGoogleAuth || (password === null && token);
      
      if (isOAuthLogin) {
        // Google/Discord auth already completed - token and user data already set
        // Just load the user data from localStorage that was set by the auth callback
        token = localStorage.getItem('token');
        const storedUsername = localStorage.getItem('username');
        
        if (!token || !storedUsername) {
          throw new Error('Authentication data not found');
        }
        
        console.log('OAuth login detected, fetching user data for:', storedUsername);
        
        // Fetch fresh user data from API to ensure we have complete data
        const response = await fetch(`${API_URL}/api/user/${storedUsername}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (!response.ok) {
          throw new Error('Failed to fetch user data');
        }
        
        userDataFromAPI = await response.json();
      } else {
        // Regular username/password login
        console.log('Regular login for:', username);
        
        const response = await fetch(`${API_URL}/api/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password })
        });
        
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Login failed');
        }
        
        userDataFromAPI = await response.json();
        token = userDataFromAPI.token;
        
        localStorage.setItem('token', token);
        localStorage.setItem('username', username);
      }
      
      const processed = processUserData(userDataFromAPI);
      
      setUserData(processed);
      setIsLoggedIn(true);
      setIsPremium(true);
      
      localStorage.setItem('userData', JSON.stringify(processed));
      localStorage.setItem('isLoggedIn', 'true');
      
      setIsLoading(false);
      toast.success(`Welcome, ${processed.username}!`);
      
      return true;
    } catch (err) {
      console.error('Login error:', err);
      setIsLoading(false);
      toast.error(err.message || 'Login failed. Please try again.');
      return false;
    }
  };

  // Mock login for testing
  const loginViaMock = async (username, password) => {
    try {
      setIsLoading(true);
      console.log('Logging in with:', username);
      
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Clear ML data when switching users
      await clearMLData();
      
      let mockUserData;
      
      switch(username.toLowerCase()) {
        case 'testuser':
        case 'test':
        case 'demo':
          mockUserData = comprehensiveMockData;
          break;
          
        case 'newbie':
        case 'new':
        case 'beginner':
          mockUserData = newUserMockData;
          break;
          
        case 'veteran':
        case 'vet':
        case 'master':
        case 'king':
          mockUserData = veteranUserMockData;
          break;
          
        case 'struggling':
        case 'struggle':
        case 'hard':
          mockUserData = strugglingUserMockData;
          break;
          
        case 'intj':
          mockUserData = intjMockData;
          break;
          
        case 'intp':
          mockUserData = intpMockData;
          break;
          
        case 'enfp':
          mockUserData = enfpMockData;
          break;
          
        case 'aitest1':
          mockUserData = aiTestUser1;
          break;
        case 'aitest2':
          mockUserData = aiTestUser2;
          break;
        case 'aitest3':
          mockUserData = aiTestUser3;
          break;
        case 'aitest4':
          mockUserData = aiTestUser4;
          break;
        case 'aitest5':
          mockUserData = aiTestUser5;
          break;
        case 'aitest6':
          mockUserData = aiTestUser6;
          break;
        case 'aicard':
        case 'aicardtest':
          mockUserData = aiCardTestUser;
          break;
          
        default:
          mockUserData = comprehensiveMockData;
      }
      
      const processed = { ...mockUserData };
      
      setUserData(processed);
      setIsLoggedIn(true);
      setIsPremium(true);
      
      localStorage.setItem('userData', JSON.stringify(processed));
      localStorage.setItem('isLoggedIn', 'true');
      
      setIsLoading(false);
      
      const scenarioInfo = getScenarioInfo(username);
      toast.success(`${scenarioInfo} - All features unlocked!`);
      
      return true;
    } catch (err) {
      console.error('Login error:', err);
      setIsLoading(false);
      toast.error('Login failed. Please try again.');
      return false;
    }
  };

  // Main login function - routes to mock or API based on mode
  const login = async (username, password = 'demo', isGoogleAuth = false) => {
    // Always use API for Google auth, regardless of MOCK_MODE
    if (isGoogleAuth || !MOCK_MODE) {
      return loginViaAPI(username, password, isGoogleAuth);
    }
    return loginViaMock(username, password);
  };

  const getScenarioInfo = (username) => {
    switch(username.toLowerCase()) {
      case 'testuser':
      case 'test':
      case 'demo':
        return 'Comprehensive mock data loaded';
      case 'newbie':
      case 'new':
      case 'beginner':
        return 'New user scenario (Day 3)';
      case 'veteran':
      case 'vet':
      case 'master':
      case 'king':
        return 'Veteran user (Day 45)';
      case 'struggling':
      case 'struggle':
      case 'hard':
        return 'Struggling user scenario';
      case 'intj':
        return 'INTJ personality type';
      case 'intp':
        return 'INTP personality type';
      case 'enfp':
        return 'ENFP personality type';
      case 'aitest1':
        return 'AI Test: Insufficient data (<20 days)';
      case 'aitest2':
        return 'AI Test: Low risk prediction';
      case 'aitest3':
        return 'AI Test: Medium risk prediction';
      case 'aitest4':
        return 'AI Test: High risk prediction';
      case 'aitest5':
        return 'AI Test: Long streak (Day 60)';
      case 'aitest6':
        return 'AI Test: Recovery pattern (Day 8)';
      case 'aicard':
      case 'aicardtest':
        return 'AI Card Test: Daily log → prediction demo';
      default:
        return 'Comprehensive mock data loaded';
    }
  };

  const logout = (customMessage) => {
    // Clear all local storage FIRST
    localStorage.removeItem('userData');
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    
    // Show toast before redirect
    toast.success(customMessage || 'Logged out successfully');
    
    // Small delay to let toast show, then force redirect to landing page
    setTimeout(() => {
      window.location.href = '/';
    }, 300);
  };

  // ================================================================
  // UPDATE USER DATA - NOW WITH PROPER SYNC
  // ================================================================
  const updateUserData = async (newData) => {
    try {
      const updatedData = { ...userData, ...newData };
      
      // Check badges based on streak
      if (updatedData.currentStreak && updatedData.badges) {
        const milestones = [7, 14, 30, 90, 180, 365];
        updatedData.badges = updatedData.badges.map((badge, index) => {
          const milestone = milestones[index];
          if (updatedData.currentStreak >= milestone && !badge.earned) {
            return { ...badge, earned: true, date: new Date() };
          }
          return badge;
        });
      }
      
      // Update longest streak if needed
      if (updatedData.currentStreak > updatedData.longestStreak) {
        updatedData.longestStreak = updatedData.currentStreak;
      }
      
      // Check goal achievement
      if (updatedData.goal?.isActive && updatedData.goal?.targetDays) {
        const isAchieved = updatedData.currentStreak >= updatedData.goal.targetDays;
        if (isAchieved && !updatedData.goal.achieved) {
          updatedData.goal.achieved = true;
          updatedData.goal.achievementDate = new Date();
          toast.success(`🎯 Goal Complete! You reached ${updatedData.goal.targetDays} days!`);
        }
      }

      // Update state immediately for responsive UI
      setUserData(updatedData);
      setIsPremium(true);
      
      // Save to localStorage as cache/fallback
      localStorage.setItem('userData', JSON.stringify(updatedData));
      
      // CRITICAL: Sync to MongoDB (now with proper error handling)
      if (!MOCK_MODE) {
        await syncToAPI(updatedData);
      }
      
      return true;
    } catch (err) {
      console.error('Update user data error:', err);
      toast.error('Failed to update data');
      return false;
    }
  };

  const setGoal = (targetDays) => {
    try {
      if (!userData.startDate) {
        toast.error('Please set your start date first');
        return false;
      }

      const targetDate = calculateGoalTargetDate(userData.startDate, targetDays);
      const isAchieved = checkGoalAchievement(userData.currentStreak, targetDays);
      
      const goalData = {
        goal: {
          targetDays,
          isActive: true,
          targetDate,
          achieved: isAchieved,
          achievementDate: isAchieved ? new Date() : null
        }
      };

      // Also set achievementDate for already-achieved goals
      if (isAchieved) {
        goalData.goal.achievementDate = userData.startDate ? 
          addDays(new Date(userData.startDate), targetDays - 1) : null;
      }

      updateUserData(goalData);
      
      return true;
    } catch (err) {
      console.error('Set goal error:', err);
      toast.error('Failed to set goal');
      return false;
    }
  };

  const cancelGoal = () => {
    try {
      const goalData = {
        goal: {
          targetDays: null,
          isActive: false,
          targetDate: null,
          achieved: false,
          achievementDate: null
        }
      };

      updateUserData(goalData);
      return true;
    } catch (err) {
      console.error('Cancel goal error:', err);
      toast.error('Failed to cancel goal');
      return false;
    }
  };

  // ================================================================
  // INITIALIZATION - NOW FETCHES FROM MONGODB
  // ================================================================
  useEffect(() => {
    const initializeUser = async () => {
      const storedIsLoggedIn = localStorage.getItem('isLoggedIn');
      const token = localStorage.getItem('token');
      const username = localStorage.getItem('username');
      
      // User is logged in - try to fetch fresh data from MongoDB
      if (storedIsLoggedIn === 'true' && token && username && !MOCK_MODE) {
        setIsLoading(true);
        
        try {
          // Fetch fresh data from MongoDB
          const freshData = await fetchUserDataFromAPI(username, token);
          
          if (freshData) {
            // Got fresh data from MongoDB - use it
            setUserData(freshData);
            setIsLoggedIn(true);
            setIsPremium(true);
            localStorage.setItem('userData', JSON.stringify(freshData));
            console.log('✅ Loaded fresh data from MongoDB');
          } else {
            // API fetch failed - fall back to localStorage
            const storedUserData = localStorage.getItem('userData');
            if (storedUserData) {
              const parsedUserData = processUserData(JSON.parse(storedUserData));
              setUserData(parsedUserData);
              setIsLoggedIn(true);
              setIsPremium(true);
              console.log('⚠️ Using cached localStorage data (API unavailable)');
              toast('Using offline data', { icon: '📴', duration: 2000 });
            }
          }
        } catch (err) {
          console.error('Error initializing user:', err);
          // Fall back to localStorage on error
          const storedUserData = localStorage.getItem('userData');
          if (storedUserData) {
            const parsedUserData = processUserData(JSON.parse(storedUserData));
            setUserData(parsedUserData);
            setIsLoggedIn(true);
            setIsPremium(true);
          }
        }
        
        setIsLoading(false);
      } 
      // MOCK MODE or no login - use localStorage directly
      else if (storedIsLoggedIn === 'true') {
        const storedUserData = localStorage.getItem('userData');
        if (storedUserData) {
          try {
            const parsedUserData = processUserData(JSON.parse(storedUserData));
            setUserData(parsedUserData);
            setIsLoggedIn(true);
            setIsPremium(true);
            localStorage.setItem('userData', JSON.stringify(parsedUserData));
          } catch (err) {
            console.error('Error parsing stored user data:', err);
            localStorage.removeItem('userData');
            localStorage.removeItem('isLoggedIn');
          }
        }
      }
    };

    initializeUser();
  }, [fetchUserDataFromAPI]);

  return { 
    userData, 
    isLoggedIn, 
    isPremium: true,
    isLoading,
    syncStatus,
    login, 
    logout, 
    updateUserData,
    setGoal,
    cancelGoal,
    syncToAPI // Expose for manual sync if needed
  };
};

export default useUserData;