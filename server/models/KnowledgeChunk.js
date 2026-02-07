// server/models/KnowledgeChunk.js
// Stores chunked knowledge documents for RAG retrieval
// Used by Oracle (Discord + In-App) to pull relevant context

const mongoose = require('mongoose');

const knowledgeChunkSchema = new mongoose.Schema({
  // The actual text content of this chunk
  content: {
    type: String,
    required: true
  },
  
  // Source identification
  source: {
    type: {
      type: String,
      enum: ['document', 'url', 'text', 'channel'],
      required: true
    },
    name: {
      type: String,
      required: true
    },
    url: String
  },
  
  // Category for organization and filtering
  category: {
    type: String,
    enum: [
      'esoteric',
      'science',
      'spiritual',
      'practical',
      'angel-numbers',
      'transmutation',
      'chrism',
      'kundalini',
      'samael-aun-weor',
      'general',
      'other'
    ],
    default: 'general'
  },
  
  // Chunk position within parent document
  chunkIndex: {
    type: Number,
    default: 0
  },
  
  // Parent document ID to group chunks from same source
  parentId: {
    type: String,
    required: true
  },
  
  // Keywords for search boosting (manually or auto-extracted)
  keywords: [{
    type: String,
    lowercase: true
  }],
  
  // Token count estimate for context window management
  tokenEstimate: {
    type: Number,
    default: 0
  },
  
  // Whether this chunk is active (can be toggled off without deleting)
  enabled: {
    type: Boolean,
    default: true
  }
  
}, {
  timestamps: true
});

// Text search index for retrieval
knowledgeChunkSchema.index({
  content: 'text',
  keywords: 'text',
  'source.name': 'text'
}, {
  weights: {
    keywords: 10,
    'source.name': 5,
    content: 1
  },
  name: 'knowledge_text_search'
});

// Index for parent document grouping
knowledgeChunkSchema.index({ parentId: 1 });

// Index for category filtering
knowledgeChunkSchema.index({ category: 1, enabled: 1 });

const KnowledgeChunk = mongoose.model('KnowledgeChunk', knowledgeChunkSchema);

module.exports = KnowledgeChunk;
