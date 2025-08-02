// src/hooks/useUserData.js - UPDATED: All users are now premium by default
import { useState, useEffect } from 'react';
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
  const [isLoading, setIsLoading] = useState(false);

  // UPDATED: Login function - all users get premium features
  const login = async (username, password = 'demo') => {
    try {
      setIsLoading(true);
      console.log('Logging in with:', username);
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
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
      
      setUserData(mockUserData);
      setIsLoggedIn(true);
      setIsPremium(true); // CHANGED: Always set to premium
      
      // Save to localStorage to persist
      localStorage.setItem('userData', JSON.stringify(mockUserData));
      localStorage.setItem('isLoggedIn', 'true');
      
      setIsLoading(false);
      
      // Show success toast with scenario info
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

  const updateUserData = (newData) => {
    try {
      // CHANGED: Ensure isPremium stays true
      const updatedData = { ...userData, ...newData, isPremium: true };
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

  // Load data from localStorage on mount
  useEffect(() => {
    const storedIsLoggedIn = localStorage.getItem('isLoggedIn');
    const storedUserData = localStorage.getItem('userData');
    
    if (storedIsLoggedIn === 'true' && storedUserData) {
      try {
        const parsedUserData = JSON.parse(storedUserData);
        
        // Convert string dates back to Date objects
        if (parsedUserData.startDate) {
          parsedUserData.startDate = new Date(parsedUserData.startDate);
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
  }, []);

  return { 
    userData, 
    isLoggedIn, 
    isPremium: true, // CHANGED: Always return true
    isLoading,
    login, 
    logout, 
    updateUserData 
  };
};

export default useUserData;