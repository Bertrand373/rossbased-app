// src/components/Goal/GoalModal.js - Goal Management Modal Component
import React, { useState } from 'react';
import { format, addDays } from 'date-fns';
import { FaTimes, FaBullseye, FaCheckCircle, FaEdit, FaTrash } from 'react-icons/fa'; // FIXED: Changed FaTarget to FaBullseye
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

  // Handle change goal
  const handleChangeGoal = () => {
    setShowConfirmCancel(false);
    // Don't close modal, let user select new goal
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content goal-modal" onClick={e => e.stopPropagation()}>
        <button className="modal-close-btn" onClick={onClose}>
          <FaTimes />
        </button>

        <div className="goal-modal-header">
          <FaBullseye className="goal-modal-icon" /> {/* FIXED: Changed from FaTarget */}
          <h2>Streak Goals</h2>
        </div>

        {/* Show current goal status if one exists */}
        {hasActiveGoal && (
          <div className="current-goal-section">
            <h3>Current Goal</h3>
            <div className={`current-goal-card ${currentGoal.achieved ? 'achieved' : 'active'}`}>
              <div className="current-goal-info">
                <div className="current-goal-target">
                  <span className="goal-days">{currentGoal.targetDays}</span>
                  <span className="goal-days-label">days</span>
                </div>
                <div className="current-goal-details">
                  <div className="goal-progress">
                    {userData.currentStreak} / {currentGoal.targetDays} days
                  </div>
                  <div className="goal-target-date">
                    Target: {currentGoal.targetDate ? format(currentGoal.targetDate, 'MMM d, yyyy') : 'Calculating...'}
                  </div>
                  {currentGoal.achieved && (
                    <div className="goal-achievement">
                      <FaCheckCircle className="achievement-icon" />
                      <span>Achieved on {currentGoal.achievementDate ? format(currentGoal.achievementDate, 'MMM d, yyyy') : 'Unknown'}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="current-goal-actions">
              <button 
                className="goal-action-btn change-goal-btn"
                onClick={handleChangeGoal}
              >
                <FaEdit />
                <span>Change Goal</span>
              </button>
              <button 
                className="goal-action-btn cancel-goal-btn"
                onClick={() => setShowConfirmCancel(true)}
              >
                <FaTrash />
                <span>Cancel Goal</span>
              </button>
            </div>
          </div>
        )}

        {/* Goal selection (always show if no goal, or show after clicking change) */}
        {(!hasActiveGoal || showConfirmCancel === false) && (
          <div className="goal-selection-section">
            <h3>{hasActiveGoal ? 'Choose New Goal' : 'Set Your Goal'}</h3>
            <p>Choose your target streak length:</p>

            <div className="goal-options">
              {goalOptions.map((option) => (
                <div
                  key={option.days}
                  className={`goal-option ${selectedGoal === option.days.toString() ? 'selected' : ''}`}
                  onClick={() => setSelectedGoal(option.days.toString())}
                >
                  <div className="goal-option-content">
                    <div className="goal-option-header">
                      <span className="goal-option-days">{option.label}</span>
                      <span className="goal-option-description">{option.description}</span>
                    </div>
                    {userData.startDate && (
                      <div className="goal-option-preview">
                        Target date: {getTargetDatePreview(option.days)}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="goal-modal-actions">
              <button 
                className="btn-primary set-goal-btn"
                onClick={handleSetGoal}
                disabled={!selectedGoal}
              >
                <FaBullseye />
                <span>{hasActiveGoal ? 'Change Goal' : 'Set Goal'}</span>
              </button>
              <button className="btn-outline" onClick={onClose}>
                <FaTimes />
                <span>Cancel</span>
              </button>
            </div>
          </div>
        )}

        {/* Confirm cancel modal */}
        {showConfirmCancel && (
          <div className="confirm-cancel-section">
            <h3>Cancel Goal?</h3>
            <p>Are you sure you want to cancel your current {currentGoal.targetDays}-day goal?</p>
            
            <div className="confirm-cancel-actions">
              <button 
                className="btn-danger confirm-cancel-btn"
                onClick={handleCancelGoal}
              >
                <FaTrash />
                <span>Yes, Cancel Goal</span>
              </button>
              <button 
                className="btn-outline"
                onClick={() => setShowConfirmCancel(false)}
              >
                <FaTimes />
                <span>Keep Goal</span>
              </button>
            </div>
          </div>
        )}

        {/* Info section for users without start date */}
        {!userData.startDate && (
          <div className="goal-info-section">
            <div className="goal-info-notice">
              <FaBullseye className="info-icon" />
              <p>Set your start date first to enable goal tracking</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GoalModal;