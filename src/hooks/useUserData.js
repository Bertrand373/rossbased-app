import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';

/**
 * Premium Features Control
 * 
 * Currently all users have premium features enabled for testing purposes.
 * To re-enable premium restrictions, search for "isPremium: true" below
 * and change it back to "isPremium: username === 'premium'"
 */

// Custom hook to manage user data
export const useUserData = () => {
  const [userData, setUserData] = useState({
    username: '',
    email: '', // ADDED: Profile field
    startDate: null,
    currentStreak: 0,
    longestStreak: 0,
    wetDreamCount: 0,
    relapseCount: 0,
    isPremium: false,
    badges: [
      { id: 1, name: '7-Day Warrior', earned: false, date: null },
      { id: 2, name: '14-Day Monk', earned: false, date: null },
      { id: 3, name: '30-Day Master', earned: false, date: null },
      { id: 4, name: '90-Day King', earned: false, date: null }
    ],
    benefitTracking: [],
    emotionalTracking: [], // ADDED: New emotional tracking array
    streakHistory: [],
    urgeToolUsage: [],
    urgeLog: [], // ADDED: New urge log for emergency toolkit
    discordUsername: '',
    showOnLeaderboard: false,
    notes: {},
    // ADDED: Profile-specific fields
    dataSharing: false, // Privacy setting
    analyticsOptIn: true, // Privacy setting - default true
    marketingEmails: false, // Privacy setting
    darkMode: true, // App setting - default true (dark theme)
    notifications: true, // App setting - default true
    language: 'en', // App setting - default English
    wisdomMode: false // App setting - default practical mode
  });
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // FIXED: Mock login function without react-hot-toast loading spinner
  const login = async (username, password = 'demo') => {
    try {
      setIsLoading(true);
      console.log('Logging in with:', username);
      
      // FIXED: Simulate API call delay without toast loading
      await new Promise(resolve => setTimeout(resolve, 2000)); // 2 seconds to show our helmet
      
      // Create mock data for the user
      const mockUserData = {
        username,
        email: `${username}@example.com`, // ADDED: Mock email based on username
        startDate: new Date(new Date().setDate(new Date().getDate() - 7)), // 7 days ago
        currentStreak: 7,
        longestStreak: 14,
        wetDreamCount: 1,
        relapseCount: 2,
        isPremium: true, // Set to true for all users for now
        badges: [
          { id: 1, name: '7-Day Warrior', earned: true, date: new Date() },
          { id: 2, name: '14-Day Monk', earned: false, date: null },
          { id: 3, name: '30-Day Master', earned: false, date: null },
          { id: 4, name: '90-Day King', earned: false, date: null }
        ],
        benefitTracking: [
          { 
            date: new Date(), 
            energy: 8, 
            focus: 7, 
            confidence: 6, 
            aura: 7, 
            sleep: 6, // CHANGED: sleep replaces attraction
            workout: 8 
          },
          { 
            date: new Date(new Date().setDate(new Date().getDate() - 1)), 
            energy: 7, 
            focus: 6, 
            confidence: 5, 
            aura: 6, 
            sleep: 5, // CHANGED: sleep replaces attraction
            workout: 7 
          },
          { 
            date: new Date(new Date().setDate(new Date().getDate() - 2)), 
            energy: 6, 
            focus: 5, 
            confidence: 4, 
            aura: 5, 
            sleep: 4, // CHANGED: sleep replaces attraction
            workout: 6 
          }
        ],
        // ADDED: Mock emotional tracking data
        emotionalTracking: [
          {
            date: new Date(),
            day: 7,
            phase: 1,
            anxiety: 4,
            moodStability: 7,
            mentalClarity: 8,
            emotionalProcessing: 6
          },
          {
            date: new Date(new Date().setDate(new Date().getDate() - 1)),
            day: 6,
            phase: 1,
            anxiety: 5,
            moodStability: 6,
            mentalClarity: 7,
            emotionalProcessing: 5
          },
          {
            date: new Date(new Date().setDate(new Date().getDate() - 2)),
            day: 5,
            phase: 1,
            anxiety: 6,
            moodStability: 5,
            mentalClarity: 6,
            emotionalProcessing: 4
          }
        ],
        streakHistory: [
          { 
            id: 1, 
            start: new Date(new Date().setDate(new Date().getDate() - 20)), 
            end: new Date(new Date().setDate(new Date().getDate() - 13)), 
            days: 7,
            reason: 'relapse'
          },
          { 
            id: 2, 
            start: new Date(new Date().setDate(new Date().getDate() - 7)), 
            end: null, 
            days: 7,
            reason: null
          }
        ],
        urgeToolUsage: [],
        // ADDED: Mock urge log data for emergency toolkit
        urgeLog: [
          {
            date: new Date(new Date().setDate(new Date().getDate() - 2)),
            intensity: 6,
            trigger: 'stress',
            protocol: 'breathing',
            phase: 'Foundation Phase',
            day: 5
          },
          {
            date: new Date(new Date().setDate(new Date().getDate() - 1)),
            intensity: 4,
            trigger: 'boredom',
            protocol: 'mental',
            phase: 'Foundation Phase',
            day: 6
          }
        ],
        discordUsername: username + '_discord',
        showOnLeaderboard: true,
        notes: {
          [new Date().toISOString().split('T')[0]]: "Feeling stronger each day. Noticed improved energy levels today. The timeline is helping me understand that this anxiety I'm feeling is normal for day 7."
        },
        // ADDED: Profile-specific fields with realistic defaults
        dataSharing: false,
        analyticsOptIn: true,
        marketingEmails: false,
        darkMode: true,
        notifications: true,
        language: 'en',
        wisdomMode: false
      };
      
      setUserData(mockUserData);
      setIsLoggedIn(true);
      setIsPremium(mockUserData.isPremium);
      
      // Save to localStorage to persist
      localStorage.setItem('userData', JSON.stringify(mockUserData));
      localStorage.setItem('isLoggedIn', 'true');
      
      setIsLoading(false);
      
      // FIXED: Show success toast AFTER loading is complete
      toast.success(`Welcome, ${username}!`);
      
      return true;
    } catch (err) {
      console.error('Login error:', err);
      setIsLoading(false);
      toast.error('Login failed. Please try again.');
      return false;
    }
  };

  const logout = () => {
    setUserData({
      username: '',
      email: '', // ADDED: Reset email
      startDate: null,
      currentStreak: 0,
      longestStreak: 0,
      wetDreamCount: 0,
      relapseCount: 0,
      isPremium: false,
      badges: [
        { id: 1, name: '7-Day Warrior', earned: false, date: null },
        { id: 2, name: '14-Day Monk', earned: false, date: null },
        { id: 3, name: '30-Day Master', earned: false, date: null },
        { id: 4, name: '90-Day King', earned: false, date: null }
      ],
      benefitTracking: [],
      emotionalTracking: [], // ADDED: Reset emotional tracking
      streakHistory: [],
      urgeToolUsage: [],
      urgeLog: [], // ADDED: Reset urge log
      discordUsername: '',
      showOnLeaderboard: false,
      notes: {},
      // ADDED: Reset profile fields to defaults
      dataSharing: false,
      analyticsOptIn: true,
      marketingEmails: false,
      darkMode: true,
      notifications: true,
      language: 'en',
      wisdomMode: false
    });
    setIsLoggedIn(false);
    setIsPremium(false);
    
    // Clear localStorage
    localStorage.removeItem('userData');
    localStorage.removeItem('isLoggedIn');
    
    toast.success('Logged out successfully');
  };

  const updateUserData = (newData) => {
    try {
      const updatedData = { ...userData, ...newData };
      setUserData(updatedData);
      
      // Update premium status if it changed
      if (newData.isPremium !== undefined) {
        setIsPremium(newData.isPremium);
      }
      
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
            // Add default values for new benefits if they don't exist
            aura: item.aura || 5,
            sleep: item.sleep || item.attraction || 5, // MIGRATION: Handle old attraction data
            workout: item.workout || item.gymPerformance || 5
          }));
        }
        
        // ADDED: Handle emotional tracking data conversion
        if (parsedUserData.emotionalTracking) {
          parsedUserData.emotionalTracking = parsedUserData.emotionalTracking.map(item => ({
            ...item,
            date: new Date(item.date)
          }));
        } else {
          // Initialize emotional tracking if it doesn't exist
          parsedUserData.emotionalTracking = [];
        }
        
        // ADDED: Handle urge log data conversion
        if (parsedUserData.urgeLog) {
          parsedUserData.urgeLog = parsedUserData.urgeLog.map(item => ({
            ...item,
            date: new Date(item.date)
          }));
        } else {
          // Initialize urge log if it doesn't exist
          parsedUserData.urgeLog = [];
        }
        
        if (parsedUserData.streakHistory) {
          parsedUserData.streakHistory = parsedUserData.streakHistory.map(streak => ({
            ...streak,
            start: new Date(streak.start),
            end: streak.end ? new Date(streak.end) : null
          }));
        }
        
        // ADDED: Set default values for profile fields if they don't exist
        parsedUserData.email = parsedUserData.email || '';
        parsedUserData.dataSharing = parsedUserData.dataSharing || false;
        parsedUserData.analyticsOptIn = parsedUserData.analyticsOptIn !== false; // Default true
        parsedUserData.marketingEmails = parsedUserData.marketingEmails || false;
        parsedUserData.darkMode = parsedUserData.darkMode !== false; // Default true
        parsedUserData.notifications = parsedUserData.notifications !== false; // Default true
        parsedUserData.language = parsedUserData.language || 'en';
        parsedUserData.wisdomMode = parsedUserData.wisdomMode || false;
        
        setUserData(parsedUserData);
        setIsLoggedIn(true);
        setIsPremium(parsedUserData.isPremium || false);
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
    isPremium, 
    isLoading,
    login, 
    logout, 
    updateUserData 
  };
};

export default useUserData;