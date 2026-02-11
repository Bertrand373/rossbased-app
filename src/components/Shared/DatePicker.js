// DatePicker.js - TITANTRACK MINIMAL
import React, { useState, useRef, useEffect } from 'react';
import './DatePicker.css';

const DatePicker = ({ onSubmit, onCancel, initialDate, title }) => {
  const [month, setMonth] = useState(initialDate ? initialDate.getMonth() + 1 : '');
  const [day, setDay] = useState(initialDate ? initialDate.getDate() : '');
  const [year, setYear] = useState(initialDate ? initialDate.getFullYear() : '');
  
  const monthRef = useRef(null);
  const dayRef = useRef(null);
  const yearRef = useRef(null);

  // Determine if this is an edit vs initial setup
  const isEditing = title?.toLowerCase().includes('edit');

  useEffect(() => {
    monthRef.current?.focus();
  }, []);

  const handleMonthChange = (e) => {
    let value = e.target.value.replace(/[^0-9]/g, '').slice(0, 2);
    
    if (value.length === 1 && parseInt(value) > 1) {
      value = '0' + value;
    }
    if (parseInt(value) > 12) value = '12';
    
    setMonth(value === '' ? '' : parseInt(value));
    
    if (value.length === 2 && parseInt(value) >= 1 && parseInt(value) <= 12) {
      dayRef.current?.focus();
    }
  };

  const handleDayChange = (e) => {
    let value = e.target.value.replace(/[^0-9]/g, '').slice(0, 2);
    
    if (value.length === 1 && parseInt(value) > 3) {
      value = '0' + value;
    }
    if (parseInt(value) > 31) value = '31';
    
    setDay(value === '' ? '' : parseInt(value));
    
    if (value.length === 2 && parseInt(value) >= 1 && parseInt(value) <= 31) {
      yearRef.current?.focus();
    }
  };

  const handleYearChange = (e) => {
    let value = e.target.value.replace(/[^0-9]/g, '').slice(0, 4);
    setYear(value === '' ? '' : parseInt(value));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (isNaN(month) || isNaN(day) || isNaN(year) ||
        month < 1 || month > 12 || 
        day < 1 || day > 31 || 
        year < 1900 || year > 2100) {
      return;
    }
    
    const newDate = new Date(year, month - 1, day);
    
    if (isNaN(newDate.getTime()) || 
        newDate.getFullYear() !== year || 
        newDate.getMonth() !== month - 1 || 
        newDate.getDate() !== day) {
      return;
    }
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (newDate > today) {
      return;
    }
    
    onSubmit(newDate);
  };

  const handleUseToday = () => {
    const today = new Date();
    onSubmit(today);
  };

  const getDisplayValue = (value) => {
    return value === '' || isNaN(value) ? '' : value.toString();
  };

  return (
    <div className="date-picker" onClick={e => e.stopPropagation()}>
      <h2>{title || "When did you start?"}</h2>
      <p>{isEditing ? "Your journey is yours. Be honest with yourself." : "Enter your streak start date"}</p>
      
      <form onSubmit={handleSubmit} className="date-form">
        <div className="date-inputs">
          <div className="date-field">
            <input
              ref={monthRef}
              type="text"
              inputMode="numeric"
              placeholder="MM"
              maxLength="2"
              value={getDisplayValue(month)}
              onChange={handleMonthChange}
            />
            <span className="date-label">Month</span>
          </div>
          
          <span className="date-separator">/</span>
          
          <div className="date-field">
            <input
              ref={dayRef}
              type="text"
              inputMode="numeric"
              placeholder="DD"
              maxLength="2"
              value={getDisplayValue(day)}
              onChange={handleDayChange}
            />
            <span className="date-label">Day</span>
          </div>
          
          <span className="date-separator">/</span>
          
          <div className="date-field">
            <input
              ref={yearRef}
              type="text"
              inputMode="numeric"
              placeholder="YYYY"
              maxLength="4"
              value={getDisplayValue(year)}
              onChange={handleYearChange}
            />
            <span className="date-label">Year</span>
          </div>
        </div>
        
        <div className="date-actions">
          <button type="submit" className="btn-primary">
            Set date
          </button>
          <button type="button" className="btn-ghost" onClick={onCancel || handleUseToday}>
            {onCancel ? 'Cancel' : 'Use today'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default DatePicker;