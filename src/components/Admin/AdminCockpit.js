// src/components/Admin/AdminCockpit.js
// TitanTrack Admin — Elite branded dashboard
// 5 tabs: Overview · Intelligence · Users · Revenue · Oracle

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import KnowledgeBase from './KnowledgeBase';
import OracleHealth from './OracleHealth';
import RevenueCard from './RevenueCard';
import OracleIntelligence from './OracleIntelligence';
import './AdminCockpit.css';

const API = process.env.REACT_APP_API || process.env.REACT_APP_API_URL || 'https://rossbased-app.onrender.com';

// ============================================================
// METRIC EXPLAINERS
// ============================================================
const EXPLAIN = {
  activation: { w: 'What % of signups actually logged their first benefit entry.', y: 'If someone signs up and never logs, the app failed. Nothing else matters if people don\'t get past this gate.', b: '40%+ solid. Below 25% = onboarding needs work.' },
  d7: { w: 'Of activated users, what % were still logging 7 days later.', y: 'A full week = habit formed. THE metric that separates apps that grow from apps that die.', b: '25%+ good. 40%+ = something special.' },
  premium: { w: 'What % of all users have active access — grandfathered, paying, or on trial.', y: 'Right now most users are grandfathered OGs. This metric becomes critical post-launch when new users need to convert to paid.', b: 'Pre-launch: high is expected. Post-launch: 5-10% paid conversion is typical.' },
  stickiness: { w: 'Daily active ÷ monthly active. How often people come back.', y: 'A daily logging app NEEDS high stickiness. 20% = ~6 days/month. You want daily.', b: '20%+ good. 40%+ elite. Below 15% = forgotten.' },
  features: { w: 'What % of users have used each feature at least once.', y: 'Below 10% adoption = users can\'t find it, don\'t get it, or don\'t want it.' },
  distribution: { w: 'Where your users are on their current streak right now.', y: 'Most at Day 0-7 = fast churn. Spread across ranges = long-term engagement.' },
  danger: { w: 'Which streak day ranges see the most relapses.', y: 'Where to intervene. If Day 8-14 is the spike, push notifications + toolkit prompts there.' },
  triggers: { w: 'Self-reported relapse reasons, ranked.', y: 'If "boredom" is #1, maybe build a boredom-specific toolkit.' },
  retention: { w: 'Of activated users, how many are still active after N days.', y: 'Steep drop = weak first impression. Flat after D7 = strong habit. Flatter = better.' },
  activity: { w: 'DAU = users active today. WAU = active this week. MAU = active this month.', y: 'Shows how many people actually open the app. If DAU is low but MAU is high, users come back occasionally but not daily.' },
};

// ============================================================
// NAV ICONS (inline SVG)
// ============================================================
const NavIcon = ({ id }) => {
  const s = { width: 14, height: 14, fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' };
  switch (id) {
    case 'overview': return <svg viewBox="0 0 24 24" {...s}><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>;
    case 'intelligence': return <svg viewBox="0 0 24 24" {...s}><path d="M12 2a7 7 0 0 1 7 7c0 2.38-1.19 4.47-3 5.74V17a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2v-2.26C6.19 13.47 5 11.38 5 9a7 7 0 0 1 7-7z"/><line x1="10" y1="22" x2="14" y2="22"/></svg>;
    case 'users': return <svg viewBox="0 0 24 24" {...s}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>;
    case 'revenue': return <svg viewBox="0 0 24 24" {...s}><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>;
    case 'oracle': return <svg viewBox="0 0 24 24" {...s}><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>;
    default: return null;
  }
};

// ============================================================
// SVG CHART COMPONENTS
// ============================================================

const Sparkline = ({ data, width = 400, height = 80 }) => {
  if (!data?.length) return null;
  const max = Math.max(...data.map(d => d.count), 1);
  const chartH = height - 18;
  const step = width / Math.max(data.length - 1, 1);
  const points = data.map((d, i) => `${i * step},${chartH - (d.count / max) * (chartH - 8) - 4}`).join(' ');
  const areaPoints = `0,${chartH} ${points} ${(data.length - 1) * step},${chartH}`;
  const labelIdxs = [0, Math.floor(data.length / 2), data.length - 1];
  const fmtDate = (d) => { const p = (d._id || d.date || '').split('-'); return p.length === 3 ? `${parseInt(p[1])}/${parseInt(p[2])}` : ''; };
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="ac-sparkline-svg" preserveAspectRatio="none">
      <defs>
        <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(255,255,255,0.08)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0)" />
        </linearGradient>
      </defs>
      <polygon points={areaPoints} fill="url(#sparkGrad)" />
      <polyline points={points} fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
      <text x="2" y="10" fill="rgba(255,255,255,0.25)" fontSize="9" fontWeight="600">{max}</text>
      {labelIdxs.filter((v,i,a) => a.indexOf(v) === i).map(idx => (
        <text key={idx} x={idx * step} y={height} textAnchor={idx === 0 ? 'start' : idx === data.length - 1 ? 'end' : 'middle'} fill="rgba(255,255,255,0.18)" fontSize="8" fontWeight="500">{fmtDate(data[idx])}</text>
      ))}
    </svg>
  );
};

const HBar = ({ data, labelKey, valueKey }) => {
  if (!data?.length) return null;
  const max = Math.max(...data.map(d => d[valueKey] || 0), 1);
  return (
    <div className="ac-hbar">
      {data.map((item, i) => (
        <div key={i} className="ac-hbar-row">
          <div className="ac-hbar-top">
            <span className="ac-hbar-label">{item[labelKey]}</span>
            <span className="ac-hbar-val">{item[valueKey]}</span>
          </div>
          <div className="ac-hbar-track">
            <div className="ac-hbar-fill" style={{ width: `${Math.max((item[valueKey] / max) * 100, 2)}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
};

const RetentionChart = ({ data }) => {
  if (!data) return null;
  const points = [
    { label: 'D1', rate: data.d1?.rate },
    { label: 'D3', rate: data.d3?.rate },
    { label: 'D7', rate: data.d7?.rate },
    { label: 'D14', rate: data.d14?.rate },
    { label: 'D30', rate: data.d30?.rate },
  ].filter(p => p.rate !== undefined && p.rate !== null);
  if (!points.length) return <p className="ac-empty-msg">Not enough data for a retention curve yet.</p>;
  const W = 380, H = 160, PAD = 38, PADB = 22;
  const cW = W - PAD * 2, cH = H - PAD - PADB;
  const xStep = cW / Math.max(points.length - 1, 1);
  const pathPts = points.map((p, i) => `${PAD + i * xStep},${PAD + cH - (p.rate / 100) * cH}`);
  const line = 'M' + pathPts.join(' L');
  const area = `M${PAD},${PAD + cH} L${pathPts.join(' L')} L${PAD + (points.length - 1) * xStep},${PAD + cH} Z`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="ac-retention-svg">
      <defs><linearGradient id="retGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="rgba(255,255,255,0.06)" /><stop offset="100%" stopColor="rgba(255,255,255,0)" /></linearGradient></defs>
      <line x1={PAD} y1={PAD} x2={PAD} y2={PAD + cH} stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
      <line x1={PAD} y1={PAD + cH} x2={PAD + cW} y2={PAD + cH} stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
      {[0, 25, 50, 75, 100].map(v => (<g key={v}><line x1={PAD} y1={PAD + cH - (v / 100) * cH} x2={PAD + cW} y2={PAD + cH - (v / 100) * cH} stroke="rgba(255,255,255,0.03)" strokeWidth="1" /><text x={PAD - 6} y={PAD + cH - (v / 100) * cH + 3} textAnchor="end" fill="rgba(255,255,255,0.15)" fontSize="8" fontWeight="600">{v}%</text></g>))}
      <path d={area} fill="url(#retGrad)" />
      <path d={line} fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      {points.map((p, i) => (<g key={i}><circle cx={PAD + i * xStep} cy={PAD + cH - (p.rate / 100) * cH} r="3.5" fill="#0a0a0b" stroke="rgba(255,255,255,0.5)" strokeWidth="2" /><text x={PAD + i * xStep} y={H - 4} textAnchor="middle" fill="rgba(255,255,255,0.25)" fontSize="9" fontWeight="600">{p.label}</text><text x={PAD + i * xStep} y={PAD + cH - (p.rate / 100) * cH - 10} textAnchor="middle" fill="rgba(255,255,255,0.6)" fontSize="9" fontWeight="700">{p.rate}%</text></g>))}
    </svg>
  );
};

// ============================================================
// MAIN COMPONENT
// ============================================================
const AdminCockpit = () => {
  const [tab, setTab] = useState('overview');
  const [intelSection, setIntelSection] = useState('features');
  const [expandedInfo, setExpandedInfo] = useState(null);
  const [userSearch, setUserSearch] = useState('');

  const [overview, setOverview] = useState(null);
  const [engagement, setEngagement] = useState(null);
  const [streaks, setStreaks] = useState(null);
  const [retention, setRetention] = useState(null);
  const [users, setUsers] = useState(null);
  const [behavior, setBehavior] = useState(null);
  const [checkins, setCheckins] = useState(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshDone, setRefreshDone] = useState(false);
  const [authError, setAuthError] = useState(null);
  const [lastRefresh, setLastRefresh] = useState(null);
  const [oracleStatus, setOracleStatus] = useState({ status: 'checking', latency: null });

  const fetchData = useCallback(async (endpoint, setter) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API}${endpoint}`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.status === 401 || res.status === 403) { setAuthError('Not authorized'); return; }
      if (res.ok) { const data = await res.json(); setter(data); }
    } catch (e) { console.error(`Admin fetch ${endpoint}:`, e); }
  }, []);

  const loadAll = useCallback(async () => {
    await Promise.all([
      fetchData('/api/analytics/overview', setOverview),
      fetchData('/api/analytics/engagement', setEngagement),
      fetchData('/api/analytics/streaks', setStreaks),
      fetchData('/api/analytics/retention', setRetention),
      fetchData('/api/analytics/users', setUsers),
      fetchData('/api/analytics/behavior', setBehavior),
      fetchData('/api/analytics/checkins', setCheckins),
    ]);
    setLastRefresh(new Date());
    setLoading(false);
  }, [fetchData]);

  useEffect(() => { loadAll(); }, [loadAll]);
  useEffect(() => {
    const interval = setInterval(() => loadAll(), 60000);
    return () => clearInterval(interval);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Oracle health check — pings backend when Oracle tab is active
  useEffect(() => {
    if (tab !== 'oracle') return;
    const checkOracle = async () => {
      setOracleStatus({ status: 'checking', latency: null });
      try {
        const token = localStorage.getItem('token');
        const start = Date.now();
        const res = await fetch(`${API}/api/analytics/overview`, {
          headers: { Authorization: `Bearer ${token}` },
          signal: AbortSignal.timeout(8000),
        });
        const latency = Date.now() - start;
        if (res.ok) {
          if (latency > 4000) setOracleStatus({ status: 'slow', latency });
          else setOracleStatus({ status: 'operational', latency });
        } else {
          setOracleStatus({ status: 'down', latency: null });
        }
      } catch {
        setOracleStatus({ status: 'down', latency: null });
      }
    };
    checkOracle();
  }, [tab]);

  // Computed
  const stickiness = overview?.dau > 0 && overview?.mau > 0 ? Math.round((overview.dau / overview.mau) * 100) : 0;
  const d7Rate = retention?.retention?.d7?.rate || 0;
  const activationRate = retention?.activationRate || overview?.logRate || 0;
  const premiumRate = overview?.premiumRate || 0;

  // Online count
  const onlineCount = useMemo(() => {
    if (!users?.users) return 0;
    const tenMinAgo = Date.now() - 10 * 60 * 1000;
    return users.users.filter(u => u.lastActive && new Date(u.lastActive).getTime() > tenMinAgo).length;
  }, [users]);

  // Column sort state
  const [sortCol, setSortCol] = useState('joined');
  const [sortDir, setSortDir] = useState('desc');
  const handleColSort = (col) => {
    if (sortCol === col) { setSortDir(sortDir === 'desc' ? 'asc' : 'desc'); }
    else { setSortCol(col); setSortDir('desc'); }
  };

  const sortedUsers = useMemo(() => {
    if (!users?.users) return [];
    let filtered = [...users.users];
    if (userSearch.trim()) {
      const q = userSearch.toLowerCase();
      filtered = filtered.filter(u =>
        (u.username || '').toLowerCase().includes(q) ||
        (u.discord || '').toLowerCase().includes(q) ||
        (u.email || '').toLowerCase().includes(q)
      );
    }
    return filtered.sort((a, b) => {
      const dir = sortDir === 'desc' ? -1 : 1;
      const map = {
        user: () => (a.username || '').localeCompare(b.username || '') * dir,
        streak: () => ((a.currentStreak || 0) - (b.currentStreak || 0)) * dir,
        logs: () => ((a.totalLogs || 0) - (b.totalLogs || 0)) * dir,
        ai: () => ((a.aiMessages || 0) - (b.aiMessages || 0)) * dir,
        joined: () => (new Date(a.joinedAt || 0) - new Date(b.joinedAt || 0)) * dir,
        active: () => (new Date(a.lastActive || 0) - new Date(b.lastActive || 0)) * dir,
      };
      return (map[sortCol] || map.joined)();
    });
  }, [users, userSearch, sortCol, sortDir]);

  const health = (metric, val) => {
    const thresholds = { activation: [40, 25], d7: [40, 25], premium: [10, 5], stickiness: [40, 20] };
    const [g, o] = thresholds[metric] || [50, 25];
    return val >= g ? 'good' : val >= o ? 'ok' : 'low';
  };

  const Info = ({ id }) => (
    <button className={`ac-info ${expandedInfo === id ? 'on' : ''}`}
      onClick={e => { e.stopPropagation(); setExpandedInfo(expandedInfo === id ? null : id); }}>?</button>
  );

  const Tip = ({ id }) => {
    const d = EXPLAIN[id];
    if (!d || expandedInfo !== id) return null;
    return (
      <div className="ac-tip" onClick={() => setExpandedInfo(null)}>
        <p className="ac-tip-what">{d.w}</p>
        {d.y && <p className="ac-tip-why">{d.y}</p>}
        {d.b && <p className="ac-tip-bench">{d.b}</p>}
      </div>
    );
  };

  const formatDate = d => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' }) : '—';
  const timeAgo = d => {
    if (!d) return '—';
    const m = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
    if (m < 60) return `${m}m`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h`;
    return `${Math.floor(h / 24)}d`;
  };

  if (authError) return <div className="ac-wrap"><div className="ac-error">{authError}</div></div>;
  if (loading) return (
    <div className="ac-wrap">
      <div className="ac-loading">
        <img src="/tt-icon-white.png" alt="TitanTrack" className="ac-loading-brand-img" />
        <div className="ac-loader" />
        <span>Loading admin...</span>
      </div>
    </div>
  );

  return (
    <div className="ac-wrap">
      {/* ===== BRANDED HEADER ===== */}
      <div className="ac-header">
        <div className="ac-header-top">
          <div className="ac-brand">
            <img src="/tt-icon-white.png" alt="TitanTrack" className="ac-brand-icon" />
            <span className="ac-brand-chip">ADMIN</span>
          </div>
          <div className="ac-header-right">
            {lastRefresh && (
              <span className="ac-header-time">{lastRefresh.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            )}
            <button className={`ac-refresh ${refreshing ? 'spinning' : refreshDone ? 'done' : ''}`} onClick={() => {
              if (refreshing) return;
              setRefreshing(true);
              setRefreshDone(false);
              Promise.all([loadAll(), new Promise(r => setTimeout(r, 800))]).then(() => {
                setRefreshing(false);
                setRefreshDone(true);
                setTimeout(() => setRefreshDone(false), 1200);
              });
            }} title="Refresh all data">
              {refreshDone ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
              )}
            </button>
          </div>
        </div>

        {/* Persistent KPI Strip */}
        {overview && (
          <div className="ac-kpi-strip">
            <div className="ac-kpi">
              <span className="ac-kpi-val">{overview.totalUsers}</span>
              <span className="ac-kpi-label">Users</span>
            </div>
            <div className="ac-kpi-divider" />
            {onlineCount > 0 && (
              <>
                <div className="ac-kpi ac-kpi-live">
                  <span className="ac-kpi-val"><span className="ac-kpi-dot" />{onlineCount}</span>
                  <span className="ac-kpi-label">Live</span>
                </div>
                <div className="ac-kpi-divider" />
              </>
            )}
            <div className="ac-kpi">
              <span className="ac-kpi-val">{overview.dau}</span>
              <span className="ac-kpi-label">DAU</span>
            </div>
            <div className="ac-kpi-divider" />
            <div className="ac-kpi">
              <span className="ac-kpi-val">{activationRate}%</span>
              <span className="ac-kpi-label">Activation</span>
            </div>
            <div className="ac-kpi-divider" />
            <div className="ac-kpi">
              <span className="ac-kpi-val">{d7Rate}%</span>
              <span className="ac-kpi-label">D7</span>
            </div>
            <div className="ac-kpi-divider" />
            <div className="ac-kpi">
              <span className="ac-kpi-val">{stickiness > 0 ? `${stickiness}%` : '—'}</span>
              <span className="ac-kpi-label">Sticky</span>
            </div>
          </div>
        )}
      </div>

      {/* ===== NAV WITH ICONS ===== */}
      <div className="ac-nav">
        {[
          { id: 'overview', label: 'Overview' },
          { id: 'intelligence', label: 'Intel' },
          { id: 'users', label: 'Users' },
          { id: 'revenue', label: 'Revenue' },
          { id: 'oracle', label: 'Oracle' },
        ].map(t => (
          <button key={t.id} className={`ac-nav-btn ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>
            <span className="ac-nav-label">{t.label}</span>
          </button>
        ))}
      </div>

      {/* ===== OVERVIEW ===== */}
      {tab === 'overview' && overview && retention && (
        <div className="ac-section">
          <div className="ac-c4">
            {[
              { id: 'activation', rank: '01', val: `${activationRate}%`, label: 'Activation', detail: `${retention?.totalWithData || 0} of ${overview.totalUsers} signed up → logged`, metric: activationRate },
              { id: 'd7', rank: '02', val: `${d7Rate}%`, label: 'D7 Retention', detail: `${retention?.retention?.d7?.count || 0} still active after 7d`, metric: d7Rate },
              { id: 'premium', rank: '03', val: `${premiumRate}%`, label: 'Access Rate', detail: `${overview.premiumUsers} of ${overview.totalUsers} with active access`, metric: premiumRate },
              { id: 'stickiness', rank: '04', val: stickiness > 0 ? `${stickiness}%` : '—', label: 'DAU / MAU', detail: `${overview.dau} daily ÷ ${overview.mau} monthly`, metric: stickiness },
            ].map(c => (
              <div key={c.id} className={`ac-c4-card ac-h-${health(c.id, c.metric)}`}>
                <div className="ac-c4-top"><span className="ac-c4-rank">{c.rank}</span><Info id={c.id} /></div>
                <span className="ac-c4-val">{c.val}</span>
                <span className="ac-c4-label">{c.label}</span>
                <span className="ac-c4-detail">{c.detail}</span>
                <Tip id={c.id} />
              </div>
            ))}
          </div>

          <div className="ac-card">
            <div className="ac-card-head"><h3>Retention Curve</h3><Info id="retention" /></div>
            <Tip id="retention" />
            <p className="ac-card-sub">{retention?.totalWithData || 0} activated users</p>
            <RetentionChart data={retention?.retention} />
          </div>

          <div className="ac-row-2">
            <div className="ac-card ac-card-compact">
              <div className="ac-card-title-row">
                <h3 className="ac-card-title-sm">Active Users</h3>
                <Info id="activity" />
              </div>
              <Tip id="activity" />
              <div className="ac-activity">
                {[{ v: overview.dau, l: 'DAU' }, { v: overview.wau, l: 'WAU' }, { v: overview.mau, l: 'MAU' }].map((a, i) => (
                  <div key={i} className="ac-act-item">
                    <span className="ac-act-num">{a.v}</span>
                    <span className="ac-act-label">{a.l}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="ac-card ac-card-compact">
              <div className="ac-card-title-row">
                <h3 className="ac-card-title-sm">Growth</h3>
                <span className={`ac-growth-badge ${overview.growthRate > 0 ? 'up' : overview.growthRate < 0 ? 'down' : ''}`}>
                  {overview.growthRate > 0 ? '+' : ''}{overview.growthRate}%
                </span>
              </div>
              <div className="ac-growth-nums">
                <span>+{overview.signupsToday} today</span>
                <span>+{overview.signupsThisWeek} week</span>
                <span>+{overview.signupsThisMonth} month</span>
              </div>
            </div>
          </div>

          {overview.signupTrend?.length > 1 && (
            <div className="ac-card">
              <h3 className="ac-card-title-sm">Signups · 30 Days</h3>
              <div className="ac-sparkline-wrap">
                <Sparkline data={overview.signupTrend} />
              </div>
            </div>
          )}

          <div className="ac-row-2">
            <div className="ac-card ac-card-compact">
              <h3 className="ac-card-title-sm">Real Users</h3>
              <span className="ac-big-num">{overview.engagedUsers || 0}</span>
              <span className="ac-big-sub">logged, tracked, or used AI at least once</span>
            </div>
            <div className="ac-card ac-card-compact">
              <h3 className="ac-card-title-sm">Ghost Accounts</h3>
              <span className="ac-big-num dim">{overview.ghostUsers || 0}</span>
              <span className="ac-big-sub">signed up but zero engagement</span>
            </div>
          </div>
        </div>
      )}

      {/* ===== INTELLIGENCE ===== */}
      {tab === 'intelligence' && (
        <div className="ac-section">
          <div className="ac-sub-nav">
            {[
              { id: 'features', label: 'Features' },
              { id: 'streaks', label: 'Streaks' },
              { id: 'checkins', label: 'Check-ins' },
              { id: 'behavior', label: 'Behavior' },
            ].map(s => (
              <button key={s.id} className={`ac-sub-btn ${intelSection === s.id ? 'active' : ''}`} onClick={() => setIntelSection(s.id)}>
                {s.label}
              </button>
            ))}
          </div>

          {intelSection === 'features' && engagement && streaks && (
            <>
              <div className="ac-card">
                <div className="ac-card-head"><h3>Feature Adoption</h3><Info id="features" /></div>
                <Tip id="features" />
                <p className="ac-card-sub">{engagement.totalUsers} users</p>
                <div className="ac-features">
                  {[
                    { name: 'Benefit Logs', u: engagement.features.benefitTracking.users, t: engagement.features.benefitTracking.totalLogs, tl: 'logs' },
                    { name: 'Emotional Timeline', u: engagement.features.emotionalTimeline.users, t: engagement.features.emotionalTimeline.totalLogs, tl: 'entries' },
                    { name: 'Urge Logging', u: engagement.features.urgeLogs.users, t: engagement.features.urgeLogs.totalLogs, tl: 'urges' },
                    { name: 'Urge Toolkit', u: engagement.features.urgeToolkit.users, t: engagement.features.urgeToolkit.totalUsage, tl: 'uses' },
                    { name: 'Journal', u: engagement.features.journal.users, t: engagement.features.journal.totalEntries, tl: 'entries' },
                    { name: 'AI Guide', u: engagement.features.aiGuide.users, t: engagement.features.aiGuide.totalMessages, tl: 'msgs' },
                    { name: 'Goals', u: engagement.features.goals.users, t: 0 },
                    { name: 'Leaderboard', u: engagement.features.leaderboard.users, t: 0 },
                  ].map((f, i) => {
                    const pct = engagement.totalUsers > 0 ? Math.round((f.u / engagement.totalUsers) * 100) : 0;
                    return (
                      <div key={i} className="ac-feat">
                        <div className="ac-feat-top">
                          <span className="ac-feat-name">{f.name}</span>
                          <span className="ac-feat-pct">{pct}%</span>
                        </div>
                        <div className="ac-feat-bar"><div className="ac-feat-fill" style={{ width: `${Math.min(pct, 100)}%` }} /></div>
                        <div className="ac-feat-meta">
                          <span>{f.u} users</span>
                          {f.t > 0 && <span>{f.t.toLocaleString()} {f.tl}</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              {streaks.topStreaks?.length > 0 && (
                <div className="ac-card">
                  <h3 className="ac-card-title-sm">Streak Leaders</h3>
                  <div className="ac-leaders">
                    {streaks.topStreaks.slice(0, 5).map((u, i) => (
                      <div key={i} className={`ac-leader ${i === 0 ? 'first' : ''}`}>
                        <span className="ac-leader-rank">#{i + 1}</span>
                        <span className="ac-leader-name">{u.username}</span>
                        <span className="ac-leader-stat">{u.longest}d</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {intelSection === 'streaks' && streaks && (
            <>
              <div className="ac-stat-row">
                {[
                  { l: 'Avg Streak', v: `${streaks.averageStreak}d` },
                  { l: 'Total Relapses', v: streaks.totalRelapses },
                  { l: 'Avg Before Fail', v: `${streaks.avgStreakBeforeRelapse}d` },
                  { l: 'Top Streak', v: streaks.topStreaks?.[0] ? `${streaks.topStreaks[0].longest}d` : '—', accent: true },
                ].map((s, i) => (
                  <div key={i} className={`ac-mini-stat ${s.accent ? 'accent' : ''}`}>
                    <span className="ac-ms-val">{s.v}</span>
                    <span className="ac-ms-label">{s.l}</span>
                  </div>
                ))}
              </div>
              {streaks.distribution?.length > 0 && (
                <div className="ac-card">
                  <div className="ac-card-head"><h3>Streak Distribution</h3><Info id="distribution" /></div>
                  <Tip id="distribution" />
                  <HBar data={streaks.distribution} labelKey="range" valueKey="count" />
                </div>
              )}
              {Object.keys(streaks.failureDays || {}).length > 0 && (
                <div className="ac-card">
                  <div className="ac-card-head"><h3>Danger Zones</h3><Info id="danger" /></div>
                  <Tip id="danger" />
                  <HBar data={Object.entries(streaks.failureDays).map(([r, c]) => ({ range: r, count: c }))} labelKey="range" valueKey="count" />
                </div>
              )}
              {streaks.topTriggers?.length > 0 && (
                <div className="ac-card">
                  <div className="ac-card-head"><h3>Top Triggers</h3><Info id="triggers" /></div>
                  <Tip id="triggers" />
                  <HBar data={streaks.topTriggers} labelKey="trigger" valueKey="count" />
                </div>
              )}
            </>
          )}

          {intelSection === 'checkins' && (
            <>
              {checkins ? (
                <>
                  <div className="ac-stat-row">
                    {[
                      { l: 'Active 7d', v: checkins.frequency.benefit.active7d },
                      { l: 'Active 7d', v: checkins.frequency.emotional.active7d },
                      { l: 'Avg Streak', v: `${checkins.streaks.avgConsecutive}d` },
                      { l: 'Stale Rate', v: `${checkins.dropOff.staleRate}%`, accent: checkins.dropOff.staleRate > 60 },
                    ].map((s, i) => (
                      <div key={i} className={`ac-mini-stat ${s.accent ? 'warn' : ''}`}>
                        <span className="ac-ms-val">{s.v}</span>
                        <span className="ac-ms-label">{s.l}</span>
                      </div>
                    ))}
                  </div>
                  <div className="ac-row-2">
                    <div className="ac-card ac-card-compact">
                      <h3 className="ac-card-title-sm">Benefit Check-ins</h3>
                      <div className="ac-ci-freq">
                        {[
                          { l: 'Active this week', v: checkins.frequency.benefit.active7d },
                          { l: 'Active this month', v: checkins.frequency.benefit.active30d },
                          { l: 'Logs this week', v: checkins.frequency.benefit.logsThisWeek },
                          { l: 'Avg logs/user/wk', v: checkins.frequency.avgBenefitLogsPerWeek },
                        ].map((r, i) => (
                          <div key={i} className="ac-ci-freq-row">
                            <span className="ac-ci-freq-label">{r.l}</span>
                            <span className="ac-ci-freq-val">{r.v}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="ac-card ac-card-compact">
                      <h3 className="ac-card-title-sm">Emotional Check-ins</h3>
                      <div className="ac-ci-freq">
                        {[
                          { l: 'Active this week', v: checkins.frequency.emotional.active7d },
                          { l: 'Active this month', v: checkins.frequency.emotional.active30d },
                          { l: 'Logs this week', v: checkins.frequency.emotional.logsThisWeek },
                          { l: 'Avg logs/user/wk', v: checkins.frequency.avgEmotionalLogsPerWeek },
                        ].map((r, i) => (
                          <div key={i} className="ac-ci-freq-row">
                            <span className="ac-ci-freq-label">{r.l}</span>
                            <span className="ac-ci-freq-val">{r.v}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  {checkins.dailyLogTrend?.length > 1 && (
                    <div className="ac-card">
                      <h3 className="ac-card-title-sm">Daily Check-ins · 14 Days</h3>
                      <div className="ac-ci-trend">
                        {checkins.dailyLogTrend.map((d, i) => {
                          const maxVal = Math.max(...checkins.dailyLogTrend.map(x => x.count), 1);
                          const bH = maxVal > 0 ? (d.benefits / maxVal) * 100 : 0;
                          const eH = maxVal > 0 ? (d.emotional / maxVal) * 100 : 0;
                          const dateLabel = d._id.split('-').slice(1).map(Number).join('/');
                          return (
                            <div key={i} className="ac-ci-trend-bar" title={`${dateLabel}: ${d.benefits} benefit, ${d.emotional} emotional`}>
                              <div className="ac-ci-trend-stack">
                                <div className="ac-ci-trend-fill benefit" style={{ height: `${Math.max(bH, d.benefits > 0 ? 4 : 0)}%` }} />
                                <div className="ac-ci-trend-fill emotional" style={{ height: `${Math.max(eH, d.emotional > 0 ? 4 : 0)}%` }} />
                              </div>
                              {(i === 0 || i === 6 || i === 13) && <span className="ac-ci-trend-label">{dateLabel}</span>}
                            </div>
                          );
                        })}
                      </div>
                      <div className="ac-ci-legend">
                        <span className="ac-ci-legend-item"><span className="ac-ci-dot benefit" />Benefits</span>
                        <span className="ac-ci-legend-item"><span className="ac-ci-dot emotional" />Emotional</span>
                      </div>
                    </div>
                  )}
                  <div className="ac-card">
                    <h3 className="ac-card-title-sm">Logging Streak Distribution</h3>
                    <p className="ac-card-sub">Longest consecutive days each user has logged ({checkins.streaks.totalTracked} users)</p>
                    <HBar data={checkins.streaks.distribution.filter(d => d.count > 0)} labelKey="range" valueKey="count" />
                  </div>
                  <div className="ac-card">
                    <h3 className="ac-card-title-sm">Check-in Quality</h3>
                    <p className="ac-card-sub">Are users moving sliders thoughtfully or slamming defaults? ({checkins.depth.totalAnalyzed} users with 3+ logs)</p>
                    {checkins.depth.totalAnalyzed > 0 ? (
                      <div className="ac-ci-depth">
                        {[
                          { label: 'Going through motions', count: checkins.depth.low, desc: 'Near-zero variation in scores', color: 'low' },
                          { label: 'Moderate effort', count: checkins.depth.medium, desc: 'Some slider movement', color: 'med' },
                          { label: 'Thoughtful tracking', count: checkins.depth.high, desc: 'Meaningful daily variation', color: 'high' },
                        ].map((d, i) => {
                          const pct = checkins.depth.totalAnalyzed > 0 ? Math.round((d.count / checkins.depth.totalAnalyzed) * 100) : 0;
                          return (
                            <div key={i} className="ac-ci-depth-row">
                              <div className="ac-ci-depth-top">
                                <span className="ac-ci-depth-label">{d.label}</span>
                                <span className="ac-ci-depth-pct">{pct}%</span>
                              </div>
                              <div className="ac-ci-depth-bar">
                                <div className={`ac-ci-depth-fill ${d.color}`} style={{ width: `${Math.max(pct, 2)}%` }} />
                              </div>
                              <div className="ac-ci-depth-meta">
                                <span>{d.count} users</span>
                                <span>{d.desc}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="ac-empty-msg">Need more data. At least 3 logs per user required.</p>
                    )}
                  </div>
                  <div className="ac-row-2">
                    <div className="ac-card ac-card-compact">
                      <h3 className="ac-card-title-sm">Still Active</h3>
                      <span className="ac-big-num">{checkins.dropOff.activeCheckers}</span>
                      <span className="ac-big-sub">logged in the last 3 days</span>
                    </div>
                    <div className="ac-card ac-card-compact">
                      <h3 className="ac-card-title-sm">Gone Quiet</h3>
                      <span className="ac-big-num dim">{checkins.dropOff.staleCheckers}</span>
                      <span className="ac-big-sub">haven't logged in 3+ days</span>
                    </div>
                  </div>
                  {checkins.dropOff.buckets?.filter(b => b.count > 0).length > 0 && (
                    <div className="ac-card">
                      <h3 className="ac-card-title-sm">Where They Dropped Off</h3>
                      <p className="ac-card-sub">How many logs users had before going silent</p>
                      <HBar data={checkins.dropOff.buckets.filter(b => b.count > 0)} labelKey="range" valueKey="count" />
                    </div>
                  )}
                </>
              ) : (
                <div className="ac-card"><p className="ac-empty-msg">Loading check-in data...</p></div>
              )}
            </>
          )}

          {intelSection === 'behavior' && (
            <>
              {behavior ? (
                <>
                  <div className="ac-stat-row">
                    {[
                      { l: 'Views Today', v: behavior.viewsToday },
                      { l: 'Sessions (7d)', v: behavior.totalSessions },
                      { l: 'Avg Duration', v: behavior.avgDuration > 0 ? `${behavior.avgDuration}m` : '—' },
                      { l: 'Pages / Session', v: behavior.avgPages > 0 ? behavior.avgPages : '—' },
                    ].map((s, i) => (
                      <div key={i} className="ac-mini-stat">
                        <span className="ac-ms-val">{s.v}</span>
                        <span className="ac-ms-label">{s.l}</span>
                      </div>
                    ))}
                  </div>
                  {behavior.topPages?.length > 0 && (
                    <div className="ac-card">
                      <div className="ac-card-head"><h3>Most Visited Pages</h3></div>
                      <p className="ac-card-sub">Last 30 days</p>
                      <HBar data={behavior.topPages.map(p => ({
                        page: p.page === '/' ? 'Home / Tracker' : p.page.replace(/^\//, '').replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
                        views: p.views
                      }))} labelKey="page" valueKey="views" />
                      <div className="ac-page-legend">
                        {behavior.topPages.slice(0, 5).map((p, i) => (
                          <span key={i} className="ac-page-users">{p.page === '/' ? 'Tracker' : p.page.replace(/^\//, '')} — {p.users} users</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {behavior.dailyTrend?.length > 1 && (
                    <div className="ac-card">
                      <h3 className="ac-card-title-sm">Page Views · 14 Days</h3>
                      <div className="ac-sparkline-wrap">
                        <Sparkline data={behavior.dailyTrend} />
                      </div>
                    </div>
                  )}
                  {behavior.hourlyActivity?.length > 0 && (
                    <div className="ac-card">
                      <h3 className="ac-card-title-sm">Peak Activity Hours (UTC)</h3>
                      <div className="ac-hours">
                        {Array.from({ length: 24 }, (_, h) => {
                          const match = behavior.hourlyActivity.find(a => a.hour === h);
                          const views = match?.views || 0;
                          const maxViews = Math.max(...behavior.hourlyActivity.map(a => a.views), 1);
                          const intensity = views / maxViews;
                          return (
                            <div key={h} className="ac-hour-block" title={`${h}:00 — ${views} views`}
                              style={{ opacity: 0.15 + intensity * 0.85 }}>
                              <div className="ac-hour-bar" style={{ height: `${Math.max(intensity * 100, 4)}%` }} />
                              {h % 6 === 0 && <span className="ac-hour-label">{h}</span>}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  {behavior.recentActivity?.length > 0 && (
                    <div className="ac-card">
                      <h3 className="ac-card-title-sm">Live Activity</h3>
                      <div className="ac-feed">
                        {behavior.recentActivity.map((a, i) => {
                          const pageName = a.page === '/' ? 'Tracker' : a.page.replace(/^\//, '').replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
                          const t = new Date(a.time);
                          const mins = Math.floor((Date.now() - t.getTime()) / 60000);
                          const timeStr = mins < 1 ? 'just now' : mins < 60 ? `${mins}m ago` : mins < 1440 ? `${Math.floor(mins/60)}h ago` : `${Math.floor(mins/1440)}d ago`;
                          return (
                            <div key={i} className="ac-feed-item">
                              <span className="ac-feed-user">{a.user}</span>
                              <span className="ac-feed-page">{pageName}</span>
                              <span className="ac-feed-time">{timeStr}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  {behavior.topPages?.length === 0 && behavior.totalSessions === 0 && (
                    <div className="ac-card"><p className="ac-empty-msg">No page view data yet.</p></div>
                  )}
                </>
              ) : (
                <div className="ac-card"><p className="ac-empty-msg">Loading behavior data...</p></div>
              )}
            </>
          )}
        </div>
      )}

      {/* ===== USERS ===== */}
      {tab === 'users' && users && (
        <div className="ac-section">
          <div className="ac-card">
            <div className="ac-users-head">
              <h3>{userSearch ? `${sortedUsers.length} of ${users.total}` : `${users.total} Users`}</h3>
              <div className="ac-users-search-wrap">
                <input type="text" className="ac-users-search" placeholder="Search users..." value={userSearch} onChange={e => setUserSearch(e.target.value)} />
                {userSearch && <button className="ac-users-clear" onClick={() => setUserSearch('')}>×</button>}
              </div>
            </div>
            <div className="ac-table-wrap">
              <table className="ac-table">
                <thead><tr>
                  {[
                    { id: 'user', label: 'User' },
                    { id: 'streak', label: 'Streak' },
                    { id: 'logs', label: 'Logs' },
                    { id: 'ai', label: 'AI' },
                    { id: 'sub', label: 'Sub', noSort: true },
                    { id: 'joined', label: 'Joined' },
                    { id: 'active', label: 'Active' },
                  ].map(col => (
                    <th key={col.id} className={col.noSort ? '' : 'ac-th-sort'} onClick={() => !col.noSort && handleColSort(col.id)}>
                      {col.label}{sortCol === col.id ? (sortDir === 'desc' ? ' ↓' : ' ↑') : ''}
                    </th>
                  ))}
                </tr></thead>
                <tbody>
                  {sortedUsers.map((u, i) => (
                    <tr key={i}>
                      <td><span className="ac-uname">{u.username}</span>{u.discord && <span className="ac-udiscord">{u.discord}</span>}</td>
                      <td><span className="ac-streak-pill">{u.currentStreak}d</span></td>
                      <td>{u.totalLogs}</td>
                      <td>{u.aiMessages}</td>
                      <td><span className={`ac-sub-badge ${u.subStatus}`}>{
                        u.subStatus === 'grandfathered' ? 'OG' :
                        u.subStatus === 'active' ? 'PRO' :
                        u.subStatus === 'trial' ? 'TRIAL' :
                        u.subStatus === 'canceled' ? 'END' :
                        u.subStatus === 'expired' ? 'EXP' : '—'
                      }</span></td>
                      <td className="ac-dim">{formatDate(u.joinedAt)}</td>
                      <td className="ac-dim">{(() => {
                        const ago = timeAgo(u.lastActive);
                        const isOnline = u.lastActive && (Date.now() - new Date(u.lastActive).getTime()) < 10 * 60 * 1000;
                        return isOnline ? <span className="ac-online-badge">now</span> : ago;
                      })()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ===== REVENUE ===== */}
      {tab === 'revenue' && (
        <div className="ac-section">
          <div className="ac-section-brand">
            <div className="ac-section-brand-icon ac-section-brand-revenue">$</div>
            <div className="ac-section-brand-text">
              <span className="ac-section-brand-title">Revenue</span>
              <span className="ac-section-brand-sub">TitanTrack monetization</span>
            </div>
          </div>
          <div className="ac-oracle-wrap">
            <RevenueCard />
          </div>
        </div>
      )}

      {/* ===== ORACLE ===== */}
      {tab === 'oracle' && (
        <div className="ac-section">
          <div className="ac-section-brand">
            <div className="ac-section-brand-icon ac-section-brand-oracle">
              <img src="/The_Oracle.png" alt="Oracle" className="ac-section-brand-logo" />
            </div>
            <div className="ac-section-brand-text">
              <span className="ac-section-brand-title">The Oracle</span>
              <span className="ac-section-brand-sub">AI system health & knowledge base</span>
            </div>
            <span className={`ac-oracle-status ac-oracle-status-${oracleStatus.status}`}>
              <span className="ac-oracle-status-dot" />
              {oracleStatus.status === 'checking' ? 'Checking...' :
               oracleStatus.status === 'operational' ? `Operational${oracleStatus.latency ? ` · ${oracleStatus.latency}ms` : ''}` :
               oracleStatus.status === 'slow' ? `Slow · ${oracleStatus.latency}ms` :
               'Down'}
            </span>
          </div>
          <div className="ac-oracle-wrap">
            <OracleHealth />
            <KnowledgeBase />
            <OracleIntelligence />
          </div>
        </div>
      )}

    </div>
  );
};

export default AdminCockpit;
