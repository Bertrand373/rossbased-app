// TitanTrack Prototype - Premium Redesign
// Standalone prototype showcasing new design language
import React, { useState, useMemo } from 'react';
import AIChat from '../AIChat/AIChat';
import './TitanTrackPrototype.css';

// ============================================
// MOCK DATA
// ============================================
const mockUser = {
  username: 'warrior_47',
  initials: 'W4',
  streakDays: 47,
  longestStreak: 89,
  leaderboardRank: 24,
};

const mockOracleObservation = "Your energy has shifted noticeably this week. The mental clarity you're experiencing is typical of day 47 — stay vigilant during evening hours.";

const mockLeaderboard = [
  { rank: 1, username: 'titan_master', initials: 'TM', streak: 312 },
  { rank: 2, username: 'discipline_king', initials: 'DK', streak: 245 },
  { rank: 3, username: 'stoic_soul', initials: 'SS', streak: 198 },
  { rank: 4, username: 'iron_will', initials: 'IW', streak: 156 },
  { rank: 5, username: 'phoenix_rise', initials: 'PR', streak: 134 },
  { rank: 6, username: 'mindful_monk', initials: 'MM', streak: 121 },
  { rank: 7, username: 'clarity_seeker', initials: 'CS', streak: 108 },
  { rank: 8, username: 'strength_forge', initials: 'SF', streak: 95 },
  { rank: 9, username: 'willpower_max', initials: 'WM', streak: 88 },
  { rank: 10, username: 'focus_master', initials: 'FM', streak: 82 },
  { rank: 11, username: 'resolve_strong', initials: 'RS', streak: 76 },
  { rank: 12, username: 'path_walker', initials: 'PW', streak: 71 },
  { rank: 13, username: 'inner_peace', initials: 'IP', streak: 65 },
  { rank: 14, username: 'spirit_guide', initials: 'SG', streak: 58 },
  { rank: 15, username: 'mind_fortress', initials: 'MF', streak: 52 },
  { rank: 16, username: 'soul_warrior', initials: 'SW', streak: 49 },
  { rank: 24, username: 'warrior_47', initials: 'W4', streak: 47, isCurrentUser: true },
  { rank: 25, username: 'new_path', initials: 'NP', streak: 45 },
  { rank: 26, username: 'rising_star', initials: 'RS', streak: 42 },
];

const mockJournalEntries = [
  { date: '2024-01-15', preview: 'Woke up with incredible energy. Morning meditation felt deeper than usual. The clarity is becoming more consistent.' },
  { date: '2024-01-14', preview: 'Challenging day. Had to use breathing techniques multiple times. Grateful for the tools I have now.' },
  { date: '2024-01-13', preview: 'Day 45 complete. Noticed improved focus at work. Colleagues have mentioned I seem more present.' },
];

// Generate streak history (last 47 days)
const generateStreakHistory = (days) => {
  const history = [];
  const today = new Date();
  for (let i = 0; i < days; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    history.push(date.toISOString().split('T')[0]);
  }
  return history;
};

const mockStreakHistory = generateStreakHistory(mockUser.streakDays);

// ============================================
// PHASE LOGIC
// ============================================
const getPhaseInfo = (days) => {
  if (days <= 14) return { 
    name: 'Initial Adaptation', 
    range: [1, 14], 
    next: 'Emotional Processing' 
  };
  if (days <= 45) return { 
    name: 'Emotional Processing', 
    range: [15, 45], 
    next: 'Mental Expansion' 
  };
  if (days <= 90) return { 
    name: 'Mental Expansion', 
    range: [46, 90], 
    next: 'Spiritual Integration' 
  };
  if (days <= 180) return { 
    name: 'Spiritual Integration', 
    range: [91, 180], 
    next: 'Mastery' 
  };
  return { 
    name: 'Mastery', 
    range: [181, Infinity], 
    next: null 
  };
};

// ============================================
// ICONS
// ============================================
const HomeIcon = () => (
  <svg className="tt-nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    <polyline points="9 22 9 12 15 12 15 22" />
  </svg>
);

const CalendarIcon = () => (
  <svg className="tt-nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);

const OracleIcon = () => (
  <svg className="tt-nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3" />
    <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
  </svg>
);

const RanksIcon = () => (
  <svg className="tt-nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2L15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2z" />
  </svg>
);

const ChevronLeftIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 18 9 12 15 6" />
  </svg>
);

const ChevronRightIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 18 15 12 9 6" />
  </svg>
);

const CrownIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5z" />
  </svg>
);

const CloseIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

// ============================================
// HOME SCREEN
// ============================================
const HomeScreen = ({ user, oracleObservation, onTalkToOracle }) => {
  const phase = getPhaseInfo(user.streakDays);
  const progressInPhase = ((user.streakDays - phase.range[0] + 1) / (phase.range[1] - phase.range[0] + 1)) * 100;
  const daysInPhase = user.streakDays - phase.range[0] + 1;
  const totalPhaseDays = phase.range[1] - phase.range[0] + 1;

  return (
    <div className="tt-home">
      {/* Streak Hero */}
      <div className="tt-streak-hero">
        <div className="tt-streak-number">{user.streakDays}</div>
        <div className="tt-streak-label">DAY STREAK</div>
      </div>

      {/* Phase Card */}
      <div className="tt-phase-card">
        <div className="tt-phase-header">
          <span className="tt-phase-name">{phase.name}</span>
          <span className="tt-phase-progress-text">Day {daysInPhase} of {totalPhaseDays}</span>
        </div>
        <div className="tt-phase-bar">
          <div 
            className="tt-phase-bar-fill" 
            style={{ width: `${Math.min(progressInPhase, 100)}%` }} 
          />
        </div>
        {phase.next && (
          <div className="tt-phase-next">
            Next: <span>{phase.next}</span>
          </div>
        )}
      </div>

      {/* Oracle Observation */}
      <div className="tt-oracle-card">
        <div className="tt-oracle-label">ORACLE OBSERVES</div>
        <p className="tt-oracle-text">{oracleObservation}</p>
      </div>

      {/* Talk to Oracle CTA */}
      <button className="tt-oracle-cta" onClick={onTalkToOracle}>
        Talk to Oracle
      </button>

      {/* Stats Row */}
      <div className="tt-stats-row">
        <div className="tt-stat-item">
          <div className="tt-stat-value">{user.streakDays}</div>
          <div className="tt-stat-label">Current</div>
        </div>
        <div className="tt-stat-item">
          <div className="tt-stat-value">{user.longestStreak}</div>
          <div className="tt-stat-label">Longest</div>
        </div>
        <div className="tt-stat-item">
          <div className="tt-stat-value">#{user.leaderboardRank}</div>
          <div className="tt-stat-label">Rank</div>
        </div>
      </div>
    </div>
  );
};

// ============================================
// CALENDAR SCREEN
// ============================================
const CalendarScreen = ({ streakHistory, journalEntries }) => {
  const [currentDate, setCurrentDate] = useState(new Date());

  const calendarData = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDayOfWeek = firstDay.getDay();
    const daysInMonth = lastDay.getDate();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const days = [];
    
    // Empty cells for days before month starts
    for (let i = 0; i < startDayOfWeek; i++) {
      days.push({ day: null, isEmpty: true });
    }

    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const dateStr = date.toISOString().split('T')[0];
      const isStreak = streakHistory.includes(dateStr);
      const isToday = date.getTime() === today.getTime();
      const isFuture = date > today;

      days.push({
        day,
        dateStr,
        isStreak,
        isToday,
        isFuture,
        isEmpty: false,
      });
    }

    return days;
  }, [currentDate, streakHistory]);

  const monthName = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const goToPrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const weekdays = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  return (
    <div className="tt-calendar">
      {/* Month Header */}
      <div className="tt-calendar-header">
        <span className="tt-calendar-month">{monthName}</span>
        <div className="tt-calendar-nav">
          <button onClick={goToPrevMonth} aria-label="Previous month">
            <ChevronLeftIcon />
          </button>
          <button onClick={goToNextMonth} aria-label="Next month">
            <ChevronRightIcon />
          </button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="tt-calendar-grid">
        {weekdays.map((day, i) => (
          <div key={i} className="tt-calendar-weekday">{day}</div>
        ))}
        {calendarData.map((item, i) => (
          <div
            key={i}
            className={`tt-calendar-day ${item.isEmpty ? 'empty' : ''} ${item.isStreak ? 'streak' : ''} ${item.isToday ? 'today' : ''} ${item.isFuture ? 'future' : ''}`}
          >
            {item.day}
          </div>
        ))}
      </div>

      {/* Journal Entries */}
      <div className="tt-journal-section">
        <div className="tt-journal-label">RECENT ENTRIES</div>
        <div className="tt-journal-entries">
          {journalEntries.map((entry, i) => (
            <div key={i} className="tt-journal-entry">
              <div className="tt-journal-date">
                {new Date(entry.date).toLocaleDateString('en-US', { 
                  month: 'short', 
                  day: 'numeric' 
                })}
              </div>
              <div className="tt-journal-preview">{entry.preview}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ============================================
// ORACLE SCREEN
// ============================================
const OracleScreen = ({ streakDays }) => {
  return (
    <div className="tt-oracle-screen">
      <div className="tt-oracle-header">
        <div className="tt-oracle-title">
          Oracle <span>Day {streakDays}</span>
        </div>
      </div>
      <div className="tt-oracle-container">
        <AIChat 
          isLoggedIn={true} 
          isOpen={true} 
          onClose={() => {}} 
          openPlanModal={null}
        />
      </div>
    </div>
  );
};

// ============================================
// RANKS SCREEN (LEADERBOARD)
// ============================================
const RanksScreen = ({ leaderboard }) => {
  const [activeTab, setActiveTab] = useState('current');

  // Top 3 for podium
  const top3 = leaderboard.slice(0, 3);
  // Rest of the list (excluding top 3, include current user area)
  const restOfList = leaderboard.slice(3);

  return (
    <div className="tt-ranks">
      {/* Toggle */}
      <div className="tt-ranks-header">
        <div className="tt-ranks-toggle">
          <button 
            className={activeTab === 'current' ? 'active' : ''}
            onClick={() => setActiveTab('current')}
          >
            Current Streak
          </button>
          <button 
            className={activeTab === 'alltime' ? 'active' : ''}
            onClick={() => setActiveTab('alltime')}
          >
            All Time
          </button>
        </div>
      </div>

      {/* Top 3 Podium */}
      <div className="tt-podium">
        {top3.map((user, index) => (
          <div key={user.rank} className={`tt-podium-item ${index === 0 ? 'first' : index === 1 ? 'second' : 'third'}`}>
            <div className="tt-podium-avatar">
              {index === 0 && <span className="tt-podium-crown"><CrownIcon /></span>}
              {user.initials}
            </div>
            <span className="tt-podium-rank">#{user.rank}</span>
            <span className="tt-podium-name">{user.username}</span>
            <span className="tt-podium-streak">{user.streak} days</span>
          </div>
        ))}
      </div>

      {/* Leaderboard List */}
      <div className="tt-leaderboard">
        {restOfList.map((user) => (
          <div 
            key={user.rank} 
            className={`tt-leaderboard-item ${user.isCurrentUser ? 'current-user' : ''}`}
          >
            <span className="tt-leaderboard-rank">{user.rank}</span>
            <div className="tt-leaderboard-avatar">{user.initials}</div>
            <div className="tt-leaderboard-info">
              <div className="tt-leaderboard-name">
                {user.username}
                {user.isCurrentUser && ' (You)'}
              </div>
            </div>
            <span className="tt-leaderboard-streak">{user.streak}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// ============================================
// BOTTOM NAVIGATION
// ============================================
const BottomNavigation = ({ activeTab, onTabChange }) => {
  return (
    <nav className="tt-bottom-nav">
      <button 
        className={`tt-nav-item ${activeTab === 'home' ? 'active' : ''}`}
        onClick={() => onTabChange('home')}
        aria-label="Home"
      >
        <HomeIcon />
        <span className="tt-nav-label">Home</span>
      </button>

      <button 
        className={`tt-nav-item ${activeTab === 'calendar' ? 'active' : ''}`}
        onClick={() => onTabChange('calendar')}
        aria-label="Calendar"
      >
        <CalendarIcon />
        <span className="tt-nav-label">Calendar</span>
      </button>

      <button 
        className="tt-nav-item oracle-tab"
        onClick={() => onTabChange('oracle')}
        aria-label="Oracle"
      >
        <div className="tt-nav-oracle-btn">
          <OracleIcon />
        </div>
        <span className="tt-nav-label">Oracle</span>
      </button>

      <button 
        className={`tt-nav-item ${activeTab === 'ranks' ? 'active' : ''}`}
        onClick={() => onTabChange('ranks')}
        aria-label="Ranks"
      >
        <RanksIcon />
        <span className="tt-nav-label">Ranks</span>
      </button>
    </nav>
  );
};

// ============================================
// MAIN PROTOTYPE COMPONENT
// ============================================
const TitanTrackPrototype = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState('home');

  const handleTalkToOracle = () => {
    setActiveTab('oracle');
  };

  return (
    <div className="titantrack-prototype">
      <div className="tt-viewport">
        {/* Header */}
        <header className="tt-header">
          <span className="tt-logo">TITANTRACK</span>
          {onClose ? (
            <button className="tt-close-btn" onClick={onClose} aria-label="Close prototype">
              <CloseIcon />
            </button>
          ) : (
            <div className="tt-avatar">{mockUser.initials}</div>
          )}
        </header>

        {/* Content */}
        <main className="tt-content">
          <div className={`tt-screen ${activeTab === 'home' ? 'active' : ''}`}>
            <HomeScreen 
              user={mockUser} 
              oracleObservation={mockOracleObservation}
              onTalkToOracle={handleTalkToOracle}
            />
          </div>

          <div className={`tt-screen ${activeTab === 'calendar' ? 'active' : ''}`}>
            <CalendarScreen 
              streakHistory={mockStreakHistory}
              journalEntries={mockJournalEntries}
            />
          </div>

          <div className={`tt-screen ${activeTab === 'oracle' ? 'active' : ''}`}>
            <OracleScreen streakDays={mockUser.streakDays} />
          </div>

          <div className={`tt-screen ${activeTab === 'ranks' ? 'active' : ''}`}>
            <RanksScreen leaderboard={mockLeaderboard} />
          </div>
        </main>

        {/* Bottom Navigation */}
        <BottomNavigation activeTab={activeTab} onTabChange={setActiveTab} />
      </div>
    </div>
  );
};

export default TitanTrackPrototype;
