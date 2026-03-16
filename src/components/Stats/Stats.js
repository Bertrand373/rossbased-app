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
import EmotionalTimeline from '../EmotionalTimeline/EmotionalTimeline';
import { 
  YourNumbers,
  YourPatterns,
  AIInsights,
  RelapseAnalytics
} from './StatsInsights';

// Import ShareCard component
import ShareCard from '../ShareCard/ShareCard';

// Import utility functions
import {
  getTimeRangeDisplayText,
  generateChartData,
  calculateAverage,
  calculateDataQuality,
  calculateDaysSinceLastRelapse,
  validateUserData
} from './StatsUtils';

// Import analytics functions
import {
  getPhaseInfo,
  calculateMetricAverages,
  calculateMetricTrends,
  identifyMetricExtremes,
  calculateStreakPhaseAverages,
  calculateMetricCorrelations,
  calculateGrowthRates,
  generateRelapsePatternAnalysis,
  discoverMLPatterns,
  generateMLOptimization
} from './StatsAnalyticsUtils';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

const Stats = ({ userData, isPremium, updateUserData, openPlanModal }) => {
  const [activeView, setActiveView] = useState('analytics');
  const [selectedMetric, setSelectedMetric] = useState('energy');
  const [timeRange, setTimeRange] = useState('week');
  const [showMilestoneModal, setShowMilestoneModal] = useState(false);
  const [selectedMilestone, setSelectedMilestone] = useState(null);
  const [showResetStreakModal, setShowResetStreakModal] = useState(false);
  const [showResetAllModal, setShowResetAllModal] = useState(false);
  const [resetConfirmText, setResetConfirmText] = useState('');
  const [showStatModal, setShowStatModal] = useState(false);
  const [selectedStatCard, setSelectedStatCard] = useState(null);
  const [showMilestonesSheet, setShowMilestonesSheet] = useState(false);

  // Theme detection
  const [isDarkTheme, setIsDarkTheme] = useState(() => {
    return document.documentElement.getAttribute('data-theme') !== 'light';
  });

  // ML pattern state
  const [mlPatterns, setMLPatterns] = useState(null);
  const [mlOptimization, setMLOptimization] = useState(null);

  const [loadingStates, setLoadingStates] = useState({
    numbers: true, patterns: true, ai: true, relapse: true
  });

  const chartRef = useRef(null);
  const safeUserData = useMemo(() => validateUserData(userData), [userData]);

  // Bottom sheet state
  const [sheetReady, setSheetReady] = useState(false);
  const sheetPanelRef = useRef(null);

  const sheetVisible = showMilestoneModal || showResetStreakModal || showResetAllModal || showMilestonesSheet;
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

  const handleSwipeDismiss = useCallback(() => {
    setShowMilestoneModal(false);
    setShowResetStreakModal(false);
    setShowResetAllModal(false);
    setShowMilestonesSheet(false);
    setSelectedMilestone(null);
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
  const relapseCount = useMemo(() => (safeUserData.streakHistory || []).filter(s => s.reason === 'relapse').length, [safeUserData.streakHistory]);

  useEffect(() => {
    if (isPremium) {
      const timers = [
        setTimeout(() => setLoadingStates(prev => ({ ...prev, numbers: false })), 300),
        setTimeout(() => setLoadingStates(prev => ({ ...prev, patterns: false })), 500),
        setTimeout(() => setLoadingStates(prev => ({ ...prev, ai: false })), 700),
        setTimeout(() => setLoadingStates(prev => ({ ...prev, relapse: false })), 400)
      ];
      return () => timers.forEach(clearTimeout);
    }
  }, [isPremium, selectedMetric]);

  // ML patterns
  useEffect(() => {
    const loadMLPatterns = async () => {
      if (!isPremium || daysTracked < 20) { setMLPatterns(null); setMLOptimization(null); return; }
      try {
        const patterns = await discoverMLPatterns(safeUserData);
        setMLPatterns(patterns);
        const optimization = await generateMLOptimization(safeUserData);
        setMLOptimization(optimization);
      } catch (error) {
        console.warn('ML patterns loading error:', error);
        setMLPatterns(null); setMLOptimization(null);
      }
    };
    loadMLPatterns();
  }, [safeUserData, isPremium, daysTracked]);

  // Memoized analytics
  const memoizedInsights = useMemo(() => {
    if (!isPremium) return {};
    return {
      metricAverages: calculateMetricAverages(safeUserData, 7),
      metricTrends: calculateMetricTrends(safeUserData, 7, 7),
      metricExtremes: identifyMetricExtremes(safeUserData, 7),
      streakPhaseAverages: calculateStreakPhaseAverages(safeUserData),
      metricCorrelations: calculateMetricCorrelations(safeUserData),
      growthRates: calculateGrowthRates(safeUserData, 30),
      relapsePatterns: generateRelapsePatternAnalysis(safeUserData),
      daysSinceLastRelapse: calculateDaysSinceLastRelapse(safeUserData),
      phaseInfo: getPhaseInfo(safeUserData.currentStreak || 0)
    };
  }, [safeUserData, selectedMetric, isPremium]);

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
            label: (ctx) => ctx.parsed.y === null ? '' : `${ctx.parsed.y}`
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
  const handleMilestoneClick = (milestone) => { if (milestone.earned) { setSelectedMilestone(milestone); setShowMilestoneModal(true); } };

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
    if (!isPremium || !memoizedInsights.metricTrends?.[selectedMetric]) return null;
    return memoizedInsights.metricTrends[selectedMetric];
  }, [isPremium, memoizedInsights.metricTrends, selectedMetric]);

  // Numbers grid helper — get directional tint class
  const getNumberTintClass = (metric) => {
    if (!memoizedInsights.metricTrends?.[metric]) return '';
    const { direction } = memoizedInsights.metricTrends[metric];
    if (direction === 'up') return 'num-cell-up';
    if (direction === 'down') return 'num-cell-down';
    return '';
  };

  // Phase info for progress bar
  const phaseInfo = memoizedInsights.phaseInfo || getPhaseInfo(safeUserData.currentStreak || 0);

  // Oracle insight — contextual, reacts to weakest metric
  const oracleInsight = useMemo(() => {
    if (!isPremium || !memoizedInsights.metricExtremes?.growthArea) return null;
    const weak = memoizedInsights.metricExtremes.growthArea;
    const trend = memoizedInsights.metricTrends?.[weak.metric];
    const delta = trend?.delta || 0;
    const name = metricDisplayName[weak.metric] || weak.metric;
    if (delta < 0) {
      return { title: `${name} dropped ${Math.abs(delta)} this week`, body: `Common during ${phaseInfo.name.toLowerCase()} phase. Your other metrics are climbing — this typically corrects within 7-10 days.` };
    }
    return { title: `${name} is your growth area`, body: `Currently averaging ${weak.value?.toFixed(1) || '—'}/10. Focus transmutation practices here to bring it in line with your stronger metrics.` };
  }, [isPremium, memoizedInsights, phaseInfo]);

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
    <div className={`stats-page ${activeView === 'timeline' ? 'stats-view-timeline' : 'stats-view-analytics'}`}>
      {/* ====== STICKY HEADER — mirrors Calendar header exactly ====== */}
      <div className="stats-header-sticky">
        <div className="stats-header-row">
          <span className="stats-header-title">Your Stats</span>
          <div className="stats-view-toggle">
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

          {/* ---- NUMBERS GRID: 3×2 with directional tints ---- */}
          {isPremium && memoizedInsights.metricAverages && (
            <div className="numbers-grid-v2">
              <div className="numbers-grid-top">
                {['energy', 'focus', 'confidence', 'aura', 'sleep', 'workout'].map(metric => {
                  const val = memoizedInsights.metricAverages?.averages?.[metric]?.value;
                  const trend = memoizedInsights.metricTrends?.[metric];
                  return (
                    <div key={metric} className={`num-cell ${trend ? getNumberTintClass(metric) : ''}`}>
                      <span className="num-cell-value">{val ? val.toFixed(1) : '—'}</span>
                      <span className="num-cell-label">{metricDisplayName[metric]}</span>
                      {trend && trend.direction !== 'stable' && (
                        <span className={`num-cell-delta ${trend.direction === 'up' ? 'delta-up' : 'delta-down'}`}>
                          {trend.direction === 'up' ? '+' : ''}{trend.delta}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
              {memoizedInsights.metricExtremes?.strongest && memoizedInsights.metricExtremes?.growthArea && (
                <div className="numbers-grid-extremes">
                  <div className="num-extreme-cell">
                    <span className="num-extreme-label">Strongest</span>
                    <span className="num-extreme-value">{metricDisplayName[memoizedInsights.metricExtremes.strongest.metric]}</span>
                  </div>
                  <div className="num-extreme-cell">
                    <span className="num-extreme-label">Growth Area</span>
                    <span className="num-extreme-value">{metricDisplayName[memoizedInsights.metricExtremes.growthArea.metric]}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Free user — simple phase + upgrade */}
          {!isPremium && (
            <div className="numbers-grid-v2">
              <div className="numbers-grid-top" style={{ gridTemplateColumns: '1fr' }}>
                <div className="num-cell" style={{ padding: '16px' }}>
                  <span className="num-cell-label" style={{ marginBottom: '4px' }}>Day {safeUserData.currentStreak || 0} · {phaseInfo.name}</span>
                  <button className="stats-upgrade-btn" onClick={openPlanModal}>Unlock detailed analytics</button>
                </div>
              </div>
            </div>
          )}

          {/* ---- ORACLE INSIGHT — contextual single card ---- */}
          {isPremium && oracleInsight && (
            <div className="oracle-insight-card">
              <span className="oracle-insight-title">{oracleInsight.title}</span>
              <span className="oracle-insight-body">{oracleInsight.body}</span>
            </div>
          )}

          {/* ---- FOOTER ACTIONS: milestones + reset ---- */}
          <div className="stats-footer-row">
            <button className="stats-footer-btn" onClick={() => setShowMilestonesSheet(true)}>
              Milestones
            </button>
            <span className="stats-footer-div" />
            <button className="stats-footer-btn" onClick={() => setShowResetStreakModal(true)}>
              Reset
            </button>
          </div>

        </div>

        {/* ====== PREMIUM ANALYTICS — below the fold, scrollable ====== */}
        {isPremium && (
          <div className="stats-premium-stack">
            <div className="analytics-stack">
              <YourPatterns
                streakPhaseAverages={memoizedInsights.streakPhaseAverages}
                metricCorrelations={memoizedInsights.metricCorrelations}
                growthRates={memoizedInsights.growthRates}
                selectedMetric={selectedMetric}
                daysTracked={daysTracked}
                isLoading={loadingStates.patterns}
              />
              <AIInsights
                mlPatterns={mlPatterns}
                mlOptimization={mlOptimization}
                daysTracked={daysTracked}
                relapseCount={relapseCount}
                isLoading={loadingStates.ai}
              />
              <RelapseAnalytics
                relapsePatterns={memoizedInsights.relapsePatterns}
                daysSinceLastRelapse={memoizedInsights.daysSinceLastRelapse}
                isLoading={loadingStates.relapse}
              />
            </div>
          </div>
        )}

        {/* Free user upgrade nudge */}
        {!isPremium && (
          <div className="stats-premium-stack" style={{ textAlign: 'center' }}>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: '16px' }}>Unlock detailed analytics and personalized optimization</p>
            <button className="btn-primary" onClick={openPlanModal}>Upgrade to Premium</button>
          </div>
        )}
      </>
      )}

    </div>

    {/* ====== ALL MODALS/SHEETS RENDER OUTSIDE stats-page so overflow:auto doesn't trap them ====== */}

    <StatCardModal
      showModal={showStatModal}
      selectedStatCard={selectedStatCard}
      onClose={() => setShowStatModal(false)}
      userData={safeUserData}
    />

    {/* MILESTONES SHEET */}
    {showMilestonesSheet && (
        <div className={`sheet-backdrop${sheetReady ? ' open' : ''}`} onClick={() => closeSheet(() => setShowMilestonesSheet(false))}>
          <div ref={sheetPanelRef} className={`sheet-panel stats-sheet${sheetReady ? ' open' : ''}`} onClick={e => e.stopPropagation()}>
            <div className="sheet-header" />
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
                      onClick={() => { if (m.earned) { setShowMilestonesSheet(false); handleMilestoneClick(m); } }}
                      disabled={!m.earned}
                    >
                      <span className="milestone-num">{m.days}</span>
                      <span className="milestone-label">{m.label}</span>
                    </button>
                  );
                })}
              </div>
              {isPremium && <ShareCard userData={safeUserData} isVisible={true} />}
              <button className="btn-ghost" onClick={() => closeSheet(() => setShowMilestonesSheet(false))}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* ====== MILESTONE DETAIL MODAL ====== */}
      {showMilestoneModal && selectedMilestone && (
        <div className={`sheet-backdrop${sheetReady ? ' open' : ''}`} onClick={() => closeSheet(() => { setShowMilestoneModal(false); setSelectedMilestone(null); })}>
          <div ref={sheetPanelRef} className={`sheet-panel stats-sheet${sheetReady ? ' open' : ''}`} onClick={e => e.stopPropagation()}>
            <div className="sheet-header" />
            <div className="modal" style={{ animation: 'none' }}>
              <span className="modal-num">{selectedMilestone.days}</span>
              <h2>{selectedMilestone.label}</h2>
              {selectedMilestone.date && (
                <p className="modal-date">Reached {format(new Date(selectedMilestone.date), 'MMMM d, yyyy')}</p>
              )}
              <p className="modal-text">
                {(safeUserData.currentStreak || 0) >= selectedMilestone.days ? (
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
                    {selectedMilestone.days === 7 && "You've built the foundation before. Build it again."}
                    {selectedMilestone.days === 14 && "Two weeks is in your wheelhouse. Reclaim it."}
                    {selectedMilestone.days === 30 && "You've proven you can do this. Now do it again."}
                    {selectedMilestone.days === 90 && "You've rewired once. The path is familiar."}
                    {selectedMilestone.days === 180 && "Six months was yours. Take it back."}
                    {selectedMilestone.days === 365 && "A year lives in you. Rise again."}
                  </>
                )}
              </p>
              <button className="btn-ghost" onClick={() => closeSheet(() => { setShowMilestoneModal(false); setSelectedMilestone(null); })}>Close</button>
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
              <div style={{ marginTop: '12px' }}>
                <button className="reset-all-link" onClick={() => { setShowResetStreakModal(false); setShowResetAllModal(true); }}>
                  Reset all data
                </button>
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
    </>
  );
};

export default Stats;
