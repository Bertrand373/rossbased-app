// src/utils/dayJournal.js
//
// userData.notes[dayStr] is the per-day journal entry. Two shapes exist
// in the wild:
//
//   Legacy:  a string                            (text only)
//   New:     { text, photoKey, capturedAt, framing }
//
// Both paths still work. These helpers normalize for read sites and
// give a single canonical write shape.
//
// The Mongoose schema for `notes` is `type: Object, default: {}`, so
// the field stays the same — we just put richer values into it.

/** Read a journal entry as a normalized object. Always returns an
 *  object; never returns null. */
export function readEntry(notes, dayStr) {
  const raw = notes && notes[dayStr];
  if (raw == null) return { text: '', photoKey: null, capturedAt: null, framing: null };
  if (typeof raw === 'string') {
    return { text: raw, photoKey: null, capturedAt: null, framing: null };
  }
  return {
    text: raw.text || '',
    photoKey: raw.photoKey || null,
    capturedAt: raw.capturedAt || null,
    framing: raw.framing || null
  };
}

/** Write helper. Merges partial updates into the existing entry. Pass
 *  text/photoKey/etc as undefined to leave them alone; pass null to
 *  clear them. */
export function writeEntry(notes, dayStr, patch) {
  const current = readEntry(notes, dayStr);
  const next = {
    text: patch.text === undefined ? current.text : (patch.text ?? ''),
    photoKey: patch.photoKey === undefined ? current.photoKey : (patch.photoKey || null),
    capturedAt: patch.capturedAt === undefined ? current.capturedAt : (patch.capturedAt || null),
    framing: patch.framing === undefined ? current.framing : (patch.framing || null)
  };

  // If the entry is now completely empty, omit it from notes entirely
  // so we don't accumulate empty rows over time.
  const empty = !next.text && !next.photoKey;
  const out = { ...(notes || {}) };
  if (empty) delete out[dayStr];
  else out[dayStr] = next;
  return out;
}

/** Quick existence checks for UI rendering. */
export function hasText(notes, dayStr) {
  const e = readEntry(notes, dayStr);
  return !!(e.text && e.text.trim());
}

export function hasPhoto(notes, dayStr) {
  return !!readEntry(notes, dayStr).photoKey;
}

/** Iterate every entry that has a photo, ordered chronologically by
 *  date string (yyyy-MM-dd sorts naturally). Used by the visual
 *  journey view. */
export function listPhotoEntries(notes) {
  const days = Object.keys(notes || {});
  const withPhotos = [];
  for (const dayStr of days) {
    const e = readEntry(notes, dayStr);
    if (e.photoKey) withPhotos.push({ dayStr, ...e });
  }
  withPhotos.sort((a, b) => a.dayStr.localeCompare(b.dayStr));
  return withPhotos;
}

/** Find the user's baseline photo for milestone composites — earliest
 *  photo by date. Returns null if no photos exist yet. */
export function getBaselinePhoto(notes) {
  const all = listPhotoEntries(notes);
  return all.length > 0 ? all[0] : null;
}
