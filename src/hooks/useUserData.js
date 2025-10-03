// src/hooks/useUserData.js - UPDATED: Added all 6 AI test users
import { useState, useEffect } from 'react';
import { addDays } from 'date-fns';
import toast from 'react-hot-toast';

// IMPORT: All mock data including 6 AI test users
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
  aiTestUser6
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

  const login = async (username, password = 'demo') => {
    try {
      setIsLoading(true);
      console.log('Logging in with:', username);
      
      await new Promise(resolve => setTimeout(resolve, 2000));
      
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