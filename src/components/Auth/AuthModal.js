// src/hooks/useUserData.js - UPDATED: Google OAuth support + Mock mode toggle
import { useState, useEffect } from 'react';
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

  // Seed ML data for AI card test user so the PatternInsightCard shows
  // UPDATED: Now 12 features including ET emotional data
  const seedMLDataForTesting = () => {
    const trainingHistory = {
      accuracy: [0.72, 0.75, 0.78],
      loss: [0.45, 0.38, 0.32],
      lastTrained: new Date().toISOString(),
      totalEpochs: 150
    };
    
    // 12 features: energy, focus, confidence, energyDrop, hourOfDay, isWeekend, 
    // streakDay, inPurgePhase, anxiety, moodStability, mentalClarity, emotionalProcessing
    const normalizationStats = {
      means: [6.5, 6.8, 6.5, 0.5, 14, 0.3, 20, 0.4, 5, 6, 5.5, 5],
      stds: [1.8, 1.6, 1.7, 1.2, 6, 0.45, 15, 0.49, 2, 2, 2, 2]
    };
    
    localStorage.setItem('ml_training_history', JSON.stringify(trainingHistory));
    localStorage.setItem('ml_normalization_stats', JSON.stringify(normalizationStats));
    
    console.log('🧠 ML data seeded for testing - PatternInsightCard will show (12 features)');
  };

  // Helper to process user data from API
  const processUserData = (data) => {
    const processed = { ...data };
    
    if (processed.startDate) {
      processed.startDate = new Date(processed.startDate);
    }
    
    if (!processed.goal) {
      processed.goal = {
        targetDays: null,
        isActive: false,
        targetDate: null,
        achieved: false,
        achievementDate: null
      };
    } else {
      if (processed.goal.targetDate) {
        processed.goal.targetDate = new Date(processed.goal.targetDate);
      }
      if (processed.goal.achievementDate) {
        processed.goal.achievementDate = new Date(processed.goal.achievementDate);
      }
    }
    
    if (processed.badges) {
      processed.badges = processed.badges.map(badge => ({
        ...badge,
        date: badge.date ? new Date(badge.date) : null
      }));
    }
    
    if (processed.benefitTracking) {
      processed.benefitTracking = processed.benefitTracking.map(item => ({
        ...item,
        date: new Date(item.date),
        aura: item.aura || 5,
        sleep: item.sleep || item.attraction || 5,
        workout: item.workout || item.gymPerformance || 5
      }));
    }
    
    if (processed.emotionalTracking) {
      processed.emotionalTracking = processed.emotionalTracking.map(item => ({
        ...item,
        date: new Date(item.date)
      }));
    } else {
      processed.emotionalTracking = [];
    }
    
    if (processed.urgeLog) {
      processed.urgeLog = processed.urgeLog.map(item => ({
        ...item,
        date: new Date(item.date)
      }));
    } else {
      processed.urgeLog = [];
    }
    
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
        case 'cardtest':
          mockUserData = aiCardTestUser;
          break;
          
        default:
          mockUserData = comprehensiveMockData;
          break;
      }
      
      mockUserData.isPremium = true;

      if (!mockUserData.goal) {
        mockUserData.goal = {
          targetDays: null,
          isActive: false,
          targetDate: null,
          achieved: false,
          achievementDate: null
        };
      }

      if (mockUserData.goal.isActive && mockUserData.goal.targetDays && mockUserData.startDate) {
        mockUserData.goal.targetDate = calculateGoalTargetDate(
          mockUserData.startDate, 
          mockUserData.goal.targetDays
        );
        
        if (checkGoalAchievement(mockUserData.currentStreak, mockUserData.goal.targetDays)) {
          if (!mockUserData.goal.achieved) {
            mockUserData.goal.achieved = true;
            mockUserData.goal.achievementDate = addDays(
              new Date(mockUserData.startDate), 
              mockUserData.goal.targetDays - 1
            );
          }
        }
      }
      
      setUserData(mockUserData);
      setIsLoggedIn(true);
      setIsPremium(true);
      
      // Seed ML data for AI card test user
      if (username.toLowerCase() === 'aicard' || username.toLowerCase() === 'cardtest') {
        seedMLDataForTesting();
      }
      
      localStorage.setItem('userData', JSON.stringify(mockUserData));
      localStorage.setItem('isLoggedIn', 'true');
      
      setIsLoading(false);
      
      const scenarioInfo = getScenarioInfo(username);
      toast.success(`Welcome, ${username}! ${scenarioInfo} - All features unlocked!`);
      
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
        return 'AI Test: Post-relapse recovery';
      case 'aicard':
      case 'cardtest':
        return 'AI Card Test: ML model seeded';
      default:
        return 'Loaded';
    }
  };

  const logout = async () => {
    // Clear ML data on logout
    await clearMLData();
    
    setUserData({
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
    setIsLoggedIn(false);
    setIsPremium(true);
    
    localStorage.removeItem('userData');
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    
    toast.success('Logged out successfully');
  };

  const updateUserData = async (newData) => {
    try {
      const updatedData = { ...userData, ...newData, isPremium: true };

      if (newData.startDate && updatedData.goal && updatedData.goal.isActive) {
        updatedData.goal.targetDate = calculateGoalTargetDate(
          newData.startDate, 
          updatedData.goal.targetDays
        );
        
        updatedData.goal.achieved = false;
        updatedData.goal.achievementDate = null;
        
        if (updatedData.currentStreak >= updatedData.goal.targetDays) {
          updatedData.goal.achieved = true;
          updatedData.goal.achievementDate = addDays(
            new Date(newData.startDate), 
            updatedData.goal.targetDays - 1
          );
        }
      }

      if (newData.currentStreak !== undefined && updatedData.goal && updatedData.goal.isActive) {
        if (!updatedData.goal.achieved && checkGoalAchievement(newData.currentStreak, updatedData.goal.targetDays)) {
          updatedData.goal.achieved = true;
          updatedData.goal.achievementDate = addDays(
            new Date(updatedData.startDate), 
            updatedData.goal.targetDays - 1
          );
          
          toast.success(`Goal achieved! You reached ${updatedData.goal.targetDays} days!`);
        }
      }

      setUserData(updatedData);
      setIsPremium(true);
      
      localStorage.setItem('userData', JSON.stringify(updatedData));
      
      // If not in mock mode, also save to API
      if (!MOCK_MODE) {
        const token = localStorage.getItem('token');
        if (token && updatedData.username) {
          fetch(`${API_URL}/api/user/${updatedData.username}`, {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(updatedData)
          }).catch(err => console.error('Failed to sync to API:', err));
        }
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
          achievementDate: isAchieved ? addDays(new Date(userData.startDate), targetDays - 1) : null
        }
      };

      updateUserData(goalData);
      
      // No toast needed - modal closing is sufficient confirmation
      
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
      // No toast needed - modal closing is sufficient confirmation
      return true;
    } catch (err) {
      console.error('Cancel goal error:', err);
      toast.error('Failed to cancel goal');
      return false;
    }
  };

  useEffect(() => {
    const storedIsLoggedIn = localStorage.getItem('isLoggedIn');
    const storedUserData = localStorage.getItem('userData');
    
    if (storedIsLoggedIn === 'true' && storedUserData) {
      try {
        const parsedUserData = JSON.parse(storedUserData);
        
        if (parsedUserData.startDate) {
          parsedUserData.startDate = new Date(parsedUserData.startDate);
          
          // SYNC STREAK ON APP LOAD - ensures accuracy after days away
          const today = new Date();
          const daysDiff = Math.floor((today - parsedUserData.startDate) / (1000 * 60 * 60 * 24));
          parsedUserData.currentStreak = Math.max(0, daysDiff);
          
          // Also update longestStreak if current exceeds it
          if (parsedUserData.currentStreak > (parsedUserData.longestStreak || 0)) {
            parsedUserData.longestStreak = parsedUserData.currentStreak;
          }
        }

        if (parsedUserData.goal) {
          if (parsedUserData.goal.targetDate) {
            parsedUserData.goal.targetDate = new Date(parsedUserData.goal.targetDate);
          }
          if (parsedUserData.goal.achievementDate) {
            parsedUserData.goal.achievementDate = new Date(parsedUserData.goal.achievementDate);
          }
        } else {
          parsedUserData.goal = {
            targetDays: null,
            isActive: false,
            targetDate: null,
            achieved: false,
            achievementDate: null
          };
        }
        
        if (parsedUserData.badges) {
          parsedUserData.badges = parsedUserData.badges.map(badge => ({
            ...badge,
            date: badge.date ? new Date(badge.date) : null
          }));
        }
        
        if (parsedUserData.benefitTracking) {
          parsedUserData.benefitTracking = parsedUserData.benefitTracking.map(item => ({
            ...item,
            date: new Date(item.date),
            aura: item.aura || 5,
            sleep: item.sleep || item.attraction || 5,
            workout: item.workout || item.gymPerformance || 5
          }));
        }
        
        if (parsedUserData.emotionalTracking) {
          parsedUserData.emotionalTracking = parsedUserData.emotionalTracking.map(item => ({
            ...item,
            date: new Date(item.date)
          }));
        } else {
          parsedUserData.emotionalTracking = [];
        }
        
        if (parsedUserData.urgeLog) {
          parsedUserData.urgeLog = parsedUserData.urgeLog.map(item => ({
            ...item,
            date: new Date(item.date)
          }));
        } else {
          parsedUserData.urgeLog = [];
        }
        
        if (parsedUserData.streakHistory) {
          parsedUserData.streakHistory = parsedUserData.streakHistory.map(streak => ({
            ...streak,
            start: new Date(streak.start),
            end: streak.end ? new Date(streak.end) : null
          }));
        }
        
        parsedUserData.email = parsedUserData.email || '';
        parsedUserData.dataSharing = parsedUserData.dataSharing || false;
        parsedUserData.analyticsOptIn = parsedUserData.analyticsOptIn !== false;
        parsedUserData.marketingEmails = parsedUserData.marketingEmails || false;
        parsedUserData.darkMode = parsedUserData.darkMode !== false;
        parsedUserData.notifications = parsedUserData.notifications !== false;
        parsedUserData.language = parsedUserData.language || 'en';
        parsedUserData.wisdomMode = parsedUserData.wisdomMode || false;
        parsedUserData.isPremium = true;
        
        setUserData(parsedUserData);
        setIsLoggedIn(true);
        setIsPremium(true);
        
        // Save updated streak back to localStorage
        localStorage.setItem('userData', JSON.stringify(parsedUserData));
      } catch (err) {
        console.error('Error parsing stored user data:', err);
        localStorage.removeItem('userData');
        localStorage.removeItem('isLoggedIn');
      }
    }
  }, []);

  return { 
    userData, 
    isLoggedIn, 
    isPremium: true,
    isLoading,
    login, 
    logout, 
    updateUserData,
    setGoal,
    cancelGoal
  };
};

export default useUserData;