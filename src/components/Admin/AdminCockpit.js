// src/components/Admin/AdminCockpit.js
// Unified Admin Command Center — Analytics + Oracle Knowledge Base
// Custom SVG charts, Critical 4 hierarchy, real-time MongoDB data

import React, { useState, useEffect, useCallback } from 'react';
import KnowledgeBase from './KnowledgeBase';
import './AdminCockpit.css';

const API = process.env.REACT_APP_API || process.env.REACT_APP_API_URL || 'https://rossbased-app.onrender.com';

// ============================================================
// METRIC EXPLAINERS
// ============================================================
const EXPLAIN = {
  activation: { w: 'What % of signups actually logged their first benefit entry.', y: 'If someone signs up and never logs, the app failed. Nothing else matters if people don\'t get past this gate.', b: '40%+ solid. Below 25% = onboarding needs work.' },
  d7: { w: 'Of activated users, what % were still logging 7 days later.', y: 'A full week = habit formed. THE metric that separates apps that grow from apps that die.', b: '25%+ good. 40%+ = something special.' },
  premium: { w: 'What % of all users are paying subscribers.', y: 'Revenue engine. This number determines if TitanTrack is a business or a hobby.', b: '5-10% typical freemium. Your niche should push higher.' },
  stickiness: { w: 'Daily active ÷ monthly active. How often people come back.', y: 'A daily logging app NEEDS high stickiness. 20% = ~6 days/month. You want daily.', b: '20%+ good. 40%+ elite. Below 15% = forgotten.' },
  features: { w: 'What % of users have used each feature at least once.', y: 'Below 10% adoption = users can\'t find it, don\'t get it, or don\'t want it.' },
  distribution: { w: 'Where your users are on their current streak right now.', y: 'Most at Day 0-7 = fast churn. Spread across ranges = long-term engagement.' },
  danger: { w: 'Which streak day ranges see the most relapses.', y: 'Where to intervene. If Day 8-14 is the spike, push notifications + toolkit prompts there.' },
  triggers: { w: 'Self-reported relapse reasons, ranked.', y: 'If "boredom" is #1, maybe build a boredom-specific toolkit.' },
  retention: { w: 'Of activated users, how many are still active after N days.', y: 'Steep drop = weak first impression. Flat after D7 = strong habit. Flatter = better.' },
};

// ============================================================
// SVG CHART COMPONENTS
// ============================================================

// Mini sparkline — polyline
const Sparkline = ({ data, width = 400, height = 64 }) => {
  if (!data?.length) return null;
  const max = Math.max(...data.map(d => d.count), 1);
  const step = width / Math.max(data.length - 1, 1);
  const points = data.map((d, i) => `${i * step},${height - (d.count / max) * (height - 8) - 4}`).join(' ');
  const areaPoints = `0,${height} ${points} ${(data.length - 1) * step},${height}`;
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="ac-sparkline-svg" preserveAspectRatio="none">
      <polygon points={areaPoints} fill="url(#sparkGrad)" />
      <polyline points={points} fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
      <defs>
        <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(255,255,255,0.08)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0)" />
        </linearGradient>
      </defs>
    </svg>
  );
};

// Horizontal bar chart — SVG
const SVGBarChart = ({ data, labelKey, valueKey }) => {
  if (!data?.length) return null;
  const max = Math.max(...data.map(d => d[valueKey] || 0), 1);
  const barH = 22, gap = 6, labelW = 72, valueW = 40;
  const totalH = data.length * (barH + gap);
  return (
    <svg viewBox={`0 0 420 ${totalH}`} className="ac-barchart-svg">
      {data.map((item, i) => {
        const y = i * (barH + gap);
        const w = Math.max((item[valueKey] / max) * (420 - labelW - valueW - 16), 3);
        return (
          <g key={i}>
            <text x={labelW - 6} y={y + barH / 2 + 4} textAnchor="end" fill="rgba(255,255,255,0.35)" fontSize="11" fontWeight="600">{item[labelKey]}</text>
            <rect x={labelW} y={y + 2} width={420 - labelW - valueW - 16} height={barH - 4} rx="4" fill="rgba(255,255,255,0.03)" />
            <rect x={labelW} y={y + 2} width={w} height={barH - 4} rx="4" fill="rgba(255,255,255,0.12)" />
            <text x={420 - valueW + 4} y={y + barH / 2 + 4} fill="rgba(255,255,255,0.55)" fontSize="12" fontWeight="700">{item[valueKey]}</text>
          </g>
        );
      })}
    </svg>
  );
};

// Retention funnel — stepped bars
const RetentionChart = ({ data }) => {
  if (!data) return null;
  const labels = ['D1', 'D7', 'D14', 'D30', 'D60', 'D90'];
  const keys = ['d1', 'd7', 'd14', 'd30', 'd60', 'd90'];
  const barW = 48, gap = 8, chartH = 120, baseY = chartH + 16;
  const totalW = keys.length * (barW + gap);
  return (
    <svg viewBox={`0 0 ${totalW} ${baseY + 20}`} className="ac-retention-svg">
      {keys.map((key, i) => {
        const rate = data[key]?.rate || 0;
        const count = data[key]?.count || 0;
        const h = Math.max((rate / 100) * chartH, 3);
        const x = i * (barW + gap);
        const opacity = 0.08 + (rate / 100) * 0.2;
        return (
          <g key={key}>
            <rect x={x} y={baseY - chartH} width={barW} height={chartH} rx="5" fill="rgba(255,255,255,0.02)" />
            <rect x={x} y={baseY - h} width={barW} height={h} rx="5" fill={`rgba(255,255,255,${opacity})`} />
            <text x={x + barW / 2} y={baseY - h - 6} textAnchor="middle" fill="rgba(255,255,255,0.5)" fontSize="11" fontWeight="700">{rate}%</text>
            <text x={x + barW / 2} y={baseY + 14} textAnchor="middle" fill="rgba(255,255,255,0.25)" fontSize="10" fontWeight="600">{labels[i]}</text>
          </g>
        );
      })}
    </svg>
  );
};

// ============================================================
// MAIN COMPONENT
// ============================================================
const AdminCockpit = () => {
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [tab, setTab] = useState('dashboard');
  const [overview, setOverview] = useState(null);
  const [engagement, setEngagement] = useState(null);
  const [streaks, setStreaks] = useState(null);
  const [retention, setRetention] = useState(null);
  const [users, setUsers] = useState(null);
  const [userSort, setUserSort] = useState('recent');
  const [expandedInfo, setExpandedInfo] = useState(null);
  const [lastRefresh, setLastRefresh] = useState(null);

  const token = localStorage.getItem('token');
  const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };

  const fetchData = useCallback(async (endpoint) => {
    const res = await fetch(`${API}/api/analytics/${endpoint}`, { headers });
    if (res.status === 403) { setAuthError('Admin access required'); return null; }
    if (!res.ok) return null;
    return res.json();
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadAll = useCallback(async (sort = 'recent') => {
    setLoading(true);
    const [o, e, s, r, u] = await Promise.all([
      fetchData('overview'), fetchData('engagement'), fetchData('streaks'),
      fetchData('retention'), fetchData(`users?sort=${sort}&limit=50`)
    ]);
    if (o) setOverview(o);
    if (e) setEngagement(e);
    if (s) setStreaks(s);
    if (r) setRetention(r);
    if (u) setUsers(u);
    setLastRefresh(new Date());
    setLoading(false);
  }, [fetchData]);

  useEffect(() => { loadAll(); }, [loadAll]);
  useEffect(() => { if (!loading && tab === 'users') fetchData(`users?sort=${userSort}&limit=50`).then(d => d && setUsers(d)); }, [userSort]); // eslint-disable-line react-hooks/exhaustive-deps

  // Computed
  const stickiness = overview?.dau > 0 && overview?.mau > 0 ? Math.round((overview.dau / overview.mau) * 100) : 0;
  const d7Rate = retention?.retention?.d7?.rate || 0;
  const activationRate = retention?.activationRate || overview?.logRate || 0;
  const premiumRate = overview?.premiumRate || 0;

  const health = (metric, val) => {
    const thresholds = { activation: [40, 25], d7: [40, 25], premium: [10, 5], stickiness: [40, 20] };
    const [g, o] = thresholds[metric] || [50, 25];
    return val >= g ? 'good' : val >= o ? 'ok' : 'low';
  };

  // Info toggle
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

  const formatDate = d => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' }) : '\u2014';
  const timeAgo = d => {
    if (!d) return '\u2014';
    const m = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
    if (m < 60) return `${m}m`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h`;
    return `${Math.floor(h / 24)}d`;
  };

  if (authError) return <div className="ac-wrap"><div className="ac-error">{authError}</div></div>;
  if (loading) return <div className="ac-wrap"><div className="ac-loading"><div className="ac-loader" /><span>Loading command center...</span></div></div>;

  return (
    <div className="ac-wrap">
      {/* ===== HEADER ===== */}
      <div className="ac-header">
        <div>
          <h1 className="ac-title">Command Center</h1>
          {lastRefresh && <span className="ac-updated">Updated {lastRefresh.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>}
        </div>
        <button className="ac-refresh" onClick={() => loadAll(userSort)}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
        </button>
      </div>

      {/* ===== NAV ===== */}
      <div className="ac-nav">
        {[
          { id: 'dashboard', icon: '\u25A0', label: 'Dashboard' },
          { id: 'intelligence', icon: '\u25C6', label: 'Intelligence' },
          { id: 'users', icon: '\u25CB', label: 'Users' },
          { id: 'oracle', icon: '\u2726', label: 'Oracle' },
        ].map(t => (
          <button key={t.id} className={`ac-nav-btn ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>
            <span className="ac-nav-icon">{t.icon}</span>
            <span className="ac-nav-label">{t.label}</span>
          </button>
        ))}
      </div>

      {/* ===== DASHBOARD ===== */}
      {tab === 'dashboard' && overview && retention && (
        <div className="ac-section">
          <p className="ac-intro">These four metrics determine everything. Tap <span className="ac-q-inline">?</span> for context.</p>

          {/* Critical 4 */}
          <div className="ac-c4">
            {[
              { id: 'activation', rank: '01', val: `${activationRate}%`, label: 'Activation', detail: `${retention?.totalWithData || 0} of ${overview.totalUsers} signed up \u2192 logged`, metric: activationRate },
              { id: 'd7', rank: '02', val: `${d7Rate}%`, label: 'D7 Retention', detail: `${retention?.retention?.d7?.count || 0} still active after 7d`, metric: d7Rate },
              { id: 'premium', rank: '03', val: `${premiumRate}%`, label: 'Premium Rate', detail: `${overview.premiumUsers} of ${overview.totalUsers} paying`, metric: premiumRate },
              { id: 'stickiness', rank: '04', val: stickiness > 0 ? `${stickiness}%` : '\u2014', label: 'DAU / MAU', detail: `${overview.dau} daily \u00F7 ${overview.mau} monthly`, metric: stickiness },
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

          {/* Retention Curve */}
          <div className="ac-card">
            <div className="ac-card-head"><h3>Retention Curve</h3><Info id="retention" /></div>
            <Tip id="retention" />
            <p className="ac-card-sub">{retention?.totalWithData || 0} activated users</p>
            <RetentionChart data={retention?.retention} />
          </div>

          {/* Activity + Signup Trend */}
          <div className="ac-row-2">
            <div className="ac-card ac-card-compact">
              <h3 className="ac-card-title-sm">Active Users</h3>
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

          {/* Sparkline */}
          {overview.signupTrend?.length > 1 && (
            <div className="ac-card">
              <h3 className="ac-card-title-sm">Signups \u00B7 30 Days</h3>
              <div className="ac-sparkline-wrap">
                <Sparkline data={overview.signupTrend} />
              </div>
            </div>
          )}
        </div>
      )}

      {/* ===== INTELLIGENCE ===== */}
      {tab === 'intelligence' && engagement && streaks && (
        <div className="ac-section">
          <p className="ac-intro">What your users actually do, where they fail, and why. This tells you what to build next.</p>

          {/* Feature Adoption */}
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

          {/* Streak Stats */}
          <div className="ac-stat-row">
            {[
              { l: 'Avg Streak', v: `${streaks.averageStreak}d` },
              { l: 'Total Relapses', v: streaks.totalRelapses },
              { l: 'Avg Before Fail', v: `${streaks.avgStreakBeforeRelapse}d` },
              { l: 'Top Streak', v: streaks.topStreaks?.[0] ? `${streaks.topStreaks[0].longest}d` : '\u2014', accent: true },
            ].map((s, i) => (
              <div key={i} className={`ac-mini-stat ${s.accent ? 'accent' : ''}`}>
                <span className="ac-ms-val">{s.v}</span>
                <span className="ac-ms-label">{s.l}</span>
              </div>
            ))}
          </div>

          {/* Distribution */}
          {streaks.distribution?.length > 0 && (
            <div className="ac-card">
              <div className="ac-card-head"><h3>Streak Distribution</h3><Info id="distribution" /></div>
              <Tip id="distribution" />
              <SVGBarChart data={streaks.distribution} labelKey="range" valueKey="count" />
            </div>
          )}

          {/* Danger Zones */}
          {Object.keys(streaks.failureDays || {}).length > 0 && (
            <div className="ac-card">
              <div className="ac-card-head"><h3>Danger Zones</h3><Info id="danger" /></div>
              <Tip id="danger" />
              <SVGBarChart data={Object.entries(streaks.failureDays).map(([r, c]) => ({ range: r, count: c }))} labelKey="range" valueKey="count" />
            </div>
          )}

          {/* Triggers */}
          {streaks.topTriggers?.length > 0 && (
            <div className="ac-card">
              <div className="ac-card-head"><h3>Top Triggers</h3><Info id="triggers" /></div>
              <Tip id="triggers" />
              <SVGBarChart data={streaks.topTriggers} labelKey="trigger" valueKey="count" />
            </div>
          )}

          {/* Longest Streaks */}
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
        </div>
      )}

      {/* ===== USERS ===== */}
      {tab === 'users' && users && (
        <div className="ac-section">
          <div className="ac-card">
            <div className="ac-users-head">
              <h3>{users.total} Users</h3>
              <div className="ac-sort">
                {['recent', 'active', 'streak'].map(s => (
                  <button key={s} className={`ac-sort-btn ${userSort === s ? 'on' : ''}`} onClick={() => setUserSort(s)}>
                    {s === 'recent' ? 'Newest' : s === 'active' ? 'Active' : 'Streak'}
                  </button>
                ))}
              </div>
            </div>
            <div className="ac-table-wrap">
              <table className="ac-table">
                <thead><tr><th>User</th><th>Streak</th><th>Logs</th><th>AI</th><th>Pro</th><th>Joined</th><th>Active</th></tr></thead>
                <tbody>
                  {users.users.map((u, i) => (
                    <tr key={i}>
                      <td><span className="ac-uname">{u.username}</span>{u.discord && <span className="ac-udiscord">{u.discord}</span>}</td>
                      <td><span className="ac-streak-pill">{u.currentStreak}d</span></td>
                      <td>{u.totalLogs}</td>
                      <td>{u.aiMessages}</td>
                      <td><span className={`ac-dot ${u.isPremium ? 'on' : ''}`} /></td>
                      <td className="ac-dim">{formatDate(u.joinedAt)}</td>
                      <td className="ac-dim">{timeAgo(u.lastActive)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ===== ORACLE (Knowledge Base) ===== */}
      {tab === 'oracle' && (
        <div className="ac-oracle-wrap">
          <KnowledgeBase />
        </div>
      )}
    </div>
  );
};

export default AdminCockpit;
