// components/Profile/Profile.js - UPDATED: Consistent header design matching tracker/calendar
import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import './Profile.css';

// Icons
import { FaUser, FaEdit, FaCrown, FaDiscord, FaCog, FaCommentAlt, FaBug, 
  FaLightbulb, FaStar, FaPaperPlane, FaTimes, FaCheckCircle, 
  FaTrash, FaDownload, FaSignOutAlt, FaCreditCard, 
  FaBell, FaGlobe, FaLock } from 'react-icons/fa';

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
  const [dataSharing, setDataSharing] = useState(userData.dataSharing || false);
  const [analyticsOptIn, setAnalyticsOptIn] = useState(userData.analyticsOptIn !== false); // Default true
  const [marketingEmails, setMarketingEmails] = useState(userData.marketingEmails || false);
  const [notifications, setNotifications] = useState(userData.notifications !== false); // Default true
  
  // App Settings States - SIMPLIFIED: Only language
  const [language, setLanguage] = useState(userData.language || 'en');
  
  // Feedback States - SIMPLIFIED: Removed email and priority
  const [feedbackType, setFeedbackType] = useState('general');
  const [feedbackSubject, setFeedbackSubject] = useState('');
  const [feedbackMessage, setFeedbackMessage] = useState('');
  
  const feedbackTypes = [
    { id: 'bug', label: 'Bug Report', icon: FaBug },
    { id: 'feature', label: 'Feature Request', icon: FaLightbulb },
    { id: 'improvement', label: 'Suggestion', icon: FaStar },
    { id: 'general', label: 'General', icon: FaCommentAlt }
  ];

  // Calculate basic user info for display - REMOVED: streak data
  const userStats = {
    memberSince: userData.startDate ? format(new Date(userData.startDate), 'MMMM yyyy') : 'Unknown'
  };

  // Handle profile updates
  const handleProfileUpdate = () => {
    const updates = {
      username: username.trim(),
      email: email.trim(),
      discordUsername: discordUsername.trim(),
      showOnLeaderboard,
      dataSharing,
      analyticsOptIn,
      marketingEmails,
      notifications,
      language
    };
    
    updateUserData(updates);
    setIsEditingProfile(false);
    toast.success('Profile updated successfully!');
  };

  // Handle feedback submission - SIMPLIFIED
  const handleFeedbackSubmit = () => {
    if (!feedbackSubject.trim() || !feedbackMessage.trim()) {
      toast.error('Please fill in both subject and message');
      return;
    }
    
    // In a real app, this would send to your feedback API
    const feedbackData = {
      type: feedbackType,
      subject: feedbackSubject.trim(),
      message: feedbackMessage.trim(),
      userData: {
        username: userData.username,
        timestamp: new Date().toISOString()
      }
    };
    
    console.log('Feedback submitted:', feedbackData);
    
    // Reset form
    setFeedbackSubject('');
    setFeedbackMessage('');
    setFeedbackType('general');
    setShowFeedbackModal(false);
    
    toast.success('Thank you! Your feedback has been submitted.');
  };

  // Handle data export
  const handleDataExport = () => {
    const exportData = {
      profile: {
        username: userData.username,
        memberSince: userData.startDate,
        isPremium: true, // Everyone is premium now
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
    
    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `titantrack-data-${format(new Date(), 'yyyy-MM-dd')}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    setShowExportModal(false);
    toast.success('Your data has been exported successfully!');
  };

  // Handle account deletion
  const handleAccountDeletion = () => {
    // In a real app, this would call your deletion API
    localStorage.clear();
    toast.success('Account deleted successfully');
    onLogout();
  };

  return (
    <div className="profile-container">
      {/* UPDATED: Integrated header design matching tracker/calendar */}
      <div className="integrated-profile-header">
        <div className="profile-header-title-section">
          <h2>Profile & Settings</h2>
          <p className="profile-header-subtitle">Manage your account, privacy settings, and preferences</p>
        </div>
        
        <div className="profile-header-actions-section">
          <div className="profile-header-actions">
            <button 
              className="feedback-btn"
              onClick={() => setShowFeedbackModal(true)}
            >
              <FaCommentAlt />
              <span className="feedback-btn-text">Feedback</span>
            </button>
          </div>
        </div>
      </div>

      {/* Profile Overview Card - Simplified since all features are free */}
      <div className="profile-overview-card">
        <div className="profile-avatar-section">
          <div className="profile-avatar">
            <FaUser />
            <div className="premium-crown"><FaCrown /></div>
          </div>
          <div className="profile-basic-info">
            <div className="profile-username">{userData.username}</div>
            <div className="profile-plan">
              All Features Unlocked
              <FaCrown className="plan-crown" />
            </div>
            <div className="profile-member-since">
              Member since {userStats.memberSince}
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation - REMOVED: Subscription tab */}
      <div className="profile-tabs">
        <button 
          className={`profile-tab ${activeTab === 'account' ? 'active' : ''}`}
          onClick={() => setActiveTab('account')}
        >
          <FaUser />
          <span>Account</span>
        </button>
        <button 
          className={`profile-tab ${activeTab === 'privacy' ? 'active' : ''}`}
          onClick={() => setActiveTab('privacy')}
        >
          <FaLock />
          <span>Privacy</span>
        </button>
        <button 
          className={`profile-tab ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => setActiveTab('settings')}
        >
          <FaCog />
          <span>Settings</span>
        </button>
        <button 
          className={`profile-tab ${activeTab === 'data' ? 'active' : ''}`}
          onClick={() => setActiveTab('data')}
        >
          <FaDownload />
          <span>Data</span>
        </button>
      </div>

      {/* Tab Content */}
      <div className="profile-tab-content">
        {/* Account Tab */}
        {activeTab === 'account' && (
          <div className="account-section">
            <div className="section-header">
              <h3>Account Information</h3>
              <button 
                className="edit-profile-btn"
                onClick={() => setIsEditingProfile(!isEditingProfile)}
              >
                <FaEdit />
                <span>{isEditingProfile ? 'Cancel' : 'Edit Profile'}</span>
              </button>
            </div>

            <div className="account-form">
              <div className="form-group">
                <label>Username</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={!isEditingProfile}
                  placeholder="Enter your username"
                />
              </div>

              <div className="form-group">
                <label>Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={!isEditingProfile}
                  placeholder="Enter your email"
                />
              </div>

              <div className="form-group">
                <label>Discord Username</label>
                <input
                  type="text"
                  value={discordUsername}
                  onChange={(e) => setDiscordUsername(e.target.value)}
                  disabled={!isEditingProfile}
                  placeholder="For leaderboard integration"
                />
              </div>

              <div className="form-group">
                <div className="toggle-setting">
                  <div className="toggle-info">
                    <span className="toggle-label">Show on Leaderboard</span>
                    <span className="toggle-description">Display your streak on the Discord leaderboard</span>
                  </div>
                  <div 
                    className={`toggle-switch ${showOnLeaderboard ? 'active' : ''}`}
                    onClick={() => isEditingProfile && setShowOnLeaderboard(!showOnLeaderboard)}
                  >
                    <div className="toggle-slider"></div>
                  </div>
                </div>
              </div>

              {isEditingProfile && (
                <div className="form-actions">
                  <button className="save-btn" onClick={handleProfileUpdate}>
                    <FaCheckCircle />
                    Save Changes
                  </button>
                  <button className="cancel-btn" onClick={() => setIsEditingProfile(false)}>
                    <FaTimes />
                    Cancel
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Privacy Tab */}
        {activeTab === 'privacy' && (
          <div className="privacy-section">
            <h3>Privacy Settings</h3>
            
            <div className="privacy-settings">
              <div className="privacy-group">
                <h4>Data & Analytics</h4>
                
                <div className="toggle-setting">
                  <div className="toggle-info">
                    <span className="toggle-label">Anonymous Analytics</span>
                    <span className="toggle-description">Help improve the app by sharing anonymous usage data</span>
                  </div>
                  <div 
                    className={`toggle-switch ${analyticsOptIn ? 'active' : ''}`}
                    onClick={() => setAnalyticsOptIn(!analyticsOptIn)}
                  >
                    <div className="toggle-slider"></div>
                  </div>
                </div>

                <div className="toggle-setting">
                  <div className="toggle-info">
                    <span className="toggle-label">Community Data Sharing</span>
                    <span className="toggle-description">Allow aggregated data to be used for community insights</span>
                  </div>
                  <div 
                    className={`toggle-switch ${dataSharing ? 'active' : ''}`}
                    onClick={() => setDataSharing(!dataSharing)}
                  >
                    <div className="toggle-slider"></div>
                  </div>
                </div>
              </div>

              <div className="privacy-group">
                <h4>Communications</h4>
                
                <div className="toggle-setting">
                  <div className="toggle-info">
                    <span className="toggle-label">Marketing Emails</span>
                    <span className="toggle-description">Receive updates about new features and tips</span>
                  </div>
                  <div 
                    className={`toggle-switch ${marketingEmails ? 'active' : ''}`}
                    onClick={() => setMarketingEmails(!marketingEmails)}
                  >
                    <div className="toggle-slider"></div>
                  </div>
                </div>

                <div className="toggle-setting">
                  <div className="toggle-info">
                    <span className="toggle-label">Push Notifications</span>
                    <span className="toggle-description">Receive reminders and encouragement</span>
                  </div>
                  <div 
                    className={`toggle-switch ${notifications ? 'active' : ''}`}
                    onClick={() => setNotifications(!notifications)}
                  >
                    <div className="toggle-slider"></div>
                  </div>
                </div>
              </div>
            </div>

            <div className="privacy-actions">
              <button className="action-btn" onClick={handleProfileUpdate}>
                <FaCheckCircle />
                Save Privacy Settings
              </button>
            </div>
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="settings-section">
            <h3>App Settings</h3>
            
            <div className="settings-groups">
              <div className="settings-group">
                <h4>Language</h4>
                
                <div className="select-setting">
                  <label>Language</label>
                  <select 
                    value={language} 
                    onChange={(e) => setLanguage(e.target.value)}
                  >
                    <option value="en">English</option>
                    <option value="es">Español</option>
                    <option value="fr">Français</option>
                    <option value="de">Deutsch</option>
                    <option value="pt">Português</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="settings-actions">
              <button className="action-btn" onClick={handleProfileUpdate}>
                <FaCheckCircle />
                Save Settings
              </button>
            </div>
          </div>
        )}

        {/* Data Tab */}
        {activeTab === 'data' && (
          <div className="data-section">
            <h3>Data Management</h3>
            
            <div className="data-actions">
              <div className="data-action-card">
                <div className="data-action-info">
                  <h4>Export Your Data</h4>
                  <p>Download all your tracking data, journal entries, and settings as a JSON file</p>
                </div>
                <button className="action-btn" onClick={() => setShowExportModal(true)}>
                  <FaDownload />
                  Export Data
                </button>
              </div>

              <div className="data-action-card danger">
                <div className="data-action-info">
                  <h4>Delete Account</h4>
                  <p>Permanently delete your account and all associated data. This action cannot be undone.</p>
                </div>
                <button className="danger-btn" onClick={() => setShowDeleteConfirm(true)}>
                  <FaTrash />
                  Delete Account
                </button>
              </div>
            </div>

            <div className="logout-section">
              <button className="logout-btn" onClick={onLogout}>
                <FaSignOutAlt />
                Sign Out
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Feedback Modal */}
      {showFeedbackModal && (
        <div className="modal-overlay" onClick={() => setShowFeedbackModal(false)}>
          <div className="modal-content feedback-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Send Feedback</h3>
              <button className="modal-close" onClick={() => setShowFeedbackModal(false)}>
                <FaTimes />
              </button>
            </div>

            <div className="feedback-form">
              <div className="feedback-types">
                <label>Feedback Type</label>
                <div className="type-options">
                  {feedbackTypes.map(type => (
                    <button
                      key={type.id}
                      className={`type-option ${feedbackType === type.id ? 'active' : ''}`}
                      onClick={() => setFeedbackType(type.id)}
                    >
                      <type.icon />
                      <span>{type.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label>Subject</label>
                <input
                  type="text"
                  value={feedbackSubject}
                  onChange={(e) => setFeedbackSubject(e.target.value)}
                  placeholder="Brief description of your feedback"
                  maxLength={100}
                />
                <div className="char-count">{feedbackSubject.length}/100</div>
              </div>

              <div className="form-group">
                <label>Message</label>
                <textarea
                  value={feedbackMessage}
                  onChange={(e) => setFeedbackMessage(e.target.value)}
                  placeholder="Please provide details about your feedback..."
                  rows={5}
                  maxLength={500}
                ></textarea>
                <div className="char-count">{feedbackMessage.length}/500</div>
              </div>
            </div>

            <div className="modal-actions">
              <button className="submit-btn" onClick={handleFeedbackSubmit}>
                <FaPaperPlane />
                Submit
              </button>
              <button className="cancel-btn" onClick={() => setShowFeedbackModal(false)}>
                <FaTimes />
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Export Confirmation Modal */}
      {showExportModal && (
        <div className="modal-overlay" onClick={() => setShowExportModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3>Export Your Data</h3>
            <p>This will download all your tracking data, including:</p>
            <ul>
              <li>Profile information</li>
              <li>Streak history and statistics</li>
              <li>Benefit tracking data</li>
              <li>Journal entries</li>
              <li>Badges and achievements</li>
              <li>Urge management logs</li>
            </ul>
            <div className="modal-actions">
              <button className="action-btn" onClick={handleDataExport}>
                <FaDownload />
                Download Data
              </button>
              <button className="cancel-btn" onClick={() => setShowExportModal(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Account Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="modal-overlay" onClick={() => setShowDeleteConfirm(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3>Delete Account</h3>
            <p>Are you absolutely sure you want to delete your account?</p>
            <p><strong>This action cannot be undone.</strong> All your data including:</p>
            <ul>
              <li>Streak history and progress</li>
              <li>Journal entries</li>
              <li>Benefit tracking data</li>
              <li>Badges and achievements</li>
            </ul>
            <p>will be permanently deleted.</p>
            
            <div className="modal-actions">
              <button className="danger-btn" onClick={handleAccountDeletion}>
                <FaTrash />
                Yes, Delete My Account
              </button>
              <button className="cancel-btn" onClick={() => setShowDeleteConfirm(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;