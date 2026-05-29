// server/services/milestoneCompositor.js
//
// Build the side-by-side milestone PNG that fires from the celebration
// sheet at Day 7 / 30 / 60 / 90 / 180 / 365.
//
// Layout (1080 × 1080 square — universally shareable: Instagram feed,
// Reddit, Discord, Twitter; works as a story top-half too):
//
//   ┌─────────────────────────────────┐ ← 1080
//   │           DAY  1 │ DAY 30        │
//   │                  │               │  ← two photos, 540 × 900 each,
//   │  ┌────────────┐  │ ┌──────────┐  │     same aspect, contained
//   │  │ baseline   │  │ │ current  │  │
//   │  │ photo      │  │ │ photo    │  │
//   │  └────────────┘  │ └──────────┘  │
//   │                  │               │
//   ├──────────────────┴───────────────┤ ← divider
//   │      ◆ TITANTRACK · Day 30       │  ← 180 strip with logo + count
//   └─────────────────────────────────┘
//
// Photos are server-side composited so the watermark + branding can't
// be removed client-side. Output is a PNG that the celebration sheet
// hands to the share sheet.

const sharp = require('sharp');
const photoStorage = require('./photoStorage');

const CANVAS_W = 1080;
const CANVAS_H = 1080;
const PHOTO_H = 900;
const PHOTO_W = 540;
const BAR_H = CANVAS_H - PHOTO_H; // 180
const PADDING = 12;

// Brand colors mirror the app's restrained palette.
const BG = '#0a0a0a';                        // app background
const GOLD = '#d4af37';                      // streak gold
const TEXT = '#e8e6e0';                      // off-white body text
const TEXT_DIM = 'rgba(232, 230, 224, 0.5)';

// Resize + center-crop a photo to the slot. Uses 'cover' fit so the
// composition fills the slot edge-to-edge without letterboxing.
async function fitPhoto(buffer, width, height) {
  return await sharp(buffer)
    .rotate()
    .resize(width, height, { fit: 'cover', position: 'centre' })
    .png()
    .toBuffer();
}

// Render small SVG label like "DAY 30". Sharp composites SVG into the
// raster cleanly without needing a separate font file.
function dayLabel(text, x, y, size = 28) {
  return Buffer.from(`
    <svg width="${CANVAS_W}" height="${CANVAS_H}" xmlns="http://www.w3.org/2000/svg">
      <text x="${x}" y="${y}"
            font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
            font-size="${size}"
            font-weight="600"
            letter-spacing="3"
            fill="${GOLD}"
            opacity="0.92">${text}</text>
    </svg>
  `);
}

// Bottom watermark strip: subtle divider, brand mark, day count.
function watermarkStrip(dayCount) {
  const stripY = PHOTO_H;
  const midY = stripY + BAR_H / 2;
  const brand = 'TITANTRACK';
  const dayText = `Day ${dayCount}`;
  return Buffer.from(`
    <svg width="${CANVAS_W}" height="${CANVAS_H}" xmlns="http://www.w3.org/2000/svg">
      <!-- 1px divider just under the photos -->
      <line x1="0" y1="${stripY}" x2="${CANVAS_W}" y2="${stripY}"
            stroke="${TEXT_DIM}" stroke-width="1"/>
      <!-- Brand mark, centered horizontally, weight light -->
      <text x="${CANVAS_W / 2}" y="${midY - 6}"
            text-anchor="middle"
            font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
            font-size="34"
            font-weight="500"
            letter-spacing="6"
            fill="${TEXT}">${brand}</text>
      <!-- Day count below brand, gold, smaller -->
      <text x="${CANVAS_W / 2}" y="${midY + 38}"
            text-anchor="middle"
            font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
            font-size="24"
            font-weight="400"
            letter-spacing="4"
            fill="${GOLD}"
            opacity="0.85">${dayText}</text>
    </svg>
  `);
}

/**
 * Compose the milestone side-by-side PNG.
 *
 * @param {Object} params
 * @param {string} params.baselineKey   storage key for the "before" photo
 * @param {string} params.currentKey    storage key for the "today" photo
 * @param {number} params.baselineDay   day number of the baseline (1, typically)
 * @param {number} params.currentDay    day number being celebrated (30, 60, …)
 * @returns {Promise<Buffer>}            PNG bytes ready to share
 */
async function compose({ baselineKey, currentKey, baselineDay, currentDay }) {
  if (!baselineKey || !currentKey) {
    throw new Error('Both baselineKey and currentKey are required');
  }

  // Fetch both photos in parallel — no point in serial fetching when
  // they're independent.
  const [baselineRaw, currentRaw] = await Promise.all([
    photoStorage.getBytes(baselineKey),
    photoStorage.getBytes(currentKey)
  ]);

  const [baselineFitted, currentFitted] = await Promise.all([
    fitPhoto(baselineRaw, PHOTO_W - PADDING, PHOTO_H - PADDING),
    fitPhoto(currentRaw, PHOTO_W - PADDING, PHOTO_H - PADDING)
  ]);

  // Position the photos with a small inner padding so they don't touch
  // the canvas edge or each other. Centerline-symmetric.
  const baselineLeft = Math.round(PADDING / 2);
  const currentLeft = PHOTO_W + Math.round(PADDING / 2);
  const photoTop = Math.round(PADDING / 2);

  return await sharp({
    create: {
      width: CANVAS_W,
      height: CANVAS_H,
      channels: 3,
      background: BG
    }
  })
    .composite([
      { input: baselineFitted, top: photoTop, left: baselineLeft },
      { input: currentFitted, top: photoTop, left: currentLeft },
      { input: dayLabel(`DAY ${baselineDay}`, 24, 56), top: 0, left: 0 },
      { input: dayLabel(`DAY ${currentDay}`, PHOTO_W + 24, 56), top: 0, left: 0 },
      { input: watermarkStrip(currentDay), top: 0, left: 0 }
    ])
    .png({ quality: 92 })
    .toBuffer();
}

module.exports = { compose };
