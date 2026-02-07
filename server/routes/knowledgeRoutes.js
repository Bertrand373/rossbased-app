// server/routes/knowledgeRoutes.js
// RAG Knowledge Base API
// Handles document upload, chunking, search, and management

const express = require('express');
const router = express.Router();
const multer = require('multer');
const KnowledgeChunk = require('../models/KnowledgeChunk');
const { randomUUID } = require('crypto');

// File upload config - store in memory for processing
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB max
  fileFilter: (req, file, cb) => {
    const allowed = ['.txt', '.md', '.pdf', '.json'];
    const ext = '.' + file.originalname.split('.').pop().toLowerCase();
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('File type not supported. Use .txt, .md, .pdf, or .json'));
    }
  }
});

// ============================================================
// ADMIN CHECK MIDDLEWARE
// Only Ross (or specified admins) can manage knowledge base
// Uses env var ADMIN_USERNAMES, or defaults to matching 'ross' prefix
// ============================================================

const adminCheck = (req, res, next) => {
  const username = req.user?.username || '';
  const lower = username.toLowerCase();
  
  // Check env var first
  const envAdmins = process.env.ADMIN_USERNAMES;
  if (envAdmins) {
    const allowed = envAdmins.split(',').map(u => u.trim().toLowerCase());
    if (allowed.includes(lower)) return next();
  }
  
  // Default: any username starting with 'ross' is admin
  if (lower.startsWith('ross')) return next();
  
  console.log(`[Knowledge Admin] Access denied for: "${username}"`);
  return res.status(403).json({ 
    error: 'Admin access required',
    yourUsername: username
  });
};

// ============================================================
// CHUNKING ENGINE
// Splits text into overlapping chunks for better retrieval
// ============================================================

const chunkText = (text, options = {}) => {
  const {
    maxChunkSize = 1500,   // ~375 tokens per chunk
    overlap = 200,          // overlap between chunks for context continuity
    separator = '\n\n'      // prefer splitting on double newlines (paragraphs)
  } = options;

  // Clean the text
  const cleaned = text
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/\t/g, ' ')
    .replace(/ {2,}/g, ' ')
    .trim();

  if (cleaned.length <= maxChunkSize) {
    return [cleaned];
  }

  const chunks = [];
  const paragraphs = cleaned.split(separator);
  let currentChunk = '';

  for (const paragraph of paragraphs) {
    const trimmed = paragraph.trim();
    if (!trimmed) continue;

    // If single paragraph exceeds max, split by sentences
    if (trimmed.length > maxChunkSize) {
      if (currentChunk) {
        chunks.push(currentChunk.trim());
        currentChunk = '';
      }
      const sentences = trimmed.match(/[^.!?]+[.!?]+/g) || [trimmed];
      let sentenceChunk = '';
      for (const sentence of sentences) {
        if ((sentenceChunk + ' ' + sentence).length > maxChunkSize) {
          if (sentenceChunk) chunks.push(sentenceChunk.trim());
          sentenceChunk = sentence;
        } else {
          sentenceChunk += (sentenceChunk ? ' ' : '') + sentence;
        }
      }
      if (sentenceChunk) currentChunk = sentenceChunk;
      continue;
    }

    // Check if adding this paragraph exceeds chunk size
    if ((currentChunk + separator + trimmed).length > maxChunkSize) {
      if (currentChunk) {
        chunks.push(currentChunk.trim());
        // Keep overlap from end of previous chunk
        const words = currentChunk.split(' ');
        const overlapWords = words.slice(-Math.floor(overlap / 5));
        currentChunk = overlapWords.join(' ') + separator + trimmed;
      } else {
        currentChunk = trimmed;
      }
    } else {
      currentChunk += (currentChunk ? separator : '') + trimmed;
    }
  }

  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
};

// Estimate token count (~4 chars per token)
const estimateTokens = (text) => Math.ceil(text.length / 4);

// Extract keywords from text (simple but effective)
const extractKeywords = (text) => {
  const stopWords = new Set([
    'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
    'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
    'should', 'may', 'might', 'shall', 'can', 'need', 'dare', 'ought',
    'used', 'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from',
    'as', 'into', 'through', 'during', 'before', 'after', 'above', 'below',
    'between', 'out', 'off', 'over', 'under', 'again', 'further', 'then',
    'once', 'here', 'there', 'when', 'where', 'why', 'how', 'all', 'each',
    'every', 'both', 'few', 'more', 'most', 'other', 'some', 'such', 'no',
    'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very', 'just',
    'because', 'but', 'and', 'or', 'if', 'while', 'that', 'this', 'these',
    'those', 'it', 'its', 'they', 'them', 'their', 'we', 'our', 'you', 'your',
    'he', 'him', 'his', 'she', 'her', 'what', 'which', 'who', 'whom'
  ]);

  const words = text.toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 3 && !stopWords.has(w));

  // Count frequency
  const freq = {};
  words.forEach(w => { freq[w] = (freq[w] || 0) + 1; });

  // Return top 20 by frequency
  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([word]) => word);
};

// ============================================================
// ROUTES
// ============================================================

// --- GET /stats - Knowledge base statistics ---
router.get('/stats', adminCheck, async (req, res) => {
  try {
    const totalChunks = await KnowledgeChunk.countDocuments();
    const enabledChunks = await KnowledgeChunk.countDocuments({ enabled: true });
    
    // Get unique parent documents
    const documents = await KnowledgeChunk.aggregate([
      {
        $group: {
          _id: '$parentId',
          name: { $first: '$source.name' },
          type: { $first: '$source.type' },
          category: { $first: '$category' },
          chunks: { $sum: 1 },
          totalTokens: { $sum: '$tokenEstimate' },
          enabled: { $first: '$enabled' },
          author: { $first: '$author' },
          createdAt: { $min: '$createdAt' }
        }
      },
      { $sort: { createdAt: -1 } }
    ]);

    const totalTokens = await KnowledgeChunk.aggregate([
      { $match: { enabled: true } },
      { $group: { _id: null, total: { $sum: '$tokenEstimate' } } }
    ]);

    res.json({
      totalDocuments: documents.length,
      totalChunks,
      enabledChunks,
      totalTokens: totalTokens[0]?.total || 0,
      documents
    });
  } catch (error) {
    console.error('Knowledge stats error:', error);
    res.status(500).json({ error: 'Failed to get stats' });
  }
});

// --- POST /ingest/text - Ingest plain text or markdown ---
router.post('/ingest/text', adminCheck, async (req, res) => {
  try {
    const { name, content, category = 'general' } = req.body;
    
    if (!name || !content) {
      return res.status(400).json({ error: 'Name and content are required' });
    }

    const parentId = randomUUID();
    const chunks = chunkText(content);
    const keywords = extractKeywords(content);

    const docs = chunks.map((chunk, index) => ({
      content: chunk,
      source: { type: 'text', name },
      category,
      chunkIndex: index,
      parentId,
      keywords,
      tokenEstimate: estimateTokens(chunk),
      enabled: true
    }));

    await KnowledgeChunk.insertMany(docs);

    res.json({
      success: true,
      parentId,
      name,
      chunks: docs.length,
      totalTokens: docs.reduce((sum, d) => sum + d.tokenEstimate, 0)
    });
  } catch (error) {
    console.error('Text ingestion error:', error);
    res.status(500).json({ error: 'Failed to ingest text' });
  }
});

// --- POST /ingest/url - Fetch and ingest a web page ---
router.post('/ingest/url', adminCheck, async (req, res) => {
  try {
    const { url, name, category = 'general' } = req.body;
    
    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    // Fetch the page
    const fetch = (await import('node-fetch')).default;
    const response = await fetch(url, {
      headers: { 'User-Agent': 'TitanTrack-Oracle/1.0' },
      timeout: 15000
    });

    if (!response.ok) {
      return res.status(400).json({ error: `Failed to fetch URL: ${response.status}` });
    }

    const html = await response.text();
    
    // Extract text from HTML (simple but effective)
    const text = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
      .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '')
      .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '')
      .replace(/<[^>]+>/g, '\n')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\n{3,}/g, '\n\n')
      .replace(/ {2,}/g, ' ')
      .trim();

    if (text.length < 100) {
      return res.status(400).json({ error: 'Not enough text content extracted from URL' });
    }

    const parentId = randomUUID();
    const sourceName = name || new URL(url).hostname;
    const chunks = chunkText(text);
    const keywords = extractKeywords(text);

    const docs = chunks.map((chunk, index) => ({
      content: chunk,
      source: { type: 'url', name: sourceName, url },
      category,
      chunkIndex: index,
      parentId,
      keywords,
      tokenEstimate: estimateTokens(chunk),
      enabled: true
    }));

    await KnowledgeChunk.insertMany(docs);

    res.json({
      success: true,
      parentId,
      name: sourceName,
      url,
      chunks: docs.length,
      totalTokens: docs.reduce((sum, d) => sum + d.tokenEstimate, 0),
      extractedLength: text.length
    });
  } catch (error) {
    console.error('URL ingestion error:', error);
    res.status(500).json({ error: 'Failed to ingest URL: ' + error.message });
  }
});

// --- POST /ingest/file - Upload and ingest a file ---
router.post('/ingest/file', adminCheck, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { category = 'general' } = req.body;
    const filename = req.file.originalname;
    const ext = filename.split('.').pop().toLowerCase();
    let text = '';

    if (ext === 'pdf') {
      const pdfParse = require('pdf-parse');
      const data = await pdfParse(req.file.buffer);
      text = data.text;
    } else {
      // txt, md, json - just read as text
      text = req.file.buffer.toString('utf-8');
    }

    // Clean and check text content
    text = text.replace(/\s+/g, ' ').trim();

    if (text.length < 50) {
      return res.status(400).json({ 
        error: 'This file has little or no extractable text. It may be a scanned/image-based PDF. Use Paste Text instead to manually add content.' 
      });
    }

    const parentId = randomUUID();
    const chunks = chunkText(text).filter(chunk => chunk && chunk.trim().length > 10);

    if (chunks.length === 0) {
      return res.status(400).json({ error: 'No usable text could be extracted from this file.' });
    }
    const keywords = extractKeywords(text);

    const docs = chunks.map((chunk, index) => ({
      content: chunk,
      source: { type: 'document', name: filename },
      category,
      chunkIndex: index,
      parentId,
      keywords,
      tokenEstimate: estimateTokens(chunk),
      enabled: true
    }));

    await KnowledgeChunk.insertMany(docs);

    res.json({
      success: true,
      parentId,
      name: filename,
      chunks: docs.length,
      totalTokens: docs.reduce((sum, d) => sum + d.tokenEstimate, 0)
    });
  } catch (error) {
    console.error('File ingestion error:', error);
    res.status(500).json({ error: 'Failed to ingest file: ' + error.message });
  }
});

// --- DELETE /document/:parentId - Delete a document and all its chunks ---
router.delete('/document/:parentId', adminCheck, async (req, res) => {
  try {
    const parentId = req.params.parentId;
    console.log(`[Knowledge] Deleting document with parentId: "${parentId}"`);
    const result = await KnowledgeChunk.deleteMany({ parentId });
    console.log(`[Knowledge] Deleted ${result.deletedCount} chunks for parentId: "${parentId}"`);
    if (result.deletedCount === 0) {
      return res.status(404).json({ success: false, error: 'No chunks found for this document' });
    }
    res.json({ success: true, deletedChunks: result.deletedCount });
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ error: 'Failed to delete document' });
  }
});

// --- PUT /document/:parentId/toggle - Enable/disable a document ---
router.put('/document/:parentId/toggle', adminCheck, async (req, res) => {
  try {
    const { enabled } = req.body;
    await KnowledgeChunk.updateMany(
      { parentId: req.params.parentId },
      { $set: { enabled: !!enabled } }
    );
    res.json({ success: true, enabled: !!enabled });
  } catch (error) {
    console.error('Toggle error:', error);
    res.status(500).json({ error: 'Failed to toggle document' });
  }
});

// --- PUT /document/:parentId/category - Update category ---
router.put('/document/:parentId/category', adminCheck, async (req, res) => {
  try {
    const { category } = req.body;
    await KnowledgeChunk.updateMany(
      { parentId: req.params.parentId },
      { $set: { category } }
    );
    res.json({ success: true, category });
  } catch (error) {
    console.error('Category update error:', error);
    res.status(500).json({ error: 'Failed to update category' });
  }
});

// ============================================================
// SEARCH / RETRIEVAL (used by Oracle bots)
// This is the core RAG function
// ============================================================

router.get('/search', async (req, res) => {
  try {
    const { q, limit = 5, category } = req.query;
    
    if (!q) {
      return res.status(400).json({ error: 'Query required' });
    }

    const searchQuery = { enabled: true };
    if (category) searchQuery.category = category;

    // MongoDB text search
    const results = await KnowledgeChunk.find(
      { ...searchQuery, $text: { $search: q } },
      { score: { $meta: 'textScore' } }
    )
      .sort({ score: { $meta: 'textScore' } })
      .limit(parseInt(limit))
      .select('content source category score keywords')
      .lean();

    // If text search returns too few results, fall back to regex
    if (results.length < 2) {
      const words = q.toLowerCase().split(/\s+/).filter(w => w.length > 2);
      if (words.length > 0) {
        const regexPattern = words.map(w => `(?=.*${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`).join('');
        const regexResults = await KnowledgeChunk.find({
          ...searchQuery,
          content: { $regex: regexPattern, $options: 'i' }
        })
          .limit(parseInt(limit))
          .select('content source category keywords')
          .lean();

        // Merge without duplicates
        const existingIds = new Set(results.map(r => r._id.toString()));
        for (const r of regexResults) {
          if (!existingIds.has(r._id.toString())) {
            results.push(r);
          }
        }
      }
    }

    res.json({ results: results.slice(0, parseInt(limit)) });
  } catch (error) {
    console.error('Knowledge search error:', error);
    res.status(500).json({ error: 'Search failed' });
  }
});

module.exports = router;
