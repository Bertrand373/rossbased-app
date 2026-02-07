// src/components/Admin/KnowledgeBase.js
// Admin-only RAG Knowledge Base Manager
// Upload documents, URLs, and text for Oracle's knowledge

import React, { useState, useEffect, useCallback } from 'react';
import './KnowledgeBase.css';

const API = process.env.REACT_APP_API || '';

const CATEGORIES = [
  { value: 'general', label: 'General' },
  { value: 'esoteric', label: 'Esoteric' },
  { value: 'science', label: 'Science' },
  { value: 'spiritual', label: 'Spiritual' },
  { value: 'practical', label: 'Practical' },
  { value: 'angel-numbers', label: 'Angel Numbers' },
  { value: 'transmutation', label: 'Transmutation' },
  { value: 'chrism', label: 'Chrism Oil' },
  { value: 'kundalini', label: 'Kundalini' },
  { value: 'samael-aun-weor', label: 'Samael Aun Weor' },
  { value: 'other', label: 'Other' }
];

const KnowledgeBase = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [activeTab, setActiveTab] = useState('text');
  const [message, setMessage] = useState(null);
  const token = localStorage.getItem('token');

  // Form states
  const [textForm, setTextForm] = useState({ name: '', content: '', category: 'general' });
  const [urlForm, setUrlForm] = useState({ url: '', name: '', category: 'general' });
  const [fileForm, setFileForm] = useState({ file: null, category: 'general' });
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/knowledge/stats`, { headers });
      if (res.status === 403) {
        const data = await res.json();
        setMessage({ type: 'error', text: `Access denied. Username: "${data.yourUsername}". Add to ADMIN_USERNAMES on Render.` });
        setLoading(false);
        return;
      }
      if (!res.ok) {
        setMessage({ type: 'error', text: 'Failed to load knowledge base' });
        setLoading(false);
        return;
      }
      const data = await res.json();
      setStats(data);
      setMessage(null);
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to connect to server' });
    }
    setLoading(false);
  }, [token]);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), type === 'success' ? 8000 : 6000);
  };

  // --- INGEST TEXT ---
  const handleTextSubmit = async () => {
    if (!textForm.name || !textForm.content) return;
    setUploading(true);
    try {
      const res = await fetch(`${API}/api/knowledge/ingest/text`, {
        method: 'POST', headers,
        body: JSON.stringify(textForm)
      });
      const data = await res.json();
      if (data.success) {
        showMessage('success', `✓ "${data.name}" ingested — ${data.chunks} chunks, ~${data.totalTokens.toLocaleString()} tokens`);
        setTextForm({ name: '', content: '', category: 'general' });
        fetchStats();
      } else {
        showMessage('error', data.error);
      }
    } catch (err) {
      showMessage('error', 'Failed to ingest text');
    }
    setUploading(false);
  };

  // --- INGEST URL ---
  const handleUrlSubmit = async () => {
    if (!urlForm.url) return;
    setUploading(true);
    try {
      const res = await fetch(`${API}/api/knowledge/ingest/url`, {
        method: 'POST', headers,
        body: JSON.stringify(urlForm)
      });
      const data = await res.json();
      if (data.success) {
        showMessage('success', `✓ "${data.name}" ingested — ${data.chunks} chunks from URL`);
        setUrlForm({ url: '', name: '', category: 'general' });
        fetchStats();
      } else {
        showMessage('error', data.error);
      }
    } catch (err) {
      showMessage('error', 'Failed to ingest URL');
    }
    setUploading(false);
  };

  // --- INGEST FILE ---
  const handleFileSubmit = async () => {
    if (!fileForm.file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', fileForm.file);
      formData.append('category', fileForm.category);
      const res = await fetch(`${API}/api/knowledge/ingest/file`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      const data = await res.json();
      if (data.success) {
        showMessage('success', `✓ "${data.name}" ingested — ${data.chunks} chunks, ~${data.totalTokens.toLocaleString()} tokens`);
        setFileForm({ file: null, category: 'general' });
        const fileInput = document.querySelector('.kb-file-hidden');
        if (fileInput) fileInput.value = '';
        fetchStats();
      } else {
        showMessage('error', data.error);
      }
    } catch (err) {
      showMessage('error', 'Failed to ingest file');
    }
    setUploading(false);
  };

  // --- TOGGLE DOCUMENT ---
  const handleToggle = async (parentId, currentEnabled) => {
    try {
      await fetch(`${API}/api/knowledge/document/${parentId}/toggle`, {
        method: 'PUT', headers,
        body: JSON.stringify({ enabled: !currentEnabled })
      });
      fetchStats();
    } catch (err) {
      showMessage('error', 'Failed to toggle document');
    }
  };

  // --- DELETE DOCUMENT ---
  const handleDelete = async (parentId) => {
    try {
      const res = await fetch(`${API}/api/knowledge/document/${parentId}`, {
        method: 'DELETE', headers
      });
      const data = await res.json();
      if (data.success) {
        showMessage('success', `✓ Deleted ${data.deletedChunks} chunks`);
        setDeleteConfirm(null);
        fetchStats();
      }
    } catch (err) {
      showMessage('error', 'Failed to delete');
    }
  };

  // --- UPDATE CATEGORY ---
  const handleCategoryChange = async (parentId, category) => {
    try {
      await fetch(`${API}/api/knowledge/document/${parentId}/category`, {
        method: 'PUT', headers,
        body: JSON.stringify({ category })
      });
      fetchStats();
    } catch (err) {
      showMessage('error', 'Failed to update category');
    }
  };

  if (loading) {
    return (
      <div className="kb-container">
        <div className="kb-loading">
          <div className="kb-loading-spinner" />
          <span>Loading knowledge base...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="kb-container">
      {/* Header */}
      <div className="kb-header">
        <h1>Oracle Knowledge Base</h1>
        <span className="kb-badge">RAG Engine</span>
      </div>

      {/* Message */}
      {message && (
        <div className={`kb-message kb-message-${message.type}`}>
          {message.text}
        </div>
      )}

      {/* Stats */}
      {stats && (
        <div className="kb-stats">
          <div className="kb-stat">
            <span className="kb-stat-number">{stats.totalDocuments}</span>
            <span className="kb-stat-label">Documents</span>
          </div>
          <div className="kb-stat">
            <span className="kb-stat-number">{stats.enabledChunks}</span>
            <span className="kb-stat-label">Chunks</span>
          </div>
          <div className="kb-stat">
            <span className="kb-stat-number">{(stats.totalTokens / 1000).toFixed(1)}K</span>
            <span className="kb-stat-label">Tokens</span>
          </div>
        </div>
      )}

      {/* Upload Section */}
      <div className="kb-upload-section">
        <div className="kb-tabs">
          {['text', 'url', 'file'].map(tab => (
            <button
              key={tab}
              className={`kb-tab ${activeTab === tab ? 'active' : ''}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab === 'text' ? 'Paste Text' : tab === 'url' ? 'Add URL' : 'Upload File'}
            </button>
          ))}
        </div>

        <div className="kb-tab-content">
          {/* TEXT */}
          {activeTab === 'text' && (
            <div className="kb-form">
              <input
                type="text"
                placeholder="Document name (e.g. Chrism Oil Teachings)"
                value={textForm.name}
                onChange={e => setTextForm({ ...textForm, name: e.target.value })}
                className="kb-input"
              />
              <select
                value={textForm.category}
                onChange={e => setTextForm({ ...textForm, category: e.target.value })}
                className="kb-select"
              >
                {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
              <textarea
                placeholder="Paste document content here..."
                value={textForm.content}
                onChange={e => setTextForm({ ...textForm, content: e.target.value })}
                className="kb-textarea"
                rows={10}
              />
              <div className="kb-form-footer">
                {textForm.content && (
                  <span className="kb-char-count">
                    {textForm.content.length.toLocaleString()} chars · ~{Math.ceil(textForm.content.length / 4).toLocaleString()} tokens
                  </span>
                )}
                <button onClick={handleTextSubmit} disabled={uploading || !textForm.name || !textForm.content} className="kb-submit">
                  {uploading ? 'Processing...' : 'Ingest Text'}
                </button>
              </div>
            </div>
          )}

          {/* URL */}
          {activeTab === 'url' && (
            <div className="kb-form">
              <input type="url" placeholder="https://glorian.org/articles/..." value={urlForm.url}
                onChange={e => setUrlForm({ ...urlForm, url: e.target.value })} className="kb-input" />
              <input type="text" placeholder="Name (optional — uses domain name)" value={urlForm.name}
                onChange={e => setUrlForm({ ...urlForm, name: e.target.value })} className="kb-input" />
              <select value={urlForm.category} onChange={e => setUrlForm({ ...urlForm, category: e.target.value })} className="kb-select">
                {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
              <div className="kb-form-footer">
                <span />
                <button onClick={handleUrlSubmit} disabled={uploading || !urlForm.url} className="kb-submit">
                  {uploading ? 'Fetching page...' : 'Ingest URL'}
                </button>
              </div>
            </div>
          )}

          {/* FILE */}
          {activeTab === 'file' && (
            <div className="kb-form">
              <label className="kb-file-label">
                <span>{fileForm.file ? `📄 ${fileForm.file.name}` : 'Choose file (.txt, .md, .pdf, .json)'}</span>
                <input type="file" accept=".txt,.md,.pdf,.json"
                  onChange={e => setFileForm({ ...fileForm, file: e.target.files[0] })} className="kb-file-hidden" />
              </label>
              <select value={fileForm.category} onChange={e => setFileForm({ ...fileForm, category: e.target.value })} className="kb-select">
                {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
              <div className="kb-form-footer">
                <span />
                <button onClick={handleFileSubmit} disabled={uploading || !fileForm.file} className="kb-submit">
                  {uploading ? 'Processing...' : 'Upload & Ingest'}
                </button>
              </div>
            </div>
          )}
        </div>

        {uploading && (
          <div className="kb-processing">
            <div className="kb-processing-bar" />
          </div>
        )}
      </div>

      {/* Documents List */}
      <div className="kb-documents">
        <div className="kb-documents-header">
          <h2>Documents</h2>
          {stats?.documents?.length > 0 && (
            <span className="kb-doc-count">{stats.documents.length}</span>
          )}
        </div>

        {(!stats?.documents || stats.documents.length === 0) ? (
          <div className="kb-empty">
            <p>No documents yet</p>
            <p className="kb-empty-hint">Upload your first document above to build the Oracle's knowledge</p>
          </div>
        ) : (
          <div className="kb-doc-list">
            {stats.documents.map(doc => (
              <div key={doc._id} className={`kb-doc ${!doc.enabled ? 'kb-doc-disabled' : ''}`}>
                <div className="kb-doc-left">
                  <div className={`kb-doc-dot ${doc.enabled ? 'on' : 'off'}`} />
                  <div className="kb-doc-info">
                    <span className="kb-doc-name">{doc.name}</span>
                    <span className="kb-doc-meta">
                      {doc.type} · {doc.chunks} chunks · ~{doc.totalTokens.toLocaleString()} tokens
                    </span>
                  </div>
                </div>
                <div className="kb-doc-actions">
                  <select value={doc.category} onChange={e => handleCategoryChange(doc._id, e.target.value)} className="kb-cat-select">
                    {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                  <button className={`kb-toggle ${doc.enabled ? 'on' : 'off'}`}
                    onClick={() => handleToggle(doc._id, doc.enabled)}>
                    {doc.enabled ? 'ON' : 'OFF'}
                  </button>
                  {deleteConfirm === doc._id ? (
                    <div className="kb-confirm-row">
                      <button onClick={() => handleDelete(doc._id)} className="kb-confirm-yes">Delete</button>
                      <button onClick={() => setDeleteConfirm(null)} className="kb-confirm-no">×</button>
                    </div>
                  ) : (
                    <button className="kb-remove" onClick={() => setDeleteConfirm(doc._id)}>Remove</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default KnowledgeBase;
