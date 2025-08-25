// components/Profile/Profile.js - BULLETPROOF SLIDING TAB ANIMATION - Mobile-First with Enhanced Touch Support
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import './Profile.css';

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
  const [analyticsOptIn, setAnalyticsOptIn] = useState(userData.analyticsOptIn !== false); // Default true
  const [marketingEmails, setMarketingEmails] = useState(userData.marketingEmails || false);
  const [notifications, setNotifications] = useState(userData.notifications !== false); // Default true
  
  // Feedback States - SIMPLIFIED: Removed email and priority
  const [feedbackType, setFeedbackType] = useState('general');
  const [feedbackSubject, setFeedbackSubject] = useState('');
  const [feedbackMessage, setFeedbackMessage] = useState('');
  
  // MOBILE-FIRST: Enhanced tab slider with mobile-specific handling
  const tabsRef = useRef(null);
  const sliderRef = useRef(null);
  const [isSliderInitialized, setIsSliderInitialized] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [lastActiveTab, setLastActiveTab] = useState(activeTab);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const initTimeoutRef = useRef(null);
  const resizeTimeoutRef = useRef(null);
  const transitionTimeoutRef = useRef(null);
  
  const feedbackTypes = [
    { id: 'bug', label: 'Bug Report', icon: FaBug },
    { id: 'feature', label: 'Feature Request', icon: FaLightbulb },
    { id: 'improvement', label: 'Suggestion', icon: FaStar },
    { id: 'general', label: 'General', icon: FaCommentAlt }
  ];

  // Tab configuration
  const tabs = [
    { id: 'account', label: 'Account', icon: FaUser },
    { id: 'privacy', label: 'Privacy', icon: FaLock },
    { id: 'settings', label: 'Settings', icon: FaCog },
    { id: 'data', label: 'Data', icon: FaDownload }
  ];

  // MOBILE DETECTION: Enhanced mobile detection
  const detectMobile = useCallback(() => {
    const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
                          window.innerWidth <= 768 ||
                          ('ontouchstart' in window) ||
                          (navigator.maxTouchPoints > 0);
    
    setIsMobile(isMobileDevice);
    return isMobileDevice;
  }, []);

  // BULLETPROOF: Ultra-robust slider positioning with mobile-specific optimizations
  const updateTabSlider = useCallback((forceUpdate = false) => {
    // Skip if not ready or transitioning (prevents race conditions)
    if (!tabsRef.current || !sliderRef.current || (isTransitioning && !forceUpdate)) {
      return false;
    }
    
    try {
      const tabsContainer = tabsRef.current;
      const slider = sliderRef.current;
      const activeTabElement = tabsContainer.querySelector(`[data-tab="${activeTab}"]`);
      
      if (!activeTabElement) {
        console.warn(`Tab element not found: ${activeTab}`);
        return false;
      }

      // MOBILE-SPECIFIC: Force reflow before measurements on mobile
      if (isMobile) {
        tabsContainer.style.transform = 'translateZ(0)'; // Trigger hardware acceleration
        void activeTabElement.offsetHeight; // Force reflow
      }

      // Multiple measurement attempts for mobile reliability
      let containerRect, tabRect;
      let attempts = 0;
      const maxAttempts = 3;
      
      do {
        containerRect = tabsContainer.getBoundingClientRect();
        tabRect = activeTabElement.getBoundingClientRect();
        attempts++;
        
        // If measurements are invalid, wait and retry
        if ((containerRect.width === 0 || tabRect.width === 0) && attempts < maxAttempts) {
          continue;
        }
      } while ((containerRect.width === 0 || tabRect.width === 0) && attempts < maxAttempts);
      
      // Final validation
      if (containerRect.width === 0 || tabRect.width === 0) {
        console.warn('Invalid measurements, skipping slider update');
        return false;
      }

      // ENHANCED: Cross-browser padding calculation
      const computedStyle = window.getComputedStyle(tabsContainer);
      const paddingLeft = parseFloat(computedStyle.paddingLeft) || 8;
      const paddingRight = parseFloat(computedStyle.paddingRight) || 8;
      
      // MOBILE-OPTIMIZED: More precise positioning calculation
      const containerLeft = containerRect.left;
      const tabLeft = tabRect.left;
      const rawOffset = tabLeft - containerLeft - paddingLeft;
      
      // BOUNDARY PROTECTION: Advanced boundary calculations
      const availableWidth = containerRect.width - paddingLeft - paddingRight;
      const tabWidth = Math.min(tabRect.width, availableWidth);
      const maxOffset = Math.max(0, availableWidth - tabWidth);
      const clampedOffset = Math.max(0, Math.min(rawOffset, maxOffset));
      
      // MOBILE-SPECIFIC: Disable transitions during rapid updates
      if (isMobile && isTransitioning) {
        slider.style.transition = 'none';
      } else {
        slider.style.transition = '';
      }
      
      // Apply positioning with pixel precision
      const finalOffset = Math.round(clampedOffset * 100) / 100; // Round to 2 decimal places
      const finalWidth = Math.round(tabWidth * 100) / 100;
      
      slider.style.transform = `translateX(${finalOffset}px)`;
      slider.style.width = `${finalWidth}px`;
      slider.style.opacity = '1';
      slider.style.visibility = 'visible';
      
      // MOBILE: Force GPU acceleration
      if (isMobile) {
        slider.style.willChange = 'transform, width';
        slider.style.backfaceVisibility = 'hidden';
        slider.style.perspective = '1000px';
      }
      
      return true;
      
    } catch (error) {
      console.error('Slider update failed:', error);
      return false;
    }
  }, [activeTab, isMobile, isTransitioning]);

  // ENHANCED: Robust tab change handler with mobile optimizations
  const handleTabChange = useCallback((newTab) => {
    if (newTab === activeTab || isTransitioning) return;
    
    setIsTransitioning(true);
    setLastActiveTab(activeTab);
    setActiveTab(newTab);
    
    // Clear any existing transition timeout
    if (transitionTimeoutRef.current) {
      clearTimeout(transitionTimeoutRef.current);
    }
    
    // MOBILE: Immediate update followed by cleanup
    if (isMobile) {
      // Force immediate update on mobile
      requestAnimationFrame(() => {
        updateTabSlider(true);
        
        // Reset transition state
        transitionTimeoutRef.current = setTimeout(() => {
          setIsTransitioning(false);
          if (sliderRef.current) {
            sliderRef.current.style.transition = '';
            sliderRef.current.style.willChange = 'auto';
          }
        }, 350); // Match CSS transition duration
      });
    } else {
      // Desktop: Normal transition
      transitionTimeoutRef.current = setTimeout(() => {
        setIsTransitioning(false);
      }, 300);
    }
  }, [activeTab, isTransitioning, isMobile, updateTabSlider]);

  // MOBILE-FIRST: Enhanced initialization with multiple fallbacks
  useEffect(() => {
    const initializeSlider = () => {
      detectMobile();
      
      if (!tabsRef.current || !sliderRef.current) {
        return;
      }

      // MOBILE: Additional initialization steps
      if (isMobile) {
        // Force container to be ready
        const container = tabsRef.current;
        container.style.transform = 'translateZ(0)';
        void container.offsetHeight; // Force layout
      }

      // Multiple initialization attempts
      const attemptInit = (attempt = 1) => {
        const success = updateTabSlider(true);
        
        if (success) {
          setIsSliderInitialized(true);
          console.log(`Slider initialized successfully on attempt ${attempt}`);
        } else if (attempt < 5) {
          // Retry with exponential backoff
          const delay = Math.min(100 * Math.pow(2, attempt - 1), 1000);
          setTimeout(() => attemptInit(attempt + 1), delay);
        } else {
          console.warn('Slider initialization failed after 5 attempts');
          // Fallback: Initialize with basic styling
          if (sliderRef.current) {
            sliderRef.current.style.opacity = '1';
            sliderRef.current.style.visibility = 'visible';
            setIsSliderInitialized(true);
          }
        }
      };

      // Start initialization
      requestAnimationFrame(() => {
        attemptInit();
      });
    };

    // Clear any existing timeout
    if (initTimeoutRef.current) {
      clearTimeout(initTimeoutRef.current);
    }

    // Initialize with delay to ensure DOM is ready
    initTimeoutRef.current = setTimeout(initializeSlider, 100);
    
    return () => {
      if (initTimeoutRef.current) {
        clearTimeout(initTimeoutRef.current);
      }
    };
  }, [updateTabSlider, detectMobile, isMobile]);

  // MOBILE-OPTIMIZED: Viewport and orientation change handling
  useEffect(() => {
    const handleViewportChange = () => {
      const wasMobile = isMobile;
      const nowMobile = detectMobile();
      
      // Clear existing timeout
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }
      
      // MOBILE: Immediate update for device orientation changes
      if (nowMobile) {
        resizeTimeoutRef.current = setTimeout(() => {
          updateTabSlider(true);
        }, 50); // Faster response on mobile
      } else {
        // Desktop: Debounced update
        resizeTimeoutRef.current = setTimeout(() => {
          updateTabSlider(true);
        }, 150);
      }
      
      // Handle mobile/desktop transition
      if (wasMobile !== nowMobile && sliderRef.current) {
        sliderRef.current.style.transition = 'none';
        requestAnimationFrame(() => {
          updateTabSlider(true);
          if (sliderRef.current) {
            sliderRef.current.style.transition = '';
          }
        });
      }
    };

    // Listen to multiple events for comprehensive coverage
    window.addEventListener('resize', handleViewportChange);
    window.addEventListener('orientationchange', handleViewportChange);
    
    // MOBILE: Additional touch-specific events
    if (isMobile) {
      window.addEventListener('touchstart', handleViewportChange);
      document.addEventListener('visibilitychange', handleViewportChange);
    }
    
    return () => {
      window.removeEventListener('resize', handleViewportChange);
      window.removeEventListener('orientationchange', handleViewportChange);
      if (isMobile) {
        window.removeEventListener('touchstart', handleViewportChange);
        document.removeEventListener('visibilitychange', handleViewportChange);
      }
      
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }
    };
  }, [isMobile, detectMobile, updateTabSlider]);

  // Update slider when active tab changes
  useEffect(() => {
    if (isSliderInitialized && activeTab !== lastActiveTab) {
      updateTabSlider();
    }
  }, [activeTab, isSliderInitialized, lastActiveTab, updateTabSlider]);

  // MOBILE: Font loading and document ready handling
  useEffect(() => {
    const handleDocumentReady = () => {
      if (isSliderInitialized) {
        setTimeout(() => updateTabSlider(true), 100);
      }
    };

    // Handle font loading
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(handleDocumentReady);
    }

    // Handle full document load
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', handleDocumentReady);
      return () => document.removeEventListener('DOMContentLoaded', handleDocumentReady);
    } else {
      handleDocumentReady();
    }
  }, [isSliderInitialized, updateTabSlider]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      [initTimeoutRef, resizeTimeoutRef, transitionTimeoutRef].forEach(ref => {
        if (ref.current) {
          clearTimeout(ref.current);
        }
      });
    };
  }, []);

  // Calculate basic user info for display
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
      notifications
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

      {/* BULLETPROOF: Mobile-First Tab Navigation with Ultra-Robust Sliding Animation */}
      <div 
        className="profile-tabs" 
        ref={tabsRef}
        style={{
          // MOBILE: Ensure proper rendering context
          transform: isMobile ? 'translateZ(0)' : undefined,
          willChange: isMobile ? 'transform' : 'auto'
        }}
      >
        {/* ENHANCED: Bulletproof sliding indicator with mobile optimizations */}
        <div 
          className="profile-tab-slider" 
          ref={sliderRef}
          style={{ 
            opacity: isSliderInitialized ? 1 : 0,
            visibility: isSliderInitialized ? 'visible' : 'hidden',
            transform: 'translateX(0px)',
            width: '0px',
            // MOBILE: GPU acceleration and smooth rendering
            willChange: isMobile ? 'transform, width' : 'auto',
            backfaceVisibility: isMobile ? 'hidden' : 'visible',
            WebkitBackfaceVisibility: isMobile ? 'hidden' : 'visible',
            perspective: isMobile ? '1000px' : 'none',
            WebkitPerspective: isMobile ? '1000px' : 'none'
          }}
        />
        
        {tabs.map(tab => (
          <button 
            key={tab.id}
            className={`profile-tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => handleTabChange(tab.id)}
            onTouchStart={() => {
              // MOBILE: Prevent touch delay and ensure responsiveness
              if (isMobile) {
                handleTabChange(tab.id);
              }
            }}
            data-tab={tab.id}
            style={{
              // MOBILE: Ensure proper touch targets
              minHeight: isMobile ? '44px' : undefined,
              touchAction: isMobile ? 'manipulation' : 'auto'
            }}
          >
            <tab.icon />
            <span>{tab.label}</span>
          </button>
        ))}
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

        {/* Settings Tab - UPDATED: Coming Soon banner for language settings */}
        {activeTab === 'settings' && (
          <div className="settings-section">
            <h3>App Settings</h3>
            
            <div className="settings-groups">
              <div className="settings-group">
                <h4>Language & Localization</h4>
                
                {/* NEW: Coming Soon Banner */}
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