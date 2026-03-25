// Stats.js - TITANTRACK
// V2: Calendar-DNA viewport-filling layout — no scroll, gap-based grids
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { format } from 'date-fns';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler } from 'chart.js';
import './Stats.css';
import '../../styles/BottomSheet.css';
import useSheetSwipe from '../../hooks/useSheetSwipe';
import useBodyScrollLock from '../../hooks/useBodyScrollLock';
import toast from 'react-hot-toast';

// Import extracted components
import { StatCardModal } from './StatsComponents';
import Leaderboard from './Leaderboard';
import EmotionalTimeline from '../EmotionalTimeline/EmotionalTimeline';

// Import utility functions
import {
  generateChartData,
  calculateAverage,
  validateUserData
} from './StatsUtils';

// Import analytics functions
import {
  getPhaseInfo,
  calculateMetricAverages,
  calculateMetricTrends,
  identifyMetricExtremes,
  generateRelapsePatternAnalysis
} from './StatsAnalyticsUtils';

// Import relapse utility
import { calculateDaysSinceLastRelapse } from './StatsUtils';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

const Stats = ({ userData, isPremium, updateUserData, openPlanModal }) => {
  const [activeView, setActiveView] = useState('analytics');
  const [selectedMetric, setSelectedMetric] = useState('energy');
  const [timeRange, setTimeRange] = useState('week');
  const [selectedMilestone, setSelectedMilestone] = useState(null);
  const [showResetStreakModal, setShowResetStreakModal] = useState(false);
  const [showResetAllModal, setShowResetAllModal] = useState(false);
  const [resetConfirmText, setResetConfirmText] = useState('');
  const [showStatModal, setShowStatModal] = useState(false);
  const [selectedStatCard, setSelectedStatCard] = useState(null);
  const [showMilestonesSheet, setShowMilestonesSheet] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [showPatternsSheet, setShowPatternsSheet] = useState(false);
  const [milestonesView, setMilestonesView] = useState('list'); // 'list' | 'detail'
  const [morphing, setMorphing] = useState(false);

  // Theme detection
  const [isDarkTheme, setIsDarkTheme] = useState(() => {
    return document.documentElement.getAttribute('data-theme') !== 'light';
  });

  const chartRef = useRef(null);
  const safeUserData = useMemo(() => validateUserData(userData), [userData]);

  // Bottom sheet state
  const [sheetReady, setSheetReady] = useState(false);
  const sheetPanelRef = useRef(null);

  const sheetVisible = showResetStreakModal || showResetAllModal || showMilestonesSheet || showPatternsSheet;
  useEffect(() => {
    if (sheetVisible) {
      requestAnimationFrame(() => requestAnimationFrame(() => setSheetReady(true)));
    } else {
      setSheetReady(false);
    }
  }, [sheetVisible]);

  const closeSheet = useCallback((cb) => {
    setSheetReady(false);
    setTimeout(cb, 300);
  }, []);

  // Smooth morph between views inside a sheet
  const switchMilestonesView = useCallback((newView, milestone = null) => {
    setMorphing(true);
    setTimeout(() => {
      setMilestonesView(newView);
      if (milestone) setSelectedMilestone(milestone);
      else if (newView === 'list') setSelectedMilestone(null);
      setMorphing(false);
    }, 150);
  }, []);

  const handleSwipeDismiss = useCallback(() => {
    setShowResetStreakModal(false);
    setShowResetAllModal(false);
    setShowMilestonesSheet(false);
    setShowPatternsSheet(false);
    setMilestonesView('list');
    setSelectedMilestone(null);
    setMorphing(false);
  }, []);
  useSheetSwipe(sheetPanelRef, sheetVisible, () => closeSheet(handleSwipeDismiss));
  useBodyScrollLock(sheetVisible);

  // Theme observer
  useEffect(() => {
    const checkTheme = () => {
      setIsDarkTheme(document.documentElement.getAttribute('data-theme') !== 'light');
    };
    checkTheme();
    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => observer.disconnect();
  }, []);

  const daysTracked = useMemo(() => safeUserData.benefitTracking?.length || 0, [safeUserData.benefitTracking]);

  // Memoized analytics — only what the main view needs
  const memoizedInsights = useMemo(() => {
    if (!isPremium) return {};
    return {
      metricAverages: calculateMetricAverages(safeUserData, 7),
      metricTrends: calculateMetricTrends(safeUserData, 7, 7),
      metricExtremes: identifyMetricExtremes(safeUserData, 7),
      phaseInfo: getPhaseInfo(safeUserData.currentStreak || 0)
    };
  }, [safeUserData, isPremium]);

  // Relapse pattern data — for Patterns sheet
  const relapsePatterns = useMemo(() => generateRelapsePatternAnalysis(safeUserData), [safeUserData]);
  const daysSinceLastRelapse = useMemo(() => calculateDaysSinceLastRelapse(safeUserData), [safeUserData]);

  // Milestones
  const milestones = useMemo(() => {
    const maxStreak = Math.max(safeUserData.currentStreak || 0, safeUserData.longestStreak || 0);
    const badges = safeUserData.badges || [];
    const streakHistory = safeUserData.streakHistory || [];
    const startDate = safeUserData.startDate;
    const getMilestoneDate = (badgeName, milestoneDays) => {
      const badge = badges.find(b => b.name === badgeName);
      if (badge?.date) return badge.date;
      if (maxStreak >= milestoneDays) {
        const currentStreak = safeUserData.currentStreak || 0;
        if (currentStreak >= milestoneDays && startDate) {
          const d = new Date(startDate);
          d.setDate(d.getDate() + milestoneDays);
          return d;
        }
        for (const streak of streakHistory) {
          if (streak.days >= milestoneDays && streak.start) {
            const d = new Date(streak.start);
            d.setDate(d.getDate() + milestoneDays);
            return d;
          }
        }
      }
      return null;
    };
    return [
      { days: 7, label: '1 week', earned: maxStreak >= 7, date: getMilestoneDate('7-Day Warrior', 7) },
      { days: 14, label: '2 weeks', earned: maxStreak >= 14, date: getMilestoneDate('14-Day Monk', 14) },
      { days: 30, label: '1 month', earned: maxStreak >= 30, date: getMilestoneDate('30-Day Master', 30) },
      { days: 90, label: '3 months', earned: maxStreak >= 90, date: getMilestoneDate('90-Day King', 90) },
      { days: 180, label: '6 months', earned: maxStreak >= 180, date: getMilestoneDate('180-Day Emperor', 180) },
      { days: 365, label: '1 year', earned: maxStreak >= 365, date: getMilestoneDate('365-Day Sage', 365) }
    ];
  }, [safeUserData]);

  // Sparkline-style chart options — stripped down, no Y axis, no grid
  const chartOptions = useMemo(() => {
    const tooltipBg = isDarkTheme ? 'rgba(0,0,0,0.9)' : 'rgba(255,255,255,0.95)';
    const tooltipTitleColor = isDarkTheme ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.5)';
    const tooltipBodyColor = isDarkTheme ? '#ffffff' : '#000000';
    const tooltipBorderColor = isDarkTheme ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.1)';

    return {
      responsive: true,
      maintainAspectRatio: false,
      layout: { padding: { top: 12, right: 4, bottom: 0, left: 4 } },
      scales: {
        y: {
          display: false,
          min: 0,
          max: 10.5
        },
        x: {
          display: true,
          ticks: {
            color: isDarkTheme ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.2)',
            font: { size: 9, weight: '400' },
            maxRotation: 0,
            maxTicksLimit: timeRange === 'quarter' ? 5 : (timeRange === 'month' ? 5 : 7),
            padding: 4
          },
          grid: { display: false },
          border: { display: false }
        }
      },
      elements: {
        line: { tension: 0.4, borderWidth: 2.5, borderCapStyle: 'round', borderJoinStyle: 'round' },
        point: { radius: 0, hoverRadius: 6, hoverBorderWidth: 2, hitRadius: 30 }
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          enabled: true,
          backgroundColor: tooltipBg,
          titleColor: tooltipTitleColor,
          titleFont: { size: 10, weight: '400' },
          bodyColor: tooltipBodyColor,
          bodyFont: { size: 16, weight: '600' },
          borderColor: tooltipBorderColor,
          borderWidth: 1,
          cornerRadius: 8,
          padding: { top: 8, right: 12, bottom: 8, left: 12 },
          displayColors: false,
          caretSize: 0,
          caretPadding: 10,
          callbacks: {
            title: (items) => items.length ? items[0].label : '',
            label: (ctx) => ctx.parsed.y === null ? '' : `${Math.round(ctx.parsed.y)}`
          }
        }
      },
      interaction: { mode: 'index', intersect: false, axis: 'x' },
      animation: { duration: 400, easing: 'easeOutQuart' }
    };
  }, [timeRange, isDarkTheme]);

  // Chart data generator — white line, area fill
  const getChartData = useCallback(() => {
    const rawData = generateChartData(safeUserData, selectedMetric, timeRange);
    const chart = chartRef.current;
    const lineColor = isDarkTheme ? '#ffffff' : '#000000';
    const pointBorderColor = isDarkTheme ? '#000000' : '#ffffff';

    let gradient = isDarkTheme ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)';
    if (chart?.ctx && chart?.chartArea) {
      gradient = chart.ctx.createLinearGradient(0, chart.chartArea.top, 0, chart.chartArea.bottom);
      if (isDarkTheme) {
        gradient.addColorStop(0, 'rgba(255,255,255,0.1)');
        gradient.addColorStop(0.5, 'rgba(255,255,255,0.03)');
        gradient.addColorStop(1, 'rgba(255,255,255,0)');
      } else {
        gradient.addColorStop(0, 'rgba(0,0,0,0.08)');
        gradient.addColorStop(0.5, 'rgba(0,0,0,0.02)');
        gradient.addColorStop(1, 'rgba(0,0,0,0)');
      }
    }

    const data = rawData.datasets[0].data;
    const pointRadii = data.map((value) => {
      if (value === null) return 0;
      if (timeRange === 'week') return 4;
      return 0;
    });

    return {
      ...rawData,
      datasets: [{
        ...rawData.datasets[0],
        borderColor: lineColor,
        borderWidth: 2.5,
        backgroundColor: gradient,
        fill: true,
        pointBackgroundColor: lineColor,
        pointBorderColor: pointBorderColor,
        pointBorderWidth: 2,
        pointRadius: pointRadii,
        pointHoverRadius: 6,
        pointHoverBackgroundColor: lineColor,
        pointHoverBorderColor: pointBorderColor,
        spanGaps: true,
      }]
    };
  }, [safeUserData, selectedMetric, timeRange, isDarkTheme]);

  // Handlers
  const handleStatCardClick = (statType) => { setSelectedStatCard(statType); setShowStatModal(true); };
  const handleMilestoneClick = (milestone) => { if (milestone.earned) switchMilestonesView('detail', milestone); };

  const confirmResetStreak = async () => {
    try {
      const todayStr = format(new Date(), 'yyyy-MM-dd');
      const history = [...(safeUserData.streakHistory || [])];
      const activeIdx = history.findIndex(s => s.start && !s.end);
      if (activeIdx !== -1) {
        history[activeIdx] = { ...history[activeIdx], end: todayStr, days: safeUserData.currentStreak || 0, reason: 'reset' };
      }
      history.push({ start: todayStr, end: null, days: 0 });
      await updateUserData({ currentStreak: 0, startDate: todayStr, streakHistory: history });
      setShowResetStreakModal(false);
      toast.success('Streak reset');
    } catch (error) { toast.error('Failed to reset streak'); }
  };

  const confirmResetAll = async () => {
    try {
      await updateUserData({
        currentStreak: 0, longestStreak: 0, wetDreamCount: 0, relapseCount: 0,
        benefitTracking: [], relapseHistory: [], streakHistory: [],
        badges: safeUserData.badges?.map(b => ({ ...b, earned: false, date: null })) || [],
        startDate: format(new Date(), 'yyyy-MM-dd')
      });
      setShowResetAllModal(false); setResetConfirmText('');
      toast.success('All data reset');
    } catch (error) { toast.error('Failed to reset data'); }
  };

  // Metric display names
  const metricDisplayName = { energy: 'Energy', focus: 'Focus', confidence: 'Confidence', aura: 'Aura', sleep: 'Sleep', workout: 'Body' };

  // Get average + trend for header display
  const currentAvg = useMemo(() => calculateAverage(safeUserData, selectedMetric, timeRange, isPremium), [safeUserData, selectedMetric, timeRange, isPremium]);

  const currentTrend = useMemo(() => {
    if (!isPremium) return null;
    const periodMap = { week: 7, month: 30, quarter: 90 };
    const days = periodMap[timeRange] || 7;
    const trends = calculateMetricTrends(safeUserData, days, days);
    return trends?.[selectedMetric] || null;
  }, [isPremium, safeUserData, selectedMetric, timeRange]);

  // Phase info for progress bar
  const phaseInfo = memoizedInsights.phaseInfo || getPhaseInfo(safeUserData.currentStreak || 0);

  // Time range options
  const timeRanges = [
    { key: 'week', label: 'Week' },
    { key: 'month', label: 'Month' },
    { key: 'quarter', label: '90d' }
  ];

  // Metric options
  const metricOptions = [
    { key: 'energy', label: 'Energy' },
    { key: 'focus', label: 'Focus' },
    { key: 'confidence', label: 'Conf' },
    { key: 'aura', label: 'Aura' },
    { key: 'sleep', label: 'Sleep' },
    { key: 'workout', label: 'Body' }
  ];

  // Next milestone for progress bar
  const nextMilestone = milestones.find(m => !m.earned);
  const prevMilestone = milestones.filter(m => m.earned).pop();
  const progressPct = nextMilestone
    ? Math.min(((safeUserData.currentStreak || 0) - (prevMilestone?.days || 0)) / (nextMilestone.days - (prevMilestone?.days || 0)) * 100, 100)
    : 100;

  return (
    <>
    <div className="stats-page">
      {/* ====== STICKY HEADER — mirrors Calendar header exactly ====== */}
      <div className="stats-header-sticky">
        <div className="stats-header-row">
          <span className="stats-header-title">{phaseInfo.name}</span>
          <div className="stats-view-toggle">
            <button
              className="stats-vt-btn stats-lb-btn"
              onClick={() => setShowLeaderboard(true)}
              aria-label="Leaderboard"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M2 4l3 12h14l3-12-6 7-5-7-5 7-4-7z"/>
                <path d="M5 16h14v2H5z"/>
              </svg>
            </button>
            <span className="stats-vt-div" />
            <button
              className={`stats-vt-btn ${activeView === 'analytics' ? 'active' : ''}`}
              onClick={() => setActiveView('analytics')}
            >Analytics</button>
            <span className="stats-vt-div" />
            <button
              className={`stats-vt-btn ${activeView === 'timeline' ? 'active' : ''}`}
              onClick={() => setActiveView('timeline')}
            >Timeline</button>
          </div>
        </div>
      </div>

      {/* ====== TIMELINE VIEW ====== */}
      {activeView === 'timeline' && (
        <div className="stats-timeline-wrap">
          <EmotionalTimeline
            userData={userData}
            isPremium={isPremium}
            updateUserData={updateUserData}
            openPlanModal={openPlanModal}
          />
        </div>
      )}

      {/* ====== ANALYTICS VIEW ====== */}
      {activeView === 'analytics' && (
      <>
        <div className="stats-analytics">

          {/* ---- STREAK STRIP: 4-col grid ---- */}
          <div className="streak-strip">
            <button className="streak-cell streak-current" onClick={() => handleStatCardClick('currentStreak')}>
              <span className="streak-hero-num">{safeUserData.currentStreak || 0}</span>
              <span className="streak-cell-label-upper">Streak</span>
            </button>
            <button className="streak-cell" onClick={() => handleStatCardClick('longestStreak')}>
              <span className="streak-cell-num">{safeUserData.longestStreak || 0}</span>
              <span className="streak-cell-label">Longest</span>
            </button>
            <button className="streak-cell" onClick={() => handleStatCardClick('wetDreams')}>
              <span className="streak-cell-num">{safeUserData.wetDreamCount || 0}</span>
              <span className="streak-cell-label">Wet Dreams</span>
            </button>
            <button className="streak-cell" onClick={() => handleStatCardClick('relapses')}>
              <span className="streak-cell-num">{safeUserData.relapseCount || 0}</span>
              <span className="streak-cell-label">Relapses</span>
            </button>
          </div>

          {/* ---- PROGRESS BAR — attached to streak strip ---- */}
          <div className="stats-progress-bar">
            <div className="stats-progress-meta">
              <span className="stats-progress-text">
                {nextMilestone
                  ? `${safeUserData.currentStreak || 0} / ${nextMilestone.days} · ${phaseInfo.name}`
                  : `${safeUserData.currentStreak || 0} days · ${phaseInfo.name}`}
              </span>
            </div>
            <div className="stats-progress-track">
              <div className="stats-progress-fill" style={{ width: `${progressPct}%` }} />
            </div>
          </div>

          {/* ---- CHART HEADER: metric label + value + delta | time range ---- */}
          <div className="chart-header">
            <div className="chart-header-left">
              <span className="chart-metric-label">{metricDisplayName[selectedMetric]}</span>
              <span className="chart-metric-value">{currentAvg !== 'N/A' ? currentAvg : '—'}</span>
              {currentTrend && (
                <span className={`chart-metric-delta ${currentTrend.direction === 'up' ? 'delta-up' : currentTrend.direction === 'down' ? 'delta-down' : 'delta-flat'}`}>
                  {currentTrend.direction === 'up' ? '+' : ''}{currentTrend.delta}
                </span>
              )}
            </div>
            <div className="chart-time-toggle">
              {timeRanges.map((r, i) => (
                <React.Fragment key={r.key}>
                  <button
                    className={`chart-tt-btn ${timeRange === r.key ? 'active' : ''}`}
                    onClick={() => setTimeRange(r.key)}
                  >{r.label}</button>
                  {i < timeRanges.length - 1 && <span className="chart-tt-div" />}
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* ---- METRIC SELECTOR — pipe dividers ---- */}
          <div className="metric-selector-row">
            {metricOptions.map((m, i) => (
              <React.Fragment key={m.key}>
                <button
                  className={`metric-sel-btn ${selectedMetric === m.key ? 'active' : ''}`}
                  onClick={() => setSelectedMetric(m.key)}
                >{m.label}</button>
                {i < metricOptions.length - 1 && <span className="metric-sel-div" />}
              </React.Fragment>
            ))}
          </div>

          {/* ---- SPARKLINE CHART — flex-expands to fill space ---- */}
          <div className="chart-spark-area">
            {(() => {
              const chartData = getChartData();
              const hasData = chartData.datasets[0].data.some(v => v !== null);
              if (!hasData) return (
                <div className="chart-empty-state">
                  <span className="chart-empty-title">No data yet</span>
                  <span className="chart-empty-sub">Check in daily to see trends</span>
                </div>
              );
              return <Line ref={chartRef} data={chartData} options={chartOptions} />;
            })()}
          </div>


          {/* Free user — simple phase + upgrade */}
          {!isPremium && (
            <div className="free-phase-strip">
              <span className="free-phase-text">Day {safeUserData.currentStreak || 0} · {phaseInfo.name}</span>
              <button className="stats-upgrade-btn" onClick={openPlanModal}>Unlock detailed analytics</button>
            </div>
          )}

          {/* ---- FOOTER: milestones + patterns + reset ---- */}
          <div className="stats-footer-row">
            <button className="stats-footer-btn" onClick={() => setShowMilestonesSheet(true)}>
              Milestones
            </button>
            <span className="stats-footer-div" />
            <button className="stats-footer-btn" onClick={() => setShowPatternsSheet(true)}>
              Patterns
            </button>
            <span className="stats-footer-div" />
            {!isPremium && (
              <>
                <button className="stats-footer-btn" onClick={openPlanModal}>
                  Upgrade
                </button>
                <span className="stats-footer-div" />
              </>
            )}
            <button className="stats-footer-btn" onClick={() => setShowResetStreakModal(true)}>
              Reset
            </button>
            <span className="stats-footer-div" />
            <button className="stats-footer-btn" onClick={() => setShowResetAllModal(true)}>
              Reset All
            </button>
          </div>

        </div>
      </>
      )}

    </div>

    {/* ====== ALL MODALS/SHEETS RENDER OUTSIDE stats-page so overflow:auto doesn't trap them ====== */}

    {/* Leaderboard Sheet */}
    <Leaderboard isOpen={showLeaderboard} onClose={() => setShowLeaderboard(false)} />

    <StatCardModal
      showModal={showStatModal}
      selectedStatCard={selectedStatCard}
      onClose={() => setShowStatModal(false)}
      userData={safeUserData}
    />

    {/* MILESTONES SHEET — morphs between list and detail views */}
    {showMilestonesSheet && (
        <div className={`sheet-backdrop${sheetReady ? ' open' : ''}`} onClick={() => closeSheet(() => { setShowMilestonesSheet(false); setMilestonesView('list'); setSelectedMilestone(null); setMorphing(false); })}>
          <div ref={sheetPanelRef} className={`sheet-panel stats-sheet${sheetReady ? ' open' : ''}`} onClick={e => e.stopPropagation()}>
            <div className="sheet-header" />
            <div className={`sheet-morph-wrap${morphing ? ' morphing' : ''}`}>
              {milestonesView === 'list' ? (
                <div className="milestones-sheet-content">
                  <h2 className="sheet-section-title">Milestones</h2>
                  <div className="milestone-grid">
                    {milestones.map((m, i) => {
                      const nextIdx = milestones.findIndex(ms => !ms.earned);
                      const mostRecentIdx = nextIdx > 0 ? nextIdx - 1 : nextIdx === -1 ? milestones.length - 1 : -1;
                      const isMostRecent = i === mostRecentIdx;
                      const isNext = i === nextIdx;
                      return (
                        <button
                          key={m.days}
                          className={`milestone-card ${m.earned ? 'earned' : ''} ${isMostRecent ? 'most-recent' : ''} ${isNext ? 'next-target' : ''}`}
                          onClick={() => handleMilestoneClick(m)}
                          disabled={!m.earned}
                        >
                          <span className="milestone-num">{m.days}</span>
                          <span className="milestone-label">{m.label}</span>
                        </button>
                      );
                    })}
                  </div>
                  <button className="btn-ghost" onClick={() => closeSheet(() => { setShowMilestonesSheet(false); setMilestonesView('list'); setSelectedMilestone(null); })}>Close</button>
                </div>
              ) : (
                <div className="modal" style={{ animation: 'none' }}>
                  <span className="modal-num">{selectedMilestone?.days}</span>
                  <h2>{selectedMilestone?.label}</h2>
                  {selectedMilestone?.date && (
                    <p className="modal-date">Reached {format(new Date(selectedMilestone.date), 'MMMM d, yyyy')}</p>
                  )}
                  <p className="modal-text">
                    {selectedMilestone && (safeUserData.currentStreak || 0) >= selectedMilestone.days ? (
                      <>
                        {selectedMilestone.days === 7 && "Foundation set. Energy stabilizing, clarity emerging."}
                        {selectedMilestone.days === 14 && "Two weeks in. Focus and physical energy improving."}
                        {selectedMilestone.days === 30 && "One month. Habits formed, transformation underway."}
                        {selectedMilestone.days === 90 && "Ninety days. Neurological rewiring complete."}
                        {selectedMilestone.days === 180 && "Six months. Baseline permanently elevated."}
                        {selectedMilestone.days === 365 && "One year. This is now who you are."}
                      </>
                    ) : (
                      <>
                        {selectedMilestone?.days === 7 && "You've built the foundation before. Build it again."}
                        {selectedMilestone?.days === 14 && "Two weeks is in your wheelhouse. Reclaim it."}
                        {selectedMilestone?.days === 30 && "You've proven you can do this. Now do it again."}
                        {selectedMilestone?.days === 90 && "You've rewired once. The path is familiar."}
                        {selectedMilestone?.days === 180 && "Six months was yours. Take it back."}
                        {selectedMilestone?.days === 365 && "A year lives in you. Rise again."}
                      </>
                    )}
                  </p>
                  <button className="btn-ghost" onClick={() => switchMilestonesView('list')}>Back</button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ====== RESET STREAK SHEET ====== */}
      {showResetStreakModal && (
        <div className={`sheet-backdrop${sheetReady ? ' open' : ''}`} onClick={() => closeSheet(() => setShowResetStreakModal(false))}>
          <div ref={sheetPanelRef} className={`sheet-panel stats-sheet${sheetReady ? ' open' : ''}`} onClick={e => e.stopPropagation()}>
            <div className="sheet-header" />
            <div className="modal" style={{ animation: 'none' }}>
              <h2>Reset Streak?</h2>
              <p className="modal-text">This will reset your current streak to 0. Your history and benefits data will be kept.</p>
              <div className="modal-buttons">
                <button className="btn-danger" onClick={confirmResetStreak}>Reset Streak</button>
                <button className="btn-ghost" onClick={() => closeSheet(() => setShowResetStreakModal(false))}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ====== RESET ALL SHEET ====== */}
      {showResetAllModal && (
        <div className={`sheet-backdrop${sheetReady ? ' open' : ''}`} onClick={() => closeSheet(() => { setShowResetAllModal(false); setResetConfirmText(''); })}>
          <div ref={sheetPanelRef} className={`sheet-panel stats-sheet${sheetReady ? ' open' : ''}`} onClick={e => e.stopPropagation()}>
            <div className="sheet-header" />
            <div className="modal" style={{ animation: 'none' }}>
              <h2>Reset All Data?</h2>
              <p className="modal-text">This will permanently delete all progress data including streaks, benefits, and milestones. This cannot be undone.</p>
              <div className="reset-confirm-input">
                <label>Type <strong>RESET</strong> to confirm</label>
                <input
                  type="text"
                  value={resetConfirmText}
                  onChange={(e) => setResetConfirmText(e.target.value)}
                  placeholder="RESET"
                  autoComplete="off"
                  spellCheck={false}
                />
              </div>
              <div className="modal-buttons">
                <button className="btn-danger" onClick={confirmResetAll} disabled={resetConfirmText !== 'RESET'}>Reset All</button>
                <button className="btn-ghost" onClick={() => closeSheet(() => { setShowResetAllModal(false); setResetConfirmText(''); })}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ====== PATTERNS SHEET — relapse data + insights ====== */}
      {showPatternsSheet && (
        <div className={`sheet-backdrop${sheetReady ? ' open' : ''}`} onClick={() => closeSheet(() => setShowPatternsSheet(false))}>
          <div ref={sheetPanelRef} className={`sheet-panel stats-sheet${sheetReady ? ' open' : ''}`} onClick={e => e.stopPropagation()}>
            <div className="sheet-header" />
            <div className="patterns-sheet-content">
              <h2 className="sheet-section-title">Patterns</h2>

              {/* Relapse data */}
              {relapsePatterns?.hasData ? (
                <div className="patterns-section">
                  <span className="patterns-section-label">
                    {daysSinceLastRelapse >= 90 ? 'Conquered' : 'Relapse Data'}
                  </span>

                  {daysSinceLastRelapse >= 90 ? (
                    <div className="patterns-conquered">
                      <span className="patterns-conquered-num">{daysSinceLastRelapse}</span>
                      <span className="patterns-conquered-label">days since last relapse</span>
                    </div>
                  ) : (
                    <div className="patterns-stat-list">
                      <div className="patterns-stat-row">
                        <span className="patterns-stat-label">Total relapses</span>
                        <span className="patterns-stat-value">{relapsePatterns.totalRelapses}</span>
                      </div>
                      {relapsePatterns.avgStreakAtRelapse && (
                        <div className="patterns-stat-row">
                          <span className="patterns-stat-label">Avg streak at relapse</span>
                          <span className="patterns-stat-value">{relapsePatterns.avgStreakAtRelapse} days</span>
                        </div>
                      )}
                      {relapsePatterns.dangerZone && (
                        <div className="patterns-stat-row">
                          <span className="patterns-stat-label">Danger zone</span>
                          <span className="patterns-stat-value">Days {relapsePatterns.dangerZone}</span>
                        </div>
                      )}
                      {relapsePatterns.primaryTriggerLabel && (
                        <div className="patterns-stat-row">
                          <span className="patterns-stat-label">Primary trigger</span>
                          <span className="patterns-stat-value">{relapsePatterns.primaryTriggerLabel}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="patterns-empty">
                  <span className="patterns-empty-text">No relapse data yet</span>
                  <span className="patterns-empty-sub">Pattern analysis appears after your first relapse is logged</span>
                </div>
              )}

              {/* Strongest / Growth Area — moved here from dead grid */}
              {isPremium && memoizedInsights.metricExtremes?.strongest && memoizedInsights.metricExtremes?.growthArea && (
                <div className="patterns-section">
                  <span className="patterns-section-label">Metrics</span>
                  <div className="patterns-stat-list">
                    <div className="patterns-stat-row">
                      <span className="patterns-stat-label">Strongest</span>
                      <span className="patterns-stat-value">{metricDisplayName[memoizedInsights.metricExtremes.strongest.metric]}</span>
                    </div>
                    <div className="patterns-stat-row">
                      <span className="patterns-stat-label">Growth area</span>
                      <span className="patterns-stat-value">{metricDisplayName[memoizedInsights.metricExtremes.growthArea.metric]}</span>
                    </div>
                  </div>
                </div>
              )}

              <button className="btn-ghost" onClick={() => closeSheet(() => setShowPatternsSheet(false))}>Close</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Stats;
