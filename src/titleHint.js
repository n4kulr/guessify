/**
 * Mask a song title for the late-game hint.
 * Only the first HINT_MAX_LETTERS letters are shown (rest omitted).
 * Unknown letters are middle dots; words split with " / ".
 * Example: "daisies" → "d··s·e·"
 *          "hello world" → "h··l· / w··l·"
 */

export const HINT_MAX_LETTERS = 10;

const BLANK = "·";
const WORD_GAP = " / ";

function revealAt(i, len) {
  if (len <= 1) return true;
  if (i === 0) return true;
  if (len >= 4 && i === len - 2) return true;
  if (i % 3 === 0 && i !== len - 1) return true;
  return false;
}

/** First N letters of the title (spaces kept between words; punct dropped). */
function clipTitleLetters(title, maxLetters) {
  let letters = 0;
  let out = "";
  for (const ch of String(title || "").trim()) {
    if (/[a-zA-Z0-9]/.test(ch)) {
      if (letters >= maxLetters) break;
      letters += 1;
      out += ch;
    } else if (letters > 0 && /\s/.test(ch)) {
      out += " ";
    }
  }
  return out.replace(/\s+/g, " ").trim();
}

/** @param {string} title */
export function titleHintMask(title) {
  const s = clipTitleLetters(title, HINT_MAX_LETTERS);
  if (!s) return "";

  const words = [];
  for (const word of s.split(/\s+/)) {
    if (!word) continue;
    const chars = [...word];
    const len = chars.length;
    words.push(
      chars
        .map((ch, i) => {
          if (!/[a-zA-Z0-9]/.test(ch)) return ch;
          if (revealAt(i, len)) return ch.toLowerCase();
          return BLANK;
        })
        .join("")
    );
  }
  return words.join(WORD_GAP);
}

/** Skips before the hint control appears (0-based step index). */
export const HINT_AFTER_SKIPS = 4;
