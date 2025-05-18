import React, { useState, useEffect } from 'react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameMonth, isSameDay, subMonths, addMonths, parseISO, differenceInDays } from 'date-fns';
import './Calendar.css';

const Calendar = ({ userData, isPremium, updateUserData }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [status, setStatus] = useState('');

  const startMonth = startOfMonth(currentMonth);
  const endMonth = endOfMonth(currentMonth);
  const startDate = startOfWeek(startMonth);
  const endDate = endOfWeek(endMonth);

  const days = [];
  let day = startDate;
  while (day <= endDate) {
    days.push(day);
    day = addDays(day, 1);
  }

  const handleStatusChange = async (date, newStatus) => {
    if (!updateUserData) {
      console.error('updateUserData is not defined');
      return;
    }

    const updatedStreakHistory = [...userData.streakHistory];
    const updatedWetDreamDates = [...userData.wetDreamDates];
    let updatedWetDreamCount = userData.wetDreamCount;
    let updatedRelapseCount = userData.relapseCount;
    let currentStreak = userData.currentStreak;

    if (newStatus === 'Relapse') {
      updatedRelapseCount += 1;
      currentStreak = 0;
      updatedStreakHistory.push({
        id: updatedStreakHistory.length + 1,
        start: userData.startDate,
        end: date,
        days: differenceInDays(date, userData.startDate),
        reason: 'relapse'
      });
    } else if (newStatus === 'Wet Dream') {
      updatedWetDreamDates.push(format(date, 'yyyy-MM-dd'));
      updatedWetDreamCount += 1;
    } else if (newStatus === 'Success') {
      currentStreak += 1;
    }

    try {
      await updateUserData({
        streakHistory: updatedStreakHistory,
        wetDreamDates: updatedWetDreamDates,
        wetDreamCount: updatedWetDreamCount,
        relapseCount: updatedRelapseCount,
        currentStreak
      });
      setStatus(newStatus);
      setShowModal(false);
    } catch (err) {
      console.error('Error updating user data:', err);
    }
  };

  const getDayStatus = (date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    if (userData.wetDreamDates.includes(dateStr)) return 'Wet Dream';
    const relapse = userData.streakHistory.find(streak => streak.reason === 'relapse' && isSameDay(parseISO(streak.end), date));
    if (relapse) return 'Relapse';
    return 'Success';
  };

  const getDayBenefits = (date) => {
    return userData.benefitTracking.find(item => isSameDay(parseISO(item.date), date));
  };

  const onDateClick = (day) => {
    setSelectedDate(day);
    setStatus(getDayStatus(day));
    setShowModal(true);
  };

  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));

  return (
    <div className="calendar-container">
      <header className="calendar-header">
        <button onClick={prevMonth}>&lt;</button>
        <h2>{format(currentMonth, 'MMMM yyyy')}</h2>
        <button onClick={nextMonth}>&gt;</button>
      </header>
      <div className="calendar-grid">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="calendar-day-header">{day}</div>
        ))}
        {days.map(day => {
          const status = getDayStatus(day);
          const benefits = getDayBenefits(day);
          return (
            <div
              key={day}
              className={`calendar-day ${!isSameMonth(day, startMonth) ? 'disabled' : ''} ${isSameDay(day, new Date()) ? 'today' : ''}`}
              onClick={() => isSameMonth(day, startMonth) && onDateClick(day)}
            >
              <span>{format(day, 'd')}</span>
              {benefits && <div className="benefit-dot" />}
              {status === 'Relapse' && <div className="relapse-marker" />}
              {status === 'Wet Dream' && <div className="wet-dream-marker" />}
            </div>
          );
        })}
      </div>
      {showModal && (
        <div className="modal">
          <div className="modal-content">
            <h3>{format(selectedDate, 'MMMM d, yyyy')}</h3>
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="Success">Success</option>
              <option value="Relapse">Relapse</option>
              <option value="Wet Dream">Wet Dream</option>
            </select>
            <button onClick={() => handleStatusChange(selectedDate, status)}>Save</button>
            <button onClick={() => setShowModal(false)}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Calendar;

