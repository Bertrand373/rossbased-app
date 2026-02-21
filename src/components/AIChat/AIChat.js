// src/components/AIChat/AIChat.js
// Premium AI Chat with streaming responses
// Now controlled by header button instead of floating FAB
import React, { useState, useEffect, useRef, useCallback } from 'react';
import './AIChat.css';

// Mixpanel tracking
import { trackAIChatOpened, trackAIMessageSent, trackAIChatCleared, trackAILimitReached } from '../../utils/mixpanel';

const API_URL = process.env.REACT_APP_API_URL || 'https://rossbased-app.onrender.com';

// Storage keys
const CHAT_HISTORY_KEY = 'titantrack_ai_chat_history';
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

const AIChat = ({ isLoggedIn, isOpen, onClose }) => {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [usage, setUsage] = useState({
    messagesUsed: 0,
    messagesLimit: 5,
    messagesRemaining: 5,
    isBetaPeriod: true
  });
  const [error, setError] = useState(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const chatBodyRef = useRef(null);
  const panelRef = useRef(null);
  const hasTrackedOpen = useRef(false);
  
  // Swipe-to-close refs
  const touchStartY = useRef(0);
  const touchDeltaY = useRef(0);
  const isDragging = useRef(false);

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

  // Load chat history from localStorage
  useEffect(() => {
    if (isLoggedIn) {
      const stored = localStorage.getItem(CHAT_HISTORY_KEY);
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          setMessages(parsed.slice(-MAX_STORED_MESSAGES));
        } catch (e) {
          console.error('Failed to parse chat history:', e);
        }
      }
      fetchUsage();
    }
  }, [isLoggedIn]);

  // Save chat history to localStorage
  useEffect(() => {
    if (messages.length > 0) {
      const toStore = messages.slice(-MAX_STORED_MESSAGES);
      localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(toStore));
    }
  }, [messages]);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (messagesEndRef.current && isOpen) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, streamingText, isOpen]);

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

  // Track when limit is reached
  useEffect(() => {
    if (usage.messagesRemaining === 0 && usage.messagesLimit > 0) {
      trackAILimitReached();
    }
  }, [usage.messagesRemaining, usage.messagesLimit]);

  // Swipe-to-close (mobile drawer)
  const handleTouchStart = useCallback((e) => {
    touchStartY.current = e.touches[0].clientY;
    touchDeltaY.current = 0;
    isDragging.current = false;
  }, []);

  const handleTouchMove = useCallback((e) => {
    const delta = e.touches[0].clientY - touchStartY.current;
    if (delta < 0) return; // Only allow downward swipe
    if (delta > 10) {
      isDragging.current = true;
      touchDeltaY.current = delta;
      if (panelRef.current) {
        panelRef.current.style.transition = 'none';
        panelRef.current.style.transform = `translateY(${delta}px)`;
      }
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (!isDragging.current) return;
    
    if (touchDeltaY.current > 100 && panelRef.current) {
      // Threshold met — animate out and close
      panelRef.current.style.transition = 'transform 250ms ease-out';
      panelRef.current.style.transform = 'translateY(100%)';
      setTimeout(() => {
        if (panelRef.current) {
          panelRef.current.style.transition = '';
          panelRef.current.style.transform = '';
        }
        onClose();
      }, 250);
    } else if (panelRef.current) {
      // Below threshold — snap back
      panelRef.current.style.transition = 'transform 250ms ease-out';
      panelRef.current.style.transform = '';
      setTimeout(() => {
        if (panelRef.current) {
          panelRef.current.style.transition = '';
        }
      }, 250);
    }
    
    isDragging.current = false;
    touchDeltaY.current = 0;
  }, [onClose]);

  // Fetch usage stats
  const fetchUsage = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const response = await fetch(`${API_URL}/api/ai/usage`, {
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
                  isBetaPeriod: parsed.isBetaPeriod
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

  // Clear chat history
  const handleClearChat = () => {
    setMessages([]);
    localStorage.removeItem(CHAT_HISTORY_KEY);
    setShowClearConfirm(false);
    trackAIChatCleared();
  };

  // Get theme-aware loading icon
  const getLoadingIcon = () => {
    const theme = document.documentElement.getAttribute('data-theme') || 'dark';
    return theme === 'light' ? '/tt-icon-black.png' : '/tt-icon-white.png';
  };

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
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            <div className="ai-chat-header-content">
              <h2 className="ai-chat-title">The Oracle</h2>
              <span className="ai-chat-subtitle">
                {usage.messagesRemaining} remaining · {usage.isBetaPeriod ? 'Beta' : 'Premium'}
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
                <p className="ai-chat-empty-title">The Oracle awaits.</p>
                <p className="ai-chat-empty-subtitle">
                  Ask about your journey, phases, flatlines, transmutation, or anything on your mind.
                </p>
              </div>
            )}

            {messages.map((msg, index) => (
              <div key={index} className={`ai-chat-message ${msg.role}`}>
                {msg.role === 'user' && (
                  <div className="ai-chat-message-meta">
                    <span className="ai-chat-message-label">You</span>
                    <span className="ai-chat-message-time">{formatTime(msg.timestamp)}</span>
                  </div>
                )}
                {msg.role === 'assistant' ? (
                  <div className="ai-chat-message-row">
                    <img src="/The_Oracle.png" alt="" className="ai-chat-avatar" />
                    <div className="ai-chat-message-content">
                      {renderMarkdown(msg.content)}
                    </div>
                  </div>
                ) : (
                  <div className="ai-chat-message-content">
                    {msg.content}
                  </div>
                )}
              </div>
            ))}

            {/* Streaming response */}
            {streamingText && (
              <div className="ai-chat-message assistant">
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
                  <img src="/The_Oracle.png" alt="" className="ai-chat-avatar" />
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

            <div ref={messagesEndRef} />
          </div>

          {/* Clear Chat Confirmation Modal */}
          {showClearConfirm && (
            <div className="overlay" onClick={() => setShowClearConfirm(false)}>
              <div className="modal" onClick={e => e.stopPropagation()}>
                <h2>Clear chat history?</h2>
                <p className="modal-text">This will delete all messages in this conversation.</p>
                <div className="modal-buttons">
                  <button className="btn-danger" onClick={handleClearChat}>Clear</button>
                  <button className="btn-ghost" onClick={() => setShowClearConfirm(false)}>Cancel</button>
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
                  placeholder="Ask anything..."
                  value={inputValue}
                  onChange={(e) => {
                    setInputValue(e.target.value);
                    // Auto-resize textarea
                    e.target.style.height = 'auto';
                    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
                  }}
                  onKeyDown={handleKeyDown}
                  onFocus={() => {
                    // iOS Safari keyboard fix
                    setTimeout(() => {
                      const modal = document.querySelector('.ai-chat-modal');
                      if (modal && window.visualViewport) {
                        const keyboardHeight = window.innerHeight - window.visualViewport.height;
                        if (keyboardHeight > 0) {
                          modal.style.height = `${window.visualViewport.height}px`;
                          modal.style.bottom = `${keyboardHeight}px`;
                        }
                      }
                    }, 100);
                  }}
                  onBlur={() => {
                    // Reset modal position when keyboard closes
                    const modal = document.querySelector('.ai-chat-modal');
                    if (modal) {
                      modal.style.height = '';
                      modal.style.bottom = '';
                    }
                  }}
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
                  Daily limit reached · Resets at midnight
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default AIChat;
