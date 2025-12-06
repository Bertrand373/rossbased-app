// Profile.js - TITANTRACK MINIMAL
// Premium app patterns: instant-save toggles, always-visible notification prefs
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import './Profile.css';
import { useNotifications } from '../../hooks/useNotifications';

// Body scroll lock for modals
import useBodyScrollLock from '../../hooks/useBodyScrollLock';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001';

const Profile = ({ userData, isPremium, updateUserData, onLogout }) => {
  const [activeTab, setActiveTab] = useState('account');
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [showExportModal, setShowExportModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  
  // Account States (Edit/Save pattern for text fields)
  const [username, setUsername] = useState(userData.username || '');
  const [email, setEmail] = useState(userData.email || '');
  const [discordUsername, setDiscordUsername] = useState(userData.discordUsername || '');
  const [showOnLeaderboard, setShowOnLeaderboard] = useState(userData.showOnLeaderboard || false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  
  // Leaderboard rank
  const [userRank, setUserRank] = useState(null);
  const [isLoadingRank, setIsLoadingRank] = useState(false);
  
  // Privacy States (instant-save pattern for toggles)
  const [dataSharing, setDataSharing] = useState(userData.dataSharing || false);
  const [analyticsOptIn, setAnalyticsOptIn] = useState(userData.analyticsOptIn !== false);
  const [marketingEmails, setMarketingEmails] = useState(userData.marketingEmails || false);
  
  // Notifications
  const {
    permission,
    isSupported,
    fcmToken,
    requestPermission,
    subscribeToPush,
    unsubscribeFromPush,
    checkExistingSubscription,
    sendLocalNotification
  } = useNotifications();
  
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [isTogglingNotifications, setIsTogglingNotifications] = useState(false);
  const [quietHoursEnabled, setQuietHoursEnabled] = useState(false);
  const [quietHoursStart, setQuietHoursStart] = useState('22:00');
  const [quietHoursEnd, setQuietHoursEnd] = useState('08:00');
  const [notifTypes, setNotifTypes] = useState({
    milestones: true,
    urgeSupport: true,
    weeklyProgress: true
  });
  const [dailyReminderEnabled, setDailyReminderEnabled] = useState(false);
  const [dailyReminderTime, setDailyReminderTime] = useState('09:00');
  
  // Feedback
  const [feedbackType, setFeedbackType] = useState('general');
  const [feedbackSubject, setFeedbackSubject] = useState('');
  const [feedbackMessage, setFeedbackMessage] = useState('');

  // Debounce timer ref for auto-save
  const saveTimerRef = useRef(null);

  // Lock body scroll when any modal is open
  useBodyScrollLock(showFeedbackModal || showDeleteConfirm || showExportModal || showPrivacyModal);

  const tabs = [
    { id: 'account', label: 'Account' },
    { id: 'privacy', label: 'Privacy' },
    { id: 'data', label: 'Data' },
    { id: 'about', label: 'About' }
  ];

  const feedbackTypes = [
    { id: 'bug', label: 'Bug' },
    { id: 'feature', label: 'Feature' },
    { id: 'improvement', label: 'Suggestion' },
    { id: 'general', label: 'General' }
  ];

  useEffect(() => {
    if (isSupported && userData?.username) {
      checkExistingSubscription().then((sub) => setNotificationsEnabled(!!sub));
    }
  }, [isSupported, userData?.username, checkExistingSubscription]);

  useEffect(() => {
    if (notificationsEnabled && userData?.username) {
      loadNotificationPreferences();
    }
  }, [notificationsEnabled, userData?.username]);

  // Lock scroll on Data tab (fixed content)
  useEffect(() => {
    if (activeTab === 'data') {
      document.body.classList.add('static-view');
    } else {
      document.body.classList.remove('static-view');
    }
    return () => document.body.classList.remove('static-view');
  }, [activeTab]);

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, []);

  // Fetch user's leaderboard rank
  const fetchUserRank = useCallback(async () => {
    if (!userData?.username || !userData?.showOnLeaderboard || !userData?.discordUsername) {
      setUserRank(null);
      return;
    }
    
    setIsLoadingRank(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/leaderboard/rank/${userData.username}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.onLeaderboard) {
          setUserRank({ rank: data.rank, total: data.total });
        } else {
          setUserRank(null);
        }
      }
    } catch (error) {
      console.error('Failed to fetch rank:', error);
      setUserRank(null);
    } finally {
      setIsLoadingRank(false);
    }
  }, [userData?.username, userData?.showOnLeaderboard, userData?.discordUsername]);

  // Fetch rank on mount and when relevant data changes
  useEffect(() => {
    fetchUserRank();
  }, [fetchUserRank]);

  const loadNotificationPreferences = async () => {
    try {
      const response = await fetch(`${API_URL}/api/notification-preferences/${userData.username}`);
      if (response.ok) {
        const prefs = await response.json();
        setQuietHoursEnabled(prefs.quietHoursEnabled || false);
        setQuietHoursStart(prefs.quietHoursStart || '22:00');
        setQuietHoursEnd(prefs.quietHoursEnd || '08:00');
        setNotifTypes(prefs.types || { milestones: true, urgeSupport: true, weeklyProgress: true });
        setDailyReminderEnabled(prefs.dailyReminderEnabled || false);
        setDailyReminderTime(prefs.dailyReminderTime || '09:00');
      }
    } catch (error) {
      console.error('Failed to load notification preferences:', error);
    }
  };

  // Auto-save notification preferences with debounce
  const saveNotificationPreferences = useCallback(async (overrides = {}) => {
    const preferences = {
      quietHoursEnabled,
      quietHoursStart,
      quietHoursEnd,
      types: notifTypes,
      dailyReminderEnabled,
      dailyReminderTime,
      fcmToken,
      ...overrides
    };
    
    try {
      await fetch(`${API_URL}/api/notification-preferences/${userData.username}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(preferences)
      });
      localStorage.setItem(`notificationPrefs_${userData.username}`, JSON.stringify(preferences));
    } catch (error) {
      localStorage.setItem(`notificationPrefs_${userData.username}`, JSON.stringify(preferences));
    }
  }, [quietHoursEnabled, quietHoursStart, quietHoursEnd, notifTypes, dailyReminderEnabled, dailyReminderTime, fcmToken, userData.username]);

  // Debounced save for time inputs
  const debouncedSave = useCallback((overrides = {}) => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }
    saveTimerRef.current = setTimeout(() => {
      saveNotificationPreferences(overrides);
      toast.success('Saved', { duration: 1500, style: { background: '#1a1a1a', color: '#fff', fontSize: '14px' } });
    }, 1000);
  }, [saveNotificationPreferences]);

  // Instant-save privacy settings
  const savePrivacySettings = useCallback(async (updates) => {
    const newSettings = {
      dataSharing,
      analyticsOptIn,
      marketingEmails,
      ...updates
    };
    
    // Update via parent
    updateUserData(newSettings);
    toast.success('Saved', { duration: 1500, style: { background: '#1a1a1a', color: '#fff', fontSize: '14px' } });
  }, [dataSharing, analyticsOptIn, marketingEmails, updateUserData]);

  // Toggle handlers with instant-save
  const handleAnalyticsToggle = () => {
    const newValue = !analyticsOptIn;
    setAnalyticsOptIn(newValue);
    savePrivacySettings({ analyticsOptIn: newValue });
  };

  const handleDataSharingToggle = () => {
    const newValue = !dataSharing;
    setDataSharing(newValue);
    savePrivacySettings({ dataSharing: newValue });
  };

  const handleMarketingToggle = () => {
    const newValue = !marketingEmails;
    setMarketingEmails(newValue);
    savePrivacySettings({ marketingEmails: newValue });
  };

  // Notification type toggles with instant-save
  const handleNotifTypeToggle = (type) => {
    const newTypes = { ...notifTypes, [type]: !notifTypes[type] };
    setNotifTypes(newTypes);
    saveNotificationPreferences({ types: newTypes });
    toast.success('Saved', { duration: 1500, style: { background: '#1a1a1a', color: '#fff', fontSize: '14px' } });
  };

  const handleQuietHoursToggle = () => {
    const newValue = !quietHoursEnabled;
    setQuietHoursEnabled(newValue);
    saveNotificationPreferences({ quietHoursEnabled: newValue });
    toast.success('Saved', { duration: 1500, style: { background: '#1a1a1a', color: '#fff', fontSize: '14px' } });
  };

  const handleDailyReminderToggle = () => {
    const newValue = !dailyReminderEnabled;
    setDailyReminderEnabled(newValue);
    saveNotificationPreferences({ dailyReminderEnabled: newValue });
    toast.success('Saved', { duration: 1500, style: { background: '#1a1a1a', color: '#fff', fontSize: '14px' } });
  };

  // Time input handlers with debounced save
  const handleQuietStartChange = (e) => {
    const newValue = e.target.value;
    setQuietHoursStart(newValue);
    debouncedSave({ quietHoursStart: newValue });
  };

  const handleQuietEndChange = (e) => {
    const newValue = e.target.value;
    setQuietHoursEnd(newValue);
    debouncedSave({ quietHoursEnd: newValue });
  };

  const handleReminderTimeChange = (e) => {
    const newValue = e.target.value;
    setDailyReminderTime(newValue);
    debouncedSave({ dailyReminderTime: newValue });
  };

  const handleNotificationToggle = async () => {
    if (isTogglingNotifications) return;
    setIsTogglingNotifications(true);
    try {
      if (notificationsEnabled) {
        await unsubscribeFromPush();
        setNotificationsEnabled(false);
        toast.success('Notifications disabled', { duration: 1500, style: { background: '#1a1a1a', color: '#fff', fontSize: '14px' } });
      } else {
        if (permission !== 'granted') {
          const granted = await requestPermission();
          if (!granted) {
            toast.error('Please enable notifications in browser settings');
            setIsTogglingNotifications(false);
            return;
          }
        }
        await subscribeToPush();
        setNotificationsEnabled(true);
        setTimeout(async () => {
          try {
            await sendLocalNotification('Notifications Activated', {
              body: 'You\'ll now receive milestone alerts',
              icon: '/icon-192.png'
            });
          } catch (e) {}
        }, 1000);
      }
    } catch (error) {
      toast.error('Failed to update notifications');
    } finally {
      setIsTogglingNotifications(false);
    }
  };

  const handleTestNotification = async () => {
    const success = await sendLocalNotification('Test Notification', {
      body: 'Notifications are working!',
      icon: '/icon-192.png'
    });
    if (!success) toast.error('Failed to send test');
  };

  const memberSince = userData.startDate 
    ? format(new Date(userData.startDate), 'MMMM yyyy') 
    : 'Unknown';

  const handleProfileUpdate = () => {
    updateUserData({
      username: username.trim(),
      email: email.trim(),
      discordUsername: discordUsername.trim(),
      showOnLeaderboard
    });
    setIsEditingProfile(false);
    toast.success('Profile updated', { duration: 1500, style: { background: '#1a1a1a', color: '#fff', fontSize: '14px' } });
  };

  const handleFeedbackSubmit = async () => {
    if (!feedbackSubject.trim() || !feedbackMessage.trim()) {
      toast.error('Please fill in both fields');
      return;
    }
    
    try {
      const response = await fetch(`${API_URL}/api/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: feedbackType,
          subject: feedbackSubject.trim(),
          message: feedbackMessage.trim(),
          username: userData?.username || 'Anonymous'
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to send feedback');
      }
      
      setFeedbackSubject('');
      setFeedbackMessage('');
      setFeedbackType('general');
      setShowFeedbackModal(false);
      toast.success('Feedback sent');
    } catch (error) {
      console.error('Feedback error:', error);
      toast.error('Failed to send feedback. Please try again.');
    }
  };

  const handleDataExport = () => {
    const exportData = {
      profile: { username: userData.username, memberSince: userData.startDate },
      streakData: {
        currentStreak: userData.currentStreak,
        longestStreak: userData.longestStreak,
        startDate: userData.startDate,
        streakHistory: userData.streakHistory
      },
      benefitTracking: userData.benefitTracking || [],
      journalEntries: userData.notes || {},
      exportDate: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `titantrack-${format(new Date(), 'yyyy-MM-dd')}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setShowExportModal(false);
    toast.success('Data exported!');
  };

  const handleAccountDeletion = async () => {
    try {
      const token = localStorage.getItem('token');
      const username = userData?.username;
      
      if (!token || !username) {
        // Fallback: just clear local and logout
        localStorage.clear();
        onLogout('Account deleted');
        return;
      }
      
      // Call API to delete user from MongoDB
      const response = await fetch(`${API_URL}/api/user/${username}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete account');
      }
      
      // Success - clear local storage and logout
      localStorage.clear();
      onLogout('Account deleted');
      
    } catch (error) {
      console.error('Account deletion error:', error);
      toast.error('Failed to delete account. Please try again.');
    }
  };

  const userInitial = userData?.username?.charAt(0)?.toUpperCase() || 
                      userData?.email?.charAt(0)?.toUpperCase() || '?';

  return (
    <div className="profile">
      {/* User Info - Sign Out accessible here */}
      <div className="profile-user">
        <div className="profile-avatar">{userInitial}</div>
        <div className="profile-user-info">
          <span className="profile-name">{userData.username}</span>
          <span className="profile-since">Member since {memberSince}</span>
        </div>
        <button className="profile-signout" onClick={onLogout}>
          Sign Out
        </button>
      </div>

      {/* Tab Navigation - Text-only with dividers */}
      <nav className="profile-tabs">
        {tabs.map((tab, index) => (
          <React.Fragment key={tab.id}>
            <button
              className={`profile-tab ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
            {index < tabs.length - 1 && <div className="profile-tab-divider" />}
          </React.Fragment>
        ))}
      </nav>

      {/* Content */}
      <div className="profile-content" key={activeTab}>
        
        {/* ACCOUNT TAB - Edit/Save for text fields */}
        {activeTab === 'account' && (
          <div className="profile-section">
            <div className="section-header">
              <h2>Account Details</h2>
              <button className="edit-btn" onClick={() => setIsEditingProfile(!isEditingProfile)}>
                {isEditingProfile ? 'Cancel' : 'Edit'}
              </button>
            </div>

            <div className="form-group">
              <label>Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={!isEditingProfile}
                placeholder="Your username"
              />
            </div>

            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={!isEditingProfile}
                placeholder="your@email.com"
              />
            </div>

            <div className="form-group">
              <label>Discord Username</label>
              <input
                type="text"
                value={discordUsername}
                onChange={(e) => setDiscordUsername(e.target.value)}
                disabled={!isEditingProfile}
                placeholder="@username"
              />
              <span className="form-hint">Found in Discord → Settings → username</span>
            </div>

            <div className="toggle-row">
              <div className="toggle-text">
                <span className="toggle-label">Show on Leaderboard</span>
                <span className="toggle-desc">Display streak publicly</span>
              </div>
              <button 
                className={`toggle-switch ${showOnLeaderboard ? 'active' : ''}`}
                onClick={() => isEditingProfile && setShowOnLeaderboard(!showOnLeaderboard)}
                disabled={!isEditingProfile}
              >
                <span className="toggle-knob" />
              </button>
            </div>

            {/* Leaderboard Rank Display */}
            {userData?.showOnLeaderboard && userData?.discordUsername && (
              <div className="rank-display">
                <span className="rank-label">Your Position</span>
                {isLoadingRank ? (
                  <span className="rank-value">...</span>
                ) : userRank ? (
                  <span className="rank-value">#{userRank.rank} <span className="rank-total">of {userRank.total}</span></span>
                ) : (
                  <span className="rank-value rank-pending">—</span>
                )}
              </div>
            )}

            {!userData?.showOnLeaderboard && (
              <div className="rank-display rank-disabled">
                <span className="rank-label">Your Position</span>
                <span className="rank-value">Enable leaderboard to see rank</span>
              </div>
            )}

            {isEditingProfile && (
              <div className="section-actions">
                <button className="btn-ghost" onClick={() => setIsEditingProfile(false)}>Cancel</button>
                <button className="btn-primary" onClick={handleProfileUpdate}>Save Changes</button>
              </div>
            )}

            {/* Feedback Row */}
            <div className="feedback-row">
              <div className="feedback-text">
                <span className="feedback-title">Send Feedback</span>
                <span className="feedback-desc">Help us improve TitanTrack</span>
              </div>
              <button className="feedback-btn" onClick={() => setShowFeedbackModal(true)}>
                Send
              </button>
            </div>

            {/* Discord Row */}
            <div className="feedback-row">
              <div className="feedback-text">
                <span className="feedback-title">Join the Community</span>
                <span className="feedback-desc">Connect with others on Discord</span>
              </div>
              <a 
                href="https://discord.gg/RDFC5eUtuA" 
                target="_blank" 
                rel="noopener noreferrer"
                className="feedback-btn"
              >
                Join
              </a>
            </div>
          </div>
        )}

        {/* PRIVACY TAB - Instant-save toggles */}
        {activeTab === 'privacy' && (
          <div className="profile-section">
            <div className="section-header">
              <h2>Privacy & Notifications</h2>
            </div>

            <h3 className="group-label">Data & Analytics</h3>

            <div className="toggle-row">
              <div className="toggle-text">
                <span className="toggle-label">Anonymous Analytics</span>
                <span className="toggle-desc">Help improve the app</span>
              </div>
              <button 
                className={`toggle-switch ${analyticsOptIn ? 'active' : ''}`}
                onClick={handleAnalyticsToggle}
              >
                <span className="toggle-knob" />
              </button>
            </div>

            <div className="toggle-row">
              <div className="toggle-text">
                <span className="toggle-label">Community Insights</span>
                <span className="toggle-desc">Share aggregated data</span>
              </div>
              <button 
                className={`toggle-switch ${dataSharing ? 'active' : ''}`}
                onClick={handleDataSharingToggle}
              >
                <span className="toggle-knob" />
              </button>
            </div>

            <h3 className="group-label">Communications</h3>

            <div className="toggle-row">
              <div className="toggle-text">
                <span className="toggle-label">Marketing Emails</span>
                <span className="toggle-desc">Features and tips</span>
              </div>
              <button 
                className={`toggle-switch ${marketingEmails ? 'active' : ''}`}
                onClick={handleMarketingToggle}
              >
                <span className="toggle-knob" />
              </button>
            </div>

            {isSupported && (
              <div className="toggle-row">
                <div className="toggle-text">
                  <span className="toggle-label">Push Notifications</span>
                  <span className="toggle-desc">
                    {permission === 'denied' ? 'Blocked in browser' : 'Milestone alerts'}
                  </span>
                </div>
                <button 
                  className={`toggle-switch ${notificationsEnabled ? 'active' : ''}`}
                  onClick={handleNotificationToggle}
                  disabled={isTogglingNotifications || permission === 'denied'}
                >
                  <span className="toggle-knob" />
                </button>
              </div>
            )}

            {/* Notification Preferences - Always visible when enabled */}
            {isSupported && notificationsEnabled && (
              <>
                <h3 className="group-label">Notification Types</h3>

                <div className="toggle-row">
                  <div className="toggle-text">
                    <span className="toggle-label">Milestones</span>
                    <span className="toggle-desc">Day 7, 30, 90...</span>
                  </div>
                  <button 
                    className={`toggle-switch ${notifTypes.milestones ? 'active' : ''}`}
                    onClick={() => handleNotifTypeToggle('milestones')}
                  >
                    <span className="toggle-knob" />
                  </button>
                </div>

                <div className="toggle-row">
                  <div className="toggle-text">
                    <span className="toggle-label">Urge Support</span>
                    <span className="toggle-desc">Encouragement alerts</span>
                  </div>
                  <button 
                    className={`toggle-switch ${notifTypes.urgeSupport ? 'active' : ''}`}
                    onClick={() => handleNotifTypeToggle('urgeSupport')}
                  >
                    <span className="toggle-knob" />
                  </button>
                </div>

                <div className="toggle-row">
                  <div className="toggle-text">
                    <span className="toggle-label">Weekly Summary</span>
                    <span className="toggle-desc">Sunday report</span>
                  </div>
                  <button 
                    className={`toggle-switch ${notifTypes.weeklyProgress ? 'active' : ''}`}
                    onClick={() => handleNotifTypeToggle('weeklyProgress')}
                  >
                    <span className="toggle-knob" />
                  </button>
                </div>

                <h3 className="group-label">Schedule</h3>

                <div className="toggle-row">
                  <div className="toggle-text">
                    <span className="toggle-label">Daily Reminder</span>
                    <span className="toggle-desc">Log benefits</span>
                  </div>
                  <button 
                    className={`toggle-switch ${dailyReminderEnabled ? 'active' : ''}`}
                    onClick={handleDailyReminderToggle}
                  >
                    <span className="toggle-knob" />
                  </button>
                </div>

                {dailyReminderEnabled && (
                  <div className="time-row single">
                    <label>Reminder time</label>
                    <input 
                      type="time" 
                      value={dailyReminderTime} 
                      onChange={handleReminderTimeChange} 
                    />
                  </div>
                )}

                <div className="toggle-row">
                  <div className="toggle-text">
                    <span className="toggle-label">Quiet Hours</span>
                    <span className="toggle-desc">Pause during sleep</span>
                  </div>
                  <button 
                    className={`toggle-switch ${quietHoursEnabled ? 'active' : ''}`}
                    onClick={handleQuietHoursToggle}
                  >
                    <span className="toggle-knob" />
                  </button>
                </div>

                {quietHoursEnabled && (
                  <div className="time-row">
                    <input 
                      type="time" 
                      value={quietHoursStart} 
                      onChange={handleQuietStartChange} 
                    />
                    <span>to</span>
                    <input 
                      type="time" 
                      value={quietHoursEnd} 
                      onChange={handleQuietEndChange} 
                    />
                  </div>
                )}

                <button className="test-notif-btn" onClick={handleTestNotification}>
                  Test Notification
                </button>
              </>
            )}
          </div>
        )}

        {/* DATA TAB */}
        {activeTab === 'data' && (
          <div className="profile-section">
            <div className="section-header">
              <h2>Your Data</h2>
            </div>

            <div className="data-row">
              <div className="data-text">
                <span className="data-title">Export Data</span>
                <span className="data-desc">Download as JSON</span>
              </div>
              <button className="data-btn" onClick={() => setShowExportModal(true)}>Export</button>
            </div>

            <div className="data-row danger">
              <div className="data-text">
                <span className="data-title">Delete Account</span>
                <span className="data-desc">Permanently remove all data</span>
              </div>
              <button className="data-btn danger" onClick={() => setShowDeleteConfirm(true)}>Delete</button>
            </div>
          </div>
        )}

        {activeTab === 'about' && (
          <div className="about-section">
            {/* Brand Header */}
            <div className="about-brand">
              <img src="/icon-192.png" alt="TitanTrack" className="about-logo" />
              <span className="about-version">Version 1.0.0</span>
            </div>

            <div className="about-divider" />

            {/* The Pillars */}
            <div className="about-pillars">
              <h2 className="about-pillars-title">The Pillars</h2>
              
              <div className="about-pillar">
                <span className="pillar-name">Streak Tracking</span>
                <span className="pillar-desc">Your foundation. Every day counts.</span>
              </div>
              
              <div className="about-pillar">
                <span className="pillar-name">Benefit Analytics</span>
                <span className="pillar-desc">Track what retention unlocks in you.</span>
              </div>
              
              <div className="about-pillar">
                <span className="pillar-name">Predictive Intelligence</span>
                <span className="pillar-desc">On-device AI learns your patterns.</span>
              </div>
              
              <div className="about-pillar">
                <span className="pillar-name">Crisis Toolkit</span>
                <span className="pillar-desc">When urges hit, you're prepared.</span>
              </div>
            </div>

            <div className="about-divider" />

            {/* Links */}
            <div className="about-links">
              <a href="https://discord.gg/RDFC5eUtuA" target="_blank" rel="noopener noreferrer" className="about-link">
                Discord
              </a>
              <span className="about-link-divider" />
              <button className="about-link" onClick={() => { setActiveTab('account'); setTimeout(() => setShowFeedbackModal(true), 100); }}>
                Support
              </button>
              <span className="about-link-divider" />
              <button className="about-link" onClick={() => setShowPrivacyModal(true)}>
                Privacy
              </button>
            </div>
          </div>
        )}
      </div>

      {/* FEEDBACK MODAL */}
      {showFeedbackModal && (
        <div className="overlay">
          <div className="modal legacy" onClick={e => e.stopPropagation()}>
            <h2>Send Feedback</h2>
            <p>Help us improve TitanTrack</p>
            
            <div className="feedback-types">
              {feedbackTypes.map(type => (
                <button
                  key={type.id}
                  className={`feedback-type-btn ${feedbackType === type.id ? 'active' : ''}`}
                  onClick={() => setFeedbackType(type.id)}
                >
                  {type.label}
                </button>
              ))}
            </div>

            <div className="modal-field">
              <label>Subject</label>
              <input
                type="text"
                value={feedbackSubject}
                onChange={(e) => setFeedbackSubject(e.target.value)}
                placeholder="Brief description"
                maxLength={100}
              />
            </div>

            <div className="modal-field">
              <label>Message</label>
              <textarea
                value={feedbackMessage}
                onChange={(e) => setFeedbackMessage(e.target.value)}
                placeholder="Your feedback..."
                rows={4}
                maxLength={500}
              />
            </div>

            <div className="modal-actions">
              <button className="btn-ghost" onClick={() => setShowFeedbackModal(false)}>Cancel</button>
              <button className="btn-primary" onClick={handleFeedbackSubmit}>Submit</button>
            </div>
          </div>
        </div>
      )}

      {/* EXPORT MODAL */}
      {showExportModal && (
        <div className="overlay">
          <div className="confirm-modal" onClick={e => e.stopPropagation()}>
            <h2>Export Data</h2>
            <p>Download all your tracking data including streak history, journal entries, and settings.</p>
            <div className="confirm-actions">
              <button className="btn-primary" onClick={handleDataExport}>Download</button>
              <button className="btn-ghost" onClick={() => setShowExportModal(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE MODAL */}
      {showDeleteConfirm && (
        <div className="overlay">
          <div className="confirm-modal delete-confirm-modal" onClick={e => e.stopPropagation()}>
            <h2>Delete Account?</h2>
            <p>This will permanently delete all your data. This cannot be undone.</p>
            
            <div className="delete-confirm-input">
              <label>Type <strong>DELETE</strong> to confirm</label>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value.toUpperCase())}
                placeholder="DELETE"
                autoComplete="off"
                spellCheck="false"
              />
            </div>
            
            <div className="confirm-actions">
              <button 
                className="btn-danger" 
                onClick={handleAccountDeletion}
                disabled={deleteConfirmText !== 'DELETE'}
              >
                Delete Account
              </button>
              <button 
                className="btn-ghost" 
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setDeleteConfirmText('');
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PRIVACY POLICY MODAL */}
      {showPrivacyModal && (
        <div className="overlay">
          <div className="privacy-modal" onClick={e => e.stopPropagation()}>
            <div className="privacy-header">
              <h2>Privacy Policy</h2>
              <span className="privacy-updated">Last updated: December 2024</span>
            </div>
            
            <div className="privacy-content">
              <section className="privacy-section">
                <h3>Overview</h3>
                <p>TitanTrack is designed with your privacy as a priority. We collect only what's necessary to provide you with personalized tracking and insights.</p>
              </section>

              <section className="privacy-section">
                <h3>What We Collect</h3>
                <p>Account information (email, username), streak and retention data, benefit ratings, emotional check-ins, urge session data, and app preferences.</p>
              </section>

              <section className="privacy-section">
                <h3>On-Device Intelligence</h3>
                <p>Our predictive models train entirely on your device using TensorFlow.js. Your personal patterns never leave your phone. Only you benefit from your data.</p>
              </section>

              <section className="privacy-section">
                <h3>Data Storage</h3>
                <p>Account data is stored securely on MongoDB Atlas with encryption. ML models are stored locally in your browser's IndexedDB. Push notifications use Firebase Cloud Messaging.</p>
              </section>

              <section className="privacy-section">
                <h3>Your Rights</h3>
                <p>Export all your data anytime from Profile → Data. Permanently delete your account and all associated data. We retain nothing after deletion.</p>
              </section>

              <section className="privacy-section">
                <h3>What We Don't Do</h3>
                <p>We never sell your data. We never share personal information with third parties for marketing. We never use your data to train external AI models.</p>
              </section>

              <section className="privacy-section">
                <h3>Age Requirement</h3>
                <p>TitanTrack is intended for users 18 years and older. By using this app, you confirm you meet this requirement.</p>
              </section>

              <section className="privacy-section">
                <h3>Contact</h3>
                <p>Questions about your privacy? Reach out via the Support link or join our Discord community.</p>
              </section>
            </div>

            <div className="privacy-footer">
              <button className="btn-primary" onClick={() => setShowPrivacyModal(false)}>Done</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;