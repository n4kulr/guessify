/**
 * Mask a song title for the late-game hint.
 * Example: "daisies" → "d _ _ s _ e _"
 * (first letter, every 3rd letter except the last, and second-to-last)
 */

function revealAt(i, len) {
  if (len <= 1) return true;
  if (i === 0) return true;
  if (len >= 4 && i === len - 2) return true;
  if (i % 3 === 0 && i !== len - 1) return true;
  return false;
}

/** @param {string} title */
export function titleHintMask(title) {
  const s = String(title || "").trim();
  if (!s) return "";

  const out = [];
  for (const word of s.split(/(\s+)/)) {
    if (/^\s+$/.test(word)) {
      out.push(" ");
      continue;
    }
    const chars = [...word];
    const len = chars.length;
    const pieces = chars.map((ch, i) => {
      if (!/[a-zA-Z0-9]/.test(ch)) return ch;
      if (revealAt(i, len)) return ch.toLowerCase();
      return "_";
    });
    out.push(pieces.join(" "));
  }
  return out.join("").replace(/\s+/g, " ").trim();
}

/** Skips before the hint button appears (0-based step index). */
export const HINT_AFTER_SKIPS = 4;
