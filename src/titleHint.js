/**
 * Mask a song title for the late-game hint.
 * Uses the full display title (feat./ft. credits stripped).
 * Unknown letters are underscores with spaces so slots don't merge.
 * Punctuation (', ., /, etc.) always stays visible.
 * First and last letter of each word always stay visible.
 * Example: "daisies" → "d _ _ s _ _ s"
 *          "Don't Stop" → "d _ _ ' t   s _ _ p"
 *          "monkey ft. bryson" → "m _ _ k _ y"
 */

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

/** @param {string} title */
export function titleHintMask(title) {
  const s = displayTitle(title);
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
