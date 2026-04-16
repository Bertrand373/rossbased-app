// src/components/Admin/OracleIntelligence.js
// Oracle Evolution Intelligence Panel — lives inside AdminCockpit Oracle tab
// Shows all 7 layers, evolution log, transmission stats, approve/reject proposals

import React, { useState, useEffect, useCallback, useRef } from 'react';
import './OracleIntelligence.css';

const API = process.env.REACT_APP_API || process.env.REACT_APP_API_URL || 'https://rossbased-app.onrender.com';

// Max time any single admin action is allowed to run before we force-stop it.
// Evolution pipeline legitimately takes 60-90s, so we give it plenty of headroom.
const ACTION_TIMEOUT_MS = 8 * 60 * 1000; // 8 minutes

const OracleIntelligence = () => {
  const [intel, setIntel] = useState(null);
  const [txStats, setTxStats] = useState(null);
  const [evolutionLog, setEvolutionLog] = useState(null);
  const [rules, setRules] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState('layers');
  const [actionLoading, setActionLoading] = useState(null);
  const [actionResult, setActionResult] = useState(null);
  const [toast, setToast] = useState(null); // { type: 'success'|'error', label, message }
  const toastTimerRef = useRef(null);

  const token = localStorage.getItem('token');

  const fetchAll = useCallback(async () => {
    try {
      const headers = { Authorization: `Bearer ${token}` };

      const [intelRes, txRes, evoRes, rulesRes] = await Promise.allSettled([
        fetch(`${API}/api/admin/oracle/intelligence`, { headers }),
        fetch(`${API}/api/admin/oracle/transmissions/stats`, { headers }),
        fetch(`${API}/api/admin/oracle/evolution-log?limit=10`, { headers }),
        fetch(`${API}/api/admin/oracle/rules`, { headers })
      ]);

      if (intelRes.status === 'fulfilled' && intelRes.value.ok) {
        setIntel(await intelRes.value.json());
      }
      if (txRes.status === 'fulfilled' && txRes.value.ok) {
        setTxStats(await txRes.value.json());
      }
      if (evoRes.status === 'fulfilled' && evoRes.value.ok) {
        setEvolutionLog(await evoRes.value.json());
      }
      if (rulesRes.status === 'fulfilled' && rulesRes.value.ok) {
        setRules(await rulesRes.value.json());
      }
    } catch (e) {
      console.error('Intelligence fetch error:', e);
    }
    setLoading(false);
  }, [token]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Show a toast that auto-dismisses after 6s (or 10s for errors)
  const showToast = useCallback((type, label, message) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ type, label, message });
    toastTimerRef.current = setTimeout(() => {
      setToast(null);
    }, type === 'error' ? 10000 : 6000);
  }, []);

  // Cleanup toast timer on unmount
  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  // Build a human-readable summary of an action result so Ross actually knows what happened
  const summarizeResult = (endpoint, data) => {
    if (!data || typeof data !== 'object') return 'Completed.';
    // Backend sometimes returns { message: '...' } when there's nothing to do
    if (data.message) return data.message;

    // /evolve — runEvolutionPipeline returns { voice, profilesBuilt, responseAnalysis, patternsFound, opus, elapsed }
    if (endpoint.includes('/evolve')) {
      const parts = [];
      if (typeof data.profilesBuilt === 'number') parts.push(`${data.profilesBuilt} psych profile${data.profilesBuilt === 1 ? '' : 's'} updated`);
      if (typeof data.patternsFound === 'number' && data.patternsFound > 0) parts.push(`${data.patternsFound} pattern${data.patternsFound === 1 ? '' : 's'} found`);
      if (data.opus && typeof data.opus.approved === 'number' && data.opus.approved > 0) parts.push(`${data.opus.approved} rule${data.opus.approved === 1 ? '' : 's'} approved`);
      if (data.voice) parts.push('voice refined');
      if (data.elapsed) parts.push(`${data.elapsed}s`);
      return parts.length ? parts.join(' · ') : 'Pipeline complete.';
    }

    // /discover-patterns — returns { patterns: [...], ... } or { message: '...' }
    if (endpoint.includes('/discover-patterns')) {
      const n = data.patterns?.length || 0;
      return n > 0 ? `${n} pattern${n === 1 ? '' : 's'} discovered.` : 'No new patterns found.';
    }

    // /prompt-proposal — returns { promptChanges, newRules, overallAssessment }
    if (endpoint.includes('/prompt-proposal')) {
      const c = data.promptChanges?.length || 0;
      const r = data.newRules?.length || 0;
      return c + r > 0 ? `${c} change${c === 1 ? '' : 's'}, ${r} new rule${r === 1 ? '' : 's'}. Check Evolution tab.` : 'Proposal saved. Check Evolution tab.';
    }

    // /risk-scan
    if (endpoint.includes('/risk-scan')) {
      const q = data.queue?.length ?? data.length ?? 0;
      return `${q} user${q === 1 ? '' : 's'} flagged.`;
    }

    // /transmissions/run
    if (endpoint.includes('/transmissions/run')) {
      if (typeof data.sent === 'number') return `${data.sent} transmission${data.sent === 1 ? '' : 's'} sent.`;
      return 'Transmissions dispatched.';
    }

    // /response-effectiveness
    if (endpoint.includes('/response-effectiveness')) {
      return 'Analysis complete. See details below.';
    }

    return 'Completed.';
  };

  // Admin actions
  const runAction = async (endpoint, method = 'GET', label = '') => {
    setActionLoading(label);
    setActionResult(null);

    // AbortController gives us a hard timeout so "Running..." can't hang forever
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), ACTION_TIMEOUT_MS);

    try {
      const res = await fetch(`${API}${endpoint}`, {
        method,
        headers: { Authorization: `Bearer ${token}` },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      // Try to parse JSON, but fall back gracefully if the server returned HTML (e.g. proxy timeout page)
      let data = null;
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        try { data = await res.json(); } catch (_) { data = null; }
      } else {
        // Non-JSON response — read as text for the error message
        const text = await res.text().catch(() => '');
        data = { error: text.slice(0, 200) || `Server returned ${res.status} ${res.statusText}` };
      }

      if (!res.ok) {
        const msg = data?.error || `Request failed (${res.status})`;
        setActionResult({ success: false, label, error: msg });
        showToast('error', label, msg);
      } else {
        setActionResult({ success: true, label, data });
        showToast('success', label, summarizeResult(endpoint, data));
        fetchAll(); // Refresh data only on success
      }
    } catch (e) {
      clearTimeout(timeoutId);
      const msg = e.name === 'AbortError'
        ? `Timed out after ${Math.round(ACTION_TIMEOUT_MS / 1000)}s. The job may still be running on the server — check the Evolution tab in a minute.`
        : (e.message || 'Request failed');
      setActionResult({ success: false, label, error: msg });
      showToast('error', label, msg);
    }

    setActionLoading(null);
  };

  // Approve/reject evolution proposal
  const reviewEvolution = async (id, status) => {
    setActionLoading(id);
    try {
      await fetch(`${API}/api/admin/oracle/evolution/${id}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      fetchAll();
    } catch (e) {
      console.error('Review error:', e);
    }
    setActionLoading(null);
  };

  // Deactivate a dynamic rule
  const deactivateRule = async (id) => {
    setActionLoading(id);
    try {
      await fetch(`${API}/api/admin/oracle/rules/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'Removed from admin panel' })
      });
      fetchAll();
    } catch (e) {
      console.error('Deactivate rule error:', e);
    }
    setActionLoading(null);
  };

  if (loading) {
    return <div className="ac-card"><p className="ac-empty-msg">Loading intelligence...</p></div>;
  }

  return (
    <div className="oi-wrap">
      {/* Floating toast — auto-dismisses, always visible regardless of scroll position */}
      {toast && (
        <div className={`oi-toast oi-toast-${toast.type}`} role="status" aria-live="polite">
          <div className="oi-toast-head">
            <span className="oi-toast-icon">{toast.type === 'success' ? '✓' : '!'}</span>
            <span className="oi-toast-label">{toast.label}</span>
            <button className="oi-toast-close" onClick={() => setToast(null)} aria-label="Dismiss">×</button>
          </div>
          <p className="oi-toast-msg">{toast.message}</p>
        </div>
      )}

      {/* Sub-nav */}
      <div className="ac-sub-nav">
        {[
          { id: 'layers', label: 'Layers' },
          { id: 'rules', label: 'Rules' },
          { id: 'transmissions', label: 'Transmissions' },
          { id: 'evolution', label: 'Evolution' },
          { id: 'actions', label: 'Actions' }
        ].map(s => (
          <button key={s.id} className={`ac-sub-btn ${activeSection === s.id ? 'active' : ''}`} onClick={() => setActiveSection(s.id)}>
            {s.label}
          </button>
        ))}
      </div>

      {/* === LAYERS STATUS === */}
      {activeSection === 'layers' && intel && (
        <div className="oi-section">
          {/* Data health */}
          <div className="ac-card">
            <h3 className="ac-card-title-sm">Data Health</h3>
            <div className="oi-stat-grid">
              {[
                { l: 'Outcomes', v: intel.dataHealth.totalOutcomes },
                { l: 'Measured', v: intel.dataHealth.measuredOutcomes },
                { l: 'Scored', v: intel.dataHealth.scoredOutcomes },
                { l: 'Interactions', v: intel.dataHealth.totalInteractions },
                { l: 'Maintenance', v: intel.dataHealth.overallMaintenanceRate }
              ].map((s, i) => (
                <div key={i} className="oi-stat">
                  <span className="oi-stat-val">{s.v}</span>
                  <span className="oi-stat-label">{s.l}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Layer status cards */}
          <div className="ac-card">
            <h3 className="ac-card-title-sm">7 Layers</h3>
            <div className="oi-layers">
              {Object.entries(intel.layers).map(([key, status]) => {
                const num = key.split('_')[0]; // L1, L2, etc.
                const name = key.split('_').slice(1).join(' ');
                const isActive = status === 'ACTIVE' || status === 'READY' || !status.includes('COLLECTING');
                return (
                  <div key={key} className={`oi-layer ${isActive ? 'active' : 'pending'}`}>
                    <span className="oi-layer-num">{num}</span>
                    <div className="oi-layer-info">
                      <span className="oi-layer-name">{name}</span>
                      <span className="oi-layer-status">{status}</span>
                    </div>
                    <span className={`oi-layer-dot ${isActive ? 'on' : ''}`} />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* === ACTIVE RULES === */}
      {activeSection === 'rules' && (
        <div className="oi-section">
          {rules?.active?.length > 0 ? (
            <>
              <div className="ac-card">
                <h3 className="ac-card-title-sm">Active Rules ({rules.activeCount})</h3>
                <p className="ac-card-sub">These are injected into Oracle's prompt on every conversation. No redeploy needed.</p>
                <div className="oi-rules-list">
                  {rules.active.map((r) => (
                    <div key={r._id} className="oi-rule-card">
                      <div className="oi-rule-top">
                        <span className="oi-rule-category">{r.category}</span>
                        <span className="oi-rule-source">{r.source?.replace(/-/g, ' ')}</span>
                        {r.opusVerified && <span className="oi-rule-opus">Opus verified</span>}
                      </div>
                      <p className="oi-rule-text">{r.rule}</p>
                      {r.opusAssessment && (
                        <p className="oi-rule-assessment">{r.opusAssessment}</p>
                      )}
                      <div className="oi-rule-footer">
                        <span className="oi-rule-date">
                          Active since {new Date(r.activatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                        </span>
                        <button 
                          className="oi-btn reject"
                          onClick={() => deactivateRule(r._id)}
                          disabled={actionLoading === r._id}
                        >
                          {actionLoading === r._id ? '...' : 'Remove'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {rules.inactive?.length > 0 && (
                <div className="ac-card">
                  <h3 className="ac-card-title-sm">Removed Rules</h3>
                  <div className="oi-rules-list">
                    {rules.inactive.map((r) => (
                      <div key={r._id} className="oi-rule-card inactive">
                        <p className="oi-rule-text">{r.rule}</p>
                        <span className="oi-rule-date">
                          Removed {r.deactivatedAt ? new Date(r.deactivatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : ''}
                          {r.deactivatedReason ? ` — ${r.deactivatedReason}` : ''}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="ac-card">
              <p className="ac-empty-msg">No active rules yet. Rules are created when evolution proposals pass Opus verification.</p>
            </div>
          )}
        </div>
      )}

      {/* === TRANSMISSIONS === */}
      {activeSection === 'transmissions' && (
        <div className="oi-section">
          {txStats ? (
            <>
              <div className="oi-stat-grid">
                {[
                  { l: 'This Week', v: txStats.thisWeek },
                  { l: 'Delivered', v: txStats.delivered },
                  { l: 'Read', v: txStats.read },
                  { l: 'Read Rate', v: txStats.readRate }
                ].map((s, i) => (
                  <div key={i} className="ac-card ac-card-compact">
                    <span className="ac-big-num">{s.v}</span>
                    <span className="ac-big-sub">{s.l}</span>
                  </div>
                ))}
              </div>

              {txStats.bySource && Object.keys(txStats.bySource).length > 0 && (
                <div className="ac-card">
                  <h3 className="ac-card-title-sm">By Source</h3>
                  <div className="oi-source-list">
                    {Object.entries(txStats.bySource).map(([source, count]) => (
                      <div key={source} className="oi-source-row">
                        <span className="oi-source-name">{source.replace('_', ' ')}</span>
                        <span className="oi-source-count">{count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {txStats.recent?.length > 0 && (
                <div className="ac-card">
                  <h3 className="ac-card-title-sm">Recent Transmissions</h3>
                  <div className="oi-tx-list">
                    {txStats.recent.map((tx, i) => (
                      <div key={i} className="oi-tx-item">
                        <div className="oi-tx-top">
                          <span className="oi-tx-user">{tx.username}</span>
                          <span className="oi-tx-source">{tx.source?.replace('_', ' ')}</span>
                          <span className={`oi-tx-read ${tx.read ? 'yes' : ''}`}>{tx.read ? 'Read' : 'Unread'}</span>
                        </div>
                        <p className="oi-tx-msg">{tx.message?.substring(0, 120)}{tx.message?.length > 120 ? '...' : ''}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="ac-card"><p className="ac-empty-msg">No transmission data yet.</p></div>
          )}
        </div>
      )}

      {/* === EVOLUTION LOG === */}
      {activeSection === 'evolution' && (
        <div className="oi-section">
          {evolutionLog?.records?.length > 0 ? (
            <>
              <div className="oi-stat-grid">
                <div className="ac-card ac-card-compact">
                  <span className="ac-big-num">{evolutionLog.summary.total}</span>
                  <span className="ac-big-sub">Records</span>
                </div>
                <div className="ac-card ac-card-compact">
                  <span className="ac-big-num">{evolutionLog.summary.pending}</span>
                  <span className="ac-big-sub">Pending Review</span>
                </div>
              </div>

              <div className="oi-evo-list">
                {evolutionLog.records.map((r) => (
                  <div key={r._id} className={`oi-evo-card ${r.status}`}>
                    <div className="oi-evo-header">
                      <span className="oi-evo-type">{r.type.replace(/-/g, ' ')}</span>
                      <span className="oi-evo-date">{new Date(r.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                      <span className={`oi-evo-status ${r.status}`}>{r.status}</span>
                    </div>
                    <p className="oi-evo-content">{r.content?.substring(0, 200)}{r.content?.length > 200 ? '...' : ''}</p>
                    
                    {/* Opus review notes — shows why it was approved/flagged */}
                    {r.reviewNotes && (
                      <p className="oi-evo-review-notes">{r.reviewNotes}</p>
                    )}
                    
                    {/* Proposed changes preview */}
                    {r.findings?.promptChanges?.length > 0 && (
                      <div className="oi-evo-changes">
                        <span className="oi-evo-changes-label">{r.findings.promptChanges.length} proposed change{r.findings.promptChanges.length > 1 ? 's' : ''}</span>
                        {r.findings.promptChanges.slice(0, 2).map((pc, i) => (
                          <p key={i} className="oi-evo-change">{pc.proposedChange?.substring(0, 100)}</p>
                        ))}
                      </div>
                    )}

                    {r.findings?.correlations?.length > 0 && (
                      <div className="oi-evo-changes">
                        <span className="oi-evo-changes-label">{r.findings.correlations.length} pattern{r.findings.correlations.length > 1 ? 's' : ''} discovered</span>
                        {r.findings.correlations.slice(0, 2).map((c, i) => (
                          <p key={i} className="oi-evo-change">{c.description?.substring(0, 100)}</p>
                        ))}
                      </div>
                    )}

                    {r.findings?.antiPatterns?.length > 0 && (
                      <div className="oi-evo-changes">
                        <span className="oi-evo-changes-label">{r.findings.antiPatterns.length} anti-pattern{r.findings.antiPatterns.length > 1 ? 's' : ''}</span>
                      </div>
                    )}

                    {/* Approve/Reject for pending */}
                    {r.status === 'pending' && (
                      <div className="oi-evo-actions">
                        <button 
                          className="oi-btn approve"
                          onClick={() => reviewEvolution(r._id, 'approved')}
                          disabled={actionLoading === r._id}
                        >
                          Approve
                        </button>
                        <button 
                          className="oi-btn reject"
                          onClick={() => reviewEvolution(r._id, 'rejected')}
                          disabled={actionLoading === r._id}
                        >
                          Reject
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="ac-card"><p className="ac-empty-msg">No evolution records yet. Run the pipeline first.</p></div>
          )}
        </div>
      )}

      {/* === ACTIONS === */}
      {activeSection === 'actions' && (
        <div className="oi-section">
          {/* Weekly routine */}
          <div className="ac-card">
            <h3 className="ac-card-title-sm">Weekly Routine</h3>
            <p className="oi-actions-hint">Run these once a week in order. After step 3, check the Evolution tab for pending proposals to approve or reject. That's it — Oracle adapts immediately.</p>
            <div className="oi-actions-ordered">
              {[
                { step: 1, label: 'Run Evolution', endpoint: '/api/admin/oracle/evolve', method: 'POST', desc: 'Updates psych profiles and refines Oracle\'s voice from recent conversations. Takes ~30s.' },
                { step: 2, label: 'Discover Patterns', endpoint: '/api/admin/oracle/discover-patterns', method: 'GET', desc: 'Finds statistical correlations across outcomes, streaks, lunar phases, and topics.' },
                { step: 3, label: 'Prompt Proposal', endpoint: '/api/admin/oracle/prompt-proposal', method: 'POST', desc: 'Opus reviews all data and proposes rule changes. Pending items appear in Evolution tab for your approval.' }
              ].map((action) => (
                <button
                  key={action.label}
                  className="oi-action-step"
                  onClick={() => runAction(action.endpoint, action.method, action.label)}
                  disabled={!!actionLoading}
                >
                  <span className="oi-action-step-num">{action.step}</span>
                  <div className="oi-action-step-body">
                    <span className="oi-action-name">{actionLoading === action.label ? 'Running...' : action.label}</span>
                    <span className="oi-action-desc">{action.desc}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* On demand */}
          <div className="ac-card">
            <h3 className="ac-card-title-sm">On Demand</h3>
            <p className="oi-actions-hint">These run automatically or are just for checking in. Tap when curious.</p>
            <div className="oi-actions-grid">
              {[
                { label: 'Risk Scan', endpoint: '/api/admin/oracle/risk-scan', method: 'GET', desc: 'Scores all users for relapse risk. Feeds into transmissions.' },
                { label: 'Run Transmissions', endpoint: '/api/admin/oracle/transmissions/run', method: 'POST', desc: 'Fires the daily pipeline now instead of waiting for the cron.' },
                { label: 'Response Analysis', endpoint: '/api/admin/oracle/response-effectiveness', method: 'GET', desc: 'Shows which Oracle response strategies actually kept users on track.' }
              ].map((action) => (
                <button
                  key={action.label}
                  className="oi-action-card"
                  onClick={() => runAction(action.endpoint, action.method, action.label)}
                  disabled={!!actionLoading}
                >
                  <span className="oi-action-name">{actionLoading === action.label ? 'Running...' : action.label}</span>
                  <span className="oi-action-desc">{action.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {actionResult && (
            <div className={`oi-result ${actionResult.success ? 'success' : 'error'}`}>
              <span className="oi-result-label">{actionResult.label}</span>
              <pre className="oi-result-data">{JSON.stringify(actionResult.data || actionResult.error, null, 2)}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default OracleIntelligence;
