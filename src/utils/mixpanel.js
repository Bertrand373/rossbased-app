// src/utils/mixpanel.js - TitanTrack Analytics
import mixpanel from 'mixpanel-browser';

// Mixpanel Project Token
const MIXPANEL_TOKEN = process.env.REACT_APP_MIXPANEL_TOKEN || 'aeb9988790129e12aff55150d47a54e8';

// Initialize only once
let initialized = false;

export const initMixpanel = () => {
  if (initialized) return;
  
  mixpanel.init(MIXPANEL_TOKEN, {
    debug: process.env.NODE_ENV === 'development',
    track_pageview: true,
    persistence: 'localStorage',
    ignore_dnt: false,
  });
  
  initialized = true;
  console.log('✅ Mixpanel initialized');
};

// Identify user (call after login)
export const identifyUser = (userId, userProperties = {}) => {
  if (!initialized) initMixpanel();
  
  mixpanel.identify(userId);
  
  mixpanel.people.set({
    $email: userProperties.email,
    $name: userProperties.username,
    isPremium: userProperties.isPremium || false,
    signupDate: userProperties.createdAt,
    ...userProperties,
  });
};

// Track events
export const track = (eventName, properties = {}) => {
  if (!initialized) initMixpanel();
  
  mixpanel.track(eventName, {
    ...properties,
    timestamp: new Date().toISOString(),
  });
};

// Reset on logout
export const resetMixpanel = () => {
  if (!initialized) return;
  mixpanel.reset();
};

// ============================================
// PRE-DEFINED EVENTS FOR TITANTRACK
// ============================================

// App lifecycle
export const trackAppOpen = () => track('App Opened');

// Authentication
export const trackLogin = (method) => track('Login', { method });
export const trackSignup = (method) => track('Signup', { method });
export const trackLogout = () => track('Logout');

// Core actions
export const trackDailyLog = (currentStreak, metrics) => track('Daily Log Submitted', { 
  currentStreak,
  energy: metrics.energy,
  focus: metrics.focus,
  confidence: metrics.confidence,
  aura: metrics.aura,
  sleep: metrics.sleep,
  workout: metrics.workout,
});

export const trackStreakReset = (previousStreak, reason) => track('Streak Reset', { 
  previousStreak,
  reason,
});

export const trackGoalSet = (goalDays) => track('Goal Set', { goalDays });
export const trackGoalCompleted = (goalDays) => track('Goal Completed', { goalDays });

// Feature usage
export const trackPageView = (pageName) => track('Page Viewed', { page: pageName });
export const trackUrgeToolkitOpened = () => track('Urge Toolkit Opened');
export const trackUrgeToolUsed = (toolName) => track('Urge Tool Used', { tool: toolName });
export const trackCrisisToolActivated = () => track('Crisis Tool Activated');
export const trackPredictionViewed = (riskLevel) => track('Prediction Viewed', { riskLevel });

// Premium
export const trackPremiumPromptShown = (feature) => track('Premium Prompt Shown', { feature });
export const trackPremiumPurchaseStarted = () => track('Premium Purchase Started');
export const trackPremiumPurchaseCompleted = () => track('Premium Purchase Completed');

// Engagement
export const trackNotificationEnabled = () => track('Notifications Enabled');
export const trackNotificationDisabled = () => track('Notifications Disabled');
export const trackFeedbackSubmitted = (rating) => track('Feedback Submitted', { rating });

// AI Guide Chat
export const trackAIChatOpened = () => track('AI Chat Opened');
export const trackAIMessageSent = (messageLength, conversationLength) => track('AI Message Sent', {
  messageLength,
  conversationLength,
});
export const trackAIChatCleared = () => track('AI Chat Cleared');
export const trackAILimitReached = () => track('AI Limit Reached');

export default {
  initMixpanel,
  identifyUser,
  track,
  resetMixpanel,
  trackAppOpen,
  trackLogin,
  trackSignup,
  trackLogout,
  trackDailyLog,
  trackStreakReset,
  trackGoalSet,
  trackGoalCompleted,
  trackPageView,
  trackUrgeToolkitOpened,
  trackUrgeToolUsed,
  trackCrisisToolActivated,
  trackPredictionViewed,
  trackPremiumPromptShown,
  trackPremiumPurchaseStarted,
  trackPremiumPurchaseCompleted,
  trackNotificationEnabled,
  trackNotificationDisabled,
  trackFeedbackSubmitted,
  trackAIChatOpened,
  trackAIMessageSent,
  trackAIChatCleared,
  trackAILimitReached,
};