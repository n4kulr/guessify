// Normalize a title for forgiving comparison:
// lowercase, strip "(feat...)", "- remaster", punctuation, leading
// the/a/an, extra spaces.
export function normalize(str = "") {
  return str
    .toLowerCase()
    .replace(/\(.*?\)|\[.*?\]/g, " ") // (feat. x), [remix]
    .replace(/-\s*(remaster|remix|live|radio edit|mono|stereo).*$/i, " ")
    .replace(/&/g, "and")
    .replace(/[^a-z0-9\s]/g, " ") // punctuation
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^(the|a|an)\s+/, "");
}

/** Words sorted — so "rex county orange" ≈ "rex orange county". */
export function tokenSortKey(str = "") {
  return normalize(str)
    .split(/\s+/)
    .filter(Boolean)
    .sort()
    .join(" ");
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

/** Accept as correct at this similarity (after normalize). */
export const CORRECT_SIM = 0.8;
/** "Very close…" band — below correct, at/above this. */
export const ALMOST_SIM = 0.5;

/**
 * Slash compounds in the official title ("A / B", "A // B") — each side
 * is a legitimate answer. Split before normalize eats the slash.
 */
export function titleParts(answer = "") {
  return String(answer)
    .split(/\s*\/+\s*/)
    .map((p) => p.trim())
    .filter(Boolean);
}

function pairSimilarity(g, t) {
  if (!g || !t) return 0;
  if (g === t) return 1;
  const d = editDistance(g, t);
  return 1 - d / Math.max(g.length, t.length, 1);
}

/** True when edit distance is a tiny absolute miss on a long enough string. */
function closeEnoughEdit(g, t) {
  if (!g || !t) return false;
  const d = editDistance(g, t);
  const len = Math.min(g.length, t.length);
  // ceaser→caesar is d=3; avoid short collisions (drake/brake).
  if (d <= 3 && len >= 12) return true;
  if (d <= 2 && len >= 10) return true;
  if (d <= 1 && len >= 6) return true;
  return false;
}

/** 0–1 similarity after normalize (1 = identical). Uses word-order-insensitive key too. */
export function similarity(guess, answer) {
  const g = normalize(guess);
  const t = normalize(answer);
  if (!g || !t) return 0;
  const sorted = pairSimilarity(tokenSortKey(guess), tokenSortKey(answer));
  return Math.max(pairSimilarity(g, t), sorted);
}

function bestSimilarity(guess, answer) {
  let best = similarity(guess, answer);
  const parts = titleParts(answer);
  if (parts.length < 2) return best;
  for (const part of parts) {
    best = Math.max(best, similarity(guess, part));
  }
  return best;
}

function bestCloseEdit(guess, answer) {
  const g = normalize(guess);
  const t = normalize(answer);
  if (closeEnoughEdit(g, t)) return true;
  if (closeEnoughEdit(tokenSortKey(guess), tokenSortKey(answer))) return true;
  for (const part of titleParts(answer)) {
    if (closeEnoughEdit(g, normalize(part))) return true;
    if (closeEnoughEdit(tokenSortKey(guess), tokenSortKey(part))) return true;
  }
  return false;
}

/** Exact/≥80% on the full title, or on either side of a slash compound. */
export function isCorrect(guess, answer) {
  const g = normalize(guess);
  const t = normalize(answer);
  if (!g || !t) return false;
  const sim = bestSimilarity(guess, answer);
  // Short names need a higher bar — "brake"/"drake" is exactly 0.8.
  const short = Math.min(g.length, t.length) < 8;
  if (sim >= CORRECT_SIM && (!short || sim >= 0.9)) return true;
  // Small absolute typos on longer names (daniel ceaser → daniel caesar).
  return bestCloseEdit(guess, answer);
}

/**
 * Wrong, but ≥50% on the full title or a slash segment — "Very close…".
 * Never true when isCorrect is.
 */
export function isAlmost(guess, answer) {
  if (isCorrect(guess, answer)) return false;
  const g = normalize(guess);
  if (!g || g.length < 3 || !normalize(answer)) return false;
  return bestSimilarity(guess, answer) >= ALMOST_SIM;
}

// Does the guess match ANY of the track's artists (fuzzy)?
export function matchesAnyArtist(guess, artists = []) {
  return artists.some((a) => isCorrect(guess, a));
}

export function isAlmostAnyArtist(guess, artists = []) {
  if (matchesAnyArtist(guess, artists)) return false;
  return artists.some((a) => isAlmost(guess, a));
}
