// components/Shared/DatePicker.js - UPDATED: Yellow info icon, fixed mobile, consistent hover effects
import React, { useState, useEffect, useRef } from 'react';
import { format } from 'date-fns';
import { FaCheckCircle, FaTimes, FaInfoCircle } from 'react-icons/fa';
import './DatePicker.css';

const DatePicker = ({ currentDate, onSubmit, onCancel, hasExistingDate = false }) => {
  // Initialize with current date values
  const [month, setMonth] = useState(currentDate.getMonth() + 1);
  const [day, setDay] = useState(currentDate.getDate());
  const [year, setYear] = useState(currentDate.getFullYear());
  
  // Refs for auto-advancing cursor
  const monthRef = useRef(null);
  const dayRef = useRef(null);
  const yearRef = useRef(null);

  // Focus month input on mount
  useEffect(() => {
    if (monthRef.current) {
      monthRef.current.focus();
    }
  }, []);

  // COPIED FROM IFRAME: Month input handler with exact same logic
  const handleMonthChange = (e) => {
    let value = e.target.value;
    value = value.replace(/[^0-9]/g, '');
    
    if (value.length > 2) {
      value = value.slice(0, 2);
    }
    
    if (value.length === 1 && parseInt(value) > 1) {
      value = '0' + value;
    }
    
    if (parseInt(value) > 12) {
      value = '12';
    }
    
    setMonth(value === '' ? '' : parseInt(value));
    
    // Auto-advance to day input
    if (value.length === 2 && parseInt(value) >= 1 && parseInt(value) <= 12) {
      dayRef.current?.focus();
    }
  };

  // COPIED FROM IFRAME: Day input handler with exact same logic
  const handleDayChange = (e) => {
    let value = e.target.value;
    value = value.replace(/[^0-9]/g, '');
    
    if (value.length > 2) {
      value = value.slice(0, 2);
    }
    
    if (value.length === 1 && parseInt(value) > 3) {
      value = '0' + value;
    }
    
    if (parseInt(value) > 31) {
      value = '31';
    }
    
    setDay(value === '' ? '' : parseInt(value));
    
    // Auto-advance to year input
    if (value.length === 2 && parseInt(value) >= 1 && parseInt(value) <= 31) {
      yearRef.current?.focus();
    }
  };

  // COPIED FROM IFRAME: Year input handler with exact same logic
  const handleYearChange = (e) => {
    let value = e.target.value;
    value = value.replace(/[^0-9]/g, '');
    
    if (value.length > 4) {
      value = value.slice(0, 4);
    }
    
    setYear(value === '' ? '' : parseInt(value));
  };

  // COPIED FROM IFRAME: Exact same validation logic
  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Basic validation - exactly like iframe
    if (isNaN(month) || isNaN(day) || isNaN(year) ||
        month < 1 || month > 12 || 
        day < 1 || day > 31 || 
        year < 1900 || year > 2100) {
      alert('Please enter a valid date');
      return;
    }
    
    // Create date object (JS months are 0-based) - exactly like iframe
    const newDate = new Date(year, month - 1, day);
    
    // Validate date - exactly like iframe
    if (isNaN(newDate.getTime()) || 
        newDate.getFullYear() !== year || 
        newDate.getMonth() !== month - 1 || 
        newDate.getDate() !== day) {
      alert('Please enter a valid date (e.g., February 30th does not exist)');
      return;
    }
    
    // Check if date is in the future - exactly like iframe
    const currentDateCheck = new Date();
    currentDateCheck.setHours(0, 0, 0, 0);
    
    if (newDate > currentDateCheck) {
      alert('Start date cannot be in the future');
      return;
    }
    
    // Call the parent submit handler with the validated date
    onSubmit(newDate);
  };

  const handleCancel = () => {
    if (hasExistingDate) {
      onCancel();
    } else {
      // Use today's date - exactly like iframe
      const today = new Date();
      setMonth(today.getMonth() + 1);
      setDay(today.getDate());
      setYear(today.getFullYear());
      // Auto-submit after setting today's date
      setTimeout(() => {
        onSubmit(today);
      }, 0);
    }
  };

  // Helper function to format display values
  const getDisplayValue = (value) => {
    return value === '' || isNaN(value) ? '' : value.toString();
  };

  return (
    <div className="date-picker-container">
      <div className="current-date-display">
        <div className="current-date-label">Currently Set:</div>
        <div className="current-date-value">{format(currentDate, 'MMMM d, yyyy')}</div>
      </div>
      
      <form onSubmit={handleSubmit} className="date-picker-form">
        <div className="date-inputs-row">
          <div className="input-group">
            <label htmlFor="month-input">Month</label>
            <input
              ref={monthRef}
              type="text"
              id="month-input"
              className="month-input"
              placeholder="MM"
              maxLength="2"
              value={getDisplayValue(month)}
              onChange={handleMonthChange}
            />
          </div>
          
          <div className="date-separator">/</div>
          
          <div className="input-group">
            <label htmlFor="day-input">Day</label>
            <input
              ref={dayRef}
              type="text"
              id="day-input"
              className="day-input"
              placeholder="DD"
              maxLength="2"
              value={getDisplayValue(day)}
              onChange={handleDayChange}
            />
          </div>
          
          <div className="date-separator">/</div>
          
          <div className="input-group">
            <label htmlFor="year-input">Year</label>
            <input
              ref={yearRef}
              type="text"
              id="year-input"
              className="year-input"
              placeholder="YYYY"
              maxLength="4"
              value={getDisplayValue(year)}
              onChange={handleYearChange}
            />
          </div>
        </div>
        
        <div className="helper-text">
          <FaInfoCircle className="helper-icon" />
          Enter MM/DD/YYYY format - cursor will automatically advance between fields
        </div>
        
        <div className="date-picker-actions">
          <button type="submit" className="primary-action">
            <FaCheckCircle />
            Set Date
          </button>
          <button type="button" onClick={handleCancel} className="cancel-action">
            <FaTimes />
            {hasExistingDate ? "Cancel" : "Use Today"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default DatePicker;