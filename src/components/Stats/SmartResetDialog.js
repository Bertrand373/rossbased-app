// components/Stats/SmartResetDialog.js - Smart Reset Dialog Component
import React, { useState } from 'react';
import { FaRedo, FaExclamationTriangle, FaCheck, FaTimes, FaInfoCircle } from 'react-icons/fa';
import './SmartResetDialog.css';

const SmartResetDialog = ({ isOpen, onClose, onConfirm, userData }) => {
  const [selectedOptions, setSelectedOptions] = useState({
    currentStreak: false,
    allProgress: false,
    everything: false
  });

  const [showConfirmation, setShowConfirmation] = useState(false);

  // Handle checkbox changes with mutual exclusivity
  const handleOptionChange = (option) => {
    setSelectedOptions({
      currentStreak: option === 'currentStreak',
      allProgress: option === 'allProgress', 
      everything: option === 'everything'
    });
  };

  // Get selected reset level
  const getSelectedResetLevel = () => {
    if (selectedOptions.currentStreak) return 'currentStreak';
    if (selectedOptions.allProgress) return 'allProgress';
    if (selectedOptions.everything) return 'everything';
    return null;
  };

  // Handle proceed to confirmation
  const handleProceed = () => {
    const resetLevel = getSelectedResetLevel();
    if (!resetLevel) return;
    
    setShowConfirmation(true);
  };

  // Handle final confirmation
  const handleFinalConfirm = () => {
    const resetLevel = getSelectedResetLevel();
    onConfirm(resetLevel);
    handleClose();
  };

  // Handle close and reset state
  const handleClose = () => {
    setSelectedOptions({
      currentStreak: false,
      allProgress: false,
      everything: false
    });
    setShowConfirmation(false);
    onClose();
  };

  // Get confirmation details based on selected option
  const getConfirmationDetails = () => {
    const resetLevel = getSelectedResetLevel();
    
    switch (resetLevel) {
      case 'currentStreak':
        return {
          title: 'Reset Current Streak Only',
          warning: 'This will reset your current streak to 0 and start a new streak from today.',
          preserves: [
            'All streak history and achievements',
            'Longest streak record',
            'Total relapse and wet dream counts', 
            'All benefit tracking data',
            'All journal entries',
            'All badges earned'
          ],
          deletes: [
            'Current streak count (back to 0)',
            'Current streak start date (reset to today)'
          ]
        };
      case 'allProgress':
        return {
          title: 'Reset All Progress',
          warning: 'This will clear most of your data while preserving your longest streak achievement.',
          preserves: [
            'Longest streak record (as personal best)',
            'App preferences and settings'
          ],
          deletes: [
            'Current streak (reset to 0)',
            'All streak history',
            'Total relapse and wet dream counts',
            'All benefit tracking data', 
            'All journal entries',
            'All badges (except longest streak milestone)'
          ]
        };
      case 'everything':
        return {
          title: 'Complete Reset (Nuclear Option)',
          warning: 'This will permanently delete ALL data and return the app to its initial state.',
          preserves: [
            'App preferences and settings'
          ],
          deletes: [
            'Current streak',
            'Longest streak record',
            'All streak history',
            'Total relapse and wet dream counts',
            'All benefit tracking data',
            'All journal entries', 
            'All badges and achievements',
            'Everything - complete fresh start'
          ]
        };
      default:
        return null;
    }
  };

  if (!isOpen) return null;

  const resetLevel = getSelectedResetLevel();
  const confirmationDetails = getConfirmationDetails();

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content smart-reset-modal" onClick={e => e.stopPropagation()}>
        {!showConfirmation ? (
          // Step 1: Option Selection
          <>
            <div className="smart-reset-header">
              <div className="reset-icon-container">
                <FaRedo className="reset-main-icon" />
              </div>
              <h3>Reset Progress</h3>
              <p>Choose what you'd like to reset. Each option is designed for different situations.</p>
            </div>

            <div className="reset-options">
              {/* Option 1: Current Streak Only */}
              <div 
                className={`reset-option ${selectedOptions.currentStreak ? 'selected' : ''}`}
                onClick={() => handleOptionChange('currentStreak')}
              >
                <div className="option-checkbox">
                  {selectedOptions.currentStreak && <FaCheck className="check-icon" />}
                </div>
                <div className="option-content">
                  <div className="option-header">
                    <h4>Current Streak Only</h4>
                    <span className="option-badge gentle">Gentle Reset</span>
                  </div>
                  <p>Reset your current streak to 0 and start fresh from today. Perfect for starting a new cycle without losing your history.</p>
                  <div className="option-preserves">
                    <FaInfoCircle className="preserve-icon" />
                    <span>Keeps all history, achievements, and longest streak record</span>
                  </div>
                </div>
              </div>

              {/* Option 2: All Progress */}
              <div 
                className={`reset-option ${selectedOptions.allProgress ? 'selected' : ''}`}
                onClick={() => handleOptionChange('allProgress')}
              >
                <div className="option-checkbox">
                  {selectedOptions.allProgress && <FaCheck className="check-icon" />}
                </div>
                <div className="option-content">
                  <div className="option-header">
                    <h4>All Progress</h4>
                    <span className="option-badge moderate">Moderate Reset</span>
                  </div>
                  <p>Clear most data for a fresh start while preserving your longest streak as a personal record.</p>
                  <div className="option-preserves">
                    <FaInfoCircle className="preserve-icon" />
                    <span>Keeps longest streak record ({userData.longestStreak || 0} days)</span>
                  </div>
                </div>
              </div>

              {/* Option 3: Everything */}
              <div 
                className={`reset-option ${selectedOptions.everything ? 'selected' : ''}`}
                onClick={() => handleOptionChange('everything')}
              >
                <div className="option-checkbox">
                  {selectedOptions.everything && <FaCheck className="check-icon" />}
                </div>
                <div className="option-content">
                  <div className="option-header">
                    <h4>Everything</h4>
                    <span className="option-badge nuclear">Nuclear Reset</span>
                  </div>
                  <p>Complete factory reset - deletes ALL data and achievements. Only use if you want to start completely over.</p>
                  <div className="option-warning">
                    <FaExclamationTriangle className="warning-icon" />
                    <span>This cannot be undone - all data will be permanently lost</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="smart-reset-actions">
              <button 
                className="btn-proceed"
                onClick={handleProceed}
                disabled={!resetLevel}
              >
                <FaRedo />
                Continue
              </button>
              <button className="btn-cancel" onClick={handleClose}>
                <FaTimes />
                Cancel
              </button>
            </div>
          </>
        ) : (
          // Step 2: Confirmation
          <>
            <div className="confirmation-header">
              <div className="warning-icon-container">
                <FaExclamationTriangle className="warning-main-icon" />
              </div>
              <h3>{confirmationDetails.title}</h3>
              <p className="confirmation-warning">{confirmationDetails.warning}</p>
            </div>

            <div className="confirmation-details">
              <div className="detail-section preserves">
                <h4>
                  <FaCheck className="section-icon preserve" />
                  What Will Be Preserved
                </h4>
                <ul>
                  {confirmationDetails.preserves.map((item, index) => (
                    <li key={index}>
                      <FaCheck className="list-check preserve" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="detail-section deletes">
                <h4>
                  <FaTimes className="section-icon delete" />
                  What Will Be Deleted
                </h4>
                <ul>
                  {confirmationDetails.deletes.map((item, index) => (
                    <li key={index}>
                      <FaTimes className="list-check delete" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="final-warning">
              <FaExclamationTriangle className="final-warning-icon" />
              <span>This action cannot be undone. Are you sure you want to proceed?</span>
            </div>

            <div className="confirmation-actions">
              <button className="btn-confirm-reset" onClick={handleFinalConfirm}>
                <FaRedo />
                Yes, Reset {getSelectedResetLevel() === 'everything' ? 'Everything' : 'Progress'}
              </button>
              <button className="btn-back" onClick={() => setShowConfirmation(false)}>
                <FaTimes />
                Go Back
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default SmartResetDialog;