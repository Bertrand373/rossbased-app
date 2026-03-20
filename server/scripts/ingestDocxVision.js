#!/usr/bin/env node
// scripts/ingestDocxVision.js
// One-time (reusable) script to ingest a .docx file with Vision-powered image interpretation
// Designed for the D33P Archive but works for any image-heavy .docx
//
// Usage: cd ~/project/src/server && node scripts/ingestDocxVision.js /path/to/file.docx [category]
//
// What it does:
// 1. Reads the .docx file
// 2. Uses mammoth to extract HTML (preserving image positions in document flow)
// 3. Captures every embedded image via mammoth's convertImage handler
// 4. Walks through the HTML section by section
// 5. For each image, sends it to Claude Vision with surrounding text for context-aware interpretation
// 6. Chunks everything (text + image interpretations) as protected knowledge
// 7. Saves to MongoDB with protected: true
//
// Requires: mammoth, @anthropic-ai/sdk, mongoose (all already in project deps)
// New dep needed: npm install mammoth

const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const Anthropic = require('@anthropic-ai/sdk');

// --- Config ---
const VISION_MODEL = 'claude-haiku-4-5-20251001'; // Cheap, fast, good at vision
const MAX_IMAGES_PER_BATCH = 5; // Rate limiting safety
const DELAY_BETWEEN_IMAGES_MS = 500; // Be gentle with API
const CHUNK_SIZE = 1500; // ~375 tokens per chunk
const CHUNK_OVERLAP = 200;

// --- Args ---
const filePath = process.argv[2];
const categoryArg = process.argv[3] || 'esoteric';

if (!filePath) {
  console.error('Usage: node scripts/ingestDocxVision.js /path/to/file.docx [category]');
  console.error('Categories: esoteric, general, spiritual, transmutation, kundalini, etc.');
  process.exit(1);
}

if (!fs.existsSync(filePath)) {
  console.error(`File not found: ${filePath}`);
  process.exit(1);
}

// --- Lazy imports (mammoth may need to be installed) ---
let mammoth;
try {
  mammoth = require('mammoth');
} catch (e) {
  console.error('mammoth not installed. Run: npm install mammoth');
  process.exit(1);
}

// --- MongoDB connection ---
const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) {
  console.error('MONGO_URI environment variable required');
  process.exit(1);
}

// --- Anthropic client ---
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
if (!process.env.ANTHROPIC_API_KEY) {
  console.error('ANTHROPIC_API_KEY environment variable required');
  process.exit(1);
}

// --- KnowledgeChunk model (inline to avoid path issues) ---
const knowledgeChunkSchema = new mongoose.Schema({
  content: { type: String, required: true },
  source: {
    type: { type: String, enum: ['document', 'url', 'text', 'channel', 'vision'], required: true },
    name: { type: String, required: true },
    url: String
  },
  category: { type: String, default: 'general' },
  chunkIndex: { type: Number, default: 0 },
  parentId: { type: String, required: true },
  keywords: [{ type: String, lowercase: true }],
  tokenEstimate: { type: Number, default: 0 },
  enabled: { type: Boolean, default: true },
  author: { type: String, default: null },
  protected: { type: Boolean, default: false }
}, { timestamps: true });

// Only create text index if it doesn't exist
knowledgeChunkSchema.index({ content: 'text', keywords: 'text', 'source.name': 'text' }, {
  weights: { keywords: 10, 'source.name': 5, content: 1 },
  name: 'knowledge_text_search'
});
knowledgeChunkSchema.index({ parentId: 1 });
knowledgeChunkSchema.index({ category: 1, enabled: 1 });

let KnowledgeChunk;

// --- Helper: estimate tokens ---
function estimateTokens(text) {
  return Math.ceil(text.length / 4);
}

// --- Helper: extract keywords ---
function extractKeywords(text) {
  const stopWords = new Set(['the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been',
    'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should',
    'may', 'might', 'shall', 'can', 'need', 'dare', 'ought', 'used', 'to', 'of', 'in',
    'for', 'on', 'with', 'at', 'by', 'from', 'as', 'into', 'through', 'during', 'before',
    'after', 'above', 'below', 'between', 'out', 'off', 'over', 'under', 'again', 'further',
    'then', 'once', 'here', 'there', 'when', 'where', 'why', 'how', 'all', 'each', 'every',
    'both', 'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only',
    'own', 'same', 'so', 'than', 'too', 'very', 'just', 'because', 'but', 'and', 'or',
    'if', 'while', 'that', 'this', 'these', 'those', 'it', 'its', 'he', 'she', 'they',
    'them', 'his', 'her', 'their', 'what', 'which', 'who', 'whom', 'your', 'you', 'we',
    'me', 'my', 'our', 'i', 'about', 'up', 'also', 'like', 'get', 'one', 'two', 'see',
    'know', 'said', 'says', 'say', 'make', 'go', 'going', 'thing', 'things', 'lot', 'much',
    'many', 'well', 'back', 'even', 'still', 'way', 'take', 'come', 'look', 'want', 'give',
    'use', 'find', 'tell', 'ask', 'work', 'seem', 'feel', 'try', 'leave', 'call']);
  
  const words = text.toLowerCase().replace(/[^a-z0-9\s-]/g, '').split(/\s+/);
  const freq = {};
  for (const word of words) {
    if (word.length > 3 && !stopWords.has(word)) {
      freq[word] = (freq[word] || 0) + 1;
    }
  }
  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 30)
    .map(([word]) => word);
}

// --- Helper: chunk text ---
function chunkText(text) {
  const cleaned = text
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/\t/g, ' ')
    .replace(/ {2,}/g, ' ')
    .trim();

  if (cleaned.length <= CHUNK_SIZE) return [cleaned];

  const chunks = [];
  const paragraphs = cleaned.split('\n\n');
  let currentChunk = '';

  for (const paragraph of paragraphs) {
    const trimmed = paragraph.trim();
    if (!trimmed) continue;

    if (trimmed.length > CHUNK_SIZE) {
      if (currentChunk) {
        chunks.push(currentChunk.trim());
        currentChunk = '';
      }
      // Split long paragraphs by sentences
      const sentences = trimmed.match(/[^.!?]+[.!?]+/g) || [trimmed];
      for (const sentence of sentences) {
        if ((currentChunk + ' ' + sentence).length > CHUNK_SIZE && currentChunk) {
          chunks.push(currentChunk.trim());
          // Overlap: keep last bit
          const words = currentChunk.split(' ');
          currentChunk = words.slice(-Math.floor(CHUNK_OVERLAP / 5)).join(' ') + ' ' + sentence;
        } else {
          currentChunk += (currentChunk ? ' ' : '') + sentence;
        }
      }
      continue;
    }

    if ((currentChunk + '\n\n' + trimmed).length > CHUNK_SIZE && currentChunk) {
      chunks.push(currentChunk.trim());
      // Overlap
      const words = currentChunk.split(' ');
      currentChunk = words.slice(-Math.floor(CHUNK_OVERLAP / 5)).join(' ') + '\n\n' + trimmed;
    } else {
      currentChunk += (currentChunk ? '\n\n' : '') + trimmed;
    }
  }

  if (currentChunk.trim()) chunks.push(currentChunk.trim());
  return chunks;
}

// --- Helper: sleep ---
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// --- Helper: strip HTML tags ---
function stripHtml(html) {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<\/h[1-6]>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, '\n\n')
    .replace(/ {2,}/g, ' ')
    .trim();
}

// --- Vision: interpret a single image with surrounding text context ---
async function interpretImage(imageBase64, contentType, surroundingText, imageIndex) {
  const mediaType = contentType || 'image/png';
  
  // Skip tiny images (likely icons, avatars, spacers)
  const sizeInBytes = Buffer.from(imageBase64, 'base64').length;
  if (sizeInBytes < 2000) { // Less than 2KB = probably an avatar/icon
    console.log(`  [Image ${imageIndex}] Skipped (${sizeInBytes} bytes — likely avatar/icon)`);
    return null;
  }

  try {
    const response = await anthropic.messages.create({
      model: VISION_MODEL,
      max_tokens: 500,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: mediaType,
              data: imageBase64
            }
          },
          {
            type: 'text',
            text: `You are an expert in occult symbolism, esoteric traditions, numerology, gematria, sacred geometry, alchemical processes, and hidden meanings in corporate branding and historical imagery.

This image appears in an occult teachings archive. The text surrounding this image says:
---
${surroundingText.substring(0, 1000)}
---

Describe this image in rich detail. Focus on:
1. What is literally depicted (logos, symbols, people, diagrams, paintings, etc.)
2. The esoteric/occult significance and hidden symbolism
3. How it connects to the surrounding text's teaching
4. Any numerological, gematric, or sacred geometric elements

If this is a corporate logo, explain what occult symbolism is embedded in it.
If this is a historical painting or photograph, explain the esoteric context.
If this is a diagram or chart, explain what it teaches.

Be thorough but concise. This description will be stored as searchable knowledge.`
          }
        ]
      }]
    });

    const description = response.content[0]?.text?.trim();
    if (description) {
      console.log(`  [Image ${imageIndex}] Interpreted: "${description.substring(0, 80)}..."`);
      return description;
    }
    return null;
  } catch (err) {
    console.error(`  [Image ${imageIndex}] Vision API error: ${err.message}`);
    return null;
  }
}

// ============================================================
// MAIN INGESTION PIPELINE
// ============================================================
async function main() {
  console.log('='.repeat(60));
  console.log('D33P ARCHIVE VISION INGESTION PIPELINE');
  console.log('='.repeat(60));
  console.log(`File: ${filePath}`);
  console.log(`Category: ${categoryArg}`);
  console.log(`Vision model: ${VISION_MODEL}`);
  console.log('');

  // Connect to MongoDB
  console.log('[1/6] Connecting to MongoDB...');
  await mongoose.connect(MONGO_URI);
  
  // Use existing model if already registered, otherwise create
  try {
    KnowledgeChunk = mongoose.model('KnowledgeChunk');
  } catch (e) {
    KnowledgeChunk = mongoose.model('KnowledgeChunk', knowledgeChunkSchema);
  }
  console.log('  Connected.');

  // Read the .docx and extract HTML + images
  console.log('[2/6] Extracting text and images from .docx...');
  
  const imageBuffers = [];
  
  const result = await mammoth.convertToHtml(
    { path: filePath },
    {
      convertImage: mammoth.images.imgElement(function(image) {
        return image.read('base64').then(function(base64Data) {
          const index = imageBuffers.length;
          imageBuffers.push({
            base64: base64Data,
            contentType: image.contentType || 'image/png'
          });
          return { src: `__IMAGE_${index}__` };
        });
      })
    }
  );

  const html = result.value;
  const warnings = result.messages.filter(m => m.type === 'warning');
  
  console.log(`  HTML length: ${html.length} characters`);
  console.log(`  Images found: ${imageBuffers.length}`);
  if (warnings.length > 0) {
    console.log(`  Warnings: ${warnings.length}`);
  }

  // Parse HTML into sections (text + image markers)
  console.log('[3/6] Parsing document structure...');
  
  // Split HTML at image markers to get text-between-images
  const sections = [];
  const imagePattern = /<img[^>]*src="__IMAGE_(\d+)__"[^>]*>/g;
  let lastIndex = 0;
  let match;

  while ((match = imagePattern.exec(html)) !== null) {
    // Text before this image
    const textBefore = html.substring(lastIndex, match.index);
    const cleanText = stripHtml(textBefore);
    if (cleanText.length > 10) {
      sections.push({ type: 'text', content: cleanText });
    }
    
    // The image itself
    const imageIdx = parseInt(match[1]);
    // Get surrounding text for context (500 chars before and after the image)
    const contextBefore = stripHtml(html.substring(Math.max(0, match.index - 2000), match.index));
    const contextAfter = stripHtml(html.substring(match.index + match[0].length, 
      Math.min(html.length, match.index + match[0].length + 2000)));
    
    sections.push({ 
      type: 'image', 
      imageIndex: imageIdx,
      surroundingText: `BEFORE: ${contextBefore.substring(contextBefore.length - 500)}\n\nAFTER: ${contextAfter.substring(0, 500)}`
    });
    
    lastIndex = match.index + match[0].length;
  }

  // Remaining text after last image
  const remainingText = stripHtml(html.substring(lastIndex));
  if (remainingText.length > 10) {
    sections.push({ type: 'text', content: remainingText });
  }

  const textSections = sections.filter(s => s.type === 'text');
  const imageSections = sections.filter(s => s.type === 'image');
  console.log(`  Text sections: ${textSections.length}`);
  console.log(`  Image sections: ${imageSections.length}`);

  // Send images to Claude Vision
  console.log(`[4/6] Interpreting ${imageSections.length} images with Claude Vision...`);
  console.log(`  (This may take a while — ${DELAY_BETWEEN_IMAGES_MS}ms delay between calls)`);
  
  const imageDescriptions = [];
  let skipped = 0;
  let interpreted = 0;
  let failed = 0;

  for (let i = 0; i < imageSections.length; i++) {
    const section = imageSections[i];
    const imageData = imageBuffers[section.imageIndex];
    
    if (!imageData) {
      skipped++;
      continue;
    }

    // Skip unsupported formats (like .emf, .wmf)
    if (imageData.contentType && !['image/png', 'image/jpeg', 'image/gif', 'image/webp'].includes(imageData.contentType)) {
      console.log(`  [Image ${section.imageIndex}] Skipped unsupported format: ${imageData.contentType}`);
      skipped++;
      continue;
    }

    const description = await interpretImage(
      imageData.base64,
      imageData.contentType,
      section.surroundingText,
      section.imageIndex
    );

    if (description) {
      imageDescriptions.push({
        imageIndex: section.imageIndex,
        description: description,
        surroundingText: section.surroundingText
      });
      interpreted++;
    } else {
      skipped++;
    }

    // Rate limiting
    if (i < imageSections.length - 1) {
      await sleep(DELAY_BETWEEN_IMAGES_MS);
    }

    // Progress
    if ((i + 1) % 10 === 0) {
      console.log(`  Progress: ${i + 1}/${imageSections.length} (${interpreted} interpreted, ${skipped} skipped)`);
    }
  }

  console.log(`  Done: ${interpreted} interpreted, ${skipped} skipped, ${failed} failed`);

  // Build combined content for chunking
  console.log('[5/6] Building chunks...');
  
  const parentId = require('crypto').randomUUID();
  const docName = path.basename(filePath, path.extname(filePath));
  const allChunks = [];

  // --- Text chunks ---
  const fullText = textSections.map(s => s.content).join('\n\n');
  const textChunks = chunkText(fullText);
  const textKeywords = extractKeywords(fullText);
  
  for (let i = 0; i < textChunks.length; i++) {
    allChunks.push({
      content: textChunks[i],
      source: { type: 'document', name: docName },
      category: categoryArg,
      chunkIndex: i,
      parentId,
      keywords: textKeywords,
      tokenEstimate: estimateTokens(textChunks[i]),
      enabled: true,
      protected: true
    });
  }

  // --- Image interpretation chunks ---
  for (let i = 0; i < imageDescriptions.length; i++) {
    const desc = imageDescriptions[i];
    const content = `[VISUAL TEACHING — Image ${desc.imageIndex}]\n${desc.description}`;
    const imgKeywords = extractKeywords(desc.description);
    
    allChunks.push({
      content,
      source: { type: 'vision', name: `${docName} (image ${desc.imageIndex})` },
      category: categoryArg,
      chunkIndex: textChunks.length + i,
      parentId,
      keywords: [...new Set([...textKeywords.slice(0, 10), ...imgKeywords.slice(0, 20)])],
      tokenEstimate: estimateTokens(content),
      enabled: true,
      protected: true
    });
  }

  console.log(`  Text chunks: ${textChunks.length}`);
  console.log(`  Image chunks: ${imageDescriptions.length}`);
  console.log(`  Total chunks: ${allChunks.length}`);
  console.log(`  Total tokens: ~${allChunks.reduce((sum, c) => sum + c.tokenEstimate, 0).toLocaleString()}`);

  // Save to MongoDB
  console.log('[6/6] Saving to MongoDB...');
  
  // Insert in batches of 100
  const BATCH_SIZE = 100;
  let saved = 0;
  for (let i = 0; i < allChunks.length; i += BATCH_SIZE) {
    const batch = allChunks.slice(i, i + BATCH_SIZE);
    await KnowledgeChunk.insertMany(batch);
    saved += batch.length;
    console.log(`  Saved ${saved}/${allChunks.length}`);
  }

  console.log('');
  console.log('='.repeat(60));
  console.log('INGESTION COMPLETE');
  console.log('='.repeat(60));
  console.log(`Document: ${docName}`);
  console.log(`Parent ID: ${parentId}`);
  console.log(`Total chunks: ${allChunks.length}`);
  console.log(`Text chunks: ${textChunks.length}`);
  console.log(`Vision chunks: ${imageDescriptions.length}`);
  console.log(`Images skipped: ${skipped}`);
  console.log(`Protected: YES`);
  console.log(`Category: ${categoryArg}`);
  console.log('');
  console.log('All chunks are marked protected=true.');
  console.log('Oracle will synthesize from this knowledge but never reproduce it verbatim.');

  await mongoose.disconnect();
  process.exit(0);
}

main().catch(err => {
  console.error('FATAL ERROR:', err);
  mongoose.disconnect().then(() => process.exit(1));
});
