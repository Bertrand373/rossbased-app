import { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

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

  // Helper function to clear user data
  const clearUserData = () => {
    // Clear localStorage
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    
    // Reset state
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
  };

  const login = async (username, password = 'demo') => {
    try {
      console.log('Attempting login for:', username);
      const response = await axios.post(`${API_URL}/login`, { username, password });
      console.log('Login response:', response.data);
      
      setToken(response.data.token);
      
      // Process the response data
      const processedData = {
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
      };
      
      console.log('Processed user data:', processedData);
      setUserData(processedData);
      setIsLoggedIn(true);
      setIsPremium(response.data.isPremium || false);
      
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('username', username);
      console.log('Login successful:', username);
      
      toast.success('Login successful!');
    } catch (err) {
      console.error('Login error:', err);
      toast.error('Login failed. Please try again.');
    }
  };

  const logout = () => {
    clearUserData();
    toast.success('Logged out successfully');
  };

  const updateUserData = async (newData) => {
    try {
      console.log('Updating user data with:', newData);
      
      // Make sure we have a username and token
      const username = userData.username || localStorage.getItem('username') || 'testuser';
      const currentToken = token || localStorage.getItem('token');
      
      if (!currentToken) {
        console.error('No token available for API request');
        toast.error('Authentication error. Please log in again.');
        clearUserData();
        return;
      }
      
      // Prepare data for sending to API
      const dataToSend = {
        ...newData,
      };
      
      // Special handling for dates
      if (newData.startDate instanceof Date) {
        dataToSend.startDate = newData.startDate.toISOString();
      }
      
      console.log('Sending data to API:', dataToSend);
      console.log('PUT URL:', `${API_URL}/user/${username}`);
      console.log('Using token:', currentToken.substring(0, 10) + '...');
      
      const response = await axios.put(
        `${API_URL}/user/${username}`,
        dataToSend,
        { 
          headers: { 
            'Authorization': `Bearer ${currentToken}`,
            'Content-Type': 'application/json'
          } 
        }
      );
      
      console.log('Update response:', response.data);
      
      if (response.data) {
        // Process the response data
        const processedData = {
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
        };
        
        console.log('Updated user data:', processedData);
        setUserData(processedData);
        setIsPremium(response.data.isPremium || false);
      }
    } catch (err) {
      console.error('Update user data error:', err);
      
      // Check for auth errors and handle them specially
      if (err.response && err.response.status === 401) {
        console.error('Authentication error. Token may be invalid.');
        toast.error('Your session has expired. Please log in again.');
        clearUserData();
      } else {
        console.error('Error details:', err.response?.data || err.message);
        toast.error('Failed to update data. Please try again.');
      }
    }
  };

  // Check for existing token on mount
  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    const storedUsername = localStorage.getItem('username');
    
    if (storedToken && storedUsername) {
      console.log('Found stored token and username:', storedUsername);
      console.log('Token:', storedToken.substring(0, 10) + '...');
      
      setToken(storedToken);
      const fetchUser = async () => {
        try {
          console.log('Fetching user data for:', storedUsername);
          const response = await axios.get(
            `${API_URL}/user/${storedUsername}`,
            { 
              headers: { 
                'Authorization': `Bearer ${storedToken}`,
                'Content-Type': 'application/json'
              } 
            }
          );
          
          console.log('Fetch user response:', response.data);
          
          if (response.data) {
            // Process the response data
            const processedData = {
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
            };
            
            console.log('Processed user data from fetch:', processedData);
            setUserData(processedData);
            setIsLoggedIn(true);
            setIsPremium(response.data.isPremium || false);
          }
        } catch (err) {
          console.error('Fetch user error:', err);
          
          // Handle authentication errors
          if (err.response && err.response.status === 401) {
            console.log('Token invalid or expired. Logging out.');
            toast.error('Your session has expired. Please log in again.');
          }
          
          // Always logout on error to force re-authentication
          clearUserData();
        }
      };
      fetchUser();
    }
  }, []);

  return { userData, isLoggedIn, isPremium, login, logout, updateUserData, clearUserData };
};