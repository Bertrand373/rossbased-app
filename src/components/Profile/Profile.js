// components/Profile/Profile.js - Complete Profile Component with Settings and Feedback
import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import './Profile.css';

// Icons
import { FaUser, FaEdit, FaCrown, FaDiscord, FaCog, FaCommentAlt, FaBug, 
  FaLightbulb, FaStar, FaPaperPlane, FaTimes, FaCheckCircle, FaEye, 
  FaEyeSlash, FaTrash, FaDownload, FaSignOutAlt, FaCreditCard, 
  FaBell, FaMoon, FaSun, FaGlobe, FaLock, FaTrophy, FaCalendarAlt,
  FaChartLine, FaShieldAlt } from 'react-icons/fa';

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
  
  // App Settings States
  const [darkMode, setDarkMode] = useState(userData.darkMode !== false); // Default true (dark)
  const [notifications, setNotifications] = useState(userData.notifications !== false); // Default true
  const [language, setLanguage] = useState(userData.language || 'en');
  const [wisdomMode, setWisdomMode] = useState(userData.wisdomMode || false);
  
  // Feedback States
  const [feedbackType, setFeedbackType] = useState('general');
  const [feedbackSubject, setFeedbackSubject] = useState('');
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [feedbackPriority, setFeedbackPriority] = useState('medium');
  const [feedbackEmail, setFeedbackEmail] = useState(userData.email || '');
  
  const feedbackTypes = [
    { id: 'bug', label: 'Bug Report', icon: FaBug, color: '#ef4444' },
    { id: 'feature', label: 'Feature Request', icon: FaLightbulb, color: '#f59e0b' },
    { id: 'improvement', label: 'Improvement Suggestion', icon: FaStar, color: '#3b82f6' },
    { id: 'general', label: 'General Feedback', icon: FaCommentAlt, color: '#8b5cf6' }
  ];
  
  const priorityLevels = [
    { id: 'low', label: 'Low Priority', color: '#6b7280' },
    { id: 'medium', label: 'Medium Priority', color: '#f59e0b' },
    { id: 'high', label: 'High Priority', color: '#ef4444' },
    { id: 'critical', label: 'Critical/Urgent', color: '#dc2626' }
  ];

  // Calculate user stats for display
  const userStats = {
    memberSince: userData.startDate ? format(new Date(userData.startDate), 'MMMM yyyy') : 'Unknown',
    currentStreak: userData.currentStreak || 0,
    longestStreak: userData.longestStreak || 0,
    totalBenefitsLogged: userData.benefitTracking?.length || 0,
    totalJournalEntries: userData.notes ? Object.keys(userData.notes).length : 0,
    badgesEarned: userData.badges?.filter(badge => badge.earned).length || 0,
    totalBadges: userData.badges?.length || 4
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
      darkMode,
      notifications,
      language,
      wisdomMode
    };
    
    updateUserData(updates);
    setIsEditingProfile(false);
    toast.success('Profile updated successfully!');
  };

  // Handle feedback submission
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
      priority: feedbackPriority,
      email: feedbackEmail.trim(),
      userData: {
        username: userData.username,
        isPremium,
        currentStreak: userData.currentStreak,
        appVersion: '1.0.0'
      },
      timestamp: new Date().toISOString()
    };
    
    console.log('Feedback submitted:', feedbackData);
    
    // Reset form
    setFeedbackSubject('');
    setFeedbackMessage('');
    setFeedbackType('general');
    setFeedbackPriority('medium');
    setShowFeedbackModal(false);
    
    toast.success('Thank you! Your feedback has been submitted.');
  };

  // Handle data export
  const handleDataExport = () => {
    const exportData = {
      profile: {
        username: userData.username,
        memberSince: userData.startDate,
        isPremium,
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

  // Get current plan info
  const getCurrentPlan = () => {
    if (isPremium) {
      return {
        name: 'Premium',
        price: '$3.99/month',
        features: ['All premium features', 'Community access', 'Advanced analytics', 'Priority support']
      };
    } else {
      return {
        name: 'Free',
        price: 'Free',
        features: ['Basic tracking', 'Limited features', 'Standard support']
      };
    }
  };

  const currentPlan = getCurrentPlan();

  return (
    <div className="profile-container">
      {/* Header */}
      <div className="profile-header">
        <div className="profile-header-spacer"></div>
        <h2>Profile & Settings</h2>
        <div className="profile-header-actions">
          <button 
            className="feedback-btn"
            onClick={() => setShowFeedbackModal(true)}
          >
            <FaCommentAlt />
            <span>Feedback</span>
          </button>
        </div>
      </div>

      {/* Profile Overview Card */}
      <div className="profile-overview-card">
        <div className="profile-avatar-section">
          <div className="profile-avatar">
            <FaUser />
            {isPremium && <div className="premium-crown"><FaCrown /></div>}
          </div>
          <div className="profile-basic-info">
            <div className="profile-username">{userData.username}</div>
            <div className="profile-plan">
              {currentPlan.name} Plan
              {isPremium && <FaCrown className="plan-crown" />}
            </div>
            <div className="profile-member-since">
              Member since {userStats.memberSince}
            </div>
          </div>
        </div>
        
        <div className="profile-quick-stats">
          <div className="quick-stat-item">
            <div className="quick-stat-value">{userStats.currentStreak}</div>
            <div className="quick-stat-label">Current Streak</div>
          </div>
          <div className="quick-stat-item">
            <div className="quick-stat-value">{userStats.longestStreak}</div>
            <div className="quick-stat-label">Longest Streak</div>
          </div>
          <div className="quick-stat-item">
            <div className="quick-stat-value">{userStats.badgesEarned}/{userStats.totalBadges}</div>
            <div className="quick-stat-label">Badges Earned</div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="profile-tabs">
        <button 
          className={`profile-tab ${activeTab === 'account' ? 'active' : ''}`}
          onClick={() => setActiveTab('account')}
        >
          <FaUser />
          <span>Account</span>
        </button>
        <button 
          className={`profile-tab ${activeTab === 'subscription' ? 'active' : ''}`}
          onClick={() => setActiveTab('subscription')}
        >
          <FaCrown />
          <span>Subscription</span>
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

            {/* Account Stats */}
            <div className="account-stats">
              <h4>Your Journey Statistics</h4>
              <div className="stats-grid">
                <div className="stat-card">
                  <div className="stat-icon"><FaCalendarAlt /></div>
                  <div className="stat-info">
                    <div className="stat-value">{userStats.currentStreak} days</div>
                    <div className="stat-label">Current Streak</div>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon"><FaTrophy /></div>
                  <div className="stat-info">
                    <div className="stat-value">{userStats.longestStreak} days</div>
                    <div className="stat-label">Longest Streak</div>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon"><FaChartLine /></div>
                  <div className="stat-info">
                    <div className="stat-value">{userStats.totalBenefitsLogged}</div>
                    <div className="stat-label">Benefits Logged</div>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon"><FaEdit /></div>
                  <div className="stat-info">
                    <div className="stat-value">{userStats.totalJournalEntries}</div>
                    <div className="stat-label">Journal Entries</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Subscription Tab */}
        {activeTab === 'subscription' && (
          <div className="subscription-section">
            <div className="current-plan-card">
              <div className="plan-header">
                <h3>Current Plan</h3>
                <div className={`plan-badge ${isPremium ? 'premium' : 'free'}`}>
                  {isPremium && <FaCrown />}
                  {currentPlan.name}
                </div>
              </div>
              
              <div className="plan-details">
                <div className="plan-price">{currentPlan.price}</div>
                <div className="plan-features">
                  {currentPlan.features.map((feature, index) => (
                    <div key={index} className="plan-feature">
                      <FaCheckCircle />
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>
              </div>

              {!isPremium ? (
                <button className="upgrade-btn">
                  <FaCrown />
                  Upgrade to Premium
                </button>
              ) : (
                <div className="subscription-actions">
                  <button className="manage-btn">
                    <FaCreditCard />
                    Manage Billing
                  </button>
                  <button className="cancel-btn">
                    <FaTimes />
                    Cancel Subscription
                  </button>
                </div>
              )}
            </div>

            {!isPremium && (
              <div className="premium-benefits">
                <h4>Premium Benefits</h4>
                <div className="benefits-grid">
                  <div className="benefit-item">
                    <FaChartLine className="benefit-icon" />
                    <div className="benefit-text">
                      <div className="benefit-title">Advanced Analytics</div>
                      <div className="benefit-description">Detailed insights and progress tracking</div>
                    </div>
                  </div>
                  <div className="benefit-item">
                    <FaShieldAlt className="benefit-icon" />
                    <div className="benefit-text">
                      <div className="benefit-title">Full Urge Toolkit</div>
                      <div className="benefit-description">Access all emergency management tools</div>
                    </div>
                  </div>
                  <div className="benefit-item">
                    <FaDiscord className="benefit-icon" />
                    <div className="benefit-text">
                      <div className="benefit-title">Community Access</div>
                      <div className="benefit-description">Join the exclusive Discord community</div>
                    </div>
                  </div>
                  <div className="benefit-item">
                    <FaStar className="benefit-icon" />
                    <div className="benefit-text">
                      <div className="benefit-title">Priority Support</div>
                      <div className="benefit-description">Get help faster when you need it</div>
                    </div>
                  </div>
                </div>
              </div>
            )}
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
                <h4>Appearance</h4>
                
                <div className="toggle-setting">
                  <div className="toggle-info">
                    <span className="toggle-label">Dark Mode</span>
                    <span className="toggle-description">Use dark theme (recommended)</span>
                  </div>
                  <div 
                    className={`toggle-switch ${darkMode ? 'active' : ''}`}
                    onClick={() => setDarkMode(!darkMode)}
                  >
                    <div className="toggle-slider">
                      {darkMode ? <FaMoon /> : <FaSun />}
                    </div>
                  </div>
                </div>

                <div className="toggle-setting">
                  <div className="toggle-info">
                    <span className="toggle-label">Wisdom Mode Default</span>
                    <span className="toggle-description">Start with esoteric insights in Stats and Timeline</span>
                  </div>
                  <div 
                    className={`toggle-switch ${wisdomMode ? 'active' : ''}`}
                    onClick={() => setWisdomMode(!wisdomMode)}
                  >
                    <div className="toggle-slider">
                      <FaEye />
                    </div>
                  </div>
                </div>
              </div>

              <div className="settings-group">
                <h4>Language & Region</h4>
                
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
                      style={{ '--type-color': type.color }}
                    >
                      <type.icon />
                      <span>{type.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label>Priority Level</label>
                <select 
                  value={feedbackPriority} 
                  onChange={(e) => setFeedbackPriority(e.target.value)}
                >
                  {priorityLevels.map(priority => (
                    <option key={priority.id} value={priority.id}>
                      {priority.label}
                    </option>
                  ))}
                </select>
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
                  rows={6}
                  maxLength={1000}
                ></textarea>
                <div className="char-count">{feedbackMessage.length}/1000</div>
              </div>

              <div className="form-group">
                <label>Email (for follow-up)</label>
                <input
                  type="email"
                  value={feedbackEmail}
                  onChange={(e) => setFeedbackEmail(e.target.value)}
                  placeholder="your.email@example.com"
                />
              </div>
            </div>

            <div className="modal-actions">
              <button className="submit-btn" onClick={handleFeedbackSubmit}>
                <FaPaperPlane />
                Send Feedback
              </button>
              <button className="cancel-btn" onClick={() => setShowFeedbackModal(false)}>
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