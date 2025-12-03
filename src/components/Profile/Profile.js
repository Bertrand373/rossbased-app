// Profile.js - TITANTRACK MINIMAL
// Matches Landing/Stats/Calendar aesthetic
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
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  
  // Account States
  const [username, setUsername] = useState(userData.username || '');
  const [email, setEmail] = useState(userData.email || '');
  const [discordUsername, setDiscordUsername] = useState(userData.discordUsername || '');
  const [showOnLeaderboard, setShowOnLeaderboard] = useState(userData.showOnLeaderboard || false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  
  // Privacy States
  const [isEditingPrivacy, setIsEditingPrivacy] = useState(false);
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
      quietHoursEnabled, quietHoursStart, quietHoursEnd,
      types: notifTypes, dailyReminderEnabled, dailyReminderTime, fcmToken
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
    setIsEditingPrivacy(false);
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
  };

  const handleFeedbackSubmit = () => {
    if (!feedbackSubject.trim() || !feedbackMessage.trim()) {
      toast.error('Please fill in both fields');
      return;
    }
    console.log('Feedback:', { type: feedbackType, subject: feedbackSubject, message: feedbackMessage });
    setFeedbackSubject('');
    setFeedbackMessage('');
    setFeedbackType('general');
    setShowFeedbackModal(false);
    toast.success('Feedback sent!');
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

  const handleAccountDeletion = () => {
    localStorage.clear();
    onLogout();
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
      <div className="profile-content">
        
        {/* ACCOUNT TAB */}
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

        {/* PRIVACY TAB */}
        {activeTab === 'privacy' && (
          <div className="profile-section">
            <div className="section-header">
              <h2>Privacy & Notifications</h2>
              <button className="edit-btn" onClick={() => setIsEditingPrivacy(!isEditingPrivacy)}>
                {isEditingPrivacy ? 'Cancel' : 'Edit'}
              </button>
            </div>

            <h3 className="group-label">Data & Analytics</h3>

            <div className="toggle-row">
              <div className="toggle-text">
                <span className="toggle-label">Anonymous Analytics</span>
                <span className="toggle-desc">Help improve the app</span>
              </div>
              <button 
                className={`toggle-switch ${analyticsOptIn ? 'active' : ''}`}
                onClick={() => isEditingPrivacy && setAnalyticsOptIn(!analyticsOptIn)}
                disabled={!isEditingPrivacy}
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
                onClick={() => isEditingPrivacy && setDataSharing(!dataSharing)}
                disabled={!isEditingPrivacy}
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
                onClick={() => isEditingPrivacy && setMarketingEmails(!marketingEmails)}
                disabled={!isEditingPrivacy}
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
                  disabled={!isEditingPrivacy || isTogglingNotifications || permission === 'denied'}
                >
                  <span className="toggle-knob" />
                </button>
              </div>
            )}

            {/* Notification Preferences */}
            {isSupported && notificationsEnabled && isEditingPrivacy && (
              <>
                <h3 className="group-label">Notification Preferences</h3>

                <div className="toggle-row">
                  <div className="toggle-text">
                    <span className="toggle-label">Quiet Hours</span>
                    <span className="toggle-desc">Pause during sleep</span>
                  </div>
                  <button 
                    className={`toggle-switch ${quietHoursEnabled ? 'active' : ''}`}
                    onClick={() => setQuietHoursEnabled(!quietHoursEnabled)}
                  >
                    <span className="toggle-knob" />
                  </button>
                </div>

                {quietHoursEnabled && (
                  <div className="time-row">
                    <input type="time" value={quietHoursStart} onChange={(e) => setQuietHoursStart(e.target.value)} />
                    <span>to</span>
                    <input type="time" value={quietHoursEnd} onChange={(e) => setQuietHoursEnd(e.target.value)} />
                  </div>
                )}

                <div className="toggle-row">
                  <div className="toggle-text">
                    <span className="toggle-label">Milestones</span>
                    <span className="toggle-desc">Day 7, 30, 90...</span>
                  </div>
                  <button 
                    className={`toggle-switch ${notifTypes.milestones ? 'active' : ''}`}
                    onClick={() => updateNotifType('milestones')}
                  >
                    <span className="toggle-knob" />
                  </button>
                </div>

                <div className="toggle-row">
                  <div className="toggle-text">
                    <span className="toggle-label">Urge Support</span>
                    <span className="toggle-desc">Encouragement</span>
                  </div>
                  <button 
                    className={`toggle-switch ${notifTypes.urgeSupport ? 'active' : ''}`}
                    onClick={() => updateNotifType('urgeSupport')}
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
                    onClick={() => updateNotifType('weeklyProgress')}
                  >
                    <span className="toggle-knob" />
                  </button>
                </div>

                <div className="toggle-row">
                  <div className="toggle-text">
                    <span className="toggle-label">Daily Reminder</span>
                    <span className="toggle-desc">Log benefits</span>
                  </div>
                  <button 
                    className={`toggle-switch ${dailyReminderEnabled ? 'active' : ''}`}
                    onClick={() => setDailyReminderEnabled(!dailyReminderEnabled)}
                  >
                    <span className="toggle-knob" />
                  </button>
                </div>

                {dailyReminderEnabled && (
                  <div className="time-row single">
                    <label>Reminder time</label>
                    <input type="time" value={dailyReminderTime} onChange={(e) => setDailyReminderTime(e.target.value)} />
                  </div>
                )}

                <button className="test-notif-btn" onClick={handleTestNotification}>
                  Test Notification
                </button>
              </>
            )}

            {isEditingPrivacy && (
              <div className="section-actions">
                <button className="btn-ghost" onClick={() => setIsEditingPrivacy(false)}>Cancel</button>
                <button className="btn-primary" onClick={handleSaveNotificationPreferences}>Save Changes</button>
              </div>
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

            {/* Tagline */}
            <div className="about-tagline">
              <span className="tagline-main">Hold the Flame.</span>
              <span className="tagline-sub">Master the fire within.</span>
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
        <div className="overlay" onClick={() => setShowFeedbackModal(false)}>
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
        <div className="overlay" onClick={() => setShowExportModal(false)}>
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
        <div className="overlay" onClick={() => setShowDeleteConfirm(false)}>
          <div className="confirm-modal" onClick={e => e.stopPropagation()}>
            <h2>Delete Account?</h2>
            <p>This will permanently delete all your data. This cannot be undone.</p>
            <div className="confirm-actions">
              <button className="btn-danger" onClick={handleAccountDeletion}>Delete</button>
              <button className="btn-ghost" onClick={() => setShowDeleteConfirm(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* PRIVACY POLICY MODAL */}
      {showPrivacyModal && (
        <div className="overlay" onClick={() => setShowPrivacyModal(false)}>
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