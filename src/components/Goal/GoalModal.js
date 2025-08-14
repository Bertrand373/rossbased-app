// src/components/Goal/GoalModal.js - UPDATED: Simplified Goal Modal inheriting Stats modal styling
import React, { useState } from 'react';
import { format, addDays } from 'date-fns';
import { FaTimes, FaBullseye } from 'react-icons/fa';
import './GoalModal.css';

const GoalModal = ({ 
  isOpen, 
  onClose, 
  userData, 
  setGoal, 
  cancelGoal 
}) => {
  const [selectedGoal, setSelectedGoal] = useState('');
  const [showConfirmCancel, setShowConfirmCancel] = useState(false);

  // Goal options with days and descriptions
  const goalOptions = [
    { days: 30, label: '30 Days', description: 'Build a solid foundation' },
    { days: 60, label: '60 Days', description: 'Establish strong habits' },
    { days: 90, label: '90 Days', description: 'Transform your mindset' },
    { days: 180, label: '180 Days', description: 'Achieve significant benefits' },
    { days: 365, label: '365 Days', description: 'Master self-discipline' }
  ];

  if (!isOpen) return null;

  const currentGoal = userData.goal;
  const hasActiveGoal = currentGoal && currentGoal.isActive;

  // Calculate target date preview for selected goal
  const getTargetDatePreview = (days) => {
    if (!userData.startDate || !days) return null;
    const targetDate = addDays(new Date(userData.startDate), days - 1);
    return format(targetDate, 'MMMM d, yyyy');
  };

  // Handle goal selection
  const handleSetGoal = () => {
    if (!selectedGoal) {
      return;
    }
    
    setGoal(parseInt(selectedGoal));
    setSelectedGoal('');
    onClose();
  };

  // Handle goal cancellation
  const handleCancelGoal = () => {
    cancelGoal();
    setShowConfirmCancel(false);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content goal-modal" onClick={e => e.stopPropagation()}>
        {/* X button in upper right - matching stats modal styling */}
        <button 
          className="modal-close-x" 
          onClick={onClose}
          aria-label="Close"
        >
          <FaTimes />
        </button>

        {/* Show current goal status if one exists */}
        {hasActiveGoal && !showConfirmCancel && (
          <div className="current-goal-display">
            <div className="goal-current-header">
              <FaBullseye className="goal-icon" />
              <h3>Current Goal: {currentGoal.targetDays} Days</h3>
            </div>
            
            <div className="goal-current-progress">
              <div className="goal-progress-stats">
                {userData.currentStreak || 0} / {currentGoal.targetDays} days completed
              </div>
              {currentGoal.targetDate && (
                <div className="goal-target-info">
                  Target: {format(currentGoal.targetDate, 'MMM d, yyyy')}
                </div>
              )}
              {currentGoal.achieved && (
                <div className="goal-achieved-info">
                  ✓ Goal achieved on {currentGoal.achievementDate ? format(currentGoal.achievementDate, 'MMM d, yyyy') : 'Unknown'}
                </div>
              )}
            </div>

            <div className="goal-current-actions">
              <button 
                className="btn-outline"
                onClick={() => setShowConfirmCancel(true)}
              >
                Remove Goal
              </button>
            </div>
          </div>
        )}

        {/* Confirm cancel section */}
        {showConfirmCancel && (
          <div className="goal-confirm-cancel">
            <h3>Remove Goal?</h3>
            <p>Are you sure you want to remove your current {currentGoal.targetDays}-day goal?</p>
            
            <div className="modal-actions">
              <button 
                className="btn-outline btn-danger"
                onClick={handleCancelGoal}
              >
                Yes, Remove Goal
              </button>
              <button 
                className="btn-outline"
                onClick={() => setShowConfirmCancel(false)}
              >
                Keep Goal
              </button>
            </div>
          </div>
        )}

        {/* Goal selection (show if no goal, or after clicking remove) */}
        {(!hasActiveGoal || showConfirmCancel === false) && !showConfirmCancel && (
          <div className="goal-selection">
            <div className="goal-selection-header">
              <FaBullseye className="goal-icon" />
              <h3>{hasActiveGoal ? 'Change Goal' : 'Set Your Goal'}</h3>
              <p>Choose your target streak length:</p>
            </div>

            <div className="goal-options">
              {goalOptions.map((option) => (
                <div
                  key={option.days}
                  className={`goal-option ${selectedGoal === option.days.toString() ? 'selected' : ''}`}
                  onClick={() => setSelectedGoal(option.days.toString())}
                >
                  <div className="goal-option-main">
                    <span className="goal-option-days">{option.label}</span>
                    <span className="goal-option-description">{option.description}</span>
                  </div>
                  {userData.startDate && (
                    <div className="goal-option-preview">
                      Target: {getTargetDatePreview(option.days)}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="modal-actions">
              <button 
                className="btn-outline btn-primary"
                onClick={handleSetGoal}
                disabled={!selectedGoal}
              >
                {hasActiveGoal ? 'Change Goal' : 'Set Goal'}
              </button>
              <button 
                className="btn-outline" 
                onClick={onClose}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Info section for users without start date */}
        {!userData.startDate && !showConfirmCancel && (
          <div className="goal-info-notice">
            <FaBullseye className="goal-info-icon" />
            <p>Set your start date first to enable goal tracking</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default GoalModal;