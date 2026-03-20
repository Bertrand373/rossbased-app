// src/components/Admin/RevenueCard.js
// Stripe Revenue Dashboard — lives inside AdminCockpit Revenue tab

import React, { useState, useEffect, useCallback } from 'react';
import './RevenueCard.css';

const API = process.env.REACT_APP_API || process.env.REACT_APP_API_URL || 'https://rossbased-app.onrender.com';

const RevenueCard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCharges, setShowCharges] = useState(false);
  const [subDrilldown, setSubDrilldown] = useState(null);
  const [subDetails, setSubDetails] = useState([]);
  const [subDetailsLoading, setSubDetailsLoading] = useState(false);
  const [rvRefreshing, setRvRefreshing] = useState(false);
  const [rvDone, setRvDone] = useState(false);

  const token = localStorage.getItem('token');

  const fetchRevenue = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/admin/revenue`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to fetch');
      }
      const json = await res.json();
      setData(json);
      setError(null);
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  }, [token]);

  useEffect(() => { fetchRevenue(); }, [fetchRevenue]);

  // Auto-refresh every 60s
  useEffect(() => {
    const interval = setInterval(fetchRevenue, 60000);
    return () => clearInterval(interval);
  }, [fetchRevenue]);

  const fmt = (cents) => {
    if (cents === 0) return '$0.00';
    return `$${(cents / 100).toFixed(2)}`;
  };

  const fmtCompact = (cents) => {
    if (cents === 0) return '$0';
    const dollars = cents / 100;
    if (dollars >= 1000) return `$${(dollars / 1000).toFixed(1)}k`;
    return `$${dollars.toFixed(dollars % 1 === 0 ? 0 : 2)}`;
  };

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

  const fmtDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'
    });
  };

  const fmtShortDate = (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const fetchSubDetails = async (status) => {
    if (subDrilldown === status) {
      setSubDrilldown(null);
      setSubDetails([]);
      return;
    }
    setSubDrilldown(status);
    setSubDetailsLoading(true);
    setSubDetails([]);
    try {
      const res = await fetch(`${API}/api/admin/revenue/subscribers/${status}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const json = await res.json();
        setSubDetails(json.subscribers || []);
      }
    } catch (err) {
      console.error('Failed to fetch subscriber details:', err);
    }
    setSubDetailsLoading(false);
  };

  if (loading) {
    return (
      <div className="rv-loading">
        <div className="rv-loading-spinner" />
        <span>Loading revenue data...</span>
      </div>
    );
  }

  if (error) {
    return <div className="rv-error">Failed to load revenue: {error}</div>;
  }

  if (!data) return null;

  const { balance, mrr, subscribers, recentCharges, failedPayments, duplicateAlerts } = data;

  return (
    <div className="rv-container">
      {/* Header */}
      <div className="rv-header">
        <div className="rv-header-left">
          <h2 className="rv-title">Revenue</h2>
          <span className="rv-badge">STRIPE</span>
        </div>
        <button className={`rv-refresh ${rvRefreshing ? 'rv-spinning' : rvDone ? 'rv-done' : ''}`} onClick={() => {
          if (rvRefreshing) return;
          setRvRefreshing(true);
          setRvDone(false);
          Promise.all([fetchRevenue(), new Promise(r => setTimeout(r, 600))]).then(() => {
            setRvRefreshing(false);
            setRvDone(true);
            setTimeout(() => setRvDone(false), 1200);
          });
        }}>
          {rvDone ? (
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          ) : (
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
          )}
        </button>
      </div>

      {/* Primary stats */}
      <div className="rv-stats-grid">
        <div className="rv-stat rv-stat-highlight">
          <span className="rv-stat-val">{fmtCompact(balance.available)}</span>
          <span className="rv-stat-label">Available</span>
          <span className="rv-stat-sub">ready to pay out</span>
        </div>
        <div className="rv-stat">
          <span className="rv-stat-val">{fmtCompact(balance.pending)}</span>
          <span className="rv-stat-label">Pending</span>
          <span className="rv-stat-sub">processing</span>
        </div>
        <div className="rv-stat">
          <span className="rv-stat-val">{fmtCompact(mrr)}</span>
          <span className="rv-stat-label">MRR</span>
          <span className="rv-stat-sub">monthly recurring</span>
        </div>
      </div>

      {/* Duplicate Subscription Alerts */}
      {duplicateAlerts && duplicateAlerts.length > 0 && (
        <div className="rv-card rv-card-dupe">
          <div className="rv-card-head">
            <h3>Duplicate Subscriptions</h3>
            <span className="rv-dupe-count">{duplicateAlerts.length}</span>
          </div>
          <div className="rv-dupe-list">
            {duplicateAlerts.map((d, i) => (
              <div key={i} className="rv-dupe-row">
                <div className="rv-dupe-user">
                  <span className="rv-dupe-name">{d.username}</span>
                  <span className="rv-dupe-email">{d.email}</span>
                </div>
                <div className="rv-dupe-subs">
                  {d.subscriptions.map((s, j) => (
                    <div key={j} className="rv-dupe-sub-row">
                      <span className={`rv-dupe-status ${s.status}`}>{s.status.toUpperCase()}</span>
                      <span className="rv-dupe-amount">{s.amount ? `$${(s.amount / 100).toFixed(0)}/${s.interval === 'year' ? 'yr' : 'mo'}` : '—'}</span>
                      <span className="rv-dupe-subid" title={s.subId}>sub_...{s.subId.slice(-8)}</span>
                    </div>
                  ))}
                </div>
                <p className="rv-dupe-warning">⚠️ {d.count} subs — user may be double-charged. Check Stripe.</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Subscriber counts — tap to drill down */}
      <div className="rv-card">
        <div className="rv-card-head">
          <h3>Subscribers</h3>
        </div>
        <div className="rv-sub-grid">
          <div className={`rv-sub-item rv-sub-tap ${subDrilldown === 'active' ? 'rv-sub-selected' : ''}`} onClick={() => fetchSubDetails('active')}>
            <span className="rv-sub-num active">{subscribers.active}</span>
            <span className="rv-sub-label">Active</span>
          </div>
          <div className={`rv-sub-item rv-sub-tap ${subDrilldown === 'trialing' ? 'rv-sub-selected' : ''}`} onClick={() => fetchSubDetails('trialing')}>
            <span className="rv-sub-num trial">{subscribers.trialing}</span>
            <span className="rv-sub-label">Trialing</span>
          </div>
          <div className={`rv-sub-item rv-sub-tap ${subDrilldown === 'canceled' ? 'rv-sub-selected' : ''}`} onClick={() => fetchSubDetails('canceled')}>
            <span className="rv-sub-num canceled">{subscribers.canceledLast30d}</span>
            <span className="rv-sub-label">Canceled (30d)</span>
          </div>
        </div>

        {subDrilldown && (
          <div className="rv-drilldown">
            {subDetailsLoading ? (
              <div className="rv-drilldown-loading">
                <div className="rv-loading-spinner" />
              </div>
            ) : subDetails.length === 0 ? (
              <p className="rv-empty">No {subDrilldown} subscribers</p>
            ) : (
              <div className="rv-drilldown-list">
                {subDetails.map((s, i) => (
                  <div key={i} className="rv-drilldown-row">
                    <div className="rv-drilldown-left">
                      <span className="rv-drilldown-name">{s.username || '—'}</span>
                      <span className="rv-drilldown-email">{s.email}</span>
                    </div>
                    <div className="rv-drilldown-right">
                      {s.trialEnd && <span className="rv-drilldown-date">trial ends {fmtShortDate(s.trialEnd)}</span>}
                      {s.periodEnd && !s.trialEnd && <span className="rv-drilldown-date">ends {fmtShortDate(s.periodEnd)}</span>}
                      {s.canceledAt && <span className="rv-drilldown-date">canceled {fmtShortDate(s.canceledAt)}</span>}
                      <span className="rv-drilldown-plan">{s.amount ? `$${(s.amount / 100).toFixed(0)}` : ''}{s.amount ? '/' : ''}{s.plan === 'monthly' ? 'mo' : s.plan === 'yearly' ? 'yr' : s.plan || '—'}</span>
                      {s.subId && <span className="rv-drilldown-subid" title={s.subId}>sub_...{s.subId.slice(-8)}</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Failed Payments */}
      {failedPayments.length > 0 && (
        <div className="rv-card rv-card-alert">
          <div className="rv-card-head">
            <h3>Failed Payments</h3>
            <span className="rv-alert-count">{failedPayments.length}</span>
          </div>
          <div className="rv-failed-list">
            {failedPayments.map((f, i) => (
              <div key={i} className="rv-failed-row">
                <div className="rv-failed-top">
                  <span className="rv-failed-amount">{fmt(f.amount)}</span>
                  <span className="rv-failed-email">{f.customerEmail || 'Unknown'}</span>
                </div>
                <p className="rv-failed-reason">{f.failureMessage || 'No reason provided'}</p>
                <span className="rv-failed-time">{timeAgo(f.created)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Charges (collapsible) */}
      <div className="rv-card">
        <div className="rv-card-head rv-clickable" onClick={() => setShowCharges(!showCharges)}>
          <h3>Recent Transactions</h3>
          <span className="rv-toggle-arrow">{showCharges ? '▾' : '▸'} {recentCharges.length}</span>
        </div>
        {showCharges && (
          <div className="rv-charges-list">
            {recentCharges.length === 0 ? (
              <p className="rv-empty">No transactions yet</p>
            ) : (
              recentCharges.map((c, i) => (
                <div key={i} className="rv-charge-row">
                  <div className="rv-charge-left">
                    <span className={`rv-charge-status ${c.paid ? (c.refunded ? 'refunded' : 'paid') : 'failed'}`}>
                      {c.paid ? (c.refunded ? 'REFUND' : 'PAID') : 'FAIL'}
                    </span>
                    <div className="rv-charge-info">
                      <span className="rv-charge-amount">{fmt(c.amount)}</span>
                      <span className="rv-charge-email">{c.customerEmail || '—'}</span>
                    </div>
                  </div>
                  <span className="rv-charge-time">{fmtDate(c.created)}</span>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default RevenueCard;
