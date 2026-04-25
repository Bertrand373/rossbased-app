// src/hooks/useFeedbackReplies.js
// Fetches admin replies to this user's feedback (pending = unacknowledged).
// One-shot per app load. Acknowledge marks it dismissed forever.

import { useState, useEffect, useCallback } from 'react';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001';

export const useFeedbackReplies = (isLoggedIn, username) => {
  const [pending, setPending] = useState([]);

  const fetchPending = useCallback(async () => {
    if (!isLoggedIn || !username) return;
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      const res = await fetch(`${API_URL}/api/feedback-replies/pending`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) return;
      const data = await res.json();
      setPending(data.replies || []);
    } catch {
      // silent — non-critical
    }
  }, [isLoggedIn, username]);

  const acknowledge = useCallback(async (replyId) => {
    setPending(prev => prev.filter(r => r._id !== replyId));
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      await fetch(`${API_URL}/api/feedback-replies/${replyId}/acknowledge`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch {
      // already removed locally — silent
    }
  }, []);

  useEffect(() => {
    if (isLoggedIn && username) fetchPending();
  }, [isLoggedIn, username, fetchPending]);

  return { pending, fetchPending, acknowledge };
};
