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

  const API_URL = process.env.NODE_ENV === 'production'
    ? 'https://app.rossbased.com/api'
    : 'http://localhost:5001/api';

  const login = async (username, password = 'demo') => {
    try {
      console.log('Attempting login for:', username);
      const response = await axios.post(`${API_URL}/login`, { username, password });
      setToken(response.data.token);
      setUserData({
        ...response.data.user,
        startDate: response.data.user.startDate ? new Date(response.data.user.startDate) : null,
        benefitTracking: response.data.user.benefitTracking.map(item => ({
          ...item,
          date: new Date(item.date)
        })),
        streakHistory: response.data.user.streakHistory.map(streak => ({
          ...streak,
          start: new Date(streak.start),
          end: streak.end ? new Date(streak.end) : null
        })),
        badges: response.data.user.badges.map(badge => ({
          ...badge,
          date: badge.date ? new Date(badge.date) : null
        })),
        urgeToolUsage: response.data.user.urgeToolUsage.map(usage => ({
          ...usage,
          date: new Date(usage.date)
        }))
      });
      setIsLoggedIn(true);
      setIsPremium(response.data.user.isPremium || false);
      localStorage.setItem('token', response.data.token);
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
  };

  const updateUserData = async (newData) => {
    try {
      console.log('Updating user data:', newData);
      const response = await axios.post(
        `${API_URL}/user/${userData.username}`,
        newData,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setUserData({
        ...response.data,
        startDate: response.data.startDate ? new Date(response.data.startDate) : null,
        benefitTracking: response.data.benefitTracking.map(item => ({
          ...item,
          date: new Date(item.date)
        })),
        streakHistory: response.data.streakHistory.map(streak => ({
          ...streak,
          start: new Date(streak.start),
          end: streak.end ? new Date(streak.end) : null
        })),
        badges: response.data.badges.map(badge => ({
          ...badge,
          date: badge.date ? new Date(badge.date) : null
        })),
        urgeToolUsage: response.data.urgeToolUsage.map(usage => ({
          ...usage,
          date: new Date(usage.date)
        }))
      });
      setIsPremium(response.data.isPremium || false);
      console.log('User data updated:', response.data);
    } catch (err) {
      console.error('Update user data error:', err);
    }
  };

  // Check for existing token on mount
  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    if (storedToken) {
      setToken(storedToken);
      const fetchUser = async () => {
        try {
          const username = userData.username || 'demo';
          console.log('Fetching user data for:', username);
          const response = await axios.get(
            `${API_URL}/user/${username}`,
            { headers: { Authorization: `Bearer ${storedToken}` } }
          );
          setUserData({
            ...response.data,
            startDate: response.data.startDate ? new Date(response.data.startDate) : null,
            benefitTracking: response.data.benefitTracking.map(item => ({
              ...item,
              date: new Date(item.date)
            })),
            streakHistory: response.data.streakHistory.map(streak => ({
              ...streak,
              start: new Date(streak.start),
              end: streak.end ? new Date(streak.end) : null
            })),
            badges: response.data.badges.map(badge => ({
              ...badge,
              date: badge.date ? new Date(badge.date) : null
            })),
            urgeToolUsage: response.data.urgeToolUsage.map(usage => ({
              ...usage,
              date: new Date(usage.date)
            }))
          });
          setIsLoggedIn(true);
          setIsPremium(response.data.isPremium || false);
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
