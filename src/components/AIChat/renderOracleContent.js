// src/components/AIChat/renderOracleContent.js
// Renders Oracle message content with **bold** / *italic* markdown AND
// inline highlight overlays from saved notes. The renderer is overlap-aware:
// each highlight is wrapped in a single <mark> element even if it crosses
// bold/italic boundaries, so the marker stroke reads as one continuous
// stroke. Overlapping highlights resolve to "newest wins" visually.

import React from 'react';

// ----- markdown stripping -----
// Walks **/* markdown, producing { plain, formats } where formats are
// bold/italic ranges in the plain-text coordinate system. We work in plain
// coords because that's what user selections give us (the DOM the user
// selects from has markdown already converted to <strong>/<em>).
function stripMarkdown(text) {
  const formats = [];
  let plain = '';
  let i = 0;
  while (i < text.length) {
    if (text[i] === '*' && text[i + 1] === '*') {
      const end = text.indexOf('**', i + 2);
      if (end !== -1 && end > i + 2) {
        const inner = text.slice(i + 2, end);
        const startIdx = plain.length;
        plain += inner;
        formats.push({ start: startIdx, end: plain.length, type: 'bold' });
        i = end + 2;
        continue;
      }
    }
    if (text[i] === '*') {
      const end = text.indexOf('*', i + 1);
      if (end !== -1 && end > i + 1) {
        const inner = text.slice(i + 1, end);
        if (!inner.includes('*')) {
          const startIdx = plain.length;
          plain += inner;
          formats.push({ start: startIdx, end: plain.length, type: 'italic' });
          i = end + 1;
          continue;
        }
      }
    }
    plain += text[i];
    i++;
  }
  return { plain, formats };
}

// Shared with the selection-capture code so offsets and renderer agree on
// what "plain text" means.
export function plainTextOf(content) {
  return stripMarkdown(content || '').plain;
}

// Try to locate a highlight in the current plain text. Prefer the stored
// offsets when they still match; otherwise fall back to context-based search.
function locateHighlight(plain, h) {
  const { startOffset, endOffset, highlightedText, contextBefore, contextAfter } = h;
  if (typeof startOffset === 'number'
    && typeof endOffset === 'number'
    && plain.slice(startOffset, endOffset) === highlightedText) {
    return { start: startOffset, end: endOffset };
  }
  const needle = (contextBefore || '') + highlightedText + (contextAfter || '');
  if (needle.length > 0) {
    const ctxIdx = plain.indexOf(needle);
    if (ctxIdx !== -1) {
      const start = ctxIdx + (contextBefore || '').length;
      return { start, end: start + highlightedText.length };
    }
  }
  const idx = plain.indexOf(highlightedText);
  if (idx !== -1) return { start: idx, end: idx + highlightedText.length };
  return null;
}

function wrapFormatting(seg) {
  let node = seg.text;
  if (seg.italic) node = <em>{node}</em>;
  if (seg.bold) node = <strong>{node}</strong>;
  return node;
}

export function renderOracleContent(content, highlights, opts = {}) {
  if (!content) return content;
  const { onHighlightClick } = opts;

  const { plain, formats } = stripMarkdown(content);

  // Resolve highlights, sort oldest -> newest so newest wins on overlap
  const resolved = [];
  for (const h of (highlights || [])) {
    const loc = locateHighlight(plain, h);
    if (!loc || loc.end <= loc.start) continue;
    resolved.push({
      start: loc.start,
      end: loc.end,
      noteId: h._id,
      color: h.color || 'amber',
      hasNote: !!(h.note && h.note.trim()),
      createdAt: h.createdAt
    });
  }
  resolved.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

  // Transition points across all ranges
  const pts = new Set([0, plain.length]);
  for (const r of formats) { pts.add(r.start); pts.add(r.end); }
  for (const r of resolved) { pts.add(r.start); pts.add(r.end); }
  const sorted = [...pts].sort((a, b) => a - b);

  // Segments
  const segments = [];
  for (let i = 0; i < sorted.length - 1; i++) {
    const start = sorted[i];
    const end = sorted[i + 1];
    if (start >= end) continue;
    const text = plain.slice(start, end);
    const bold = formats.some(f => f.type === 'bold' && f.start <= start && f.end >= end);
    const italic = formats.some(f => f.type === 'italic' && f.start <= start && f.end >= end);
    let highlight = null;
    for (const h of resolved) {
      if (h.start <= start && h.end >= end) highlight = h; // latest wins
    }
    segments.push({ text, bold, italic, highlight });
  }

  // Group consecutive segments sharing the same highlight into one <mark>,
  // so the marker stroke is continuous even where formatting changes inside.
  const out = [];
  let i = 0;
  while (i < segments.length) {
    const seg = segments[i];
    if (seg.highlight) {
      const h = seg.highlight;
      const inner = [];
      let j = i;
      while (j < segments.length
        && segments[j].highlight
        && segments[j].highlight.noteId === h.noteId) {
        inner.push(<React.Fragment key={j}>{wrapFormatting(segments[j])}</React.Fragment>);
        j++;
      }
      out.push(
        <mark
          key={`mk-${i}`}
          className={`oracle-highlight oracle-highlight--${h.color}${h.hasNote ? ' has-note' : ''}`}
          data-note-id={h.noteId}
          onClick={onHighlightClick ? (e) => { e.stopPropagation(); onHighlightClick(h.noteId); } : undefined}
        >{inner}</mark>
      );
      i = j;
    } else {
      out.push(<React.Fragment key={`f-${i}`}>{wrapFormatting(seg)}</React.Fragment>);
      i++;
    }
  }

  return out;
}
