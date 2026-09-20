/**
 * Mask a song title for the late-game hint.
 * Only the first HINT_MAX_LETTERS letters are shown (rest omitted).
 * Unknown letters are underscores with spaces so slots don't merge.
 * Punctuation (', ., etc.) always stays visible.
 * First and last letter of each word always stay visible.
 * Example: "daisies" → "d _ _ s _ _ s"
 *          "Don't Stop" → "d _ _ ' t   s _ _ p"
 */

export const HINT_MAX_LETTERS = 10;

const BLANK = "_";
/**
 * Word break in the mask. Plain spaces collapse to one when the mask is
 * rendered as a placeholder, which would make the gap between words look
 * identical to the gap between letters — so these are non-breaking spaces.
 */
const WORD_GAP = "   ";

const isLetter = (ch) => /[a-zA-Z0-9]/.test(ch);

/** Strip featured-artist credits for display + hints (matching still uses the raw title). */
export function displayTitle(title = "") {
  let s = String(title || "").trim();
  s = s.replace(/\s*[([]\s*(?:feat\.?|ft\.?|featuring)\b[^)\]]*[)\]]/gi, "");
  s = s.replace(/\s+(?:feat\.?|ft\.?|featuring)\b.+$/i, "");
  return s.replace(/\s+/g, " ").trim();
}

/** Reveal pattern among a word's letters (0-based letter index). */
function revealLetter(pos, letterCount) {
  if (letterCount <= 1) return true;
  if (pos === 0 || pos === letterCount - 1) return true;
  // Extra mid-word crumbs so longer words aren't just ends + blanks.
  if (pos % 3 === 0) return true;
  return false;
}

/**
 * First N letters of the title. Spaces kept between words; punctuation kept
 * (does not count toward N). Trailing punct on the clipped word is kept.
 */
function clipTitleLetters(title, maxLetters) {
  let letters = 0;
  let out = "";
  for (const ch of String(title || "").trim()) {
    if (isLetter(ch)) {
      if (letters >= maxLetters) break;
      letters += 1;
      out += ch;
    } else if (/\s/.test(ch)) {
      if (letters >= maxLetters) break;
      if (letters > 0) out += " ";
    } else if (letters >= maxLetters) {
      // Still on the clipped word — keep its trailing punct (e.g. "Mr.").
      if (out && !/\s$/.test(out)) out += ch;
      else break;
    } else {
      out += ch;
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
    const letterCount = chars.filter(isLetter).length;
    let letterPos = -1;
    words.push(
      chars
        .map((ch) => {
          if (!isLetter(ch)) return ch;
          letterPos += 1;
          if (revealLetter(letterPos, letterCount)) return ch.toLowerCase();
          return BLANK;
        })
        .join(" ")
    );
  }
  return words.join(WORD_GAP);
}
