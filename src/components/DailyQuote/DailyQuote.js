// src/components/DailyQuote/DailyQuote.js
// TitanTrack Daily Wisdom - Minimal aesthetic matching Tracker
import React from 'react';
import { getTodayQuote } from '../../data/dailyQuotes';
import './DailyQuote.css';

const DailyQuote = () => {
  const quote = getTodayQuote();
  
  return (
    <div className="daily-quote">
      <p className="quote-text">"{quote.text}"</p>
      <p className="quote-author">— {quote.author}</p>
    </div>
  );
};

export default DailyQuote;