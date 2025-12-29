// src/components/AIChat/AIChat.js
// Premium AI Chat with streaming responses
import React, { useState, useEffect, useRef, useCallback } from 'react';
import './AIChat.css';

const API_URL = process.env.REACT_APP_API_URL || 'https://rossbased-app.onrender.com';

// Storage keys
const CHAT_HISTORY_KEY = 'titantrack_ai_chat_history';
const MAX_STORED_MESSAGES = 50;
const MAX_CONTEXT_MESSAGES = 10; // Send last 10 to Claude

const AIChat = ({ isLoggedIn }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [showPulse, setShowPulse] = useState(false);
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

  // Check if user should see pulse animation (first 3 app opens before clicking chat)
  useEffect(() => {
    if (isLoggedIn) {
      const chatOpened = localStorage.getItem('titantrack_ai_chat_opened');
      const pulseCount = parseInt(localStorage.getItem('titantrack_ai_pulse_count') || '0', 10);
      
      if (!chatOpened && pulseCount < 3) {
        setShowPulse(true);
        localStorage.setItem('titantrack_ai_pulse_count', String(pulseCount + 1));
      }
    }
  }, [isLoggedIn]);

  // Mark chat as opened (stops future pulses)
  const handleOpenChat = () => {
    setIsOpen(true);
    setShowPulse(false);
    localStorage.setItem('titantrack_ai_chat_opened', 'true');
  };

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

    // Add user message immediately
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
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

      const response = await fetch(`${API_URL}/api/ai/chat/stream`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: userMessage.content,
          conversationHistory: recentMessages.slice(0, -1) // Exclude current message
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
            } catch (e) {
              // Skip malformed JSON chunks
              if (data && data !== '[DONE]') {
                console.warn('Failed to parse SSE data:', data);
              }
            }
          }
        }
      }

      // Add complete assistant message
      if (fullResponse) {
        const assistantMessage = {
          role: 'assistant',
          content: fullResponse,
          timestamp: new Date().toISOString()
        };
        setMessages(prev => [...prev, assistantMessage]);
      }

    } catch (err) {
      console.error('AI Chat error:', err);
      setError(err.message || 'Something went wrong');
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
  };

  // Don't render if not logged in
  if (!isLoggedIn) return null;

  return (
    <>
      {/* Floating Button */}
      <button 
        className={`ai-chat-fab ${isOpen ? 'hidden' : ''} ${showPulse ? 'pulse' : ''}`}
        onClick={handleOpenChat}
        aria-label="Open AI Chat"
      >
        <img 
          src="/tt-icon-white.png" 
          alt="" 
          className="ai-chat-fab-icon"
        />
      </button>

      {/* Chat Panel */}
      <div className={`ai-chat-overlay ${isOpen ? 'open' : ''}`} onClick={() => setIsOpen(false)}>
        <div 
          className={`ai-chat-panel ${isOpen ? 'open' : ''}`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <header className="ai-chat-header">
            <div className="ai-chat-header-content">
              <h2 className="ai-chat-title">AI Guide</h2>
              <span className="ai-chat-subtitle">
                {usage.messagesRemaining} remaining · {usage.isBetaPeriod ? 'Beta' : 'Premium'}
              </span>
            </div>
            <button 
              className="ai-chat-close"
              onClick={() => setIsOpen(false)}
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
                <p className="ai-chat-empty-title">Your AI guide awaits.</p>
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
                <div className="ai-chat-message-content">
                  {msg.content}
                </div>
              </div>
            ))}

            {/* Streaming response */}
            {streamingText && (
              <div className="ai-chat-message assistant">
                <div className="ai-chat-message-content streaming">
                  {streamingText}
                  <span className="ai-chat-cursor" />
                </div>
              </div>
            )}

            {/* Loading indicator */}
            {isLoading && !streamingText && (
              <div className="ai-chat-loading">
                <img 
                  src="/tt-icon-white.png" 
                  alt="" 
                  className="ai-chat-loading-icon"
                />
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
                  <button className="btn-ghost" onClick={() => setShowClearConfirm(false)}>Cancel</button>
                  <button className="btn-danger" onClick={handleClearChat}>Clear</button>
                </div>
              </div>
            </div>
          )}

          {/* Input Area */}
          <div className="ai-chat-input-area">
            {usage.messagesRemaining > 0 ? (
              <>
                <input
                  ref={inputRef}
                  type="text"
                  className="ai-chat-input"
                  placeholder="Ask anything..."
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={isLoading}
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
                {usage.isBetaPeriod && (
                  <span className="ai-chat-limit-subtext">
                    Unlimited access Feb 18
                  </span>
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