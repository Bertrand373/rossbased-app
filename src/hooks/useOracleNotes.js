// src/hooks/useOracleNotes.js
// State + API client for Oracle Notes (highlights + marginalia).
// Loads per-thread on demand, exposes CRUD that handles premium-gate 403s,
// and dispatches an 'oracle-notes-changed' event so other views (e.g. the
// Library sheet) can refresh when a note is created/edited/deleted elsewhere.

import { useCallback, useEffect, useRef, useState } from 'react';

const API_URL = process.env.REACT_APP_API_URL || 'https://rossbased-app.onrender.com';

const NOTES_EVENT = 'oracle-notes-changed';

export default function useOracleNotes({ threadId, isOpen, onPremiumRequired }) {
  // Map<messageTimestamp, OracleNote[]> — fast lookup for inline render
  const [notesByMessage, setNotesByMessage] = useState(new Map());
  const [loadingThread, setLoadingThread] = useState(false);
  const currentThreadRef = useRef(null);

  // Re-bucket a flat note list into a per-message Map.
  const bucketize = useCallback((notes) => {
    const m = new Map();
    for (const n of notes) {
      const ts = n.messageTimestamp;
      if (!m.has(ts)) m.set(ts, []);
      m.get(ts).push(n);
    }
    return m;
  }, []);

  // Fetch every note in the current thread.
  const fetchThreadNotes = useCallback(async (tid) => {
    if (!tid) {
      setNotesByMessage(new Map());
      return;
    }
    const token = localStorage.getItem('token');
    if (!token) return;
    setLoadingThread(true);
    try {
      const res = await fetch(`${API_URL}/api/oracle/notes/thread/${encodeURIComponent(tid)}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) { setNotesByMessage(new Map()); return; }
      const data = await res.json();
      if (currentThreadRef.current === tid) {
        setNotesByMessage(bucketize(data.notes || []));
      }
    } catch {
      setNotesByMessage(new Map());
    } finally {
      setLoadingThread(false);
    }
  }, [bucketize]);

  // Refetch when thread or open-state changes.
  useEffect(() => {
    currentThreadRef.current = threadId || null;
    if (isOpen && threadId) {
      fetchThreadNotes(threadId);
    } else if (!threadId) {
      setNotesByMessage(new Map());
    }
  }, [threadId, isOpen, fetchThreadNotes]);

  // Listen for cross-component changes (e.g. Library deletes a note).
  useEffect(() => {
    const handler = (e) => {
      const tid = e.detail?.threadId;
      // If the change touched our thread, refetch
      if (!tid || tid === currentThreadRef.current) {
        if (currentThreadRef.current) fetchThreadNotes(currentThreadRef.current);
      }
    };
    window.addEventListener(NOTES_EVENT, handler);
    return () => window.removeEventListener(NOTES_EVENT, handler);
  }, [fetchThreadNotes]);

  const broadcast = useCallback((tid) => {
    window.dispatchEvent(new CustomEvent(NOTES_EVENT, { detail: { threadId: tid } }));
  }, []);

  // ---- CRUD ----

  const createNote = useCallback(async (payload) => {
    const token = localStorage.getItem('token');
    if (!token) return null;
    try {
      const res = await fetch(`${API_URL}/api/oracle/notes`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (res.status === 403) {
        onPremiumRequired && onPremiumRequired();
        return null;
      }
      if (!res.ok) return null;

      const { note } = await res.json();
      // Optimistic local insert
      setNotesByMessage(prev => {
        const next = new Map(prev);
        const arr = next.get(note.messageTimestamp) || [];
        next.set(note.messageTimestamp, [...arr, note]);
        return next;
      });
      broadcast(note.threadId);
      return note;
    } catch (err) {
      console.error('Create note failed:', err);
      return null;
    }
  }, [onPremiumRequired, broadcast]);

  const updateNote = useCallback(async (id, patch) => {
    const token = localStorage.getItem('token');
    if (!token) return null;
    try {
      const res = await fetch(`${API_URL}/api/oracle/notes/${id}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(patch)
      });
      if (!res.ok) return null;
      const { note } = await res.json();
      setNotesByMessage(prev => {
        const next = new Map(prev);
        const arr = next.get(note.messageTimestamp) || [];
        next.set(note.messageTimestamp, arr.map(n => n._id === note._id ? note : n));
        return next;
      });
      broadcast(note.threadId);
      return note;
    } catch (err) {
      console.error('Update note failed:', err);
      return null;
    }
  }, [broadcast]);

  const deleteNote = useCallback(async (id, messageTimestamp, threadIdHint) => {
    const token = localStorage.getItem('token');
    if (!token) return false;
    try {
      const res = await fetch(`${API_URL}/api/oracle/notes/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) return false;
      setNotesByMessage(prev => {
        const next = new Map(prev);
        if (messageTimestamp) {
          const arr = (next.get(messageTimestamp) || []).filter(n => n._id !== id);
          if (arr.length === 0) next.delete(messageTimestamp);
          else next.set(messageTimestamp, arr);
        }
        return next;
      });
      broadcast(threadIdHint || currentThreadRef.current);
      return true;
    } catch (err) {
      console.error('Delete note failed:', err);
      return false;
    }
  }, [broadcast]);

  const fetchLibrary = useCallback(async ({ limit = 100, skip = 0 } = {}) => {
    const token = localStorage.getItem('token');
    if (!token) return { notes: [], total: 0, hasMore: false };
    try {
      const res = await fetch(`${API_URL}/api/oracle/notes/library?limit=${limit}&skip=${skip}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) return { notes: [], total: 0, hasMore: false };
      return await res.json();
    } catch {
      return { notes: [], total: 0, hasMore: false };
    }
  }, []);

  return {
    notesByMessage,
    loadingThread,
    createNote,
    updateNote,
    deleteNote,
    fetchLibrary,
  };
}
