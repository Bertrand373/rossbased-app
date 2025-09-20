// src/hooks/useUserData.js - UPDATED: Enhanced loading states with login transition
import { useState, useEffect } from 'react';
import { addDays } from 'date-fns';
import toast from 'react-hot-toast';

// IMPORT: The comprehensive mock data including new personality users
import comprehensiveMockData, { 
  newUserMockData, 
  veteranUserMockData, 
  strugglingUserMockData,
  intjMockData,
  intpMockData,
  enfpMockData
} from '../mockData';

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
    isPremium: true, // CHANGED: All users are premium now
    // NEW: Goal system addition
    goal: {
      targetDays: null,         // 30, 60, 90, 180, or 365
      isActive: false,          // whether goal is set
      targetDate: null,         // startDate + targetDays
      achieved: false,          // whether current goal achieved
      achievementDate: null     // when goal was achieved
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
  const [isPremium, setIsPremium] = useState(true); // CHANGED: Default to premium
  
  // ENHANCED: Multiple loading states for different phases
  const [isLoading, setIsLoading] = useState(true); // CHANGED: Start with true for app refresh
  const [isLoginLoading, setIsLoginLoading] = useState(false);
  const [loginPhase, setLoginPhase] = useState(''); // 'authenticating' or 'loading-dashboard'

  // NEW: Helper function to calculate goal target date
  const calculateGoalTargetDate = (startDate, targetDays) => {
    if (!startDate || !targetDays) return null;
    return addDays(new Date(startDate), targetDays - 1); // -1 because day 1 is the start date
  };

  // NEW: Helper function to check if goal is achieved
  const checkGoalAchievement = (currentStreak, targetDays) => {
    return currentStreak >= targetDays;
  };

  // UPDATED: Enhanced login function with phase transitions
  const login = async (username, password = 'demo') => {
    try {
      // PHASE 1: "Logging you in..." (authenticating)
      setIsLoginLoading(true);
      setLoginPhase('authenticating');
      console.log('Logging in with:', username);
      
      // Simulate authentication delay
      await new Promise(resolve => setTimeout(resolve, 1200));
      
      // PHASE 2: "Loading your dashboard..." (loading-dashboard)
      setLoginPhase('loading-dashboard');
      
      // Simulate dashboard loading delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // CHOOSE MOCK DATA BASED ON USERNAME:
      let mockUserData;
      
      switch(username.toLowerCase()) {
        case 'testuser':
        case 'test':
        case 'demo':
          // MAIN SCENARIO: 25-day streak with rich history
          mockUserData = comprehensiveMockData;
          break;
          
        case 'newbie':
        case 'new':
        case 'beginner':
          // NEW USER: Day 0, clean slate
          mockUserData = newUserMockData;
          break;
          
        case 'veteran':
        case 'vet':
        case 'master':
        case 'king':
          // VETERAN: 127-day streak, all badges
          mockUserData = veteranUserMockData;
          break;
          
        case 'struggling':
        case 'struggle':
        case 'hard':
          // STRUGGLING: Multiple relapses, day 3
          mockUserData = strugglingUserMockData;
          break;
          
        // NEW PERSONALITY-BASED USERS
        case 'intj':
          // INTJ: Long-term retainer (425 days) with religious benefit tracking
          mockUserData = intjMockData;
          break;
          
        case 'intp':
          // INTP: 9 months retainer with good tracking history
          mockUserData = intpMockData;
          break;
          
        case 'enfp':
          // ENFP: Long SR streaks with some relapses, moderate tracking (can be lazy)
          mockUserData = enfpMockData;
          break;
          
        default:
          // DEFAULT: Use main comprehensive data for any other username
          mockUserData = comprehensiveMockData;
          break;
      }
      
      // CHANGED: Force all users to have premium features
      mockUserData.isPremium = true;

      // NEW: Initialize goal if not present
      if (!mockUserData.goal) {
        mockUserData.goal = {
          targetDays: null,
          isActive: false,
          targetDate: null,
          achieved: false,
          achievementDate: null
        };
      }

      // NEW: Calculate goal target date if goal is active
      if (mockUserData.goal.isActive && mockUserData.goal.targetDays && mockUserData.startDate) {
        mockUserData.goal.targetDate = calculateGoalTargetDate(
          mockUserData.startDate, 
          mockUserData.goal.targetDays
        );
        
        // Check if goal is achieved
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
      setIsPremium(true); // CHANGED: Always set to premium
      
      // Save to localStorage to persist
      localStorage.setItem('userData', JSON.stringify(mockUserData));
      localStorage.setItem('isLoggedIn', 'true');
      
      // Clear all loading states
      setIsLoginLoading(false);
      setLoginPhase('');
      
      // Show success toast with scenario info
      const scenarioInfo = getScenarioInfo(username);
      toast.success(`Welcome, ${username}! ${scenarioInfo} - All features unlocked!`);
      
      return true;
    } catch (err) {
      console.error('Login error:', err);
      setIsLoginLoading(false);
      setLoginPhase('');
      toast.error('Login failed. Please try again.');
      return false;
    }
  };

  // Helper function to show which scenario is loaded
  const getScenarioInfo = (username) => {
    switch(username.toLowerCase()) {
      case 'newbie':
      case 'new':
      case 'beginner':
        return '(New User - Day 0)';
      case 'veteran':
      case 'vet':
      case 'master':
      case 'king':
        return '(Veteran - 127 days!)';
      case 'struggling':
      case 'struggle':
      case 'hard':
        return '(Struggling - Day 3)';
      case 'intj':
        return '(INTJ - 425 days, Religious Tracker)';
      case 'intp':
        return '(INTP - 275 days, Good Tracker)';
      case 'enfp':
        return '(ENFP - 89 days, Previous 423 day streak)';
      default:
        return '(Main Demo - Day 25)';
    }
  };

  const logout = () => {
    setUserData({
      username: '',
      email: '',
      startDate: null,
      currentStreak: 0,
      longestStreak: 0,
      wetDreamCount: 0,
      relapseCount: 0,
      isPremium: true, // CHANGED: Keep premium even for empty state
      // NEW: Reset goal on logout
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
    setIsPremium(true); // CHANGED: Keep premium even when logged out
    
    // Clear localStorage
    localStorage.removeItem('userData');
    localStorage.removeItem('isLoggedIn');
    
    toast.success('Logged out successfully');
  };

  // UPDATED: updateUserData to handle goal recalculation
  const updateUserData = (newData) => {
    try {
      // CHANGED: Ensure isPremium stays true
      const updatedData = { ...userData, ...newData, isPremium: true };

      // NEW: Auto-recalculate goal when startDate changes (handles relapses)
      if (newData.startDate && updatedData.goal && updatedData.goal.isActive) {
        // Recalculate target date based on new start date
        updatedData.goal.targetDate = calculateGoalTargetDate(
          newData.startDate, 
          updatedData.goal.targetDays
        );
        
        // Reset achievement status since we have a new start date
        updatedData.goal.achieved = false;
        updatedData.goal.achievementDate = null;
        
        // Check if goal is immediately achieved (for cases where user sets goal after already having streak)
        if (updatedData.currentStreak >= updatedData.goal.targetDays) {
          updatedData.goal.achieved = true;
          updatedData.goal.achievementDate = addDays(
            new Date(newData.startDate), 
            updatedData.goal.targetDays - 1
          );
        }
      }

      // NEW: Check goal achievement when currentStreak updates
      if (newData.currentStreak !== undefined && updatedData.goal && updatedData.goal.isActive) {
        if (!updatedData.goal.achieved && checkGoalAchievement(newData.currentStreak, updatedData.goal.targetDays)) {
          updatedData.goal.achieved = true;
          updatedData.goal.achievementDate = addDays(
            new Date(updatedData.startDate), 
            updatedData.goal.targetDays - 1
          );
          
          // Show achievement toast
          toast.success(`🎉 Goal achieved! You reached ${updatedData.goal.targetDays} days!`);
        }
      }

      setUserData(updatedData);
      
      // Always keep premium status
      setIsPremium(true);
      
      // Save to localStorage
      localStorage.setItem('userData', JSON.stringify(updatedData));
      
      return true;
    } catch (err) {
      console.error('Update user data error:', err);
      toast.error('Failed to update data');
      return false;
    }
  };

  // NEW: Goal management functions
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
      
      if (isAchieved) {
        toast.success(`🎉 Goal set and already achieved! You've reached ${targetDays} days!`);
      } else {
        toast.success(`Goal set: Reach ${targetDays} days!`);
      }
      
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
      toast.success('Goal cancelled');
      return true;
    } catch (err) {
      console.error('Cancel goal error:', err);
      toast.error('Failed to cancel goal');
      return false;
    }
  };

  // ENHANCED: Load data from localStorage on mount with app refresh loading
  useEffect(() => {
    const initializeApp = async () => {
      // Show loading for app refresh (minimum 800ms for smooth experience)
      await new Promise(resolve => setTimeout(resolve, 800));
      
      const storedIsLoggedIn = localStorage.getItem('isLoggedIn');
      const storedUserData = localStorage.getItem('userData');
      
      if (storedIsLoggedIn === 'true' && storedUserData) {
        try {
          const parsedUserData = JSON.parse(storedUserData);
          
          // Convert string dates back to Date objects
          if (parsedUserData.startDate) {
            parsedUserData.startDate = new Date(parsedUserData.startDate);
          }

          // NEW: Handle goal data conversion
          if (parsedUserData.goal) {
            if (parsedUserData.goal.targetDate) {
              parsedUserData.goal.targetDate = new Date(parsedUserData.goal.targetDate);
            }
            if (parsedUserData.goal.achievementDate) {
              parsedUserData.goal.achievementDate = new Date(parsedUserData.goal.achievementDate);
            }
          } else {
            // Initialize goal if not present
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
          
          // Set default values for profile fields if they don't exist
          parsedUserData.email = parsedUserData.email || '';
          parsedUserData.dataSharing = parsedUserData.dataSharing || false;
          parsedUserData.analyticsOptIn = parsedUserData.analyticsOptIn !== false;
          parsedUserData.marketingEmails = parsedUserData.marketingEmails || false;
          parsedUserData.darkMode = parsedUserData.darkMode !== false;
          parsedUserData.notifications = parsedUserData.notifications !== false;
          parsedUserData.language = parsedUserData.language || 'en';
          parsedUserData.wisdomMode = parsedUserData.wisdomMode || false;
          
          // CHANGED: Force premium to true
          parsedUserData.isPremium = true;
          
          setUserData(parsedUserData);
          setIsLoggedIn(true);
          setIsPremium(true); // CHANGED: Always premium
        } catch (err) {
          console.error('Error parsing stored user data:', err);
          localStorage.removeItem('userData');
          localStorage.removeItem('isLoggedIn');
        }
      }
      
      // Finish loading regardless of login status
      setIsLoading(false);
    };

    initializeApp();
  }, []);

  return { 
    userData, 
    isLoggedIn, 
    isPremium: true, // CHANGED: Always return true
    isLoading, // App refresh loading
    isLoginLoading, // Login specific loading
    loginPhase, // Login phase for different messages
    login, 
    logout, 
    updateUserData,
    // NEW: Goal management functions
    setGoal,
    cancelGoal
  };
};

export default useUserData;