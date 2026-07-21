// Normalize a title for forgiving comparison:
// lowercase, strip "(feat...)", "- remaster", punctuation, extra spaces.
export function normalize(str = "") {
  return str
    .toLowerCase()
    .replace(/\(.*?\)|\[.*?\]/g, " ") // (feat. x), [remix]
    .replace(/-\s*(remaster|remix|live|radio edit|mono|stereo).*$/i, " ")
    .replace(/&/g, "and")
    .replace(/[^a-z0-9\s]/g, " ") // punctuation
    .replace(/\s+/g, " ")
    .trim();
}

// Levenshtein distance (small strings, fine to do inline).
function editDistance(a, b) {
  const m = a.length;
  const n = b.length;
  const dp = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]);
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }
  return dp[m][n];
}

// Is `guess` close enough to the real `answer`?
// Forgiving: exact match, substring match (helps with long titles / partial
// artist names), or within a typo tolerance scaled to length.
export function isCorrect(guess, answer) {
  const g = normalize(guess);
  const t = normalize(answer);
  if (!g || !t) return false;
  if (g === t) return true;
  // "close by" answers: allow a substring either way once it's a few chars long
  if (g.length >= 4 && (t.includes(g) || g.includes(t))) return true;
  // allow typos, scaled to length (min 2 so short answers still forgive one slip)
  const tolerance = Math.max(2, Math.floor(t.length * 0.25));
  return editDistance(g, t) <= tolerance;
}

// Does the guess match ANY of the track's artists (fuzzy)?
export function matchesAnyArtist(guess, artists = []) {
  return artists.some((a) => isCorrect(guess, a));
}
