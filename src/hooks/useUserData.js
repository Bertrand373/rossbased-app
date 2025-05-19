import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';

// Custom hook to manage user data
export const useUserData = () => {
  const [userData, setUserData] = useState({
    username: '',
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
    streakHistory: [],
    urgeToolUsage: [],
    discordUsername: '',
    showOnLeaderboard: false,
    notes: {}
  });
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Mock login function (in a real app, this would make an API call)
  const login = async (username, password = 'demo') => {
    try {
      setIsLoading(true);
      console.log('Logging in with:', username);
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Create mock data for the user
      const mockUserData = {
        username,
        startDate: new Date(new Date().setDate(new Date().getDate() - 7)), // 7 days ago
        currentStreak: 7,
        longestStreak: 14,
        wetDreamCount: 1,
        relapseCount: 2,
        isPremium: username === 'premium', // Make 'premium' user have premium features
        badges: [
          { id: 1, name: '7-Day Warrior', earned: true, date: new Date() },
          { id: 2, name: '14-Day Monk', earned: false, date: null },
          { id: 3, name: '30-Day Master', earned: false, date: null },
          { id: 4, name: '90-Day King', earned: false, date: null }
        ],
        benefitTracking: [
          { date: new Date(), energy: 8, focus: 7, confidence: 6 },
          { date: new Date(new Date().setDate(new Date().getDate() - 1)), energy: 7, focus: 6, confidence: 5 },
          { date: new Date(new Date().setDate(new Date().getDate() - 2)), energy: 6, focus: 5, confidence: 4 }
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
        discordUsername: username + '_discord',
        showOnLeaderboard: true,
        notes: {
          [new Date().toISOString().split('T')[0]]: "Feeling stronger each day. Noticed improved energy levels today."
        }
      };
      
      setUserData(mockUserData);
      setIsLoggedIn(true);
      setIsPremium(mockUserData.isPremium);
      
      // Save to localStorage to persist
      localStorage.setItem('userData', JSON.stringify(mockUserData));
      localStorage.setItem('isLoggedIn', 'true');
      
      toast.success(`Welcome, ${username}!`);
      setIsLoading(false);
      
      // Force redirect to tracker page by simulating a click on the tracker link
      const trackerLink = document.querySelector('a[href="/"]');
      if (trackerLink) {
        trackerLink.click();
      } else {
        // Fallback navigation if link not found
        window.location.href = '/';
      }
      
      return true;
    } catch (err) {
      console.error('Login error:', err);
      toast.error('Login failed. Please try again.');
      setIsLoading(false);
      return false;
    }
  };

  const logout = () => {
    setUserData({
      username: '',
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
      streakHistory: [],
      urgeToolUsage: [],
      discordUsername: '',
      showOnLeaderboard: false,
      notes: {}
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
            date: new Date(item.date)
          }));
        }
        
        if (parsedUserData.streakHistory) {
          parsedUserData.streakHistory = parsedUserData.streakHistory.map(streak => ({
            ...streak,
            start: new Date(streak.start),
            end: streak.end ? new Date(streak.end) : null
          }));
        }
        
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