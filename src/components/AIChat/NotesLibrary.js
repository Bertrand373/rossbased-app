// src/components/AIChat/NotesLibrary.js
// "Commonplace Book" — the Library view of all of a user's Oracle notes.
// Groups notes by source thread, renders each as a serif passage + marginalia.
// Tapping a note jumps to the source message in the chat.

import React, { useEffect, useState, useCallback } from 'react';

const COLORS = ['amber', 'rose', 'azure', 'sage'];

// Relative time formatting — matches the rest of the chat
function relTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const now = new Date();
  const diff = (now.getTime() - d.getTime()) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 86400 * 2) return 'yesterday';
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)}d ago`;
  return d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function NotesLibrary({
  open,
  onClose,
  fetchLibrary,
  onJumpToNote,    // (note) => void
  onUpdateNote,    // (id, patch) => Promise<note>
  onDeleteNote,    // (id, messageTimestamp, threadId) => Promise<bool>
}) {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [expandedId, setExpandedId] = useState(null); // for inline-edit
  const [draftText, setDraftText] = useState('');
  const [draftColor, setDraftColor] = useState('amber');

  const refresh = useCallback(async () => {
    setLoading(true);
    const data = await fetchLibrary({ limit: 200, skip: 0 });
    setNotes(data.notes || []);
    setTotal(data.total || 0);
    setLoading(false);
  }, [fetchLibrary]);

  // Refresh on open + on cross-component changes
  useEffect(() => {
    if (open) refresh();
  }, [open, refresh]);

  useEffect(() => {
    if (!open) return;
    const handler = () => refresh();
    window.addEventListener('oracle-notes-changed', handler);
    return () => window.removeEventListener('oracle-notes-changed', handler);
  }, [open, refresh]);

  if (!open) return null;

  // Group by thread, preserving the order notes appeared in
  const grouped = [];
  const seen = new Map();
  for (const n of notes) {
    if (!seen.has(n.threadId)) {
      const group = { threadId: n.threadId, threadTitle: n.threadTitle || 'Untitled thread', notes: [] };
      seen.set(n.threadId, group);
      grouped.push(group);
    }
    seen.get(n.threadId).notes.push(n);
  }

  const startEdit = (n) => {
    setExpandedId(n._id);
    setDraftText(n.note || '');
    setDraftColor(n.color || 'amber');
  };

  const saveEdit = async (n) => {
    const patch = {};
    if (draftText !== (n.note || '')) patch.note = draftText;
    if (draftColor !== n.color) patch.color = draftColor;
    if (Object.keys(patch).length === 0) { setExpandedId(null); return; }
    await onUpdateNote(n._id, patch);
    setExpandedId(null);
  };

  const removeNote = async (n) => {
    await onDeleteNote(n._id, n.messageTimestamp, n.threadId);
  };

  return (
    <div className="oracle-library-overlay" onClick={onClose}>
      <div className="oracle-library" onClick={(e) => e.stopPropagation()}>
        <div className="oracle-library-grip" />

        <header className="oracle-library-header">
          <div className="oracle-library-title-row">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="oracle-library-icon">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z" />
            </svg>
            <h2 className="oracle-library-title">Marginalia</h2>
          </div>
          <span className="oracle-library-count">
            {total > 0 ? `${total} ${total === 1 ? 'note' : 'notes'}` : ''}
          </span>
          <button
            type="button"
            className="oracle-library-close"
            onClick={onClose}
            aria-label="Close"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </header>

        <div className="oracle-library-body">
          {loading && notes.length === 0 && (
            <div className="oracle-library-loading">Gathering your marginalia…</div>
          )}

          {!loading && notes.length === 0 && (
            <div className="oracle-library-empty">
              <p className="oracle-library-empty-title">Nothing marked yet.</p>
              <p className="oracle-library-empty-sub">
                Select any passage from Oracle's response and choose a color or write a note.
                Your highlights collect here — a private commonplace book of what mattered.
              </p>
            </div>
          )}

          {grouped.map(group => (
            <section key={group.threadId} className="oracle-library-thread">
              <h3 className="oracle-library-thread-title">{group.threadTitle}</h3>

              {group.notes.map(n => {
                const isExpanded = expandedId === n._id;
                return (
                  <article
                    key={n._id}
                    className={`oracle-library-entry oracle-library-entry--${n.color || 'amber'}${isExpanded ? ' is-editing' : ''}`}
                  >
                    <blockquote
                      className="oracle-library-passage"
                      onClick={() => onJumpToNote && onJumpToNote(n)}
                    >
                      <span className={`oracle-library-bar oracle-library-bar--${n.color || 'amber'}`} />
                      <span className="oracle-library-passage-text">"{n.highlightedText}"</span>
                    </blockquote>

                    {!isExpanded && n.note && (
                      <p className="oracle-library-note">{n.note}</p>
                    )}

                    {isExpanded && (
                      <div className="oracle-library-edit">
                        <textarea
                          className="oracle-library-edit-textarea"
                          value={draftText}
                          onChange={(e) => setDraftText(e.target.value.slice(0, 1000))}
                          placeholder="Write what came to mind…"
                          rows={4}
                          autoFocus
                        />
                        <div className="oracle-library-edit-colors">
                          {COLORS.map(c => (
                            <button
                              key={c}
                              type="button"
                              className={`oracle-library-edit-color oracle-library-edit-color--${c}${draftColor === c ? ' active' : ''}`}
                              onClick={() => setDraftColor(c)}
                              aria-label={c}
                            />
                          ))}
                        </div>
                      </div>
                    )}

                    <footer className="oracle-library-foot">
                      <span className="oracle-library-date">{relTime(n.updatedAt || n.createdAt)}</span>
                      <div className="oracle-library-foot-actions">
                        {isExpanded ? (
                          <>
                            <button
                              type="button"
                              className="oracle-library-foot-btn"
                              onClick={() => setExpandedId(null)}
                            >Cancel</button>
                            <button
                              type="button"
                              className="oracle-library-foot-btn oracle-library-foot-btn--primary"
                              onClick={() => saveEdit(n)}
                            >Save</button>
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              className="oracle-library-foot-btn"
                              onClick={() => removeNote(n)}
                            >Remove</button>
                            <button
                              type="button"
                              className="oracle-library-foot-btn"
                              onClick={() => startEdit(n)}
                            >{n.note ? 'Edit' : 'Add note'}</button>
                            <button
                              type="button"
                              className="oracle-library-foot-btn oracle-library-foot-btn--primary"
                              onClick={() => onJumpToNote && onJumpToNote(n)}
                            >Jump ↗</button>
                          </>
                        )}
                      </div>
                    </footer>
                  </article>
                );
              })}
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
