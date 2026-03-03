// src/components/Admin/OracleHealth.js
// Oracle Sync Health Dashboard — lives inside AdminCockpit Oracle tab

import React, { useState, useEffect, useCallback } from 'react';
import './OracleHealth.css';

const API = process.env.REACT_APP_API || process.env.REACT_APP_API_URL || 'https://rossbased-app.onrender.com';

const OracleHealth = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showNotes, setShowNotes] = useState(false);
  const [showUsage, setShowUsage] = useState(false);

  const token = localStorage.getItem('token');

  const fetchHealth = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/admin/oracle-health`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch');
      const json = await res.json();
      setData(json);
      setError(null);
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  }, [token]);

  useEffect(() => { fetchHealth(); }, [fetchHealth]);

  // Auto-refresh every 30s
  useEffect(() => {
    const interval = setInterval(fetchHealth, 30000);
    return () => clearInterval(interval);
  }, [fetchHealth]);

  if (loading) {
    return (
      <div className="oh-loading">
        <div className="oh-loading-spinner" />
        <span>Loading Oracle health...</span>
      </div>
    );
  }

  if (error) {
    return <div className="oh-error">Failed to load Oracle health: {error}</div>;
  }

  if (!data) return null;

  const { users, memoryNotes, mlRisk, outcomes, communityPulse, health, recentNotes, oracleUsage } = data;

  const timeAgo = (dateStr) => {
    if (!dateStr) return '—';
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  };

  return (
    <div className="oh-container">
      {/* Header with sync status */}
      <div className="oh-header">
        <div className="oh-header-left">
          <h2 className="oh-title">Oracle Health</h2>
          <span className={`oh-status-badge ${health.syncStatus.includes('🟢') ? 'live' : health.syncStatus.includes('🟡') ? 'pending' : 'offline'}`}>
            {health.syncStatus.includes('🟢') ? 'SYNCING' : health.syncStatus.includes('🟡') ? 'PENDING' : 'OFFLINE'}
          </span>
        </div>
        <button className="oh-refresh" onClick={fetchHealth}>↻</button>
      </div>

      {/* Primary stats row */}
      <div className="oh-stats-grid">
        <div className="oh-stat">
          <span className="oh-stat-val">{users.discordLinked}</span>
          <span className="oh-stat-label">Discord Linked</span>
          <span className="oh-stat-sub">of {users.total} users</span>
        </div>
        <div className="oh-stat">
          <span className="oh-stat-val">{users.syncEnabled}</span>
          <span className="oh-stat-label">Sync On</span>
          <span className="oh-stat-sub">{users.syncDisabled} disabled</span>
        </div>
        <div className="oh-stat">
          <span className="oh-stat-val">{users.crossPlatformActive}</span>
          <span className="oh-stat-label">Cross-Platform</span>
          <span className="oh-stat-sub">notes from both</span>
        </div>
        <div className="oh-stat">
          <span className="oh-stat-val">{mlRisk.freshSnapshots}</span>
          <span className="oh-stat-label">ML Snapshots</span>
          <span className="oh-stat-sub">fresh (24h)</span>
        </div>
      </div>

      {/* Memory Notes card */}
      <div className="oh-card">
        <div className="oh-card-head">
          <h3>Memory Notes</h3>
          <span className="oh-card-count">{memoryNotes.total} total</span>
        </div>

        {/* Diagnostic: when was the last note generated? */}
        {health.lastNoteDate && (
          <div className={`oh-diagnostic ${memoryNotes.last24h.total === 0 ? 'warn' : 'ok'}`}>
            <span className="oh-diag-label">Last note:</span>
            <span className="oh-diag-val">{timeAgo(health.lastNoteDate)}</span>
            {memoryNotes.last7d === 0 && <span className="oh-diag-alert">⚠ No notes in 7d</span>}
          </div>
        )}

        <div className="oh-notes-grid">
          <div className="oh-notes-stat">
            <span className="oh-notes-num">{memoryNotes.last24h.total}</span>
            <span className="oh-notes-label">Last 24h</span>
          </div>
          <div className="oh-notes-stat">
            <span className="oh-notes-num">{memoryNotes.last24h.app}</span>
            <span className="oh-notes-label">App</span>
          </div>
          <div className="oh-notes-stat">
            <span className="oh-notes-num">{memoryNotes.last24h.discord}</span>
            <span className="oh-notes-label">Discord</span>
          </div>
          <div className="oh-notes-stat">
            <span className="oh-notes-num">{memoryNotes.last7d}</span>
            <span className="oh-notes-label">Last 7d</span>
          </div>
        </div>

        {/* Source breakdown bar */}
        {memoryNotes.total > 0 && (
          <div className="oh-source-bar-wrap">
            <div className="oh-source-bar">
              <div
                className="oh-source-fill app"
                style={{ width: `${(memoryNotes.bySource.app / memoryNotes.total) * 100}%` }}
              />
              <div
                className="oh-source-fill discord"
                style={{ width: `${(memoryNotes.bySource.discord / memoryNotes.total) * 100}%` }}
              />
            </div>
            <div className="oh-source-legend">
              <span className="oh-source-item"><span className="oh-source-dot app" />App ({memoryNotes.bySource.app})</span>
              <span className="oh-source-item"><span className="oh-source-dot discord" />Discord ({memoryNotes.bySource.discord})</span>
            </div>
          </div>
        )}
      </div>

      {/* Oracle Usage Today */}
      {oracleUsage && (
        <div className="oh-card">
          <div className="oh-card-head oh-clickable" onClick={() => setShowUsage(!showUsage)}>
            <h3>Oracle Usage Today</h3>
            <span className="oh-card-count">{oracleUsage.totalToday} messages <span className="oh-toggle-arrow">{showUsage ? '▾' : '▸'}</span></span>
          </div>
          <div className="oh-usage-row">
            <div className="oh-usage-stat">
              <span className="oh-usage-num">{oracleUsage.app}</span>
              <span className="oh-usage-label">App ({oracleUsage.activeAppUsers})</span>
            </div>
            <div className="oh-usage-stat">
              <span className="oh-usage-num oh-usage-discord">{oracleUsage.discord}</span>
              <span className="oh-usage-label">Discord ({oracleUsage.activeDiscordUsers})</span>
            </div>
          </div>

          {/* Per-user breakdown */}
          {showUsage && oracleUsage.topUsers && oracleUsage.topUsers.length > 0 && (
            <div className="oh-pool-section">
              <span className="oh-pool-title">All Users Today</span>
              {oracleUsage.topUsers.map((u, i) => {
                const tierLabel = u.tier === 'grandfathered' ? 'GF' : u.tier === 'active' ? 'PRO' : u.tier === 'trialing' ? 'TRIAL' : u.tier === 'discord-only' ? 'DC' : 'FREE';
                const tierClass = u.tier === 'grandfathered' ? 'gf' : u.tier === 'active' ? 'pro' : u.tier === 'trialing' ? 'pro' : u.tier === 'discord-only' ? 'dc' : 'free';
                return (
                  <div key={i} className="oh-user-row">
                    <span className="oh-user-rank">#{i + 1}</span>
                    <span className="oh-user-name">{u.username}</span>
                    <span className={`oh-user-tier ${tierClass}`}>{tierLabel}</span>
                    <div className="oh-user-counts">
                      {u.app > 0 && <span className="oh-user-count app">{u.app}a</span>}
                      {u.discord > 0 && <span className="oh-user-count discord">{u.discord}d</span>}
                    </div>
                    <span className={`oh-user-total ${u.total >= 10 ? 'heavy' : ''}`}>{u.total}</span>
                  </div>
                );
              })}
            </div>
          )}
          {showUsage && (!oracleUsage.topUsers || oracleUsage.topUsers.length === 0) && (
            <div className="oh-pool-section">
              <span className="oh-pool-empty">No usage today</span>
            </div>
          )}
        </div>
      )}

      {/* Outcomes + Pulse row */}
      <div className="oh-row-2">
        <div className="oh-card oh-card-compact">
          <h3 className="oh-card-title-sm">Outcomes (Layer 2)</h3>
          <span className="oh-big-num">{outcomes.measured}</span>
          <span className="oh-big-sub">of {outcomes.total} measured{outcomes.pending > 0 && ` · ${outcomes.pending} pending`}</span>
          {outcomes.readyForAggregation && (
            <span className="oh-ready-badge">Ready for aggregation</span>
          )}
        </div>
        <div className="oh-card oh-card-compact">
          <h3 className="oh-card-title-sm">Community Pulse</h3>
          <span className={`oh-pulse-status ${communityPulse.active ? 'on' : 'off'}`}>
            {communityPulse.active ? 'Active' : 'No Data'}
          </span>
          {communityPulse.active && (
            <p className="oh-pulse-preview">{communityPulse.preview}</p>
          )}
        </div>
      </div>

      {/* Recent notes (collapsible) */}
      {recentNotes && recentNotes.length > 0 && (
        <div className="oh-card">
          <div className="oh-card-head oh-clickable" onClick={() => setShowNotes(!showNotes)}>
            <h3>Recent Notes</h3>
            <span className="oh-toggle-arrow">{showNotes ? '▾' : '▸'} {recentNotes.length}</span>
          </div>
          {showNotes && (
            <div className="oh-notes-list">
              {recentNotes.map((n, i) => (
                <div key={i} className="oh-note-row">
                  <div className="oh-note-top">
                    <span className="oh-note-user">{n.user}</span>
                    <div className="oh-note-tags">
                      <span className={`oh-note-source ${n.source}`}>{n.source}</span>
                      {n.linked && <span className="oh-note-linked">🔗</span>}
                      {n.streakDay && <span className="oh-note-day">D{n.streakDay}</span>}
                    </div>
                  </div>
                  <p className="oh-note-text">{n.note}</p>
                  <span className="oh-note-time">{timeAgo(n.date)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default OracleHealth;
