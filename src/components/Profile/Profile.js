// components/Profile/Profile.js - WITH BACKEND NOTIFICATION INTEGRATION
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import './Profile.css';
import { useNotifications } from '../../hooks/useNotifications';

// Icons
import { FaUser, FaEdit, FaCrown, FaDiscord, FaCog, FaCommentAlt, FaBug, 
  FaLightbulb, FaStar, FaPaperPlane, FaTimes, FaCheckCircle, 
  FaTrash, FaDownload, FaSignOutAlt, FaCreditCard, 
  FaBell, FaGlobe, FaLock, FaClock } from 'react-icons/fa';

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
  const [analyticsOptIn, setAnalyticsOptIn] = useState(userData.analyticsOptIn !== false);
  const [marketingEmails, setMarketingEmails] = useState(userData.marketingEmails || false);
  
  // NOTIFICATION HOOK WITH BACKEND
  const {
    permission,
    isSupported,
    subscription,
    fcmToken,
    requestPermission,
    subscribeToPush,
    unsubscribeFromPush,
    checkExistingSubscription,
    sendLocalNotification
  } = useNotifications();
  
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [isTogglingNotifications, setIsTogglingNotifications] = useState(false);
  
  // Feedback States
  const [feedbackType, setFeedbackType] = useState('general');
  const [feedbackSubject, setFeedbackSubject] = useState('');
  const [feedbackMessage, setFeedbackMessage] = useState('');
  
  // Tab slider refs
  const tabsRef = useRef(null);
  const sliderRef = useRef(null);
  const [isSliderInitialized, setIsSliderInitialized] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const resizeTimeoutRef = useRef(null);
  
  const feedbackTypes = [
    { id: 'bug', label: 'Bug Report', icon: FaBug },
    { id: 'feature', label: 'Feature Request', icon: FaLightbulb },
    { id: 'improvement', label: 'Suggestion', icon: FaStar },
    { id: 'general', label: 'General', icon: FaCommentAlt }
  ];

  const tabs = [
    { id: 'account', label: 'Account', icon: FaUser },
    { id: 'privacy', label: 'Privacy', icon: FaLock },
    { id: 'settings', label: 'Settings', icon: FaCog },
    { id: 'data', label: 'Data', icon: FaDownload }
  ];

  // CHECK EXISTING NOTIFICATION SUBSCRIPTION ON MOUNT
  useEffect(() => {
    if (isSupported && userData?.username) {
      checkExistingSubscription().then((sub) => {
        setNotificationsEnabled(!!sub);
      });
    }
  }, [isSupported, userData?.username, checkExistingSubscription]);

  // HANDLE NOTIFICATION TOGGLE WITH BACKEND
  const handleNotificationToggle = async () => {
    if (isTogglingNotifications) return;
    
    setIsTogglingNotifications(true);
    try {
      if (notificationsEnabled) {
        // Disable notifications
        await unsubscribeFromPush();
        setNotificationsEnabled(false);
        toast.success('✅ Push notifications disabled');
      } else {
        // Enable notifications
        if (permission !== 'granted') {
          const granted = await requestPermission();
          if (!granted) {
            toast.error('Please enable notifications in your browser settings');
            setIsTogglingNotifications(false);
            return;
          }
        }
        
        // Subscribe to push and send to backend
        await subscribeToPush();
        setNotificationsEnabled(true);
        toast.success('✅ Push notifications enabled!');
        
        // Send test notification after 1 second
        setTimeout(async () => {
          try {
            await sendLocalNotification('🎉 Notifications Activated!', {
              body: 'You\'ll now receive milestone alerts and motivational messages',
              icon: '/icon-192.png',
              badge: '/icon-192.png'
            });
          } catch (error) {
            console.error('Failed to send welcome notification:', error);
          }
        }, 1000);
      }
    } catch (error) {
      console.error('Failed to toggle notifications:', error);
      toast.error('Failed to update notification settings');
    }
    setIsTogglingNotifications(false);
  };

  // HANDLE TEST NOTIFICATION
  const handleTestNotification = async () => {
    try {
      const success = await sendLocalNotification('🔔 Test Notification', {
        body: 'If you can see this, notifications are working perfectly!',
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        requireInteraction: true
      });
      
      if (success) {
        toast.success('Test notification sent! Check your notifications.');
      } else {
        toast.error('Failed to send test notification');
      }
    } catch (error) {
      console.error('Test notification error:', error);
      toast.error('Error sending test notification');
    }
  };

  const detectMobile = useCallback(() => {
    const isMobileDevice = window.innerWidth <= 768 || 'ontouchstart' in window;
    setIsMobile(isMobileDevice);
    return isMobileDevice;
  }, []);

  const updateTabSlider = useCallback(() => {
    if (!tabsRef.current || !sliderRef.current) {
      return false;
    }
    
    try {
      const tabsContainer = tabsRef.current;
      const slider = sliderRef.current;
      const activeTabElement = tabsContainer.querySelector(`[data-tab="${activeTab}"]`);
      
      if (!activeTabElement) {
        return false;
      }

      requestAnimationFrame(() => {
        try {
          const containerRect = tabsContainer.getBoundingClientRect();
          const tabRect = activeTabElement.getBoundingClientRect();
          
          if (containerRect.width === 0 || tabRect.width === 0) {
            return;
          }

          const containerStyle = window.getComputedStyle(tabsContainer);
          const paddingLeft = Math.round(parseFloat(containerStyle.paddingLeft) || 8);
          const leftOffset = Math.round(tabRect.left - containerRect.left - paddingLeft);
          const tabWidth = Math.round(tabRect.width);
          
          slider.style.width = `${tabWidth}px`;
          
          requestAnimationFrame(() => {
            slider.style.transform = `translateX(${leftOffset}px)`;
            slider.style.opacity = '1';
            slider.style.visibility = 'visible';
          });
          
        } catch (innerError) {
          console.error('Inner slider positioning failed:', innerError);
        }
      });
      
      return true;
      
    } catch (error) {
      console.error('Slider update failed:', error);
      return false;
    }
  }, [activeTab]);

  const handleTabChange = useCallback((newTab) => {
    if (newTab === activeTab) return;
    setActiveTab(newTab);
    if (isMobile) {
      setTimeout(() => updateTabSlider(), 10);
    }
  }, [activeTab, isMobile, updateTabSlider]);

  useEffect(() => {
    const initializeSlider = () => {
      detectMobile();
      
      if (!tabsRef.current || !sliderRef.current) {
        return;
      }

      requestAnimationFrame(() => {
        const success = updateTabSlider();
        
        if (success) {
          setIsSliderInitialized(true);
        } else {
          setTimeout(() => {
            if (updateTabSlider()) {
              setIsSliderInitialized(true);
            } else {
              if (sliderRef.current) {
                sliderRef.current.style.opacity = '1';
                sliderRef.current.style.visibility = 'visible';
                setIsSliderInitialized(true);
                setTimeout(updateTabSlider, 50);
              }
            }
          }, 100);
        }
      });
    };

    const timer = setTimeout(initializeSlider, 100);
    return () => clearTimeout(timer);
  }, [updateTabSlider, detectMobile]);

  useEffect(() => {
    const handleResize = () => {
      detectMobile();
      
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }
      
      resizeTimeoutRef.current = setTimeout(() => {
        if (isSliderInitialized) {
          updateTabSlider();
        }
      }, 100);
    };

    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }
    };
  }, [isSliderInitialized, detectMobile, updateTabSlider]);

  useEffect(() => {
    if (isSliderInitialized) {
      setTimeout(updateTabSlider, 10);
    }
  }, [activeTab, isSliderInitialized, updateTabSlider]);

  const userStats = {
    memberSince: userData.startDate ? format(new Date(userData.startDate), 'MMMM yyyy') : 'Unknown'
  };

  const handleProfileUpdate = () => {
    const updates = {
      username: username.trim(),
      email: email.trim(),
      discordUsername: discordUsername.trim(),
      showOnLeaderboard,
      dataSharing,
      analyticsOptIn,
      marketingEmails
    };
    
    updateUserData(updates);
    setIsEditingProfile(false);
    toast.success('Profile updated successfully!');
  };

  const handleFeedbackSubmit = () => {
    if (!feedbackSubject.trim() || !feedbackMessage.trim()) {
      toast.error('Please fill in both subject and message');
      return;
    }
    
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
    
    setFeedbackSubject('');
    setFeedbackMessage('');
    setFeedbackType('general');
    setShowFeedbackModal(false);
    
    toast.success('Thank you! Your feedback has been submitted.');
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

  const handleAccountDeletion = () => {
    localStorage.clear();
    toast.success('Account deleted successfully');
    onLogout();
  };

  // CHECK IF PWA IS INSTALLED
  const isPWA = window.matchMedia('(display-mode: standalone)').matches;

  return (
    <div className="profile-container">
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

      <div 
        className="profile-tabs" 
        ref={tabsRef}
      >
        <div 
          className="profile-tab-slider" 
          ref={sliderRef}
          style={{ 
            opacity: 0,
            visibility: 'hidden',
            transform: 'translateX(0px)',
            width: '0px'
          }}
        />
        
        {tabs.map(tab => (
          <button 
            key={tab.id}
            className={`profile-tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => handleTabChange(tab.id)}
            data-tab={tab.id}
          >
            <tab.icon />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      <div className="profile-tab-content">
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

                {/* PUSH NOTIFICATIONS TOGGLE WITH BACKEND - FIXED */}
                {isSupported && (
                  <div className="toggle-setting">
                    <div className="toggle-info">
                      <span className="toggle-label">Push Notifications</span>
                      <span className="toggle-description">
                        Get milestone alerts and motivational messages
                      </span>
                      {permission === 'denied' && (
                        <span className="toggle-description" style={{ color: '#ef4444', marginTop: '4px' }}>
                          ⚠️ Blocked in browser settings
                        </span>
                      )}
                      {!isPWA && notificationsEnabled && (
                        <span className="toggle-description" style={{ color: '#f59e0b', marginTop: '4px' }}>
                          💡 Add to home screen for best experience
                        </span>
                      )}
                      {fcmToken && (
                        <span className="toggle-description" style={{ color: '#22c55e', marginTop: '4px', fontSize: '0.7rem' }}>
                          ✅ Connected to backend server
                        </span>
                      )}
                      {isTogglingNotifications && (
                        <span className="toggle-description" style={{ color: '#f59e0b', marginTop: '4px' }}>
                          ⏳ Updating...
                        </span>
                      )}
                    </div>
                    <div 
                      className={`toggle-switch ${notificationsEnabled ? 'active' : ''} ${isTogglingNotifications || permission === 'denied' ? 'disabled' : ''}`}
                      onClick={permission === 'denied' || isTogglingNotifications ? undefined : handleNotificationToggle}
                    >
                      <div className="toggle-slider"></div>
                    </div>
                  </div>
                )}

                {/* TEST NOTIFICATION BUTTON */}
                {isSupported && notificationsEnabled && (
                  <div className="toggle-setting">
                    <div className="toggle-info">
                      <span className="toggle-label">Test Notifications</span>
                      <span className="toggle-description">
                        Send a test notification to verify everything works
                      </span>
                    </div>
                    <button 
                      className="action-btn"
                      onClick={handleTestNotification}
                    >
                      <FaBell />
                      Send Test
                    </button>
                  </div>
                )}

                {!isSupported && (
                  <div className="toggle-setting">
                    <div className="toggle-info">
                      <span className="toggle-label">Push Notifications</span>
                      <span className="toggle-description" style={{ color: '#f59e0b' }}>
                        ⚠️ Not supported in this browser
                      </span>
                    </div>
                  </div>
                )}
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

        {activeTab === 'settings' && (
          <div className="settings-section">
            <h3>App Settings</h3>
            
            <div className="settings-groups">
              <div className="settings-group">
                <h4>Language & Localization</h4>
                
                <div className="coming-soon-banner">
                  <div className="coming-soon-helmet-container">
                    <img 
                      className="coming-soon-helmet" 
                      src="/helmet.png" 
                      alt="Coming Soon" 
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.nextElementSibling.style.display = 'block';
                      }}
                    />
                    <div className="coming-soon-helmet-fallback" style={{ display: 'none' }}>
                      ⚔️
                    </div>
                  </div>
                  
                  <div className="coming-soon-content">
                    <h4 className="coming-soon-title">
                      Multi-Language Support
                    </h4>
                    <p className="coming-soon-description">
                      Multiple language options are being developed and will be available soon. Stay tuned for updates!
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

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

      {showFeedbackModal && (
        <div className="modal-overlay" onClick={() => setShowFeedbackModal(false)}>
          <div className="modal-content feedback-modal" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowFeedbackModal(false)}>
              <FaTimes />
            </button>
            
            <div className="modal-header">
              <h3>Send Feedback</h3>
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