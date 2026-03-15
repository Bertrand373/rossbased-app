// src/components/AIChat/AIChat.js
// Premium AI Chat with streaming responses
// Now controlled by header button instead of floating FAB
import React, { useState, useEffect, useRef, useCallback } from 'react';
import './AIChat.css';
import useSheetSwipe from '../../hooks/useSheetSwipe';
import toast from 'react-hot-toast';

// Mixpanel tracking
import { trackAIChatOpened, trackAIMessageSent, trackAIChatCleared, trackAILimitReached } from '../../utils/mixpanel';

const API_URL = process.env.REACT_APP_API_URL || 'https://rossbased-app.onrender.com';

// Storage keys — scoped by username so accounts don't share history
const getChatHistoryKey = () => {
  try {
    const token = localStorage.getItem('token');
    if (token) {
      const username = JSON.parse(atob(token.split('.')[1])).username;
      if (username) return `titantrack_ai_chat_history_${username}`;
    }
  } catch {}
  return 'titantrack_ai_chat_history'; // fallback for edge cases
};
const MAX_STORED_MESSAGES = 50;
const MAX_CONTEXT_MESSAGES = 10; // Send last 10 to Claude

// Lightweight markdown renderer for Oracle responses
// Handles **bold**, *italic*, preserves line breaks via pre-wrap
const renderMarkdown = (text) => {
  if (!text) return text;
  
  const parts = [];
  // Bold first (**), then italic (*) — alternation order matters
  const regex = /\*\*(.+?)\*\*|\*(.+?)\*/gs;
  let lastIndex = 0;
  let match;
  let key = 0;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    if (match[1]) {
      parts.push(<strong key={`b${key++}`}>{match[1]}</strong>);
    } else if (match[2]) {
      parts.push(<em key={`i${key++}`}>{match[2]}</em>);
    }
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length > 0 ? parts : text;
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
    isGrandfathered: false
  });
  const [error, setError] = useState(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const chatBodyRef = useRef(null);
  const panelRef = useRef(null);
  const hasTrackedOpen = useRef(false);
  const streamingMessageRef = useRef(null);
  const hasScrolledToStreamStart = useRef(false);
  const chatSyncTimer = useRef(null); // Debounced server sync

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

  // Load chat history — server is source of truth, localStorage is fallback
  useEffect(() => {
    if (isLoggedIn) {
      // Load localStorage immediately (fast, offline-safe)
      const stored = localStorage.getItem(getChatHistoryKey());
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          setMessages(parsed.slice(-MAX_STORED_MESSAGES));
        } catch (e) {
          console.error('Failed to parse chat history:', e);
        }
      }

      // Then fetch from server (source of truth) and overwrite if available
      const token = localStorage.getItem('token');
      if (token) {
        fetch(`${API_URL}/api/oracle/chat-history`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
          .then(res => res.ok ? res.json() : null)
          .then(data => {
            if (data?.messages && data.messages.length > 0) {
              setMessages(data.messages.slice(-MAX_STORED_MESSAGES));
              // Update localStorage cache with server truth
              const toCache = data.messages.filter(m => !m.isTransmission).slice(-MAX_STORED_MESSAGES);
              localStorage.setItem(getChatHistoryKey(), JSON.stringify(toCache));
            }
          })
          .catch(() => { /* offline — localStorage is already loaded */ });
      }

      fetchUsage();
      fetchUnreadTransmissions();
    }
  }, [isLoggedIn]);

  // Fetch unread transmissions when chat opens
  useEffect(() => {
    if (isOpen && isLoggedIn) {
      fetchUnreadTransmissions();
    }
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

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

  // Save chat history to localStorage + debounced server sync
  useEffect(() => {
    if (messages.length > 0) {
      const toStore = messages.filter(m => !m.isTransmission).slice(-MAX_STORED_MESSAGES);
      localStorage.setItem(getChatHistoryKey(), JSON.stringify(toStore));

      // Debounced server sync (2s after last message change)
      if (chatSyncTimer.current) clearTimeout(chatSyncTimer.current);
      chatSyncTimer.current = setTimeout(() => {
        const token = localStorage.getItem('token');
        if (!token) return;
        fetch(`${API_URL}/api/oracle/chat-history`, {
          method: 'PUT',
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: toStore })
        }).catch(() => { /* offline — localStorage has it */ });
      }, 2000);
    }
    return () => { if (chatSyncTimer.current) clearTimeout(chatSyncTimer.current); };
  }, [messages]);

  // Scroll to bottom when chat opens (land at latest message instantly)
  useEffect(() => {
    if (isOpen && messages.length > 0) {
      // Instant — don't make users watch old messages scroll by
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'instant' });
      }, 50);
    }
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

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

  // iOS PWA keyboard fix — continuously adjust panel via visualViewport
  useEffect(() => {
    if (!isOpen || !window.visualViewport) return;
    const vv = window.visualViewport;
    const panel = panelRef.current;
    if (!panel) return;

    const adjust = () => {
      const offset = window.innerHeight - vv.height - vv.offsetTop;
      if (offset > 50) {
        // Keyboard is open
        panel.style.height = `${vv.height}px`;
        panel.style.transform = 'translateY(0)';
      } else {
        // Keyboard closed — reset
        panel.style.height = '';
        panel.style.transform = '';
      }
    };

    vv.addEventListener('resize', adjust);
    vv.addEventListener('scroll', adjust);
    return () => {
      vv.removeEventListener('resize', adjust);
      vv.removeEventListener('scroll', adjust);
      if (panel) {
        panel.style.height = '';
        panel.style.transform = '';
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
      }
    } catch (err) {
      console.error('Failed to fetch AI usage:', err);
    }
  };

  // Send message with streaming
  const sendMessage = useCallback(async () => {
    if (!inputValue.trim() || isLoading || usage.messagesRemaining <= 0) return;

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

      const response = await fetch(`${API_URL}/api/ai/chat/stream`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: userMessage.content,
          conversationHistory: recentMessages.slice(0, -1), // Exclude current message
          timezone: detectedTimezone
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
      }

    } catch (err) {
      console.error('AI Chat error:', err);
      setError(err.message || 'Failed to get response. Please try again.');
    } finally {
      setIsLoading(false);
      setStreamingText('');
    }
  }, [inputValue, isLoading, messages, usage.messagesRemaining]);

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

  // Clear chat history (local + server)
  const handleClearChat = () => {
    setMessages([]);
    localStorage.removeItem(getChatHistoryKey());
    // Clear server-side too
    const token = localStorage.getItem('token');
    if (token) {
      fetch(`${API_URL}/api/oracle/chat-history`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      }).catch(() => { /* silent */ });
    }
    setShowClearConfirm(false);
    trackAIChatCleared();
  };

  // Get Oracle loading icon
  const getLoadingIcon = () => '/The_Oracle.png';

  // Don't render if not logged in
  if (!isLoggedIn) return null;

  return (
    <>
      {/* Chat Panel */}
      <div className={`ai-chat-overlay ${isOpen ? 'open' : ''}`} onClick={onClose}>
        <div 
          ref={panelRef}
          className={`ai-chat-panel ${isOpen ? 'open' : ''}`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <header 
            className="ai-chat-header"
          >
            <div className="ai-chat-header-content">
              <img src="/oracle-wordmark.png" alt="Oracle" className="ai-chat-header-wordmark" />
              <span className="ai-chat-subtitle">
                {usage.messagesRemaining >= 999 ? 'Unlimited · Admin' : `${usage.messagesRemaining} remaining · ${usage.isBetaPeriod ? 'Beta' : usage.isGrandfathered ? 'Lifetime' : usage.isPremium ? 'Premium' : `Free · ${usage.messagesLimit}/week`}`}
              </span>
            </div>
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
              <div key={index} className={`ai-chat-message ${msg.role}${msg.isTransmission ? ' transmission' : ''}`}>
                {msg.role === 'user' && (
                  <div className="ai-chat-message-meta">
                    <span className="ai-chat-message-label">You</span>
                    <span className="ai-chat-message-time">{formatTime(msg.timestamp)}</span>
                  </div>
                )}
                {msg.role === 'assistant' ? (
                  <>
                    <div className="ai-chat-message-row">
                      <img src="/The_Oracle.png" alt="" className="ai-chat-avatar" />
                      <div className="ai-chat-message-content">
                        {msg.isTransmission && <span className="ai-chat-transmission-label" />}
                        {renderMarkdown(msg.content)}
                      </div>
                    </div>
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
                    {renderMarkdown(streamingText)}
                    <span className="ai-chat-cursor" />
                  </div>
                </div>
              </div>
            )}

            {/* Loading indicator */}
            {isLoading && !streamingText && (
              <div className="ai-chat-message assistant">
                <div className="ai-chat-message-row">
                  <div className="ai-chat-loading">
                    <img 
                      src={getLoadingIcon()} 
                      alt="" 
                      className="ai-chat-loading-icon"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Error message */}
            {error && (
              <div className="ai-chat-error">
                {error}
              </div>
            )}

            {/* Clear chat link - only shows when messages exist */}
            {messages.length > 0 && !isLoading && (
              <button 
                className="ai-chat-clear-btn"
                onClick={() => setShowClearConfirm(true)}
              >
                Clear chat
              </button>
            )}

            {messages.length > 0 && !isLoading && !streamingText && (
              <div className="ai-chat-watermark">
                <img src="/oracle-wordmark.png" alt="" className="ai-chat-watermark-img" />
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Clear Chat Confirmation - Inline modal within chat panel */}
          {showClearConfirm && (
            <div className="ai-clear-overlay" onClick={() => setShowClearConfirm(false)}>
              <div className="ai-clear-modal" onClick={e => e.stopPropagation()}>
                <h2>Clear chat history?</h2>
                <p>This will delete all messages in this conversation.</p>
                <div className="ai-clear-actions">
                  <button className="ai-clear-btn-danger" onClick={handleClearChat}>Clear</button>
                  <button className="ai-clear-btn-cancel" onClick={() => setShowClearConfirm(false)}>Cancel</button>
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
        </div>
      </div>
    </>
  );
};

export default AIChat;
