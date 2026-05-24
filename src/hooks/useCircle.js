// src/hooks/useCircle.js
//
// Circle state and operations. Provides a single source of truth so the
// header CircleStack and the CircleSheet share data without dueling
// fetches. All mutations refetch immediately so the UI never lies about
// who reported.
//
// Surface:
//   CircleProvider   — wraps the app once
//   useCircle()      — { circle, loading, refresh,
//                        createCircle, joinByCode, leave,
//                        submitCheckIn, removeCheckIn,
//                        todayLocal }

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { format } from 'date-fns';

const API_URL = process.env.REACT_APP_API_URL || 'https://rossbased-app.onrender.com';

const CircleContext = createContext(null);

// yyyy-MM-dd in the user's local timezone — used both as the cache key
// for "today's check-ins" and as the date sent on submit.
function getLocalDateString(date = new Date()) {
  return format(date, 'yyyy-MM-dd');
}

async function apiFetch(path, { method = 'GET', body, headers = {} } = {}) {
  const token = localStorage.getItem('token');
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers
    },
    body: body ? JSON.stringify(body) : undefined
  });
  let data = null;
  try { data = await res.json(); } catch { /* non-JSON response */ }
  if (!res.ok) {
    const err = new Error(data?.error || `Request failed (${res.status})`);
    err.status = res.status;
    err.code = data?.code;
    throw err;
  }
  return data;
}

export function CircleProvider({ children, isLoggedIn }) {
  const [circle, setCircle] = useState(null);
  const [loading, setLoading] = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => () => { mountedRef.current = false; }, []);

  const todayLocal = getLocalDateString();

  // Single read path. Anything that mutates state should call this
  // afterward so the UI snaps to the truth.
  const refresh = useCallback(async () => {
    if (!isLoggedIn) {
      setCircle(null);
      return null;
    }
    setLoading(true);
    try {
      const data = await apiFetch(`/api/circles/mine?date=${getLocalDateString()}`);
      if (!mountedRef.current) return data;
      setCircle(data?.circle || null);
      return data;
    } catch (err) {
      console.warn('Circle fetch failed:', err.message);
      if (mountedRef.current) setCircle(null);
      return null;
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [isLoggedIn]);

  // Refetch on login + when the tab regains focus (covers the case where
  // a member joined while the app was backgrounded).
  useEffect(() => {
    if (!isLoggedIn) {
      setCircle(null);
      return undefined;
    }
    refresh();
    const onFocus = () => refresh();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [isLoggedIn, refresh]);

  const createCircle = useCallback(async (name) => {
    const data = await apiFetch('/api/circles', { method: 'POST', body: { name } });
    await refresh();
    return data;
  }, [refresh]);

  const joinByCode = useCallback(async (code) => {
    const data = await apiFetch('/api/circles/join', { method: 'POST', body: { code } });
    await refresh();
    return data;
  }, [refresh]);

  const leave = useCallback(async () => {
    const data = await apiFetch('/api/circles/leave', { method: 'DELETE' });
    setCircle(null);
    await refresh();
    return data;
  }, [refresh]);

  const submitCheckIn = useCallback(async ({ note = '', streakDay = 0 } = {}) => {
    const data = await apiFetch('/api/circles/check-in', {
      method: 'POST',
      body: { date: getLocalDateString(), note, streakDay }
    });
    await refresh();
    return data;
  }, [refresh]);

  const removeCheckIn = useCallback(async () => {
    const data = await apiFetch(`/api/circles/check-in?date=${getLocalDateString()}`, {
      method: 'DELETE'
    });
    await refresh();
    return data;
  }, [refresh]);

  const value = {
    circle,
    loading,
    refresh,
    createCircle,
    joinByCode,
    leave,
    submitCheckIn,
    removeCheckIn,
    todayLocal
  };

  return <CircleContext.Provider value={value}>{children}</CircleContext.Provider>;
}

export function useCircle() {
  const ctx = useContext(CircleContext);
  if (!ctx) {
    // Allow components to render before the provider mounts (e.g. during
    // logout) by returning a safe default. They render their empty state.
    return {
      circle: null,
      loading: false,
      refresh: async () => null,
      createCircle: async () => null,
      joinByCode: async () => null,
      leave: async () => null,
      submitCheckIn: async () => null,
      removeCheckIn: async () => null,
      todayLocal: getLocalDateString()
    };
  }
  return ctx;
}
