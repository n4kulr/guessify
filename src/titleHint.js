/**
 * Mask a song title for the late-game hint.
 * Only the first HINT_MAX_LETTERS letters are shown (rest omitted).
 * Unknown letters are underscores with spaces so slots don't merge.
 * Example: "daisies" → "d _ _ s _ e s"
 *          "hello world" → "h _ _ l _ · w _ _ l _"
 */

export const HINT_MAX_LETTERS = 10;

const BLANK = "_";
const WORD_GAP = " · ";

/** Strip featured-artist credits for display + hints (matching still uses the raw title). */
export function displayTitle(title = "") {
  let s = String(title || "").trim();
  s = s.replace(/\s*[([]\s*(?:feat\.?|ft\.?|featuring)\b[^)\]]*[)\]]/gi, "");
  s = s.replace(/\s+(?:feat\.?|ft\.?|featuring)\b.+$/i, "");
  return s.replace(/\s+/g, " ").trim();
}

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
  const s = clipTitleLetters(displayTitle(title), HINT_MAX_LETTERS);
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
        .join(" ")
    );
  }
  return words.join(WORD_GAP);
}
