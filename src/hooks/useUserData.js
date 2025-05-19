import { useState, useEffect } from 'react';
import axios from 'axios';

export const useUserData = () => {
  const [userData, setUserData] = useState({
    username: '',
    startDate: null,
    currentStreak: 0,
    longestStreak: 0,
    wetDreamCount: 0,
    relapseCount: 0,
    isPremium: false,
    badges: [],
    benefitTracking: [],
    streakHistory: [],
    urgeToolUsage: [],
    discordUsername: '',
    showOnLeaderboard: false,
    notes: {}
  });
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  const [token, setToken] = useState(null);

  // Important: Check the API_URL - this might be wrong in your current code
  const API_URL = process.env.NODE_ENV === 'production'
    ? '/api' // When in production, the API is at the same domain
    : 'http://localhost:5001/api'; // For local development

  const login = async (username, password = 'demo') => {
    try {
      console.log('Attempting login for:', username);
      const response = await axios.post(`${API_URL}/login`, { username, password });
      setToken(response.data.token);
      setUserData({
        ...response.data,
        startDate: response.data.startDate ? new Date(response.data.startDate) : null,
        benefitTracking: response.data.benefitTracking ? response.data.benefitTracking.map(item => ({
          ...item,
          date: new Date(item.date)
        })) : [],
        streakHistory: response.data.streakHistory ? response.data.streakHistory.map(streak => ({
          ...streak,
          start: new Date(streak.start),
          end: streak.end ? new Date(streak.end) : null
        })) : [],
        badges: response.data.badges ? response.data.badges.map(badge => ({
          ...badge,
          date: badge.date ? new Date(badge.date) : null
        })) : [],
        urgeToolUsage: response.data.urgeToolUsage ? response.data.urgeToolUsage.map(usage => ({
          ...usage,
          date: new Date(usage.date)
        })) : []
      });
      setIsLoggedIn(true);
      setIsPremium(response.data.isPremium || false);
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('username', username);
      console.log('Login successful:', username);
    } catch (err) {
      console.error('Login error:', err);
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
      badges: [],
      benefitTracking: [],
      streakHistory: [],
      urgeToolUsage: [],
      discordUsername: '',
      showOnLeaderboard: false,
      notes: {}
    });
    setIsLoggedIn(false);
    setIsPremium(false);
    setToken(null);
    localStorage.removeItem('token');
    localStorage.removeItem('username');
  };

  const updateUserData = async (newData) => {
    try {
      console.log('Updating user data:', newData);
      
      // Make sure we have a username
      const username = userData.username || localStorage.getItem('username') || 'testuser';
      
      // Prepare data for sending to API
      const dataToSend = {
        ...newData,
        // Convert Date objects to ISO strings for API
        startDate: newData.startDate instanceof Date ? newData.startDate.toISOString() : newData.startDate
      };
      
      const response = await axios.put(
        `${API_URL}/user/${username}`,
        dataToSend,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (response.data) {
        setUserData({
          ...response.data,
          startDate: response.data.startDate ? new Date(response.data.startDate) : null,
          benefitTracking: response.data.benefitTracking ? response.data.benefitTracking.map(item => ({
            ...item,
            date: new Date(item.date)
          })) : [],
          streakHistory: response.data.streakHistory ? response.data.streakHistory.map(streak => ({
            ...streak,
            start: new Date(streak.start),
            end: streak.end ? new Date(streak.end) : null
          })) : [],
          badges: response.data.badges ? response.data.badges.map(badge => ({
            ...badge,
            date: badge.date ? new Date(badge.date) : null
          })) : [],
          urgeToolUsage: response.data.urgeToolUsage ? response.data.urgeToolUsage.map(usage => ({
            ...usage,
            date: new Date(usage.date)
          })) : []
        });
        setIsPremium(response.data.isPremium || false);
        console.log('User data updated:', response.data);
      }
    } catch (err) {
      console.error('Update user data error:', err);
    }
  };

  // Check for existing token on mount
  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    const storedUsername = localStorage.getItem('username');
    
    if (storedToken && storedUsername) {
      setToken(storedToken);
      const fetchUser = async () => {
        try {
          console.log('Fetching user data for:', storedUsername);
          const response = await axios.get(
            `${API_URL}/user/${storedUsername}`,
            { headers: { Authorization: `Bearer ${storedToken}` } }
          );
          
          if (response.data) {
            setUserData({
              ...response.data,
              startDate: response.data.startDate ? new Date(response.data.startDate) : null,
              benefitTracking: response.data.benefitTracking ? response.data.benefitTracking.map(item => ({
                ...item,
                date: new Date(item.date)
              })) : [],
              streakHistory: response.data.streakHistory ? response.data.streakHistory.map(streak => ({
                ...streak,
                start: new Date(streak.start),
                end: streak.end ? new Date(streak.end) : null
              })) : [],
              badges: response.data.badges ? response.data.badges.map(badge => ({
                ...badge,
                date: badge.date ? new Date(badge.date) : null
              })) : [],
              urgeToolUsage: response.data.urgeToolUsage ? response.data.urgeToolUsage.map(usage => ({
                ...usage,
                date: new Date(usage.date)
              })) : []
            });
            setIsLoggedIn(true);
            setIsPremium(response.data.isPremium || false);
          }
        } catch (err) {
          console.error('Fetch user error:', err);
          logout();
        }
      };
      fetchUser();
    }
  }, []);

  return { userData, isLoggedIn, isPremium, login, logout, updateUserData };
};