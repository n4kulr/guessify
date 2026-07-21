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

// Is `guess` close enough to the real `title`?
export function isCorrect(guess, title) {
  const g = normalize(guess);
  const t = normalize(title);
  if (!g) return false;
  if (g === t) return true;
  // allow a couple of typos, scaled to length
  const tolerance = Math.max(1, Math.floor(t.length * 0.15));
  return editDistance(g, t) <= tolerance;
}
