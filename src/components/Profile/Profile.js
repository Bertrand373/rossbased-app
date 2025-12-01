// Profile.js - TITANTRACK REDESIGNED
import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import './Profile.css';
import { useNotifications } from '../../hooks/useNotifications';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001';

const Profile = ({ userData, isPremium, updateUserData, onLogout }) => {
  const [activeTab, setActiveTab] = useState('account');
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  
  // Account Settings States
  const [username, setUsername] = useState(userData.username || '');
  const [email, setEmail] = useState(userData.email || '');
  const [discordUsername, setDiscordUsername] = useState(userData.discordUsername || '');
  const [showOnLeaderboard, setShowOnLeaderboard] = useState(userData.showOnLeaderboard || false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  
  // Privacy Settings States
  const [isEditingPrivacy, setIsEditingPrivacy] = useState(false);
  const [dataSharing, setDataSharing] = useState(userData.dataSharing || false);
  const [analyticsOptIn, setAnalyticsOptIn] = useState(userData.analyticsOptIn !== false);
  const [marketingEmails, setMarketingEmails] = useState(userData.marketingEmails || false);
  
  // Notification Hook
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
  
  // Notification Preferences
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
  
  // Feedback States
  const [feedbackType, setFeedbackType] = useState('general');
  const [feedbackSubject, setFeedbackSubject] = useState('');
  const [feedbackMessage, setFeedbackMessage] = useState('');

  const tabs = [
    { id: 'account', label: 'Account' },
    { id: 'privacy', label: 'Privacy' },
    { id: 'settings', label: 'Settings' },
    { id: 'data', label: 'Data' }
  ];

  const feedbackTypes = [
    { id: 'bug', label: 'Bug' },
    { id: 'feature', label: 'Feature' },
    { id: 'improvement', label: 'Suggestion' },
    { id: 'general', label: 'General' }
  ];

  // Check existing notification subscription
  useEffect(() => {
    if (isSupported && userData?.username) {
      checkExistingSubscription().then((sub) => {
        setNotificationsEnabled(!!sub);
      });
    }
  }, [isSupported, userData?.username, checkExistingSubscription]);

  // Load notification preferences
  useEffect(() => {
    if (notificationsEnabled && userData?.username) {
      loadNotificationPreferences();
    }
  }, [notificationsEnabled, userData?.username]);

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

  const updateNotifType = (type) => {
    if (!isEditingPrivacy) return;
    setNotifTypes(prev => ({ ...prev, [type]: !prev[type] }));
  };

  const handleSaveNotificationPreferences = async () => {
    const preferences = {
      quietHoursEnabled,
      quietHoursStart,
      quietHoursEnd,
      types: notifTypes,
      dailyReminderEnabled,
      dailyReminderTime,
      fcmToken
    };

    try {
      const response = await fetch(`${API_URL}/api/notification-preferences/${userData.username}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(preferences)
      });

      if (response.ok) {
        localStorage.setItem(`notificationPrefs_${userData.username}`, JSON.stringify(preferences));
        setIsEditingPrivacy(false);
      } else {
        throw new Error('Failed to save preferences');
      }
    } catch (error) {
      localStorage.setItem(`notificationPrefs_${userData.username}`, JSON.stringify(preferences));
      setIsEditingPrivacy(false);
    }
  };

  const handleNotificationToggle = async () => {
    if (isTogglingNotifications || !isEditingPrivacy) return;
    
    setIsTogglingNotifications(true);
    
    try {
      if (notificationsEnabled) {
        await unsubscribeFromPush();
        setNotificationsEnabled(false);
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
              body: 'You\'ll now receive milestone alerts and motivational messages',
              icon: '/icon-192.png'
            });
          } catch (error) {
            console.error('Welcome notification failed:', error);
          }
        }, 1000);
      }
    } catch (error) {
      console.error('Toggle error:', error);
      toast.error('Failed to update notification settings');
    } finally {
      setIsTogglingNotifications(false);
    }
  };

  const handleTestNotification = async () => {
    try {
      const success = await sendLocalNotification('Test Notification', {
        body: 'Notifications are working correctly!',
        icon: '/icon-192.png'
      });
      
      if (!success) {
        toast.error('Failed to send test notification');
      }
    } catch (error) {
      toast.error('Error sending test notification');
    }
  };

  const userStats = {
    memberSince: userData.startDate ? format(new Date(userData.startDate), 'MMMM yyyy') : 'Unknown'
  };

  const handleProfileUpdate = () => {
    updateUserData({
      username: username.trim(),
      email: email.trim(),
      discordUsername: discordUsername.trim(),
      showOnLeaderboard,
      dataSharing,
      analyticsOptIn,
      marketingEmails
    });
    setIsEditingProfile(false);
  };

  const handlePrivacyUpdate = () => {
    updateUserData({ dataSharing, analyticsOptIn, marketingEmails });
    setIsEditingPrivacy(false);
  };

  const handleFeedbackSubmit = () => {
    if (!feedbackSubject.trim() || !feedbackMessage.trim()) {
      toast.error('Please fill in both subject and message');
      return;
    }
    
    console.log('Feedback:', { type: feedbackType, subject: feedbackSubject, message: feedbackMessage });
    
    setFeedbackSubject('');
    setFeedbackMessage('');
    setFeedbackType('general');
    setShowFeedbackModal(false);
  };

  const handleDataExport = () => {
    const exportData = {
      profile: {
        username: userData.username,
        memberSince: userData.startDate,
        isPremium: true,
        discordUsername: userData.discordUsername
      },
      streakData: {
        currentStreak: userData.currentStreak,
        longestStreak: userData.longestStreak,
        startDate: userData.startDate,
        streakHistory: userData.streakHistory,
        relapseCount: userData.relapseCount,
        wetDreamCount: userData.wetDreamCount
      },
      benefitTracking: userData.benefitTracking || [],
      emotionalTracking: userData.emotionalTracking || [],
      journalEntries: userData.notes || {},
      badges: userData.badges || [],
      urgeLog: userData.urgeLog || [],
      exportDate: new Date().toISOString()
    };
    
    const dataBlob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `titantrack-data-${format(new Date(), 'yyyy-MM-dd')}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    setShowExportModal(false);
  };

  const handleAccountDeletion = () => {
    localStorage.clear();
    onLogout();
  };

  // Get user initial
  const userInitial = userData?.email?.charAt(0)?.toUpperCase() || 
                      userData?.username?.charAt(0)?.toUpperCase() || '?';

  return (
    <div className="profile">
      {/* Header */}
      <header className="profile-header">
        <h1>Profile</h1>
        <p className="profile-subtitle">Manage your account and preferences</p>
      </header>

      {/* User Card */}
      <section className="profile-user-card">
        <div className="profile-avatar">{userInitial}</div>
        <div className="profile-user-info">
          <span className="profile-username">{userData.username}</span>
          <span className="profile-member">Member since {userStats.memberSince}</span>
        </div>
        <button className="profile-feedback-btn" onClick={() => setShowFeedbackModal(true)}>
          Feedback
        </button>
      </section>

      {/* Tab Navigation */}
      <nav className="profile-nav">
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`profile-nav-btn ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {/* Tab Content */}
      <div className="profile-content">
        
        {/* Account Tab */}
        {activeTab === 'account' && (
          <section className="profile-section">
            <div className="section-header">
              <h2>Account Information</h2>
              <button 
                className="section-edit-btn"
                onClick={() => setIsEditingProfile(!isEditingProfile)}
              >
                {isEditingProfile ? 'Cancel' : 'Edit'}
              </button>
            </div>

            <div className="profile-form">
              <div className="form-field">
                <label>Username</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={!isEditingProfile}
                  placeholder="Your username"
                />
              </div>

              <div className="form-field">
                <label>Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={!isEditingProfile}
                  placeholder="your@email.com"
                />
              </div>

              <div className="form-field">
                <label>Discord</label>
                <input
                  type="text"
                  value={discordUsername}
                  onChange={(e) => setDiscordUsername(e.target.value)}
                  disabled={!isEditingProfile}
                  placeholder="For leaderboard"
                />
              </div>

              <div className="toggle-row">
                <div className="toggle-info">
                  <span className="toggle-label">Show on Leaderboard</span>
                  <span className="toggle-desc">Display your streak publicly</span>
                </div>
                <button 
                  className={`toggle ${showOnLeaderboard ? 'active' : ''}`}
                  onClick={() => isEditingProfile && setShowOnLeaderboard(!showOnLeaderboard)}
                  disabled={!isEditingProfile}
                >
                  <span className="toggle-thumb" />
                </button>
              </div>

              {isEditingProfile && (
                <div className="form-actions">
                  <button className="btn-primary" onClick={handleProfileUpdate}>Save</button>
                  <button className="btn-ghost" onClick={() => setIsEditingProfile(false)}>Cancel</button>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Privacy Tab */}
        {activeTab === 'privacy' && (
          <section className="profile-section">
            <div className="section-header">
              <h2>Privacy Settings</h2>
              <button 
                className="section-edit-btn"
                onClick={() => setIsEditingPrivacy(!isEditingPrivacy)}
              >
                {isEditingPrivacy ? 'Cancel' : 'Edit'}
              </button>
            </div>

            <div className="settings-group">
              <h3>Data & Analytics</h3>
              
              <div className="toggle-row">
                <div className="toggle-info">
                  <span className="toggle-label">Anonymous Analytics</span>
                  <span className="toggle-desc">Help improve the app</span>
                </div>
                <button 
                  className={`toggle ${analyticsOptIn ? 'active' : ''}`}
                  onClick={() => isEditingPrivacy && setAnalyticsOptIn(!analyticsOptIn)}
                  disabled={!isEditingPrivacy}
                >
                  <span className="toggle-thumb" />
                </button>
              </div>

              <div className="toggle-row">
                <div className="toggle-info">
                  <span className="toggle-label">Community Insights</span>
                  <span className="toggle-desc">Share aggregated data</span>
                </div>
                <button 
                  className={`toggle ${dataSharing ? 'active' : ''}`}
                  onClick={() => isEditingPrivacy && setDataSharing(!dataSharing)}
                  disabled={!isEditingPrivacy}
                >
                  <span className="toggle-thumb" />
                </button>
              </div>
            </div>

            <div className="settings-group">
              <h3>Communications</h3>
              
              <div className="toggle-row">
                <div className="toggle-info">
                  <span className="toggle-label">Marketing Emails</span>
                  <span className="toggle-desc">New features and tips</span>
                </div>
                <button 
                  className={`toggle ${marketingEmails ? 'active' : ''}`}
                  onClick={() => isEditingPrivacy && setMarketingEmails(!marketingEmails)}
                  disabled={!isEditingPrivacy}
                >
                  <span className="toggle-thumb" />
                </button>
              </div>

              {isSupported && (
                <div className="toggle-row">
                  <div className="toggle-info">
                    <span className="toggle-label">Push Notifications</span>
                    <span className="toggle-desc">
                      {permission === 'denied' ? 'Blocked in browser' : 'Milestone alerts'}
                    </span>
                  </div>
                  <button 
                    className={`toggle ${notificationsEnabled ? 'active' : ''}`}
                    onClick={handleNotificationToggle}
                    disabled={!isEditingPrivacy || isTogglingNotifications || permission === 'denied'}
                  >
                    <span className="toggle-thumb" />
                  </button>
                </div>
              )}
            </div>

            {/* Notification Preferences */}
            {isSupported && notificationsEnabled && isEditingPrivacy && (
              <div className="settings-group">
                <h3>Notification Preferences</h3>
                
                <div className="toggle-row">
                  <div className="toggle-info">
                    <span className="toggle-label">Quiet Hours</span>
                    <span className="toggle-desc">Pause during sleep</span>
                  </div>
                  <button 
                    className={`toggle ${quietHoursEnabled ? 'active' : ''}`}
                    onClick={() => setQuietHoursEnabled(!quietHoursEnabled)}
                  >
                    <span className="toggle-thumb" />
                  </button>
                </div>

                {quietHoursEnabled && (
                  <div className="time-range">
                    <input
                      type="time"
                      value={quietHoursStart}
                      onChange={(e) => setQuietHoursStart(e.target.value)}
                    />
                    <span>to</span>
                    <input
                      type="time"
                      value={quietHoursEnd}
                      onChange={(e) => setQuietHoursEnd(e.target.value)}
                    />
                  </div>
                )}

                <div className="toggle-row">
                  <div className="toggle-info">
                    <span className="toggle-label">Milestones</span>
                    <span className="toggle-desc">Day 7, 30, 90...</span>
                  </div>
                  <button 
                    className={`toggle ${notifTypes.milestones ? 'active' : ''}`}
                    onClick={() => updateNotifType('milestones')}
                  >
                    <span className="toggle-thumb" />
                  </button>
                </div>

                <div className="toggle-row">
                  <div className="toggle-info">
                    <span className="toggle-label">Urge Support</span>
                    <span className="toggle-desc">Encouragement messages</span>
                  </div>
                  <button 
                    className={`toggle ${notifTypes.urgeSupport ? 'active' : ''}`}
                    onClick={() => updateNotifType('urgeSupport')}
                  >
                    <span className="toggle-thumb" />
                  </button>
                </div>

                <div className="toggle-row">
                  <div className="toggle-info">
                    <span className="toggle-label">Weekly Summary</span>
                    <span className="toggle-desc">Sunday progress report</span>
                  </div>
                  <button 
                    className={`toggle ${notifTypes.weeklyProgress ? 'active' : ''}`}
                    onClick={() => updateNotifType('weeklyProgress')}
                  >
                    <span className="toggle-thumb" />
                  </button>
                </div>

                <div className="toggle-row">
                  <div className="toggle-info">
                    <span className="toggle-label">Daily Reminder</span>
                    <span className="toggle-desc">Log your benefits</span>
                  </div>
                  <button 
                    className={`toggle ${dailyReminderEnabled ? 'active' : ''}`}
                    onClick={() => setDailyReminderEnabled(!dailyReminderEnabled)}
                  >
                    <span className="toggle-thumb" />
                  </button>
                </div>

                {dailyReminderEnabled && (
                  <div className="time-single">
                    <label>Reminder Time</label>
                    <input
                      type="time"
                      value={dailyReminderTime}
                      onChange={(e) => setDailyReminderTime(e.target.value)}
                    />
                  </div>
                )}

                <button className="test-btn" onClick={handleTestNotification}>
                  Test Notification
                </button>
              </div>
            )}

            {isEditingPrivacy && (
              <div className="form-actions">
                <button className="btn-primary" onClick={handleSaveNotificationPreferences}>Save</button>
                <button className="btn-ghost" onClick={() => setIsEditingPrivacy(false)}>Cancel</button>
              </div>
            )}
          </section>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <section className="profile-section">
            <div className="section-header">
              <h2>App Settings</h2>
            </div>

            <div className="settings-group">
              <h3>Language</h3>
              <div className="coming-soon">
                <span className="coming-soon-badge">Coming Soon</span>
                <p>Multi-language support is being developed</p>
              </div>
            </div>
          </section>
        )}

        {/* Data Tab */}
        {activeTab === 'data' && (
          <section className="profile-section">
            <div className="section-header">
              <h2>Data Management</h2>
            </div>

            <div className="data-card">
              <div className="data-info">
                <h3>Export Data</h3>
                <p>Download your tracking data as JSON</p>
              </div>
              <button className="btn-secondary" onClick={() => setShowExportModal(true)}>
                Export
              </button>
            </div>

            <div className="data-card danger">
              <div className="data-info">
                <h3>Delete Account</h3>
                <p>Permanently remove all your data</p>
              </div>
              <button className="btn-danger" onClick={() => setShowDeleteConfirm(true)}>
                Delete
              </button>
            </div>

            <button className="signout-btn" onClick={onLogout}>
              Sign Out
            </button>
          </section>
        )}
      </div>

      {/* Feedback Modal */}
      {showFeedbackModal && (
        <div className="modal-overlay" onClick={() => setShowFeedbackModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>Send Feedback</h2>
            
            <div className="feedback-types">
              {feedbackTypes.map(type => (
                <button
                  key={type.id}
                  className={`feedback-type ${feedbackType === type.id ? 'active' : ''}`}
                  onClick={() => setFeedbackType(type.id)}
                >
                  {type.label}
                </button>
              ))}
            </div>

            <div className="form-field">
              <label>Subject</label>
              <input
                type="text"
                value={feedbackSubject}
                onChange={(e) => setFeedbackSubject(e.target.value)}
                placeholder="Brief description"
                maxLength={100}
              />
            </div>

            <div className="form-field">
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
              <button className="btn-primary" onClick={handleFeedbackSubmit}>Submit</button>
              <button className="btn-ghost" onClick={() => setShowFeedbackModal(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Export Modal */}
      {showExportModal && (
        <div className="modal-overlay" onClick={() => setShowExportModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>Export Data</h2>
            <p>Download all your tracking data including streak history, journal entries, and settings.</p>
            
            <div className="modal-actions">
              <button className="btn-primary" onClick={handleDataExport}>Download</button>
              <button className="btn-ghost" onClick={() => setShowExportModal(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {showDeleteConfirm && (
        <div className="modal-overlay" onClick={() => setShowDeleteConfirm(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>Delete Account?</h2>
            <p>This will permanently delete all your data. This action cannot be undone.</p>
            
            <div className="modal-actions">
              <button className="btn-danger" onClick={handleAccountDeletion}>Delete</button>
              <button className="btn-ghost" onClick={() => setShowDeleteConfirm(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;