// hooks/useUserData.js - Custom hook for managing user data with premium enabled
import { useState, useEffect } from 'react';

// Mock data - In a real app, this would be stored in a database
const initialUserData = {
  username: 'User',
  startDate: new Date(new Date().setDate(new Date().getDate() - 14)), // 14 days ago
  currentStreak: 14,
  longestStreak: 30,
  wetDreamCount: 2,
  relapseCount: 5,
  isPremium: true, // Changed to true for premium testing
  badges: [
    { id: 1, name: '7-Day Warrior', earned: true, date: new Date(new Date().setDate(new Date().getDate() - 7)) },
    { id: 2, name: '14-Day Monk', earned: true, date: new Date() },
    { id: 3, name: '30-Day Master', earned: false, date: null },
    { id: 4, name: '90-Day King', earned: false, date: null },
  ],
  benefitTracking: [
    { date: new Date(new Date().setDate(new Date().getDate() - 13)), energy: 6, focus: 5, confidence: 4 },
    { date: new Date(new Date().setDate(new Date().getDate() - 12)), energy: 6, focus: 6, confidence: 5 },
    { date: new Date(new Date().setDate(new Date().getDate() - 11)), energy: 7, focus: 6, confidence: 5 },
    { date: new Date(new Date().setDate(new Date().getDate() - 10)), energy: 7, focus: 7, confidence: 6 },
    { date: new Date(new Date().setDate(new Date().getDate() - 9)), energy: 8, focus: 7, confidence: 6 },
    { date: new Date(new Date().setDate(new Date().getDate() - 8)), energy: 8, focus: 8, confidence: 7 },
    { date: new Date(new Date().setDate(new Date().getDate() - 7)), energy: 9, focus: 8, confidence: 7 },
    { date: new Date(new Date().setDate(new Date().getDate() - 6)), energy: 8, focus: 8, confidence: 8 },
    { date: new Date(new Date().setDate(new Date().getDate() - 5)), energy: 9, focus: 9, confidence: 8 },
    { date: new Date(new Date().setDate(new Date().getDate() - 4)), energy: 9, focus: 9, confidence: 9 },
    { date: new Date(new Date().setDate(new Date().getDate() - 3)), energy: 8, focus: 9, confidence: 8 },
    { date: new Date(new Date().setDate(new Date().getDate() - 2)), energy: 9, focus: 8, confidence: 9 },
    { date: new Date(new Date().setDate(new Date().getDate() - 1)), energy: 9, focus: 9, confidence: 9 },
    { date: new Date(), energy: 10, focus: 9, confidence: 10 },
  ],
  streakHistory: [
    { id: 1, start: new Date(new Date().setDate(new Date().getDate() - 50)), end: new Date(new Date().setDate(new Date().getDate() - 30)), days: 20, reason: 'relapse' },
    { id: 2, start: new Date(new Date().setDate(new Date().getDate() - 25)), end: new Date(new Date().setDate(new Date().getDate() - 15)), days: 10, reason: 'wet dream' },
    { id: 3, start: new Date(new Date().setDate(new Date().getDate() - 14)), end: null, days: 14, reason: null },
  ],
  urgeToolUsage: [
    { date: new Date(new Date().setDate(new Date().getDate() - 10)), tool: 'timer', effective: true },
    { date: new Date(new Date().setDate(new Date().getDate() - 7)), tool: 'redirect', effective: true },
    { date: new Date(new Date().setDate(new Date().getDate() - 5)), tool: 'affirmation', effective: false },
    { date: new Date(new Date().setDate(new Date().getDate() - 2)), tool: 'timer', effective: true },
  ],
  discordUsername: 'user123',
  showOnLeaderboard: true,
  notes: {},
};

export const useUserData = () => {
  // Try to get user data from localStorage
  const getSavedUserData = () => {
    const savedData = localStorage.getItem('srTrackerUserData');
    if (savedData) {
      const parsedData = JSON.parse(savedData);
      
      // Convert date strings back to Date objects
      parsedData.startDate = new Date(parsedData.startDate);
      
      if (parsedData.benefitTracking) {
        parsedData.benefitTracking = parsedData.benefitTracking.map(item => ({
          ...item,
          date: new Date(item.date)
        }));
      }
      
      if (parsedData.streakHistory) {
        parsedData.streakHistory = parsedData.streakHistory.map(streak => ({
          ...streak,
          start: new Date(streak.start),
          end: streak.end ? new Date(streak.end) : null
        }));
      }
      
      if (parsedData.badges) {
        parsedData.badges = parsedData.badges.map(badge => ({
          ...badge,
          date: badge.date ? new Date(badge.date) : null
        }));
      }
      
      if (parsedData.urgeToolUsage) {
        parsedData.urgeToolUsage = parsedData.urgeToolUsage.map(usage => ({
          ...usage,
          date: new Date(usage.date)
        }));
      }
      
      return parsedData;
    }
    return initialUserData;
  };

  const [userData, setUserData] = useState(getSavedUserData);
  const [isLoggedIn, setIsLoggedIn] = useState(true); // For demo purposes, default to logged in
  const [isPremium, setIsPremium] = useState(true); // Changed to true for premium testing

  // Save userData to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('srTrackerUserData', JSON.stringify(userData));
  }, [userData]);

  // Update premium status when userData changes
  useEffect(() => {
    setIsPremium(true); // Force premium for testing
  }, [userData.isPremium]);

  const login = (username, password) => {
    // In a real app, this would validate credentials with a backend
    setIsLoggedIn(true);
    setUserData(prev => ({ ...prev, username }));
  };

  const logout = () => {
    setIsLoggedIn(false);
  };

  const updateUserData = (newData) => {
    setUserData(prev => ({ ...prev, ...newData }));
  };

  return {
    userData,
    isLoggedIn,
    isPremium,
    login,
    logout,
    updateUserData
  };
};