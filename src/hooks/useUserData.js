// src/hooks/useUserData.js - FIXED: Clears ML data when switching users + AI Card Test User
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
  const seedMLDataForTesting = () => {
    const trainingHistory = {
      accuracy: [0.72, 0.75, 0.78],
      loss: [0.45, 0.38, 0.32],
      lastTrained: new Date().toISOString(),
      totalEpochs: 150
    };
    
    const normalizationStats = {
      means: [6.5, 6.8, 6.5, 0.5, 14, 0.3, 20, 0.4, 5, 6],
      stds: [1.8, 1.6, 1.7, 1.2, 6, 0.45, 15, 0.49, 2, 2]
    };
    
    localStorage.setItem('ml_training_history', JSON.stringify(trainingHistory));
    localStorage.setItem('ml_normalization_stats', JSON.stringify(normalizationStats));
    
    console.log('🧠 ML data seeded for testing - PatternInsightCard will show');
  };

  const login = async (username, password = 'demo') => {
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
      case 'aitest1':
        return '(AI Test 1 - Day 12, Building Data)';
      case 'aitest2':
        return '(AI Test 2 - Day 21, Ready to Train)';
      case 'aitest3':
        return '(AI Test 3 - Day 38, Low Risk 35%)';
      case 'aitest4':
        return '(AI Test 4 - Day 18, MODERATE RISK 55%)';
      case 'aitest5':
        return '(AI Test 5 - Day 19, HIGH RISK 72%)';
      case 'aitest6':
        return '(AI Test 6 - Day 45, AI Active 42%)';
      case 'aicard':
      case 'cardtest':
        return '(AI Card Test - Day 28, CARD VISIBLE)';
      default:
        return '(Main Demo - Day 25)';
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
    
    toast.success('Logged out successfully');
  };

  const updateUserData = (newData) => {
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
      
      if (isAchieved) {
        toast.success(`Goal set and already achieved! You've reached ${targetDays} days!`);
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

  useEffect(() => {
    const storedIsLoggedIn = localStorage.getItem('isLoggedIn');
    const storedUserData = localStorage.getItem('userData');
    
    if (storedIsLoggedIn === 'true' && storedUserData) {
      try {
        const parsedUserData = JSON.parse(storedUserData);
        
        if (parsedUserData.startDate) {
          parsedUserData.startDate = new Date(parsedUserData.startDate);
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