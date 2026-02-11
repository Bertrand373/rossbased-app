// src/hooks/useSubscription.js
// Manages subscription state for the entire app
// Calls /api/stripe/status on load to determine access level

import { useState, useEffect, useCallback } from 'react';

const API_URL = process.env.REACT_APP_API_URL || 'https://rossbased-app.onrender.com';

export const useSubscription = (isLoggedIn) => {
  const [subscriptionStatus, setSubscriptionStatus] = useState({
    hasPremium: true,     // Default true until we hear from server (prevents flash)
    reason: 'loading',
    daysLeft: null,
    subscription: {
      status: 'none',
      plan: 'none',
      trialEndDate: null,
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
      grandfatheredAt: null
    }
  });
  const [isLoading, setIsLoading] = useState(true);

  // ============================================
  // FETCH SUBSCRIPTION STATUS FROM SERVER
  // ============================================
  const fetchStatus = useCallback(async () => {
    if (!isLoggedIn) {
      setIsLoading(false);
      return;
    }
    
    // CRITICAL: Set loading TRUE before fetch starts
    // Without this, login transition leaves subLoading=false
    // and hasPremium=true (default), causing tracker flash
    setIsLoading(true);
    
    const token = localStorage.getItem('token');
    if (!token) {
      setIsLoading(false);
      return;
    }
    
    try {
      const response = await fetch(`${API_URL}/api/stripe/status`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.status === 401) {
        // Token expired - let useUserData handle this
        setIsLoading(false);
        return;
      }
      
      if (!response.ok) {
        throw new Error('Failed to fetch subscription status');
      }
      
      const data = await response.json();
      setSubscriptionStatus(data);
    } catch (error) {
      console.error('Subscription status error:', error);
      // On error, default to premium (don't lock users out due to network issues)
      setSubscriptionStatus(prev => ({ ...prev, hasPremium: true, reason: 'error_fallback' }));
    } finally {
      setIsLoading(false);
    }
  }, [isLoggedIn]);

  // Fetch on mount and when login state changes
  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  // ============================================
  // START FREE TRIAL
  // ============================================
  const startTrial = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) return false;
    
    try {
      const response = await fetch(`${API_URL}/api/stripe/start-trial`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to start trial');
      }
      
      const data = await response.json();
      setSubscriptionStatus(data);
      return true;
    } catch (error) {
      console.error('Start trial error:', error);
      return false;
    }
  }, []);

  // ============================================
  // CREATE CHECKOUT SESSION (redirect to Stripe)
  // ============================================
  const createCheckout = useCallback(async (plan = 'monthly') => {
    const token = localStorage.getItem('token');
    if (!token) return null;
    
    try {
      const response = await fetch(`${API_URL}/api/stripe/create-checkout`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ plan })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create checkout');
      }
      
      const data = await response.json();
      
      // Redirect to Stripe Checkout
      if (data.url) {
        window.location.href = data.url;
      }
      
      return data;
    } catch (error) {
      console.error('Checkout error:', error);
      return null;
    }
  }, []);

  // ============================================
  // OPEN BILLING PORTAL
  // ============================================
  const openPortal = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) return null;
    
    try {
      const response = await fetch(`${API_URL}/api/stripe/portal`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to open billing portal');
      }
      
      const data = await response.json();
      
      if (data.url) {
        window.location.href = data.url;
      }
      
      return data;
    } catch (error) {
      console.error('Portal error:', error);
      return null;
    }
  }, []);

  // ============================================
  // LINK DISCORD ACCOUNT
  // ============================================
  const linkDiscord = useCallback(async (code) => {
    const token = localStorage.getItem('token');
    if (!token) throw new Error('Not authenticated');
    
    try {
      const response = await fetch(`${API_URL}/api/discord/link`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ code })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || data.message || 'Failed to link Discord');
      }
      
      // Refresh subscription status after linking
      await fetchStatus();
      
      return data;
    } catch (error) {
      console.error('Discord link error:', error);
      throw error;
    }
  }, [fetchStatus]);

  // ============================================
  // COMPUTED VALUES
  // ============================================
  const isPremium = subscriptionStatus.hasPremium;
  const isGrandfathered = subscriptionStatus.subscription?.status === 'grandfathered';
  const isTrial = subscriptionStatus.subscription?.status === 'trial';
  const isActive = subscriptionStatus.subscription?.status === 'active';
  const isCanceled = subscriptionStatus.subscription?.status === 'canceled';
  const isExpired = subscriptionStatus.subscription?.status === 'expired' || 
                    subscriptionStatus.subscription?.status === 'none';
  const hasUsedTrial = subscriptionStatus.subscription?.trialEndDate !== null;
  const trialDaysLeft = subscriptionStatus.daysLeft || null;

  return {
    // Status
    isPremium,
    isGrandfathered,
    isTrial,
    isActive,
    isCanceled,
    isExpired,
    hasUsedTrial,
    trialDaysLeft,
    isLoading,
    subscriptionStatus,
    
    // Actions
    fetchStatus,
    startTrial,
    createCheckout,
    openPortal,
    linkDiscord
  };
};

export default useSubscription;
