// src/components/AIChat/AIChat.js
// Premium AI Chat with streaming responses
// Now controlled by header button instead of floating FAB
import React, { useState, useEffect, useRef, useCallback } from 'react';
import './AIChat.css';
import useSheetSwipe from '../../hooks/useSheetSwipe';
import useOracleNotes from '../../hooks/useOracleNotes';
import { useScrollDirection } from '../../hooks/useScrollDirection';
import { renderOracleContent } from './renderOracleContent';
import HighlightPalette from './HighlightPalette';
import MarginaliaSheet from './MarginaliaSheet';
import NotesLibrary from './NotesLibrary';
import toast from 'react-hot-toast';

// Mixpanel tracking
import { trackAIChatOpened, trackAIMessageSent, trackAILimitReached } from '../../utils/mixpanel';

const API_URL = process.env.REACT_APP_API_URL || 'https://rossbased-app.onrender.com';

// Storage keys — scoped by username so accounts don't share history
const getUsername = () => {
  try {
    const token = localStorage.getItem('token');
    if (token) return JSON.parse(atob(token.split('.')[1])).username || null;
  } catch {}
  return null;
};
const getThreadsListKey = () => {
  const u = getUsername();
  return u ? `titantrack_oracle_threads_${u}` : 'titantrack_oracle_threads';
};
const getActiveThreadKey = () => {
  const u = getUsername();
  return u ? `titantrack_oracle_active_thread_${u}` : 'titantrack_oracle_active_thread';
};
const getThreadMessagesKey = (threadId) => {
  const u = getUsername();
  return u && threadId ? `titantrack_oracle_thread_${u}_${threadId}` : null;
};
const MAX_STORED_MESSAGES = 200; // matches server cap per thread
const MAX_CONTEXT_MESSAGES = 10; // Send last 10 to Claude

// Stable thread id generator — uuidv4 if available, else timestamp-based fallback
const newThreadId = () => {
  try {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  } catch {}
  return `t-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
};

// Format a timestamp as a relative-time string for sidebar thread rows
const formatThreadTime = (ts) => {
  if (!ts) return '';
  const d = new Date(ts);
  if (isNaN(d.getTime())) return '';
  const now = new Date();
  const diff = (now.getTime() - d.getTime()) / 1000;
  if (diff < 60) return 'now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  if (diff < 86400 * 2) return 'yesterday';
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)}d`;
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
};

// Oracle message rendering — bold/italic markdown PLUS inline highlight
// overlays from saved Oracle Notes. See ./renderOracleContent.js.

// Streaming word-fade renderer — wraps each word in a span with CSS fade animation.
// Splits by /(\s+)/ to preserve whitespace (including \n\n paragraph breaks) between words.
// Each word span keys by index — React mounts new spans as they arrive, triggering
// the fade animation only for new words. Already-faded words don't re-animate.
// Does NOT run markdown parsing during streaming (bold/italic applies after completion,
// when the message is rendered via renderMarkdown as a regular finalized message).
const renderStreamingWords = (text) => {
  if (!text) return text;

  // Split preserving whitespace: "Day 44.\n\nThe body" → ["Day"," ","44.","\n\n","The"," ","body"]
  const tokens = text.split(/(\s+)/);
  const nodes = [];
  let wordIndex = 0;

  for (let i = 0; i < tokens.length; i++) {
    const tok = tokens[i];
    if (!tok) continue; // skip empty strings from split
    if (/^\s+$/.test(tok)) {
      // Pure whitespace — emit raw so pre-wrap preserves \n and paragraph breaks
      nodes.push(tok);
    } else {
      nodes.push(
        <span key={`w${wordIndex++}`} className="ai-chat-stream-word">{tok}</span>
      );
    }
  }

  return nodes;
};

// ============================================================
// SHARE CARD — Canvas-generated branded PNG
// Draws a dark glass card matching the Oracle chat aesthetic,
// with eye icon, ORACLE wordmark, styled message, and footer.
// Supports **bold**, *italic*, multi-paragraph, auto word-wrap.
// ============================================================

const generateShareCard = (messageText) => {
  return new Promise((resolve) => {
    const S = 2; // retina scale
    const W = 360 * S;
    const padX = 24 * S;
    const padTop = 28 * S;
    const padBot = 22 * S;
    const R = 16 * S;
    const fontStack = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

    // Header — uses oracle-wordmark.png (the branded wordmark with Eye of Horus)
    const wmHeight = 22 * S;
    const headerGap = 22 * S;

    // Message typography — matches .ai-chat-message.assistant
    const msgSize = 14.5 * S;
    const msgLH = Math.round(msgSize * 1.85);
    const borderPad = 14 * S;
    const textX = padX + borderPad;
    const textW = W - textX - padX;
    const paraGap = 20 * S;

    const fonts = {
      regular: `300 ${msgSize}px ${fontStack}`,
      bold:    `500 ${msgSize}px ${fontStack}`,
      italic:  `italic 300 ${msgSize}px ${fontStack}`
    };
    const colors = {
      regular: 'rgba(255,255,255,0.85)',
      bold:    'rgba(255,255,255,0.95)',
      italic:  'rgba(255,255,255,0.65)'
    };

    // Footer
    const footGap = 24 * S;
    const footPad = 16 * S;
    const footFont = 11 * S;
    const ttFont = 8.5 * S;

    // Parse **bold** and *italic* segments
    const parseSegments = (text) => {
      const segs = [];
      const rx = /\*\*(.+?)\*\*|\*(.+?)\*/gs;
      let last = 0, m;
      while ((m = rx.exec(text)) !== null) {
        if (m.index > last) segs.push({ text: text.slice(last, m.index), style: 'regular' });
        if (m[1]) segs.push({ text: m[1], style: 'bold' });
        else if (m[2]) segs.push({ text: m[2], style: 'italic' });
        last = rx.lastIndex;
      }
      if (last < text.length) segs.push({ text: text.slice(last), style: 'regular' });
      return segs.length > 0 ? segs : [{ text, style: 'regular' }];
    };

    // Measurement context
    const mc = document.createElement('canvas').getContext('2d');

    // Word-wrap styled segments to fit textW
    const wrapLine = (segs) => {
      const tokens = [];
      for (const s of segs) {
        for (const p of s.text.split(/( +)/)) {
          if (p) tokens.push({ text: p, style: s.style });
        }
      }
      const lines = [];
      let line = [], lw = 0;
      for (const tok of tokens) {
        mc.font = fonts[tok.style];
        const w = mc.measureText(tok.text).width;
        if (lw + w > textW && line.length > 0 && tok.text.trim()) {
          while (line.length && !line[line.length - 1].text.trim()) line.pop();
          lines.push(line);
          line = []; lw = 0;
          if (!tok.text.trim()) continue;
        }
        line.push(tok);
        lw += w;
      }
      if (line.length) lines.push(line);
      return lines;
    };

    // Process: split paragraphs (\n\n), then lines (\n), then word-wrap
    const clean = messageText.replace(/\r/g, '');
    const paras = clean.split(/\n\n+/).filter(p => p.trim());
    const allLines = []; // array of line-token-arrays or null (paragraph break)
    for (let p = 0; p < paras.length; p++) {
      const subLines = paras[p].split('\n');
      for (const sub of subLines) {
        if (!sub.trim()) continue;
        const wrapped = wrapLine(parseSegments(sub.trim()));
        allLines.push(...wrapped);
      }
      if (p < paras.length - 1) allLines.push(null); // paragraph gap marker
    }

    // Calculate total text height
    let textH = 0;
    for (const line of allLines) {
      textH += line === null ? paraGap : msgLH;
    }

    // Derive card height
    const contentY = padTop + wmHeight + headerGap;
    const msgEndY = contentY + textH;
    const sepY = msgEndY + footGap;
    const footTextY = sepY + footPad;
    const H = Math.ceil(footTextY + footFont + padBot);

    // Load Oracle wordmark then draw
    const wm = new Image();
    wm.crossOrigin = 'anonymous';
    let wmOk = false;

    const draw = () => {
      const c = document.createElement('canvas');
      c.width = W; c.height = H;
      const ctx = c.getContext('2d');

      // — Background (clipped to rounded rect) —
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(0, 0, W, H, R);
      ctx.clip();
      const bg = ctx.createLinearGradient(W * 0.2, 0, W * 0.8, H);
      bg.addColorStop(0, '#1c1c1e');
      bg.addColorStop(1, '#0e0e10');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, W, H);

      // Glass highlight (top 50%)
      const gl = ctx.createLinearGradient(0, 0, 0, H * 0.5);
      gl.addColorStop(0, 'rgba(255,255,255,0.04)');
      gl.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = gl;
      ctx.fillRect(0, 0, W, H * 0.5);
      ctx.restore();

      // — Card border —
      ctx.beginPath();
      ctx.roundRect(S * 0.5, S * 0.5, W - S, H - S, R);
      ctx.strokeStyle = 'rgba(255,255,255,0.07)';
      ctx.lineWidth = S;
      ctx.stroke();

      // — Oracle wordmark (oracle-wordmark.png — branded with Eye of Horus) —
      if (wmOk) {
        const aspect = wm.naturalWidth / wm.naturalHeight;
        const drawW = wmHeight * aspect;
        ctx.globalAlpha = 0.85;
        ctx.drawImage(wm, padX, padTop, drawW, wmHeight);
        ctx.globalAlpha = 1;
      }

      // — Left border line —
      ctx.beginPath();
      ctx.moveTo(padX + S * 0.5, contentY);
      ctx.lineTo(padX + S * 0.5, msgEndY);
      ctx.strokeStyle = 'rgba(255,255,255,0.08)';
      ctx.lineWidth = S;
      ctx.stroke();

      // — Message text —
      ctx.textBaseline = 'top';
      let y = contentY;
      for (const line of allLines) {
        if (line === null) { y += paraGap; continue; }
        let lx = textX;
        for (const tok of line) {
          ctx.font = fonts[tok.style];
          ctx.fillStyle = colors[tok.style];
          ctx.fillText(tok.text, lx, y);
          lx += ctx.measureText(tok.text).width;
        }
        y += msgLH;
      }

      // — Footer separator —
      ctx.beginPath();
      ctx.moveTo(padX, sepY);
      ctx.lineTo(W - padX, sepY);
      ctx.strokeStyle = 'rgba(255,255,255,0.04)';
      ctx.lineWidth = S;
      ctx.stroke();

      // — Footer: titantrack.app (left) —
      ctx.textBaseline = 'middle';
      const fmid = footTextY + footFont / 2;
      ctx.font = `400 ${footFont}px ${fontStack}`;
      ctx.fillStyle = 'rgba(255,255,255,0.18)';
      ctx.fillText('titantrack.app', padX, fmid);

      // — Footer: TITANTRACK (right, spaced) —
      ctx.font = `700 ${ttFont}px ${fontStack}`;
      ctx.fillStyle = 'rgba(255,255,255,0.1)';
      const ttSp = 2.5 * S;
      const ttChars = 'TITANTRACK'.split('');
      let ttW = 0;
      for (const ch of ttChars) ttW += ctx.measureText(ch).width + ttSp;
      ttW -= ttSp;
      let tx = W - padX - ttW;
      for (const ch of ttChars) {
        ctx.fillText(ch, tx, fmid);
        tx += ctx.measureText(ch).width + ttSp;
      }

      c.toBlob((blob) => resolve(blob), 'image/png');
    };

    wm.onload = () => { wmOk = true; draw(); };
    wm.onerror = () => draw();
    wm.src = '/oracle-wordmark.png';
  });
};

// Share an Oracle message — link-first (immersive page), canvas PNG fallback
const handleShareMessage = async (text, isTransmission) => {
  try {
    const token = localStorage.getItem('token');
    let shareUrl = null;

    // 1. Try creating a share link (immersive branded page)
    if (token) {
      try {
        const res = await fetch(`${API_URL}/api/oracle/share`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ message: text, isTransmission: !!isTransmission })
        });
        if (res.ok) {
          const data = await res.json();
          shareUrl = data.url;
        }
      } catch (_) { /* offline — fall through to canvas */ }
    }

    // 2. Share via native share sheet (link or image)
    if (shareUrl && navigator.share) {
      try {
        await navigator.share({
          text: shareUrl
        });
        return;
      } catch (err) {
        if (err.name === 'AbortError') return;
        // Native share failed — try clipboard
      }
    }

    // 3. Desktop with link: copy to clipboard
    if (shareUrl) {
      try {
        await navigator.clipboard.writeText(shareUrl);
        toast('Link copied', {
          icon: '⚡',
          style: { background: '#1a1a1a', color: '#fff', fontSize: '14px' }
        });
        return;
      } catch (_) { /* fall through to canvas */ }
    }

    // 4. Fallback: canvas-generated branded PNG (offline / link failed)
    const blob = await generateShareCard(text);
    const file = new File([blob], 'oracle.png', { type: 'image/png' });

    if (navigator.share && navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file] });
      return;
    }

    if (navigator.clipboard?.write) {
      try {
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': blob })
        ]);
        toast('Copied to clipboard', {
          icon: '⚡',
          style: { background: '#1a1a1a', color: '#fff', fontSize: '14px' }
        });
        return;
      } catch (_) { /* fall through to download */ }
    }

    // 5. Last resort: download image
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'oracle.png';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast('Image saved', {
      icon: '⚡',
      style: { background: '#1a1a1a', color: '#fff', fontSize: '14px' }
    });
  } catch (err) {
    if (err.name !== 'AbortError') console.error('Share failed:', err);
  }
};

const AIChat = ({ isLoggedIn, isOpen, onClose, openPlanModal }) => {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [usage, setUsage] = useState({
    messagesUsed: 0,
    messagesLimit: 5,
    messagesRemaining: 5,
    isBetaPeriod: true,
    isPremium: false,
    isGrandfathered: false,
    needsOracleIntro: false
  });
  const [error, setError] = useState(null);
  const [pinnedMessages, setPinnedMessages] = useState(new Map()); // timestamp → pinId

  // --- Oracle Notes (highlights + marginalia) ---
  // highlightPalette: floating color picker shown when user selects Oracle text
  // marginaliaNote:   the OracleNote currently being edited in the sheet
  // libraryOpen:      whether the Commonplace Book sheet is open
  const [highlightPalette, setHighlightPalette] = useState({
    visible: false, x: 0, y: 0, placement: 'above', range: null, message: null
  });
  const [marginaliaNote, setMarginaliaNote] = useState(null);
  const [libraryOpen, setLibraryOpen] = useState(false);

  // --- Threads (sidebar) ---
  // threads: array of { threadId, title, isPinned, isArchived, messageCount, lastMessageAt, preview }
  // activeThreadId: current thread (null until first thread is loaded/created)
  const [threads, setThreads] = useState([]);
  const [activeThreadId, setActiveThreadId] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [threadSearch, setThreadSearch] = useState('');
  const [threadMenuOpenFor, setThreadMenuOpenFor] = useState(null); // threadId
  const [renamingThreadId, setRenamingThreadId] = useState(null);
  const [renameValue, setRenameValue] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [confirmDeleteThreadId, setConfirmDeleteThreadId] = useState(null);

  // Server-side search across all message content.
  // null = not searching (show normal thread list). Array = results.
  const [searchResults, setSearchResults] = useState(null);
  const [searchLoading, setSearchLoading] = useState(false);
  // Target message inside an opened thread (after a search-result tap).
  // The body-scroll effect picks this up once messages load and scrolls to it.
  const [targetMessageTs, setTargetMessageTs] = useState(null);

  // --- Teach Oracle (admin-only) ---
  const [teachModal, setTeachModal] = useState(null); // { userMsg, oracleMsg, existingMatches, checking }
  const [teachForm, setTeachForm] = useState({ title: '', note: '', category: 'general' });
  const [teachStatus, setTeachStatus] = useState('idle'); // idle | saving | done | error
  
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const chatBodyRef = useRef(null);
  // Sticky thread title — slides in when user scrolls UP through history,
  // hides when scrolling DOWN toward the latest message. iOS Mail / Twitter
  // pattern. Hidden entirely near the top so it doesn't double up with the
  // main header wordmark.
  const { direction: scrollDirection, scrollTop: bodyScrollTop } = useScrollDirection(chatBodyRef);
  const panelRef = useRef(null);
  const hasTrackedOpen = useRef(false);
  const streamingMessageRef = useRef(null);
  const hasScrolledToStreamStart = useRef(false);
  const chatSyncTimer = useRef(null); // Debounced server sync
  const autoTitleThreadRef = useRef(null); // Stable handle so sendMessage can call it without dep cycle

  // Admin check — only rossbased sees Teach button
  const isAdmin = (() => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return false;
      const payload = JSON.parse(atob(token.split('.')[1]));
      return ['rossbased', 'ross'].includes(payload.username?.toLowerCase());
    } catch { return false; }
  })();

  // Oracle Notes — fetches notes for the active thread, exposes CRUD,
  // and routes 403 (premium required) into the plan modal.
  const {
    notesByMessage,
    createNote,
    updateNote,
    deleteNote,
    fetchLibrary
  } = useOracleNotes({
    threadId: activeThreadId,
    isOpen,
    onPremiumRequired: openPlanModal
  });

  // Track chat opened (once per open)
  useEffect(() => {
    if (isOpen && !hasTrackedOpen.current) {
      trackAIChatOpened();
      hasTrackedOpen.current = true;
    }
    if (!isOpen) {
      hasTrackedOpen.current = false;
    }
  }, [isOpen]);

  // Load threads list + active thread messages.
  // Order: cached threads (instant), cached active-thread messages (instant),
  //        then GET /threads (source of truth, auto-migrates legacy history),
  //        then GET /threads/:active (definitive messages).
  useEffect(() => {
    if (!isLoggedIn) return;

    // 1. Instant: cached threads list
    try {
      const cachedList = localStorage.getItem(getThreadsListKey());
      if (cachedList) {
        const parsed = JSON.parse(cachedList);
        if (Array.isArray(parsed)) setThreads(parsed);
      }
      const cachedActive = localStorage.getItem(getActiveThreadKey());
      if (cachedActive) {
        setActiveThreadId(cachedActive);
        const msgKey = getThreadMessagesKey(cachedActive);
        if (msgKey) {
          const cachedMsgs = localStorage.getItem(msgKey);
          if (cachedMsgs) {
            try {
              const parsedMsgs = JSON.parse(cachedMsgs);
              if (Array.isArray(parsedMsgs)) setMessages(parsedMsgs.slice(-MAX_STORED_MESSAGES));
            } catch {}
          }
        }
      }
    } catch (e) {
      console.error('Failed to load cached threads:', e);
    }

    // 2. Server: fetch thread list (may trigger lazy migration server-side)
    const token = localStorage.getItem('token');
    if (token) {
      fetch(`${API_URL}/api/oracle/threads`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
        .then(res => res.ok ? res.json() : null)
        .then(data => {
          if (!data?.threads) return;
          setThreads(data.threads);
          try { localStorage.setItem(getThreadsListKey(), JSON.stringify(data.threads)); } catch {}

          // Pick active thread: prior cached id if it still exists, else most recent
          const cachedActive = localStorage.getItem(getActiveThreadKey());
          const stillExists = data.threads.find(t => t.threadId === cachedActive);
          const preferred = stillExists?.threadId || data.threads[0]?.threadId || null;

          if (preferred) {
            // Load messages for the chosen active thread
            fetch(`${API_URL}/api/oracle/threads/${preferred}`, {
              headers: { 'Authorization': `Bearer ${token}` }
            })
              .then(r => r.ok ? r.json() : null)
              .then(threadData => {
                if (!threadData?.messages) return;
                setActiveThreadId(preferred);
                try { localStorage.setItem(getActiveThreadKey(), preferred); } catch {}
                setMessages(threadData.messages.slice(-MAX_STORED_MESSAGES));
                const cacheKey = getThreadMessagesKey(preferred);
                if (cacheKey) {
                  try {
                    const toCache = threadData.messages.filter(m => !m.isTransmission).slice(-MAX_STORED_MESSAGES);
                    localStorage.setItem(cacheKey, JSON.stringify(toCache));
                  } catch {}
                }
              })
              .catch(() => {});
          } else {
            // Brand-new user: no threads at all. Leave activeThreadId null —
            // sendMessage will create one on the first message.
            setActiveThreadId(null);
            setMessages([]);
          }
        })
        .catch(() => { /* offline — cached state already shown */ });
    }

    fetchUsage();
    fetchUnreadTransmissions();
  }, [isLoggedIn]);

  // Debounced server-side search across all messages.
  // <2 chars = clear search (show normal thread list).
  useEffect(() => {
    const q = threadSearch.trim();
    if (q.length < 2) {
      setSearchResults(null);
      setSearchLoading(false);
      return;
    }
    const token = localStorage.getItem('token');
    if (!token) return;

    setSearchLoading(true);
    const handle = setTimeout(async () => {
      try {
        const res = await fetch(`${API_URL}/api/oracle/threads/search?q=${encodeURIComponent(q)}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) { setSearchResults([]); return; }
        const data = await res.json();
        setSearchResults(data.results || []);
      } catch {
        setSearchResults([]);
      } finally {
        setSearchLoading(false);
      }
    }, 250);

    return () => clearTimeout(handle);
  }, [threadSearch]);

  // Load existing pin state — so "Pinned" persists across reloads
  useEffect(() => {
    if (!isLoggedIn) return;
    const token = localStorage.getItem('token');
    if (!token) return;
    // Fetch pins for a wide range (last 2 years) to catch all pinned messages
    const now = new Date();
    const from = `${now.getFullYear() - 2}-01-01`;
    const to = `${now.getFullYear() + 1}-12-31`;
    fetch(`${API_URL}/api/oracle/pins?from=${from}&to=${to}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data?.pins?.length) {
          const map = new Map();
          for (const pin of data.pins) {
            map.set(pin.messageTimestamp, pin._id);
          }
          setPinnedMessages(map);
        }
      })
      .catch(() => { /* offline — silent */ });
  }, [isLoggedIn]);

  // Sync pin state when Calendar removes a pin
  useEffect(() => {
    const handler = (e) => {
      const ts = e.detail?.removedTimestamp;
      if (ts) {
        setPinnedMessages(prev => { const next = new Map(prev); next.delete(ts); return next; });
      }
    };
    window.addEventListener('oracle-pins-changed', handler);
    return () => window.removeEventListener('oracle-pins-changed', handler);
  }, []);

  // Fetch unread transmissions when chat opens
  useEffect(() => {
    if (isOpen && isLoggedIn) {
      fetchUnreadTransmissions();
    }
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  // Oracle First Contact — auto-stream intro on first open
  useEffect(() => {
    if (!isOpen || !isLoggedIn || !usage.needsOracleIntro) return;
    if (messages.length > 0) return; // Already has chat history, skip

    const fireIntro = async () => {
      const token = localStorage.getItem('token');
      if (!token) return;

      setIsLoading(true);
      setStreamingText('');

      try {
        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
        const response = await fetch(`${API_URL}/api/oracle/intro/stream`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ timezone: tz })
        });

        if (!response.ok) return;

        // Check if JSON skip response (already introduced / no start date)
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) return;

        // SSE stream — same parsing as sendMessage
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let fullResponse = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') continue;
              try {
                const parsed = JSON.parse(data);
                if (parsed.type === 'content') {
                  fullResponse += parsed.text;
                  setStreamingText(fullResponse);
                }
              } catch { /* incomplete chunk */ }
            }
          }
        }

        if (fullResponse) {
          setMessages(prev => [...prev, {
            role: 'assistant',
            content: fullResponse,
            timestamp: new Date().toISOString()
          }]);
          setUsage(prev => ({ ...prev, needsOracleIntro: false }));
          window.__oracleUnreadCount = 0;
          window.dispatchEvent(new CustomEvent('oracle-unread', { detail: 0 }));
        }
      } catch (err) {
        console.error('Oracle intro error:', err);
      } finally {
        setIsLoading(false);
        setStreamingText('');
      }
    };

    fireIntro();
  }, [isOpen, isLoggedIn, usage.needsOracleIntro]); // eslint-disable-line react-hooks/exhaustive-deps

  // Check for unread transmissions periodically (for nav badge)
  useEffect(() => {
    if (!isLoggedIn) return;
    const checkUnread = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;
        const res = await fetch(`${API_URL}/api/oracle/transmissions`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          const count = (data.transmissions || []).length;
          // Expose unread count globally for nav badge
          window.__oracleUnreadCount = count;
          window.dispatchEvent(new CustomEvent('oracle-unread', { detail: count }));
        }
      } catch (e) { /* silent */ }
    };
    checkUnread();
    const interval = setInterval(checkUnread, 5 * 60 * 1000); // Every 5 minutes
    return () => clearInterval(interval);
  }, [isLoggedIn]);

  // Fetch and inject unread Oracle transmissions into chat
  const fetchUnreadTransmissions = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      const res = await fetch(`${API_URL}/api/oracle/transmissions`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) return;
      const data = await res.json();
      const transmissions = data.transmissions || [];
      if (transmissions.length === 0) return;

      // Inject as Oracle messages (newest first, so reverse for chronological)
      const txMessages = transmissions.reverse().map(tx => ({
        role: 'assistant',
        content: tx.message,
        timestamp: tx.createdAt,
        isTransmission: true
      }));

      setMessages(prev => {
        // Avoid duplicates: check if we already have these transmission messages
        const existingContent = new Set(prev.filter(m => m.isTransmission).map(m => m.content));
        const newTx = txMessages.filter(m => !existingContent.has(m.content));
        if (newTx.length === 0) return prev;
        return [...prev, ...newTx];
      });

      // Mark as read
      for (const tx of transmissions) {
        fetch(`${API_URL}/api/oracle/transmissions/${tx._id}/read`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` }
        }).catch(() => {}); // fire-and-forget
      }

      // Clear unread count
      window.__oracleUnreadCount = 0;
      window.dispatchEvent(new CustomEvent('oracle-unread', { detail: 0 }));
    } catch (err) {
      console.error('Failed to fetch transmissions:', err);
    }
  };

  // Save active thread's messages → localStorage + debounced server sync.
  // Without an active thread there's nothing to persist yet (PUT would create
  // an empty thread). Once a thread exists, every change is synced 2s after.
  useEffect(() => {
    if (!activeThreadId || messages.length === 0) {
      if (chatSyncTimer.current) clearTimeout(chatSyncTimer.current);
      return;
    }

    const toStore = messages.filter(m => !m.isTransmission).slice(-MAX_STORED_MESSAGES);
    const cacheKey = getThreadMessagesKey(activeThreadId);
    if (cacheKey) {
      try { localStorage.setItem(cacheKey, JSON.stringify(toStore)); } catch {}
    }

    if (chatSyncTimer.current) clearTimeout(chatSyncTimer.current);
    chatSyncTimer.current = setTimeout(() => {
      const token = localStorage.getItem('token');
      if (!token) return;
      fetch(`${API_URL}/api/oracle/threads/${activeThreadId}`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: toStore })
      })
        .then(res => res.ok ? res.json() : null)
        .then(data => {
          if (data?.thread) {
            // Update the thread row in the sidebar (lastMessageAt, preview, messageCount)
            setThreads(prev => {
              const map = new Map(prev.map(t => [t.threadId, t]));
              map.set(data.thread.threadId, { ...map.get(data.thread.threadId), ...data.thread });
              const next = Array.from(map.values()).sort((a, b) => {
                if (!!b.isPinned !== !!a.isPinned) return (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0);
                return new Date(b.lastMessageAt || 0) - new Date(a.lastMessageAt || 0);
              });
              try { localStorage.setItem(getThreadsListKey(), JSON.stringify(next)); } catch {}
              return next;
            });
          }
        })
        .catch(() => { /* offline — localStorage has it */ });
    }, 2000);

    return () => { if (chatSyncTimer.current) clearTimeout(chatSyncTimer.current); };
  }, [messages, activeThreadId]);

  // Scroll to bottom when chat opens (land at latest message instantly)
  useEffect(() => {
    if (isOpen && messages.length > 0) {
      // Instant — don't make users watch old messages scroll by
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'instant' });
      }, 50);
    }
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  // Scroll to a specific message after a search-result tap.
  // Finds [data-message-ts="..."] in the chat body, scrolls it into view,
  // briefly flashes it. Then clears the target so we don't re-trigger.
  useEffect(() => {
    if (!targetMessageTs || messages.length === 0) return;

    const timer = setTimeout(() => {
      const root = chatBodyRef.current;
      if (!root) return;
      const node = root.querySelector(`[data-message-ts="${CSS.escape(targetMessageTs)}"]`);
      if (node) {
        node.scrollIntoView({ behavior: 'smooth', block: 'center' });
        node.classList.add('message-target-flash');
        // Class auto-removes after the CSS animation; clean up anyway
        setTimeout(() => node.classList.remove('message-target-flash'), 1800);
      }
      setTargetMessageTs(null);
    }, 80); // give the freshly-loaded list a tick to paint

    return () => clearTimeout(timer);
  }, [targetMessageTs, messages]);

  // Scroll to bottom when user sends a message or transmission arrives
  useEffect(() => {
    if (!isOpen) return;
    const lastMsg = messages[messages.length - 1];
    if (lastMsg?.role === 'user' || lastMsg?.isTransmission) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  // Scroll to TOP of Oracle response once when streaming begins
  useEffect(() => {
    if (!isOpen) return;
    if (streamingText && !hasScrolledToStreamStart.current) {
      hasScrolledToStreamStart.current = true;
      streamingMessageRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    if (!streamingText) {
      hasScrolledToStreamStart.current = false;
    }
  }, [streamingText, isOpen]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen && inputRef.current && !isLoading && usage.messagesRemaining > 0) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen, isLoading, usage.messagesRemaining]);

  // Lock body scroll when chat is open
  useEffect(() => {
    if (isOpen) {
      document.body.classList.add('modal-open');
    } else {
      document.body.classList.remove('modal-open');
    }
    return () => document.body.classList.remove('modal-open');
  }, [isOpen]);

  // iOS PWA keyboard fix — lift panel above keyboard via visualViewport
  // Previous version only resized the panel's height, which did nothing because
  // `position: fixed; bottom: 0;` kept the bottom glued to the screen (behind the
  // keyboard). Setting `bottom` to the keyboard inset is what actually lifts it.
  useEffect(() => {
    if (!isOpen || !window.visualViewport) return;
    const vv = window.visualViewport;
    const panel = panelRef.current;
    if (!panel) return;

    const adjust = () => {
      const keyboardInset = window.innerHeight - vv.height - vv.offsetTop;
      if (keyboardInset > 50) {
        // Keyboard is open — lift the panel above it and shrink to fit
        panel.style.bottom = `${keyboardInset}px`;
        panel.style.height = `${vv.height}px`;
      } else {
        // Keyboard closed — reset to CSS defaults
        panel.style.bottom = '';
        panel.style.height = '';
      }
    };

    vv.addEventListener('resize', adjust);
    vv.addEventListener('scroll', adjust);
    adjust(); // Run once on open in case keyboard is already up
    return () => {
      vv.removeEventListener('resize', adjust);
      vv.removeEventListener('scroll', adjust);
      if (panel) {
        panel.style.bottom = '';
        panel.style.height = '';
      }
    };
  }, [isOpen]);

  // Track when limit is reached
  useEffect(() => {
    if (usage.messagesRemaining === 0 && usage.messagesLimit > 0) {
      trackAILimitReached();
    }
  }, [usage.messagesRemaining, usage.messagesLimit]);

  // Swipe-to-close (mobile drawer) — non-passive so iOS respects preventDefault
  useSheetSwipe(panelRef, isOpen, onClose);

  // Fetch usage stats
  const fetchUsage = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const response = await fetch(`${API_URL}/api/ai/usage?timezone=${encodeURIComponent(tz)}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setUsage(data);
        // Show gold dot if Oracle intro is pending
        if (data.needsOracleIntro) {
          window.__oracleUnreadCount = 1;
          window.dispatchEvent(new CustomEvent('oracle-unread', { detail: 1 }));
        }
      }
    } catch (err) {
      console.error('Failed to fetch AI usage:', err);
    }
  };

  // Send message with streaming
  const sendMessage = useCallback(async () => {
    if (!inputValue.trim() || isLoading || usage.messagesRemaining <= 0) return;

    // Ensure we have an active thread before sending. If none exists yet
    // (brand new user, or all threads deleted), generate an id here. We do
    // NOT add the thread to the sidebar list — it materializes after the
    // first PUT lands (the response brings back the canonical thread row).
    let threadIdForSend = activeThreadId;
    let isBrandNewThread = false;
    if (!threadIdForSend) {
      threadIdForSend = newThreadId();
      setActiveThreadId(threadIdForSend);
      try { localStorage.setItem(getActiveThreadKey(), threadIdForSend); } catch {}
      isBrandNewThread = true;
    } else {
      // An active thread is set. Brand-new if it has no real messages yet —
      // that's how we detect "first message in this thread" for auto-title.
      // Works for both "thread in sidebar with 0 messages" and "id set by
      // createNewThread but not yet in sidebar" because either way messages=[].
      const nonTransmissionCount = messages.filter(m => !m.isTransmission).length;
      isBrandNewThread = nonTransmissionCount === 0;
    }

    const userMessage = {
      role: 'user',
      content: inputValue.trim(),
      timestamp: new Date().toISOString()
    };

    // Store input length before clearing
    const sentMessageLength = inputValue.trim().length;

    // Add user message immediately
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    // Reset textarea height
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
    }
    setIsLoading(true);
    setError(null);
    setStreamingText('');

    const token = localStorage.getItem('token');
    if (!token) {
      setError('Please log in to use AI chat');
      setIsLoading(false);
      return;
    }

    try {
      // Build conversation history for context (last N messages)
      const recentMessages = [...messages, userMessage]
        .slice(-MAX_CONTEXT_MESSAGES)
        .map(m => ({ role: m.role, content: m.content }));

      // Auto-detect user's timezone
      const detectedTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

      // Push latest ML risk snapshot to backend (for Oracle context)
      try {
        const riskData = localStorage.getItem('titantrack_ml_prediction');
        if (riskData) {
          const parsed = JSON.parse(riskData);
          // Extract username from JWT token (guaranteed to exist since we already have token)
          let username = null;
          try { username = JSON.parse(atob(token.split('.')[1])).username; } catch (e) { /* silent */ }
          if (username && parsed.riskScore !== undefined) {
            fetch(`${API_URL}/api/user/${username}/ml-risk`, {
              method: 'PUT',
              headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({
                riskScore: parsed.riskScore,
                riskLevel: parsed.riskLevel || 'unknown',
                topFactors: parsed.topFactors || []
              })
            }).catch(() => {}); // Fire and forget
          }
        }
      } catch (e) { /* silent */ }

      // Recovery bypass — one-shot bonus message granted by the relapse-recovery
      // flow. We consume the localStorage flag here (whether the request succeeds
      // or not) so a stuck flag can't permanently mark every future send.
      let useRecoveryBypass = false;
      try {
        if (localStorage.getItem('oracle_recovery_pending') === '1') {
          useRecoveryBypass = true;
          localStorage.removeItem('oracle_recovery_pending');
        }
      } catch { /* localStorage unavailable */ }

      const response = await fetch(`${API_URL}/api/ai/chat/stream`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: userMessage.content,
          conversationHistory: recentMessages.slice(0, -1), // Exclude current message
          timezone: detectedTimezone,
          useRecoveryBypass
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        
        if (response.status === 429) {
          setUsage(prev => ({ ...prev, messagesRemaining: 0 }));
          throw new Error(errorData.message || 'Daily limit reached');
        }
        
        throw new Error(errorData.error || 'Failed to get response');
      }

      // Handle streaming response
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullResponse = '';

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            
            if (data === '[DONE]') {
              // Stream complete
              continue;
            }
            
            try {
              const parsed = JSON.parse(data);
              
              if (parsed.type === 'content') {
                fullResponse += parsed.text;
                setStreamingText(fullResponse);
              } else if (parsed.type === 'usage') {
                setUsage({
                  messagesUsed: parsed.messagesUsed,
                  messagesLimit: parsed.messagesLimit,
                  messagesRemaining: parsed.messagesRemaining,
                  isBetaPeriod: parsed.isBetaPeriod,
                  isPremium: parsed.isPremium || false,
                  isGrandfathered: parsed.isGrandfathered || false
                });
              } else if (parsed.type === 'error') {
                throw new Error(parsed.message);
              }
            } catch (parseErr) {
              // Ignore parse errors for incomplete chunks
            }
          }
        }
      }

      // Add assistant message to history
      if (fullResponse) {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: fullResponse,
          timestamp: new Date().toISOString()
        }]);

        // Track message sent
        trackAIMessageSent(sentMessageLength, fullResponse.length);

        // Auto-title the thread if this was the first user message in it.
        // Delay slightly so the PUT sync persists messages first (server reads
        // them to generate the title). Call via ref so this useCallback doesn't
        // need autoTitleThread in its dep array.
        if (isBrandNewThread && threadIdForSend) {
          setTimeout(() => {
            const fn = autoTitleThreadRef.current;
            if (fn) fn(threadIdForSend);
          }, 2500);
        }
      }

    } catch (err) {
      console.error('AI Chat error:', err);
      // Show Oracle-themed error instead of raw technical message
      const isLimitError = err.message?.toLowerCase().includes('limit');
      setError(isLimitError 
        ? err.message 
        : 'The Oracle is momentarily between dimensions. Try again shortly.'
      );
      // Auto-dismiss non-limit errors after 6 seconds
      if (!isLimitError) {
        setTimeout(() => setError(prev => prev === 'The Oracle is momentarily between dimensions. Try again shortly.' ? null : prev), 6000);
      }
    } finally {
      setIsLoading(false);
      setStreamingText('');
    }
  }, [inputValue, isLoading, messages, usage.messagesRemaining, activeThreadId]);

  // Handle key press
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Format timestamp
  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: 'numeric', 
      minute: '2-digit'
    });
  };

  // ============================================================
  // Thread management
  // ============================================================

  // Switch to a different thread — load its messages, update active state.
  // On mobile, switching also dismisses the sidebar so the user lands in the
  // conversation immediately (the drawer covers the chat there).
  // Optional `targetTs` jumps to a specific message after the thread loads
  // (used by search-result taps).
  const switchToThread = useCallback(async (threadId, targetTs = null) => {
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
    if (targetTs) setTargetMessageTs(targetTs);
    if (!threadId || threadId === activeThreadId) {
      // Re-tapping the active thread should still close the drawer — the user's
      // intent is "take me back to the conversation."
      if (isMobile) setSidebarOpen(false);
      return;
    }

    // Cancel pending sync of previous thread — its content is already saved (debounce)
    if (chatSyncTimer.current) clearTimeout(chatSyncTimer.current);

    setActiveThreadId(threadId);
    try { localStorage.setItem(getActiveThreadKey(), threadId); } catch {}
    if (isMobile) setSidebarOpen(false);

    // Show cached messages instantly if we have them
    const cacheKey = getThreadMessagesKey(threadId);
    if (cacheKey) {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed)) setMessages(parsed.slice(-MAX_STORED_MESSAGES));
        } catch {}
      } else {
        setMessages([]);
      }
    } else {
      setMessages([]);
    }

    // Fetch authoritative messages from server
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      const res = await fetch(`${API_URL}/api/oracle/threads/${threadId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) return;
      const data = await res.json();
      if (data?.messages) {
        setMessages(data.messages.slice(-MAX_STORED_MESSAGES));
        if (cacheKey) {
          try {
            const toCache = data.messages.filter(m => !m.isTransmission).slice(-MAX_STORED_MESSAGES);
            localStorage.setItem(cacheKey, JSON.stringify(toCache));
          } catch {}
        }
      }
    } catch (_) { /* offline — cached is shown */ }
  }, [activeThreadId]);

  // Create a fresh thread. Optimistic: adds to local list immediately, server
  // PUT happens when the first message is sent (upsert path).
  // Create a fresh conversation slot. NO sidebar placeholder is pushed —
  // the thread materializes in the list only after the first message lands
  // (via the existing debounced PUT, which upserts and returns the thread
  // summary). This prevents orphan "New conversation" rows piling up if the
  // user clicks the pill multiple times without sending.
  const createNewThread = useCallback(() => {
    const id = newThreadId();
    setActiveThreadId(id);
    try { localStorage.setItem(getActiveThreadKey(), id); } catch {}
    setMessages([]);
    setError(null);
    // Close sidebar on mobile so the user lands in the chat
    if (window.innerWidth < 768) setSidebarOpen(false);
    setTimeout(() => inputRef.current?.focus(), 200);
  }, []);

  // PATCH the thread (rename, pin, archive) — optimistic UI
  const patchThread = useCallback(async (threadId, patch) => {
    setThreads(prev => {
      const next = prev.map(t => t.threadId === threadId ? { ...t, ...patch } : t);
      const sorted = [...next].sort((a, b) => {
        if (!!b.isPinned !== !!a.isPinned) return (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0);
        return new Date(b.lastMessageAt || 0) - new Date(a.lastMessageAt || 0);
      });
      try { localStorage.setItem(getThreadsListKey(), JSON.stringify(sorted)); } catch {}
      return sorted;
    });

    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      await fetch(`${API_URL}/api/oracle/threads/${threadId}`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(patch)
      });
    } catch (_) { /* offline — UI already updated, will re-sync later */ }
  }, []);

  // Delete a thread — confirms via modal, then DELETE + remove from local state
  const deleteThread = useCallback(async (threadId) => {
    const token = localStorage.getItem('token');
    setThreads(prev => {
      const next = prev.filter(t => t.threadId !== threadId);
      try { localStorage.setItem(getThreadsListKey(), JSON.stringify(next)); } catch {}
      return next;
    });
    // Drop cached messages
    const cacheKey = getThreadMessagesKey(threadId);
    if (cacheKey) {
      try { localStorage.removeItem(cacheKey); } catch {}
    }
    // If we deleted the active thread, switch to the next available (or none)
    if (threadId === activeThreadId) {
      const next = threads.find(t => t.threadId !== threadId);
      if (next) {
        switchToThread(next.threadId);
      } else {
        setActiveThreadId(null);
        setMessages([]);
        try { localStorage.removeItem(getActiveThreadKey()); } catch {}
      }
    }
    if (!token) return;
    try {
      await fetch(`${API_URL}/api/oracle/threads/${threadId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
    } catch (_) { /* offline */ }
  }, [activeThreadId, threads, switchToThread]);

  // Auto-title — server calls Haiku to summarize the first exchange.
  // Called from sendMessage after the first Oracle reply lands.
  const autoTitleThread = useCallback(async (threadId) => {
    const token = localStorage.getItem('token');
    if (!token || !threadId) return;
    try {
      const res = await fetch(`${API_URL}/api/oracle/threads/${threadId}/auto-title`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) return;
      const data = await res.json();
      if (data?.title) {
        setThreads(prev => {
          const next = prev.map(t => t.threadId === threadId ? { ...t, title: data.title } : t);
          try { localStorage.setItem(getThreadsListKey(), JSON.stringify(next)); } catch {}
          return next;
        });
      }
    } catch (_) { /* silent */ }
  }, []);
  // Keep the ref current so sendMessage can invoke it via the stable handle.
  autoTitleThreadRef.current = autoTitleThread;

  // Note: the legacy in-chat "Clear chat" button was removed when threads
  // shipped — thread deletion now lives in the sidebar's 3-dot menu, so the
  // chat area stays uncluttered and destruction has one canonical home.

  // Get Oracle loading icon
  const getLoadingIcon = () => '/The_Oracle.png';

  // Gold dash icon for pin toasts (matches app toast system)
  const goldDash = <span style={{ display: 'inline-block', width: 16, height: 3, borderRadius: 2, background: '#d4af37', flexShrink: 0 }} />;

  // Teach Oracle — ingest conversation exchange into knowledge base (admin only)
  const handleTeachOracle = async (oracleMsg, index) => {
    let userMsg = '';
    for (let i = index - 1; i >= 0; i--) {
      if (messages[i].role === 'user') {
        userMsg = messages[i].content;
        break;
      }
    }
    setTeachModal({ userMsg, oracleMsg, existingMatches: null, checking: true });
    setTeachForm({ title: '', note: '', category: 'general' });
    setTeachStatus('idle');

    try {
      const token = localStorage.getItem('token');
      const searchQuery = oracleMsg.replace(/[#*_`>\-]/g, '').slice(0, 150).trim();
      const res = await fetch(`${API_URL}/api/knowledge/search?q=${encodeURIComponent(searchQuery)}&limit=3`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        const matches = (data.results || []).filter(r => r.content && r.content.length > 30);
        setTeachModal(prev => prev ? { ...prev, existingMatches: matches, checking: false } : prev);
      } else {
        setTeachModal(prev => prev ? { ...prev, existingMatches: [], checking: false } : prev);
      }
    } catch {
      setTeachModal(prev => prev ? { ...prev, existingMatches: [], checking: false } : prev);
    }
  };

  const submitTeachOracle = async () => {
    if (!teachModal || !teachForm.title.trim()) return;
    setTeachStatus('saving');

    const content = [
      `[ORACLE INSIGHT — ${new Date().toLocaleDateString()}]`,
      '',
      teachModal.userMsg ? `Context (Ross asked): ${teachModal.userMsg}` : '',
      '',
      `Oracle's response/conclusion:`,
      teachModal.oracleMsg,
      '',
      teachForm.note ? `Admin note: ${teachForm.note}` : ''
    ].filter(Boolean).join('\n');

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/knowledge/ingest/text`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: teachForm.title.trim(),
          content,
          category: teachForm.category
        })
      });
      const data = await res.json();
      if (data.success) {
        setTeachStatus('done');
        setTimeout(() => setTeachModal(null), 1500);
        toast('Knowledge ingested', {
          icon: '🧠',
          style: { background: '#1a1a1a', color: '#fff', fontSize: '14px' }
        });
      } else {
        setTeachStatus('error');
      }
    } catch {
      setTeachStatus('error');
    }
  };

  // Pin/Unpin an Oracle message (toggle)
  const handlePinMessage = async (content, timestamp) => {
    const token = localStorage.getItem('token');
    if (!token) return;

    const existingPinId = pinnedMessages.get(timestamp);

    // ---- UNPIN (already pinned → remove it) ----
    if (existingPinId) {
      try {
        const res = await fetch(`${API_URL}/api/oracle/pins/${existingPinId}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          setPinnedMessages(prev => { const next = new Map(prev); next.delete(timestamp); return next; });
          toast('Unpinned', { icon: goldDash });
          // Notify Calendar to refresh indicators
          window.dispatchEvent(new CustomEvent('oracle-pins-changed'));
        }
      } catch (err) { console.error('Unpin failed:', err); }
      return;
    }

    // ---- PIN (not yet pinned → create it) ----
    // Premium gate — admins (unlimited) + premium + grandfathered can pin
    const canPin = usage.isPremium || usage.isGrandfathered || usage.messagesRemaining >= 999;
    if (!canPin) {
      openPlanModal && openPlanModal();
      return;
    }

    try {
      const res = await fetch(`${API_URL}/api/oracle/pins`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ message: content, messageTimestamp: timestamp })
      });

      if (res.status === 409) {
        // Already pinned server-side — sync local state
        setPinnedMessages(prev => new Map(prev).set(timestamp, 'existing'));
        return;
      }

      if (res.status === 403) {
        openPlanModal && openPlanModal();
        return;
      }

      if (!res.ok) throw new Error('Failed to pin');

      const data = await res.json();
      setPinnedMessages(prev => new Map(prev).set(timestamp, data.pin._id));
      toast('Pinned to journey', { icon: goldDash });
      // Notify Calendar to refresh indicators
      window.dispatchEvent(new CustomEvent('oracle-pins-changed'));
    } catch (err) {
      console.error('Pin failed:', err);
    }
  };

  // ===== Oracle Notes: selection capture + handlers =====

  // Listen for selections inside Oracle messages and surface the highlight
  // palette. Selection offsets are computed in plain text — the DOM's
  // textContent matches plainTextOf(message.content) by construction.
  useEffect(() => {
    if (!isOpen) return;
    let timer = null;

    const handler = () => {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed || sel.rangeCount === 0) {
        setHighlightPalette(prev => prev.visible ? { ...prev, visible: false } : prev);
        return;
      }
      const range = sel.getRangeAt(0);
      const text = range.toString();
      if (!text || !text.trim()) {
        setHighlightPalette(prev => prev.visible ? { ...prev, visible: false } : prev);
        return;
      }

      const nodeOf = (n) => n.nodeType === Node.TEXT_NODE ? n.parentElement : n;
      const startEl = nodeOf(range.startContainer);
      const endEl = nodeOf(range.endContainer);
      if (!startEl || !endEl) return;

      const startMsg = startEl.closest('.ai-chat-message.assistant');
      const endMsg = endEl.closest('.ai-chat-message.assistant');
      if (!startMsg || startMsg !== endMsg) {
        setHighlightPalette(prev => prev.visible ? { ...prev, visible: false } : prev);
        return;
      }

      const messageTs = startMsg.getAttribute('data-message-ts');
      if (!messageTs) return; // streaming message — no timestamp yet

      const contentEl = startMsg.querySelector('.ai-chat-message-content');
      if (!contentEl
        || !contentEl.contains(range.startContainer)
        || !contentEl.contains(range.endContainer)) {
        setHighlightPalette(prev => prev.visible ? { ...prev, visible: false } : prev);
        return;
      }

      const preRange = document.createRange();
      preRange.setStart(contentEl, 0);
      preRange.setEnd(range.startContainer, range.startOffset);
      const startOffset = preRange.toString().length;
      const endOffset = startOffset + text.length;

      const message = messages.find(m => m.timestamp === messageTs);
      if (!message) return;

      const fullText = contentEl.textContent || '';
      const CTX = 30;
      const contextBefore = fullText.slice(Math.max(0, startOffset - CTX), startOffset);
      const contextAfter = fullText.slice(endOffset, Math.min(fullText.length, endOffset + CTX));

      const rect = range.getBoundingClientRect();
      const panel = panelRef.current;
      if (!panel || rect.width === 0) return;
      const panelRect = panel.getBoundingClientRect();

      // Approximate palette dimensions for clamping. The palette is sized
      // by its content, but these are tight enough that any small drift
      // costs us a few pixels of edge margin — not a hard clip.
      const PALETTE_HALF_W = 96;
      const PALETTE_H = 40;
      const EDGE = 8;
      const TAIL = 10; // distance between palette and selection rect

      // X: center on selection, then clamp inside the panel so the palette
      // never extends off-screen on the left or right edge.
      const rawX = rect.left + rect.width / 2 - panelRect.left;
      const x = Math.max(
        PALETTE_HALF_W + EDGE,
        Math.min(panelRect.width - PALETTE_HALF_W - EDGE, rawX)
      );

      // Y: prefer above the selection (so the palette doesn't cover the
      // text you're acting on). If the selection is near the top and there
      // isn't room above, flip below — iOS's native menu usually goes
      // *above* the selection in that case, so going below also reduces
      // collisions with the Copy/Look Up/Translate popover.
      const topInPanel = rect.top - panelRect.top;
      const bottomInPanel = rect.bottom - panelRect.top;
      const fitsAbove = topInPanel >= PALETTE_H + TAIL + EDGE;
      const placement = fitsAbove ? 'above' : 'below';
      const y = fitsAbove ? topInPanel - TAIL : bottomInPanel + TAIL;

      setHighlightPalette({
        visible: true,
        x,
        y,
        placement,
        message,
        selection: {
          text,
          startOffset,
          endOffset,
          contextBefore,
          contextAfter
        }
      });
    };

    const debounced = () => {
      clearTimeout(timer);
      timer = setTimeout(handler, 180);
    };

    document.addEventListener('selectionchange', debounced);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('selectionchange', debounced);
    };
  }, [isOpen, messages]);

  const closeHighlightPalette = useCallback(() => {
    setHighlightPalette(prev => ({ ...prev, visible: false }));
    try { window.getSelection().removeAllRanges(); } catch {}
  }, []);

  // Create a new highlight from the current palette selection.
  // Premium gating is enforced server-side; the hook routes 403s to openPlanModal.
  const createHighlightFromPalette = useCallback(async (color) => {
    const { message, selection } = highlightPalette;
    if (!message || !selection) return null;
    const thread = threads.find(t => t.threadId === activeThreadId);
    const note = await createNote({
      threadId: activeThreadId,
      threadTitle: thread?.title || '',
      messageTimestamp: message.timestamp,
      startOffset: selection.startOffset,
      endOffset: selection.endOffset,
      highlightedText: selection.text,
      contextBefore: selection.contextBefore,
      contextAfter: selection.contextAfter,
      color: color || 'amber',
      note: ''
    });
    closeHighlightPalette();
    return note;
  }, [highlightPalette, threads, activeThreadId, createNote, closeHighlightPalette]);

  const handlePickColor = useCallback(async (color) => {
    await createHighlightFromPalette(color);
  }, [createHighlightFromPalette]);

  const handleAddNoteFromPalette = useCallback(async () => {
    const note = await createHighlightFromPalette('amber');
    if (note) setMarginaliaNote(note);
  }, [createHighlightFromPalette]);

  const handleHighlightClick = useCallback((noteId) => {
    let found = null;
    for (const arr of notesByMessage.values()) {
      const n = arr.find(x => x._id === noteId);
      if (n) { found = n; break; }
    }
    if (found) setMarginaliaNote(found);
  }, [notesByMessage]);

  const handleSaveMarginalia = useCallback(async (patch) => {
    if (!marginaliaNote) return;
    const updated = await updateNote(marginaliaNote._id, patch);
    if (updated) setMarginaliaNote(updated);
  }, [marginaliaNote, updateNote]);

  const handleDeleteCurrentMarginalia = useCallback(async () => {
    if (!marginaliaNote) return;
    await deleteNote(marginaliaNote._id, marginaliaNote.messageTimestamp, marginaliaNote.threadId);
    setMarginaliaNote(null);
  }, [marginaliaNote, deleteNote]);

  // Don't render if not logged in
  if (!isLoggedIn) return null;

  // Oracle eye — only the latest assistant response gets the visible avatar
  const lastAssistantIndex = (() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'assistant') return i;
    }
    return -1;
  })();
  const oracleIsElsewhere = isLoading || !!streamingText;

  // ============================================================
  // Threads sidebar render — kept inline to stay in a single file
  // ============================================================
  const commitRename = (threadId) => {
    const title = renameValue.trim().slice(0, 80);
    if (title) patchThread(threadId, { title });
    setRenamingThreadId(null);
    setRenameValue('');
  };

  // Search is now server-side (see /api/oracle/threads/search). When the user
  // is searching, searchResults overrides the normal thread list. Otherwise
  // sections derive purely from pin/archive state.
  const isSearching = searchResults !== null;
  const pinnedActive = threads.filter(t => t.isPinned && !t.isArchived);
  const normalActive = threads.filter(t => !t.isPinned && !t.isArchived);
  const archivedAll = threads.filter(t => t.isArchived);

  // Highlight every case-insensitive occurrence of `query` in `text` with <strong>.
  const renderHighlighted = (text, query) => {
    if (!text || !query) return text;
    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const parts = text.split(new RegExp(`(${escaped})`, 'gi'));
    return parts.map((part, i) =>
      part.toLowerCase() === query.toLowerCase()
        ? <strong key={i} className="ai-chat-search-match">{part}</strong>
        : <React.Fragment key={i}>{part}</React.Fragment>
    );
  };

  const renderSearchResultRow = (r, idx) => (
    <div
      key={`${r.threadId}-${idx}`}
      className="ai-chat-thread-row ai-chat-search-result"
      onClick={() => {
        setThreadMenuOpenFor(null);
        switchToThread(r.threadId, r.messageTimestamp);
        // Clear search input so the next sidebar open shows normal list.
        setThreadSearch('');
      }}
    >
      <div className="ai-chat-thread-row-title-line">
        <span className="ai-chat-thread-row-title">{r.threadTitle}</span>
      </div>
      <span className="ai-chat-thread-row-preview ai-chat-search-snippet">
        {renderHighlighted(r.snippet, threadSearch.trim())}
      </span>
      <span className="ai-chat-thread-row-time">{formatThreadTime(r.messageTimestamp)}</span>
    </div>
  );

  const renderThreadRow = (t) => {
    const isActive = t.threadId === activeThreadId;
    const isMenuOpen = threadMenuOpenFor === t.threadId;
    const isRenaming = renamingThreadId === t.threadId;
    return (
      <div
        key={t.threadId}
        className={`ai-chat-thread-row${isActive ? ' active' : ''}${t.isPinned ? ' pinned' : ''}${isMenuOpen ? ' menu-open' : ''}`}
        onClick={() => {
          if (isRenaming) return;
          setThreadMenuOpenFor(null);
          switchToThread(t.threadId);
        }}
      >
        <div className="ai-chat-thread-row-title-line">
          {isRenaming ? (
            <input
              className="ai-chat-thread-rename-input"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') { e.preventDefault(); commitRename(t.threadId); }
                if (e.key === 'Escape') { setRenamingThreadId(null); setRenameValue(''); }
              }}
              onBlur={() => commitRename(t.threadId)}
              onClick={(e) => e.stopPropagation()}
              autoFocus
              maxLength={80}
            />
          ) : (
            <span className={`ai-chat-thread-row-title${!t.title ? ' untitled' : ''}`}>
              {t.title || 'New conversation'}
            </span>
          )}
        </div>
        {!isRenaming && (
          <span className="ai-chat-thread-row-preview">
            {t.preview || ' '}
          </span>
        )}
        {!isRenaming && (
          <span className="ai-chat-thread-row-time">{formatThreadTime(t.lastMessageAt)}</span>
        )}
        {!isRenaming && (
          <button
            className="ai-chat-thread-row-menu"
            onClick={(e) => {
              e.stopPropagation();
              setThreadMenuOpenFor(prev => prev === t.threadId ? null : t.threadId);
            }}
            aria-label="Thread options"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <circle cx="5" cy="12" r="1.6" />
              <circle cx="12" cy="12" r="1.6" />
              <circle cx="19" cy="12" r="1.6" />
            </svg>
          </button>
        )}
        {isMenuOpen && (
          <div className="ai-chat-thread-menu" onClick={(e) => e.stopPropagation()}>
            <button
              className="ai-chat-thread-menu-item"
              onClick={() => {
                setRenamingThreadId(t.threadId);
                setRenameValue(t.title || '');
                setThreadMenuOpenFor(null);
              }}
            >Rename</button>
            <button
              className="ai-chat-thread-menu-item"
              onClick={() => {
                patchThread(t.threadId, { isPinned: !t.isPinned });
                setThreadMenuOpenFor(null);
              }}
            >{t.isPinned ? 'Unpin' : 'Pin'}</button>
            <button
              className="ai-chat-thread-menu-item"
              onClick={() => {
                patchThread(t.threadId, { isArchived: !t.isArchived });
                setThreadMenuOpenFor(null);
              }}
            >{t.isArchived ? 'Unarchive' : 'Archive'}</button>
            <button
              className="ai-chat-thread-menu-item danger"
              onClick={() => {
                setConfirmDeleteThreadId(t.threadId);
                setThreadMenuOpenFor(null);
              }}
            >Delete</button>
          </div>
        )}
      </div>
    );
  };

  const renderThreadsSidebar = () => (
    <aside
      className={`ai-chat-sidebar${sidebarOpen ? ' open' : ''}`}
      onClick={() => { if (threadMenuOpenFor) setThreadMenuOpenFor(null); }}
    >
      {/* Swipe-pill at the very top — matches the main Oracle sheet so the
          sidebar doesn't feel like a separate surface that can't be dismissed.
          Mobile only via .sheet-header media query; no-op on desktop. */}
      <div className="sheet-header" />

      <div className="ai-chat-sidebar-header">
        <button
          className="ai-chat-sidebar-collapse"
          onClick={() => setSidebarOpen(false)}
          aria-label="Hide conversations"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <button
          className="ai-chat-new-thread-btn"
          onClick={createNewThread}
        >
          New conversation
        </button>
      </div>

      <div className="ai-chat-sidebar-search">
        <div className="ai-chat-sidebar-search-field">
          <svg className="ai-chat-sidebar-search-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="7" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            className="ai-chat-sidebar-search-input"
            type="text"
            placeholder="Search conversations"
            value={threadSearch}
            onChange={(e) => setThreadSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="ai-chat-sidebar-body">
        {isSearching ? (
          // ---------- SEARCH RESULTS MODE ----------
          searchLoading ? (
            <div className="ai-chat-sidebar-empty">Searching…</div>
          ) : searchResults && searchResults.length === 0 ? (
            <div className="ai-chat-sidebar-empty">
              No matches for "{threadSearch.trim()}"
            </div>
          ) : (
            <>
              <div className="ai-chat-thread-section-label">
                {searchResults.length} match{searchResults.length === 1 ? '' : 'es'}
              </div>
              {searchResults.map(renderSearchResultRow)}
            </>
          )
        ) : (
          // ---------- NORMAL THREAD LIST ----------
          <>
            {threads.length === 0 && (
              <div className="ai-chat-sidebar-empty">
                Begin a new conversation to see it here.
              </div>
            )}

            {pinnedActive.length > 0 && (
              <>
                <div className="ai-chat-thread-section-label">Pinned</div>
                {pinnedActive.map(renderThreadRow)}
              </>
            )}

            {normalActive.length > 0 && (
              <>
                {pinnedActive.length > 0 && <div className="ai-chat-thread-section-label">Recent</div>}
                {normalActive.map(renderThreadRow)}
              </>
            )}

            {archivedAll.length > 0 && (
              <>
                <button
                  className="ai-chat-archived-toggle"
                  onClick={() => setShowArchived(s => !s)}
                >
                  <span>Archived ({archivedAll.length})</span>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: showArchived ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 150ms ease' }}>
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>
                {showArchived && archivedAll.map(renderThreadRow)}
              </>
            )}
          </>
        )}
      </div>

    </aside>
  );

  return (
    <>
      {/* Chat Panel */}
      <div className={`ai-chat-overlay ${isOpen ? 'open' : ''}`} onClick={onClose}>
        <div
          ref={panelRef}
          className={`ai-chat-panel ${isOpen ? 'open' : ''}${sidebarOpen ? ' with-sidebar' : ''}`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Threads Sidebar */}
          {renderThreadsSidebar()}

          <div className="ai-chat-main">
          {/* Header */}
          <header
            className="ai-chat-header has-sidebar-toggle"
          >
            <button
              className="ai-chat-sidebar-toggle"
              onClick={() => setSidebarOpen(s => !s)}
              aria-label={sidebarOpen ? 'Hide conversations' : 'Show conversations'}
            >
              {/* Sidebar-panel glyph — rectangle + left rail. Semantically tighter
                  than a hamburger ("generic menu") for "reveal conversation list". */}
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="16" rx="2.5" />
                <line x1="9" y1="4" x2="9" y2="20" />
              </svg>
            </button>
            <div className="ai-chat-header-content">
              <img src="/oracle-wordmark.png" alt="Oracle" className="ai-chat-header-wordmark" />
              <span className="ai-chat-subtitle">
                {usage.messagesRemaining >= 999 ? 'Unlimited · Admin' : `${usage.messagesRemaining} remaining · ${usage.isBetaPeriod ? 'Beta' : usage.isGrandfathered ? 'Lifetime' : usage.isPremium ? 'Premium' : `Free · ${usage.messagesLimit}/week`}`}
              </span>
            </div>
            <button
              className="ai-chat-library-toggle"
              onClick={() => setLibraryOpen(true)}
              aria-label="Open notes"
              title="Notes"
            >
              {/* Pencil glyph + 'Notes' label — same vocabulary as the
                  in-message highlight palette's Note button so the two
                  affordances read as the same thing. */}
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M12 20h9" />
                <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
              </svg>
              <span>Notes</span>
            </button>
            <button
              className="ai-chat-close"
              onClick={onClose}
              aria-label="Close chat"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </header>

          {/* Sticky thread title — slides in below the header when the user
              scrolls UP through history (so they can see which thread they're
              in mid-scroll), hides when scrolling DOWN toward the latest
              message. Suppressed when at the top (main wordmark is right there)
              or when the active thread has no title. */}
          {(() => {
            const activeThread = threads.find(t => t.threadId === activeThreadId);
            const title = activeThread?.title;
            const isVisible = !!title && bodyScrollTop > 120 && scrollDirection === 'up';
            return (
              <div
                className={`ai-chat-sticky-title${isVisible ? ' visible' : ''}`}
                aria-hidden={!isVisible}
              >
                <span className="ai-chat-sticky-title-text">{title}</span>
              </div>
            );
          })()}

          {/* Messages */}
          <div className="ai-chat-body" ref={chatBodyRef}>
            {messages.length === 0 && !isLoading && (
              <div className="ai-chat-empty">
                <img src="/The_Oracle.png" alt="" className="ai-chat-empty-eye" />
                <p className="ai-chat-empty-title">Oracle awaits.</p>
                <p className="ai-chat-empty-subtitle">
                  Ask about your journey, phases, flatlines, transmutation, or anything on your mind.
                </p>
              </div>
            )}

            {messages.map((msg, index) => (
              <div
                key={index}
                className={`ai-chat-message ${msg.role}${msg.isTransmission ? ' transmission' : ''}`}
                data-message-ts={msg.timestamp || ''}
              >
                {msg.role === 'user' && (
                  <div className="ai-chat-message-meta">
                    <span className="ai-chat-message-label">You</span>
                    <span className="ai-chat-message-time">{formatTime(msg.timestamp)}</span>
                  </div>
                )}
                {msg.role === 'assistant' ? (
                  <>
                    <div className="ai-chat-message-row">
                      <img src="/The_Oracle.png" alt="" className={`ai-chat-avatar${index === lastAssistantIndex && !oracleIsElsewhere ? '' : ' ai-chat-avatar-past'}`} />
                      <div className="ai-chat-message-content">
                        {msg.isTransmission && <span className="ai-chat-transmission-label" />}
                        {renderOracleContent(
                          msg.content,
                          notesByMessage.get(msg.timestamp),
                          { onHighlightClick: handleHighlightClick }
                        )}
                      </div>
                    </div>
                    <div className="ai-chat-actions">
                      <button
                        className="ai-chat-share-btn"
                        onClick={() => handleShareMessage(msg.content, msg.isTransmission)}
                        aria-label="Share message"
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                          <polyline points="16 6 12 2 8 6" />
                          <line x1="12" y1="2" x2="12" y2="15" />
                        </svg>
                        Share
                      </button>
                      {isAdmin && (
                        <button
                          className="ai-chat-teach-btn"
                          onClick={() => handleTeachOracle(msg.content, index)}
                          aria-label="Teach Oracle"
                        >
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
                            <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
                          </svg>
                          Teach
                        </button>
                      )}
                      <button
                        className={`ai-chat-pin-btn${pinnedMessages.has(msg.timestamp) ? ' pinned' : ''}`}
                        onClick={() => handlePinMessage(msg.content, msg.timestamp)}
                        aria-label="Pin to journey"
                      >
                        <img src="/oracle-pin.png" alt="" className="ai-chat-pin-icon" />
                        {pinnedMessages.has(msg.timestamp) ? 'Pinned' : 'Pin'}
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="ai-chat-message-content">
                    {msg.content}
                  </div>
                )}
              </div>
            ))}

            {/* Streaming response */}
            {streamingText && (
              <div ref={streamingMessageRef} className="ai-chat-message assistant">
                <div className="ai-chat-message-row">
                  <img src="/The_Oracle.png" alt="" className="ai-chat-avatar" />
                  <div className="ai-chat-message-content streaming">
                    {renderStreamingWords(streamingText)}
                  </div>
                </div>
              </div>
            )}

            {/* Loading indicator */}
            {isLoading && !streamingText && (
              <div className="ai-chat-message assistant">
                <div className="ai-chat-loading">
                  <img src="/The_Oracle.png" alt="" className="ai-chat-loading-icon" />
                </div>
              </div>
            )}

            {/* Error message — styled as Oracle */}
            {error && (
              <div className="ai-chat-message assistant">
                <div className="ai-chat-message-content ai-chat-oracle-error">
                  <img src="/The_Oracle.png" alt="" className="oracle-error-eye" />
                  <span>{error}</span>
                </div>
              </div>
            )}

            {messages.length > 0 && !isLoading && !streamingText && (
              <div className="ai-chat-watermark">
                <img src="/oracle-wordmark.png" alt="" className="ai-chat-watermark-img" />
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Teach Oracle Modal (admin only) */}
          {teachModal && (
            <div className="ai-clear-overlay" onClick={() => setTeachModal(null)}>
              <div className="ai-teach-modal" onClick={e => e.stopPropagation()}>

                {/* Branded header — Oracle eye + gold dashes */}
                <div className="ai-teach-header">
                  <img src="/The_Oracle.png" alt="" className={`ai-teach-eye${teachStatus === 'saving' ? ' ai-teach-eye-active' : ''}${teachStatus === 'done' ? ' ai-teach-eye-done' : ''}`} />
                  <div className="ai-teach-title-row">
                    <span className="ai-teach-dash" />
                    <h2 className="ai-teach-title">{teachStatus === 'done' ? 'Knowledge Absorbed' : 'Teach Oracle'}</h2>
                    <span className="ai-teach-dash" />
                  </div>
                </div>

                {teachStatus !== 'done' && (
                  <>
                    <div className="ai-teach-preview">
                      {teachModal.userMsg && (
                        <div className="ai-teach-preview-msg">
                          <span className="ai-teach-label">You asked</span>
                          <span>{teachModal.userMsg.length > 200 ? teachModal.userMsg.slice(0, 200) + '...' : teachModal.userMsg}</span>
                        </div>
                      )}
                      <div className="ai-teach-preview-msg">
                        <span className="ai-teach-label">Oracle said</span>
                        <span>{teachModal.oracleMsg.length > 300 ? teachModal.oracleMsg.slice(0, 300) + '...' : teachModal.oracleMsg}</span>
                      </div>
                    </div>

                    {/* Dedup check — scanning state */}
                    {teachModal.checking && (
                      <div className="ai-teach-dedup-checking">
                        <img src="/The_Oracle.png" alt="" className="ai-teach-dedup-eye" />
                        <span>Scanning knowledge base...</span>
                      </div>
                    )}
                    {/* Dedup — matches found */}
                    {!teachModal.checking && teachModal.existingMatches?.length > 0 && (
                      <div className="ai-teach-dedup-warning">
                        <span className="ai-teach-label" style={{ color: '#e8a838' }}>Oracle may already know this</span>
                        {teachModal.existingMatches.map((match, i) => (
                          <div key={i} className="ai-teach-dedup-match">
                            <span className="ai-teach-dedup-source">{match.source?.name || 'Unknown source'}</span>
                            <span>{match.content.slice(0, 150)}...</span>
                          </div>
                        ))}
                        <span className="ai-teach-dedup-hint">You can still teach if this adds new insight.</span>
                      </div>
                    )}
                    {/* Dedup — clear */}
                    {!teachModal.checking && teachModal.existingMatches?.length === 0 && (
                      <div className="ai-teach-dedup-clear">
                        <span className="ai-teach-dash" />
                        <span>New to Oracle</span>
                        <span className="ai-teach-dash" />
                      </div>
                    )}

                    <input
                      type="text"
                      className="ai-teach-input"
                      placeholder="Title this insight..."
                      value={teachForm.title}
                      onChange={e => setTeachForm(f => ({ ...f, title: e.target.value }))}
                      autoFocus
                    />
                    <textarea
                      className="ai-teach-input ai-teach-textarea"
                      placeholder="Optional note or context..."
                      value={teachForm.note}
                      onChange={e => setTeachForm(f => ({ ...f, note: e.target.value }))}
                      rows={2}
                    />
                    <select
                      className="ai-teach-input ai-teach-select"
                      value={teachForm.category}
                      onChange={e => setTeachForm(f => ({ ...f, category: e.target.value }))}
                    >
                      <option value="general">General</option>
                      <option value="esoteric">Esoteric</option>
                      <option value="science">Science</option>
                      <option value="spiritual">Spiritual</option>
                      <option value="practical">Practical</option>
                      <option value="transmutation">Transmutation</option>
                      <option value="kundalini">Kundalini</option>
                      <option value="community">Community</option>
                    </select>
                  </>
                )}

                <div className="ai-teach-actions">
                  {teachStatus === 'done' ? (
                    <button className="ai-teach-cancel" onClick={() => setTeachModal(null)}>Close</button>
                  ) : (
                    <>
                      <button
                        className="ai-teach-submit"
                        onClick={submitTeachOracle}
                        disabled={!teachForm.title.trim() || teachStatus === 'saving'}
                      >
                        {teachStatus === 'saving' ? 'Absorbing...' : 'Teach Oracle'}
                      </button>
                      <button className="ai-teach-cancel" onClick={() => setTeachModal(null)}>Cancel</button>
                    </>
                  )}
                  {teachStatus === 'error' && (
                    <span className="ai-teach-error">Failed — try again</span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Input Area */}
          <div className="ai-chat-input-area">
            {usage.messagesRemaining > 0 ? (
              <>
                <textarea
                  ref={inputRef}
                  className="ai-chat-input"
                  placeholder="What's on your mind?"
                  value={inputValue}
                  onChange={(e) => {
                    setInputValue(e.target.value);
                    // Auto-resize textarea
                    e.target.style.height = 'auto';
                    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
                  }}
                  onKeyDown={handleKeyDown}
                  onFocus={() => {
                    // Scroll input into view after iOS keyboard settles
                    setTimeout(() => {
                      inputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                    }, 350);
                  }}
                  onBlur={() => {}}
                  disabled={isLoading}
                  rows={1}
                />
                <button 
                  className={`ai-chat-send ${inputValue.trim() && !isLoading ? 'active' : ''}`}
                  onClick={sendMessage}
                  disabled={!inputValue.trim() || isLoading}
                  aria-label="Send message"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="12" y1="19" x2="12" y2="5" />
                    <polyline points="5 12 12 5 19 12" />
                  </svg>
                </button>
              </>
            ) : (
              <div className="ai-chat-limit-reached">
                <span className="ai-chat-limit-text">
                  {usage.isGrandfathered
                    ? 'Daily limit reached · Resets at midnight'
                    : usage.isPremium 
                    ? 'Daily limit reached · Resets at midnight'
                    : 'Weekly limit reached · Resets Monday'
                  }
                </span>
                {!usage.isPremium && !usage.isGrandfathered && openPlanModal && (
                  <button className="ai-chat-upgrade-btn" onClick={() => { onClose(); openPlanModal(); }}>
                    Upgrade to Premium
                  </button>
                )}
              </div>
            )}
          </div>

          </div> {/* .ai-chat-main */}

          {/* Oracle Notes — selection palette, marginalia sheet, library */}
          <HighlightPalette
            visible={highlightPalette.visible}
            x={highlightPalette.x}
            y={highlightPalette.y}
            placement={highlightPalette.placement}
            onPickColor={handlePickColor}
            onAddNote={handleAddNoteFromPalette}
            onClose={closeHighlightPalette}
          />
          <MarginaliaSheet
            open={!!marginaliaNote}
            note={marginaliaNote}
            onSave={handleSaveMarginalia}
            onDelete={handleDeleteCurrentMarginalia}
            onClose={() => setMarginaliaNote(null)}
          />
          <NotesLibrary
            open={libraryOpen}
            onClose={() => setLibraryOpen(false)}
            fetchLibrary={fetchLibrary}
            onUpdateNote={updateNote}
            onDeleteNote={deleteNote}
            onJumpToNote={(note) => {
              setLibraryOpen(false);
              switchToThread(note.threadId, note.messageTimestamp);
              // After scroll settles, briefly pulse the highlight
              setTimeout(() => {
                const el = document.querySelector(`[data-note-id="${note._id}"]`);
                if (el) {
                  el.classList.add('oracle-highlight--pulse');
                  setTimeout(() => el.classList.remove('oracle-highlight--pulse'), 1800);
                }
              }, 600);
            }}
          />

          {/* Delete-thread confirm modal — at panel root so it overlays the
              sidebar drawer on mobile, not behind it. */}
          {confirmDeleteThreadId && (
            <div className="ai-clear-overlay" onClick={() => setConfirmDeleteThreadId(null)}>
              <div className="ai-clear-modal" onClick={e => e.stopPropagation()}>
                <h2>Delete this conversation?</h2>
                <p>The thread and all its messages will be permanently removed.</p>
                <div className="ai-clear-actions">
                  <button
                    className="ai-clear-btn-danger"
                    onClick={() => {
                      deleteThread(confirmDeleteThreadId);
                      setConfirmDeleteThreadId(null);
                    }}
                  >Delete</button>
                  <button
                    className="ai-clear-btn-cancel"
                    onClick={() => setConfirmDeleteThreadId(null)}
                  >Cancel</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default AIChat;
